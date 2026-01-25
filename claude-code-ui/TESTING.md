# Testing Guide

Testing patterns and best practices for claude-code-poneglyph.

## Quick Start

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific file
bun test src/services/claude.test.ts

# Watch mode
bun test --watch
```

## Test Structure

### Directory Layout

```
claude-code-ui/
├── server/
│   └── src/
│       ├── services/
│       │   ├── claude.ts
│       │   └── claude.test.ts         # Co-located unit test
│       ├── __tests__/
│       │   ├── integration/           # Integration tests
│       │   └── test-utils.ts          # Shared utilities
│       └── __mocks__/
│           └── anthropic.ts           # Module mocks
└── web/
    └── src/
        ├── components/
        │   ├── __tests__/             # Component tests
        │   └── MyComponent.tsx
        └── test/
            ├── setup.ts               # Test setup (happy-dom)
            └── test-utils.tsx         # Shared utilities
```

### Naming Conventions

| Pattern | File | Purpose |
|---------|------|---------|
| Unit test | `*.test.ts` | Tests single module |
| Integration test | `*.int.test.ts` | Tests multiple modules |
| E2E test | `*.e2e.test.ts` | End-to-end flows |

## Writing Tests

### Basic Pattern

```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { MyService } from './my-service'

describe('MyService', () => {
  let service: MyService

  beforeEach(() => {
    service = new MyService()
  })

  afterEach(() => {
    mock.restore()
  })

  test('does something', () => {
    const result = service.doSomething()
    expect(result).toBe('expected')
  })

  test('handles async operations', async () => {
    const result = await service.asyncMethod()
    expect(result).toBeDefined()
  })

  test('throws on invalid input', () => {
    expect(() => service.validate(null)).toThrow('Invalid input')
  })

  test('async throws', async () => {
    await expect(service.asyncValidate(null)).rejects.toThrow()
  })
})
```

### Using Test Utilities

#### Server Tests

```typescript
import { describe, test, expect } from 'bun:test'
import {
  createMockSession,
  createMockMessage,
  createMockProcess,
  collectAsyncGenerator,
} from '../__tests__/test-utils'

test('uses mock session', () => {
  const session = createMockSession({ name: 'Custom' })
  expect(session.name).toBe('Custom')
  expect(session.id).toContain('session-')
})

test('uses mock process', async () => {
  const proc = createMockProcess({
    stdout: '{"result": "ok"}',
    exitCode: 0
  })
  const stdout = await new Response(proc.stdout).text()
  expect(stdout).toContain('ok')
})
```

#### Web Tests

```typescript
import { describe, test, expect } from 'bun:test'
import { render, screen, createMockSession, MockWebSocket } from '../test/test-utils'
import { MyComponent } from './MyComponent'

test('renders component', () => {
  const session = createMockSession()
  render(<MyComponent session={session} />)
  expect(screen.getByText('Test Session')).toBeDefined()
})

test('handles websocket', () => {
  const ws = new MockWebSocket('ws://test')
  ws.simulateOpen()
  ws.simulateMessage({ type: 'text', data: 'Hello' })
  expect(ws.getSentMessages()).toHaveLength(0)
})
```

### Mocking the Claude SDK

```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import {
  createSDKModuleMock,
  MockQueryGenerator,
  createMockSDKResponse,
} from '../__mocks__/anthropic'
import { ClaudeService } from './claude'

describe('ClaudeService', () => {
  beforeEach(() => {
    // Mock the SDK module
    mock.module('@anthropic-ai/claude-agent-sdk', () =>
      createSDKModuleMock(MockQueryGenerator.simpleResponse('Hello!'))
    )
  })

  test('execute returns response', async () => {
    const service = new ClaudeService()
    const result = await service.execute({ prompt: 'Hi' })
    expect(result.response).toBe('Hello!')
  })
})
```

### Mocking Bun.spawn

```typescript
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { createMockProcess } from '../__tests__/test-utils'

describe('CLI execution', () => {
  let originalSpawn: typeof Bun.spawn

  beforeEach(() => {
    originalSpawn = Bun.spawn
  })

  afterEach(() => {
    Bun.spawn = originalSpawn
  })

  test('spawns process correctly', async () => {
    const mockProc = createMockProcess({
      stdout: JSON.stringify({ type: 'result', result: 'Done' }),
      exitCode: 0
    })

    Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

    // Your code that calls Bun.spawn
    const result = await executeCLI({ prompt: 'test' })

    expect(Bun.spawn).toHaveBeenCalled()
    expect(result).toBe('Done')
  })
})
```

## Integration Tests

```typescript
// __tests__/integration/orchestrator.int.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { routes } from '../../routes'

describe('API Integration', () => {
  let app: Elysia
  let baseUrl: string

  beforeAll(async () => {
    app = new Elysia().use(routes).listen(0)
    baseUrl = `http://localhost:${app.server!.port}`
  })

  afterAll(() => {
    app.stop()
  })

  test('GET /api/sessions returns sessions', async () => {
    const response = await fetch(`${baseUrl}/api/sessions`)
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data.sessions)).toBe(true)
  })
})
```

## Component Tests (React)

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { render, screen, fireEvent } from '../test/test-utils'
import { SessionDropdown } from './SessionDropdown'

describe('SessionDropdown', () => {
  const mockOnSelect = () => {}

  test('renders sessions', () => {
    const sessions = [
      { id: '1', name: 'Session 1' },
      { id: '2', name: 'Session 2' },
    ]

    render(
      <SessionDropdown
        sessions={sessions}
        currentSessionId="1"
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Session 1')).toBeDefined()
  })

  test('calls onSelect when clicked', () => {
    const onSelect = mock(() => {})
    render(
      <SessionDropdown
        sessions={[{ id: '1', name: 'Test' }]}
        currentSessionId=""
        onSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByText('Test'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })
})
```

## Coverage

### Running Coverage

```bash
# Generate coverage report
bun test --coverage

# Coverage is output to:
# - Console (text format)
# - coverage/lcov.info (for CI tools)
```

### Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| `services/claude.ts` | 80% | Core functionality |
| `services/sessions.ts` | 80% | Data persistence |
| `utils/` | 90% | Pure functions |
| `components/` | 50% | UI less critical |
| `hooks/` | 70% | State management |

### Coverage Gap Workaround

Bun only tracks files that are imported during test runs. To ensure accurate coverage:

```typescript
// __tests__/coverage-loader.ts
import '../services/claude'
import '../services/sessions'
// ... import all files you want coverage for
```

## Best Practices

### Do

- Use descriptive test names
- One assertion concept per test
- Use factories from test-utils
- Clean up resources in afterEach
- Test edge cases and error conditions

### Don't

- Mock what you don't own (mock your adapters instead)
- Test implementation details
- Share state between tests
- Use `any` in tests
- Skip error case tests

## Troubleshooting

### Tests Timeout

Increase timeout in bunfig.toml:

```toml
[test]
timeout = 30000  # 30 seconds
```

### Module Mock Not Working

Ensure mock is called before import:

```typescript
import { mock } from 'bun:test'

// This must be BEFORE importing the module that uses the dependency
mock.module('some-dep', () => ({ default: mockFn }))

// Now import your module
import { MyModule } from './my-module'
```

### Happy-DOM Issues

The setup file must be in bunfig.toml:

```toml
[test]
preload = ["./src/test/setup.ts"]
```
