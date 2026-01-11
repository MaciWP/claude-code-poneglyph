import { describe, it, expect } from 'bun:test'
import { getToolTaxonomy } from './chat'

describe('getToolTaxonomy', () => {
  it('should categorize Agent: XXX as agent', () => {
    const result = getToolTaxonomy('Agent: Explore')
    expect(result.category).toBe('agent')
  })

  it('should categorize Agent: code-quality as agent', () => {
    const result = getToolTaxonomy('Agent: code-quality')
    expect(result.category).toBe('agent')
  })

  it('should categorize Task as agent', () => {
    const result = getToolTaxonomy('Task')
    expect(result.category).toBe('agent')
  })

  it('should categorize TaskOutput as agent', () => {
    const result = getToolTaxonomy('TaskOutput')
    expect(result.category).toBe('agent')
  })

  it('should categorize MCP tools correctly', () => {
    const result = getToolTaxonomy('mcp__server__tool')
    expect(result.category).toBe('mcp')
  })

  it('should categorize Read as file-read', () => {
    const result = getToolTaxonomy('Read')
    expect(result.category).toBe('file-read')
  })

  it('should categorize Write as file-write', () => {
    const result = getToolTaxonomy('Write')
    expect(result.category).toBe('file-write')
  })

  it('should categorize Bash as execution', () => {
    const result = getToolTaxonomy('Bash')
    expect(result.category).toBe('execution')
  })

  it('should fallback to execution for unknown tools', () => {
    const result = getToolTaxonomy('UnknownTool')
    expect(result.category).toBe('execution')
  })
})
