# Spec: Context Virtualization

<!--
status: implemented
priority: high
research_confidence: medium
sources_count: 16
depends_on: [SPEC-008, SPEC-004, SPEC-012]
enables: []
created: 2026-03-15
updated: 2026-03-15
-->

## 0. Research Summary

### Fuentes Consultadas

| # | Tipo | Fuente | Relevancia |
|---|------|--------|------------|
| 1 | MCP Server | [context-mode v1.0.22](https://github.com/mksglu/context-mode) | Alta — inspiracion directa |
| 2 | Comunidad | [HN: Context Mode discussion](https://news.ycombinator.com/item?id=47148025) | Alta — criticas y limitaciones |
| 3 | Comunidad | [HN: 98% reduction thread](https://news.ycombinator.com/item?id=47193064) | Alta — benchmarks cuestionados |
| 4 | Oficial | [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Alta — best practices oficiales |
| 5 | Oficial | [Claude Code context buffer 33K-45K](https://claudefa.st/blog/guide/mechanics/context-buffer-management) | Alta — mecanica de compaction |
| 6 | Bug | [GitHub #14941: post-compaction behavior](https://github.com/anthropics/claude-code/issues/14941) | Alta — problema documentado |
| 7 | Research | [Manus: Agentic Context Engineering](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) | Media — patrones de agentes |
| 8 | Research | [arXiv: ACE framework](https://arxiv.org/abs/2510.04618) | Media — paper academico |
| 9 | Docs | [Claude Code MCP docs](https://code.claude.com/docs/en/mcp) | Media — hooks disponibles |
| 10 | Blog | [Context Mode author blog](https://mksg.lu/blog/context-mode) | Media — arquitectura interna |
| 11 | Docs | [bun:sqlite documentation](https://bun.sh/docs/api/sqlite) | Alta — runtime elegido |
| 12 | Interno | SPEC-008 Agent Attention Mechanisms | Alta — pipeline de pruning |
| 13 | Interno | SPEC-004 Stale Context Detection | Alta — frescura de contexto |
| 14 | Interno | SPEC-012 Cross-Agent Knowledge Graph | Media — storage persistente |
| 15 | Analisis | poneglyph-orchestration-docs.html | Media — estado actual del sistema |
| 16 | Analisis | competitive-analysis.html | Media — gaps identificados |

### Decisiones Informadas por Research

| Decision | Basada en |
|----------|-----------|
| Construir nativo, no usar Context Mode MCP | Windows incompatible, licencia ELv2, DB temporal, sin benchmarks independientes [2,3] |
| bun:sqlite FTS5 para busqueda intra-session | Built-in en Bun, cross-platform, zero deps. Misma tech que Context Mode pero nativa [11] |
| Knowledge graph para persistencia cross-session | SPEC-012 ya implementado, JSONL + index [14] |
| PoC primero midiendo token waste real | Comunidad cuestiona 98% sin benchmarks [3]. Anthropic: "minimal viable tokens" [4] |
| Hybrid session + persistent storage | Best practice: session cache rapida + persistent knowledge [7,8] |

### Informacion No Encontrada

- Benchmarks independientes de Context Mode (solo marketing del autor)
- Latencia real por hook de PreToolUse interceptando tool outputs
- Datos de token waste en sesiones reales de Poneglyph (motivacion del PoC)
- Impacto de context virtualization en calidad de respuestas del modelo

### Confidence Assessment

| Area | Nivel | Razon |
|------|-------|-------|
| Problema (context bloat) | Alta | Documentado por Anthropic, issue #14941, multiples fuentes |
| Solucion (virtualizacion) | Media | Context Mode demuestra el concepto pero sin benchmarks independientes |
| Implementacion (bun:sqlite) | Alta | Bun docs oficiales, FTS5 es SQLite estandar |
| Beneficio real para Poneglyph | Baja | Sin mediciones de token waste en sesiones reales — requiere PoC |

## 1. Vision

> **Press Release**: Poneglyph ahora virtualiza los tool outputs grandes, indexandolos en una base de datos FTS5 local en vez de volcarlos directamente en la context window. Los builders y scouts pueden explorar codebases masivas sin agotar su contexto en 30 minutos. Session checkpoints inteligentes preservan decisiones y errores entre compactions. El resultado: sesiones productivas de 2-3 horas donde el modelo mantiene awareness de todo lo relevante.

**Background**: Los builders y scouts de Poneglyph ejecutan Read/Grep/Bash intensivamente. Cada output crudo entra en la context window (~200K tokens, con ~33K reservados para compaction). En sesiones de exploracion intensa, el contexto se agota en 30-60 minutos. Post-compaction, Claude pierde awareness de skills activos, convenciones y decisiones previas (GitHub #14941). La arquitectura multi-agente de Poneglyph ya mitiga parcialmente (cada agente tiene su propia window), pero dentro de cada agente la deplecion sigue ocurriendo.

**Usuario objetivo**: Oriol Macias — unico usuario de Poneglyph. Desarrollador que usa Claude Code con orquestacion multi-agente en sesiones largas de desarrollo.

**Metricas de exito**:

| Metrica | Target | Medicion |
|---------|--------|----------|
| Token waste en tool outputs | Reducir >50% en sesiones de builder | Comparar traces pre/post |
| Duracion de sesion productiva | Extender de ~30-60min a >90min sin compaction | Medir via traces |
| Awareness post-compaction | Mantener >80% de decisiones clave | Test manual de recall |
| Latencia por tool call | <100ms overhead por intercepcion | Benchmark en hook |
| Zero regresiones | 0 tests rotos | bun test |

## 2. Goals & Non-Goals

### Goals

| ID | Goal | Razon |
|----|------|-------|
| G1 | Medir token waste real en sesiones existentes (PoC) | Sin datos no sabemos si el problema justifica la complejidad |
| G2 | Indexar tool outputs grandes (>4KB) en bun:sqlite FTS5 | Reduce contexto enviado al modelo |
| G3 | Retornar summaries comprimidos en vez de raw output | Modelo recibe lo esencial, no el dump |
| G4 | Session checkpoints que sobrevivan compaction | Preservar decisiones, errores, archivos activos |
| G5 | Persistencia cross-session via knowledge graph | Conocimiento acumulado no se pierde al cerrar |
| G6 | Cross-platform (Windows + Mac) sin dependencias externas | bun:sqlite es built-in, no requiere instalar nada |
| G7 | Integrar con attention system existente (SPEC-008) | Scoring de relevancia para priorizar que entra en contexto |

### Non-Goals

| ID | Non-Goal | Razon |
|----|----------|-------|
| NG1 | Replicar Context Mode MCP completo | Licencia ELv2, Windows incompatible, DB temporal |
| NG2 | Interceptar MCP tool responses | Limitacion tecnica de hooks — no hay PostToolUse para MCP |
| NG3 | Virtualizar outputs pequenos (<4KB) | Overhead de indexacion no justificado para outputs chicos |
| NG4 | Reemplazar compaction nativa de Claude Code | Complementar, no competir con el mecanismo de Anthropic |
| NG5 | Vector search / embeddings | Complejidad innecesaria para un solo usuario. BM25 suficiente |
| NG6 | Soporte multi-usuario o SaaS | Poneglyph es herramienta privada |

## 3. Alternatives Considered

| # | Alternativa | Pros | Cons | Fuente | Decision |
|---|-------------|------|------|--------|----------|
| 1 | **Instalar Context Mode MCP** | Ya construido, probado | Windows incompatible, ELv2, DB temporal, sin benchmarks, latencia desconocida | [1,2,3] | Descartado |
| 2 | **bun:sqlite FTS5 nativo** | Zero deps, cross-platform, BM25+Porter, :memory: o file | Requiere construir, sin session continuity out-of-box | [11] | Elegido |
| 3 | **Knowledge graph solo (JSONL)** | Ya existe, persistente | Sin FTS5, busqueda lenta en full-text, no BM25 | [14] | Complementario |
| 4 | **better-sqlite3 npm** | Maduro, bien documentado | Dependencia nativa extra, requiere build tools | npm | Descartado (bun:sqlite mejor) |
| 5 | **No hacer nada** | Zero esfuerzo | Context bloat real, sesiones cortas, awareness loss | [5,6] | Descartado |

## 4. Design

### Fases de Implementacion

```
Fase A: PoC (/context-audit) → Medir token waste real
Fase B: FTS5 Index Layer → bun:sqlite con indexacion
Fase C: Hook Integration → PostToolUse interceptor
Fase D: Session Checkpoints → PreCompact/PostCompact
Fase E: Knowledge Bridge → FTS5 ↔ Knowledge Graph sync
```

### Fase A: PoC — Comando /context-audit

Nuevo comando `.claude/commands/context-audit.md` que analiza traces existentes para medir:

1. Total tokens consumidos por tool outputs (Read, Grep, Bash)
2. Distribucion de tamano de outputs (histograma)
3. % de tokens que son tool outputs vs razonamiento del modelo
4. Estimacion de ahorro si outputs >4KB se comprimieran 90%
5. Top 10 sesiones con mayor token waste
6. Recomendacion: si waste >30% → proceder con Fase B

**Sin codigo TypeScript** — solo instrucciones markdown como `/cost` y `/impact`.

### Fase B: FTS5 Index Layer

**Archivo**: `.claude/hooks/lib/context-store/`

```typescript
// store.ts — bun:sqlite wrapper
import { Database } from "bun:sqlite";

interface ContextChunk {
  id: number;
  source: string;      // file path or tool name
  content: string;      // raw text chunk
  summary: string;      // compressed summary
  tokens: number;       // estimated tokens
  timestamp: number;    // Date.now()
  sessionId: string;
}

// Session store (:memory: — fast, ephemeral)
export function createSessionStore(): Database
// Persistent store (file — cross-session)
export function createPersistentStore(path: string): Database
// Index content with FTS5
export function indexContent(db: Database, source: string, content: string, sessionId: string): void
// Search with BM25
export function search(db: Database, query: string, limit?: number): ContextChunk[]
// Get session summary (top chunks by relevance)
export function getSessionSummary(db: Database, maxTokens: number): string
```

**Schema FTS5:**

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS chunks
USING fts5(
  source,
  content,
  summary,
  tokenize='porter ascii'
);

CREATE TABLE IF NOT EXISTS chunk_meta (
  rowid INTEGER PRIMARY KEY,
  tokens INTEGER,
  timestamp INTEGER,
  session_id TEXT
);
```

### Fase C: Hook Integration

**Nuevo hook**: `.claude/hooks/context-virtualizer.ts` (PostToolUse)

```
PostToolUse hook en Read|Grep|Bash:
1. Recibe tool output via stdin
2. Si output < 4KB: pass-through (no virtualizar)
3. Si output >= 4KB:
   a. Parsear con attention/parser.ts (extractSections)
   b. Scorear con attention/scorer.ts (relevancia)
   c. Indexar chunks en bun:sqlite FTS5 (session store)
   d. Generar summary comprimido
   e. Retornar summary al contexto (via stderr suggestion)
```

**Exit codes**: Siempre exit 0 (best-effort, nunca bloquear).

### Fase D: Session Checkpoints

Extender `session-digest.ts` (Stop hook) con:

1. Al final de sesion: exportar top chunks de session store → knowledge graph
2. Categorizar por KnowledgeCategory: `"pattern"`, `"architecture"`, `"debug_insight"`
3. Usar attention/scorer para priorizar que persistir

Extender `memory-inject.ts` (UserPromptSubmit hook) con:

1. Al inicio de sesion: cargar knowledge entries relevantes al query
2. Hidratar session store con entradas de knowledge graph (warm start)

### Fase E: Knowledge Bridge

```
Session Store (bun:sqlite :memory:)
        ↕ sync
Knowledge Graph (JSONL persistente)
```

- **Export** (session → knowledge): al final de sesion via session-digest
- **Import** (knowledge → session): al inicio via memory-inject
- **Criteria**: solo chunks con score > 0.5 y confidence > 0.7

### Edge Cases

| Caso | Comportamiento |
|------|---------------|
| bun:sqlite no disponible | Fallback a pass-through (sin virtualizacion) |
| Output < 4KB | Pass-through sin indexar |
| FTS5 search sin resultados | Retornar raw output original |
| Session store corrupta | Recrear :memory: DB fresca |
| Knowledge graph lleno (>10MB) | Purge entries con TTL expirado o confidence < 0.3 |
| Tool output binario | Skip (solo text/code) |

### Stack Alignment

| Aspecto | Decision | Alineado con | Fuente |
|---------|----------|-------------|--------|
| Runtime | Bun | Poneglyph usa Bun para todo | package.json |
| DB | bun:sqlite (built-in) | Zero deps extra | [11] |
| Search | FTS5 + BM25 + Porter | Mismo approach que Context Mode | [1] |
| Storage session | :memory: SQLite | Rapido, no requiere cleanup | [11] |
| Storage persistent | Knowledge Graph JSONL | SPEC-012 ya implementado | [14] |
| Scoring | attention/scorer.ts | SPEC-008 ya implementado | [12] |
| Hook event | PostToolUse | Patron establecido en Poneglyph | settings.json |

### Interfaces

```typescript
// context-store/types.ts
export interface VirtualizationResult {
  virtualized: boolean;
  originalTokens: number;
  compressedTokens: number;
  reductionPct: number;
  chunksIndexed: number;
  summary: string;
}

export interface SessionCheckpoint {
  sessionId: string;
  timestamp: string;
  activeFiles: string[];
  decisions: string[];
  unresolvedErrors: string[];
  topChunks: ContextChunk[];
  totalTokensSaved: number;
}

export interface ContextAuditResult {
  totalSessions: number;
  totalTokens: number;
  toolOutputTokens: number;
  toolOutputPct: number;
  outputSizeDistribution: Record<string, number>; // "<1KB", "1-4KB", "4-16KB", ">16KB"
  estimatedSavings: number;
  recommendation: "proceed" | "marginal" | "not_needed";
}
```

## 5. FAQ

**Q: ¿Por que no usar Context Mode directamente?**
A: Tres bloqueantes: (1) Windows no soportado — hooks son shell scripts Unix, (2) licencia ELv2 no es open source permisivo, (3) DB temporal se pierde al cerrar. [Basado en: investigacion de GitHub, HN, docs]

**Q: ¿Por que bun:sqlite en vez de better-sqlite3?**
A: bun:sqlite es built-in en el runtime de Bun — zero dependencias extra, cross-platform automatico, misma API SQLite con FTS5 incluido. [Basado en: docs oficiales de Bun]

**Q: ¿No es over-engineering para un solo usuario?**
A: Por eso el PoC primero. Si `/context-audit` muestra <30% token waste, no se implementa el sistema completo. Solo lo que los datos justifiquen. [Basado en: principio Anthropic "minimal viable tokens"]

**Q: ¿Que pasa si la virtualizacion pierde informacion relevante?**
A: (1) Threshold de 4KB — outputs chicos no se tocan, (2) El modelo puede hacer search en el indice FTS5 para recuperar datos, (3) Exit 0 siempre — si algo falla, el output original pasa intacto. [Basado en: critica HN sobre informacion perdida]

**Q: ¿Como interactua con la compaction nativa de Claude Code?**
A: Se complementan. La compaction resume la conversacion (mensajes). La virtualizacion reduce tool outputs ANTES de que entren en la conversacion. Menos datos → compaction mas tardia → sesion mas larga. [Basado en: Anthropic docs de compaction]

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: Context Audit (PoC)

  Scenario: Analizar token waste en traces existentes
    Given existen traces en ~/.claude/traces/
    When ejecuto /context-audit
    Then veo el total de tokens consumidos por tool outputs
    And veo la distribucion de tamano de outputs
    And veo el % de tokens que son tool outputs vs razonamiento
    And veo una recomendacion (proceed/marginal/not_needed)

Feature: Context Virtualization

  Scenario: Output grande se virtualiza
    Given un PostToolUse hook activo en Read
    When Read retorna un output de 20KB
    Then el output se indexa en bun:sqlite FTS5
    And se genera un summary comprimido
    And el summary entra al contexto (no el raw output)
    And el ahorro de tokens se registra

  Scenario: Output pequeño pasa sin cambios
    Given un PostToolUse hook activo en Read
    When Read retorna un output de 2KB
    Then el output pasa intacto al contexto
    And no se indexa en FTS5

  Scenario: Busqueda en contexto virtualizado
    Given outputs indexados en session store
    When el modelo necesita datos especificos
    Then puede buscar via FTS5 BM25
    And recibe solo los chunks relevantes

Feature: Session Checkpoints

  Scenario: Checkpoint al final de sesion
    Given una sesion con outputs virtualizados
    When la sesion termina (Stop hook)
    Then se exportan top chunks al knowledge graph
    And se genera un SessionCheckpoint

  Scenario: Restauracion al inicio de sesion
    Given un SessionCheckpoint de sesion anterior
    When se inicia nueva sesion (UserPromptSubmit)
    Then se cargan knowledge entries relevantes
    And se hidratan en el session store

Feature: Cross-Platform

  Scenario: Funciona en Windows
    Given entorno Windows 11 + Git Bash
    When se ejecuta context-virtualizer.ts
    Then bun:sqlite funciona sin errores
    And paths se normalizan correctamente

  Scenario: Funciona en Mac
    Given entorno macOS
    When se ejecuta context-virtualizer.ts
    Then bun:sqlite funciona sin errores
```

## 7. Open Questions

| # | Pregunta | Impacto | Resolucion Propuesta |
|---|----------|---------|---------------------|
| 1 | ¿4KB es el threshold correcto para virtualizar? | Determina cuantos outputs se interceptan | PoC medira distribucion de tamanos para calibrar |
| 2 | ¿Como afecta la virtualizacion a la calidad de respuestas? | Si el modelo pierde contexto critico, empeora | Test A/B en sesiones reales post-implementacion |
| 3 | ¿El PostToolUse hook puede modificar lo que Claude "ve"? | Si solo puede sugerir, no reemplazar, el approach cambia | Verificar behavior de `additionalContext` vs `decision` en PostToolUse |
| 4 | ¿bun:sqlite FTS5 funciona con Porter tokenizer en Windows? | Bloqueante si no | Test en entorno Windows antes de implementar |
| 5 | ¿Cuanto overhead anade bun:sqlite por operacion? | Si >100ms, afecta UX | Benchmark como parte del PoC |
| 6 | ¿El knowledge graph JSONL escala a >10K entries? | Performance de lectura | Evaluar si necesita compaction/archiving |

## 8. Sources

| # | Fuente | Tipo | URL |
|---|--------|------|-----|
| 1 | context-mode GitHub | MCP Server | https://github.com/mksglu/context-mode |
| 2 | HN Discussion 1 | Comunidad | https://news.ycombinator.com/item?id=47148025 |
| 3 | HN Discussion 2 | Comunidad | https://news.ycombinator.com/item?id=47193064 |
| 4 | Anthropic Context Engineering | Oficial | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| 5 | Claude Code Context Buffer | Docs | https://claudefa.st/blog/guide/mechanics/context-buffer-management |
| 6 | GitHub #14941 | Bug | https://github.com/anthropics/claude-code/issues/14941 |
| 7 | Manus ACE | Research | https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus |
| 8 | ACE Paper | Research | https://arxiv.org/abs/2510.04618 |
| 9 | Claude Code MCP Docs | Oficial | https://code.claude.com/docs/en/mcp |
| 10 | Context Mode Blog | Blog | https://mksg.lu/blog/context-mode |
| 11 | bun:sqlite Docs | Runtime | https://bun.sh/docs/api/sqlite |
| 12 | SPEC-008 | Interno | .specs/v1.5/SPEC-008-agent-attention-mechanisms.md |
| 13 | SPEC-004 | Interno | .specs/v1.1/SPEC-004-stale-context-detection.md |
| 14 | SPEC-012 | Interno | .specs/v2.0/SPEC-012-knowledge-graph.md |
| 15 | poneglyph-orchestration-docs | Interno | poneglyph-orchestration-docs.html |
| 16 | competitive-analysis | Interno | competitive-analysis.html |

## 9. Next Steps

| # | Task | Complejidad | Dependencia |
|---|------|-------------|-------------|
| 1 | Crear comando `/context-audit` (PoC) | 8 | Ninguna |
| 2 | Verificar bun:sqlite FTS5 en Windows | 4 | Ninguna |
| 3 | Crear `lib/context-store/` con bun:sqlite wrapper | 28 | Task 2 |
| 4 | Implementar PostToolUse hook `context-virtualizer.ts` | 32 | Task 3 |
| 5 | Integrar session checkpoints en session-digest | 20 | Task 3, 4 |
| 6 | Integrar knowledge bridge (FTS5 ↔ knowledge graph) | 24 | Task 3, 5 |
| 7 | Integrar warm start en memory-inject | 16 | Task 6 |
| 8 | Registrar hook en settings.json | 4 | Task 4 |
| 9 | Test suite completa | 24 | Task 3-7 |
| 10 | Benchmark de latencia y token savings | 12 | Task 4 |
