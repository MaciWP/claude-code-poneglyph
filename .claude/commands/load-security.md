---
description: Carga patrones de seguridad y prevención de vulnerabilidades (OWASP, Secrets, SQLi)
model: opus
version: 2.0.0 (Lean)
---

# /load-security

Inyecta la Base de Conocimiento de Seguridad en el contexto actual.

## 1. MANIFESTO DE CARGA

Se leerán los siguientes recursos (~29 KB):

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `.claude/docs/security/README.md` | Overview, quick reference |
| 2 | `.claude/docs/security/secret-detection.md` | Regex para API keys/tokens |
| 3 | `.claude/docs/security/sql-injection.md` | Prevención SQLi |
| 4 | `.claude/docs/security/common-vulnerabilities.md` | OWASP Top 10 |
| 5 | `.claude/docs/security/secure-patterns.md` | Ejemplos de código seguro |

## 2. PROTOCOLO DE EJECUCIÓN

Instrucciones para el Agente:

1. **Validación Previa:**
   Ejecuta `Glob('.claude/docs/security/*.md')` para confirmar disponibilidad.

2. **Inyección de Contexto:**
   Ejecuta `Read` para cada uno de los 5 archivos listados.

3. **Confirmación:**
   Al finalizar, responde únicamente con:
   > "🛡️ **Security Module Loaded:** 5 archivos de patrones de seguridad activos. Listo para auditoría y validación."

---

**Cuándo usar:** Antes de código de autenticación, manejo de datos sensibles, o endpoints de API.
