---
name: openapi
description: OpenAPI contract files — loads contract alignment skills for both backend and frontend
globs:
  - '**/openapi.yaml'
  - '**/openapi.yml'
  - '**/openapi.json'
  - '**/*contract*.yaml'
  - '**/types.gen.ts'
skills:
  - openapi-contract
  - openapi-frontend-contract
---

## OpenAPI Context

Fires for contract-first files shared between backend and frontend.

Recommended skills:

- `openapi-contract` — backend schema generation and drift prevention
- `openapi-frontend-contract` — generated client consumption and type alignment
