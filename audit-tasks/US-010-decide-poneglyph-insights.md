---
id: US-010
phase: 2.2
status: completed
estimate: 45m
blocks: []
blockedBy: [US-002]
priority: medium
risk: low
---

# US-010 · Decidir destino de `/poneglyph-insights` (FIX o CUT)

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** decidir si reparar o eliminar el dashboard HTML `/poneglyph-insights`
**Para** no mantener un observatorio que no se mira (último HTML generado 2026-03-31, hace 52 días)

## Contexto extendido

### Evidencia recogida

- `/poneglyph-insights` genera HTML dashboard analytics (sesiones, agentes, skills, costes)
- Última generación: `insights-2026-03-31.html` (hace 52 días)
- También existe `insights-2026-03-30.html`
- El comando lee de `~/.claude/traces/` (que está estancado desde 2026-04-21 — US-001)
- El comando también puede leer de `agent-scores.jsonl`, `error-patterns.jsonl` (los dos también congelados)
- La skill `traces` ofrece resumen textual de la misma fuente (relacionado pero no idéntico)

### Por qué importa

Es un análogo a US-002 (trace-logger) pero a nivel de "presentación":
- Si trace-logger NO se repara → no hay datos nuevos que mostrar → el dashboard es irrelevante
- Si trace-logger SÍ se repara → revisar si el dashboard se va a usar
- 52 días sin ejecutarse = "nadie lo mira" = ruido

### Caminos posibles

| Decisión US-002 (trace-logger) | Recomendación US-010 |
|---|---|
| US-002 = CUT trace-logger | **CUT** poneglyph-insights (sin datos no tiene sentido) |
| US-002 = REPARAR + me lo voy a mirar 1x/semana | **FIX** o **KEEP** (depende del esfuerzo) |
| US-002 = REPARAR pero nunca lo voy a mirar | **CUT** (mantener un dashboard zombi es el mismo problema que ya identificamos) |

## Análisis — pros y contras

### Pros de FIX (mantener y reparar)

- **Sigue siendo la herramienta más completa** para entender qué está pasando en el sistema
- **Visualización HTML** es más útil que JSONL crudo para análisis ad-hoc
- **Inversión ya hecha**: el comando existe, fixearlo puede ser barato
- **Coherencia con la intención original** del sistema (observabilidad)

### Contras de FIX

- **Requiere que trace-logger funcione** (cascade desde US-002)
- **52 días sin mirarlo** es señal fuerte de que no aporta valor
- **Mantener significa abrir el HTML cada N días** — sin compromiso, vuelve al estado actual

### Pros de CUT

- **Coherente con el corte agresivo elegido**: si no se usa, no debe existir
- **Reduce 1 archivo de comando** + dependencias en otras skills
- **Honestidad operacional**: 52 días sin mirar = no es prioridad
- **Alternativa existe**: `/cost` y `/traces` (si reparados en US-002) ya dan información en CLI

### Contras de CUT

- **Pierdes visualización HTML** — los reportes futuros tendrán que ser texto plano o construir uno nuevo
- **Si en 6 meses quieres dashboards**, hay que reconstruir (no es trivial — el original tiene varios cientos de líneas probablemente)
- **Skill `traces` queda como única vía de análisis de coste** — más limitada

### Caso intermedio: REPLACE con dashboard externo

Anthropic provee dashboard oficial en `console.anthropic.com`. ¿Es suficiente?
- Pros: gestionado por ellos, sin código a mantener
- Contras: no muestra métricas custom (skills usage, agent scores, parallelism)

Si console basta para las métricas que realmente miras (coste por mes, breakdown por modelo), CUT poneglyph-insights es defendible.

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reparar y volver a no mirar (mismo problema en 2 meses) | Alta | Medio | Compromiso explícito de revisión semanal antes de FIX; si no estás dispuesto, CUT |
| Cortar y necesitar visualización en 1 mes | Baja | Bajo | git history conserva el código |
| Reparar pero los datos siguen siendo pobres (porque trace-logger empieza nuevo, sin historia) | Alta | Bajo | Aceptar — se acumulará con el tiempo |
| El comando depende de librerías de HTML/CSS que rotaron | Media | Bajo | Verificar antes de FIX, si requiere reinstalación grande → CUT |

## Pasos técnicos detallados

### Paso 0 — Verificar dependencia US-002

Si US-002 decide CUT trace-logger → ir directo a Paso C1 (CUT).
Si US-002 decide REPARAR → seguir con la decisión consciente entre FIX y CUT.

### Paso 1 — Inspeccionar el comando (5 min)

```bash
Read .claude/commands/poneglyph-insights.md
```

**Buscar**:
- ¿Qué scripts ejecuta?
- ¿De dónde lee datos? (traces, scores, patterns)
- ¿Genera el HTML inline o llama a un script Python/Node?
- ¿Tiene dependencias externas (chart.js, etc.)?

### Paso 2 — Verificar dependencias del comando (5 min)

```bash
Grep "poneglyph-insights" .claude/
Glob .claude/**/*insights*           # scripts asociados
Read <script asociado si existe>
```

Si depende de un script externo (e.g. `.claude/scripts/poneglyph-insights.ts`), evaluar si ese script también está roto o necesita updates.

### Paso 3 — Decisión consciente (5 min)

Responder con honestidad:
1. ¿Vas a abrir el HTML al menos 1x/semana? (sí/no)
2. ¿Si abrieras console.anthropic.com semanalmente, cubre tus necesidades?
3. ¿Cuánto te molestaría perder gráficos custom (skills usage, agent scores)?

**Si las respuestas son: "no / sí / nada" → CUT.**
**Si las respuestas son: "sí / no / mucho" → FIX (con compromiso explícito).**

### Paso 4A — opción FIX (30 min, condicional)

1. Identificar el motivo de las 52 días sin generar:
   - ¿Falta de uso (nadie lo ejecuta)?
   - ¿Comando roto (falla al ejecutarse)?
2. Si es solo "falta de uso", FIX = ejecutar el comando manualmente para generar `insights-2026-05-22.html`
3. Si está roto:
   - Diagnosticar (similar a US-001)
   - Reparar si trivial (<20 min)
   - Si no trivial: pivotear a CUT

4. Smoke test: ejecutar `/poneglyph-insights` y verificar que se crea `insights-YYYY-MM-DD.html` válido en la carpeta correspondiente

5. Comprometerse: añadir entrada al calendario / nota personal para revisarlo semanalmente

6. Commit:
```
fix(commands): repair /poneglyph-insights after 52 days unused

- Root cause: ___
- Fix: ___
- Compromiso: revisión semanal (registrada en MEMORY.md)
```

### Paso 4B — opción CUT (10 min)

1. `Bash: rm .claude/commands/poneglyph-insights.md`
2. Si hay script asociado: `Bash: rm <ruta>`
3. Decidir sobre los HTMLs existentes (`insights-2026-03-30.html`, `insights-2026-03-31.html`):
   - **Opción A**: dejarlos (historia, espacio mínimo)
   - **Opción B**: archivar a `_archive/`
   - **Opción C**: eliminar
   - Recomendación: A
4. `Grep "poneglyph-insights" .claude/` → 0 resultados tras update
5. Decidir también sobre la skill `traces`: si trace-logger fue CUT en US-002, ¿también CUT skill `traces`? **Sí** — sin datos no tiene sentido. Si trace-logger fue REPARAR, KEEP skill `traces`.
6. Commit:
```
refactor(commands): remove /poneglyph-insights — 52 days without execution

Dashboard was generated last on 2026-03-31. The cost of maintaining
a never-viewed observatory is exactly what this audit is reducing.

If visual dashboards are needed later, console.anthropic.com provides
the canonical cost view, and a custom dashboard can be rebuilt with purpose.
```

## Criterios de aceptación

### Si FIX

- [ ] `/poneglyph-insights` ejecuta sin errores
- [ ] Se genera `insights-YYYY-MM-DD.html` con fecha de hoy
- [ ] El HTML carga en navegador
- [ ] Compromiso de revisión semanal documentado (MEMORY.md o en este archivo)

### Si CUT

- [ ] `.claude/commands/poneglyph-insights.md` eliminado
- [ ] Scripts asociados eliminados (si existen)
- [ ] Skill `traces`: decisión documentada (CUT si trace-logger CUT, KEEP si trace-logger REPARADO)
- [ ] `Grep "poneglyph-insights" .claude/` → 0 resultados
- [ ] Commit realizado

## Definition of Done

1. Decisión registrada con justificación
2. Acción ejecutada (FIX o CUT)
3. Tests pasan
4. Commit realizado
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura el comando y scripts asociados
```

Trivial.

## Decisión

**Resultado US-002**: CUT trace-logger (a5bbb18, pipeline eliminado por double-counting).
**Veredicto US-010**: CUT.
**Justificación**: trace-logger no existe → fuente de datos muerta → dashboard zombi. 52 días sin generar es señal clara de irrelevancia operacional. `console.anthropic.com` cubre las métricas de coste reales. Coherente con el corte agresivo elegido.
**Si FIX, compromiso**: N/A.

### Acción ejecutada

- `rm .claude/commands/poneglyph-insights.md` (333 líneas)
- Skill `traces` también eliminada en este mismo cleanup (sin trace-logger no tiene sentido — coherencia con US-002).
- `Grep "poneglyph-insights" .claude/` → 0 resultados.
- HTMLs históricos `insights-2026-03-30.html` y `insights-2026-03-31.html`: no presentes en repo (estaban en `~/.claude/insights/` fuera del repo).

### Commit

Pendiente al cerrar — se actualizará con el hash.

## Notas

- Si decides FIX, considera añadir un hook (NO automático, solo manual) para regenerar el HTML semanalmente con cron / scheduled task. Si requiere automatización, evaluar si el coste de mantener cron + hook + comando vale la pena vs CUT
- La skill `traces` (CLI) podría sobrevivir incluso si poneglyph-insights muere — son herramientas distintas (texto rápido vs HTML profundo). Decidir esto explícitamente en esta historia
- Si CUT, el frontmatter en CLAUDE.md raíz que documenta "comandos disponibles" debe actualizarse (US-022)
