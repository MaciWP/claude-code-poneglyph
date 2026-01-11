# LSP Navigation

## Jerarquía de Herramientas

| Prioridad | Tool | Uso |
|-----------|------|-----|
| 1 | **LSP** | Navegación semántica (type-aware) |
| 2 | Grep | Búsqueda de texto (fallback) |
| 3 | Glob | Búsqueda de archivos |

## Cuándo usar LSP

| Tarea | Operación LSP |
|-------|---------------|
| ¿Dónde está definida X? | `goToDefinition` |
| ¿Dónde se usa X? | `findReferences` |
| ¿Qué parámetros acepta? | `hover` |
| ¿Qué funciones tiene este archivo? | `documentSymbol` |
| ¿Quién llama a esta función? | `incomingCalls` |
| ¿Qué llama esta función? | `outgoingCalls` |

## Cuándo usar Grep (fallback)

- LSP no disponible para el lenguaje
- Búsqueda de texto literal (strings, comments)
- Archivos no-código (markdown, json)

## Paralelización

| Paralelo (mismo mensaje) | Secuencial |
|--------------------------|------------|
| Multiple LSP en diferentes símbolos | LSP después de crear archivo |
| LSP + Grep para búsqueda comprehensiva | |
| goToDefinition + findReferences | |

## Sintaxis

```
LSP({
  operation: 'goToDefinition',
  filePath: 'src/services/claude.ts',
  line: 50,      // 1-based
  character: 10  // 1-based
})
```

## Archivos de Alto Valor

| Archivo | Por qué LSP es útil |
|---------|---------------------|
| `server/src/services/claude.ts` | Múltiples interfaces, SDK imports |
| `server/src/services/orchestrator-agent.ts` | Event patterns, async |
| `web/src/components/StreamingChat.tsx` | Custom hooks |
