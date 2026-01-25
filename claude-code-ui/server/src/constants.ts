// =============================================================================
// CENTRALIZED CONSTANTS
// =============================================================================
// This file contains all magic numbers and hardcoded values used throughout
// the server codebase. Import from here instead of using hardcoded values.
// =============================================================================

// -----------------------------------------------------------------------------
// AGENT REGISTRY
// -----------------------------------------------------------------------------

/** Time-to-live for completed/failed agents before cleanup (1 hour in ms) */
export const AGENT_TTL_MS = 3600000

/** Interval between agent cleanup checks (1 minute in ms) */
export const AGENT_CLEANUP_INTERVAL_MS = 60000


// -----------------------------------------------------------------------------
// CLAUDE / LLM
// -----------------------------------------------------------------------------

/** Context window size for token usage percentage calculations */
export const CONTEXT_WINDOW_SIZE = 200000

// -----------------------------------------------------------------------------
// CACHE
// -----------------------------------------------------------------------------

/** Default TTL for cache entries (5 minutes in ms) */
export const CACHE_DEFAULT_TTL_MS = 5 * 60 * 1000

/** TTL for config cache entries (10 minutes in ms) */
export const CONFIG_CACHE_TTL_MS = 10 * 60 * 1000

// -----------------------------------------------------------------------------
// LOGGER
// -----------------------------------------------------------------------------

/** Deduplication window for log messages (1 second in ms) */
export const LOGGER_DEDUP_WINDOW_MS = 1000

// -----------------------------------------------------------------------------
// AI LOGGER (SPEC-019)
// -----------------------------------------------------------------------------

/** Maximum prompt length before truncation in logs */
export const AI_LOGGER_MAX_PROMPT_LENGTH = 500

/** Maximum in-memory log entries before rotation */
export const AI_LOGGER_MAX_MEMORY_ENTRIES = 10000

/** Log entries to keep after rotation */
export const AI_LOGGER_ROTATION_KEEP = 5000

/** Default log directory relative to server root */
export const AI_LOGGER_DIR = './storage/logs'

// -----------------------------------------------------------------------------
// WEBSOCKET
// -----------------------------------------------------------------------------

/** Maximum size for tool output in stream chunks */
export const TOOL_OUTPUT_MAX_SIZE = 10000
