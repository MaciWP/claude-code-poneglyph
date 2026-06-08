---
spec: 006-honesty-and-role-lenses
tasks: tasks/
created: 2026-06-08
phase: 2.5
status: draft
validation_mode: validation
test_policy: auxiliary
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

Las 4 HUs producen markdown/config (`CLAUDE.md`, output-style, comando, skill) — no código ejecutable, sin oracle binario natural. TDD sería ceremonia. Validación declarativa vía Grep/Read/lectura. **Nota clave**: las ACs de *comportamiento* (anti-pelota, labels, discrepancia, hold) no se pueden grep sobre conducta futura; aquí se valida que **las reglas existen y son coherentes en los ficheros**. La conducta runtime se verifica cualitativamente en Phase 4 (critic) + uso real de Oriol.

## Categorías de validación

| Categoría | Significado |
|---|---|
| **Pre-conditions** | Qué debe existir ANTES |
| **Post-conditions** | Qué debe existir TRAS cerrar |
| **Structural assertions** | Estructura/contenido obligatorio |
| **Smoke checks** | Verificación funcional (grep/read/invocación) |
| **Cross-validations** | Refs coherentes; nada huérfano |

## US1 — output-style: honesty mechanics + terseness

### Pre
- `.claude/output-styles/poneglyph.md` existe (97 líneas baseline).

### Post
- Fichero contiene sección "Honesty mechanics" + kill-list bilingüe + convención label default-seguro + formato discrepancia.

### Structural assertions
- Sección/encabezado nuevo de honestidad presente (ej. `## Honesty mechanics` o equivalente).
- Kill-list incluye términos ES **y** EN.
- Convención de labels documenta default-seguro (sin etiqueta = `[Seguro]`; solo se marca `[Probable]`/`[Suposición]`).
- Patrón de discrepancia ("No estoy de acuerdo porque… / Yo haría… / El riesgo…") presente.
- "Overrides" (pedagogía) y "Tone — hard preserves" **intactos**.

### Smoke
- `grep -i "anti-sycophancy\|you're absolutely right\|\[Suposición\]\|No estoy de acuerdo porque" .claude/output-styles/poneglyph.md` → match.
- `grep -i "Overrides" .claude/output-styles/poneglyph.md` → sigue presente.

### Cross-validations
- Los nombres de label (`[Seguro]/[Probable]/[Suposición]`) coinciden con los usados en `CLAUDE.md` (US2). Sin divergencia.

## US2 — CLAUDE.md: honesty protocol + base role + inventory

### Pre
- `CLAUDE.md` existe; Commandments I/II presentes; "System inventory" con Slash commands = 4.

### Post
- Commandment I/II augmentados con bloque "Communication & Honesty Protocol"; subsección "Base role" presente; inventory Slash commands = 5.

### Structural assertions
- Bloque de protocolo de honestidad **dentro/junto a** Commandment I/II (no sección paralela duplicada).
- Subsección "Base role" describe refuerzo (no identidad nueva) + simbiosis intacta.
- Referencia al principio AC10 (multi-round) apuntando a `/flow` + `orchestrator-protocol`.
- "System inventory": Slash commands `5` + mención de `/role` + capa honestidad.
- Commandment I sigue conteniendo "colegas, no jerarquía" / "colleagues, not hierarchy".

### Smoke
- `grep -i "Communication & Honesty Protocol\|Base role" CLAUDE.md` → match.
- `grep -ni "colegas, no\|colleagues, not" CLAUDE.md` → sigue presente (simbiosis intacta).
- `grep -i "Slash commands" CLAUDE.md` → refleja 5.

### Cross-validations
- `/role` mencionado en inventory ⇔ `commands/role.md` existe (US3).
- Label scheme y kill-list coherentes con output-style (US1).
- Principio AC10 ⇔ regla implementada en `/flow` + `orchestrator-protocol` (US4).

## US3 — /role command: catalog + persona-framing

### Pre
- `.claude/commands/role.md` NO existe (gap confirmado en discovery).
- Skills compuestas existen (`security-review`, `diagnostic-patterns`, `review-patterns`, `decision-stress-test`, `tech-plan`, `scope`, `build`, `frontend-design`, `html-report`, `drillme`, `tdd-design`, `critic`, `deep-research`).

### Post
- `commands/role.md` creado con catálogo 13 roles agrupados + persona-framing ≥80 + manejo no-args.

### Structural assertions
- Frontmatter de **comando** válido (description, argument-hint) — NO formato 3-líneas de skill.
- Catálogo 13: Engineering (backend, frontend, devops, security, performance, debugging, architect, data, testing) + General (advisor, research, shopping, pc-optimizer).
- Cada rol mapea a skills existentes (gaps con lente propia: `devops`, `data`, `pc-optimizer`).
- Persona-prompt sigue patrón "Act as senior X → analysis → compose → deliverable".
- Comportamiento `/role` sin args = listar roles agrupados.

### Smoke
- `Glob .claude/commands/role.md` → existe.
- `grep -c "backend\|frontend\|devops\|security\|performance\|debugging\|architect\|advisor\|data\|testing\|research\|shopping\|pc-optimizer" .claude/commands/role.md` → ≥13.
- Invocación mental `/role backend` → asume rol + cita skills (revisión por lectura).

### Cross-validations
- Cada skill citada en el catálogo existe en `.claude/skills/` (anti-hallucination).
- `/role` referenciado en `CLAUDE.md` inventory (US2) ⇔ este fichero.

## US4 — AC10 multi-round en /flow + orchestrator-protocol

### Pre
- `.claude/commands/flow.md` y `.claude/skills/orchestrator-protocol/SKILL.md` existen.

### Post
- Ambos ficheros contienen la regla de multi-round questioning + laterales/mejoras, calibrada anti-ceremonia.

### Structural assertions
- `flow.md`: regla en "SIEMPRE rules" o gates (múltiples rondas + laterales + convergencia explícita).
- `orchestrator-protocol/SKILL.md`: regla turn-level condensada (Step 1 o principio breve).
- Ambas referencian/concuerdan con `drillme` (no duplican su mecánica de iteración).

### Smoke
- `grep -i "rondas\|laterales\|proactiv" .claude/commands/flow.md` → match.
- `grep -i "rondas\|proactiv\|laterales" .claude/skills/orchestrator-protocol/SKILL.md` → match.
- Lectura: adición a orchestrator-protocol condensada (≤2 bullets, no infla el skill).

### Cross-validations
- Principio AC10 en `CLAUDE.md` (US2) ⇔ regla aquí. Mismo concepto, sin contradicción.

---

## Cross-cutting validations

- **X1 (no-regresión)**: `bun test ./.claude/hooks/` sigue pasando tras las 4 HUs (ninguna toca hooks).
- **X2 (consistencia de nombres)**: `/role`, `[Seguro]/[Probable]/[Suposición]`, "Communication & Honesty Protocol" idénticos en los 4 ficheros (index.md Cross-cutting). Phase 4 critic lo verifica.
- **X3 (no duplicación, Commandment X)**: la capa de honestidad augmenta Commandment I/II — no existe una segunda sección de honestidad paralela en CLAUDE.md.
- **X4 (no bloat)**: las adiciones a CLAUDE.md y orchestrator-protocol son condensadas; el catálogo verboso vive solo en `commands/role.md`.
- **X5 (sync multi-OS)**: tras editar, los ficheros siguen siendo válidos para `sync-claude` (symlinks; sin rutas hardcoded por máquina).

## Drillme — Phase 2.5

1. `[failure]` **Happy + edge?** Cada HU tiene Pre/Post/Structural/Smoke/Cross (5 categorías) → sí (validation-mode, no happy/edge de código).
2. `[approach]` **Untestable HU?** 0% untestable: todas tienen oracle estructural por grep/lectura. Las ACs de comportamiento se validan en runtime (critic) — declarado honestamente, no inventado.
3. `[approach]` **Property-based fit?** N/A — no hay parsers/transforms puros. No se fuerza (anti cargo-cult).

Coverage: 2/4 canónicas (fase enfocada en oracle; location/context cubiertos en Phase 2). Untestable rate: 0%.
