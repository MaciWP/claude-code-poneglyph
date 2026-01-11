# Orchestrator Backlog

> Lista priorizada de mejoras para claude-code-poneglyph

**Última actualización**: 2026-01-11
**Responsable**: Claude Code Orchestrator

---

## Resumen de Estado

| Categoría | P0 | P1 | P2 | P3 | Total |
|-----------|----|----|----|----|-------|
| Code Quality | 2 | 3 | 2 | 1 | 8 |
| Testing | 1 | 1 | 1 | 0 | 3 |
| DX/Tooling | 0 | 2 | 2 | 1 | 5 |
| Docs | 0 | 0 | 1 | 2 | 3 |
| **Total** | **3** | **6** | **6** | **4** | **19** |

---

## P0 - Crítico (Rompe build/CI)

### [P0-001] Server: 56 errores TypeScript (unused vars)

**Estado**: 🔴 Abierto
**Componente**: `claude-code-ui/server`
**Impacto**: CI falla en typecheck

**Descripción**:
El servidor tiene 56 errores de TypeScript, todos del tipo "declared but never used":
- Variables no usadas
- Parámetros de función no usados
- Imports no usados

**Solución propuesta**:
1. Prefijo `_` para parámetros intencionalmente no usados
2. Eliminar imports no usados
3. Revisar variables declaradas pero no usadas

**Archivos afectados**:
- `src/services/*.ts`
- `src/routes/*.ts`
- `src/lib/*.ts`

---

### [P0-002] Server: 16 tests fallando

**Estado**: 🔴 Abierto
**Componente**: `claude-code-ui/server`
**Impacto**: CI falla en tests

**Descripción**:
De 361 tests, 16 están fallando (344 pass, 1 skip).
Tasa de éxito: 95.3%

**Solución propuesta**:
1. Analizar tests fallando con `bun test --reporter=verbose`
2. Identificar si son regresiones o tests desactualizados
3. Arreglar o actualizar según corresponda

---

### [P0-003] Web: 6 errores ESLint

**Estado**: 🔴 Abierto
**Componente**: `claude-code-ui/web`
**Impacto**: CI falla en lint

**Descripción**:
El frontend tiene 6 errores de ESLint en código existente.

**Solución propuesta**:
1. Ejecutar `bun run lint` para ver errores específicos
2. Arreglar cada error según regla violada

---

## P1 - Alto (Bugs funcionales / DX crítico)

### [P1-001] ESLint warnings en server

**Estado**: 🟡 Abierto
**Componente**: `claude-code-ui/server`

**Descripción**:
Múltiples warnings de ESLint que no rompen CI pero indican problemas potenciales.

---

### [P1-002] Pre-commit hook parcialmente funcional

**Estado**: 🟡 Abierto
**Componente**: Raíz

**Descripción**:
El hook de lint-staged funciona para archivos en `src/` pero el commit inicial requirió `--no-verify` para archivos fuera de src.

**Solución propuesta**:
Ajustar globs de lint-staged para manejar mejor archivos no-código.

---

### [P1-003] CI con continue-on-error

**Estado**: 🟡 Abierto
**Componente**: `.github/workflows/ci.yml`

**Descripción**:
Server jobs tienen `continue-on-error: true` porque el código existente tiene errores.

**Solución propuesta**:
Después de arreglar P0-001 y P0-002, quitar `continue-on-error`.

---

### [P1-004] No hay test coverage reporting

**Estado**: 🟡 Abierto
**Componente**: Testing

**Descripción**:
No hay reporte de cobertura de tests configurado.

**Solución propuesta**:
Configurar `bun test --coverage` y añadir al CI.

---

### [P1-005] Sin validación de tipos en runtime

**Estado**: 🟡 Abierto
**Componente**: Server API

**Descripción**:
Los endpoints no validan input con Zod u otra librería.

**Solución propuesta**:
Agregar validación con Zod en routes.

---

### [P1-006] Console.log en producción

**Estado**: 🟡 Abierto
**Componente**: Ambos

**Descripción**:
Hay `console.log` statements que deberían usar logger estructurado.

---

## P2 - Medio (DX improvements, refactors)

### [P2-001] Scripts de desarrollo unificados

**Estado**: 🟢 Parcialmente resuelto
**Componente**: Raíz

**Descripción**:
Los scripts en raíz ya existen pero podrían mejorarse con:
- `dev` que inicie ambos servidores
- `build` que build ambos
- `clean` para limpiar node_modules y dist

---

### [P2-002] Hot reload mejorado

**Estado**: ⚪ Abierto
**Componente**: Server

**Descripción**:
El hot reload de Bun podría configurarse mejor.

---

### [P2-003] Docker compose para desarrollo

**Estado**: ⚪ Abierto
**Componente**: DevOps

**Descripción**:
Agregar docker-compose.yml para desarrollo local con PostgreSQL y Redis.

---

### [P2-004] Alias de imports

**Estado**: ⚪ Abierto
**Componente**: Ambos

**Descripción**:
Configurar path aliases (`@/` o `~/`) en tsconfig para imports más limpios.

---

### [P2-005] Storybook para componentes web

**Estado**: ⚪ Abierto
**Componente**: Web

**Descripción**:
Agregar Storybook para desarrollo y documentación de componentes.

---

### [P2-006] E2E tests con Playwright

**Estado**: ⚪ Abierto
**Componente**: Testing

**Descripción**:
Agregar tests E2E para flujos críticos.

---

## P3 - Bajo (Nice-to-have, docs)

### [P3-001] README con badges

**Estado**: ⚪ Abierto
**Componente**: Docs

**Descripción**:
Agregar badges de CI status, coverage, etc. al README.

---

### [P3-002] Changelog automatizado

**Estado**: ⚪ Abierto
**Componente**: Release

**Descripción**:
Configurar conventional commits + changelog automático.

---

### [P3-003] API docs con Swagger/OpenAPI

**Estado**: ⚪ Abierto
**Componente**: Server

**Descripción**:
Generar documentación OpenAPI automática de endpoints.

---

### [P3-004] GitHub issue templates

**Estado**: ⚪ Abierto
**Componente**: GitHub

**Descripción**:
Agregar templates para bugs, features, etc.

---

## Historial de Cambios

| Fecha | Item | Acción |
|-------|------|--------|
| 2026-01-11 | Backlog | Creación inicial |

---

## Notas

- Los items P0 bloquean CI verde
- P1 deberían resolverse antes del próximo release
- P2/P3 pueden priorizarse según necesidades del proyecto

---

*Generado por Claude Code Orchestrator*
