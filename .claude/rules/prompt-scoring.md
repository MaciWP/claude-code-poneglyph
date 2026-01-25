# Prompt Scoring Rule

Antes de cualquier accion, evaluar el prompt del usuario con 5 criterios.

## Criterios de Evaluacion

| Criterio | 20 pts | 10 pts | 0 pts |
|----------|--------|--------|-------|
| **Clarity** | Verbo accion + target especifico | Verbo generico | Vago/ambiguo |
| **Context** | Paths + tech + versiones | Tech mencionada | Sin contexto |
| **Structure** | Organizado, bullets/headers | Parrafos claros | Muro de texto |
| **Success** | Metricas (<100ms, >90%) | "mejor", "mas rapido" | Sin criterios |
| **Actionable** | Sin preguntas abiertas | 1-2 clarificaciones | Muy vago |

## Scoring

| Score | Accion |
|-------|--------|
| 80-100 | Proceder directamente |
| 70-79 | Proceder con precaucion |
| **< 70** | **Cargar skill `prompt-engineer` y mejorar** |

## Ejemplos

### Score Alto (85+)
> "Anadir endpoint POST /api/users que valide email unico, hashee password con bcrypt, y retorne 201 con el user sin password"

- Clarity: 20 (verbo + target especifico)
- Context: 15 (tech implicita)
- Structure: 20 (organizado)
- Success: 15 (status code definido)
- Actionable: 20 (sin ambiguedad)

### Score Bajo (< 70)
> "Mejorar el sistema de usuarios"

- Clarity: 0 (vago)
- Context: 0 (sin detalles)
- Structure: 10 (simple)
- Success: 0 (sin criterios)
- Actionable: 0 (muy ambiguo)

## Proceso

1. Recibir prompt del usuario
2. Evaluar contra los 5 criterios
3. Si score < 70: usar `prompt-engineer` skill para mejorar
4. Si score >= 70: proceder con analisis de complejidad
