# Anti-Patterns

Errores comunes en prompts y cómo evitarlos.

## Tabla de Anti-Patterns

| Anti-Pattern | Ejemplo Malo | Corrección |
|--------------|--------------|------------|
| **Vaguedad** | "Mejorar performance" | "Reducir tiempo de response de /api/users de 500ms a <100ms" |
| **Sin Contexto** | "Arreglar el bug" | "Arreglar error en login.ts:45 donde password null causa crash" |
| **Scope Infinito** | "Refactorizar todo" | "Extraer validación de OrderService a ValidationService" |
| **Sin Criterio** | "Hacerlo mejor" | "Reducir complejidad ciclomática de 15 a <10" |
| **Múltiples Tareas** | "Login y registro y perfil" | Separar en 3 prompts distintos |

## Señales de Alerta

| Palabra | Problema | Alternativa |
|---------|----------|-------------|
| "mejorar" | Vago | Especificar métrica |
| "arreglar" | Sin contexto | Describir el bug |
| "todo" | Scope infinito | Limitar a componente |
| "rápido" | Sin criterio | Definir ms/ops |
| "y...y...y" | Múltiples tareas | Dividir |

## Checklist Pre-Envío

- [ ] ¿Tiene verbo de acción específico?
- [ ] ¿Menciona archivos o componentes concretos?
- [ ] ¿Define criterio de éxito medible?
- [ ] ¿Es una sola tarea atómica?
- [ ] ¿Puedo empezar sin preguntar más?

## Errores Técnicos Comunes

| Error | Problema | Fix |
|-------|----------|-----|
| `claude-3-opus` | Modelo incorrecto | `claude-opus-4-5-20251101` |
| `rm -rf` en Windows | Comando Unix | `Remove-Item -Recurse` |
| `cat file.txt` | Comando Unix | `type file.txt` o Read tool |
| Path con `/` | Separador Unix | Usar `\` en Windows |
