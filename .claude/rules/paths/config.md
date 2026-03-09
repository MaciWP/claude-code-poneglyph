---
globs:
  - "**/config/**"
  - "**/.env*"
  - "**/settings*"
priority: 10
skills:
  - config-validator
keywords:
  - env
  - config
  - settings
  - environment
---

## Config Context

Archivos de configuracion y variables de entorno. Validar tipos, documentar variables.

- Usar Zod para validacion de config
- Nunca hardcodear secrets
- Documentar cada variable de entorno
- Proveer valores default sensatos
