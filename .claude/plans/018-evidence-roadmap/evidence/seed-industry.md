# Seed dossier — Industry evidence: parallel / background AI coding agents

> **Provenance**: research agent `research-industry` (general-purpose, WebSearch+WebFetch), session 2026-06-10. Claim types explicitly distinguished (measured / vendor / anecdote). Verbatim agent output below; per 018 rigor method: METR RCT and the Copilot-issues paper = **Tier A**; OpenAI/Cognition/Google internal numbers = **Tier B** `[vendor]`; practitioner posts = **Tier C/D**, as labeled inline.

---

## 1. Cognition — "Don't Build Multi-Agents" (Walden Yan, June 12, 2025)

**URL:** https://cognition.ai/blog/dont-build-multi-agents
**Claim type:** practitioner essay (engineering experience at Cognition/Devin; no quantitative data)

- **Principle 1:** "Share context, and share full agent traces, not just individual messages." Subagents that only see the task description, not each other's actions, misinterpret subtly.
- **Principle 2:** "Actions carry implicit decisions, and conflicting decisions carry bad results." Flappy Bird example: one subagent built a Mario-style background, the other a mismatched bird — "the actions subagent 1 took and the actions subagent 2 took were based on conflicting assumptions," so combined output was incoherent.
- **Key implication:** parallel subagents on a *shared writing task* are unreliable as of 2025; dispatching parallel subagents leads to fragile systems.
- **Recommended architecture:** single-threaded linear agent (every action sees everything). For tasks that outrun the context window: a dedicated compressor model "to compress a history of actions & conversation into key details, events, and decisions." Note this argues against *parallel subagents inside one task*, not against parallel *independent* sessions on *independent* tasks.

## 2. Background full-session products

### OpenAI Codex cloud agent (launched May 16, 2025)
- **Launch + parallel model:** cloud agent runs many tasks in parallel, each in an isolated sandbox, opening PRs. https://openai.com/index/introducing-codex/ (vendor)
- **Measured-internal (vendor-published, no methodology):** "OpenAI engineers merge 70% more pull requests each week" after adopting Codex; nearly all OpenAI engineers use it (up from just over half in July 2025). Source: GA announcement Oct 6, 2025 — https://openai.com/index/codex-now-generally-available/ ; analysis of the claim: https://geneo.app/blog/openai-codex-productivity-2025/
- **Measured-internal (vendor-published):** "Harness engineering" post — ~1,500 PRs opened and merged by a 3-engineer team over 5 months (~3.5 PRs/engineer/day), throughput maintained as the team grew to 7. https://openai.com/index/harness-engineering/ (page 403s to scrapers; numbers corroborated by search snippets and https://devops.com/openai-codex-transforming-software-development-with-ai-agents-2/)
- **Independent measured (public GitHub tracking):** ai-pr-watcher repo (https://github.com/aavetis/ai-pr-watcher) tracked 352K+ Codex PRs merged in 35 days (as of June 20, 2025) with **85.5% merge rate** vs Cursor ~74%, Devin ~61%, Copilot ~54%. Caveat: selection-biased sample (public repos, user-initiated PRs). Via https://www.rohan-paul.com/p/openais-ai-coding-agent-codex-merged
- **Independent contrast:** 3 enterprise RCTs (4,867 devs) found only ~26% more PRs/week from AI assistants — OpenAI's 70% is an internal outlier, not an industry average. Via https://geneo.app/blog/openai-codex-productivity-2025/

### Cursor background agents (May 2025; parallel agents in Cursor 2.0, Oct 2025)
- **Mechanism (vendor/third-party docs):** isolated Ubuntu cloud VMs, one branch per task (`agent/<slug>`), agent pushes a PR; local parallel agents use git worktrees; **ceiling of 8 parallel agents**. https://www.morphllm.com/cursor-background-agents , https://stevekinney.com/courses/ai-development/cursor-background-agents
- **Outcome claims:** "2-3x faster developer" — third-party blog claim, no measurement. https://www.morphllm.com/cursor-background-agents (treat as anecdote/marketing)

### GitHub Copilot coding agent (announced May 19, 2025; GA Sept 2025)
- **Mechanism:** assign a GitHub issue to Copilot → sandboxed Actions run → draft PR with tests, async/background by design. https://docs.github.com/copilot/concepts/agents/coding-agent/about-coding-agent ; GA: https://github.com/orgs/community/discussions/159068
- **Measured (academic):** "What Makes a GitHub Issue Ready for Copilot?" (arXiv 2512.21426) — issues that are well-scoped, self-contained, unambiguous, with implementation guidance get significantly **higher merge rates**; issues needing external context (config, environment, external APIs) get **lower** merge rates; random-forest prediction of merge outcome: median AUC 72%, precision 69.1%, recall 77.4%. https://arxiv.org/html/2512.21426v1

### Devin (Cognition)
- **Vendor claims:** "Devin's 2025 Performance Review" (Nov 14, 2025) — hundreds of thousands of PRs merged; **67% PR merge rate, up from 34% the year before**; customers deploy "a fleet of Devins" in parallel; reported failure pattern: ambiguous requirements, mid-task scope changes, iterative collaboration. https://cognition.ai/blog/devin-annual-performance-review-2025
- **Vendor case study (customer co-published):** Nubank ETL migration — multiple parallel Devin instances on ~100K data-class migrations; claimed **8-12x engineering-hour efficiency, >20x cost savings**, weeks instead of 18 months; fine-tuning on prior manual migrations cut per-subtask time 40min→10min. https://devin.ai/customers/nubank/ and Nubank's own write-up https://building.nubank.com/enhancing-engineering-workflows-with-ai-a-real-world-experience/ — note the wins came on a *narrow, homogeneous, well-specified* task class.
- **Independent anecdote (negative):** Answer.AI "Thoughts On A Month With Devin" (Jan 8, 2025): 20 varied tasks → **3 successes, 14 failures, 3 inconclusive (15% success)**, and no discernible pattern predicting which tasks would succeed. https://www.answer.ai/posts/2025-01-08-devin

### Google Jules (beta May 20, 2025; GA Aug 6, 2025)
- **Mechanism:** fully async — assign a GitHub issue, Jules clones the repo into a Google Cloud VM, works in the background, opens a PR. https://blog.google/technology/google-labs/jules-now-available/
- **Vendor numbers at GA:** thousands of developers, tens of thousands of tasks, **140,000+ publicly shared code contributions** during beta (volume, not quality/acceptance). Same URL; coverage: https://techcrunch.com/2025/08/06/googles-ai-coding-agent-jules-is-now-out-of-beta/

## 3. Practitioner reports: parallel Claude Code sessions (worktrees)

### Anthropic official best practices (code.claude.com)
- **URL:** https://code.claude.com/docs/en/best-practices (redirect from anthropic.com/engineering/claude-code-best-practices)
- **Claim type:** vendor guidance based on internal-team experience.
- Explicitly recommends parallel sessions: worktrees (isolated git checkouts so edits don't collide), desktop-app parallel sessions, cloud sessions, agent teams. Recommends the **Writer/Reviewer pattern** ("a fresh context improves code review since Claude won't be biased toward code it just wrote") and fan-out via `claude -p` loops for migrations.
- **Caveats it states:** context degradation is the root constraint; adversarial reviewers over-report ("a reviewer prompted to find gaps will usually report some, even when the work is sound" → over-engineering risk); verification gates ("if you can't verify it, don't ship it"); unattended runs need a runnable check or the human becomes the verification loop.

### incident.io — "How we're shipping faster with Claude Code and Git Worktrees" (Rory Bain, June 27, 2025)
- **URL:** https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees
- **Claim type:** anecdote (company blog, no controlled measurement).
- Engineers run **4-5 Claude agents in parallel**, author juggling ~7 conversations; custom `w` shell function for instant worktree+session spawn. Claimed wins: UI feature in 10 min vs 2h estimate; 18% build-process speedup. Stated limit: "we can't rely on Claude for any larger architectural decisions." Reports essentially no overhead — typical of enthusiasm-phase posts; treat the absence of downsides as a red flag, not evidence.

### Boden Fuller — "What Running 8 Parallel AI Agents Taught Me" (Jan 12, 2026)
- **URL:** https://www.bodenfuller.com/writing/vibe-coding-devlog-1
- **Claim type:** anecdote with concrete failure data.
- Coordinator-mediated architectures **"break at 3 agents"** (coordinator context fills up); isolation-first architecture (own terminal, own code copy, results to git + shared issue tracker) scales to 8. Failure modes: agents retry the identical fix "seventeen times with minor variations"; quality ceiling ~"85% correct" needing validation gates. His "40% Rule": keep context utilization under 40% to avoid cascading failures.

### Steve Yegge — Gas Town (Jan 2026) + Pragmatic Engineer interview
- **URLs:** https://newsletter.pragmaticengineer.com/p/from-ides-to-ai-agents-with-steve , https://cloudnativenow.com/features/gas-town-what-kubernetes-for-ai-coding-agents-actually-looks-like/ , https://ascii.co.uk/news/article/news-20260102-190a5f9f/steve-yegge-releases-gas-town-multi-agent-orchestrator-for-c
- **Claim type:** anecdote / extreme-power-user.
- Orchestrates **20-30 Claude Code instances** on one codebase via Gas Town ("Kubernetes for AI coding agents") + Beads (agent-native issue tracker). Thesis: models are good enough; the gap is orchestration layers. No quality/throughput measurements published; Gas Town itself "100% vibe coded" at 20 days old — frontier experiment, not validated practice.

### Aggregated community guidance
- Worktree guides converge on **4-8 concurrent worktrees per developer as the reliable ceiling, above which "you're usually bottlenecked on review, not on Claude"**: https://claudefa.st/blog/guide/development/worktree-guide , https://www.codewithseb.com/blog/parallel-claude-code-sessions-git-worktrees-guide (claims a 2-session work+review setup "doubles throughput immediately"), https://www.dandoescode.com/blog/parallel-vibe-coding-with-git-worktrees . Claim type: anecdote/blog consensus, no measurements.

### Counter-evidence (measured, RCT)
- **METR (July 10, 2025):** RCT, 16 experienced OSS maintainers, 246 tasks on repos they know (~5 yrs experience). AI-allowed tasks took **19% LONGER**; developers *believed* they were 20-24% faster. https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ , paper: https://arxiv.org/abs/2507.09089 — directly relevant: self-reported throughput gains from parallel-agent setups are systematically overestimated; conditions (expert dev, mature familiar codebase, high quality bar) mirror a solo dev's own repos.

## 4. AI code review / verification bots

- **Greptile benchmark (VENDOR-RUN — Greptile evaluated itself):** July 2025, 50 real bugs from 5 OSS repos (Python/TS/Go/Java/Ruby), bug "caught" = explicit line-level comment + impact explanation. Catch rates: **Greptile 82%, Cursor Bugbot 58%, Copilot 54%, CodeRabbit 44%, Graphite Diamond 6%.** https://www.greptile.com/benchmarks
- **Precision trade-off (third-party comparison, still derived largely from vendor benchmarks):** Greptile ~11 false positives per run vs CodeRabbit ~2 — higher catch rate buys noise. https://dev.to/rahulxsingh/coderabbit-vs-greptile-which-ai-reviewer-catches-more-bugs-4n9k , https://dev.to/jovan_chan_9500711396d4e6/greptile-review-2026-82-bug-catch-rate-the-1review-trap-and-who-should-pay-30month-4jao
- **No independent, peer-reviewed defect-catch-rate data found** for these tools; all headline numbers trace back to vendor benchmarks. The directional finding that survives skepticism: AI reviewers catch a meaningful but partial share of real bugs (~44-82% on curated sets) at a real false-positive cost — useful as an *additional* gate, not a replacement reviewer. OpenAI also reports (vendor) that Codex "automatically reviews almost every PR" internally as a quality gate: https://openai.com/index/codex-now-generally-available/

---

## Verdict

1. **(a) Background parallel full sessions are validated industry practice for *independent, well-scoped* tasks**: every major vendor converged on the same shape in mid-2025 (isolated VM/worktree per task → PR), and the strongest numbers — OpenAI's internal 70% more PRs/week (vendor-measured) and Nubank's 8-12x on homogeneous migrations (vendor case study) — all come from *narrow, verifiable, independent* task streams, not from agents collaborating on one feature.
2. **The practitioner ceiling for a solo developer is 2-8 concurrent sessions** (incident.io 4-5, Fuller 8, community guides 4-8); beyond that the bottleneck is human review and verification capacity, not agent capacity — and METR's RCT (19% slower while feeling 20% faster) warns that self-perceived gains on familiar codebases can be entirely illusory without measurement.
3. **(b) Multi-agent fails predictably when**: parallel workers share one writing task without shared full context (Cognition: conflicting implicit decisions); the task is ambiguous, under-scoped, or needs external context (Copilot merge-rate study, Devin's own failure patterns, Answer.AI's 15% success on varied tasks); or a coordinator mediates all context (breaks at ~3 agents per Fuller).
4. **What makes parallelism work**: full isolation (worktree/VM + own branch), independent verifiable tasks with runnable checks, fresh-context review (Writer/Reviewer), and merge-by-PR — i.e., parallel *sessions*, not parallel *subagents within one task*.
5. **Evidence quality caveat**: the only RCT in the set (METR) is negative; everything positive is vendor-internal, vendor case study, or anecdote — adopt the pattern for independent task streams with hard verification gates, and measure your own merge/rework rates rather than trusting felt speed.
