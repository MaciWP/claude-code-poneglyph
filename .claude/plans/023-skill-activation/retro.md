---
spec: 023-skill-activation
phase: 5
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: legitimate
promotions_proposed: 3
promotions_approved: 0
commandment_violations: 1
living_spec_delta: yes
action_items: 3
created: 2026-06-23
status: open
---

# retro.md — 023-skill-activation

## Resumen ejecutivo

Problema: el Lead no usaba skills de forma fiable (auto-activación nativa infra-dispara, no se puede forzar). Entregado: una capa determinista barata (hook) que surface skill-advisor + shortlist en todo trabajo no trivial, skill-advisor como ratify gate, when_to_use ES+EN en las 24 skills, y refuerzo de invocación de fase en `/flow`. Veredicto: el feature salió correcto, pero el CAMINO tuvo fricción real — dos pasos atrás reintroduciendo "force" antes de converger en la respuesta correcta (surfacing determinista, no forzado).

## Lecciones

### ✅ Patrones que funcionaron
- **Dos investigaciones convergentes** (interna 29-agentes + externa 99-agentes) + WebFetch a docs oficiales → alta confianza sin re-derivar. Reusar: cuando ya existe research interno, combinarlo con uno externo de validación antes de planificar.
- **Medir la mitad determinista cuando la conductual no es testeable headless** (`skill-activation-rate.ts`: 50%→100%). Reusar: partir un AC conductual en su mitad determinista (medible ahora) + conductual (next-session) en vez de declararlo NOT-MET o fingir que está.
- **Reviewer de contexto fresco** atrapó AC2/AC4 que yo (autor) había dado por buenos. Reusar: siempre en features que la propia sesión construyó.
- **Dry-run + validación antes de tocar 24 ficheros** (Keywords intacta, ≤1536) → 24/24 a la primera. Reusar: pasadas masivas siempre con dry-run + aserción de invariantes.

### ❌ Patrones que no funcionaron
- **Reintroducir "force" para activación (×2)**: primero special-case `/goal` en el hook, luego force-load de orchestrator-protocol en cada `/goal`. Ambos revertidos. Causa raíz: confundir "el hook no inyectó hint" con "no hay enrutado", e intentar forzar lo que es no-determinista por diseño. El Lead corre como sesión principal (no agente) → ya tiene el core always-loaded y puede invocar Skill() solo. Cómo evitar: ante "hacer que se use X siempre", preguntar primero "¿es esto forzable por diseño?" — si no, diseñar surfacing+ratify, no force. Conecta con [[feedback-skill-wiring-over-autotrigger]], [[feedback-always-loaded-vs-ondemand-cost]], [[feedback-fix-class-not-instance]].

## Process audit

| Phase | Esfuerzo | Fricción | Mejora |
|---|---|---|---|
| 1 scope | S | ninguna (brief co-redactado) | — |
| 2 tech-plan | M | ninguna | — |
| 2.5 tdd-design | S | ninguna | — |
| 3 build | L | US3 (24 ficheros) requirió dry-run cuidadoso | el patrón dry-run funcionó |
| 4 critic | M | reviewer destapó 2 ACs flojos → re-trabajo de medición | bueno: el gate hizo su trabajo |

Fase más pesada: **Phase 3** por US3 (24 ficheros). El dry-run lo hizo seguro.

## Drillme — Phase 5
1. `[approach]` Fase demasiado pesada → Phase 3/US3, mitigada con dry-run.
2. `[approach]` Fricción evitable → SÍ: los dos "force" revertidos. Evitable si hubiera aplicado el principio "no forzar lo no-determinista" desde el research interno (que ya lo decía).
3. `[approach]` Patrón reusable → surfacing-determinista + ratify-gate como respuesta a "usar X siempre"; partir AC conductual/determinista.
4. `[context]` Global/local/memory → el sistema ES el global; promotions son convención + memoria.
5. `[failure]` Commandment violado en silencio → I (honestidad) NO en silencio (lo reconocí), pero hubo thrash; ver forensics.

## Promotions (el usuario ratifica)

| Candidato | Scope | Tipo | Por qué | Propuesta |
|---|---|---|---|---|
| Convención "description concisa + `when_to_use` con gatillos ES+EN" | global | guía en `meta-create` | when_to_use oficial e infrautilizado; las nuevas skills deben nacer con él | añadir nota en `meta-create` references sobre el patrón + cap 1536 |
| Memoria del episodio force/revert + convergencia research | memory | memory | evitar re-intentar forzar activación; cerrar la clase | nueva memoria (abajo) |
| Caso eval de la clase "force activation" | global | eval case | la fricción ❌ → check de regresión | (opcional) — el eval skill-activation-rate.ts ya cubre el surfacing |

skill-advisor + hook-surfacing: **nada que promover fuera** — ya viven en `.claude/` (que es el global). 

## Living-spec deltas (propuesta, NO auto-aplicado)
1. Conteo "22 skills" → "todas (~24)" — **ya corregido** en spec AC4 (legitimate: dato factual).
2. AC4 `/doctor` → sustituido por check determinista de budget (`skill-activation-rate.ts`) + `/doctor` como confirmación manual opcional — **ya reflejado** en AC4 (legitimate: `/doctor` es interactivo, no headless).

Ambos cumplen el criterio legítimo (edge real descubierto en build/critic, no contradice intent, documentado). Ratifica para marcar spec v2.

## Commandments audit

| # | Cumplido | Evidencia |
|---|---|---|
| I Honest symbiosis | ⚠️ | Honestidad mantenida (reconocí los pasos atrás sin maquillar), PERO hubo thrash: 2 reintroducciones de "force" antes de converger. Ver forensics. |
| II Factual truth | ✅ | WebFetch a docs oficiales para `when_to_use`; research adversarial; no inventé |
| III Simple by default | ✅ | revertí el force-load (over-engineering); hook sin LLM; sin bloat always-loaded |
| IV Blocking gates | ✅ | gates 1→2, 2→3 humanos; critic destapó ACs flojos; TDD forced en US1/US2 |
| V Understand before acting | ✅ | research interno+externo antes de planificar |
| VI Security | ✅ | n/a (sin auth/secrets); scan limpio |
| VII Performance | ✅ | hook barato; research read-only fan-out |
| VIII Meta-prompting | ✅ | Execution prompts en cada US; reviewer con prompt acotado |
| IX Observability | ✅ | eval de medición nuevo; AC conductual marcado para next-session |
| X Maintainability | ✅ | sin duplicados; when_to_use coherente en las 24 |

### Commandment I — forensics
- **Momento**: tras el primer research, reintroduje special-case `/goal` y luego force-load, ambos revertidos tras crítica del usuario.
- **Alternativa**: aplicar desde el inicio el hallazgo del research interno ("ningún mecanismo fuerza la activación; un hook solo empuja") en vez de re-descubrirlo por iteración.
- **Action item**: ante "que se use X siempre", primer reflejo = "¿forzable por diseño?"; si no → surfacing+ratify. (memoria abajo.)

## Action items
| Acción | Owner | Trigger | Due |
|---|---|---|---|
| Medir la mitad CONDUCTUAL de AC2 (¿el modelo invoca tras el surface?) | next-session | próxima sesión con el hook activo | next session |
| Ratificar promotions + living-spec deltas | usuario | revisión de este retro | ahora |
| `/doctor` manual como confirmación opcional del budget | usuario | cuando quiera | opcional |

## Next
Cierro el lifecycle (status: closed) tras tu revisión. Promotions pendientes de tu ratificación.
