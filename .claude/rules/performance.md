# Performance Rules

Reglas para maximizar velocidad y eficiencia de Claude Code.

## Batch Operations (OBLIGATORIO)

| ✅ Paralelo (mismo mensaje) | ❌ Secuencial (esperar resultado) |
|-----------------------------|-----------------------------------|
| 3+ Read independientes | Edit después de Read mismo archivo |
| 2+ Glob patterns diferentes | Write dependiente de Read |
| 2+ Task agents independientes | Task que necesita output previo |
| LSP + Grep para búsqueda comprehensiva | Bash con archivo recién creado |
| WebSearch + WebFetch | Nodo marcado "Blocking" |

## Anti-Patterns

| ❌ No hacer | ✅ Hacer |
|-------------|----------|
| Read archivos uno por uno | Batch 3+ Reads en un mensaje |
| Task agents secuenciales sin dependencia | Lanzar agents en paralelo |
| Glob → Read → Grep | Glob + Grep paralelos |
| Edit sin Read previo | Read → Edit secuencial |

## Token Budget

| Fase | Budget | Descripción |
|------|--------|-------------|
| Exploración | 20% | Glob, Grep, Read inicial |
| Implementación | 60% | Edit, Write, código |
| Verificación | 20% | Tests, review, docs |

## Ejemplos de Paralelización

### Lecturas paralelas

```
Read("/src/services/auth.ts") + Read("/src/types/user.ts") + Grep("login", "src/")
```

### Agents paralelos independientes

```
Task(subagent_type="scout", prompt="find auth files") +
Task(subagent_type="code-quality", prompt="analyze complexity", run_in_background=true)
```

### Writes independientes

```
Write("/src/types/session.ts", content1) +
Write("/src/utils/validation.ts", content2)
```

## Parallel Efficiency Score

Evaluar después de cada tarea compleja:

| Score | Significado | Acción |
|-------|-------------|--------|
| >80% | Excelente | Continuar |
| 50-80% | Aceptable | Revisar oportunidades |
| <50% | Pobre | STOP - refactorizar approach |

**Cálculo**: (operaciones paralelas) / (total que PODRÍAN ser paralelas) × 100

## Cache Strategy

| Resultado | Cache Duration | Condición |
|-----------|----------------|-----------|
| LSP results | 5 min | Si archivo no modificado |
| Grep results | 2 min | Si directorio no modificado |
| Read files | 1 min | Si file mtime igual |
| Glob patterns | 30 sec | Si directorio no modificado |

## Tool Selection

| Tarea | Tool Primario | Fallback |
|-------|---------------|----------|
| Definición de símbolo | LSP goToDefinition | Grep |
| Usos de símbolo | LSP findReferences | Grep |
| Buscar archivo | Glob | Bash find |
| Buscar texto | Grep | Bash grep |
| Leer archivo | Read | Bash cat |
| Editar archivo | Edit | Bash sed |
