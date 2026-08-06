# US15 — Racionalización de capas de proyecto (PROPUESTA RATIFICABLE)

Datos medidos 2026-08-05 (inspección directa de las capas). Poneglyph NO edita
los repos binora: cada acción aprobada se ejecuta como run de `project-onboard`
en el repo correspondiente (canal fijado por el plan), contigo delante.

## Coste actual por sesión de trabajo (always-loaded)

| Repo | Capa proyecto | + global (~5.2k→~4.4k tras el refactor de hoy) | Total/turno aprox |
|---|---|---|---|
| binora-frontend | ~7.2k palabras (CLAUDE.md 2.6k + 6 rules) | ~4.4k | **~11.6k palabras ≈ 15k tokens** |
| binora-backend | ~4.4k palabras (CLAUDE.md 2.3k + 7 rules) | ~4.4k | ~8.8k ≈ 12k tokens |
| bjumper-worktrees | CLAUDE.md 3.6k, sin rules | ~4.4k | ~8k |
| binora-contract | 1.9k + capa de otra generación | ~4.4k | ~6.3k |
| binora-mcp | 1k, capa vacía | ~4.4k | ~5.4k |

## Propuestas por repo

### binora-frontend (la más cara — prioridad 1)

1. **`commands/planner.md` — CUT**: fork del planner-protocol cortado globalmente
   (opus-pinned, arquitectura pre-023). Su sustituto es `/flow` + `tech-plan`.
2. **`rules/skill-matching.md` — CUT**: duplica el routing global
   (skill-activation hook + CLAUDE.md §Skill routing) — dos fuentes de verdad.
3. **`rules/tdd-cycle.md` — MERGE**: su contenido útil (TPP examples pointer) a
   la skill frontend-testing-patterns; la política vive en test-policy.
4. **`agent-memory/{reviewer,scout}` — ARCHIVE**: era pre-inline-first.
5. **CLAUDE.md 2.6k → regenerar con la plantilla nueva** (≤100 líneas, gate
   pre-done + Conduct de brevedad — US5): las 19 correcciones "breve pls" y el
   ritual "¿estás seguro?" se atacan aquí.
6. **`commands/review-pr.md` → regenerar desde la plantilla US10** (hardening
   de args + scope discipline), conservando sus 11 criterios frontend.

### binora-backend (prioridad 2)

1. **`rules/skill-discovery.md` — CUT** (mismo motivo que skill-matching).
2. **`agent-memory/{builder,reviewer}` — ARCHIVE** (era pre-inline-first).
3. **`commands/{commit-message,pr-description}.md` — CUT tras verificar** que las
   versiones globales (US10) cubren el 100% (precedencia hoy: proyecto gana; al
   cortarlas, sirven las globales).
4. **CLAUDE.md 2.3k → poda con la plantilla** (mantener Commands verbatim,
   Gotchas reales y convenciones Django que el código no muestra).
5. **`skills/pr-conventional-comments` — CUT** (promovida a global en US10; fix
   del typo `h#` en la fuente si se conserva algo).
6. **Retomar `003-claude-layer-audit`** (su retro sigue pending — cerrarla con
   la ruta de re-enganche de US12 en la misma visita).

### binora-contract

- Capa de otra generación (core/guides/examples/agents) y `[Probable]` sin
  versionar. Propuesta: run de onboard limpio (CLAUDE.md ≤100 líneas + test-policy)
  y decidir contigo qué guides sobreviven como references.

### binora-mcp

- Capa casi vacía con 6+ sesiones de trabajo real: run de onboard estándar
  (stack FastMCP, comando de verificación, gate pre-done).

### Raíz REPOSITORIOS/PYTHON

- `Poneglyph/` + `Poneglyph.rar` (copia vieja): **DELETE previa tu confirmación**
  — fuente de verdad es PERSONAL/REPO; una copia divergente es un footgun.

## Orden propuesto de ejecución (3 visitas cortas)

1. binora-frontend (mayor coste/turno + fricción de brevedad medida).
2. binora-backend (+ cierre exprés de sus 5 lifecycles abiertos en la misma visita).
3. contract + mcp + limpieza de raíz.

Cada visita: `project-onboard` propone → tú ratificas fila a fila → se aplica →
`verify` + smoke de una sesión real en ese repo.
