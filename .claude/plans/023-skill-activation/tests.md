---
spec: 023-skill-activation
tasks: tasks/index.md
phase: 2.5
test_mode: tdd
tdd_policy: optional
note: project policy auxiliary; US1/US2 opt-in tdd:forced per their frontmatter
---

# tests.md — 023-skill-activation (TDD-mode HUs)

Classification: US1 TDD-mode (`lib/rank.ts`), US2 TDD-mode (`skill-activation.ts:processPayload`). US3/US4 → validations.md.

## US1 — tests (skill-advisor rank())

### T1.1 — happy: rankea y recorta a ≤5
- **Type**: unit
- **Pre-condition**: fixtures de 8 skills `{name, description, keywords}` + tarea "optimiza el endpoint lento"
- **Action**: `rank(task, skills)`
- **Assert**: devuelve array ordenado por relevancia, `length ≤ 5`, con `review-patterns` entre los primeros (overlap "performance/slow/endpoint")
- **Must fail before impl (red)**: `TypeError: rank is not a function` (módulo aún no existe)

### T1.2 — edge: ninguna skill relevante → shortlist vacío
- **Type**: unit
- **Pre-condition**: fixtures + tarea "hola buenos días"
- **Action**: `rank(task, skills)`
- **Assert**: `[]` (no inventa candidatas; la skill luego dirá "ninguna aplica")
- **Must fail before impl (red)**: módulo no existe

### T1.3 — edge: dedupe entre `.claude/skills` y `~/.claude/skills`
- **Type**: unit
- **Pre-condition**: misma skill `drillme` presente en ambas rutas
- **Action**: `rank(task, skillsConDuplicado)`
- **Assert**: aparece UNA sola vez en el shortlist (dedupe por `name`)
- **Must fail before impl (red)**: módulo no existe

### T1.4 — property (opt-in): el shortlist nunca excede 5 ni contiene duplicados
- **Type**: property-based
- **Invariant**: `∀ task, skills: rank(task,skills).length ≤ 5 ∧ sin nombres repetidos`
- **Generator**: listas aleatorias de 0..30 skills + tareas variadas
- **Must fail before impl (red)**: módulo no existe

## US2 — tests (skill-activation processPayload)

> Extiende la suite existente `.claude/hooks/__tests__/skill-activation.test.ts`.

### T2.1 — happy: prompt no trivial → shortlist con motivo + skill-advisor
- **Type**: unit
- **Pre-condition**: fixtures de skills incl. `skill-advisor` + prompt "refactoriza el módulo de pagos aplicando SOLID"
- **Action**: `processPayload(JSON.stringify({prompt}), skills)`
- **Assert**: salida contiene una candidata con motivo (p.ej. `review-patterns — <motivo>`) Y `skill-advisor`; ≤6 líneas
- **Must fail before impl (red)**: salida actual solo tiene `Invoke Skill(review-patterns)` sin motivo y sin `skill-advisor` → assertion `toContain("skill-advisor")` falla

### T2.2 — `/goal` se procesa (no se salta)
- **Type**: unit
- **Pre-condition**: prompt `/goal escribe tests para el parser`
- **Action**: `processPayload(...)`
- **Assert**: salida no vacía (matchea `tdd-design`/etc. + skill-advisor)
- **Must fail before impl (red)**: hoy `/goal` retorna `""` → assertion de no-vacío falla

### T2.3 — `/flow` y `/role` siguen saltándose
- **Type**: unit
- **Action**: `processPayload({prompt:"/flow valida este plan"})` y `{prompt:"/role security"}`
- **Assert**: ambos `""`
- **Must fail before impl (red)**: pasa hoy para /flow; se mantiene como regresión-guard

### T2.4 — edge: prompt trivial → NO inyecta skill-advisor (sin ruido)
- **Type**: unit
- **Pre-condition**: prompt corto sin señal de trabajo ("gracias")
- **Action**: `processPayload(...)`
- **Assert**: `""` (no fuerza skill-advisor en triviales)
- **Must fail before impl (red)**: depende de la heurística de "no trivial" a implementar

### T2.5 — presupuesto de líneas respetado
- **Type**: unit
- **Action**: prompt que matchea 2 skills + skill-advisor
- **Assert**: `output.split("\n").length ≤ 6`
- **Must fail before impl (red)**: si se inyecta sin recorte, supera el presupuesto

## Drillme — Phase 2.5
1. `[failure]` Happy + edge cubiertos: US1 (T1.1/T1.2/T1.3 + property), US2 (T2.1..T2.5). ✓
2. `[approach]` ¿HU sin oracle? No — US1/US2 tienen lógica pura testeable.
3. `[approach]` Property-based: US1 `rank()` tiene invariante (≤5, sin dups) → T1.4 opt-in. ✓
