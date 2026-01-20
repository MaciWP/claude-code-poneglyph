---
description: Carga patrones de refactoring (code smells, safe refactoring, legacy modernization)
model: opus
version: 2.0.0 (Lean)
---

# /load-refactoring

Inyecta la Base de Conocimiento de Refactoring en el contexto actual.

## 1. MANIFESTO DE CARGA

Se leerán los siguientes recursos (~18 KB):

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `.claude/docs/refactoring/README.md` | Overview, principios |
| 2 | `.claude/docs/refactoring/code-smells.md` | Detección de code smells |
| 3 | `.claude/docs/refactoring/safe-refactoring.md` | Técnicas seguras |
| 4 | `.claude/docs/refactoring/legacy-modernization.md` | Modernización de código legacy |
| 5 | `.claude/docs/refactoring/quality-gates.md` | Thresholds CI/CD |

## 2. PROTOCOLO DE EJECUCIÓN

Instrucciones para el Agente:

1. **Validación Previa:**
   Ejecuta `Glob('.claude/docs/refactoring/*.md')` para confirmar disponibilidad.

2. **Inyección de Contexto:**
   Ejecuta `Read` para cada uno de los 5 archivos listados.

3. **Confirmación:**
   Al finalizar, responde únicamente con:
   > "🔧 **Refactoring Module Loaded:** 5 archivos de patrones de refactoring activos. Listo para detectar smells y aplicar refactorings seguros."

---

**Cuándo usar:** Antes de refactoring, análisis de complejidad, o modernización de código legacy.
