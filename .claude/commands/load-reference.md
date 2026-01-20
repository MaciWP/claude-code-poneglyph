---
description: Carga contexto extendido del proyecto (API, arquitectura, tools)
model: opus
version: 2.0.0 (Lean)
---

# /load-reference

Inyecta el Contexto Extendido del Proyecto en el contexto actual.

## 1. MANIFESTO DE CARGA

Se leerá el siguiente recurso (~8 KB):

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `CLAUDE-reference.md` | Arquitectura, API completa, tools, anti-hallucination |

## 2. PROTOCOLO DE EJECUCIÓN

Instrucciones para el Agente:

1. **Validación Previa:**
   Ejecuta `Glob('CLAUDE-reference.md')` para confirmar disponibilidad.

2. **Inyección de Contexto:**
   Ejecuta `Read('CLAUDE-reference.md')`.

3. **Confirmación:**
   Al finalizar, responde únicamente con:
   > "📚 **Reference Module Loaded:** Contexto extendido activo (arquitectura, API, tools). Listo para desarrollo informado."

---

**Cuándo usar:** Al iniciar sesión de desarrollo o cuando necesitas visión completa del proyecto.
