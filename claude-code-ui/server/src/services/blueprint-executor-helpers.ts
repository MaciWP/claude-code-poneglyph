import type { BlueprintNode, BlueprintNodeRun, BlueprintRun } from '@shared/types/blueprint'

const TEMPLATE_RE = /\{\{(\w+(?:\.\w+)*)\}\}/g

export function resolveTemplate(
  template: string,
  variables: Record<string, string>,
  context: Record<string, unknown>
): string {
  return template.replace(TEMPLATE_RE, (_match, path: string) => {
    const parts = path.split('.')

    if (parts.length === 1) {
      const val = variables[parts[0]]
      if (val !== undefined) return val
      const ctxVal = context[parts[0]]
      if (ctxVal !== undefined) return String(ctxVal)
      return ''
    }

    const rootKey = parts[0]
    const rootVal = context[rootKey]
    if (rootVal === undefined) return ''

    let current: unknown = rootVal
    for (let i = 1; i < parts.length; i++) {
      if (current == null) return ''
      if (typeof current !== 'object') return ''
      current = (current as Record<string, unknown>)[parts[i]]
    }

    if (current == null) return ''
    return String(current)
  })
}

export function topologicalSort(nodes: BlueprintNode[]): string[][] {
  const nodeMap = new Map<string, BlueprintNode>()
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const node of nodes) {
    for (const dep of node.deps) {
      if (!nodeMap.has(dep)) continue
      const adj = adjacency.get(dep)
      if (adj) adj.push(node.id)
      inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1)
    }
  }

  const groups: string[][] = []
  let remaining = nodes.length

  while (remaining > 0) {
    const group: string[] = []
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) group.push(id)
    }

    if (group.length === 0) {
      throw new Error('Cycle detected in blueprint DAG')
    }

    for (const id of group) {
      inDegree.delete(id)
      const neighbors = adjacency.get(id) || []
      for (const neighbor of neighbors) {
        const deg = inDegree.get(neighbor)
        if (deg !== undefined) inDegree.set(neighbor, deg - 1)
      }
    }

    groups.push(group)
    remaining -= group.length
  }

  return groups
}

export function createNodeRun(nodeId: string): BlueprintNodeRun {
  return {
    nodeId,
    status: 'pending',
    retryCount: 0,
  }
}

export function findNodeRun(run: BlueprintRun, nodeId: string): BlueprintNodeRun {
  const existing = run.nodeRuns.find((nr) => nr.nodeId === nodeId)
  if (existing) return existing

  const nodeRun = createNodeRun(nodeId)
  run.nodeRuns.push(nodeRun)
  return nodeRun
}

export function getShellArgs(command: string): string[] {
  return ['bash', '-c', command]
}
