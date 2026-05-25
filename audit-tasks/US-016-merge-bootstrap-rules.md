---
id: US-016
phase: 2.4
status: completed
estimate: 30m
blocks: []
blockedBy: []
priority: medium
risk: low
---

# US-016 · MERGE `bootstrap-lead.md` + `bootstrap-plan-mode.md` en un solo archivo

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** consolidar las 2 rules `bootstrap-lead.md` y `bootstrap-plan-mode.md` en un único `bootstrap-lead.md`
**Para** simplificar las reglas que se cargan al inicio del Lead

## Contexto extendido

### Evidencia recogida

| Rule | Función | Trigger |
|---|---|---|
| `bootstrap-lead.md` | Carga `orchestrator-protocol` en sesión normal | Primer turno no trivial |
| `bootstrap-plan-mode.md` | Carga `planner-protocol` al entrar en plan mode | System reminder "Plan mode is active" |

Ambas:
- Son **Lead-only** (`CLAUDE_LEAD_MODE=true`)
- Hacen exactamente lo mismo (cargar una skill al activarse el Lead)
- Difieren solo en QUÉ skill cargan y CUÁNDO

### Diseño merged sugerido

Una sola rule `bootstrap-lead.md` con 2 secciones:

```markdown
# Lead Orchestration Bootstrap

**Aplica al Lead session.**

## Sesión normal — cargar protocolo de orquestación

Como primera acción en cualquier sesión no trivial:
```
Skill("orchestrator-protocol")
```

## Plan mode — cargar protocolo de planificación

Si ves un system-reminder con "Plan mode is active":
```
Skill("planner-protocol")
```
```

### Por qué importa

- **2 archivos para una misma intención**: ambos son "bootstrap del Lead"
- **Mantenimiento duplicado**: si cambia la convención de bootstrap, hay que editar 2 archivos
- **Cognitivamente más claro**: una sola entrada en `.claude/rules/` con 2 condiciones

## Análisis — pros y contras

### Pros del merge

- **De 2 archivos a 1** — Commandment X
- **Vista unificada del bootstrap del Lead**: cualquier nueva skill que requiera bootstrap en condición específica se añade aquí
- **Reduce ruido en `rules/`**: 7 → 6 rules

### Contras del merge

- **Si las 2 rules se cargan condicionalmente por triggers diferentes en `settings.json`**, mergearlas puede romper la lógica de when-to-load
- **Tamaño del archivo crece**: pasa de ~40 a ~70 líneas, sigue siendo manejable

### Mitigación de contras

- Verificar el mecanismo de carga de rules antes del merge — ¿son load-always o condicional?
- Las rules son load-always en el current setup (no veo trigger condicional en archivo separado)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Las rules tienen mecanismos de path-scoped distintos (`paths:` frontmatter) | Baja | Medio | Read frontmatter de ambas antes de mergear |
| El system reminder "Plan mode is active" no se detecta tras merge | Media | Alto | Smoke test: entrar en plan mode y verificar que planner-protocol se carga |
| Otros archivos referencian `bootstrap-plan-mode.md` por nombre | Media | Bajo | Grep antes de eliminar; redirigir a `bootstrap-lead.md` |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar ambas rules (10 min)

```bash
Read .claude/rules/bootstrap-lead.md
Read .claude/rules/bootstrap-plan-mode.md
```

**Buscar**:
- Frontmatter (¿tienen `paths:` o `mode:`?)
- Estructura interna (¿"When to invoke", "How to invoke"?)
- Si son idénticas en estructura, el merge es directo

### Paso 2 — Diseñar el archivo merged (5 min)

Estructura objetivo:
```markdown
---
description: Lead bootstrap — load orchestrator-protocol in normal sessions, planner-protocol in plan mode
---

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true`).

## When to invoke

Two triggers:

### A) Normal session
Primera acción no trivial → `Skill("orchestrator-protocol")`

### B) Plan mode
System reminder "Plan mode is active" → `Skill("planner-protocol")`

(Re-invocar libremente si el contexto se compacta o la guidance se diluye)

## How to invoke

`Skill("<name>")` como primera acción tras detectar el trigger.

## Skip si...
- Conversación casual sin trabajo de código
- Tarea trivial (typo, rename de 1 archivo)
```

### Paso 3 — Implementar el merge (5 min)

```bash
Edit .claude/rules/bootstrap-lead.md  # ampliar con la sección de plan mode
Bash: rm .claude/rules/bootstrap-plan-mode.md
```

### Paso 4 — Verificar referencias externas (5 min)

```bash
Grep "bootstrap-plan-mode" .claude/
Grep "bootstrap-plan-mode" CLAUDE.md
Grep "bootstrap-plan-mode" C:\Users\Maci\.claude\CLAUDE.md
```

Cambiar referencias a `bootstrap-lead.md` (la misma rule ahora cubre ambos casos).

### Paso 5 — Smoke test (5 min)

1. Sesión nueva → primer mensaje no trivial → verificar que el Lead llama `Skill("orchestrator-protocol")`
2. Entrar en plan mode → verificar que el Lead llama `Skill("planner-protocol")` (lee el system-reminder y reacciona)

### Paso 6 — Commit (2 min)

```
refactor(rules): merge bootstrap-plan-mode into bootstrap-lead

Both rules were Lead-only bootstrap. Single file with 2 sections
(normal session, plan mode) clarifies intent.

- Removed bootstrap-plan-mode.md
- Extended bootstrap-lead.md to cover both triggers
- Smoke test: orchestrator-protocol and planner-protocol still load correctly
```

## Criterios de aceptación

- [ ] `bootstrap-plan-mode.md` no existe
- [ ] `bootstrap-lead.md` contiene ambas secciones (normal + plan mode)
- [ ] Smoke test: ambos skills se cargan correctamente según el trigger
- [ ] `Grep "bootstrap-plan-mode" .claude/` → 0 resultados (o solo documentación a actualizar en US-022)
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Merge realizado
2. Smoke test confirma comportamiento preservado para ambos triggers
3. Referencias huérfanas listadas (US-022 para CLAUDE.md raíz)
4. Commit
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura ambas rules por separado
```

Trivial.

## Notas

- Si Paso 1 revela que las rules tienen frontmatter `paths:` distinto (e.g. bootstrap-plan-mode aplica solo en plan mode vía mecanismo del harness), respetar esa lógica en el merge usando `mode:` o equivalente
- El mecanismo `Plan mode is active` viene del propio Claude Code como system reminder — el Lead lo detecta en runtime y aplica la sección B

## Ejecución (2026-05-25)

- Commit: `994d220` — `refactor(rules): merge bootstrap-plan-mode into bootstrap-lead`
- Verificación de premisas: ambas rules eran Lead-only (`CLAUDE_LEAD_MODE=true`), frontmatter solo `description` (load-always, sin `paths:` ni `mode:`), estructura paralela (When/How to invoke).
- Decisión: el nuevo `bootstrap-lead.md` tiene tres secciones — `Default trigger (orchestrator-protocol)`, `Plan mode trigger (planner-protocol)` (incluye `Level triage is automatic`) y la preexistente `Delegation Decision Triggers` (A/B).
- Referencias huérfanas en `.claude/` tras el merge: **0** (`Grep "bootstrap-plan-mode" .claude/` → No matches).
- Referencias en `audit-tasks/` y `PONEGLYPH-AUDIT.md`: intactas (documentación histórica de la auditoría). El `CLAUDE.md` raíz del proyecto no mencionaba `bootstrap-plan-mode.md`, así que no requirió cambios. El `~/.claude/CLAUDE.md` global se actualiza en US-022 / US-023.
- `bun test ./.claude/hooks/` → 139/139 ✅
