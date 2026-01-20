# Specs Index

## Arquitectura: Agentes Base + Skills

> **Principio**: Pocos agentes base bien definidos + muchas skills para especialización.

### Agentes Base (4)

| Agente | Rol | Tools | Specs |
|--------|-----|-------|-------|
| `builder` | Implementa código | All | SPEC-004 |
| `reviewer` | Valida código | Read-only | SPEC-005 |
| `planner` | Planifica ejecución | Read-only + MCPs | SPEC-003 |
| `error-analyzer` | Analiza errores | Read-only | SPEC-008 |

### Diagrama del Sistema

```mermaid
graph TD
    subgraph "Lead LLM"
        L[Lead<br/>allowedTools: Task, TodoWrite, AskUserQuestion]
    end

    subgraph "Agentes Base"
        B[builder]
        R[reviewer]
        P[planner]
        EA[error-analyzer]
    end

    subgraph "Soporte"
        CL[command-loader]
        E[Explore nativo]
    end

    subgraph "Skills (cargadas por command-loader)"
        S1[typescript-patterns]
        S2[security-coding]
        S3[security-review]
        S4[retry-patterns]
        S5[...]
    end

    L --> CL
    CL --> S1 & S2 & S3 & S4 & S5
    L --> E
    L --> B & R & P & EA

    B -.-> |"usa"| S1 & S2
    R -.-> |"usa"| S3
    EA -.-> |"usa"| S4
```

---

## Specs Registry

<!-- SPEC_TABLE_START -->
| ID | File | Status | Version | Priority | Depends | Updated |
|----|------|--------|---------|----------|---------|---------|
| SPEC-001 | [lead-llm-orchestrator.md](./lead-llm-orchestrator.md) | approved | 2.0 | high | - | 2026-01-18 |
| SPEC-002 | [scout-explorer-agent.md](./scout-explorer-agent.md) | approved | 1.1 | high | SPEC-001 | 2026-01-18 |
| SPEC-003 | [planner-agent.md](./planner-agent.md) | approved | 3.0 | high | SPEC-001, SPEC-002 | 2026-01-18 |
| SPEC-004 | [builder-agent.md](./builder-agent.md) | approved | 2.0 | high | SPEC-001, SPEC-003 | 2026-01-18 |
| SPEC-005 | [reviewer-agent.md](./reviewer-agent.md) | approved | 3.0 | high | SPEC-001, SPEC-004 | 2026-01-18 |
| SPEC-006 | [spec-gen-command.md](./spec-gen-command.md) | approved | 2.0 | high | - | 2026-01-18 |
| SPEC-007 | [command-loader-agent.md](./command-loader-agent.md) | approved | 1.0 | high | SPEC-001 | 2026-01-18 |
| SPEC-008 | [error-analyzer-agent.md](./error-analyzer-agent.md) | approved | 1.0 | high | SPEC-001 | 2026-01-18 |
| SPEC-009 | [skills-system.md](./skills-system.md) | approved | 1.0 | high | SPEC-001, SPEC-007 | 2026-01-18 |
| SPEC-010 | [validation-hooks-system.md](./validation-hooks-system.md) | approved | 1.0 | high | SPEC-004, SPEC-005 | 2026-01-20 |
| - | [ARCHITECTURE.md](./ARCHITECTURE.md) | approved | 1.0 | critical | - | 2026-01-18 |
<!-- SPEC_TABLE_END -->

---

## Decision Log

### Arquitectura Base + Skills (2026-01-18)

| Decisión | Rationale |
|----------|-----------|
| **4 agentes base solamente** | Simplicidad de routing, Lead elige entre 4, no 10+ |
| **Skills para especialización** | Lazy loading, combinables, evolucionan independientemente |
| **Comportamiento inmutable** | Agentes no cambian con skills, skills aportan conocimiento |
| **Eliminar agentes especializados** | refactor-agent, security-auditor, experts → builder/reviewer + skills |

### Decisiones por Spec

| Date | Spec | Decision | Rationale |
|------|------|----------|-----------|
| 2026-01-18 | SPEC-001 | Lead como Claude Code CLI con allowedTools restringido | Fuerza delegación |
| 2026-01-18 | SPEC-002 | Usar Explore nativo de Claude Code | Ya existe, sin overhead |
| 2026-01-18 | SPEC-003 | **v3.0** Planner asigna agente base + sugiere skills | Ya no descubre agentes especializados |
| 2026-01-18 | SPEC-004 | **v2.0** Builder es único implementador + skills | Elimina refactor-agent, security-auditor |
| 2026-01-18 | SPEC-005 | **v3.0** Reviewer único + skills de dominio | Elimina Two-Pass con experts separados |
| 2026-01-18 | SPEC-006 | Research Phase obligatoria | Investigar antes de facilitar |
| 2026-01-18 | SPEC-007 | command-loader expande @files y !bash | Lead necesita contexto completo |
| 2026-01-18 | SPEC-008 | error-analyzer solo analiza, Lead ejecuta | Separación de concerns |

---

## Quick Stats

- Draft: 0 | Review: 0 | Approved: 11
- Agentes Base: 4 (builder, reviewer, planner, error-analyzer)
- Agentes Soporte: 2 (command-loader, Explore nativo)

---

## Agent Pipeline

```mermaid
graph LR
    subgraph "Fase 1: Contexto"
        L[Lead] --> |"Carga skills"| CL[command-loader]
        L --> |"Explora"| E[Explore]
    end

    subgraph "Fase 2: Planificación"
        L --> |"Planifica"| P[planner]
        P --> |"Roadmap + skills sugeridas"| L
    end

    subgraph "Fase 3: Ejecución"
        L --> |"Implementa + skills"| B[builder]
        B --> |"Código"| L
    end

    subgraph "Fase 4: Validación"
        L --> |"Review + skills"| R[reviewer]
        R --> |"✅ APPROVED"| L
        R --> |"❌ NEEDS_CHANGES"| P
    end

    subgraph "Fase 5: Error Recovery"
        B --> |"❌ Error"| L
        L --> |"Analiza"| EA[error-analyzer]
        EA --> |"Diagnóstico"| L
        L --> |"Re-planifica"| P
    end
```

---

## Skills Mapping

### Para Builder

| Skill | Keywords | Cuándo |
|-------|----------|--------|
| typescript-patterns | typescript, async, types | Código TypeScript |
| bun-best-practices | bun, elysia, test | Código con Bun |
| security-coding | security, auth, validation | Auth, data handling |
| refactoring-patterns | refactor, SOLID, extract | Refactorizar código |
| websocket-patterns | websocket, realtime, ws | Código realtime |

### Para Reviewer

| Skill | Keywords | Cuándo |
|-------|----------|--------|
| security-review | security, owasp, vuln | Revisar código de auth |
| performance-review | performance, memory | Código crítico |
| code-quality | quality, smell | Review general |

### Para Error-Analyzer

| Skill | Keywords | Cuándo |
|-------|----------|--------|
| retry-patterns | retry, timeout, backoff | Errores transitorios |
| diagnostic-patterns | error, debug | Errores complejos |
| recovery-strategies | recovery, rollback | Fallos de workflow |

---

## Agentes Eliminados (migrados a skills)

| Agente Anterior | Ahora es |
|-----------------|----------|
| ~~refactor-agent~~ | builder + skill:refactoring-patterns |
| ~~security-auditor~~ | reviewer + skill:security-review |
| ~~code-quality~~ | reviewer + skill:code-quality |
| ~~expert:websocket~~ | builder/reviewer + skill:websocket-patterns |
| ~~test-watcher~~ | reviewer + skill:testing-strategy |

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-01-20 | SPEC-010 v1.0: Validation Hooks System - Self-validating agents |
| 2026-01-18 | SPEC-009 v1.0: Skills System - 12 skills standalone |
| 2026-01-18 | SPEC-001 v2.0: Lead Orchestrator con Research Summary |
| 2026-01-18 | Arquitectura Base + Skills v1.0 |
| 2026-01-18 | SPEC-003 v3.0: Planner asigna agente + skills |
| 2026-01-18 | SPEC-004 v2.0: Builder único implementador |
| 2026-01-18 | SPEC-005 v3.0: Reviewer único con skills |
| 2026-01-18 | SPEC-008 v1.0: Error Analyzer nuevo |
