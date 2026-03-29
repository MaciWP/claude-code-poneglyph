---
description: Lista todas las skills disponibles organizadas por categoria de agente
model: haiku
version: 1.0.0
---

# /skills [category|search]

Genera un catalogo de todas las skills disponibles organizadas por agente y proposito.

---

## 1. PROTOCOLO DE DISCOVERY (Ejecucion Real)

**OBLIGATORIO**: Seguir estos pasos en orden. NO usar listas hardcodeadas.

### Paso 1: Scan

```
Glob('.claude/skills/*/SKILL.md')
```

Obtener la lista REAL de archivos de skills.

### Paso 2: Parse

Para cada archivo encontrado, ejecutar `Read` (primeras 25 lineas) y extraer:

| Campo | Fuente | Ejemplo |
|-------|--------|---------|
| Nombre | YAML `name:` | `typescript-patterns` |
| Descripcion | YAML `description:` (primera linea) | "TypeScript best practices..." |
| Version | YAML `version:` | "1.0" |
| Agentes | YAML `for_agents:` | `[builder]` |
| Keywords | YAML `activation.keywords:` | `[typescript, async]` |

### Paso 3: Categorizar

Asignar categoria basada en `for_agents`:

| Categoria | for_agents contiene | Icono |
|-----------|---------------------|-------|
| Builder | `builder` | B |
| Reviewer | `reviewer` | R |
| Error-Analyzer | `error-analyzer` | E |
| Shared | multiples agentes o `shared` | S |
| Meta | `meta` o skills operacionales | M |

---

## 2. ESTRUCTURA PROPUESTA (SPEC-009)

Segun SPEC-009, las skills deben organizarse asi:

```
.claude/skills/
|-- anti-hallucination/       # Validation patterns
|-- code-quality/             # Code quality + refactoring
|-- database-patterns/        # Database access patterns
|-- diagnostic-patterns/      # Debugging + retry + recovery
|-- logging-strategy/         # Structured logging
|-- lsp-operations/           # LSP navigation
|-- meta-create-agent/        # Create new agents
|-- meta-create-skill/        # Create new skills
|-- performance-review/       # Performance analysis
|-- security-review/          # Security audit
|-- sync-claude/              # Sync claude config
```

---

## 3. FORMATO DE SALIDA

Renderizar usando este template con datos REALES del Paso 1-3:

```
SKILLS CATALOG ({N} skills)

================================================================================

[B] BUILDER SKILLS
================================================================================
Skills para implementacion de codigo

  typescript-patterns
    Descripcion corta de la skill
    v1.0 | Keywords: typescript, async, types

  bun-best-practices
    Descripcion corta de la skill
    v1.0 | Keywords: bun, elysia, test

(repetir por cada skill)

================================================================================

[R] REVIEWER SKILLS
================================================================================
Skills para revision de codigo

  security-review
    OWASP-based security audit
    v1.0 | Keywords: security, owasp, vulnerability

(repetir por categoria)

================================================================================

[S] SHARED SKILLS
================================================================================
Skills usadas por multiples agentes

  anti-hallucination
    Validation patterns to prevent AI hallucinations
    v1.0 | Used by: builder, reviewer, error-analyzer

================================================================================

LIMITES (SPEC-009)
  - Max 3 skills por task
  - Max 10KB por skill
  - Max 25KB total cargado

TIP: Usa las keywords para auto-trigger de skills
```

---

## 4. TABLA DE SKILLS POR AGENTE

### Global Skills (11 disponibles)

| Skill | Proposito | Keywords |
|-------|-----------|----------|
| `anti-hallucination` | Validate claims, verify facts | validate, verify, check, exists, hallucination |
| `code-quality` | Code smells, SOLID, refactoring | quality, smells, complexity, refactor, extract, SOLID |
| `database-patterns` | Database access, queries, migrations | database, sql, drizzle, migration, query |
| `diagnostic-patterns` | Debugging, retry, recovery, 5 whys | debug, diagnose, trace, retry, recovery, rollback |
| `logging-strategy` | Structured logging, context | log, logging, structured, json |
| `lsp-operations` | Semantic code navigation | definition, references, hover, symbols |
| `meta-create-agent` | Create new agents | (manual invocation) |
| `meta-create-skill` | Create new skills | (manual invocation) |
| `performance-review` | N+1, memory leaks, bottlenecks | performance, memory, slow, n+1 |
| `security-review` | OWASP Top 10, auth, encryption | security, auth, jwt, password, owasp |
| `sync-claude` | Sync claude configuration | (manual invocation) |

---

## 5. FILTRADO (Argumento Opcional)

Si el usuario proporciona argumento:

```
/skills builder     -> Solo mostrar skills para builder
/skills reviewer    -> Solo mostrar skills para reviewer
/skills security    -> Buscar skills que contengan "security" en nombre o keywords
/skills auth        -> Buscar skills con keyword "auth"
```

Logica:
1. Si argumento coincide con nombre de categoria -> filtrar por categoria
2. Si no -> buscar en nombres de skills o keywords que contengan el argumento

---

## 6. ANTI-ALUCINACION

| NO hacer | SI hacer |
|----------|----------|
| Listar skills de memoria | `Glob` para obtener lista real |
| Inventar descripciones | `Read` frontmatter de cada archivo |
| Asumir que existe skill X | Verificar con `Glob` primero |
| Usar lista de este archivo | Escanear `.claude/skills/` en tiempo real |

---

## 7. EJEMPLO DE EJECUCION

Cuando el usuario escribe `/skills`:

```
1. Glob('.claude/skills/*/SKILL.md')
   -> Resultado: [typescript-patterns/SKILL.md, bun-best-practices/SKILL.md, ...]

2. Para cada archivo:
   Read(archivo, limit: 25)
   -> Extraer: name, description, version, for_agents, keywords

3. Categorizar segun for_agents

4. Renderizar en formato visual

5. Mostrar al usuario
```

---

## 8. USO DE SKILLS

Las skills se cargan automaticamente cuando:

1. **Keywords match**: El LLM detecta keywords en el prompt
2. **Agente asignado**: El Lead asigna skill a un agente
3. **Manual**: Usuario referencia skill directamente

Ejemplo de carga:
```
Lead -> "Implementar auth service"
Planner detecta: "auth" keyword
Sugiere: security-review skill
Lead -> Task(builder, prompt, skills=[security-review])
Builder recibe skill content en prompt
```

---

**Relacionado**: `/commands`, `/tools`, `/docs`
**Source**: `.claude/skills/` directory (escaneado en tiempo real)
**Spec**: SPEC-009 (Skills System)
