---
us: US2
title: Corpus externo de comparación 12-20 fuentes con grounding verificable
wave: W1
depends_on: []
tdd_mode: skip
estimate: L
status: closed
absorbs_decision: corpus-cap-12-20-ratificado-usuario
---

# US2 — Corpus externo de comparación 12-20 fuentes con grounding verificable

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US5] |
| **Files touched** | `build/corpus.md` (crear) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | L (1-2 sesiones — potencialmente split si >20 WebFetch budget) |
| **Cómo arrancar** | WebFetch URLs Anthropic docs canónicas primero (mayor peso) |
| **Decisión absorbida** | Cap 12-20 fuentes ratificado usuario a pesar BLOCKER perspectives (apples-to-oranges asumido) |

## User story

- **As a**: Oriol
- **I want**: un corpus externo verificable de soluciones similares y estudios empíricos
- **So that**: el cross-analysis (US5) tiene baseline real contra la cual comparar poneglyph

## Acceptance criteria

- **AC1**: Given el cap 12-20 fuentes, when se cierra el corpus, then incluye N fuentes entre 12 y 20 (no menos, no más) distribuidas en categorías: (a) Repos GitHub comparables (6-8), (b) Anthropic official docs (3-5), (c) Estudios empíricos / blogs reputados (3-5), (d) GitHub issues canónicas (1-2).
- **AC2**: Given cada fuente, when se documenta, then incluye OBLIGATORIO: (a) URL directa verificable (no homepage genérica), (b) WebFetch executed result (status code + 1-line evidence quote), (c) star-count si aplica (verificado ese día), (d) "compare-context: personal-system|enterprise-multi-user|library|paper|blog" label, (e) "qué es" en 1 párrafo, (f) "qué nos enseña" en 1 párrafo.
- **AC3**: Given Commandment II (no hallucinations), when una URL devuelve 404 o redirige a página irrelevante, then la fuente se marca `[URL-DEAD]` y se busca alternativa O se documenta el muerte URL como hallazgo en US6.
- **AC4**: Given fuentes apples-to-oranges (enterprise multi-user vs personal single-user), when se incluyen, then se declara explícitamente el mismatch en `compare-context` field — US5 honra esa label en cross-analysis.
- **AC5**: Given el corpus, when se cierra, then se organiza en tabla ordenada por relevancia/peso para poneglyph (no alfabético).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/corpus.md` | Corpus 12-20 fuentes verificadas |

## Workflow detallado

1. **Wave A — Repos GitHub comparables (target 6-8)**:
   - wshobson/agents (~36k stars) — agent collection
   - davila7/claude-code-templates (~27k) — templates
   - VoltAgent/voltagent (~20k) — TypeScript multi-agent
   - cline/cline — VSCode agent
   - Aider-AI/aider — terminal AI pair-programmer
   - continuedev/continue — IDE assistant
   - bmadcode/BMAD-METHOD — agile AI workflow
   - NomenAK/SuperClaude_Framework — Claude framework
   - github/spec-kit (Anthropic-adjacent SDD) — si existe
   
   Por cada: WebFetch repo README → extract stars + descriptor + 1 evidence quote + compare-context label.

2. **Wave B — Anthropic official docs (target 3-5)**:
   - https://code.claude.com/docs/en/skills (skills doc)
   - https://code.claude.com/docs/en/sub-agents (sub-agents doc)
   - https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills (engineering blog)
   - https://docs.anthropic.com/en/release-notes/claude-code (release notes)
   - **[POST-SPEC ADDITION 2026-05-29]** Anthropic blog "Introducing dynamic workflows in Claude Code" (May 28, 2026) — buscar URL exacta vía WebSearch. **Weight especial**: overlap directo con poneglyph `/flow` orchestrator. Use case literal del blog: "security audits, codebase-wide bug hunts" — es lo que poneglyph hace manualmente.
   - **[POST-SPEC ADDITION 2026-05-29]** Anthropic Opus 4.8 announcement (si existe URL separada del anuncio dynamic workflows).
   - **[POST-SPEC ADDITION 2026-05-29]** ultracode setting docs (Claude Code-specific effort menu setting que activa dynamic workflows).
   
   Por cada: WebFetch + extract canonical claim relevante. Para dynamic workflows: extraer (a) qué hace, (b) qué reemplaza de poneglyph (orquestación manual de waves/DAG/state.json), (c) qué de poneglyph sobrevive (Commandments, output-style, drillme catalog).

3. **Wave C — Estudios empíricos / blogs (target 3-5)**:
   - METR RCT 2025 paper "Measuring the effects of AI on developer productivity" (URL específica)
   - Apiiro "Vibe coding" security study
   - faros.ai "Claude Code token limits" blog
   - Anthropic blog posts sobre orchestration patterns
   - Karpathy / Linus / cualquier voz reputada sobre AI coding workflows
   
   Por cada: WebFetch + extract central claim cuantitativo + URL stable.

4. **Wave D — GitHub issues canónicas (target 1-2)**:
   - Issue #32910 (skills field semantics) — cited en spec 001
   - Issue #59968 (skill-to-skill probabilistic) — cited múltiples skills
   
   WebFetch issue + extract canonical statement.

5. **Cap check**: total entre 12-20. Si Wave A produce 10 candidatos → priorizar top-6 por peso/relevancia y mover restantes a "Apéndice: fuentes consideradas no incluidas".

6. Generar `build/corpus.md` con frontmatter (`research_date: 2026-05-28`, `total_sources: N`) + tabla por categoría + sección "compare-context distribution" (cuántas personal vs enterprise vs library).

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Buscar fuentes en otros ecosistemas (Cursor rules, Plandex, GitHub Copilot Workspace)? Decisión: SI tienen patterns aplicables (e.g., spec-driven-dev de Plandex); NO solo por completitud. |
| `[approach]` | ¿Priorizar fuentes recientes (post-2025) o canónicas (older but foundational)? Mix: canónicas para fundamentos, recientes para state-of-art. |
| `[context]` | ¿Cómo manejar fuentes que están detrás de paywall o que el WebFetch no puede leer (e.g., academic PDF)? Documentar como "indirect: cited via [other-source]" — declarar limitación. |
| `[failure]` | ¿Qué hacer si un repo crítico (wshobson) está deprecated / archived? Documentar como hallazgo en US6 + reemplazar por sucesor o alternativa equivalente. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honestidad sobre apples-to-oranges: label `compare-context` explícita |
| II | Anti-hallucination total: cada URL verified con WebFetch (no memory citation) |
| V | Entender el ecosistema antes de auto-evaluarse |

## Reutiliza

- `anti-hallucination` skill — per URL verification
- WebFetch tool (delegable a Explore agent si volumen alto)

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| WebFetch budget excedido en sesión 1 | Split en US2a (Waves A+B) + US2b (Waves C+D); registrar split en state.json |
| Repo target archived/deprecated | Documentar como hallazgo (US6) + buscar sucesor |
| Fuente comparable no encontrada en categoría | Reducir cap por debajo de 12 SI el corpus restante es de alta calidad; nunca inflar con fuentes irrelevantes solo para llegar a 12 |

## Smell signals

- ⚠️ >50% fuentes con `compare-context: enterprise-multi-user` → corpus apples-to-oranges dominante; el cross-analysis US5 deberá flagear ese sesgo
- ⚠️ Star-count "verified" sin fecha de research → re-check obligado (counts cambian)
- ⚠️ "Qué nos enseña" vacío o genérico → la fuente no aporta señal, considerar remover

## Verificación post-implementación

- Smoke: contar fuentes en `build/corpus.md` — entre 12 y 20 inclusive.
- Cada URL en el corpus → WebFetch reproducible (status 200 o documentar 404).
- Cada compare-context label asignado (ninguno vacío).

## Open questions (a resolver en implementación)

- ¿spec-kit (GitHub) está vivo en 2026? Verificar al ejecutar.
- ¿Existe paper específico mejor que METR para "AI velocity en devs expertos"? Buscar follow-ups 2026.
