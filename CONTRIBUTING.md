# Contributing to Claude Code Poneglyph

Gracias por tu interés en contribuir a este proyecto. Esta guía te ayudará a configurar tu entorno y seguir las convenciones del proyecto.

## Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración del Entorno](#configuración-del-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Ejecutar el Proyecto](#ejecutar-el-proyecto)
- [Ejecutar Tests](#ejecutar-tests)
- [Convenciones de Código](#convenciones-de-código)
- [Quality Checks](#quality-checks)
- [Proceso de Contribución](#proceso-de-contribución)

---

## Requisitos Previos

| Herramienta | Versión Mínima | Instalación |
|-------------|----------------|-------------|
| **Bun** | 1.0+ | [bun.sh](https://bun.sh) |
| **Node.js** | 18+ | Para compatibilidad |
| **Git** | 2.0+ | Para control de versiones |

### Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp claude-code-ui/server/.env.example claude-code-ui/server/.env
```

Variables requeridas:

| Variable | Descripción |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `PORT` | Puerto del servidor (default: 8080) |

---

## Configuración del Entorno

### 1. Clonar el repositorio

```bash
git clone https://github.com/MaciWP/claude-code-poneglyph.git
cd claude-code-poneglyph
```

### 2. Instalar dependencias

```bash
# Backend
cd claude-code-ui/server
bun install

# Frontend
cd ../web
bun install
```

### 3. Configurar variables de entorno

```bash
cd claude-code-ui/server
cp .env.example .env
# Editar .env con tus credenciales
```

---

## Estructura del Proyecto

```
claude-code-poneglyph/
├── .claude/                    # Configuración de Claude Code
│   ├── agents/                 # Definiciones de agents
│   ├── skills/                 # Skills disponibles
│   ├── commands/               # Slash commands
│   ├── hooks/                  # Hooks de ejecución
│   └── workflows/              # Workflows predefinidos
├── claude-code-ui/             # Aplicación principal
│   ├── server/                 # Backend (Bun + Elysia)
│   │   ├── src/
│   │   │   ├── routes/         # Endpoints HTTP/WS
│   │   │   ├── services/       # Lógica de negocio
│   │   │   └── utils/          # Utilidades
│   │   └── package.json
│   ├── web/                    # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/     # Componentes React
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── lib/            # Utilidades
│   │   └── package.json
│   └── shared/                 # Tipos compartidos
│       └── types.ts
├── docs/                       # Documentación
│   └── orchestrator/           # Docs de orquestación
└── reports/                    # Reportes de calidad
```

---

## Ejecutar el Proyecto

### Desarrollo

```bash
# Terminal 1: Backend
cd claude-code-ui/server
bun dev

# Terminal 2: Frontend
cd claude-code-ui/web
bun dev
```

| Servicio | URL |
|----------|-----|
| Backend (Elysia) | http://localhost:8080 |
| Frontend (Vite) | http://localhost:5173 |
| WebSocket | ws://localhost:8080/ws |

### Producción

```bash
# Backend
cd claude-code-ui/server
bun start

# Frontend (build)
cd claude-code-ui/web
bun run build
```

---

## Ejecutar Tests

### Backend

```bash
cd claude-code-ui/server

# Ejecutar todos los tests
bun test

# Watch mode
bun test --watch

# Test específico
bun test src/services/claude.test.ts
```

### Frontend

```bash
cd claude-code-ui/web

# Ejecutar todos los tests
bun test

# Watch mode
bun test --watch
```

### Coverage (cuando esté configurado)

```bash
bun test --coverage
```

---

## Convenciones de Código

### TypeScript

| Regla | Ejemplo |
|-------|---------|
| Usar `interface` sobre `type` | `interface User { ... }` |
| Usar `unknown` sobre `any` | `function parse(data: unknown)` |
| Tipar parámetros y retornos | `function getName(user: User): string` |
| No usar `@ts-ignore` | Resolver el error de tipos |

### Imports

```typescript
// ✅ Correcto: imports organizados
import { Elysia } from 'elysia'
import { z } from 'zod'

import { config } from '../config'
import type { Session } from '../types'

// ❌ Incorrecto: imports desordenados
import { config } from '../config'
import { Elysia } from 'elysia'
```

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Variables | camelCase | `userName` |
| Funciones | camelCase | `getUserById` |
| Clases | PascalCase | `SessionStore` |
| Interfaces | PascalCase | `UserConfig` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES` |
| Archivos | kebab-case | `user-service.ts` |

### Comentarios (Filosofía YOLO)

```typescript
// ✅ Código auto-explicativo (sin comentarios)
function calculateTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// ❌ Comentarios innecesarios
// Esta función calcula el precio total
// Suma el precio de cada item multiplicado por su cantidad
function calculateTotalPrice(items: CartItem[]): number {
  // Usar reduce para sumar
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
```

### Async/Await

```typescript
// ✅ Correcto: try/catch obligatorio
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await api.get(`/users/${id}`)
    return response.data
  } catch (error) {
    logger.error('Failed to fetch user', { id, error })
    throw new UserNotFoundError(id)
  }
}

// ❌ Incorrecto: sin manejo de errores
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`)
  return response.data
}
```

---

## Quality Checks

### Antes de Commit

```bash
# TypeScript (ambos paquetes)
cd claude-code-ui/server && bun tsc --noEmit
cd ../web && bun tsc --noEmit

# Tests (ambos paquetes)
cd claude-code-ui/server && bun test
cd ../web && bun test
```

### Scripts de Quality (cuando estén disponibles)

```bash
# Desde raíz del proyecto
./scripts/check.sh      # Ejecuta todo
./scripts/typecheck.sh  # Solo TypeScript
./scripts/lint.sh       # Solo ESLint
./scripts/test.sh       # Solo tests
```

### Checklist Pre-PR

- [ ] TypeScript compila sin errores
- [ ] Tests pasan
- [ ] No hay `console.log` en código de producción
- [ ] No hay secrets hardcodeados
- [ ] Código sigue las convenciones del proyecto

---

## Proceso de Contribución

### 1. Crear Branch

```bash
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
```

### 2. Hacer Cambios

- Seguir las convenciones de código
- Añadir tests para nueva funcionalidad
- Actualizar documentación si es necesario

### 3. Commit

```bash
git add .
git commit -m "feat(scope): descripción corta

Descripción más detallada si es necesario.

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Tipos de commit**:

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactoring (sin cambio funcional) |
| `docs` | Solo documentación |
| `test` | Solo tests |
| `chore` | Configuración, dependencias |

### 4. Push y PR

```bash
git push -u origin feature/nombre-descriptivo
```

Luego crear Pull Request en GitHub.

### 5. Review

- Esperar revisión de código
- Responder a comentarios
- Hacer cambios solicitados
- Merge cuando esté aprobado

---

## Recursos Adicionales

| Recurso | Ubicación |
|---------|-----------|
| Arquitectura | `.claude/agent_docs/architecture.md` |
| API Reference | `.claude/agent_docs/api-reference.md` |
| Patrones | `.claude/agent_docs/patterns.md` |
| Troubleshooting | `.claude/agent_docs/troubleshooting.md` |
| Orchestrator | `docs/orchestrator/ORCHESTRATOR.md` |
| Quality Gates | `reports/QUALITY_GATES.md` |

---

## Preguntas

Si tienes preguntas:

1. Revisa la documentación existente
2. Busca en issues cerrados
3. Abre un nuevo issue con tu pregunta

---

*Última actualización: 2026-01-11*
