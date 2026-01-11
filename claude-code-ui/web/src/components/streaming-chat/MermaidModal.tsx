import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Icons } from '../../lib/icons'
import { tw } from '../../lib/theme'

interface Props {
  svgContent: string
  onClose: () => void
}

const MIN_SCALE = 0.5
const MAX_SCALE = 4
const SCALE_STEP = 0.25

function processSvgForFullscreen(svgContent: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  if (!svg) return svgContent

  const originalWidth = svg.getAttribute('width')
  const originalHeight = svg.getAttribute('height')

  let width = 800
  let height = 600

  if (originalWidth && originalHeight) {
    width = parseFloat(originalWidth.replace('px', ''))
    height = parseFloat(originalHeight.replace('px', ''))
  }

  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.maxWidth = 'none'
  svg.style.maxHeight = 'none'

  return new XMLSerializer().serializeToString(svg)
}

export default function MermaidModal({ svgContent, onClose }: Props): JSX.Element {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  const processedSvg = useMemo(() => processSvgForFullscreen(svgContent), [svgContent])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE))
  }, [])

  const handleReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    setScale(prev => Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    handleReset()
  }, [handleReset])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleReset()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handleZoomIn, handleZoomOut, handleReset])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const zoomPercent = Math.round(scale * 100)

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* Full-screen viewport for pan/zoom */}
      <div
        ref={viewportRef}
        className={`w-full h-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* SVG container - takes most of the screen */}
        <div
          className="absolute inset-8 top-16 bottom-16 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:block [&_text]:fill-slate-200"
            dangerouslySetInnerHTML={{ __html: processedSvg }}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-600 shadow-xl z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          disabled={scale <= MIN_SCALE}
          className={`p-1.5 ${tw.radius.md} text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
          aria-label="Zoom out"
        >
          <Icons.zoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs text-slate-400 font-mono min-w-[3.5rem] text-center">
          {zoomPercent}%
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          disabled={scale >= MAX_SCALE}
          className={`p-1.5 ${tw.radius.md} text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
          aria-label="Zoom in"
        >
          <Icons.zoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-600 mx-1" />

        <button
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
          className={`p-1.5 ${tw.radius.md} text-slate-400 hover:text-white hover:bg-slate-700 transition-colors`}
          aria-label="Reset zoom"
        >
          <Icons.reset className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-600 mx-1" />

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`p-1.5 ${tw.radius.md} text-slate-400 hover:text-white hover:bg-slate-700 transition-colors`}
          aria-label="Close"
        >
          <Icons.x className="w-4 h-4" />
        </button>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
        Scroll to zoom • Drag to pan • Double-click to reset • Esc to close
      </div>
    </div>
  )
}
