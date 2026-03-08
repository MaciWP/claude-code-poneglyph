import { createContext, useContext } from 'react'

export type AppTab = 'chat' | 'observatory' | 'skills' | 'config'

export interface TabContextValue {
  setActiveTab: (tab: AppTab) => void
}

export const TabContext = createContext<TabContextValue>({
  setActiveTab: () => {},
})

export function useTabNavigation(): TabContextValue {
  return useContext(TabContext)
}
