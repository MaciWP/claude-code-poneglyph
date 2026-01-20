---
description: Lista dinámica de todos los comandos instalados con categorización automática
model: haiku
version: 2.0.0
---

# /commands [category]

Genera un catálogo visual y dinámico de las capacidades instaladas en el Orquestador.

---

## 1. PROTOCOLO DE DISCOVERY (Ejecución Real)

**OBLIGATORIO**: Seguir estos pasos en orden. NO usar listas hardcodeadas.

### Paso 1: Scan

```
Glob('.claude/commands/*.md')
```

Obtener la lista REAL de archivos de comandos.

### Paso 2: Parse

Para cada archivo encontrado, ejecutar `Read` (primeras 15 líneas) y extraer:

| Campo | Fuente | Ejemplo |
|-------|--------|---------|
| Comando | Nombre archivo | `planner.md` → `/planner` |
| Descripción | YAML `description:` | "Motor de Estrategia..." |
| Versión | YAML `version:` | "5.0.0" |
| Model | YAML `model:` | "opus" |

### Paso 3: Categorizar

Asignar categoría basada en nombre o descripción:

| Categoría | Keywords en nombre/descripción |
|-----------|-------------------------------|
| 🔍 Discovery | `commands`, `tools`, `skills`, `agents`, `docs`, `help`, `list` |
| 🧠 Strategy | `planner`, `architect`, `plan`, `design`, `strategy` |
| 🛡️ Quality | `check`, `validate`, `anti-hallucination`, `quality`, `test`, `security` |
| 📚 Context | `load`, `reference`, `context`, `docs` |
| 🛠️ Development | `generate`, `refactor`, `build`, `create` |
| 🐛 Debug | `debug`, `fix`, `logs`, `error` |
| ⚙️ General | (default si no encaja) |

---

## 2. FORMATO DE SALIDA

Renderizar usando este template con datos REALES del Paso 1-3:

```
⚡ AVAILABLE COMMANDS ({N} total)

═══════════════════════════════════════════════════════════════════════════════

[ICONO] [CATEGORÍA]
═══════════════════════════════════════════════════════════════════════════════

/[comando]
  └─ [descripción]
  └─ v[versión] | model: [model]

(repetir por cada comando en la categoría)

═══════════════════════════════════════════════════════════════════════════════

💡 TIP: Usa /docs para explorar documentación detallada
```

---

## 3. FILTRADO (Argumento Opcional)

Si el usuario proporciona argumento:

```
/commands strategy    → Solo mostrar categoría 🧠 Strategy
/commands planner     → Solo mostrar comandos que contengan "planner"
/commands quality     → Solo mostrar categoría 🛡️ Quality
```

Lógica:
1. Si argumento coincide con nombre de categoría → filtrar por categoría
2. Si no → buscar en nombres de comandos que contengan el argumento

---

## 4. ANTI-ALUCINACIÓN

| ❌ PROHIBIDO | ✅ OBLIGATORIO |
|--------------|----------------|
| Listar comandos de memoria | `Glob` para obtener lista real |
| Inventar descripciones | `Read` frontmatter de cada archivo |
| Asumir que existe `/quick-debug` | Verificar con `Glob` primero |
| Usar lista de este archivo | Escanear `.claude/commands/` en tiempo real |

---

## 5. EJEMPLO DE EJECUCIÓN

Cuando el usuario escribe `/commands`:

```
1. Glob('.claude/commands/*.md')
   → Resultado: [planner.md, commands.md, docs.md, tools.md, ...]

2. Para cada archivo:
   Read(archivo, limit: 15)
   → Extraer: description, version, model

3. Categorizar según keywords

4. Renderizar en formato visual

5. Mostrar al usuario
```

---

**Relacionado**: `/tools`, `/docs`, `/skills`
**Source**: `.claude/commands/` directory (escaneado en tiempo real)
