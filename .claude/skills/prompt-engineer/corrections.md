# Corrections

Correcciones específicas para cada criterio de scoring.

## Por Criterio

### Clarity (0 → 20)

| Si falta | Añadir |
|----------|--------|
| Verbo | "Crear", "Modificar", "Eliminar", "Refactorizar" |
| Target | Archivo, función, endpoint específico |
| Acción | Qué debe pasar exactamente |

### Context (0 → 20)

| Si falta | Añadir |
|----------|--------|
| Ubicación | Path del archivo: `src/services/user.ts` |
| Tecnología | "usando Elysia", "con Drizzle ORM" |
| Dependencias | "requiere bcrypt para hashing" |

### Structure (0 → 20)

| Si falta | Añadir |
|----------|--------|
| Organización | Bullets para pasos |
| Separación | Headers para secciones |
| Claridad | Código inline para identificadores |

### Success (0 → 20)

| Si falta | Añadir |
|----------|--------|
| Métrica | "<100ms", ">90% coverage" |
| Output | "retorna 201 con {id, email}" |
| Verificación | "test X debe pasar" |

### Actionable (0 → 20)

| Si falta | Añadir |
|----------|--------|
| Decisiones | Tomar las decisiones técnicas |
| Ambigüedad | Eliminar "quizás", "tal vez" |
| Completitud | Toda info necesaria presente |

## Quick Fix Table

| Score Actual | Corrección Prioritaria |
|--------------|------------------------|
| < 20 | Añadir verbo + target |
| 20-40 | Añadir contexto técnico |
| 40-60 | Estructurar con bullets |
| 60-70 | Añadir criterio de éxito |

## Plantilla de Mejora Rápida

```markdown
## Prompt Original
[pegar prompt del usuario]

## Análisis
- Clarity: X/20 - [razón]
- Context: X/20 - [razón]
- Structure: X/20 - [razón]
- Success: X/20 - [razón]
- Actionable: X/20 - [razón]
- **Total: XX/100**

## Prompt Mejorado
[versión mejorada]

## Cambios Realizados
1. [cambio 1]
2. [cambio 2]
```
