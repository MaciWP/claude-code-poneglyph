---
description: Carga patrones de validación anti-alucinación (archivos, funciones, confidence)
model: opus
version: 2.0.0 (Lean)
---

# /load-anti-hallucination

Inyecta la Base de Conocimiento de Anti-Alucinación en el contexto actual.

## 1. MANIFESTO DE CARGA

Se leerán los siguientes recursos (~15 KB):

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `.claude/docs/anti-hallucination/README.md` | Overview, reglas rápidas |
| 2 | `.claude/docs/anti-hallucination/file-validation.md` | Validación 3-stage |
| 3 | `.claude/docs/anti-hallucination/function-validation.md` | Grep patterns |
| 4 | `.claude/docs/anti-hallucination/confidence-scoring.md` | Thresholds adaptativos |
| 5 | `.claude/docs/anti-hallucination/examples.md` | 8 casos reales |

## 2. PROTOCOLO DE EJECUCIÓN

Instrucciones para el Agente:

1. **Validación Previa:**
   Ejecuta `Glob('.claude/docs/anti-hallucination/*.md')` para confirmar disponibilidad.

2. **Inyección de Contexto:**
   Ejecuta `Read` para cada uno de los 5 archivos listados.

3. **Confirmación:**
   Al finalizar, responde únicamente con:
   > "🛡️ **Anti-Hallucination Module Loaded:** 5 archivos de patrones de validación activos. Listo para verificar claims antes de afirmar."

---

**Cuándo usar:** Antes de tareas complejas, refactoring multi-archivo, o cuando hay incertidumbre sobre rutas/funciones.
