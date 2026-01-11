---
name: lsp-operations
description: >
  LSP operations reference for semantic code navigation.
  Keywords - definition, references, hover, symbols, implementation, calls.
activation:
  keywords:
    - definition
    - references
    - hover
    - symbols
    - implementation
    - calls
    - lsp
    - go to
    - find usages
---

# LSP Operations Skill

Referencia completa de operaciones LSP para navegación semántica de código.

## Triggers

ES: definición, referencias, usos, hover, tipo, parámetros, implementación, llamadas, símbolos
EN: definition, references, usage, hover, type, parameters, implementation, calls, symbols

## Operaciones

### goToDefinition

**Uso**: Ir a donde se define un símbolo

```
LSP({
  operation: 'goToDefinition',
  filePath: 'src/services/claude.ts',
  line: 50,
  character: 15
})
```

**Ejemplo**: "¿Dónde está definida la clase ClaudeService?"

### findReferences

**Uso**: Encontrar todos los lugares donde se usa un símbolo

```
LSP({
  operation: 'findReferences',
  filePath: 'src/services/claude.ts',
  line: 50,
  character: 15
})
```

**Ejemplo**: "¿Dónde se usa executeStream?"

### hover

**Uso**: Obtener tipo y documentación de un símbolo

```
LSP({
  operation: 'hover',
  filePath: 'src/services/claude.ts',
  line: 50,
  character: 15
})
```

**Ejemplo**: "¿Qué parámetros acepta execute?"

### documentSymbol

**Uso**: Listar todos los símbolos de un archivo

```
LSP({
  operation: 'documentSymbol',
  filePath: 'src/services/claude.ts',
  line: 1,
  character: 1
})
```

**Ejemplo**: "¿Qué funciones tiene claude.ts?"

### workspaceSymbol

**Uso**: Buscar símbolos en todo el proyecto

```
LSP({
  operation: 'workspaceSymbol',
  filePath: 'src/services/claude.ts',
  line: 1,
  character: 1
})
```

**Ejemplo**: "Encontrar todas las clases *Service"

### goToImplementation

**Uso**: Encontrar implementaciones de una interface

```
LSP({
  operation: 'goToImplementation',
  filePath: 'src/types/executor.ts',
  line: 10,
  character: 15
})
```

**Ejemplo**: "¿Quién implementa IExecutor?"

### prepareCallHierarchy

**Uso**: Preparar análisis de jerarquía de llamadas

```
LSP({
  operation: 'prepareCallHierarchy',
  filePath: 'src/services/claude.ts',
  line: 100,
  character: 10
})
```

### incomingCalls

**Uso**: Encontrar quién llama a una función

```
LSP({
  operation: 'incomingCalls',
  filePath: 'src/services/claude.ts',
  line: 100,
  character: 10
})
```

**Ejemplo**: "¿Qué funciones llaman a processMessage?"

### outgoingCalls

**Uso**: Encontrar qué llama una función

```
LSP({
  operation: 'outgoingCalls',
  filePath: 'src/services/claude.ts',
  line: 100,
  character: 10
})
```

**Ejemplo**: "¿Qué funciones llama orchestrate?"

## Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `operation` | string | Operación a ejecutar |
| `filePath` | string | Ruta al archivo (absoluta o relativa) |
| `line` | number | Línea (1-based, como en editor) |
| `character` | number | Columna (1-based, como en editor) |

## LSP vs Grep

| Tarea | LSP | Grep |
|-------|-----|------|
| Encontrar definición | `goToDefinition` → exacto | Patrón de texto → puede fallar |
| Encontrar usos | `findReferences` → type-aware | Búsqueda texto → falsos positivos |
| Ver firma | `hover` → completo | Leer archivo → manual |
| Implementaciones | `goToImplementation` → automático | Manual |
| Call hierarchy | `incomingCalls/outgoingCalls` | No posible |

## Archivos de Alto Valor en este Proyecto

| Archivo | LOC | Por qué LSP |
|---------|-----|-------------|
| `claude-code-ui/server/src/services/claude.ts` | ~1000 | SDK, 15+ interfaces |
| `claude-code-ui/server/src/routes/websocket.ts` | ~650 | 10+ módulos |
| `claude-code-ui/server/src/services/orchestrator-agent.ts` | ~560 | Events, async |
| `claude-code-ui/web/src/components/StreamingChat.tsx` | ~400 | 15+ hooks |
| `claude-code-ui/web/src/types/chat.ts` | ~300 | 30+ tipos |
