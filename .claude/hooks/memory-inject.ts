#!/usr/bin/env bun

interface HookInput {
  hook_event_name: string
  prompt: string
  session_id: string
  transcript_path: string
  cwd: string
}

interface MemorySearchResult {
  memory: {
    id: string
    content: string
    type: string
    laneType?: string
    title?: string
    confidence: {
      current: number
    }
  }
  similarity: number
  relevanceScore: number
}

interface InjectionResponse {
  memories: MemorySearchResult[]
  context: string
  metadata: {
    queryTimeMs: number
    memoriesConsidered: number
    memoriesInjected: number
  }
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string
    additionalContext: string
  }
}

const API_URL = process.env.MEMORY_API_URL || 'http://localhost:8080'
const TIMEOUT_MS = 4000

async function main(): Promise<void> {
  let input: HookInput

  try {
    const stdin = await Bun.stdin.text()
    input = JSON.parse(stdin) as HookInput
  } catch (error) {
    process.exit(0)
  }

  const { prompt, session_id } = input

  if (!prompt || prompt.trim().length < 5) {
    process.exit(0)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${API_URL}/api/memory/inject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: prompt,
        sessionId: session_id,
        maxMemories: 5
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      process.exit(0)
    }

    const result = (await response.json()) as InjectionResponse

    if (!result.context || result.context.trim().length === 0) {
      process.exit(0)
    }

    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: result.context
      }
    }

    console.log(JSON.stringify(output))
  } catch (error) {
    process.exit(0)
  }
}

main()
