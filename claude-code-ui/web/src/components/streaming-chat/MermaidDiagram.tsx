import { useEffect, useRef, useState, memo, lazy, Suspense } from 'react'
import mermaid from 'mermaid'
import { Icons } from '../../lib/icons'

const MermaidModal = lazy(() => import('./MermaidModal'))

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    darkMode: true,
    background: 'transparent',
    primaryColor: '#3b82f6',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#60a5fa',
    secondaryColor: '#8b5cf6',
    secondaryTextColor: '#f1f5f9',
    secondaryBorderColor: '#a78bfa',
    tertiaryColor: '#1e293b',
    tertiaryTextColor: '#cbd5e1',
    tertiaryBorderColor: '#475569',
    lineColor: '#94a3b8',
    textColor: '#e2e8f0',
    mainBkg: '#1e293b',
    nodeBorder: '#3b82f6',
    clusterBkg: '#0f172a',
    clusterBorder: '#334155',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b',
    nodeTextColor: '#f1f5f9',

    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: '14px',

    actorBkg: '#1e40af',
    actorBorder: '#3b82f6',
    actorTextColor: '#f1f5f9',
    actorLineColor: '#64748b',
    signalColor: '#94a3b8',
    signalTextColor: '#f1f5f9',
    labelBoxBkgColor: '#1e293b',
    labelBoxBorderColor: '#475569',
    labelTextColor: '#e2e8f0',
    loopTextColor: '#cbd5e1',
    noteBkgColor: '#fef3c7',
    noteTextColor: '#78350f',
    noteBorderColor: '#fbbf24',
    activationBkgColor: '#3b82f6',
    activationBorderColor: '#60a5fa',
    sequenceNumberColor: '#f1f5f9',
  },
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
    nodeSpacing: 50,
    rankSpacing: 50,
    diagramPadding: 8,
    useMaxWidth: true,
  },
  sequence: {
    diagramMarginX: 20,
    diagramMarginY: 20,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    useMaxWidth: true,
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 12,
    sectionFontSize: 14,
    numberSectionStyles: 4,
    useMaxWidth: true,
  },
  suppressErrorRendering: true,
})

function cleanupMermaidErrors() {
  document.querySelectorAll('#d').forEach(el => el.remove())

  document.querySelectorAll('div, svg').forEach(el => {
    const text = el.textContent || ''
    if (
      text.includes('Syntax error in text') ||
      text.includes('mermaid version') ||
      (el.id?.startsWith('mermaid-') && el.classList.contains('error'))
    ) {
      el.remove()
    }
  })

  document.querySelectorAll('body > div:not(#root)').forEach(el => {
    if (el.textContent?.includes('Syntax error')) {
      el.remove()
    }
  })
}

const VALID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'requirementDiagram',
  'gitGraph', 'mindmap', 'timeline', 'zenuml', 'sankey', 'xychart', 'block'
]

const EMOJI_MAP: Record<string, string> = {
  '🔵': '',
  '🟢': '',
  '🟡': '',
  '🔴': '',
  '🟣': '',
  '✅': '',
  '❌': '',
  '⚠️': '',
  '🗑️': '',
  '✂️': '',
  '📁': '',
  '📄': '',
  '🚀': '',
  '⬇️': '',
  '➡️': '',
  '🖥️': '',
  '📍': '',
  '🔧': '',
  '🤖': '',
  '⚙️': '',
  '🪝': '',
  '💾': '',
  '🔄': '',
  '📊': '',
  '🎯': '',
  '📝': '',
  '🔍': '',
  '🌐': '',
  '💡': '',
  '⚡': '',
  '🔒': '',
  '🔑': '',
  '📦': '',
  '🏗️': '',
  '🎨': '',
  '🧪': '',
  '📈': '',
  '🔗': '',
}

function sanitizeMermaidCode(code: string): string {
  let sanitized = code

  for (const [emoji, replacement] of Object.entries(EMOJI_MAP)) {
    sanitized = sanitized.split(emoji).join(replacement)
  }

  sanitized = sanitized
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{E0000}-\u{E007F}]/gu, '')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')

  sanitized = sanitized.replace(/\|"([^"]+)"\|/g, '|$1|')

  sanitized = sanitized.replace(/\[([^\]]+)\]/g, (_match, content) => {
    const cleaned = content
      .replace(/\//g, '-')
      .replace(/:/g, ' ')
      .trim()
    return `[${cleaned}]`
  })

  sanitized = sanitized.replace(/\s*<-->\s*/g, ' <--> ')

  sanitized = sanitized.replace(/-->(\|[^|]*\|)?(\s*\w+)/g, (match, label, target) => {
    if (label) {
      const cleanLabel = label.replace(/[":]/g, '')
      return `-->${cleanLabel}${target}`
    }
    return match
  })

  sanitized = sanitized.replace(/\[""\s*/g, '["')
  sanitized = sanitized.replace(/\s*""\]/g, '"]')
  sanitized = sanitized.replace(/\["\s+/g, '["')
  sanitized = sanitized.replace(/\s+"\]/g, '"]')

  const darkModeColors: Record<string, string> = {
    '#e1f5fe': '#1e3a5f',
    '#fff3e0': '#3d2e1f',
    '#f3e5f5': '#2d1f3d',
    '#e8f5e9': '#1f3d2e',
    '#fff8e1': '#3d3a1f',
    '#fce4ec': '#3d1f2e',
    '#e3f2fd': '#1f2e3d',
    '#f1f8e9': '#2e3d1f',
    '#ede7f6': '#2e1f3d',
    '#e0f7fa': '#1f3d3d',
    '#fafafa': '#2a2a2a',
    '#f5f5f5': '#252525',
    '#eeeeee': '#303030',
    '#e0e0e0': '#353535',
    'white': '#1e293b',
    '#ffffff': '#1e293b',
  }

  for (const [light, dark] of Object.entries(darkModeColors)) {
    sanitized = sanitized.split(light).join(dark)
  }

  return sanitized
}

function isValidMermaidSyntax(code: string): boolean {
  const trimmed = code.trim()
  const firstLine = trimmed.split('\n')[0].toLowerCase()
  return VALID_DIAGRAM_TYPES.some(type => firstLine.startsWith(type.toLowerCase()))
}

function isDiagramComplete(code: string): boolean {
  const trimmed = code.trim()

  const subgraphCount = (trimmed.match(/\bsubgraph\b/gi) || []).length
  const endCount = (trimmed.match(/\bend\b/gi) || []).length
  if (subgraphCount > endCount) return false

  const openBrackets = (trimmed.match(/\[/g) || []).length
  const closeBrackets = (trimmed.match(/\]/g) || []).length
  if (openBrackets > closeBrackets) return false

  const lines = trimmed.split('\n').filter(l => l.trim())
  if (lines.length < 2) return false

  return true
}

interface Props {
  code: string
}

export default memo(function MermaidDiagram({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [svgContent, setSvgContent] = useState<string>('')

  useEffect(() => {
    if (!containerRef.current || rendered) return

    if (!isValidMermaidSyntax(code)) {
      setError('Invalid diagram type')
      return
    }

    if (!isDiagramComplete(code)) {
      return
    }

    const id = `mermaid-${crypto.randomUUID().slice(0, 8)}`
    const sanitizedCode = sanitizeMermaidCode(code)

    mermaid.render(id, sanitizedCode)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setSvgContent(svg)
          setRendered(true)
        }
      })
      .catch((err) => {
        const message = err.message || 'Failed to render diagram'
        setError(message.split('\n')[0])
        cleanupMermaidErrors()
      })

    return () => {
      cleanupMermaidErrors()
    }
  }, [code, rendered])

  useEffect(() => {
    cleanupMermaidErrors()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const text = node.textContent || ''
            if (text.includes('Syntax error in text') || text.includes('mermaid version')) {
              node.remove()
              return
            }
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      cleanupMermaidErrors()
    }
  }, [])

  const isComplete = isDiagramComplete(code)

  if (error) {
    return (
      <div className="my-2 bg-surface-tertiary border border-stroke-primary rounded-lg overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between bg-amber-900/20 border-b border-amber-500/20">
          <span className="text-xs text-amber-400 font-medium">Diagram syntax error</span>
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-content-subtle hover:text-content-secondary transition-colors"
          >
            {showCode ? 'Hide code' : 'Show code'}
          </button>
        </div>
        {showCode && (
          <pre className="p-3 text-xs text-content-muted font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
            {code}
          </pre>
        )}
      </div>
    )
  }

  if (!isComplete && !rendered) {
    return (
      <div className="my-2 bg-surface-tertiary/50 rounded-lg p-4 border border-stroke-primary">
        <div className="flex items-center gap-2 text-xs text-content-subtle">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Rendering diagram...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative my-3 group">
        {/* Fullscreen button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-surface-tertiary/90 backdrop-blur-sm rounded-md border border-stroke-primary shadow-lg text-content-secondary hover:text-white hover:bg-surface-hover transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="View fullscreen"
        >
          <Icons.maximize className="w-4 h-4" />
        </button>

        {/* SVG container */}
        <div
          ref={containerRef}
          className="rounded-lg p-5 overflow-x-auto border border-stroke-primary bg-gradient-to-br from-slate-900/80 to-slate-800/50 [&_svg]:max-w-full [&_svg]:mx-auto [&_.node_rect]:rx-2 [&_.node_rect]:ry-2 [&_.edgeLabel]:text-sm [&_.edgeLabel]:font-medium [&_.cluster_rect]:rx-3 [&_.cluster_rect]:ry-3 [&_text]:fill-slate-200 [&_.nodeLabel]:font-medium shadow-inner"
        />
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && svgContent && (
        <Suspense fallback={null}>
          <MermaidModal
            svgContent={svgContent}
            onClose={() => setIsFullscreen(false)}
          />
        </Suspense>
      )}
    </>
  )
})
