# Research Rigor Method (promoted from feature 018, ratified 2026-06-10)

Reusable method for any evidence/research feature (and `/deep-research` runs). Proved across 5 dossiers + a 2-round adversarial audit in 018-evidence-roadmap.

## Evidence tiers

| Tier | Definition |
|---|---|
| **A** | Peer-reviewed / RCT / benchmark with public methodology |
| **B** | Vendor-measured internal data, labeled `[vendor]` |
| **C** | Practitioner report with concrete numbers |
| **D** | Opinion / anecdote without numbers |
| **T1** | Primary-source local file read (configs, installed code) |

## Rules

1. **Decision rule**: a design change requires ≥1 A/B (or T1) source with no known A/B contradiction. C/D never ground decisions — inspiration/color only, labeled.
2. **Quote-anchored numbers** (P1, the 018 lesson): every numeric claim sourced from an external document carries a verbatim quote anchor — or an explicit `[Probable]` / `UNVERIFIED` marker. *Precision inflation* (exact numerals attached to sources that support only the qualitative claim) was the ONLY failure class the 018 audit found; this rule is its antidote. Applies to finder prompts, refuter prompts, and the critic checklist for research artefacts.
3. **Adversarial refuter pass**: every decision-changing claim goes through a second agent instructed to REFUTE it against the primary source. Not optional — the 018 refuters caught material errors in every single round (wrong issue numbers, stale counts, misattributed metrics, one fully refuted clause).
4. **Counter-evidence mandate**: each workstream actively searches for negative results. Research without counter-evidence is marketing.
5. **Claim format**: assertion + tier + URL + date (+ model-era flag where benchmarks are involved). `UNVERIFIED` explicit when confirmation failed.
6. **Critic independence**: the Phase 4 sampler audits claims NOT covered by build-time refuters — overlap destroys independence and hides corpus-level failure classes.
7. **Contradiction check** (P4, wired via orchestrator-protocol — roadmap 020.2): when ≥2 parallel agents cite the same source or fact, diff their claims before writing artefacts.
8. **Seeds discipline**: prior verified findings are ground truth with explicit "extend, don't repeat" exclusion lists in finder prompts.

## Delegation template per research agent (Commandment VIII)

Objective · numbered tasks · constraints (tiers, quote-anchors, UNVERIFIED, counter-evidence, exclusion list, tool-call cap) · deliverable format. Agent's final message = raw data for the orchestrator, never prose for the human.

## Provenance

Feature 018-evidence-roadmap (5 workstreams, 21 agents, verdict APPROVED_WITH_WARNINGS). Detail archived under `.claude/plans/_archive/018-evidence-roadmap/{spec,review,retro}.md` (historical — read only for provenance).
