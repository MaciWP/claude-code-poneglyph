---
name: create-expert
description: Crea un nuevo experto con estructura base
arguments:
  - name: domain
    description: Nombre del dominio del experto (ej: websocket, auth, database)
    required: true
---

# Create Expert: $ARGUMENTS

Crea la estructura de un nuevo experto en `.claude/experts/$ARGUMENTS/`.

## Pre-Validacion

Antes de crear, verificar que el experto NO exista:

```bash
# Verificar existencia
ls -la .claude/experts/$ARGUMENTS/ 2>/dev/null
```

Si el directorio existe, DETENER y reportar:
```
El experto '$ARGUMENTS' ya existe en .claude/experts/$ARGUMENTS/
Use otro nombre o edite el experto existente.
```

## Estructura a Crear

| Archivo | Proposito |
|---------|-----------|
| `.claude/experts/$ARGUMENTS/` | Directorio del experto |
| `.claude/experts/$ARGUMENTS/expertise.yaml` | Definicion del experto |

## Creacion

### 1. Crear directorio

```bash
mkdir -p .claude/experts/$ARGUMENTS
```

### 2. Crear expertise.yaml

Crear archivo `.claude/experts/$ARGUMENTS/expertise.yaml` con el siguiente contenido:

```yaml
domain: "$ARGUMENTS"
version: "1.0.0"
last_updated: "[TIMESTAMP ISO8601]"
last_updated_by: "manual"
confidence: 0.5

mental_model:
  overview: |
    Describe el dominio $ARGUMENTS aqui.
    - Que problema resuelve
    - Como se integra con el sistema
    - Tecnologias principales
  architecture:
    type: "[layers|event-driven|microservices|monolith]"
    framework: "[framework principal]"
    protocol: "[HTTP|WebSocket|gRPC|etc]"
    diagram: |
      Component A --> Component B --> Component C
  key_files:
    - path: "path/to/relevant/file.ts"
      purpose: "Descripcion del proposito del archivo"
      patterns:
        - "patron 1"
        - "patron 2"
      last_verified: "[FECHA]"
  relationships:
    - from: "component_a"
      to: "component_b"
      type: "[calls|subscribes_to|extends|implements]"
      description: "Descripcion de la relacion"

patterns:
  - name: "PatternName"
    confidence: 0.5
    usage: "Cuando usar este patron"
    example: |
      // Ejemplo de codigo
      const example = () => {
        // implementacion
      }
    gotchas:
      - "Cuidado con X"
      - "No olvidar Y"

known_issues: []
# Formato de issues:
#   - id: "DOMAIN-001"
#     symptom: "Descripcion del sintoma"
#     root_cause: "Causa raiz identificada"
#     solution: "Solucion aplicada o propuesta"
#     verified: false
#     date_found: "[FECHA]"

changelog:
  - date: "[TIMESTAMP ISO8601]"
    type: "bootstrap"
    source: "create-expert"
    change: "Initial creation via /create-expert command"
    confidence_delta: 0.5

validation:
  required_files: []
  # Archivos que deben existir para validar el experto
  # - path/to/required/file.ts
  required_patterns: []
  # Patrones que deben existir en archivos especificos
  # - file: "path/to/file.ts"
  #   pattern: "regex_pattern"
  #   description: "Que debe encontrar"
```

## Siguiente Paso

Despues de crear el experto, completar la informacion:

1. **Identificar key_files**: Usar `Glob` para encontrar archivos relevantes del dominio
2. **Documentar patterns**: Revisar el codigo y extraer patrones recurrentes
3. **Definir relationships**: Mapear como se conecta con otros componentes
4. **Agregar validation**: Definir archivos/patrones requeridos para validar

### Comandos Utiles

```bash
# Buscar archivos relacionados al dominio
find . -type f -name "*.ts" | xargs grep -l "$ARGUMENTS" | head -20

# Ver estructura de expertos existentes
cat .claude/experts/websocket/expertise.yaml
```

## Output Esperado

```
Experto '$ARGUMENTS' creado exitosamente!

Archivos creados:
  .claude/experts/$ARGUMENTS/expertise.yaml

Siguiente paso:
  1. Editar .claude/experts/$ARGUMENTS/expertise.yaml
  2. Completar mental_model.overview
  3. Agregar key_files relevantes
  4. Documentar patterns del dominio
  5. Definir validation rules
```

---

**Version**: 1.0.0
**Relacionado**: `/expert-patterns`, `/compare-pattern`
