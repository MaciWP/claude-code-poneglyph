---
spec: 028-p2-backlog-closeout
tasks: tasks/index.md
phase: 2.5
test_mode: tdd
tdd_policy: optional (auxiliary) — forced en US3, US4 y US6-D6 por opt-in
---

# Tests — 028 (US3, US4, US6-D6; resto en validations.md)

Pinned-behavior sweep (regla 027) ejecutado: `learning-inbox.test.ts:10` pinea que la corrección legítima ("te has equivocado") produce candidato — DEBE seguir verde tras el suelo de confianza (restricción de diseño del umbral). security-gate y flow-state no pinean shapes afectados (verificado por grep).

## US3 — learning-inbox

### T3.1 — ruido: truncado mid-word no entra (o entra cortado en frontera de palabra)
- **Type**: unit · **Pre**: payload cuyo contexto excede CONTEXT_MAX a mitad de palabra
- **Action**: `extractCandidates(payload)` · **Assert**: el context resultante termina en frontera de palabra (regex `\S$` sobre última palabra completa), nunca cortado a mitad
- **Red**: assertion falla — hoy `slice(0, CONTEXT_MAX)` corta mid-word

### T3.2 — ruido: confianza bajo el suelo no entra al inbox
- **Type**: unit · **Pre**: candidato de señal con confidence < suelo (valor a fijar leyendo SIGNALS; el suelo NO puede filtrar la señal de T3.4)
- **Action**: `extractCandidates` o filtro previo a `appendToInbox` · **Assert**: no aparece en inbox
- **Red**: hoy entra (retros binora/cv: capturas a 0.4-0.5)

### T3.3 — ruido: contenido JSON/transcript crudo no entra
- **Type**: unit · **Pre**: contexto que es mayormente JSON (`{"role":...`) o transcript crudo
- **Action**: ídem · **Assert**: descartado
- **Red**: hoy entra (evidencia retros)

### T3.4 — pinned: la corrección legítima SIGUE entrando
- **Type**: unit (regresión del pinned) · **Pre**: fixture existente "te has equivocado"
- **Action**: suite existente · **Assert**: sigue verde (candidato con confidence > 0 y sobre el suelo)
- **Red**: N/A — es la restricción que el diseño del suelo debe respetar desde el inicio

## US4 — security-gate

### T4.1 — hallazgo → additionalContext accionable + systemMessage
- **Type**: unit · **Pre**: payload de turno con secreto sospechoso (fixture existente de la suite)
- **Action**: la función que construye la respuesta del hook · **Assert**: JSON contiene `hookSpecificOutput.additionalContext` (menciona el locus y la acción verify/redact) Y el `systemMessage` actual
- **Red**: la clave no existe hoy en el output

### T4.2 — sin hallazgos → sin additionalContext
- **Type**: unit · **Pre**: payload limpio · **Assert**: output sin `hookSpecificOutput` (o sin la clave)
- **Red**: pasa trivialmente hoy… NO — debe escribirse contra la función nueva de build-output; si la función no existe aún, red = module/function not found

## US6-D6 — flow-state complete-phase

### T6.1 — happy: `complete-phase 2.5` marca fase y avanza
- **Type**: unit + integration (runCommand sobre tmpdir, patrón de la suite existente)
- **Pre**: state.json fixture en fase 2 (fixture `baseState()` existente)
- **Action**: `runCommand("complete-phase", ["2.5"], {planDir, date})`
- **Assert**: `phases_completed` contiene 2.5; `updated_at` refrescado
- **Red**: `unknown command "complete-phase"` (el switch no lo tiene)

### T6.2 — edge: fase inválida → error típado
- **Pre**: ídem · **Action**: `complete-phase 7` · **Assert**: throw con mensaje que enumera fases válidas
- **Red**: mismo unknown-command (función inexistente)

## Drillme — Phase 2.5

1. Happy+edge ✓ por HU. 2. Untestable: 0. 3. Property-based: no aplica (filtros de captura son clasificación por casos, no invariantes de transform; cubrir por ejemplos es lo honesto).
