import { useState, useCallback } from 'react'
import {
  getLearningStats,
  getLearningConfig,
  setLearningConfig,
  getExperts,
  getExpert,
  type LearningStats,
  type ExpertInfo,
  type ExpertDetail,
} from '../lib/api'
import { DASHBOARD_REFRESH_MS } from '../lib/constants'
import { useAutoRefresh } from './useAutoRefresh'

export type DashboardTab = 'overview' | 'experts' | 'learning' | 'logs'

export interface UseMetricsDashboardOptions {
  autoRefreshEnabled?: boolean
}

export interface UseMetricsDashboardReturn {
  // Data
  stats: LearningStats | null
  experts: ExpertInfo[]
  selectedExpert: ExpertDetail | null
  autoLearnEnabled: boolean

  // UI State
  loading: boolean
  activeTab: DashboardTab
  autoRefresh: boolean

  // Actions
  setActiveTab: (tab: DashboardTab) => void
  setAutoRefresh: (enabled: boolean) => void
  toggleAutoLearn: () => Promise<void>
  selectExpert: (id: string) => Promise<void>
  clearSelectedExpert: () => void
  refetch: () => Promise<void>

  // Computed
  avgExpertConfidence: number
}

export function useMetricsDashboard(
  options: UseMetricsDashboardOptions = {}
): UseMetricsDashboardReturn {
  const { autoRefreshEnabled = true } = options

  // Data state
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [experts, setExperts] = useState<ExpertInfo[]>([])
  const [selectedExpert, setSelectedExpert] = useState<ExpertDetail | null>(null)
  const [autoLearnEnabled, setAutoLearnEnabled] = useState(true)

  // UI state
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [autoRefresh, setAutoRefresh] = useState(autoRefreshEnabled)

  const fetchData = useCallback(async () => {
    try {
      const [learningStats, config, expertsList] = await Promise.all([
        getLearningStats(),
        getLearningConfig(),
        getExperts(),
      ])
      setStats(learningStats)
      setAutoLearnEnabled(config.autoLearnEnabled)
      setExperts(expertsList)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useAutoRefresh(fetchData, [], {
    enabled: autoRefresh,
    intervalMs: DASHBOARD_REFRESH_MS,
  })

  const toggleAutoLearn = useCallback(async () => {
    const oldValue = autoLearnEnabled
    const newValue = !oldValue
    setAutoLearnEnabled(newValue)
    try {
      await setLearningConfig({ autoLearnEnabled: newValue })
    } catch (error) {
      setAutoLearnEnabled(oldValue)
      console.error('Failed to update auto-learn config:', error)
    }
  }, [autoLearnEnabled])

  const selectExpert = useCallback(async (id: string) => {
    try {
      const detail = await getExpert(id)
      if (detail) {
        setSelectedExpert(detail)
      }
    } catch (error) {
      console.error('Failed to fetch expert details:', error)
    }
  }, [])

  const clearSelectedExpert = useCallback(() => {
    setSelectedExpert(null)
  }, [])

  // Computed values
  const avgExpertConfidence = experts.length > 0
    ? experts.reduce((sum, e) => sum + e.confidence, 0) / experts.length
    : 0

  return {
    // Data
    stats,
    experts,
    selectedExpert,
    autoLearnEnabled,

    // UI State
    loading,
    activeTab,
    autoRefresh,

    // Actions
    setActiveTab,
    setAutoRefresh,
    toggleAutoLearn,
    selectExpert,
    clearSelectedExpert,
    refetch: fetchData,

    // Computed
    avgExpertConfidence,
  }
}
