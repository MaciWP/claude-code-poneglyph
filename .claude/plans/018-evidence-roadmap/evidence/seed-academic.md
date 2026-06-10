# Seed dossier — Academic/benchmark evidence: parallel sampling+selection (A) vs judge/review panels (B)

> **Provenance**: research agent `research-academic` (general-purpose, WebSearch+WebFetch), session 2026-06-10. Verified against primary sources (arXiv abstracts/HTML, AlphaCode 2 PDF, vendor blogs). Verbatim agent output below; per 018 rigor method most entries are **Tier A** (peer-reviewed/benchmark), items 6 are **Tier B** (vendor-measured), as labeled.

---

## 1. Self-Consistency (Wang et al., 2022/23) — pattern A
| Field | Data |
|---|---|
| Pattern | Parallel sampling (temperature) + majority vote on final answer |
| Benchmarks / effect | GSM8K **+17.9pp** (PaLM-540B: 56.5%→74.4%; GPT-3 code-davinci-002: 60.1%→78.0%), SVAMP +11.0pp, AQuA +12.2pp, StrategyQA +6.4pp, ARC-challenge +3.9pp |
| Conditions | 40 sampled reasoning paths (main config); models PaLM-540B, GPT-3 175B, LaMDA-137B, UL2-20B. Gains saturate quickly — authors say 5-10 paths capture most of the gain. Requires an extractable, votable final answer |
| URL | https://arxiv.org/abs/2203.11171 |

## 2. More Agents Is All You Need (Li et al., 2024) — pattern A
| Field | Data |
|---|---|
| Pattern | Sampling-and-voting ("Agent Forest"), N parallel samples + majority vote |
| Effect | GSM8K: Llama2-13B 35%→59% (+24pp), Llama2-70B 54%→74% (+20pp), GPT-3.5 73%→85% (+12pp). MATH: +6 to +10pp. HumanEval: +4 to +9pp. Llama2-13B @ ensemble 15 ≈ Llama2-70B single; GPT-3.5 @ ensemble 20 approaches GPT-4 single (88%) |
| Conditions | Gain correlates with task difficulty (bigger relative gains on MATH than GSM8K); needs votable answers; benchmarks are closed-form tasks, not agentic coding |
| URL | https://arxiv.org/abs/2402.05120 |

## 3. AlphaCode (Science 2022) + AlphaCode 2 (2023) — pattern A at extreme scale
| Field | Data |
|---|---|
| Pattern | Massive parallel sampling + filter on public tests + behavioral clustering + (AC2) learned scoring model; max 10 submissions |
| AlphaCode 1 | Codeforces avg **top 54.3%** in contests >5,000 participants. Millions of samples/problem; **<1%** pass example tests. Solve rate scales **log-linearly** with samples AND training compute. CodeContests 10@k: 1k samples=16.4%, 10k=25.4%, 100k=29.6% |
| AlphaCode 2 | **43%** of problems solved within 10 attempts vs 25% AC1 (1.7×); estimated **85th percentile** (between Expert and Candidate Master). Up to **1M samples/problem** (Gemini Pro family, randomized temperature, C++ only); filtering removes ~**95%**; ~50k candidates remain → 10 largest behavior-clusters → fine-tuned scoring model picks best per cluster. (Verified directly from tech-report PDF text) |
| Caveat | The entire pipeline depends on **executable public tests as a free verifier**; clustering needs a test-input generator model |
| URLs | https://arxiv.org/abs/2203.07814 ; https://storage.googleapis.com/deepmind-media/AlphaCode2/AlphaCode2_Tech_Report.pdf |

## 4. Large Language Monkeys (Brown et al., 2024) — pattern A + the verifier-gap caveat
| Field | Data |
|---|---|
| Pattern | Repeated sampling; coverage (pass@any) vs what a selector can actually recover |
| Effect | SWE-bench Lite: DeepSeek-Coder-V2-Instruct **15.9% (1 sample) → 56% (250 samples)**, beating then-SOTA single-attempt 43%. Coverage scales log-linearly over 4 orders of magnitude (exponentiated power law) |
| Verifier gap | Llama-3-8B-Instruct on MATH: coverage 82.9% (100 samples) → **98.44%** (10k samples), but majority voting / reward-model selection moves only **40.50% → 41.41%** — a ~57pp gap. "Majority voting and reward models plateau beyond several hundred samples" |
| Conditions | SWE-bench gain exists because unit tests act as automatic verifier. Without one, almost all the coverage gain is unrealizable |
| URL | https://arxiv.org/abs/2407.21787 |

## 5. PoLL — Replacing Judges with Juries (Verga et al., Cohere 2024) — pattern B
| Field | Data |
|---|---|
| Pattern | Panel of 3 small judges from disjoint families (Command R, Claude-3 Haiku, GPT-3.5) vs single GPT-4 judge |
| Effect | Cohen's κ vs human: NaturalQuestions **0.763 vs 0.627** (GPT-4), TriviaQA 0.906 vs 0.841, HotpotQA 0.867 vs 0.830. Chatbot Arena rank corr: Pearson 0.917 vs 0.817. Cost: **7-8× cheaper** than GPT-4 judge ($1.25/$4.25 vs $10/$30 per Mtok) |
| Conditions | Judging short QA correctness / chat preference — NOT code-review or bug-finding; max-vote (QA) or mean-pool (Arena); main win is de-biasing (less intra-model bias) + cost, not deep insight |
| URL | https://arxiv.org/abs/2404.18796 |

## 6. SWE-bench leaderboard: parallel attempts + critic/reranking — pattern A+B hybrid
| Field | Data |
|---|---|
| OpenHands critic | **60.6% (1 rollout) → 66.4% (5 attempts)** on SWE-bench Verified, "log-linear" in attempts; selection = trained 32B critic model (openhands-critic-32b-exp-20250417) + filtering patches that fail regression/reproduction tests. https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model ; https://huggingface.co/OpenHands/openhands-critic-32b-exp-20250417 |
| Augment Code | **65.4%** SWE-bench Verified; ensembler = o1 majority-vote over candidate diffs; ensembling worth **+3-8pp**; o1 better ensembler than Sonnet 3.7 "by a couple percent". Explicit caveat: ensembling **abandoned for product use — "too expensive to use in real-world settings"**; a separate "fix regressions" agent hurt (introduced bugs into correct candidates). https://www.augmentcode.com/blog/1-open-source-agent-on-swe-bench-verified-by-combining-claude-3-7-and-o1 |
| DEI (Salesforce, 2024) | Re-ranking committee over multiple diverse agents' patches: open-source agent group **27.3% (best individual) → 34.3%** (+25% rel.) on SWE-bench Lite; best group reached **55%** (then #1). https://arxiv.org/abs/2408.07060 |

## 7. Counter-evidence — limits of debate/multi-agent collaboration
| Paper | Finding |
|---|---|
| **Why Do Multi-Agent LLM Systems Fail? (MAST, 2025)** https://arxiv.org/abs/2503.13657 | **41%–86.7% failure rates across 7 SOTA open-source MAS frameworks**; 1600+ annotated traces; "performance gains on popular benchmarks are often minimal". Taxonomy: 14 failure modes, 3 categories — FC1 System design issues **43.9%** (top: step repetition 15.7%, unaware of termination 12.4%, disobey task spec 11.8%); FC2 Inter-agent misalignment **32.35%** (top: reasoning-action mismatch 13.2%); FC3 **Task verification 23.5%** (no/incomplete verification 8.2% + incorrect verification 9.1% — i.e., the verifier itself is a major failure locus). κ=0.88 inter-annotator |
| **Are More LLM Calls All You Need? (2024)** https://arxiv.org/abs/2403.02419 | Vote/Filter-Vote performance is **non-monotone** in number of calls: more calls help easy queries, hurt hard ones; mixed-difficulty tasks can get worse with more sampling. Optimal N is task-specific and predictable |
| **Should we be going MAD? (Smit et al., 2024)** https://arxiv.org/abs/2311.17371 | Multi-agent debate "does not reliably outperform... self-consistency and ensembling using multiple reasoning paths"; debate is hyperparameter-sensitive and harder to optimize |
| **Rethinking the Bounds of LLM Reasoning (2024)** https://arxiv.org/abs/2402.18272 | "A single-agent LLM with strong prompts achieves almost the same performance as the best existing discussion approach"; discussion only wins when the prompt has no demonstrations |

UNVERIFIED items: AlphaCode 2's claimed ~100-sample efficiency parity with AC1@1M (in report, not located in extracted text); Augment's exact pre-ensemble baseline (only the 3-8pp band is stated). The Monkeys MATH 82.9→98.44 quote is from the v3 HTML as fetched; split attribution (MATH vs GSM8K) rests on that fetch.

## Verdict (5 lines)
1. **(A) Parallel sampling + selection: strong, replicated evidence** (+12-24pp reasoning, 15.9→56% SWE-bench Lite, AlphaCode log-linear over 4 orders of magnitude) — but the gain is conditional on a **cheap mechanical verifier** (unit tests, execution, votable answers).
2. **(B) Judge panels: real but modest evidence** — PoLL wins on cheap QA grading (κ +0.03-0.14, 7-8× cheaper); for code, what works on SWE-bench is a **trained critic or execution-based filter** (OpenHands +5.8pp over 5 attempts; DEI +7pp), not free-form LLM debate.
3. Counter-evidence is consistent: debate/discussion adds little over self-consistency (Smit; Rethinking-Bounds), more calls can *reduce* accuracy on hard queries (non-monotone), and MAST shows multi-agent stacks fail 41-86.7% of the time — with verification itself being 23.5% of failures.
4. **Biggest caveat for an interactive coding assistant**: the verifier gap — without automatic verification, coverage gains are unrealizable (98.4% coverage → 41.4% selected on MATH), and LLM-judge selection is exactly the panel component MAST flags as failure-prone; plus Augment dropped its +3-8pp ensembler as "too expensive for real-world settings".
5. Practical implication: invest parallelism in **N attempts + mechanical verification (tests/execution) + at most one cheap reranker**, not in deliberative multi-judge panels; panels only pay off where outputs are cheap to grade and a ground-truth-ish rubric exists.
