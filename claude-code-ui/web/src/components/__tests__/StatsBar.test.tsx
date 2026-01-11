import { describe, it, expect, afterEach } from 'bun:test'
import { render, cleanup } from '@testing-library/react'
import StatsBar from '../StatsBar'
import type { TokenUsage } from '../../types/chat'

const defaultSessionStats = {
  messageCount: 5,
  toolUseCount: 10,
}

const defaultModes = {
  orchestrate: false,
  planMode: false,
  bypassPermissions: false,
}

describe('StatsBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders without crashing', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
      />
    )
    expect(getByText('Connected')).toBeDefined()
  })

  it('shows Connected status when isConnected is true', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
      />
    )
    expect(getByText('Connected')).toBeDefined()
  })

  it('shows Disconnected status when isConnected is false', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={false}
        isProcessing={false}
        modes={defaultModes}
      />
    )
    expect(getByText('Disconnected')).toBeDefined()
  })

  it('shows Processing status when isProcessing is true', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={true}
        modes={defaultModes}
      />
    )
    expect(getByText('Processing')).toBeDefined()
  })

  it('displays message count', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={{ messageCount: 42, toolUseCount: 0 }}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
      />
    )
    expect(getByText('Messages:')).toBeDefined()
    expect(getByText('42')).toBeDefined()
  })

  it('displays tool use count', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={{ messageCount: 0, toolUseCount: 15 }}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
      />
    )
    expect(getByText('Tools:')).toBeDefined()
    expect(getByText('15')).toBeDefined()
  })

  it('displays token usage when provided', () => {
    const usage: TokenUsage = {
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 1500,
      contextPercent: 25,
    }

    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        usage={usage}
      />
    )
    expect(getByText('Tokens:')).toBeDefined()
    expect(getByText(/1,?500/)).toBeDefined()
    expect(getByText('Context:')).toBeDefined()
    expect(getByText('25.0%')).toBeDefined()
  })

  it('displays response time when provided', () => {
    const { getByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        responseTime={2500}
      />
    )
    expect(getByText('Last:')).toBeDefined()
    expect(getByText('2.5s')).toBeDefined()
  })

  it('does not display response time when zero', () => {
    const { queryByText } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        responseTime={0}
      />
    )
    expect(queryByText('Last:')).toBeNull()
  })

  it('shows green context bar for low usage', () => {
    const usage: TokenUsage = {
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 150,
      contextPercent: 20,
    }

    const { container } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        usage={usage}
      />
    )

    const progressBar = container.querySelector('.bg-green-500')
    expect(progressBar).toBeDefined()
  })

  it('shows yellow context bar for medium usage', () => {
    const usage: TokenUsage = {
      inputTokens: 5000,
      outputTokens: 2000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 7000,
      contextPercent: 60,
    }

    const { container } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        usage={usage}
      />
    )

    const progressBar = container.querySelector('.bg-yellow-500')
    expect(progressBar).toBeDefined()
  })

  it('shows red context bar for high usage', () => {
    const usage: TokenUsage = {
      inputTokens: 10000,
      outputTokens: 5000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 15000,
      contextPercent: 85,
    }

    const { container } = render(
      <StatsBar
        sessionStats={defaultSessionStats}
        isConnected={true}
        isProcessing={false}
        modes={defaultModes}
        usage={usage}
      />
    )

    const progressBar = container.querySelector('.bg-red-500')
    expect(progressBar).toBeDefined()
  })
})
