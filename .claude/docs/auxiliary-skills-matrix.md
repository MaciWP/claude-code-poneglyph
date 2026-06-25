# Auxiliary skills matrix (canon — referenced by each phase SKILL.md)

> Source of truth for which auxiliary skills each phase skill invokes. Every phase SKILL.md (scope/tech-plan/tdd-design/build/critic/retro + drillme) carries an "Auxiliary skills invoked" block with the relevant row of this table (it does NOT duplicate the full table). Relocated here from `001-poneglyph-5phase-workflow/tasks/index.md` when that plan was archived (2026-06-24); the matrix is live canon, the plan is history.

## Catálogo de auxiliaries

| Auxiliary skill | Propósito | Disable-model-invocation |
|---|---|---|
| `anti-hallucination` | Verificar premisas factuales (Glob/Grep/LSP antes de afirmar) | false (auto) |
| `drillme` | Socratic check (4 categorías canónicas + complementarios) | false (auto) |
| `decision-stress-test` | 5-12 perspectives en paralelo + cross-debate + synthesis + vote | false |
| `diagnostic-patterns` | Debug, retry, recovery, 5-whys, circuit breaker, saga | false |
| `lsp-operations` | Semantic navigation: goToDefinition, findReferences, hover, call hierarchy | false |
| `review-patterns` | Quality (SOLID/DRY/complexity) + Performance (N+1/leaks/async) modes | false |
| `prompt-engineer` | Prompt quality (refinar / generar / review delegation / audit) | false |
| `explain-changes` | Educational walkthrough de cambios para entender / aprender | false |
| `meta-create` | Crear extensiones Claude Code (skills/commands/hooks/rules/MCP/plugin) | false |
| `meta-settings-cookbook` | Reference rápido para CLAUDE.md/settings.json/output styles/permissions | true (manual) |
| `security-review` (plugin) | Security audit del branch pendiente | (plugin) |
| `simplify` (plugin) | Review code for reuse/quality/efficiency + fix | (plugin) |

## Cruce: qué phase skill invoca a qué auxiliary

| Phase skill | anti-hallucination | drillme | decision-stress-test | diagnostic-patterns | lsp-operations | review-patterns | prompt-engineer | explain-changes | meta-create | meta-settings-cookbook | security-review | simplify |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **scope** (F1) | ✅ premisas factuales del brief | ✅ cierre fase | ⚠️ modo full (perspectives producto) | — | — | — | ✅ brief vago → refinar | — | — | — | — | — |
| **tech-plan** (F2) | ✅ archivos/funciones/patrones del proyecto | ✅ cierre fase | ✅ modo full (2+ alternativas técnicas) | — | ✅ entender deps reales del código | — | ✅ review delegation prompts | — | ✅ si plan crea skills/hooks/rules | ✅ si plan toca CLAUDE.md/settings | — | — |
| **tdd-design** (F2.5) | ✅ funciones/módulos referenciados | ✅ cierre fase | — | — | — | — | — | — | — | — | — | — |
| **build** (F3) | ✅ cada Edit/Write previa verificación | ✅ intra-HU | — | ✅ tests fallan → 5-whys | ✅ findReferences/hover | ⚠️ opcional — quality durante escritura | — | — | ✅ si HU = crear extensión | ✅ si HU toca config | — | — |
| **critic** (F4) | ✅ findings antes de reportar | ✅ cierre fase | ⚠️ si revela decisión arquitectónica | ✅ tests fallan en ejecución | ✅ call hierarchy → impacto | ✅ modo quality/performance según contenido | — | ⚠️ si reviewer humano necesita walkthrough | — | — | ✅ auth/payments/secrets/credentials | ⚠️ refactor opcional |
| **retro** (F5) | ✅ promociones — paths existen | ✅ cierre feature | — | — | — | — | — | ⚠️ si retro produce doc educativo | ⚠️ si retro propone nueva skill/rule | ⚠️ si retro propone setting | — | — |
| **drillme** (transversal) | ✅ premisas en respuestas factuales | — | ✅ escalación cuando alcanza techo | — | — | — | — | — | — | — | — | — |

Leyenda: ✅ = invocación canónica esperada · ⚠️ = condicional según contexto · — = no aplica

## Patrón canónico del bloque "Auxiliary skills invoked" (a copiar en cada SKILL.md)

```markdown
## Auxiliary skills invoked

> Canonical matrix in `.claude/docs/auxiliary-skills-matrix.md`. Row below is the literal subset that applies to this phase skill.

| Auxiliary skill | When this skill invokes it | Fallback if skill->skill fails |
|---|---|---|
| `<aux1>` | <when> | <manual recovery path> |
```
