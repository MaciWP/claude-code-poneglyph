import { Elysia, t } from 'elysia'
import { readdir, stat } from 'fs/promises'
import { join, resolve, sep } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { logger } from '../logger'
import { NotFoundError, toErrorResponse, getStatusCode } from '../errors'
import { SkillEvalRunner } from '../services/skill-eval-runner'

const log = logger.child('skills-routes')

const SKILLS_DIR = join(import.meta.dir, '../../../../.claude/skills')

function sanitizeSkillName(name: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Invalid skill name')
  }
  return name
}

function assertWithinSkillsDir(fullPath: string): void {
  const resolved = resolve(fullPath)
  if (!resolved.startsWith(resolve(SKILLS_DIR) + sep)) {
    throw new Error('Invalid skill name')
  }
}

interface SkillInfo {
  name: string
  description: string
  type: string
  keywords: string[]
  filePath: string
  lines: number
  lastModified: string
}

interface SkillDetail extends SkillInfo {
  content: string
  frontmatter: Record<string, unknown>
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) {
    return { frontmatter: {}, content: raw.trim() }
  }

  try {
    const frontmatter = parseYaml(match[1]) as Record<string, unknown>
    const content = raw.slice(match[0].length).trim()
    return { frontmatter, content }
  } catch (error) {
    log.warn('Failed to parse YAML frontmatter', { error: String(error) })
    return { frontmatter: {}, content: raw.trim() }
  }
}

function extractKeywords(frontmatter: Record<string, unknown>): string[] {
  if (Array.isArray(frontmatter.keywords)) {
    return frontmatter.keywords.map(String)
  }

  const activation = frontmatter.activation as Record<string, unknown> | undefined
  if (activation && Array.isArray(activation.keywords)) {
    return activation.keywords.map(String)
  }

  return []
}

function buildSkillInfo(
  dirName: string,
  frontmatter: Record<string, unknown>,
  skillPath: string,
  raw: string,
  mtime: Date
): SkillInfo {
  return {
    name: String(frontmatter.name || dirName),
    description: String(frontmatter.description || '')
      .split('\n')[0]
      .trim(),
    type: String(frontmatter.type || 'unknown'),
    keywords: extractKeywords(frontmatter),
    filePath: skillPath,
    lines: raw.split('\n').length,
    lastModified: mtime.toISOString(),
  }
}

async function readSkillFile(dirName: string): Promise<{
  raw: string
  frontmatter: Record<string, unknown>
  content: string
  skillPath: string
  mtime: Date
} | null> {
  const skillPath = join(SKILLS_DIR, dirName, 'SKILL.md')
  const file = Bun.file(skillPath)

  if (!(await file.exists())) return null

  const raw = await file.text()
  const { frontmatter, content } = parseFrontmatter(raw)
  const fileStat = await stat(skillPath)

  return { raw, frontmatter, content, skillPath, mtime: fileStat.mtime }
}

async function loadSkillInfo(dirName: string): Promise<SkillInfo | null> {
  try {
    const data = await readSkillFile(dirName)
    if (!data) return null
    return buildSkillInfo(dirName, data.frontmatter, data.skillPath, data.raw, data.mtime)
  } catch (error) {
    log.warn('Failed to load skill', { dirName, error: String(error) })
    return null
  }
}

async function loadSkillDetail(dirName: string): Promise<SkillDetail | null> {
  try {
    const data = await readSkillFile(dirName)
    if (!data) return null
    return {
      ...buildSkillInfo(dirName, data.frontmatter, data.skillPath, data.raw, data.mtime),
      content: data.content,
      frontmatter: data.frontmatter,
    }
  } catch (error) {
    log.warn('Failed to load skill detail', { dirName, error: String(error) })
    return null
  }
}

async function listAllSkills(): Promise<SkillInfo[]> {
  try {
    const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
    const results = await Promise.all(
      entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => loadSkillInfo(e.name))
    )
    return results.filter((s): s is SkillInfo => s !== null)
  } catch {
    return []
  }
}

function computeStats(skills: SkillInfo[]): {
  total: number
  byType: Record<string, number>
  totalLines: number
  estimatedTokenBudget: number
} {
  const byType: Record<string, number> = {}
  let totalLines = 0

  for (const skill of skills) {
    byType[skill.type] = (byType[skill.type] || 0) + 1
    totalLines += skill.lines
  }

  return {
    total: skills.length,
    byType,
    totalLines,
    estimatedTokenBudget: Math.round(totalLines * 3.5),
  }
}

function handleError(
  set: { status?: number | string },
  context: string,
  error: unknown
): ReturnType<typeof toErrorResponse> {
  log.error(context, { error: String(error) })
  set.status = getStatusCode(error)
  return toErrorResponse(error)
}

const evalRunner = new SkillEvalRunner(SKILLS_DIR)

export const skillsRoutes = new Elysia({ prefix: '/api/skills' })
  .get('/stats', async () => {
    const skills = await listAllSkills()
    return computeStats(skills)
  })

  .get('/', async () => {
    const skills = await listAllSkills()
    return { skills }
  })

  .get(
    '/:name',
    async ({ params, set }) => {
      try {
        const safeName = sanitizeSkillName(params.name)
        const skill = await loadSkillDetail(safeName)
        if (!skill) throw new NotFoundError('Skill', safeName)
        return { skill }
      } catch (error) {
        return handleError(set, 'Failed to get skill', error)
      }
    },
    { params: t.Object({ name: t.String() }) }
  )

  .put(
    '/:name',
    async ({ params, body, set }) => {
      try {
        const safeName = sanitizeSkillName(params.name)
        const skillPath = join(SKILLS_DIR, safeName, 'SKILL.md')
        assertWithinSkillsDir(skillPath)
        const file = Bun.file(skillPath)
        if (!(await file.exists())) throw new NotFoundError('Skill', safeName)

        const yamlStr = stringifyYaml(body.frontmatter).trim()
        await Bun.write(skillPath, `---\n${yamlStr}\n---\n\n${body.content}`)

        const updated = await loadSkillDetail(safeName)
        return { skill: updated }
      } catch (error) {
        return handleError(set, 'Failed to update skill', error)
      }
    },
    {
      params: t.Object({ name: t.String() }),
      body: t.Object({
        frontmatter: t.Record(t.String(), t.Unknown()),
        content: t.String(),
      }),
    }
  )

  .get(
    '/:name/eval',
    async ({ params, set }) => {
      try {
        const safeName = sanitizeSkillName(params.name)
        const cases = await evalRunner.getEvalJson(safeName)
        return { skillName: safeName, cases }
      } catch (error) {
        return handleError(set, 'Failed to get eval', error)
      }
    },
    { params: t.Object({ name: t.String() }) }
  )

  .post(
    '/:name/eval/run',
    async ({ params, set }) => {
      try {
        const safeName = sanitizeSkillName(params.name)
        const skill = await loadSkillDetail(safeName)
        if (!skill) throw new NotFoundError('Skill', safeName)
        return await evalRunner.runEval(safeName, skill.keywords)
      } catch (error) {
        return handleError(set, 'Failed to run eval', error)
      }
    },
    { params: t.Object({ name: t.String() }) }
  )
