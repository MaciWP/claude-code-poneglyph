---
spec: 017-personal-optimization
tasks: tasks/
created: 2026-06-10
phase: 2.5
status: draft
validation_mode: validation
test_policy: auxiliary
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

12 de 15 HUs producen markdown/skills/configs/movimientos de ficheros — sin oracle binario natural. Las validaciones declarativas (Grep/Read/jq/ls) son el puente verificable. US4/US11/US12 van en `tests.md` (código ejecutable, tdd forced).

Clasificación: US1 validation (skill md) · US2 validation (CLAUDE.md + rule + doc) · US3 validation (output-style md) · US5 validation (borrado, skip-justified) · US6 validation (moves + json, skip-justified) · US7 validation (docs, skip-justified) · US8 validation (settings.json) · US9 validation (skills md) · US10 validation (skills md) · US13 validation (skills md + command) · US14 validation (skill nueva md) · US15 validation (memoria md, skip-justified).

## US1 — Doctrina orquestación inline-first

### Pre
- Los 5 ficheros de orchestrator-protocol existen (verificado 2026-06-10: SKILL.md + references 01/03/04/05/06).

### Post
- Doctrina inline-first presente en SKILL.md; agentes = paralelización de lecturas independientes; 3 costes documentados.
- Anchor de 5-10 líneas entregado a US2 (en el reporte de la HU).

### Structural assertions
- El spawn decision tree responde "inline" para trabajo de escritura sin opt-in explícito.
- Cita de CC 2.1.133 → `_research-skill-activation-2026-06-09.md` presente en 06-context-arch-h.md.

### Smoke
- `grep -rn "builder\|reviewer\|scout" .claude/skills/orchestrator-protocol/` → solo menciones históricas con disclaimer.

### Cross-validations
- El wording del ≥4 rule no contradice flow.md (US7 lo alinea — verificar tras ambas).

## US2 — Dieta del always-loaded

### Pre
- US1 y US3 cerradas (anchors disponibles); baseline CLAUDE.md = 264 líneas.

### Post
- CLAUDE.md ≤200 líneas; docs/system-inventory.md creado; error-recovery.md veraz.

### Structural assertions
- Tabla de 10 Mandamientos intacta; anchors de orquestación y estilo presentes; sin referencia a agent-memory.
- system-inventory.md documenta TODOS los dirs reales de .claude/ post-US5.

### Smoke
- `wc -l CLAUDE.md` ≤200 · `grep -c "agent-memory" CLAUDE.md` = 0 · tabla Hook Reliability coincide con settings.json.

### Cross-validations
- Nada evicted se pierde: cada sección movida localizable en system-inventory.md.
- Recordatorio de re-sync (Windows copia CLAUDE.md) presente en el reporte.

## US3 — Estilo es-ES natural

### Pre
- output-styles/poneglyph.md existe (131 líneas baseline).

### Post
- Reglas de compresión telegráfica sustituidas por es-ES natural; anchor de 3-5 líneas para US2.

### Structural assertions
- ≥3 counter-examples de calco del inglés; ≥2 de telegrafismo; regla de juicio para anglicismos escrita.
- Etiquetas de confianza, iconos de estado, anti-adulación y desacuerdo estructurado intactos.

### Smoke
- `grep -n "drop articles\|noun-verb-object" .claude/output-styles/poneglyph.md` → 0 vivos.

### Cross-validations
- Excepción by-design de CLAUDE.md (ejemplos en español = spec) sigue válida tras US2.
- Validación conductual diferida a la sesión siguiente (lección conocida) — checkpoint en retro.

## US5 — Borrado de artefactos muertos (skip-justified: deletion-only)

### Pre
- Re-grep de referencias entrantes por target inmediatamente antes de borrar → 0.
- Confirmación del usuario sobre los .json de data/ obtenida.

### Post
- 4 HTML de raíz, .claude/data/ (según confirmación) y .claude/agent-memory/ eliminados vía git rm.

### Structural assertions
- html-report/templates/ y decide/templates/ intactos (componentes vivos).

### Smoke
- `ls *.html` en raíz → vacío · `ls .claude/data .claude/agent-memory` → no existen.

### Cross-validations
- system-inventory.md (US2) no lista los dirs borrados.

## US6 — Archivo de planes (skip-justified: moves + json)

### Pre
- Tabla de clasificación 001-016 ratificada por el usuario ANTES de mover.
- Grep de referencias entrantes por plan (p.ej. 001 citado como matriz canónica por skills de fase) resuelto por caso.

### Post
- plans/ = 017 + templates/ + _research-* retenidos por referencia; resto en _archive/ gitignored; audits 005/009 en .claude/audits/.

### Structural assertions
- Cada state.json (archivado o vivo) con campos válidos — 0 `status: null`.
- `.gitignore` contiene la entrada `_archive/`; flow.md lleva la nota de política de archivo (2-3 líneas).

### Smoke
- `for f in .claude/plans/*/state.json; do jq -e '.feature_closed != null' $f; done` → todos OK.
- `/flow --resume 017-personal-optimization` sigue resolviendo.

### Cross-validations
- Ninguna skill/doc viva referencia un path movido a _archive/ (grep por slugs archivados).

## US7 — Barrido de verdad restante (skip-justified: doc-only)

### Pre
- US1 cerrada (la alineación de flow.md con la doctrina necesita el wording final).

### Post
- test-policy.md, paths/orchestration.md, docs/arch-h-*.md y flow.md corregidos y citados.

### Structural assertions
- Menciones históricas en pasado con disclaimer; 0 instrucciones vivas hacia componentes muertos.
- Cada pin de versión en flow.md con fuente.

### Smoke
- `grep -rn "\.claude/agents" .claude/rules/` → 0 · `grep -n "builder" .claude/rules/test-policy.md` → 0 vivos.

### Cross-validations
- Párrafo Workflow de flow.md coherente con la doctrina US1 (fan-out de escritura = opt-in).

## US8 — settings.json modernización

### Pre
- Schema/docs actuales consultados; tabla de campos verificados construida ANTES de editar.
- US4 cerrada (posible hook Stop-gate que registrar).

### Post
- settings.json modernizado: version gate + fallback (si verifican), env y permisos revisados, decisión MCP documentada.

### Structural assertions
- 0 campos no verificados contra schema (Mandamiento II); declaración `sensitive:` emitida en la edición.

### Smoke
- `bun -e "JSON.parse(await Bun.file('.claude/settings.json').text())"` → OK; sesión siguiente sin warnings.

### Cross-validations
- sync-claude regenera ~/.claude/settings.json sin romper el merge con settings.machine.json.

## US9 — Phase skills: activación + references

### Pre
- Campo `disable-model-invocation` verificado en docs; smoke en UNA skill antes del rollout.

### Post
- 6 phase skills con el campo (o revert documentado); retro/critic ≤350 líneas con references.

### Structural assertions
- References extraídas a 1 nivel; ToC en references >100 líneas.

### Smoke
- `Skill('critic')` estilo /flow carga correctamente · `wc -l .claude/skills/{retro,critic}/SKILL.md` ≤350.

### Cross-validations
- Contenido extraído íntegro (diff de movimiento, no de borrado); drillme/skill-advisor SIN el campo.

## US10 — Descriptions audit + rubric

### Pre
- Página oficial de skill-authoring accesible (WebFetch).

### Post
- Rubric vendorizado y citado en meta-create/references/; tabla de auditoría 21/21.

### Structural assertions
- Rubric incluye eval-first (≥3 escenarios) y referencia al skill-creator oficial; cada fix traza a una fila del rubric.

### Smoke
- `grep -n "rubric" .claude/skills/meta-create/SKILL.md` → cableado en el workflow.

### Cross-validations
- Descriptions corregidas siguen disparando: spot-check de 3 skills con sus keywords en un prompt de prueba (sesión siguiente).

## US13 — prompt-engineer en el flow

### Pre
- US7 y US9 cerradas (flow.md y phase skills libres de colisión); plantilla tasks.template.md ya con el bloque (hecho en Fase 2).

### Post
- tech-plan exige y puntúa el bloque "Execution prompt"; build lo declara input primario; flow.md lo menciona en Fase 2.

### Structural assertions
- La exigencia referencia el rubric de prompt-engineer (scoring-criteria.md), sin duplicarlo.

### Smoke
- `grep -n "Execution prompt" .claude/skills/tech-plan/SKILL.md .claude/skills/build/SKILL.md .claude/commands/flow.md` → presente en los 3.

### Cross-validations
- tasks.template.md y tech-plan describen el MISMO bloque (mismos 6 campos).

## US14 — Project onboarding

### Pre
- Rubric US10 disponible (la skill nueva debe pasarlo); meta-create/meta-settings-cookbook como canon de construcción.

### Post
- Skill `project-onboard` creada (SKILL.md + templates/) conforme al rubric.

### Structural assertions
- Genera PROPUESTAS ratificables (nunca escribe sin aprobación); CLAUDE.md generado ≤100 líneas con test include/exclude oficial; test-policy propuesta con nivel razonado.

### Smoke
- Dry-run sobre fixture → produce los 3 artefactos propuestos; descripción de la skill dispara con "onboarding", "nuevo proyecto", "bootstrap".

### Cross-validations
- No solapa con `init` builtin ni con meta-settings-cookbook (relación declarada en la skill: compone, no duplica).

## US15 — Curación de memoria (skip-justified: curation)

### Pre
- W1-W3 cerradas (los veredictos dependen del estado post-cambios); lista DELETE ratificada por el usuario.

### Post
- 21 entradas con veredicto KEEP/UPDATE/DELETE aplicado; tabla resumen entregada.

### Structural assertions
- Índice MEMORY.md ↔ ficheros 1:1; memorias feedback solo tocadas con verificación previa.

### Smoke
- Cada línea del índice apunta a fichero existente; 0 entradas contradicen la realidad post-017.

### Cross-validations
- Ninguna memoria referencia como vivos los componentes borrados/renombrados en esta feature.

---

## Cross-cutting validations

- **X1**: tras CADA ola, `bun test ./.claude/hooks/` verde (constraint del spec).
- **X2**: convención de lenguaje intacta — inglés en ficheros del repo, español solo runtime.
- **X3**: Fase 3 arranca en rama nueva desde `main` (la sesión está en `html-report-palette-md-charts`); tras US2/US8 re-ejecutar sync con `--backup`.
- **X4**: cada AC de spec.md (AC1-AC8) mapea a ≥1 HU cerrada al final del build — trazabilidad completa en critic.
