# Improvement Process

Proceso paso a paso para mejorar prompts con score < 70.

## Workflow

```mermaid
graph TD
    A[Recibir Prompt] --> B[Evaluar 5 Criterios]
    B --> C{Score >= 70?}
    C -->|Sí| D[Proceder]
    C -->|No| E[Identificar Criterios Bajos]
    E --> F[Aplicar Correcciones]
    F --> G[Re-evaluar]
    G --> C
```

## Técnicas de Mejora

| Técnica | Uso | Ejemplo |
|---------|-----|---------|
| **XML Tags** | Estructurar secciones | `<context>...</context>` |
| **Chain-of-Thought** | Razonamiento paso a paso | "Primero X, luego Y" |
| **Few-Shot** | Ejemplos de input/output | "Ejemplo: dado X, retorna Y" |
| **Constraints** | Limitar scope | "Solo archivos en src/" |

## Pasos de Corrección

1. **Identificar** criterio más bajo
2. **Preguntar** información faltante al usuario
3. **Estructurar** con bullets o headers
4. **Añadir** criterios de éxito medibles
5. **Verificar** que es actionable sin más preguntas

## Preguntas Clave por Criterio

| Criterio | Preguntas |
|----------|-----------|
| Clarity | ¿Qué acción específica? ¿Sobre qué? |
| Context | ¿Qué archivos? ¿Qué tecnología? |
| Structure | ¿Puedo dividir en pasos? |
| Success | ¿Cómo sé que está completo? |
| Actionable | ¿Puedo empezar ya? |
