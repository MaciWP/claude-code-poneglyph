# SPEC-025: Frontend Backend Sync

<!--
status: draft
priority: high
research_confidence: high
sources_count: 8
depends_on: [SPEC-011, SPEC-012, SPEC-013, SPEC-015, SPEC-016, SPEC-019]
enables: []
created: 2026-01-29
updated: 2026-01-29
-->

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Best Practice | WebSocket React 2025 | [ACTE](https://www.acte.in/using-websockets-in-react) | Alta |
| Best Practice | Real-Time Dashboard | [Medium](https://medium.com/@connect.hashblock/i-built-a-real-time-dashboard-in-react-using-websockets-and-recoil-076d69b4eeff) | Alta |
| Type Safety | tRPC Type Sync | [Marmelab](https://marmelab.com/blog/2024/04/04/trpc-full-stack-types.html) | Alta |
| UX Pattern | Validation Feedback | [NN/g](https://www.nngroup.com/articles/indicators-validations-notifications/) | Alta |
| UX Pattern | Error Messages | [Smashing](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/) | Alta |
| Proyecto | Patrones existentes | Codebase actual | Alta |

### Decisiones Informadas por Research

| Decisión | Basada en |
|----------|-----------|
| Reusar useApiCall para nuevos endpoints | Patrón existente en proyecto |
| Validation feedback inline en chat, no toast | NN/g |
| Nuevo chunk type validation_event | Patrón de agent_event, learning_event |
| Batching para metrics real-time | WildNet |
| Tipos en shared/types.ts | tRPC patterns |

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| API Integration | Alta | Patrones establecidos en proyecto |
| Validation UX | Alta | Research UX + patrón inline |
| Metrics Dashboard | Media | Sin benchmarks específicos |
| Resilience UI | Baja | Requiere rutas backend primero |

---

## 1. Vision

> **Press Release**: Claude Code Poneglyph ahora muestra métricas en tiempo real, feedback de validación inline, búsqueda de memoria semántica, y controles de sesión avanzados.

**Background**: El backend tiene 20+ endpoints y features implementadas que el frontend no consume.

**Usuario objetivo**: Desarrolladores usando la UI web de Claude Code Poneglyph.

**Métricas de éxito**:
- 100% de endpoints P1/P2 consumidos por frontend
- Validation errors visibles en <500ms
- Metrics dashboard actualiza cada 2s

---

## 2. Goals & Non-Goals

### Goals
- [ ] Consumir todos los endpoints de /api/metrics/*
- [ ] Mostrar validation hook errors inline en el chat
- [ ] Implementar búsqueda de memoria semántica
- [ ] Añadir controles de session export/import/summarize
- [ ] Crear dashboard de resilience (si rutas disponibles)
- [ ] UI para multi-expert orchestration

### Non-Goals
- [ ] Cambiar la arquitectura de WebSocket existente
- [ ] Implementar autenticación de usuarios
- [ ] Crear nuevos endpoints backend (solo consumir existentes)
- [ ] Mobile responsive (fuera de scope)

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Decisión |
|-------------|------|------|----------|
| Inline validation en chat | Contexto visual, no se pierde | Más código en chunk-handler | Elegida |
| Toast notifications | Simple de implementar | Se pierde, no accesible | Rechazada |
| Panel lateral de errores | Persistente | Duplicación de info | Rechazada |

---

## 4. Design

### 4.1 Arquitectura de Cambios

Backend Existente -> Frontend Nuevo:
- /api/metrics/* -> MetricsDashboard v2
- validation_event WS -> ValidationFeedback inline
- /api/memory/* -> MemoryPanel
- /api/sessions/* -> SessionControls
- /api/resilience/* (FALTA) -> ResilienceDashboard
- /api/multi-expert/* -> MultiExpertPanel

### 4.2 Prioridad P1: Metrics Dashboard

Archivos a modificar:
- web/src/lib/api.ts - Añadir getMetricsSummary(), getMetricsExecutions(), getMetricsAgents()
- web/src/hooks/useMetricsDashboard.ts - Consumir nuevos endpoints
- web/src/components/MetricsDashboard.tsx - Mostrar toolCalls, avgTime, delegationRate

### 4.3 Prioridad P1: Validation Hooks UI

Backend emite validation_event con: validationType, validator, message, file, line
Frontend handler en chunk-handler/index.ts
Nuevo componente ValidationEntry.tsx

### 4.4 Prioridad P2: Memory Panel

- web/src/components/MemoryPanel.tsx - Panel principal
- web/src/hooks/useMemory.ts - Hook para API memory

### 4.5 Prioridad P2: Session Controls

Modificar web/src/components/SessionList.tsx con export/import/summarize

### 4.6 Prioridad P3: Resilience Dashboard

BLOCKER: Backend no expone rutas para resilience.

### 4.7 Prioridad P3: Multi-Expert Panel

- web/src/components/MultiExpertPanel.tsx
- web/src/hooks/useMultiExpert.ts

---

## 5. FAQ

Q: ¿Qué pasa si el backend no emite validation_event?
A: El handler simplemente no recibe ese tipo. Es backwards compatible.

Q: ¿Cómo manejamos muchos validation errors?
A: Agrupar por archivo, mostrar contador, expandir on-click.

Q: ¿Resilience requiere cambios backend?
A: Sí, es BLOCKER.

---

## 6. Acceptance Criteria (BDD)

Feature: Metrics Dashboard
  Scenario: Ver resumen de métricas
    Given el usuario está en la página principal
    When el dashboard se carga
    Then muestra avgToolCalls, avgTimeMs, delegationRate
    And los valores se actualizan cada 2 segundos

Feature: Validation Feedback
  Scenario: Error de validación aparece inline
    Given el builder está escribiendo código
    When secrets-validator detecta una API key
    Then aparece entry roja en el chat con mensaje

Feature: Memory Search
  Scenario: Buscar en memoria semántica
    Given el usuario abre MemoryPanel
    When escribe "authentication patterns" y busca
    Then ve lista de memorias relevantes rankeadas

Feature: Session Export
  Scenario: Exportar sesión
    Given el usuario tiene una sesión activa
    When hace click en "Export"
    Then descarga archivo JSON con la sesión completa

---

## 7. Open Questions

- [ ] ¿Crear rutas de resilience en backend como parte de esta spec o spec separada?
- [ ] ¿Límite de validation errors a mostrar antes de agrupar? (sugerido: 5)
- [ ] ¿Formato de export de sesión? (JSON vs formato propietario)

---

## 8. Sources

- WebSocket React Guide 2025 - https://www.acte.in/using-websockets-in-react
- Real-Time Dashboard Medium - https://medium.com/@connect.hashblock/i-built-a-real-time-dashboard-in-react-using-websockets-and-recoil-076d69b4eeff
- tRPC Type Sync - https://marmelab.com/blog/2024/04/04/trpc-full-stack-types.html
- NN/g Validation UX - https://www.nngroup.com/articles/indicators-validations-notifications/
- Smashing Error UX - https://www.smashingmagazine.com/2022/08/error-messages-ux-design/

---

## 9. Implementation Files

### Nuevos Archivos
| Archivo | Prioridad |
|---------|-----------|
| shared/types.ts (añadir tipos) | P1 |
| web/src/components/streaming-chat/ValidationEntry.tsx | P1 |
| web/src/components/MemoryPanel.tsx | P2 |
| web/src/hooks/useMemory.ts | P2 |
| web/src/components/MultiExpertPanel.tsx | P3 |
| web/src/hooks/useMultiExpert.ts | P3 |

### Archivos a Modificar
| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| web/src/lib/api.ts | +6 funciones | P1 |
| web/src/hooks/useMetricsDashboard.ts | Consumir /api/metrics/* | P1 |
| web/src/components/MetricsDashboard.tsx | Mostrar métricas | P1 |
| server/src/routes/websocket.ts | Emitir validation_event | P1 |
| web/src/hooks/chunk-handler/index.ts | Handler validation_event | P1 |
| web/src/components/SessionList.tsx | export/import/summarize | P2 |
