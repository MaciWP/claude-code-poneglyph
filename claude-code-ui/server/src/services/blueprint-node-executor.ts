import type {
  BlueprintNode,
  BlueprintRun,
  BlueprintNodeRun,
  BlueprintEvent,
} from '@shared/types/blueprint'
import { resolveTemplate, findNodeRun, getShellArgs } from './blueprint-executor-helpers'

interface AgentSpawnerInterface {
  spawn: (config: Record<string, unknown>) => Promise<{ output: string; success: boolean }>
}

export async function executeNodeWithRetry(
  node: BlueprintNode,
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined,
  agentSpawner: AgentSpawnerInterface | null,
  emitEvent: (event: BlueprintEvent) => void
): Promise<void> {
  const maxRetries = node.maxRetries !== undefined ? node.maxRetries : 1
  const nodeRun = findNodeRun(run, node.id)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    nodeRun.retryCount = attempt

    if (attempt > 0) {
      emitEvent({
        type: 'node_retrying',
        runId: run.id,
        nodeId: node.id,
        timestamp: new Date().toISOString(),
        data: { attempt },
      })
    }

    await executeSingleNode(node, nodeRun, run, sessionId, workDir, agentSpawner, emitEvent)

    if (nodeRun.status === 'completed') return
    if (nodeRun.status === 'skipped') return
  }

  if (nodeRun.status === 'failed' && !node.continueOnFailure) {
    run.status = 'failed'
  }
}

async function executeSingleNode(
  node: BlueprintNode,
  nodeRun: BlueprintNodeRun,
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined,
  agentSpawner: AgentSpawnerInterface | null,
  emitEvent: (event: BlueprintEvent) => void
): Promise<void> {
  nodeRun.status = 'running'
  nodeRun.startedAt = new Date().toISOString()

  emitEvent({
    type: 'node_started',
    runId: run.id,
    nodeId: node.id,
    timestamp: nodeRun.startedAt,
  })

  const startTime = Date.now()

  try {
    await routeNodeExecution(node, nodeRun, run, sessionId, workDir, agentSpawner)
    nodeRun.durationMs = Date.now() - startTime
    nodeRun.completedAt = new Date().toISOString()
    run.context[node.id] = { output: nodeRun.output, exitCode: nodeRun.exitCode }

    emitEvent({
      type: 'node_completed',
      runId: run.id,
      nodeId: node.id,
      timestamp: nodeRun.completedAt,
    })
  } catch (error) {
    nodeRun.status = 'failed'
    nodeRun.error = error instanceof Error ? error.message : String(error)
    nodeRun.durationMs = Date.now() - startTime

    emitEvent({
      type: 'node_failed',
      runId: run.id,
      nodeId: node.id,
      timestamp: new Date().toISOString(),
      data: { error: nodeRun.error },
    })
  }
}

async function routeNodeExecution(
  node: BlueprintNode,
  nodeRun: BlueprintNodeRun,
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined,
  agentSpawner: AgentSpawnerInterface | null
): Promise<void> {
  const executors: Record<string, () => Promise<void>> = {
    agent: () => executeAgentNode(node, nodeRun, run, sessionId, workDir, agentSpawner),
    command: () => executeCommandNode(node, nodeRun, run),
    gate: () => executeGateNode(node, nodeRun, run),
  }

  const executor = executors[node.type]
  if (!executor) throw new Error(`Unknown node type: ${node.type}`)
  await executor()
}

async function executeAgentNode(
  node: BlueprintNode,
  nodeRun: BlueprintNodeRun,
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined,
  agentSpawner: AgentSpawnerInterface | null
): Promise<void> {
  if (!agentSpawner) throw new Error('Agent spawner not configured')
  if (!node.prompt) throw new Error(`Agent node '${node.id}' missing prompt`)

  const resolvedPrompt = resolveTemplate(node.prompt, run.variables, run.context)

  const result = await agentSpawner.spawn({
    type: node.agentType || 'builder',
    prompt: resolvedPrompt,
    sessionId,
    workDir,
    maxTokens: node.maxTokens,
    timeout: node.timeout,
  })

  nodeRun.output = result.output
  nodeRun.status = result.success ? 'completed' : 'failed'
  if (!result.success) nodeRun.error = 'Agent execution failed'
}

async function executeCommandNode(
  node: BlueprintNode,
  nodeRun: BlueprintNodeRun,
  run: BlueprintRun
): Promise<void> {
  if (!node.command) throw new Error(`Command node '${node.id}' missing command`)

  const resolvedCommand = resolveTemplate(node.command, run.variables, run.context)
  const args = getShellArgs(resolvedCommand)

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  const exitCode = await proc.exited
  const expectedCode = node.expectedExitCode !== undefined ? node.expectedExitCode : 0

  nodeRun.output = stdout + stderr
  nodeRun.exitCode = exitCode
  nodeRun.status = exitCode === expectedCode ? 'completed' : 'failed'
  if (exitCode !== expectedCode) nodeRun.error = `Exit code ${exitCode} (expected ${expectedCode})`
}

async function executeGateNode(
  node: BlueprintNode,
  nodeRun: BlueprintNodeRun,
  run: BlueprintRun
): Promise<void> {
  const depsAllPassed = node.deps.every((depId) => {
    const depRun = run.nodeRuns.find((nr) => nr.nodeId === depId)
    return depRun && depRun.status === 'completed'
  })

  const targetNodeId = depsAllPassed ? node.onSuccess : node.onFailure
  if (targetNodeId) {
    const targetRun = findNodeRun(run, targetNodeId)
    targetRun.status = 'pending'
  }

  nodeRun.status = 'completed'
  nodeRun.output = depsAllPassed ? 'gate_passed' : 'gate_failed'
}
