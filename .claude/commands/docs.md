---
description: Browse and load available documentation from .claude/docs/
model: haiku
version: 2.0.0
---

# /docs [topic] [file]

Dynamic knowledge navigation system in `.claude/docs/`.

---

## 1. NAVIGATION PROTOCOL (3 Levels)

**MANDATORY**: Run real Glob, do NOT use hardcoded lists.

### Level 1: No arguments → List Topics

```
Glob('.claude/docs/*/')
```

For each directory found:
1. Extract folder name as topic
2. Count `.md` files inside
3. Look for `README.md` for description (first line after title)

**Output**:
```
📚 DOCUMENTATION TOPICS ({N} found)

═══════════════════════════════════════════════════════════════════════════════

📁 [topic]
   └─ {N} files | README: [first description line]

(repeat for each topic)

═══════════════════════════════════════════════════════════════════════════════

💡 Use: /docs [topic] to explore files
```

---

### Level 2: With topic → List Topic Files

```
/docs security
```

**Execution**:
```
1. Verify: Glob('.claude/docs/security/') exists
2. If NOT found → Error: "Topic 'security' not found. Use /docs to see topics."
3. If found → Glob('.claude/docs/security/*.md')
4. For each file: extract title (first # in the file)
```

**Output**:
```
📚 TOPIC: [TOPIC] ({N} files)

═══════════════════════════════════════════════════════════════════════════════

📄 README.md
   └─ [title extracted from file]

📄 [file].md
   └─ [title extracted from file]

(repeat for each file)

═══════════════════════════════════════════════════════════════════════════════

💡 Use: /docs [topic] [file] to read content
💡 Use: /load-[topic] to load everything (if it exists)
```

---

### Level 3: With topic + file → Read Content

```
/docs security sql-injection
```

**Execution**:
```
1. Build path: '.claude/docs/security/sql-injection.md'
2. Verify existence with Glob
3. If NOT found → Error with suggestions of valid files
4. If found → Read(path) in full
```

**Output**: Full content of the markdown file.

---

## 2. OUTPUT FORMAT

### Level 1 (Topics)

```
📚 DOCUMENTATION TOPICS ({N} found)

═══════════════════════════════════════════════════════════════════════════════

📁 anti-hallucination
   └─ 5 files | Validation patterns and confidence scoring

📁 security
   └─ 5 files | Security patterns and vulnerability detection

═══════════════════════════════════════════════════════════════════════════════

💡 Use: /docs [topic] to explore
```

### Level 2 (Files)

```
📚 TOPIC: SECURITY (5 files)

═══════════════════════════════════════════════════════════════════════════════

📄 README.md
   └─ Security Patterns Overview

📄 sql-injection.md
   └─ SQL Injection Prevention

📄 secret-detection.md
   └─ Secret and Credential Detection

═══════════════════════════════════════════════════════════════════════════════

💡 Use: /docs security [file] to read
```

---

## 3. ANTI-HALLUCINATION

| PROHIBITED | MANDATORY |
|------------|-----------|
| List topics from memory | Real `Glob('.claude/docs/*/')` |
| Invent files | Real `Glob('.claude/docs/[topic]/*.md')` |
| Assume README exists | Verify with Glob first |
| Describe without reading | `Read` first lines for description |

---

## 4. POKA-YOKE (Error Handling)

| Scenario | Action |
|----------|--------|
| Topic does not exist | List available valid topics |
| File does not exist | List valid files for the topic |
| `.claude/docs/` is empty | "No documentation found. Create in .claude/docs/" |
| Path traversal (`../`) | REJECT, only paths inside `.claude/docs/` |

---

## 5. EXECUTION EXAMPLE

### Case: `/docs`

```
1. Glob('.claude/docs/*/')
   → [anti-hallucination/, security/, testing/, refactoring/, context-management/]

2. For each directory:
   - Count files: Glob('.claude/docs/[topic]/*.md').length
   - Read description: Read('.claude/docs/[topic]/README.md', limit: 5)

3. Render topic list
```

### Case: `/docs security`

```
1. Verify: Glob('.claude/docs/security/')
   → Exists

2. List: Glob('.claude/docs/security/*.md')
   → [README.md, sql-injection.md, secret-detection.md, ...]

3. For each file:
   - Read(file, limit: 3) to extract title

4. Render file list
```

### Case: `/docs security sql-injection`

```
1. Build: '.claude/docs/security/sql-injection.md'

2. Verify: Glob('.claude/docs/security/sql-injection.md')
   → Exists

3. Read('.claude/docs/security/sql-injection.md')
   → Full content

4. Display content
```

---

## 6. SECURITY

**Directory Traversal Prevention**:

```
If argument contains '../' or '..\' or absolute path:
  → REJECT: "Invalid path. Only topic/file names are allowed."
```

**Scope**: Only `.claude/docs/` and direct subdirectories.

---

**Related**: `/load-anti-hallucination`, `/load-security`
**Source**: `.claude/docs/` directory (scanned at runtime)
