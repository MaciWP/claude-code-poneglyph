# Streaming Patterns

## Claude Response Streaming

```typescript
import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

async function streamClaudeResponse(
  ws: WebSocket,
  requestId: string,
  prompt: string
): Promise<void> {
  try {
    ws.send({
      type: 'stream_start',
      requestId,
      timestamp: Date.now(),
    })

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        ws.send({
          type: 'stream_delta',
          requestId,
          timestamp: Date.now(),
          data: {
            text: event.delta.text,
          },
        })
      }
    }

    const finalMessage = await stream.finalMessage()

    ws.send({
      type: 'stream_end',
      requestId,
      timestamp: Date.now(),
      data: {
        usage: finalMessage.usage,
        stopReason: finalMessage.stop_reason,
      },
    })
  } catch (error) {
    ws.send(createErrorMessage(
      'STREAM_ERROR',
      error instanceof Error ? error.message : 'Stream failed',
      requestId
    ))
  }
}
```

## Server-Sent Events Alternative

```typescript
// SSE for one-way streaming (simpler than WebSocket)
app.get('/stream/:sessionId', ({ params }) => {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const unsubscribe = eventBus.subscribe(params.sessionId, (event) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      })

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, 30000)

      controller.close = () => {
        clearInterval(keepAlive)
        unsubscribe()
      }
    },
  }, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})
```
