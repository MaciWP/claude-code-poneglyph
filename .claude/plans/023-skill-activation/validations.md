---
spec: 023-skill-activation
tasks: tasks/index.md
phase: 2.5
validation_mode: validation
test_policy: auxiliary
---

# validations.md — 023-skill-activation (validation-mode HUs)

Classification: US3 validation-mode (frontmatter de ~23 SKILL.md), US4 validation-mode (markdown flow.md + orchestrator-protocol). US1/US2 → tests.md.

## US3 — description + when_to_use en todas las skills

### Pre
- `when_to_use` confirmado soportado en la versión CC instalada (smoke con 1 skill). Si NO → parar, fallback a description-only, registrar.
- Baseline de longitudes de `description` por skill capturado.

### Post
- Cada `.claude/skills/*/SKILL.md` tiene `description` concisa (caso de uso primero) + `when_to_use` con gatillos ES+EN.

### Structural assertions
- `when_to_use` presente en frontmatter de cada skill (salvo fallback documentado).
- `len(description) + len(when_to_use) ≤ 1536` por skill (combinado).
- `description` en tercera persona (sin "I can"/"You can").
- `when_to_use` incluye ≥1 frase-gatillo en español Y ≥1 en inglés.

### Smoke
- `for f in .claude/skills/*/SKILL.md; do` medir longitud combinada → ninguna >1536.
- `/doctor` → sin warnings de "description dropped"/budget overflow.
- Re-correr `.claude/evals/` → tasa de activación ES/EN ≥ baseline.

### Cross-validations
- US1 (skill-advisor) escribe su propio frontmatter con este mismo patrón (coherencia).
- Ninguna skill queda sin `description` (skill indescubrible — anti-pattern del research).

## US4 — reforzar invocación de skill de fase en /flow

### Pre
- Releídas las secciones Phase 1-5 de `flow.md`.

### Post
- Cada fase en `flow.md` instruye invocar `Skill(<fase>)` de forma imperativa (no enunciativa).
- `orchestrator-protocol` SKILL.md refuerza que en `/flow` la skill de fase se invoca, no se improvisa.

### Structural assertions
- En `flow.md`, cada bloque de fase contiene una instrucción imperativa de invocación (Grep de patrón directivo por fase).
- La nota en orchestrator-protocol NO contradice inline-first (el trabajo sigue inline; la skill aporta procedimiento).

### Smoke
- `Grep -n "INVOKE\|Invoke Skill" .claude/commands/flow.md` → una por fase.
- `bun test ./.claude/hooks/` verde (markdown, sin impacto).

### Cross-validations
- Coherencia con la doctrina inline-first de CLAUDE.md (no introduce delegación del trabajo).
- No añade peso always-loaded (memoria always-loaded-vs-ondemand).

## Drillme — Phase 2.5
1. `[failure]` 5 categorías cubiertas por US3 y US4. ✓
2. `[approach]` ¿HU sin oracle? No — ambas tienen aserciones estructurales/smoke verificables.
3. Untestable rate: 0% — sin smell.
