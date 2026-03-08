import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

const MarkdownContent = lazy(() => import('../streaming-chat/MarkdownContent'))

interface SkillDetail {
  name: string
  description: string
  type: string
  keywords: string[]
  content: string
  frontmatter: Record<string, unknown>
}

interface SkillEditorProps {
  skillName: string | null
  onSave?: () => void
  onBack?: () => void
}

type EditorTab = 'edit' | 'preview'

const SKILL_TYPES = ['knowledge-base', 'capability-uplift', 'encoded-preference']

export function SkillEditor({ skillName, onSave, onBack }: SkillEditorProps): React.ReactElement {
  const [skill, setSkill] = useState<SkillDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<EditorTab>('edit')

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!skillName) return

    setLoading(true)
    setSaved(false)
    const controller = new AbortController()

    fetch(`/api/skills/${skillName}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { skill: SkillDetail }) => {
        const s = data.skill
        setSkill(s)
        setName(s.name)
        setType(s.type)
        setDescription(s.description)
        setKeywords(s.keywords)
        setContent(s.content)
        setLoading(false)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [skillName])

  const handleSave = useCallback(async () => {
    if (!skillName || !skill) return

    setSaving(true)
    try {
      const frontmatter = {
        ...skill.frontmatter,
        name,
        type,
        description,
        keywords,
      }

      const res = await fetch(`/api/skills/${skillName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, content }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: { message?: string } })?.error?.message ?? 'Save failed')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSave?.()
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to save skill:', error.message)
      }
    } finally {
      setSaving(false)
    }
  }, [skillName, skill, name, type, description, keywords, content, onSave])

  const addKeyword = useCallback(() => {
    const trimmed = newKeyword.trim().toLowerCase()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed])
      setNewKeyword('')
    }
  }, [newKeyword, keywords])

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  if (!skillName) {
    return (
      <EmptyState
        icon="fileCode"
        title="No skill selected"
        description="Select a skill from the sidebar to edit it"
        variant="default"
      />
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!skill) {
    return (
      <EmptyState
        icon="alertCircle"
        title="Skill not found"
        description={`Could not load skill "${skillName}"`}
        variant="default"
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-primary">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded hover:bg-surface-hover transition-colors"
            >
              <Icons.arrowLeft className="w-4 h-4 text-content-muted" />
            </button>
          )}
          <Icons.fileCode className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">{skillName}</span>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <Badge color="green" size="xs">
              Saved
            </Badge>
          )}
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={handleSave}
            icon={<Icons.check className="w-3.5 h-3.5" />}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="flex border-b border-stroke-primary">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            tab === 'edit'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-content-muted hover:text-white'
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            tab === 'preview'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-content-muted hover:text-white'
          )}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'edit' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Metadata
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs text-content-muted">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-input border border-stroke-primary rounded-lg text-content-primary focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-muted">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-input border border-stroke-primary rounded-lg text-content-secondary focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {SKILL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-muted">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-surface-input border border-stroke-primary rounded-lg text-content-primary resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-muted">Keywords</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-purple-600/20 text-purple-400 rounded"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <Icons.x className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-1.5 text-xs bg-surface-input border border-stroke-primary rounded-md text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <Button variant="ghost" size="xs" onClick={addKeyword}>
                    <Icons.plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Content (Markdown)
              </h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 text-xs font-mono bg-surface-input border border-stroke-primary rounded-lg text-content-primary resize-y focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none animate-fade-in">
            <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
              <MarkdownContent content={content} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
