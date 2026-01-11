import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai'
import { logger } from '../logger'
import type { CLIOptions, CLIResult, StreamChunk } from './claude'

const log = logger.child('gemini')

export class GeminiService {
  private genAI: GoogleGenerativeAI
  private modelName = 'gemini-1.5-flash' // Default model, could be configurable

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      log.warn('GOOGLE_API_KEY is not set. Gemini service will fail if used.')
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '')
  }

  async execute(options: CLIOptions): Promise<CLIResult> {
    log.debug('Gemini execute start', {
      prompt: options.prompt.slice(0, 100),
      imageCount: options.images?.length || 0
    })

    const startTime = Date.now()
    const model = this.genAI.getGenerativeModel({ model: this.modelName })
    
    try {
      const parts: Part[] = [{ text: options.prompt }]

      if (options.images && options.images.length > 0) {
        for (const imagePath of options.images) {
           try {
             const imageData = await Bun.file(imagePath).arrayBuffer()
             const base64 = Buffer.from(imageData).toString('base64')
             const mimeType = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'
             
             parts.push({
               inlineData: {
                 data: base64,
                 mimeType
               }
             })
           } catch (e) {
             log.warn('Failed to load image for Gemini', { path: imagePath, error: String(e) })
           }
        }
      }

      // Handle history if provided
      let chatSession
      if (options.messages && options.messages.length > 0 && !options.resume) {
         const history: Content[] = options.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
         }))
         chatSession = model.startChat({ history })
      } else {
        chatSession = model.startChat({})
      }

      const result = await chatSession.sendMessage(parts)
      const response = result.response.text()

      const durationMs = Date.now() - startTime

      log.info('Gemini execute success', {
        responseLength: response.length,
        durationMs
      })

      return {
        response,
        sessionId: options.sessionId || crypto.randomUUID(),
        toolsUsed: [], // Tool support not yet implemented
        durationMs,
        mode: 'cli' // Reusing CLI mode identifier for now as it fits the "external execution" pattern
      }

    } catch (error) {
      log.error('Gemini execute error', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw new Error(`Gemini execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk> {
     const { stream } = this.streamCLIWithAbort(options)
     yield* stream
  }

  streamCLIWithAbort(options: CLIOptions): { stream: AsyncGenerator<StreamChunk>; abort: () => void } {
    let aborted = false
    // Gemini SDK doesn't support generic AbortSignal in the same way for streams yet, 
    // but we can stop iterating.
    
    const abort = () => {
      log.info('Gemini abort called')
      aborted = true
    }

    const self = this
    async function* generator(): AsyncGenerator<StreamChunk> {
       const sessionId = options.sessionId || crypto.randomUUID()
       yield { type: 'init', data: '', sessionId }

       try {
         const model = self.genAI.getGenerativeModel({ model: self.modelName })
         const parts: Part[] = [{ text: options.prompt }]

         if (options.images && options.images.length > 0) {
            for (const imagePath of options.images) {
               try {
                 const imageData = await Bun.file(imagePath).arrayBuffer()
                 const base64 = Buffer.from(imageData).toString('base64')
                 const mimeType = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'
                 
                 parts.push({
                   inlineData: {
                     data: base64,
                     mimeType
                   }
                 })
               } catch (e) {
                 log.warn('Failed to load image for Gemini', { path: imagePath, error: String(e) })
               }
            }
         }

         let chatSession
         if (options.messages && options.messages.length > 0 && !options.resume) {
            const history: Content[] = options.messages.map(msg => ({
               role: msg.role === 'assistant' ? 'model' : 'user',
               parts: [{ text: msg.content }]
            }))
            chatSession = model.startChat({ history })
         } else {
           chatSession = model.startChat({})
         }

         const result = await chatSession.sendMessageStream(parts)
         
         let fullResponse = ''
         
         for await (const chunk of result.stream) {
            if (aborted) break
            const text = chunk.text()
            fullResponse += text
            yield { type: 'text', data: text, sessionId }
         }

         if (!aborted) {
             yield { 
                 type: 'result', 
                 data: fullResponse, 
                 sessionId,
                 // Gemini doesn't return cost easily yet, ignoring
             }
         } else {
             yield { type: 'error', data: 'Aborted by user', sessionId }
         }

       } catch (error) {
         log.error('Gemini stream error', { error: String(error) })
         yield { type: 'error', data: error instanceof Error ? error.message : String(error) }
       }

       yield { type: 'done', data: '' }
    }

    return { stream: generator(), abort }
  }
}
