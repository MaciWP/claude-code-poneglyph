import type { IconName } from './icons'

export const AGENT_ICONS: Record<string, IconName> = {
  Explore: 'compass',
  Plan: 'clipboard',
  'general-purpose': 'bot',
  'code-quality': 'target',
  'refactor-agent': 'recycle',
  'task-decomposer': 'chart',
  'bug-documenter': 'bug',
  scout: 'search',
  architect: 'ruler',
  builder: 'hammer',
  reviewer: 'checkCircle',
  default: 'bot',
}

export function getAgentIcon(agentType: string): IconName {
  return AGENT_ICONS[agentType] || AGENT_ICONS.default
}

// =============================================================================
// UI TIMING
// =============================================================================

/** Dashboard refresh interval in milliseconds */
export const DASHBOARD_REFRESH_MS = 2000

/** Toast auto-dismiss duration in milliseconds */
export const TOAST_DURATION_MS = 5000

/** Copy feedback reset duration in milliseconds */
export const COPY_FEEDBACK_MS = 2000

// =============================================================================
// WEBSOCKET
// =============================================================================

/** WebSocket base URL */
export const WS_BASE_URL = `ws://${window.location.hostname}:8080/ws`

/** Maximum delay between WebSocket reconnection attempts */
export const WS_MAX_RECONNECT_DELAY = 30000

/** Base delay for WebSocket reconnection attempts */
export const WS_BASE_RECONNECT_DELAY = 1000

// =============================================================================
// CONTEXT
// =============================================================================

/** Maximum context window size in tokens */
export const MAX_CONTEXT_TOKENS = 200000

/** Agent execution timeout in milliseconds */
export const AGENT_TIMEOUT_MS = 120000
