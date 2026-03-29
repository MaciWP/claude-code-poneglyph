---
description: Browse and load available documentation from .claude/docs/
model: haiku
version: 2.0.0
---

# /docs [topic] [file]

Sistema dinámico de navegación de conocimiento en `.claude/docs/`.

---

## 1. PROTOCOLO DE NAVEGACIÓN (3 Niveles)

**OBLIGATORIO**: Ejecutar Glob real, NO usar listas hardcodeadas.

### Nivel 1: Sin argumentos → Listar Temas

```
Glob('.claude/docs/*/')
```

Para cada directorio encontrado:
1. Extraer nombre de carpeta como tema
2. Contar archivos `.md` dentro
3. Buscar `README.md` para descripción (primera línea después del título)

**Output**:
```
📚 DOCUMENTATION TOPICS ({N} encontrados)

═══════════════════════════════════════════════════════════════════════════════

📁 [tema]
   └─ {N} archivos | README: [primera línea descripción]

(repetir por cada tema)

═══════════════════════════════════════════════════════════════════════════════

💡 Usar: /docs [tema] para explorar archivos
```

---

### Nivel 2: Con tema → Listar Archivos del Tema

```
/docs security
```

**Ejecución**:
```
1. Verificar: Glob('.claude/docs/security/') existe
2. Si NO existe → Error: "Tema 'security' no encontrado. Usa /docs para ver temas."
3. Si existe → Glob('.claude/docs/security/*.md')
4. Para cada archivo: extraer título (primer # del archivo)
```

**Output**:
```
📚 TOPIC: [TEMA] ({N} archivos)

═══════════════════════════════════════════════════════════════════════════════

📄 README.md
   └─ [título extraído del archivo]

📄 [archivo].md
   └─ [título extraído del archivo]

(repetir por cada archivo)

═══════════════════════════════════════════════════════════════════════════════

💡 Usar: /docs [tema] [archivo] para leer contenido
💡 Usar: /load-[tema] para cargar todo (si existe)
```

---

### Nivel 3: Con tema + archivo → Leer Contenido

```
/docs security sql-injection
```

**Ejecución**:
```
1. Construir path: '.claude/docs/security/sql-injection.md'
2. Verificar existencia con Glob
3. Si NO existe → Error con sugerencias de archivos válidos
4. Si existe → Read(path) completo
```

**Output**: Contenido completo del archivo markdown.

---

## 2. FORMATO DE SALIDA

### Nivel 1 (Temas)

```
📚 DOCUMENTATION TOPICS ({N} encontrados)

═══════════════════════════════════════════════════════════════════════════════

📁 anti-hallucination
   └─ 5 archivos | Validation patterns and confidence scoring

📁 security
   └─ 5 archivos | Security patterns and vulnerability detection

═══════════════════════════════════════════════════════════════════════════════

💡 Usar: /docs [tema] para explorar
```

### Nivel 2 (Archivos)

```
📚 TOPIC: SECURITY (5 archivos)

═══════════════════════════════════════════════════════════════════════════════

📄 README.md
   └─ Security Patterns Overview

📄 sql-injection.md
   └─ SQL Injection Prevention

📄 secret-detection.md
   └─ Secret and Credential Detection

═══════════════════════════════════════════════════════════════════════════════

💡 Usar: /docs security [archivo] para leer
```

---

## 3. ANTI-ALUCINACIÓN

| ❌ PROHIBIDO | ✅ OBLIGATORIO |
|--------------|----------------|
| Listar temas de memoria | `Glob('.claude/docs/*/')` real |
| Inventar archivos | `Glob('.claude/docs/[tema]/*.md')` real |
| Asumir que existe README | Verificar con Glob primero |
| Describir sin leer | `Read` primeras líneas para descripción |

---

## 4. POKA-YOKE (Manejo de Errores)

| Escenario | Acción |
|-----------|--------|
| Tema no existe | Listar temas válidos disponibles |
| Archivo no existe | Listar archivos válidos del tema |
| `.claude/docs/` vacío | "No hay documentación. Crear en .claude/docs/" |
| Path traversal (`../`) | RECHAZAR, solo rutas dentro de `.claude/docs/` |

---

## 5. EJEMPLO DE EJECUCIÓN

### Caso: `/docs`

```
1. Glob('.claude/docs/*/')
   → [anti-hallucination/, security/, testing/, refactoring/, context-management/]

2. Para cada directorio:
   - Contar archivos: Glob('.claude/docs/[tema]/*.md').length
   - Leer descripción: Read('.claude/docs/[tema]/README.md', limit: 5)

3. Renderizar lista de temas
```

### Caso: `/docs security`

```
1. Verificar: Glob('.claude/docs/security/')
   → Existe

2. Listar: Glob('.claude/docs/security/*.md')
   → [README.md, sql-injection.md, secret-detection.md, ...]

3. Para cada archivo:
   - Read(archivo, limit: 3) para extraer título

4. Renderizar lista de archivos
```

### Caso: `/docs security sql-injection`

```
1. Construir: '.claude/docs/security/sql-injection.md'

2. Verificar: Glob('.claude/docs/security/sql-injection.md')
   → Existe

3. Read('.claude/docs/security/sql-injection.md')
   → Contenido completo

4. Mostrar contenido
```

---

## 6. SEGURIDAD

**Directory Traversal Prevention**:

```
Si argumento contiene '../' o '..\' o path absoluto:
  → RECHAZAR: "Path inválido. Solo se permiten nombres de tema/archivo."
```

**Scope**: Solo `.claude/docs/` y subdirectorios directos.

---

**Relacionado**: `/load-anti-hallucination`, `/load-security`
**Source**: `.claude/docs/` directory (escaneado en tiempo real)
