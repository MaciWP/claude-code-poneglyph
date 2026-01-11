import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import type { Memory } from './types'

const log = logger.child('memory-graph')

export type RelationType =
  | 'reinforces'
  | 'contradicts'
  | 'extends'
  | 'supersedes'
  | 'related'
  | 'derived_from'

export interface MemoryEdge {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  weight: number
  createdAt: string
}

export interface MemoryNode {
  memoryId: string
  edges: string[]
  inDegree: number
  outDegree: number
}

interface GraphData {
  version: string
  nodes: Record<string, MemoryNode>
  edges: Record<string, MemoryEdge>
}

const DATA_FILE = join(import.meta.dir, '../../../storage/memories/graph.json')

class MemoryGraph {
  private nodes: Map<string, MemoryNode> = new Map()
  private edges: Map<string, MemoryEdge> = new Map()
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    if (existsSync(DATA_FILE)) {
      try {
        const content = await readFile(DATA_FILE, 'utf-8')
        const data: GraphData = JSON.parse(content)
        this.nodes = new Map(Object.entries(data.nodes))
        this.edges = new Map(Object.entries(data.edges))
      } catch (error) {
        log.error('Failed to load graph', { error })
      }
    }

    this.initialized = true
    log.info('MemoryGraph initialized', {
      nodes: this.nodes.size,
      edges: this.edges.size
    })
  }

  private async save(): Promise<void> {
    const data: GraphData = {
      version: '1.0',
      nodes: Object.fromEntries(this.nodes),
      edges: Object.fromEntries(this.edges)
    }
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  }

  private generateEdgeId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  async addNode(memoryId: string): Promise<MemoryNode> {
    await this.init()

    if (this.nodes.has(memoryId)) {
      return this.nodes.get(memoryId)!
    }

    const node: MemoryNode = {
      memoryId,
      edges: [],
      inDegree: 0,
      outDegree: 0
    }

    this.nodes.set(memoryId, node)
    await this.save()
    return node
  }

  async addEdge(
    sourceId: string,
    targetId: string,
    type: RelationType,
    weight: number = 1.0
  ): Promise<MemoryEdge> {
    await this.init()

    await this.addNode(sourceId)
    await this.addNode(targetId)

    const id = this.generateEdgeId()
    const edge: MemoryEdge = {
      id,
      sourceId,
      targetId,
      type,
      weight,
      createdAt: new Date().toISOString()
    }

    this.edges.set(id, edge)

    const sourceNode = this.nodes.get(sourceId)!
    const targetNode = this.nodes.get(targetId)!

    sourceNode.edges.push(id)
    sourceNode.outDegree++
    targetNode.edges.push(id)
    targetNode.inDegree++

    await this.save()
    log.debug('Added edge', { sourceId, targetId, type })
    return edge
  }

  async getRelated(
    memoryId: string,
    types?: RelationType[]
  ): Promise<{ memory: string; relation: RelationType; weight: number }[]> {
    await this.init()

    const node = this.nodes.get(memoryId)
    if (!node) return []

    const related: { memory: string; relation: RelationType; weight: number }[] = []

    for (const edgeId of node.edges) {
      const edge = this.edges.get(edgeId)
      if (!edge) continue

      if (types && !types.includes(edge.type)) continue

      const relatedId = edge.sourceId === memoryId ? edge.targetId : edge.sourceId
      related.push({
        memory: relatedId,
        relation: edge.type,
        weight: edge.weight
      })
    }

    return related.sort((a, b) => b.weight - a.weight)
  }

  async findContradictions(memoryId: string): Promise<string[]> {
    const related = await this.getRelated(memoryId, ['contradicts'])
    return related.map(r => r.memory)
  }

  async findReinforcements(memoryId: string): Promise<string[]> {
    const related = await this.getRelated(memoryId, ['reinforces'])
    return related.map(r => r.memory)
  }

  async removeNode(memoryId: string): Promise<void> {
    await this.init()

    const node = this.nodes.get(memoryId)
    if (!node) return

    for (const edgeId of node.edges) {
      const edge = this.edges.get(edgeId)
      if (!edge) continue

      const otherId = edge.sourceId === memoryId ? edge.targetId : edge.sourceId
      const otherNode = this.nodes.get(otherId)

      if (otherNode) {
        otherNode.edges = otherNode.edges.filter(e => e !== edgeId)
        if (edge.sourceId === memoryId) {
          otherNode.inDegree--
        } else {
          otherNode.outDegree--
        }
      }

      this.edges.delete(edgeId)
    }

    this.nodes.delete(memoryId)
    await this.save()
    log.debug('Removed node', { memoryId })
  }

  async findClusters(minSize: number = 2): Promise<Set<string>[]> {
    await this.init()

    const visited = new Set<string>()
    const clusters: Set<string>[] = []

    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) continue

      const cluster = new Set<string>()
      const queue = [nodeId]

      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current)) continue

        visited.add(current)
        cluster.add(current)

        const node = this.nodes.get(current)
        if (!node) continue

        for (const edgeId of node.edges) {
          const edge = this.edges.get(edgeId)
          if (!edge) continue

          const neighbor = edge.sourceId === current ? edge.targetId : edge.sourceId
          if (!visited.has(neighbor)) {
            queue.push(neighbor)
          }
        }
      }

      if (cluster.size >= minSize) {
        clusters.push(cluster)
      }
    }

    return clusters
  }

  getStats(): { nodes: number; edges: number; avgDegree: number } {
    let totalDegree = 0
    for (const node of this.nodes.values()) {
      totalDegree += node.inDegree + node.outDegree
    }

    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      avgDegree: this.nodes.size > 0 ? totalDegree / this.nodes.size : 0
    }
  }
}

export const memoryGraph = new MemoryGraph()
