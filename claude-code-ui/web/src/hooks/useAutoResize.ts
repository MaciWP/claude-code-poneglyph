import { useEffect, useCallback, type RefObject } from 'react'

const LINE_HEIGHT = 24 // px, matches font-mono text-sm
const PADDING = 24 // py-3 = 12px * 2

export function useAutoResize(
  ref: RefObject<HTMLTextAreaElement>,
  minRows = 1,
  maxRows = 10
): void {
  const resize = useCallback(() => {
    const textarea = ref.current
    if (!textarea) return

    // Reset height to calculate scrollHeight
    textarea.style.height = 'auto'

    const minHeight = LINE_HEIGHT * minRows + PADDING
    const maxHeight = LINE_HEIGHT * maxRows + PADDING
    const scrollHeight = textarea.scrollHeight

    // Clamp between min and max
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`

    // Show scrollbar only when at max height
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [ref, minRows, maxRows])

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    // Initial resize
    resize()

    // Resize on input
    const handleInput = () => resize()
    textarea.addEventListener('input', handleInput)

    return () => {
      textarea.removeEventListener('input', handleInput)
    }
  }, [ref, resize])

  // Expose resize for external use (e.g., when value changes programmatically)
  useEffect(() => {
    resize()
  })
}
