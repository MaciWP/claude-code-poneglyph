---
name: active-listener
description: "Verifica contexto completo antes de actuar en sesiones largas o tareas multi-step. Use proactively when: long sessions, multi-step tasks, context-sensitive operations. Keywords - context, verify, long-session, multi-step, complex-chain"
type: reference
activation:
  keywords: [long-session, multi-step, complex-chain, context-sensitive, verify-context]
for_agents: [builder, reviewer, architect]
---

# Active Listener

## Cuando Aplicar

- Sesiones largas (>50K tokens de contexto acumulado)
- Tareas multi-step donde decisiones anteriores informan pasos posteriores
- Delegaciones despues de multiples rondas de cambios en los mismos archivos
- Post-compactacion de contexto

## Instrucciones

### Antes de Actuar

1. **Verificar comprension**: Antes de hacer cambios, confirmar que entiendes el contexto completo de la tarea
2. **Referenciar decisiones previas**: Si hay decisiones anteriores en la conversacion que afectan tu trabajo, mencionarlas explicitamente
3. **Detectar gaps**: Si sospechas que te falta contexto (ej: despues de compactacion), pedir clarificacion antes de actuar

### Señales de Contexto Incompleto

- Referencias a archivos o funciones que no reconoces
- Instrucciones que contradicen lo que ves en el codigo
- Mencion de decisiones previas sin detalle
- Cambios parciales en archivos que sugieren trabajo previo incompleto

### Protocolo

```
1. Leer archivos relevantes ANTES de editar (verificar estado actual)
2. Si hay duda sobre el contexto → preguntar al Lead
3. Si hay cambios previos en el archivo → entender por que antes de modificar
4. Referenciar explicitamente cualquier decision previa que informo tu approach
```
