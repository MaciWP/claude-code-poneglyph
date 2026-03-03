import { readdir } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'
import type { BlueprintDefinition, BlueprintNode } from '@shared/types/blueprint'
import {
  getString,
  parseYamlArray,
  extractFrontmatter,
  parseVariables,
  parseComplexityRange,
} from './blueprint-parser-utils'
import { extractNodeSections, parseNodeSection } from './blueprint-node-parser'

const log = logger.child('blueprint-parser')

export function parseBlueprintMd(content: string, filePath: string): BlueprintDefinition {
  const normalized = content.replace(/\r\n/g, '\n')
  const { frontmatter, body } = extractFrontmatter(normalized)
  const id = getString(frontmatter, 'id')
  if (!id) throw new Error(`Blueprint missing 'id' in frontmatter: ${filePath}`)

  const warnFn = (msg: string, data: Record<string, unknown>): void => {
    log.warn(`${msg} in ${filePath}`, data)
  }

  return {
    id,
    name: getString(frontmatter, 'name', id),
    description: getString(frontmatter, 'description'),
    version: getString(frontmatter, 'version', '1.0'),
    triggers: {
      keywords: parseYamlArray(getString(frontmatter, 'keywords')),
      complexity: parseComplexityRange(frontmatter),
    },
    nodes: parseNodesFromBody(body, warnFn),
    variables: parseVariables(frontmatter.variablesBlock),
  }
}

function parseNodesFromBody(
  body: string,
  warnFn: (msg: string, data: Record<string, unknown>) => void
): BlueprintNode[] {
  return extractNodeSections(body)
    .map((s) => parseNodeSection(s.id, s.content, warnFn))
    .filter((n): n is BlueprintNode => n !== null)
}

export async function loadBlueprintsFromDir(dir: string): Promise<BlueprintDefinition[]> {
  const definitions: BlueprintDefinition[] = []

  try {
    const files = await readdirSafe(dir)
    if (!files) return definitions

    for (const file of files.filter((f) => f.endsWith('.md'))) {
      try {
        const filePath = join(dir, file)
        definitions.push(parseBlueprintMd(await Bun.file(filePath).text(), filePath))
      } catch (error) {
        log.warn(`Failed to parse blueprint: ${file}`, { error: String(error) })
      }
    }
    log.info('Loaded blueprint definitions', { count: definitions.length })
  } catch (error) {
    log.error('Failed to load blueprints from directory', { error: String(error) })
  }

  return definitions
}

async function readdirSafe(dir: string): Promise<string[] | null> {
  try {
    return await readdir(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log.info('Blueprints directory does not exist', { path: dir })
      return null
    }
    throw error
  }
}
