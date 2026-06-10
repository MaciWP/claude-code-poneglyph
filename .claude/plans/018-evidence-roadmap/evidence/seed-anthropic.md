# Seed dossier — Anthropic first-party evidence on multi-agent orchestration

> **Provenance**: research agent `research-anthropic` (general-purpose, WebSearch+WebFetch), session 2026-06-10. All quotes extracted via WebFetch of live pages; key numbers cross-checked across two independent fetches (exact agreement). Verbatim agent output below; tier labels per 018 rigor method: source 1 = **Tier B** (vendor-measured internal eval), sources 2-4 = **Tier B/D** (vendor guidance, mostly unmeasured).

---

## Source 1 — "How we built our multi-agent research system"
**URL:** https://www.anthropic.com/engineering/built-multi-agent-research-system
**Date:** June 13, 2025. **Authors:** Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, Daniel Ford.
This is Anthropic's ONLY first-party source with a measured multi-agent-vs-single-agent number.

### (a) The headline metric — verified
> "a multi-agent system with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval."

- The 90.2% is a **relative improvement on an internal research eval**, not an accuracy score. The eval consisted of **breadth-first research queries**; the cited example: "identify all the board members of the companies in the Information Technology S&P 500" — "the multi-agent system found the correct answers by decomposing this into tasks for subagents, while the single agent system failed."
- Performance-variance analysis (BrowseComp): "token usage by itself explains 80% of the variance, with the number of tool calls and the model choice as the two other explanatory factors" — three factors together explain ~95% of variance. Implication stated by Anthropic itself: the multi-agent win is largely a **token-spend/capacity effect** ("distributing work across agents with separate context windows"), not architectural magic.
- "Subagents facilitate compression by operating in parallel with their own context windows, exploring different aspects of the question simultaneously before condensing the most important tokens for the lead research agent." / "The essence of search is compression."

### (b) Token cost multipliers — verified
> "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats."

> "For economic viability, multi-agent systems require tasks where the value of the task is high enough to pay for the increased performance."

So multi-agent ≈ **~3.75× the tokens of a single agent**, ~15× chat.

### (c) Works / does NOT work — verified
- WORKS: "multi-agent systems excel at valuable tasks that involve heavy parallelization, information that exceeds single context windows, and interfacing with numerous complex tools." Breadth-first queries "pursuing multiple independent directions simultaneously."
- DOES NOT WORK: "some domains that require all agents to share the same context or involve many dependencies between agents are not a good fit for multi-agent systems today. For instance, most coding tasks involve fewer truly parallelizable tasks than research, and LLM agents are not yet great at coordinating and delegating to other agents in real time."
- This is Anthropic explicitly saying **coding is the canonical counter-example** to their own multi-agent success story.

### (d) Architecture + prompt-engineering lessons — verified
- Orchestrator-worker: "a lead agent coordinates the process while delegating to specialized subagents that operate in parallel."
- The 8 prompt principles (verbatim headings): "Think like your agents" / "Teach the orchestrator how to delegate" / "Scale effort to query complexity" / "Tool design and selection are critical" / "Let agents improve themselves" / "Start wide, then narrow down" / "Guide the thinking process" / "Parallel tool calling transforms speed and performance".
- **Effort-scaling rule (embedded in prompts):** "Simple fact-finding requires just 1 agent with 3-10 tool calls, direct comparisons might need 2-4 subagents with 10-15 calls each, and complex research might use more than 10 subagents."
- **Delegation spec:** "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries." Without this, agents duplicate work or leave gaps.
- **Failure modes without these rules:** "Early agents made errors like spawning 50 subagents for simple queries, scouring the web endlessly for nonexistent sources, and distracting each other with excessive updates."
- **Parallelization numbers:** "The lead agent spins up 3-5 subagents in parallel rather than serially; the subagents use 3+ tools in parallel. These changes cut research time by up to 90% for complex queries." (Note: 90% is wall-clock time reduction from parallel tool calling, NOT a quality number — do not conflate with the 90.2%.)
- Extended thinking "can serve as a controllable scratchpad."
- Eval lessons: judge **end state, not process** ("evaluate whether it achieved the correct final state... agents may find alternative paths to the same goal"); LLM-as-judge "a single LLM call with a single prompt outputting scores from 0.0-1.0 and a pass-fail grade was the most consistent"; start evals small (~20 cases).
- Production: agents are stateful and non-deterministic; durable execution + error handling; "rainbow deployments to avoid disrupting running agents"; synchronous execution is a known bottleneck ("Asynchronous execution would enable additional parallelism... But this asynchronicity adds challenges in result coordination, state consistency, and error propagation").

---

## Source 2 — Claude Code Best Practices (official docs; successor to Boris Cherny's April 2025 engineering post)
**URL:** https://code.claude.com/docs/en/best-practices (the old https://www.anthropic.com/engineering/claude-code-best-practices now 308-redirects here; current page has no byline/date — it's the maintained doc version)

No measured numbers here — all strongly-stated guidance. Key verbatim:

- **Context as THE constraint:** "Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills." / "The context window is the most important resource to manage."
- **Subagents = context isolation, framed as a top tool:** "Since context is your fundamental constraint, subagents are one of the most powerful tools available... Subagents run in separate context windows and report back summaries." Use for investigation/research and verification ("use a subagent to review this code for edge cases").
- **Fresh-context review (verification agents):** "A fresh context improves code review since Claude won't be biased toward code it just wrote." Writer/Reviewer pattern across two sessions is given explicitly; also test-writer vs implementer split.
- **Adversarial review step:** "Before treating a task as done, have a subagent review the diff in a fresh context and report gaps." Rationale: the reviewer "sees only the diff and the criteria you give it, not the reasoning that produced the change, so it evaluates the result on its own terms." Verification subagent framing: "has a fresh model try to refute the result, so the agent doing the work isn't the one grading it."
- **Anti-over-review caveat (important, often missed):** "A reviewer prompted to find gaps will usually report some, even when the work is sound... Chasing every finding leads to over-engineering... Tell the reviewer to flag only gaps that affect correctness or the stated requirements."
- **Verification loop > orchestration:** "Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from."
- **Parallel scaling = sessions, not subagents:** worktrees / desktop sessions / web / agent teams for parallel work; fan-out via `claude -p` loops for embarrassingly-parallel migrations ("Refine your prompt based on what goes wrong with the first 2-3 files, then run on the full set").
- Failure pattern: "The infinite exploration... Fix: Scope investigations narrowly or use subagents so the exploration doesn't consume your main context."

---

## Source 3 — "Building agents with the Claude Agent SDK"
**URL:** https://claude.com/blog/building-agents-with-the-claude-agent-sdk (old anthropic.com/engineering URL 308-redirects here)
**Date:** September 29, 2025. **Author:** Thariq Shihipar.

- **The canonical two-reasons statement:** "Subagents are useful for two main reasons. First, they enable parallelization... Second, they help manage context: subagents use their own isolated context windows, and only send relevant information back to the orchestrator, rather than their full context." / "ideal for tasks that require sifting through large amounts of information where most of it won't be useful."
- **Verification hierarchy:** rules-based best ("The best form of feedback is providing clearly defined rules for an output, then explaining which rules failed and why") > visual feedback > LLM-as-judge, which Anthropic explicitly downgrades: "This is generally **not a very robust method**, and can have heavy latency tradeoffs, but for applications where any boost in performance is worth the cost, it can be helpful."
- No quantified metrics in this post.

---

## Source 4 — "Effective context engineering for AI agents"
**URL:** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
**Date:** September 29, 2025. **Authors:** Prithvi Rajasekaran, Ethan Dixon, Carly Ryan, Jeremy Hadfield et al.

- **Compression ratio of subagents:** "Each subagent might explore extensively, using tens of thousands of tokens or more, but returns only a condensed, distilled summary of its work (often **1,000-2,000 tokens**)."
- "clear separation of concerns—the detailed search context remains isolated within sub-agents, while the lead agent focuses on synthesizing."
- **Technique-selection rule:** "Compaction maintains conversational flow for tasks requiring extensive back-and-forth; Note-taking excels for iterative development with clear milestones; Multi-agent architectures handle complex research and analysis where parallel exploration pays dividends." I.e., multi-agent is the LAST of three long-horizon techniques, reserved for parallel exploration — not the default.

---

## Transferable design lessons (ranked by evidence strength)

1. **Gate fan-out on parallelizability, not size.** Anthropic's own 90.2% win is confined to breadth-first, read-heavy, independent-subtask work; they state coding mostly is not that. A "≥N independent units" spawn threshold matches their evidence; "big task → delegate" does not.
2. **Budget tokens, since tokens ARE the mechanism.** 80% of performance variance = token spend; multi-agent ≈ 15× chat / ~4× single-agent. Fan out only when the task's value covers ~4× cost — and note a single agent given more turns/tools captures much of the same variance.
3. **Encode explicit effort-scaling heuristics in the orchestrator prompt** (1 agent + 3-10 calls for simple; 2-4 subagents × 10-15 calls for comparisons; 10+ only for genuinely complex), plus a full delegation spec per subagent (objective, output format, tool guidance, boundaries). This is what fixed "50 subagents for a simple query."
4. **Fresh-context reviewer subagents are endorsed guidance** (refuter framing: "the agent doing the work isn't the one grading it") — but unmeasured, and Anthropic warns reviewers manufacture findings; constrain them to correctness/requirements gaps only. Prefer deterministic checks (tests, builds, rules) over LLM-as-judge, which Anthropic itself calls "not a very robust method."
5. **Subagents earn their cost as context compressors:** tens of thousands of exploration tokens in, 1,000-2,000 summary tokens back. Read-heavy investigation in subagents, synthesis and edits in the lead — and multi-agent is the third-choice long-horizon technique after compaction and note-taking.

## Verdict

Anthropic's first-party evidence supports exactly one measured claim for multi-agent orchestration: a 90.2% relative improvement over single-agent Opus 4 on an internal breadth-first research eval, achieved by an orchestrator-worker design whose advantage Anthropic itself attributes mostly to spending more tokens across separate context windows (token use alone explains 80% of variance) at ~15× chat cost — and they explicitly exclude coding and any coupled/shared-context work as "not a good fit for multi-agent systems today." Everything else — subagents for context isolation, fresh-context reviewer agents, writer/reviewer splits — is published as strongly-stated but unmeasured guidance, with explicit caveats that reviewers over-report and LLM-as-judge is fragile next to deterministic checks. For a personal Claude Code orchestration system this evidence supports: inline-by-default for coding, fan-out reserved for genuinely independent read-heavy units, hard effort-scaling rules in the orchestrator prompt, subagents as context compressors for investigation, and verification anchored in runnable checks with a constrained fresh-context reviewer as a second layer. It does NOT support multi-agent parallelism as a general quality multiplier for implementation work — Anthropic's own flagship coding product scales by parallel *sessions* (worktrees, fan-out scripts, agent teams), not by decomposing one coding task across subagents.
