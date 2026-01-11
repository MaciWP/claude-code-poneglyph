export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  websocket: [
    'websocket', 'ws', 'socket', 'realtime', 'streaming',
    'connection', 'disconnect', 'reconnect', 'message', 'broadcast',
    'usewebsocket', 'ws://', 'wss://'
  ],

  memory: [
    'memory', 'remember', 'recall', 'store', 'persist',
    'embedding', 'vector', 'graph', 'knowledge', 'rag',
    'semantic', 'similarity'
  ],

  frontend: [
    'react', 'component', 'hook', 'usestate', 'useeffect',
    'ui', 'interface', 'button', 'form', 'modal', 'page',
    'tsx', 'jsx', 'tailwind', 'css', 'style'
  ],

  agent: [
    'agent', 'spawn', 'task', 'orchestrat', 'delegate',
    'expert', 'skill', 'command', 'registry', 'workflow'
  ],

  database: [
    'database', 'db', 'sql', 'query', 'table', 'schema',
    'migration', 'model', 'postgres', 'redis', 'sqlite'
  ],

  auth: [
    'auth', 'login', 'logout', 'session', 'token', 'jwt',
    'permission', 'role', 'user', 'password', 'credential'
  ],

  api: [
    'endpoint', 'route', 'handler', 'request', 'response',
    'rest', 'http', 'get', 'post', 'put', 'delete', 'elysia'
  ],

  testing: [
    'test', 'spec', 'mock', 'assert', 'expect', 'describe',
    'it', 'should', 'coverage', 'bun test', 'vitest'
  ]
}

export const COMPLEXITY_INDICATORS = {
  multiFile: /across|multiple|all|every|throughout|entire/i,
  newFeature: /add|create|implement|build|make|develop/i,
  refactor: /refactor|restructure|reorganize|rewrite|redesign/i,
  debugging: /fix|bug|error|issue|broken|crash|fail/i,
  integration: /connect|integrate|sync|combine|merge/i,
  analysis: /analyze|investigate|understand|explore|review/i,
}

export const TRIVIAL_INDICATORS = {
  question: /^(what|how|where|why|can you explain|tell me)/i,
  simple: /typo|rename|comment|log|console/i,
  documentation: /readme|doc|comment|explain/i,
}
