import { logger } from '../../logger'

const log = logger.child('transcript-parser')

export interface TranscriptEntry {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result'
  content: string
  timestamp?: string
}

export interface ParsedSession {
  sessionId: string
  projectPath?: string
  entries: TranscriptEntry[]
  lastModified: Date
}

export interface TranscriptWatcher {
  stop: () => void
}

type WatchCallback = (
  sessionId: string,
  entries: TranscriptEntry[],
  projectPath?: string
) => Promise<void>

export async function getLatestTranscripts(
  _since?: Date
): Promise<ParsedSession[]> {
  log.debug('getLatestTranscripts called - returning empty array (stub)')
  return []
}

export function watchTranscripts(_callback: WatchCallback): TranscriptWatcher {
  log.debug('watchTranscripts called - returning stub watcher')
  return {
    stop: () => {
      log.debug('Transcript watcher stopped')
    }
  }
}
