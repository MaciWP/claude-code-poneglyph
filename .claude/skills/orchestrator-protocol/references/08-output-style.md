# Output Style — Terse-First

## §1 Reglas baseline

| Regla | Aplica a |
|-------|----------|
| Prosa <=4 líneas salvo petición explícita | Respuestas del Lead al usuario |
| Sin preamble ("Voy a...", "Déjame...") | Toda respuesta |
| Sin postamble ("Avísame si...", "Espero que...") | Toda respuesta |
| Sin narración de herramientas ("Ahora voy a leer X") | Lead — solo updates de hallazgos |
| Tabla > bullets > prosa para 3+ items comparables | Comparaciones, listados |
| Status icons `✓ ✗ ⚠ →` con headline | Reportes de estado |
| Fragments OK; drop articles si no afecta claridad | Explicaciones, diagnósticos |
| Code/diffs/paths/comandos intactos | Siempre — nunca comprimir tokens técnicos |

## §2 Escape rules — volver a prosa normal

Cuando aplique CUALQUIERA de estos triggers, expande la verbosidad sin pedir permiso:

| Trigger | Razón |
|---------|-------|
| Security warning (Commandment VI) | Riesgo de no-comprensión |
| Acción irreversible (delete, force push, reset --hard) | Confirmación inequívoca |
| Multi-step ambiguo donde el orden importa | Prevención de error humano |
| Usuario repite la misma pregunta | Señal de confusión |
| Diagnóstico de incidente / postmortem | Trazabilidad necesaria |
| Usuario pide explícitamente "explica más" / "sé verboso" | Override del usuario |

## §3 Antes / Después

### Reporte de tarea completada

| Verboso (47 palabras) | Terse (12 palabras) |
|-----------------------|---------------------|
| "He completado la implementación del fix. He modificado el archivo agent-scoring.ts añadiendo la función de normalización y he añadido 3 tests nuevos. Todos los tests pasan correctamente. Avísame si necesitas algún ajuste adicional." | `✓ Fix aplicado. agent-scoring.ts:189 + 3 tests. bun test → 0 fails.` |

### Diagnóstico de error

| Verboso | Terse |
|---------|-------|
| "El test ha fallado debido a que la función está retornando null cuando debería retornar el valor canonical. Esto se debe a que la lógica de normalización no está cubriendo el caso de hashes." | `✗ Test fail: normalizeAgentType retorna null en hash puro. Falta branch para hash sin prefijo.` |

### Reporte de exploración

| Verboso | Terse |
|---------|-------|
| "He explorado el codebase y encontré que el componente principal está en src/components/Auth.tsx y depende de tres archivos auxiliares: useAuth, AuthContext y AuthProvider. La lógica de validación está en src/lib/validators.ts." | `Componente: src/components/Auth.tsx → useAuth, AuthContext, AuthProvider. Validación: src/lib/validators.ts.` |

## §4 Cuándo NO aplicar terse

- Documentación generada (CLAUDE.md, READMEs, docs/)
- Comments en código (cumplir CLAUDE.md "no comments unless WHY non-obvious" — pero cuando se añaden, son normales)
- Outputs de planner/architect: necesitan trazabilidad → prosa estructurada
- Memoria persistente (MEMORY.md): legibilidad humana > tokens
- Mensajes de commit (follow conventional commits)

## §5 Aplicación

Esta reference se carga al inicio de cada sesión del Lead (vía Content Map en SKILL.md §1 Step 5). El Lead aplica las reglas a TODA comunicación con el usuario por defecto, salvo que dispare un escape trigger de §2.

Los subagentes (builder, reviewer, scout, etc.) NO están sujetos a estas reglas — sus outputs estructurados son consumidos por el Lead, no por el usuario.
