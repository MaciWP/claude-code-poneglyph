import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const result = render(ui, { container, ...options })

  return {
    ...result,
    cleanup: () => {
      result.unmount()
      container.remove()
    },
  }
}

export * from '@testing-library/react'
export { customRender as render }
