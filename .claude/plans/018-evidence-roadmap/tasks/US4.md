---
us: US4
title: W4 Platform — dotfile release patterns, memory evals, agent sandboxing data
wave: W-A
depends_on: []
tdd_mode: optional
estimate: M
status: draft
absorbs_decision: sync v2 / harvest / security posture = direction only; implementation 019+
---

# US4 — W4 Platform

## Execution prompt (Phase 3 input)

**Task**: Produce `evidence/W4.md` + `decision-memo-W4.md` on platform architecture questions (config release, memory, security), Tier A/B where it exists, rigorous pattern analysis where the domain has no benchmarks.
**Context**: Three poneglyph gaps drive this (2026-06-10 review): (1) `~/.claude` symlinks the working tree — every `git checkout` silently deploys to the whole machine (stranded 012-016 branch incident); (2) memories live per-project outside git, no cross-project harvest, no backup, fork across machines; (3) security posture is blanket-allow + post-hoc Stop hook — deny rules bypassable via Bash. Rigor method in `spec.md`. NOTE for this WS: dotfile-manager patterns rarely have Tier A/B "measurements" — for angle (a) the bar is rigorous primary-source pattern analysis (official docs, design rationales), labeled honestly; design decisions then cite the pattern's documented mechanism, not invented numbers.
**Constraints**: ≤4 agents (3 finders + 1 refuter). Finder angles: (a) dev-vs-deployed separation in mature config managers (chezmoi, nix home-manager, GNU stow, dotbot): release/apply model, staleness detection, multi-machine overlays — extract the mechanism each uses for "working copy ≠ deployed copy"; (b) agent/LLM memory architectures WITH published evaluation (Letta/MemGPT papers + benchmarks, Mem0 eval, LangMem, LoCoMo/LongMemEval benchmarks): what measurably improves with memory, harvest/promotion patterns, multi-device sync approaches; (c) agent sandboxing and permission incidents: Claude Code sandbox official docs (current state), container-use/devcontainer patterns, documented incidents or measured risk data for permissive agent modes (prompt-injection → exfiltration cases, CVEs, vendor postmortems). Tier+URL+date; UNVERIFIED explicit; counter-evidence mandatory (e.g., memory systems that did NOT improve outcomes; sandbox overhead complaints).
**Deliverable**: `evidence/W4.md` + `decision-memo-W4.md`: sync v2 direction (recommended mechanism + staleness signal), harvest design direction, 2-3 security posture options with documented trade-offs — each ↔ its evidence/pattern source.
**Verify**: validations.md checklist for W4.
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-A |
| **Depends on** | none |
| **Blocks** | [US6] |
| **Files touched** | `evidence/W4.md`, `decision-memo-W4.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Spawn 3 finders (angles a/b/c); refuter; write artefacts |

## User story

- **As a**: poneglyph maintainer with a live deploy-on-checkout flaw and unprotected memory asset
- **I want**: proven patterns (and real eval data where it exists) for config release, memory, and sandboxing
- **So that**: sync v2, harvest and the security posture are designed once, on solid ground

## Acceptance criteria

- **AC1** (spec AC1): rigor format + counter-evidence + refuter log; angle (a) claims labeled as pattern-analysis (documented mechanism) — never dressed up as measurements.
- **AC2** (spec AC2): both artefacts exist.
- **AC3** (spec AC4): memo gives direction + trade-offs only; zero implementation steps (019+).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `evidence/W4.md` | Patterns + eval data + incident data, counter-evidence, refuter log |
| `decision-memo-W4.md` | sync v2 / harvest / security options ↔ sources |

## Smell signals

- ⚠️ Angle (a) findings cite numbers that don't exist in dotfile-manager docs → fabrication; pattern analysis must quote mechanisms, not invent metrics.

## Verificación post-implementación

- Smoke: both files exist; security section lists ≥2 posture options with trade-offs.
