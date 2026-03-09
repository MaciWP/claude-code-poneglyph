---
globs:
  - "**/auth/**"
  - "**/security/**"
priority: 20
skills:
  - security-review
  - typescript-patterns
keywords:
  - auth
  - jwt
  - password
  - token
  - session
---

## Auth & Security Context

Codigo de autenticacion y seguridad. Prioridad alta en revision de seguridad.

- NUNCA almacenar passwords en texto plano
- Usar bcrypt/argon2 para hashing
- Validar y sanitizar todos los inputs
- Implementar rate limiting en endpoints de auth
- Seguir OWASP guidelines
