# Decision memo W4 — Platform: sync v2, memory harvest, security posture

> Direction + trade-offs only — implementation 019+ (US4 AC3). Every direction cites its evidence/pattern source from `evidence/W4.md`; angle-(a) sources are documented mechanisms (pattern[doc]), honestly labeled.

## D1 — sync v2: copy-on-explicit-apply from a committed ref

| Constraint | Value | Source |
|---|---|---|
| Mechanism | `sync-claude` copies (not symlinks) from a **committed ref** (origin/main HEAD or tag) into `~/.claude/` — the chezmoi model replicated in the existing tool; repo working tree never deploys by side-effect | pattern[doc]: chezmoi source→target→apply; counter-pattern: stow/bare-repo reproduce the checkout-deploys flaw |
| Per-machine variance | Keep `settings.machine.json` overlay — it already matches chezmoi's config-vars pattern | pattern[doc]: chezmoi machine-to-machine guide |
| Dev escape hatch | Explicit `--dev` mode (apply-from-worktree on demand) for sessions working ON poneglyph — instant feedback is a real, admitted advantage; opt-in, never default | pattern[doc]: chezmoi FAQ symlink-advantage admission + `--watch` mitigation |
| Staleness signal | Stamp file (`~/.claude/.sync-version` = SHA + date) written at apply; statusline/session-start compares vs origin/main → "config N commits behind" | modeled on `chezmoi status` col 2; no off-the-shelf pattern exists (UNVERIFIED) — small custom build |
| Why not chezmoi/home-manager wholesale | chezmoi adds a parallel tool for one directory; home-manager = no native Windows + disproportionate toolchain | pattern[doc] + Commandment III |
| Closes | Gap #1 of the 2026-06-10 review (deploy-on-checkout; the 012-016 stranded-branch incident) + gap #8 (staleness) | — |

## D2 — Memory: keep files, harvest selectively, curate on schedule, pilot vault sync

| Constraint | Value | Source |
|---|---|---|
| Architecture | Keep Claude Code's native markdown memory — do NOT adopt Mem0/Zep/Letta | A/B: full-context 72.90 > all systems (Mem0's own Table 2); B: files 74.0 > graph 68.5; benchmark-war noise |
| Harvest (cross-project) | Periodic `harvest` pass over `~/.claude/projects/*/memory`: promote a SMALL, curated set of procedural lessons (rules/skills), human-ratified — extends the existing retro→promotion loop to non-poneglyph projects | A: selective 38.86% vs add-all 13.04% (arXiv 2505.16067); A: AWM/Voyager = the only evidenced transfer patterns; matches gap #5 of the review |
| Curation | Scheduled pruning of MEMORY.md dirs; keep index ≤200 lines/25KB (the load cap); treat stale/wrong entries as active hazards, not clutter | A: memory poisoning persists (2512.16962, 2601.05504); A: experience-following; docs: load cap |
| Cross-machine sync | Pilot: `autoMemoryDirectory` → git-synced vault repo (official lever) OR per-machine namespaced backup first (no merge semantics). All sync patterns are Tier C/unevaluated — pilot with backup-only before bidirectional | A: docs (machine-local, `autoMemoryDirectory`); C: vault/daemon/agentsync patterns |
| Closes | Gap #5 (cross-project loop) + gap #7 (memory backup/fork) | — |

## D3 — Security posture: three coherent options (user decision, 019+)

| Posture | What it buys | What it accepts | Evidence |
|---|---|---|---|
| **P1 Trust+backup (declarado)** | Zero friction; matches "personal machine, no enterprise theater" | Credential exfil under injection (default read includes `~/.ssh`, `~/.aws`); string deny-rules stay decorative | incident data: realized threat is supply-chain/untrusted-content, no in-the-wild solo-dev injection case found |
| **P2 Sandbox-lite (evidence's pick, macOS)** | OS-level enforcement of the exact class that broke (CVE-2025-54794 = path-rule bypass); `denyRead` on creds; **84% fewer prompts** `[vendor]` — less friction, not more; env scrub | watchman/docker/Go-CLI exclusions; partial exfil guarantees (no TLS inspection — documented); **Windows machine stays P1** (no native sandbox) | A: sandboxing docs; B: 84% internal figure |
| **P3 Container for untrusted** | The only mode official docs endorse for `--dangerously-skip-permissions` / unknown repos | Docker + per-project setup friction | A: docs; A: CVE-2025-59536 (open-untrusted-repo class) |

**Posture-independent hygiene (adopt regardless)**: no marketplace skills (ClawHavoc: ~20% of a registry malicious), pin MCP versions + review updates (postmark-mcp: clean-then-backdoored), never open untrusted repos in auto mode, keep CC updated (two RCE classes patched in 2025-26). Closes gap #3 of the review by DECISION rather than by theater: pick P1/P2/P3 explicitly and delete the deny-rules that the chosen posture makes decorative.

## D4 — What the evidence does NOT support

- Adopting a memory product (every vendor number is benchmark-war noise; full-context/files win).
- Full-time containerization for a solo trusted machine (friction > realized risk).
- Treating permission prompts as a real control (approval fatigue is the documented failure mode; both Cursor CVEs exploited approve-once patterns).
- A published, evaluated multi-machine memory-sync solution — none exists; anything we build is a pilot.

## Tensions for US6

- D1's apply-step friction vs poneglyph-dev workflow: the `--dev` escape hatch is load-bearing; without it the forget-to-apply loop (documented chezmoi friction) lands on the most-edited repo.
- D3: P2 is macOS-only — accepting a posture asymmetry between machines, or P1 everywhere with hygiene as the real control. User call.
- D2's harvest adds a recurring manual ceremony — sized small (selective, ratified) precisely because the add-all alternative is the measured disaster.
