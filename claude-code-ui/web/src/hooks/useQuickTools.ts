import { useState, useCallback, useMemo } from 'react'
import type { ClaudeConfig } from '../lib/api'
import type { QuickToolItem, QuickToolsState, ToolsByType } from '../types/chat'

interface UseQuickToolsOptions {
  config: ClaudeConfig
  isProcessing: boolean
  onSelectTool: (tool: QuickToolItem) => void
}

interface UseQuickToolsReturn {
  state: QuickToolsState
  handlers: {
    onFocus: () => void
    onBlur: () => void
    onSelectTool: (tool: QuickToolItem) => void
  }
}

export function useQuickTools({
  config,
  isProcessing,
  onSelectTool,
}: UseQuickToolsOptions): UseQuickToolsReturn {
  const [isFocused, setIsFocused] = useState(false)

  // Group tools by type
  const toolsByType = useMemo((): ToolsByType => {
    const skills: QuickToolItem[] = config.skills.map(s => ({
      name: s.name,
      type: 'skill',
      description: s.description,
    }))

    const commands: QuickToolItem[] = config.commands.map(c => ({
      name: c.name,
      type: 'command',
      description: c.description,
    }))

    const agents: QuickToolItem[] = config.agents.map(a => ({
      name: a.name,
      type: 'agent',
      description: a.description,
    }))

    return { skills, commands, agents }
  }, [config])

  // Visibility: always visible when not processing, only on focus when processing
  const isVisible = !isProcessing || isFocused

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const handleSelectTool = useCallback(
    (tool: QuickToolItem) => {
      onSelectTool(tool)
    },
    [onSelectTool]
  )

  const state: QuickToolsState = {
    isVisible,
    toolsByType,
  }

  return {
    state,
    handlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
      onSelectTool: handleSelectTool,
    },
  }
}
