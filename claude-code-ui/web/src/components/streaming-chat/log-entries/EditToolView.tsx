import { memo, useState } from 'react'
import type { LogEntry } from '../../../types/chat'
import { Icons } from '../../../lib/icons'
import { LogEntryWrapper, ExpandCollapseButton, formatTimestamp } from './shared'

interface EditInput {
  file_path?: string
  old_string?: string
  new_string?: string
  replace_all?: boolean
}

interface Props {
  entry: LogEntry
}

export default memo(function EditToolView({ entry }: Props) {
  const [expanded, setExpanded] = useState(false)
  const input = entry.toolInput as EditInput | undefined

  const fileName = input?.file_path?.split('/').pop() || 'unknown'
  const filePath = input?.file_path || ''
  const hasChanges = input?.old_string || input?.new_string

  return (
    <LogEntryWrapper>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 overflow-hidden">
        <div
          className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-amber-500/15 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <Icons.fileEdit className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-amber-300">Edit</span>
          <span className="text-xs text-gray-400 font-mono truncate max-w-[300px]">
            {fileName}
          </span>
          {input?.replace_all && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
              replace all
            </span>
          )}
          <span className="ml-auto text-[11px] text-gray-600">
            {formatTimestamp(entry.timestamp)}
          </span>
          <ExpandCollapseButton expanded={expanded} onClick={() => {}} />
        </div>

        {expanded && hasChanges && (
          <div className="border-t border-amber-500/20">
            {filePath && (
              <div className="px-3 py-1.5 bg-black/20 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5 text-xs">
                  <Icons.folder className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-400 font-mono text-[11px]">{filePath}</span>
                </div>
              </div>
            )}

            <div className="p-3 space-y-2">
              {input?.old_string && (
                <DiffBlock type="remove" content={input.old_string} />
              )}
              {input?.new_string && (
                <DiffBlock type="add" content={input.new_string} />
              )}
            </div>

            {entry.toolOutput && (
              <div className="px-3 py-2 border-t border-amber-500/20 bg-black/10">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Result</div>
                <div className="text-xs text-gray-300">
                  {entry.toolOutput.includes('updated') || entry.toolOutput.includes('success')
                    ? <span className="text-green-400">✓ Edit applied successfully</span>
                    : entry.toolOutput.slice(0, 100)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </LogEntryWrapper>
  )
})

interface DiffBlockProps {
  type: 'add' | 'remove'
  content: string
}

function DiffBlock({ type, content }: DiffBlockProps) {
  const isAdd = type === 'add'

  const labelClass = isAdd
    ? 'text-[10px] text-green-400 uppercase mb-1 flex items-center gap-1'
    : 'text-[10px] text-red-400 uppercase mb-1 flex items-center gap-1'

  const symbolClass = isAdd
    ? 'w-3 h-3 flex items-center justify-center bg-green-500/20 rounded text-[10px]'
    : 'w-3 h-3 flex items-center justify-center bg-red-500/20 rounded text-[10px]'

  const preClass = isAdd
    ? 'text-xs bg-green-900/20 text-green-300 p-2 rounded border border-green-500/20 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed'
    : 'text-xs bg-red-900/20 text-red-300 p-2 rounded border border-red-500/20 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed'

  return (
    <div>
      <div className={labelClass}>
        <span className={symbolClass}>{isAdd ? '+' : '−'}</span>
        {isAdd ? 'Add' : 'Remove'}
      </div>
      <pre className={preClass}>{content}</pre>
    </div>
  )
}
