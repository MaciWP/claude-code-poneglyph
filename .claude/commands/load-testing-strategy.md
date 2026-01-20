---
description: Carga estrategias de testing (TDD, mutation testing, flaky detection)
model: opus
version: 2.0.0 (Lean)
---

# /load-testing-strategy

Inyecta la Base de Conocimiento de Testing en el contexto actual.

## 1. MANIFESTO DE CARGA

Se leerán los siguientes recursos (~42 KB):

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `.claude/docs/testing/README.md` | Overview, Golden Rule |
| 2 | `.claude/docs/testing/test-generation.md` | Given-When-Then → código |
| 3 | `.claude/docs/testing/mutation-testing.md` | Verificar root functionality |
| 4 | `.claude/docs/testing/flaky-tests.md` | Detección y fix de tests inestables |

## 2. PROTOCOLO DE EJECUCIÓN

Instrucciones para el Agente:

1. **Validación Previa:**
   Ejecuta `Glob('.claude/docs/testing/*.md')` para confirmar disponibilidad.

2. **Inyección de Contexto:**
   Ejecuta `Read` para cada uno de los 4 archivos listados.

3. **Confirmación:**
   Al finalizar, responde únicamente con:
   > "🧪 **Testing Strategy Module Loaded:** 4 archivos de patrones de testing activos. Listo para generar tests que verifican root functionality."

---

**Cuándo usar:** Antes de generar tests, aplicar TDD, o diagnosticar tests flaky.
