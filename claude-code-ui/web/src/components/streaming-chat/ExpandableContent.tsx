import { useState } from 'react'
import { Icons } from '../../lib/icons'

interface Props {
  title: string
  content: string | unknown
  maxHeight?: number
  syntax?: 'json' | 'text' | 'diff'
}

export default function ExpandableContent({ title, content, maxHeight = 200, syntax = 'text' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const isLong = contentStr.length > 500

  async function copyToClipboard() {
    await navigator.clipboard.writeText(contentStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function renderContent() {
    if (syntax === 'diff') {
      return <DiffView content={contentStr} />
    }
    if (syntax === 'json') {
      return <JsonView content={contentStr} />
    }
    return <pre className="whitespace-pre-wrap break-words">{contentStr}</pre>
  }

  return (
    <div className="rounded border border-stroke-primary bg-surface-primary overflow-hidden transition-all duration-200 ease-out hover:border-stroke-secondary">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-header border-b border-stroke-primary">
        <span className="text-[11px] text-gray-500 uppercase font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors duration-150"
          >
            {copied ? (
              <>
                <Icons.check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Icons.copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors duration-150"
            >
              <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                <Icons.chevronDown className="w-3 h-3" />
              </span>
              {expanded ? 'Less' : 'Full'}
            </button>
          )}
        </div>
      </div>
      <div
        className="p-3 text-xs text-gray-300 font-mono overflow-auto transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: expanded ? '2000px' : maxHeight }}
      >
        {renderContent()}
      </div>
    </div>
  )
}

function DiffView({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-0">
      {lines.map((line, idx) => {
        let className = 'text-gray-300'

        if (line.startsWith('+') && !line.startsWith('+++')) {
          className = 'text-green-400 bg-green-500/10'
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          className = 'text-red-400 bg-red-500/10'
        } else if (line.startsWith('@@')) {
          className = 'text-cyan-400'
        } else if (line.startsWith('+++') || line.startsWith('---')) {
          className = 'text-gray-500'
        }

        return (
          <div key={idx} className={`${className} px-1 -mx-1`}>
            {line || ' '}
          </div>
        )
      })}
    </div>
  )
}

function JsonView({ content }: { content: string }) {
  try {
    const formatted = JSON.stringify(JSON.parse(content), null, 2)
    return <pre className="whitespace-pre-wrap">{highlightJson(formatted)}</pre>
  } catch {
    return <pre className="whitespace-pre-wrap break-words">{content}</pre>
  }
}

function highlightJson(json: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let idx = 0

  const stringRegex = /"([^"\\]|\\.)*"/g
  const numberRegex = /\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g
  const boolNullRegex = /\b(true|false|null)\b/g
  const keyRegex = /"([^"\\]|\\.)*"\s*:/g

  const combined = new RegExp(
    `(${keyRegex.source})|(${stringRegex.source})|(${numberRegex.source})|(${boolNullRegex.source})`,
    'g'
  )

  let match
  while ((match = combined.exec(json)) !== null) {
    if (match.index > idx) {
      parts.push(json.slice(idx, match.index))
    }

    const text = match[0]
    if (text.endsWith(':')) {
      parts.push(<span key={match.index} className="text-purple-400">{text}</span>)
    } else if (text.startsWith('"')) {
      parts.push(<span key={match.index} className="text-green-400">{text}</span>)
    } else if (/^-?\d/.test(text)) {
      parts.push(<span key={match.index} className="text-amber-400">{text}</span>)
    } else if (/^(true|false|null)$/.test(text)) {
      parts.push(<span key={match.index} className="text-blue-400">{text}</span>)
    } else {
      parts.push(text)
    }

    idx = match.index + text.length
  }

  if (idx < json.length) {
    parts.push(json.slice(idx))
  }

  return parts
}
