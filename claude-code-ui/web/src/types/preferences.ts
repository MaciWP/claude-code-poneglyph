import type { FilterType } from './chat'
import type { ModelProvider } from '../lib/api'

export interface UserPreferences {
  filter: FilterType
  contextPanelOpen: boolean
  toolsPanelOpen: boolean
  provider: ModelProvider
  modes: {
    orchestrate: boolean
    planMode: boolean
    bypassPermissions: boolean
  }
  toolsPanelSections: {
    commands: boolean
    skills: boolean
    agents: boolean
  }
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  filter: 'all',
  contextPanelOpen: true,
  toolsPanelOpen: true,
  provider: 'claude',
  modes: {
    orchestrate: true,
    planMode: false,
    bypassPermissions: false,
  },
  toolsPanelSections: {
    commands: true,
    skills: true,
    agents: true,
  },
}

export const STORAGE_KEYS = {
  FILTER: 'claude-ui-filter',
  CONTEXT_PANEL: 'claude-ui-context-panel',
  TOOLS_PANEL: 'claude-ui-tools-panel',
  PROVIDER: 'claude-ui-provider',
  ORCHESTRATE: 'claude-ui-orchestrate',
  PLAN: 'claude-ui-plan',
  BYPASS: 'claude-ui-bypass',
  TOOLS_SECTIONS: 'claude-ui-tools-sections',
  CLAUDE_CONFIG: 'claude-ui-claude-config',
  RIGHT_PANEL_TAB: 'claude-ui-right-panel-tab',
  RIGHT_PANEL_COLLAPSED: 'claude-ui-right-panel-collapsed',
  WORK_DIR: 'claude-ui-work-dir',
  ALLOW_FULL_PC: 'claude-ui-allow-full-pc',
} as const
