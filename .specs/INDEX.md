# Poneglyph Specs Registry

> Especificaciones formales del roadmap v1.1 → v2.1

## Status Legend

| Status | Meaning |
|--------|---------|
| `draft` | Spec creada, pendiente revision |
| `review` | En revision |
| `approved` | Aprobada, lista para implementar |
| `in_progress` | Implementacion en curso |
| `implemented` | Completada |
| `deprecated` | Descartada |

## Registry

| ID | Nombre | Version | Complejidad | Depende de | Status | Archivo |
|----|--------|---------|-------------|------------|--------|---------|
| SPEC-001 | Path-Specific Rules | v1.1 | 24 | — | `implemented` | [v1.1/SPEC-001-path-specific-rules.md](v1.1/SPEC-001-path-specific-rules.md) |
| SPEC-002 | Git Worktree Isolation | v1.1 | 32 | — | `by-design` | [v1.1/SPEC-002-git-worktree-isolation.md](v1.1/SPEC-002-git-worktree-isolation.md) | Claude Code native `isolation: "worktree"` |
| SPEC-003 | Trace Analytics | v1.1 | 20 | — | `implemented` | [v1.1/SPEC-003-trace-analytics.md](v1.1/SPEC-003-trace-analytics.md) |
| SPEC-004 | Stale Context Detection | v1.1 | 24 | — | `implemented` | [v1.1/SPEC-004-stale-context-detection.md](v1.1/SPEC-004-stale-context-detection.md) |
| SPEC-005 | Agent Skill Enrichment v2 | v1.1 | 28 | — | `implemented` | [v1.1/SPEC-005-agent-skill-enrichment-v2.md](v1.1/SPEC-005-agent-skill-enrichment-v2.md) |
| SPEC-006 | Continuous Validation Agent | v1.5 | 40 | SPEC-002 | `by-design` | [v1.5/SPEC-006-continuous-validation.md](v1.5/SPEC-006-continuous-validation.md) | Stop hook is available mechanism |
| SPEC-007 | Cost Optimization Engine | v1.5 | 44 | SPEC-005 | `implemented` | [v1.5/SPEC-007-cost-optimization-engine.md](v1.5/SPEC-007-cost-optimization-engine.md) |
| SPEC-008 | Agent Attention Mechanisms | v1.5 | 52 | SPEC-001, SPEC-004 | `implemented` | [v1.5/SPEC-008-agent-attention-mechanisms.md](v1.5/SPEC-008-agent-attention-mechanisms.md) |
| SPEC-009 | Pattern-Based Error Recovery | v1.5 | 40 | SPEC-003 | `implemented` | [v1.5/SPEC-009-pattern-error-recovery.md](v1.5/SPEC-009-pattern-error-recovery.md) |
| SPEC-010 | Agent Performance Scoring | v1.5 | 36 | SPEC-003 | `implemented` | [v1.5/SPEC-010-agent-performance-scoring.md](v1.5/SPEC-010-agent-performance-scoring.md) |
| SPEC-011 | Pattern Learning from Traces | v2.0 | 56 | SPEC-003, SPEC-009 | `implemented` | [v2.0/SPEC-011-pattern-learning.md](v2.0/SPEC-011-pattern-learning.md) |
| SPEC-012 | Cross-Agent Knowledge Graph | v2.0 | 64 | SPEC-004, SPEC-008 | `implemented` | [v2.0/SPEC-012-knowledge-graph.md](v2.0/SPEC-012-knowledge-graph.md) |
| SPEC-013 | Graduated Autonomy | v2.0 | 60 | SPEC-002, SPEC-006, SPEC-010 | `implemented` | [v2.0/SPEC-013-graduated-autonomy.md](v2.0/SPEC-013-graduated-autonomy.md) |
| SPEC-014 | Skill Synthesis | v2.0 | 68 | SPEC-005, SPEC-011 | `implemented` | [v2.0/SPEC-014-skill-synthesis.md](v2.0/SPEC-014-skill-synthesis.md) |
| SPEC-015 | Self-Optimizing Orchestration | v2.0 | 72 | SPEC-007→014 | `implemented` | [v2.0/SPEC-015-self-optimizing-orchestration.md](v2.0/SPEC-015-self-optimizing-orchestration.md) |
| SPEC-016 | Spec-Driven Development Workflow | v2.1 | 96 | SPEC-006 | `implemented` | [v2.1/SPEC-016-spec-driven-development-workflow.md](v2.1/SPEC-016-spec-driven-development-workflow.md) |
| SPEC-017 | AST Hallucination Detection | v2.1 | 132 | SPEC-009 | `implemented` | [v2.1/SPEC-017-ast-hallucination-detection.md](v2.1/SPEC-017-ast-hallucination-detection.md) |
| SPEC-018 | Context Virtualization | v2.1 | 172 | SPEC-008, SPEC-004, SPEC-012 | `implemented` | [v2.1/SPEC-018-context-virtualization.md](v2.1/SPEC-018-context-virtualization.md) |

## Dependency Graph

```
SPEC-001 ──────────────────────┐
                               ├──► SPEC-008 ──► SPEC-012 ──┐
SPEC-004 ──────────────────────┘                             │
                                                             │
SPEC-003 ──┬──► SPEC-009 ──► SPEC-011 ──► SPEC-014 ──┐      │
           │                                          │      │
           └──► SPEC-010 ──┐                          │      ├──► SPEC-015
                           ├──► SPEC-013 ─────────────┤      │
SPEC-002 ──► SPEC-006 ─────┘                          │      │
                                                      │      │
SPEC-005 ──┬──► SPEC-007 ─────────────────────────────┘      │
           │                                                  │
           └──────────────────► SPEC-014 ─────────────────────┘
```

**Keystone**: SPEC-003 (Trace Analytics) — habilita transitivamente la mayoria de v2.0.

## Waves

| Wave | Version | Specs | Parallelizable |
|------|---------|-------|----------------|
| 1 | v1.1 | 001-005 | Todas (zero deps) |
| 2 | v1.5 | 006-010 | 006/007/009/010 paralelas; 008 espera 001+004 |
| 3 | v2.0 | 011-015 | 011/012/013 paralelas; 014 tras 011; 015 ultima |
| 4 | v2.1 | 016-018 | 016/017 paralelas; 018 espera 008+004+012 |
