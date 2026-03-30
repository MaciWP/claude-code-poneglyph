# Complexity Routing Rule

Calcular complejidad antes de delegar para determinar si requiere planner.

## Factores de Complejidad

| Factor | Peso | Low (1) | Medium (2) | High (3) |
|--------|------|---------|------------|----------|
| **Archivos** | 20% | 1-2 | 3-5 | 6+ |
| **Dominios** | 20% | 1 | 2-3 | 4+ |
| **Dependencias** | 20% | 0-1 | 2-3 | 4+ |
| **Seguridad** | 20% | Ninguna | Data | Auth/Crypto |
| **Integraciones** | 20% | 0-1 | 2-3 | 4+ |
| **Worktree** | 0% (modifier) | No aplica | Overlap posible | Paralelo confirmado |

## Calculo

```
score = Σ (factor_value × peso × 100 / 3)
```

Cada factor contribuye maximo ~33 puntos (value=3 × 20% × 33.3). Total maximo = 100.

| Value | × Peso (20%) | × Scale (33.3) | Contribucion |
|-------|-------------|----------------|-------------|
| Low (1) | 0.20 | 33.3 | ~7 |
| Medium (2) | 0.20 | 33.3 | ~13 |
| High (3) | 0.20 | 33.3 | ~20 |

Ejemplo:
- Archivos: 3-5 (Medium = 2) × 0.20 × 33.3 = ~13
- Dominios: 2-3 (Medium = 2) × 0.20 × 33.3 = ~13
- Dependencias: 0-1 (Low = 1) × 0.20 × 33.3 = ~7
- Seguridad: Ninguna (Low = 1) × 0.20 × 33.3 = ~7
- Integraciones: 0-1 (Low = 1) × 0.20 × 33.3 = ~7
- **Total: ~47** → planner opcional

## Routing por Complejidad

| Score | Routing | Razon |
|-------|---------|-------|
| **< 15** | builder directo, skip scoring/skills | Tarea trivial (rename, typo, single-line) |
| **15-30** | builder directo | Tarea simple, sin planificacion |
| **30-60** | planner opcional | Considerar plan si hay incertidumbre |
| **> 60** | planner obligatorio | Requiere roadmap estructurado |

## Execution Mode Decision

Tras determinar el routing por complejidad, evaluar el modo de ejecucion. Solo aplica cuando complexity > 60.

### 4-Gate Criteria

TODOS los gates deben cumplirse para activar `team` mode:

| Gate | Threshold | Evaluador |
|------|-----------|-----------|
| Complejidad | > 60 | Lead (tabla anterior) |
| Dominios independientes | >= 3 sin archivos compartidos | Planner (analisis de decomposicion) |
| Comunicacion inter-agente | Necesaria (negociacion de interfaces) | Planner (analisis de dependencias) |
| Feature habilitada | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Env var en runtime |

### Decision

| Resultado | Modo | Accion |
|-----------|------|--------|
| TODOS los gates pasan | `team` | Planner genera roadmap con teammates por dominio |
| CUALQUIER gate falla | `subagents` | Flujo actual sin cambios |

> **Coste**: Team Agents usa 3-7x mas tokens que subagents. Default es SIEMPRE subagents.

### Ejemplo: Team Mode Triggers

> "Implementar sistema con auth service, payment service y notification service, cada uno con su API y base de datos independiente"

- Complejidad: >60 ✅
- Dominios: 3 (auth, payments, notifications) sin archivos compartidos ✅
- Comunicacion: Necesaria (services consumen interfaces entre si) ✅
- Env var: Configurada ✅
- **→ team mode**

### Ejemplo: Team Mode NO Triggers

> "Implementar OAuth con Google y GitHub en el auth module"

- Complejidad: >60 ✅
- Dominios: 2 (Google OAuth, GitHub OAuth) pero comparten auth middleware ❌
- **→ subagents** (dominios no independientes)

## Spec-Driven Development Trigger

| Score | Spec Requerido | Accion |
|-------|---------------|--------|
| **< 30** | No | Builder directo, sin spec |
| **30-60** | Recomendado | Si hay incertidumbre, invocar `/spec-gen` antes de builder |
| **> 60** | Obligatorio | SIEMPRE invocar `/spec-gen` antes de planner/builder |

### Proceso con Spec

1. Calcular complejidad
2. Si score >= 30: verificar si existe spec en `.specs/` para esta feature
3. Si no existe: invocar `/spec-gen` para crear spec (status: draft)
4. Esperar a que spec llegue a status `approved`
5. Invocar `/implement-spec SPEC-NNN` para delegar a builder con BDD
6. Tras implementacion: actualizar INDEX.md a `implemented`

## Worktree Decision

Independiente del score de complejidad, evaluar necesidad de worktree:

| Condicion | Worktree |
|-----------|----------|
| Score >60 + planner genera >1 builder | Obligatorio |
| 2+ builders en paralelo (cualquier score) | Obligatorio |
| Tarea marcada experimental | Obligatorio |
| Score <30, single builder | No necesario |

> **Nota**: Las reglas de worktree NO aplican en team mode. Cada teammate corre en su propio proceso de Claude Code con su propio filesystem. Worktree isolation solo aplica al modo subagents.

## Model Routing

Seleccion de modelo por agente y complejidad para optimizar costos.

> **Mecanismo**: El Lead determina el modelo pasando `model:` en el Agent tool call. Los agentes NO tienen model hardcoded en frontmatter — el routing es dinámico basado en la complejidad de la tarea.

### Model Selection by Agent Category

**Code agents** (builder, reviewer, error-analyzer) — produce or analyze code:

| Complejidad | Modelo | Rationale |
|-------------|--------|-----------|
| <30 | sonnet | Calidad mínima garantizada para código |
| 30-50 | sonnet | Buen balance para tareas medianas |
| >50 | opus | Razonamiento profundo para tareas complejas |

**Read-only agents** (scout, command-loader) — only read, don't produce:

| Complejidad | Modelo | Rationale |
|-------------|--------|-----------|
| <30 | haiku | Leer archivos no requiere razonamiento profundo |
| 30-50 | haiku | Exploración más amplia, aún barata |
| >50 | sonnet | Exploración compleja requiere mejor comprensión |

**Strategic agents** (planner, architect) — high-impact decisions:

| Complejidad | Modelo | Rationale |
|-------------|--------|-----------|
| Cualquiera | opus | La calidad del plan determina la calidad de la ejecución |

> Model defaults are determined dynamically by the Lead based on agent category and task complexity. See table above.

### Budget Alerts

> **GUIDELINE**: Esta regla es orientativa. No esta enforced por hooks — el Lead no tiene visibilidad real del costo en runtime.

| Condicion | Accion |
|-----------|--------|
| Sesion >$1.00 | Warning al usuario |
| Sesion >$5.00 | Solicitar confirmacion para continuar |
| Dia >$20.00 | Revisar patron de uso |

## Ejemplos

### Complejidad Baja (< 30)
> "Anadir validacion de email al endpoint de registro"

- Archivos: 1-2 (Low = 1) × 0.20 × 33.3 = ~7
- Dominios: 1 (Low = 1) × 0.20 × 33.3 = ~7
- Dependencias: 1 (Low = 1) × 0.20 × 33.3 = ~7
- Seguridad: Data (Medium = 2) × 0.20 × 33.3 = ~13
- Integraciones: 0 (Low = 1) × 0.20 × 33.3 = ~7
- **Total: ~41** → planner opcional

### Complejidad Alta (> 60)
> "Implementar sistema de autenticacion OAuth con Google y GitHub"

- Archivos: 6+ (High = 3) × 0.20 × 33.3 = ~20
- Dominios: 4+ (High = 3) × 0.20 × 33.3 = ~20
- Dependencias: 4+ (High = 3) × 0.20 × 33.3 = ~20
- Seguridad: Auth (High = 3) × 0.20 × 33.3 = ~20
- Integraciones: 4+ (High = 3) × 0.20 × 33.3 = ~20
- **Total: ~100** → planner obligatorio

## Proceso

1. Analizar tarea del usuario
2. Evaluar cada factor
3. Calcular score total
4. Rutear segun umbral
