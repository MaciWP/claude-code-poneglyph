# Scoring Criteria

Sistema de evaluación de 5 criterios para prompts.

## Los 5 Criterios

| Criterio | 20 pts | 10 pts | 0 pts |
|----------|--------|--------|-------|
| **Clarity** | Verbo acción + target específico | Verbo genérico | Vago/ambiguo |
| **Context** | Paths + tech + versiones | Tech mencionada | Sin contexto |
| **Structure** | Organizado, bullets/headers | Párrafos claros | Muro de texto |
| **Success** | Métricas (<100ms, >90%) | "mejor", "más rápido" | Sin criterios |
| **Actionable** | Sin preguntas abiertas | 1-2 clarificaciones | Muy vago |

## Thresholds

| Score | Acción |
|-------|--------|
| 80-100 | Proceder directamente |
| 70-79 | Proceder con precaución |
| < 70 | Mejorar antes de continuar |

## Ejemplos de Scoring

### Score Alto (85)
> "Añadir endpoint POST /api/users que valide email único, hashee password con bcrypt, y retorne 201"

- Clarity: 20 (verbo + target específico)
- Context: 15 (tech implícita)
- Structure: 20 (organizado)
- Success: 15 (status code definido)
- Actionable: 15 (claro)

### Score Bajo (25)
> "Mejorar el sistema de usuarios"

- Clarity: 5 (vago)
- Context: 0 (sin detalles)
- Structure: 10 (simple)
- Success: 5 (sin criterios)
- Actionable: 5 (ambiguo)
