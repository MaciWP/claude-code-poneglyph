# Bad Prompts (Anti-patterns)

Prompts que generan resultados pobres o incorrectos.

## Demasiado Vagos

### ❌ Malo

```
Arregla el bug
```

```
No funciona
```

```
Mejora el código
```

### ✅ Mejor

```
El endpoint /api/sessions devuelve 500 cuando el ID no existe. Debería devolver 404
```

```
El streaming se corta después de ~30 segundos. Revisa el timeout del WebSocket
```

```
Refactoriza el servicio de Claude para reducir complejidad ciclomática
```

## Sin Contexto

### ❌ Malo

```
Añade autenticación
```

### ✅ Mejor

```
Añade autenticación JWT al endpoint /api/sessions usando el servicio auth.ts existente
```

## Demasiado Amplios

### ❌ Malo

```
Reescribe todo el backend
```

```
Optimiza la aplicación
```

### ✅ Mejor

```
Optimiza las queries de búsqueda en memory.ts añadiendo índices y paginación
```

## Asumen Conocimiento

### ❌ Malo

```
Usa el patrón que usamos siempre
```

```
Hazlo como la otra vez
```

### ✅ Mejor

```
Usa el patrón Service + Repository que tenemos en src/services/user/
```

## Contradictorios

### ❌ Malo

```
Simplifica el código pero añade más validaciones y logging y tests y documentación
```

### ✅ Mejor

```
1. Primero: simplifica el código extrayendo validaciones a un helper
2. Después: añade logging estructurado
3. Finalmente: crea tests para el helper
```

## Anti-patterns Comunes

| Anti-pattern | Problema | Solución |
|--------------|----------|----------|
| "Arréglalo" | Sin descripción del problema | Describir síntoma y comportamiento esperado |
| "No funciona" | Sin reproducción | Incluir pasos para reproducir |
| "Hazlo mejor" | Sin criterio de éxito | Definir qué significa "mejor" |
| "Como siempre" | Asume contexto | Ser explícito sobre el patrón |
| "Todo a la vez" | Scope demasiado grande | Dividir en tareas específicas |
