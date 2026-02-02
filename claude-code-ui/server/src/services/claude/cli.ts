/**
 * Claude CLI Execution
 *
 * Handles execution via the Claude CLI (spawn process).
 * Provides one-shot execution and streaming modes with abort support.
 */

import { logger } from '../../logger'
import { validateWorkDir, getSafeEnvForClaude } from '../../utils/security'
import { getClaudeCommand } from '../../utils/claude-path'
import { parseCLIOutput } from './parser'
import { createProcessorState, createStreamReader } from './stream-processor'
import type { CLIOptions, CLIResult } from './types'
import type { StreamChunk } from '@shared/types'

const log = logger.child('claude-cli')

// =============================================================================
// ONE-SHOT EXECUTION
// =============================================================================

/**
 * Execute a prompt using the Claude CLI (one-shot mode).
 * Spawns the CLI process and waits for completion.
 */
export async function executeWithCLI(options: CLIOptions): Promise<CLIResult> {
  log.debug('CLI execute start', {
    prompt: options.prompt.slice(0, 100),
    workDir: options.workDir,
    resume: options.resume,
    outputFormat: options.outputFormat,
  })

  const claudeCmd = await getClaudeCommand()
  const args: string[] = [
    ...claudeCmd,
    '-p',
    options.prompt,
    '--output-format',
    options.outputFormat || 'json',
    '--dangerously-skip-permissions',
  ]

  if (options.resume) {
    args.push('--resume', options.resume)
  }
  if (options.continue) {
    args.push('--continue')
  }
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push('--allowedTools', options.allowedTools.join(','))
  }

  log.debug('CLI spawn', { args, cwd: options.workDir || process.cwd() })

  const proc = Bun.spawn(args, {
    cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
    stdout: 'pipe',
    stderr: 'pipe',
    env: getSafeEnvForClaude(),
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  log.debug('CLI close', {
    exitCode,
    stdoutLength: stdout.length,
    stderrLength: stderr.length,
  })

  if (exitCode === 0) {
    try {
      const result = parseCLIOutput(stdout, options.outputFormat || 'json', options.sessionId)
      log.info('CLI execute success', {
        responseLength: result.response.length,
        sessionId: result.sessionId,
        toolsUsed: result.toolsUsed,
      })
      return result
    } catch (parseError) {
      log.warn('CLI parse error', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      return {
        response: stdout,
        sessionId: options.sessionId || crypto.randomUUID(),
        toolsUsed: [],
        mode: 'cli',
      }
    }
  } else {
    log.error('CLI execute failed', { exitCode, stderr })
    throw new Error(stderr || `Claude CLI exited with code: ${exitCode}`)
  }
}

// =============================================================================
// STREAMING EXECUTION
// =============================================================================

/**
 * Simple streaming generator that delegates to streamCLIWithAbort.
 */
export async function* streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk> {
  const { stream } = streamCLIWithAbort(options)
  yield* stream
}

/**
 * Streaming execution with abort support and user answer handling.
 * Returns the stream generator plus control functions.
 */
export function streamCLIWithAbort(options: CLIOptions): {
  stream: AsyncGenerator<StreamChunk>
  abort: () => void
  sendUserAnswer: (answer: string) => void
} {
  let proc: ReturnType<typeof Bun.spawn> | null = null
  let aborted = false
  let pendingAnswerResolver: ((answer: string) => void) | null = null

  const abort = () => {
    log.info('abort() called', { alreadyAborted: aborted, hasProc: !!proc })
    if (aborted) {
      log.debug('Already aborted, skipping')
      return
    }
    aborted = true
    if (proc) {
      const pid = proc.pid
      log.info('Killing CLI process with SIGTERM', { pid })
      try {
        proc.kill('SIGTERM')
        log.info('SIGTERM sent successfully', { pid })
      } catch (e) {
        log.warn('SIGTERM failed', { pid, error: String(e) })
      }
      setTimeout(() => {
        log.info('Sending SIGKILL after timeout', { pid })
        try {
          if (process.platform === 'win32') {
            Bun.spawn(['taskkill', '/F', '/PID', String(pid)])
          } else {
            Bun.spawn(['kill', '-9', String(pid)])
          }
          log.info('SIGKILL sent', { pid })
        } catch (e) {
          log.debug('SIGKILL failed (process may be dead)', { pid, error: String(e) })
        }
      }, 500)
    } else {
      log.warn('No process to abort (proc is null)')
    }
  }

  const sendUserAnswer = (answer: string) => {
    log.info('sendUserAnswer called', {
      answer: answer.slice(0, 50),
      hasResolver: !!pendingAnswerResolver,
    })
    if (pendingAnswerResolver) {
      pendingAnswerResolver(answer)
      pendingAnswerResolver = null
    }
  }

  async function* generator(): AsyncGenerator<StreamChunk> {
    yield* streamCLIInternal(
      options,
      (p) => {
        proc = p
      },
      () => aborted,
      (resolver) => {
        pendingAnswerResolver = resolver
      },
      () => proc
    )
  }

  return { stream: generator(), abort, sendUserAnswer }
}

// =============================================================================
// INTERNAL STREAMING IMPLEMENTATION
// =============================================================================

/**
 * Internal streaming implementation.
 * Handles process spawning, stdin communication, and delegates event processing.
 */
async function* streamCLIInternal(
  options: CLIOptions,
  setProc: (p: ReturnType<typeof Bun.spawn>) => void,
  isAborted: () => boolean,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): AsyncGenerator<StreamChunk> {
  const state = createProcessorState()
  const hasImages = options.images && options.images.length > 0

  // Build prompt with session context
  let promptToSend = options.prompt
  if (options.sessionId && options.messages && options.messages.length > 0) {
    const lastMessages = options.messages.slice(-5)
    const briefContext = lastMessages
      .map(
        (msg) =>
          `- ${msg.role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`
      )
      .join('\n')

    promptToSend = `[Session Context]
Conversation history is maintained - you can reference previous context.
${lastMessages.length > 0 ? `Last ${lastMessages.length} exchanges:\n${briefContext}` : 'Starting new conversation'}

---
Current request: ${options.prompt}`

    log.info('Including session reference', {
      sessionId: options.sessionId,
      lastMessagesCount: lastMessages.length,
      hasResume: !!options.resume,
    })
  } else if (options.messages && options.messages.length > 0 && !options.resume) {
    const historyContext = options.messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')
    promptToSend = `Previous conversation:\n\n${historyContext}\n\n---\n\nUser: ${options.prompt}`
    log.info('Including conversation history (fallback)', {
      messageCount: options.messages.length,
      hasResume: !!options.resume,
    })
  }

  // Build CLI arguments
  const claudeCmd = await getClaudeCommand()
  const args: string[] = [
    ...claudeCmd,
    '--output-format',
    'stream-json',
    '--verbose',
    '--input-format',
    'stream-json',
  ]

  if (options.planMode) {
    args.push('--permission-mode', 'plan')
  } else if (options.bypassPermissions !== false) {
    args.push('--dangerously-skip-permissions')
  }

  if (options.resume) {
    args.push('--resume', options.resume)
  }
  if (options.continue) {
    args.push('--continue')
  }

  log.debug('CLI stream start', {
    args,
    cwd: options.workDir || process.cwd(),
    imageCount: options.images?.length || 0,
    hasImages,
    modes: {
      bypassPermissions: options.bypassPermissions,
      thinking: options.thinking,
      planMode: options.planMode,
      orchestrate: options.orchestrate,
    },
  })

  // Spawn process
  const proc = Bun.spawn(args, {
    cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'pipe',
    env: getSafeEnvForClaude(),
  })

  setProc(proc)
  log.debug('CLI stream spawned', { pid: proc.pid })

  // Send initial prompt via stdin
  if (proc.stdin) {
    const content: Array<{
      type: string
      text?: string
      source?: { type: string; media_type: string; data: string }
    }> = [{ type: 'text', text: promptToSend }]

    // Add images if present
    if (hasImages && options.images) {
      for (const imagePath of options.images) {
        try {
          const imageData = await Bun.file(imagePath).arrayBuffer()
          const base64 = Buffer.from(imageData).toString('base64')
          const ext = imagePath.split('.').pop()?.toLowerCase() || 'png'
          const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          })
          log.info('CLI stream image added', {
            path: imagePath,
            mediaType,
            base64Length: base64.length,
            contentItems: content.length,
          })
        } catch (e) {
          log.warn('CLI stream image error', { path: imagePath, error: String(e) })
        }
      }
    }

    const message = JSON.stringify({
      type: 'user',
      message: { role: 'user', content },
    })

    log.debug('CLI stream stdin message', { messageLength: message.length })
    proc.stdin.write(message + '\n')
    proc.stdin.flush()
  }

  // Async Queue Logic
  const queue: StreamChunk[] = []
  let resolveSignal: (() => void) | null = null
  let activeStreams = 2

  const push = (chunk: StreamChunk) => {
    queue.push(chunk)
    if (resolveSignal) {
      resolveSignal()
      resolveSignal = null
    }
  }

  // Helper to send user answer via stdin
  const sendAnswerToProc = (answer: string) => {
    const currentProc = getProc?.()
    if (currentProc?.stdin) {
      const answerMessage = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: answer }],
        },
      })
      log.info('Sending user answer to stdin', { answerLength: answer.length })
      if (typeof currentProc.stdin !== 'number') {
        currentProc.stdin.write(answerMessage + '\n')
        currentProc.stdin.flush()
      }
    }
  }

  const onStreamComplete = () => {
    activeStreams--
    if (resolveSignal) resolveSignal()
  }

  // Start stream readers
  createStreamReader(
    proc.stdout,
    false,
    state,
    options,
    push,
    sendAnswerToProc,
    isAborted,
    onStreamComplete,
    setAnswerResolver,
    getProc
  )
  createStreamReader(
    proc.stderr,
    true,
    state,
    options,
    push,
    sendAnswerToProc,
    isAborted,
    onStreamComplete,
    setAnswerResolver,
    getProc
  )

  // Generator Loop
  while (activeStreams > 0 || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift()!
    } else {
      await new Promise<void>((resolve) => {
        resolveSignal = resolve
        if (activeStreams === 0 && queue.length === 0) resolve()
        if (queue.length > 0) resolve()
      })
    }
  }

  log.debug('CLI stream loop finished')
  yield { type: 'done', data: '' }
}
