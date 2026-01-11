import { useRef, useEffect, useState, useCallback } from 'react'

interface UseSmartScrollOptions {
  threshold?: number
  smoothScroll?: boolean
}

interface UseSmartScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>
  isAtBottom: boolean
  isAutoScrollPaused: boolean
  scrollToBottom: () => void
}

export function useSmartScroll(
  dependency: unknown[],
  options: UseSmartScrollOptions = {}
): UseSmartScrollReturn {
  const { threshold = 30, smoothScroll = true } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false)
  const userScrolledRef = useRef(false)

  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true

    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < threshold
  }, [threshold])

  const handleScroll = useCallback(() => {
    const atBottom = checkIsAtBottom()
    setIsAtBottom(atBottom)

    if (!atBottom && !userScrolledRef.current) {
      userScrolledRef.current = true
      setIsAutoScrollPaused(true)
    }

    if (atBottom && userScrolledRef.current) {
      userScrolledRef.current = false
      setIsAutoScrollPaused(false)
    }
  }, [checkIsAtBottom])

  const scrollToBottom = useCallback((instant = false) => {
    const container = containerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: instant ? 'auto' : (smoothScroll ? 'smooth' : 'auto')
    })

    userScrolledRef.current = false
    setIsAutoScrollPaused(false)
    setIsAtBottom(true)
  }, [smoothScroll])

  useEffect(() => {
    if (!isAutoScrollPaused) {
      scrollToBottom(true)
    }
  }, dependency)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return {
    containerRef,
    isAtBottom,
    isAutoScrollPaused,
    scrollToBottom
  }
}
