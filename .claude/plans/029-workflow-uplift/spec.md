---
spec: 029-workflow-uplift
status: closed
closed: 2026-08-18
phase: 1
note: v1 — residual spec written at retro 2026-08-18; Phase 1 was skipped 2026-08-05
---

# Spec — 029-workflow-uplift (residual)

This file did not exist during Phase 1–4. It records the mini-spec from
`tasks/index.md` plus the three decisions the critic marked as legitimate
drift. It is **not** a rewrite of history as if Phase 1 had run.

## Problem

The system was not paying its keep. Measured causes: (a) `/flow` back-half
died — 10/14 lifecycles left open; (b) ad-hoc turns had no discipline;
(c) skills under-used; (d) project layers expensive and divergent;
(e) mechanical friction (verify, git, Jira pastes, model toggles).

## Goal

Strict, checkable default-turn discipline; reliable `/flow` close;
delegation cost control (permission + model); real skill use; cheaper
project layers.

## Out of scope (2026-08-05)

Continuous telemetry · redesign of the front-half pipeline · editing
Binora repos from poneglyph (prepare pieces only).

## Decisions ratified in-session (critic: `spec_drift: legitimate`)

1. Commandments renumber / reword (priority order).
2. `/flow` always FULL; skips justified and recorded (no `--minimal/--full`).
3. Simplicity ladder → skill `dev` (KNOW→LEARN) with compact core in `CLAUDE.md`.
