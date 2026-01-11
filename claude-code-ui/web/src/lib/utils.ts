import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string, locale?: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale || navigator.language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(start: Date, end?: Date): string {
  const endTime = end || new Date()
  const ms = endTime.getTime() - start.getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export interface ModelBadge {
  text: string
  color: string
}

export function getModelBadge(model?: string): ModelBadge | null {
  if (!model) return null
  const lower = model.toLowerCase()
  if (lower.includes('opus')) return { text: 'O', color: 'bg-purple-600' }
  if (lower.includes('sonnet')) return { text: 'S', color: 'bg-blue-600' }
  if (lower.includes('haiku')) return { text: 'H', color: 'bg-green-600' }
  return null
}

