import { describe, test, expect, beforeEach } from 'bun:test'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Skills Loading Tests
 *
 * Tests skill discovery, keyword matching, and context injection
 * following patterns in .claude/rules/skill-matching.md
 */

// Types
interface Skill {
  name: string
  keywords: string[]
  forAgents: string[]
  content: string
}

interface SkillFrontmatter {
  name: string
  keywords: string[]
  for_agents?: string[]
}

/**
 * Parse YAML-like frontmatter from SKILL.md content
 */
function parseFrontmatter(content: string): SkillFrontmatter | null {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return null
  }

  const frontmatterContent = frontmatterMatch[1]
  const result: Partial<SkillFrontmatter> = {}

  // Parse name
  const nameMatch = frontmatterContent.match(/^name:\s*(.+)$/m)
  if (nameMatch) {
    result.name = nameMatch[1].trim().replace(/^["']|["']$/g, '')
  }

  // Parse keywords (YAML array format)
  const keywordsMatch = frontmatterContent.match(/^keywords:\s*\n((?:\s+-\s*.+\n?)+)/m)
  if (keywordsMatch) {
    result.keywords = keywordsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter((keyword) => keyword.length > 0)
  } else {
    // Try inline array format: keywords: [a, b, c]
    const inlineKeywordsMatch = frontmatterContent.match(/^keywords:\s*\[([^\]]+)\]/m)
    if (inlineKeywordsMatch) {
      result.keywords = inlineKeywordsMatch[1]
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    }
  }

  // Parse for_agents
  const agentsMatch = frontmatterContent.match(/^for_agents:\s*\n((?:\s+-\s*.+\n?)+)/m)
  if (agentsMatch) {
    result.for_agents = agentsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter((agent) => agent.length > 0)
  } else {
    const inlineAgentsMatch = frontmatterContent.match(/^for_agents:\s*\[([^\]]+)\]/m)
    if (inlineAgentsMatch) {
      result.for_agents = inlineAgentsMatch[1]
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    }
  }

  if (!result.name || !result.keywords || result.keywords.length === 0) {
    return null
  }

  return {
    name: result.name,
    keywords: result.keywords,
    for_agents: result.for_agents ?? [],
  }
}

/**
 * Extract content body after frontmatter
 */
function extractContent(rawContent: string): string {
  const withoutFrontmatter = rawContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
  return withoutFrontmatter.trim()
}

/**
 * Discover skills from the skills directory
 */
async function discoverSkills(basePath: string): Promise<Skill[]> {
  const skills: Skill[] = []

  try {
    const entries = await readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(basePath, entry.name, 'SKILL.md')
        try {
          const content = await readFile(skillPath, 'utf-8')
          const frontmatter = parseFrontmatter(content)

          if (frontmatter) {
            skills.push({
              name: frontmatter.name,
              keywords: frontmatter.keywords,
              forAgents: frontmatter.for_agents ?? [],
              content: extractContent(content),
            })
          }
        } catch {
          // SKILL.md not found, skip
        }
      }
    }
  } catch {
    // Directory not found
  }

  return skills
}

/**
 * Match skills by keywords in prompt
 */
function matchSkillsByKeywords(skills: Skill[], prompt: string, maxSkills = 3): Skill[] {
  const promptLower = prompt.toLowerCase()
  const promptWords = promptLower.split(/\s+/)

  const scored = skills.map((skill) => {
    let score = 0
    for (const keyword of skill.keywords) {
      const keywordLower = keyword.toLowerCase()
      if (promptWords.includes(keywordLower)) {
        score += 2 // Exact word match
      } else if (promptLower.includes(keywordLower)) {
        score += 1 // Partial match
      }
    }
    return { skill, score }
  })

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSkills)
    .map(({ skill }) => skill)
}

/**
 * Inject skill content into builder prompt
 */
function injectSkillContext(basePrompt: string, skills: Skill[]): string {
  if (skills.length === 0) {
    return basePrompt
  }

  const skillSection = skills
    .map((skill) => `### ${skill.name}\n${skill.content}`)
    .join('\n\n')

  return `## Contexto de Skills\n\n${skillSection}\n\n---\n\n${basePrompt}`
}

/**
 * Load a specific skill by name
 */
async function loadSkillByName(basePath: string, skillName: string): Promise<Skill | null> {
  const skillPath = join(basePath, skillName, 'SKILL.md')

  try {
    const content = await readFile(skillPath, 'utf-8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter) {
      return null
    }

    return {
      name: frontmatter.name,
      keywords: frontmatter.keywords,
      forAgents: frontmatter.for_agents ?? [],
      content: extractContent(content),
    }
  } catch {
    return null
  }
}

describe('Skills Loading', () => {
  const SKILLS_PATH = '.claude/skills'

  describe('Discovery', () => {
    test('should discover skills from .claude/skills/', async () => {
      const skills = await discoverSkills(SKILLS_PATH)

      expect(skills.length).toBeGreaterThan(0)

      for (const skill of skills) {
        expect(skill.name).toBeString()
        expect(skill.name.length).toBeGreaterThan(0)
        expect(skill.keywords).toBeArray()
        expect(skill.keywords.length).toBeGreaterThan(0)
        expect(skill.content).toBeString()
      }
    })

    test('should parse SKILL.md frontmatter correctly', () => {
      const mockContent = `---
name: test-skill
keywords:
  - api
  - endpoint
  - route
for_agents:
  - builder
  - reviewer
---

# Test Skill

This is the content.
`

      const frontmatter = parseFrontmatter(mockContent)

      expect(frontmatter).not.toBeNull()
      expect(frontmatter!.name).toBe('test-skill')
      expect(frontmatter!.keywords).toEqual(['api', 'endpoint', 'route'])
      expect(frontmatter!.for_agents).toEqual(['builder', 'reviewer'])
    })

    test('should parse inline array format in frontmatter', () => {
      const mockContent = `---
name: inline-skill
keywords: [api, endpoint, route]
for_agents: [builder]
---

Content here.
`

      const frontmatter = parseFrontmatter(mockContent)

      expect(frontmatter).not.toBeNull()
      expect(frontmatter!.name).toBe('inline-skill')
      expect(frontmatter!.keywords).toEqual(['api', 'endpoint', 'route'])
    })

    test('should extract content body after frontmatter', () => {
      const mockContent = `---
name: test
keywords:
  - test
---

# Header

Body content here.
`

      const content = extractContent(mockContent)

      expect(content).toBe('# Header\n\nBody content here.')
      expect(content).not.toContain('---')
    })
  })

  describe('Keyword Matching', () => {
    const testSkills: Skill[] = [
      {
        name: 'api-design',
        keywords: ['api', 'endpoint', 'route', 'rest'],
        forAgents: ['builder'],
        content: 'API patterns...',
      },
      {
        name: 'security-coding',
        keywords: ['auth', 'jwt', 'password', 'security', 'login'],
        forAgents: ['builder'],
        content: 'Security patterns...',
      },
      {
        name: 'database-patterns',
        keywords: ['database', 'sql', 'query', 'orm'],
        forAgents: ['builder'],
        content: 'Database patterns...',
      },
      {
        name: 'testing-strategy',
        keywords: ['test', 'testing', 'mock', 'coverage'],
        forAgents: ['builder'],
        content: 'Testing patterns...',
      },
    ]

    test('should match skills by keywords in prompt', () => {
      const prompt = 'Crear endpoint de login con JWT'
      const matched = matchSkillsByKeywords(testSkills, prompt)

      const matchedNames = matched.map((s) => s.name)
      expect(matchedNames).toContain('api-design')
      expect(matchedNames).toContain('security-coding')
    })

    test('should match case-insensitively', () => {
      const prompt = 'Create API endpoint for AUTH'
      const matched = matchSkillsByKeywords(testSkills, prompt)

      const matchedNames = matched.map((s) => s.name)
      expect(matchedNames).toContain('api-design')
      expect(matchedNames).toContain('security-coding')
    })

    test('should limit to max 3 skills by default', () => {
      const prompt = 'api endpoint jwt auth database query testing'
      const matched = matchSkillsByKeywords(testSkills, prompt)

      expect(matched.length).toBeLessThanOrEqual(3)
    })

    test('should respect custom maxSkills parameter', () => {
      const prompt = 'api endpoint jwt auth database testing'
      const matched = matchSkillsByKeywords(testSkills, prompt, 2)

      expect(matched.length).toBeLessThanOrEqual(2)
    })

    test('should return empty array when no keywords match', () => {
      const prompt = 'Something unrelated like cooking recipes'
      const matched = matchSkillsByKeywords(testSkills, prompt)

      expect(matched).toEqual([])
    })

    test('should rank skills by keyword match count', () => {
      const prompt = 'api endpoint route rest'
      const matched = matchSkillsByKeywords(testSkills, prompt)

      expect(matched.length).toBeGreaterThan(0)
      expect(matched[0].name).toBe('api-design')
    })
  })

  describe('Context Injection', () => {
    test('should inject skill content into builder prompt', () => {
      const skills: Skill[] = [
        {
          name: 'api-design',
          keywords: ['api'],
          forAgents: ['builder'],
          content: 'Use RESTful conventions.',
        },
      ]

      const basePrompt = 'Implement the login endpoint.'
      const injected = injectSkillContext(basePrompt, skills)

      expect(injected).toContain('## Contexto de Skills')
      expect(injected).toContain('### api-design')
      expect(injected).toContain('Use RESTful conventions.')
      expect(injected).toContain('Implement the login endpoint.')
    })

    test('should return original prompt when no skills provided', () => {
      const basePrompt = 'Implement the login endpoint.'
      const injected = injectSkillContext(basePrompt, [])

      expect(injected).toBe(basePrompt)
    })

    test('should maintain skill order in injected context', () => {
      const skills: Skill[] = [
        { name: 'first', keywords: ['a'], forAgents: [], content: 'First' },
        { name: 'second', keywords: ['b'], forAgents: [], content: 'Second' },
      ]

      const injected = injectSkillContext('Base', skills)

      const firstIndex = injected.indexOf('### first')
      const secondIndex = injected.indexOf('### second')

      expect(firstIndex).toBeLessThan(secondIndex)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing skill gracefully', async () => {
      const skill = await loadSkillByName(SKILLS_PATH, 'nonexistent-skill')

      expect(skill).toBeNull()
    })

    test('should handle malformed SKILL.md gracefully', () => {
      const malformed1 = `---
name: incomplete
---

No keywords.
`
      expect(parseFrontmatter(malformed1)).toBeNull()

      const malformed2 = `# Just Content

No frontmatter.
`
      expect(parseFrontmatter(malformed2)).toBeNull()
    })

    test('should handle nonexistent skills directory gracefully', async () => {
      const skills = await discoverSkills('/nonexistent/path')

      expect(skills).toEqual([])
    })
  })

  describe('Integration', () => {
    test('should complete full workflow: discover -> match -> inject', async () => {
      const allSkills = await discoverSkills(SKILLS_PATH)

      const prompt = 'Create an API endpoint for user authentication'
      const matchedSkills = matchSkillsByKeywords(allSkills, prompt)

      const builderPrompt = 'Implement step 2.1: Create auth service'
      const fullPrompt = injectSkillContext(builderPrompt, matchedSkills)

      if (matchedSkills.length > 0) {
        expect(fullPrompt).toContain('## Contexto de Skills')
        expect(fullPrompt).toContain(builderPrompt)
      } else {
        expect(fullPrompt).toBe(builderPrompt)
      }
    })
  })
})
