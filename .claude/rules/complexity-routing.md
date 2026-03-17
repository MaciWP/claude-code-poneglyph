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

## Model Routing

Seleccion de modelo por agente y complejidad para optimizar costos.

> **Mecanismo real**: El model routing se implementa via campo `model:` en el frontmatter YAML de cada agente (`.claude/agents/*.md`). No existe `modelOverrides` en settings.json. El Lead puede overridear pasando `model:` en el Agent tool call para tareas especificas.

### Model Selection Matrix

| Agente | Complejidad <30 | Complejidad 30-60 | Complejidad >60 |
|--------|----------------|-------------------|-----------------|
| builder | sonnet | sonnet | opus |
| reviewer | sonnet | sonnet | sonnet |
| planner | sonnet | opus | opus |
| scout | haiku | sonnet | sonnet |
| error-analyzer | sonnet | sonnet | opus |
| architect | opus | opus | opus |

### Cost-per-Agent Defaults

| Agente | Model Default | Razon |
|--------|--------------|-------|
| scout | haiku | Solo lectura/exploracion, no genera codigo |
| reviewer | sonnet | Analisis de calidad, no implementacion |
| builder | sonnet | Balance costo/calidad para implementacion |
| planner | opus | Requiere razonamiento profundo |
| architect | opus | Decisiones de arquitectura criticas |

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
