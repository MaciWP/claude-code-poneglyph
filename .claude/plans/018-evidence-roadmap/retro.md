# Retro — 018-evidence-roadmap (Phase 5)

---
date: 2026-06-10
review_verdict: APPROVED_WITH_WARNINGS
retro_status: approved (2026-06-10 — roadmap APPROVE; P1-P4 all ratified: P1→docs/research-rigor.md + critic SIEMPRE rule; P2→docs/research-rigor.md; P3→memory feedback-refuter-not-optional; P4→deferred into roadmap 020.2 by design; living-spec delta applied)
---

## What worked

1. **The find→refute engine caught real errors EVERY round** — never zero: wrong issue number (#532→#556), stale star counts (9.7k→15.9k), misattributed metrics (Inference vs Security team), miscited numbers (GEPA 6% not 10%), one refuted clause (MemGPT "94.4%"), one false 404 arbitrated. Adversarial verification is not ceremony; it is where the rigor actually lives.
2. **Seeds-as-ground prevented re-derivation** — explicit "extend, don't repeat" exclusion lists in every finder prompt worked; no dossier re-derived seed content.
3. **Timebox held** (W5: 1 fan-out + 1 verify, 4 agents) — unbounded-discovery risk neutralized by design, not discipline.
4. **US6 inline synthesis with zero agents** — full cross-memo context produced a traceable roadmap (35 evidence refs) in one pass; the share-context absorbed decision validated itself.
5. **0 AskUserQuestion across all 7 HUs** — the Phase 2 execution prompts were complete enough to run without improvisation (Commandment VIII).
6. **Critic independence design** — sampling claims NOT covered by build-time refuters found a genuinely new failure class (precision inflation) that refuters structurally couldn't see (they verified listed claims; the sampler audited the corpus).

## What didn't / friction

1. **Precision inflation** is the systemic failure class of agent research: finders attach exact numerals to sources that only support the qualitative claim (4 critic findings; 1 MAJOR). Mitigation exists (quote-anchoring) but wasn't in the finder prompt template.
2. **Cross-agent contradiction caught by luck**: the false "sandbox 404" surfaced only because another workstream had fetched the same page the same day. No systematic contradiction check exists between parallel finders.
3. **Token cost**: ~21 agents, ~1.5M subagent tokens total `[Probable — sum of reported usages]`. Bounded by caps and justified by deliverable density, but a per-feature budget note would make the trade explicit upfront.
4. AC5's literal wording drifted (3→4 seeds) — additive and recorded, but the spec text wasn't updated at REFINE time.

## Promotions proposed (human ratification required — nothing written yet)

| # | Promotion | Scope | Rationale |
|---|---|---|---|
| P1 | **Quote-anchored numbers rule**: any numeric claim sourced from an external document must carry a verbatim quote anchor or an explicit `[Probable]`/UNVERIFIED marker — wire into finder/refuter prompt templates and the critic checklist | global (rigor method) | The only failure class 018 produced; cheap to enforce at generation |
| P2 | **018 rigor method as reusable reference** (tiers A-D + decision rule + refuter pass + counter-evidence mandate + claim format) — extract from spec into a reference doc consumable by future research features and `/deep-research` | global `~/.claude/docs/` or deep-research reference | Proved itself across 5 dossiers + survived a 2-round audit |
| P3 | **Memory note**: "finder numbers rot fast (stars, issue refs, team attributions) — the refuter pass is not optional, and critic sampling must avoid refuter-covered claims to stay independent" | memory-only | Operational lesson, not a rule |
| P4 | **Contradiction check**: when ≥2 parallel agents cite the same source/fact, diff their claims before writing artefacts | global (orchestrator-protocol §validate — fold into roadmap 020.2 rather than a separate write) | The 404 incident; zero extra agents, one inline check |

## Living-spec delta proposed (diff for approval)

```diff
- **AC5 (seeds)**: Given the 3 conversation-only dossiers (2026-06-10), when US0 closes, then `evidence/seed-{anthropic,academic,industry}.md` exist verbatim with provenance headers.
+ **AC5 (seeds)**: Given the 3 conversation-only dossiers (2026-06-10) plus the graphify scout (added at gate-2→3 REFINE), when US0 closes, then `evidence/seed-{anthropic,academic,industry,graphify}.md` exist verbatim with provenance headers.
```

## Commandments audit

| # | Compliance |
|---|---|
| I | Gates 1→2, 2→3 (with REFINE round), roadmap ratification — all human; user redirections (graphify, "algo nuevo") absorbed at gates, not deflected |
| II | The feature's entire purpose; 36+12 claims verified against primaries; fabricated stats self-caught and discarded |
| III | Research-light ceremony honored; W5 timeboxed; US6 zero agents; candidates table capped |
| IV | NEEDS_CHANGES actually fired and blocked (critic round 1) — the gate gated |
| V | Seeds + spec evidence base consumed before any fan-out |
| VII | 5 workstreams parallelized internally; 83% DAG parallel efficiency; finders ran 3-4 wide |
| VIII | Full delegation specs per agent (objective/tasks/constraints/deliverable); 0 improvised questions |
| IX | This feature IS the reactive measurement instrument; roadmap entries carry their evidence |
| X | state.json/frontmatter coherent at every closure; truth-fixes applied when found (US5 inventory) |

## Closure checklist (pending ratification)

- [x] Roadmap 019+ ratified (APPROVE, 2026-06-10)
- [x] Promotions P1-P4 ratified (all four; P4 deferred into 020.2 by design)
- [x] Living-spec delta applied (spec.md AC5 v2)
- [x] spec.md + tasks/index.md → `status: closed`
- [ ] **OPEN until merge**: deliverables on MAIN + synced (the 012 lesson — current branch is `017-personal-optimization`; this checkbox closes at the 017/018 merge, and 021.2 makes it a permanent gate)
