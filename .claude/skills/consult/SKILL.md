---
name: consult
description: |
  Consulta a un modelo EXTERNO (OpenAI Codex o xAI Grok, CLIs headless) como segundo cerebro: preguntas puntuales, segundas opiniones/refutación de planes o diffs, sweeps paralelos read-only, o contraste doble (ambos modelos sobre la misma pregunta). El modelo externo NUNCA escribe en el repo (sandbox read-only forzado); su respuesta es hipótesis de otro modelo, no verdad — Claude verifica antes de integrar.
  Úsala cuando: quieras contrastar con otro modelo, pedir una segunda opinión externa sobre un plan/diff/decisión, refutar un enfoque, o paralelizar consultas independientes, "pregúntale a codex", "pregúntale a grok", "segunda opinión", "qué opina otro modelo".
  Keywords - codex, grok, openai, xai, gpt, segunda opinión, second opinion, otro modelo,
  pregúntale a codex, pregúntale a grok, contrasta con otro modelo, refuta con codex, external model, cross-check
disable-model-invocation: false
when_to_use: |
  "pregúntale a codex/grok", "segunda opinión de otro modelo", "contrasta con gpt/codex/grok", "qué opina codex/grok", "refuta este plan con otro modelo", "second opinion", "ask codex/grok"
---

# consult — external second brain, multi-model (read-only)

Consult an EXTERNAL model headlessly from a Claude Code session. Its only reason to
exist: **cheap cross-model verification and parallel read-only consultation**
(Commandments II, X, VIII). It is NOT a delegation channel — the external model never
writes to the repo, and its output is a hypothesis to verify, never a source of truth.

## Adapters (verified 2026-08-06)

| | Codex (OpenAI) | Grok (xAI) |
|---|---|---|
| Binary | `~/.local/bin/codex` (0.146.0, orca-managed runtime) | `~/.local/bin/grok` (0.2.118, official xAI CLI) |
| Headless call | `codex exec --sandbox read-only --ephemeral --skip-git-repo-check "<prompt>"` | `grok -p "<prompt>" --sandbox read-only --output-format plain` |
| Write guardrail | `--sandbox read-only` (OS-enforced) — NEVER `workspace-write`/`danger-full-access` | `--sandbox read-only` (OS-enforced: FS write solo `~/.grok/`, red de hijos bloqueada) |
| Auth | ChatGPT session (`codex login status`) | Browser login / `XAI_API_KEY` |
| Output contract | stderr = progress, stdout = final message | stdout plano con `--output-format plain` |
| Long prompts | pipe stdin: `printf '%s' "$PROMPT" \| codex exec ... -` | pipe stdin igual, o fichero temporal en scratchpad |

Stale-path note: `/Applications/Codex.app/...` is DEAD (pre-2026-08 install). The npm
codex is also broken (missing native binary). Only `~/.local/bin/codex` works.
If a binary is missing or auth fails: report and stop — never retry auth loops.
The Bash sandbox kills these processes (exit 137) — run them with the sandbox
disabled; the CLI's own `--sandbox read-only` IS the guardrail.

## Model choice

- **Default: codex** (established baseline, evidence history in this repo).
- **Grok**: when the user names it, or when codex is unavailable.
- **Double contrast**: for high-stakes second opinions, fire BOTH on the same prompt in
  parallel and report agreement/disagreement — two independent external hypotheses beat
  one (still hypotheses, still verified before integrating).

## Modes

### 1. Consult (default) — one targeted question

Build the prompt per Commandment VIII: **context + goal + constraints + deliverable +
how the answer will be verified**. Paste the relevant code/plan INTO the prompt — do
not assume the external model will find the right files; give it the material.

### 2. Second opinion / refuter — plans, diffs, decisions

Use the external model as refuter (`[[feedback-refuter-not-optional]]`). Template:

```text
You are an adversarial reviewer. Try to REFUTE the following <plan|diff|decision>.
Do not be agreeable: find concrete failure scenarios, missing cases, and simpler alternatives.
For each objection, state the evidence or the test that would confirm it.
If you cannot refute it, say so explicitly and state what you checked.
---
<the plan/diff/decision, pasted verbatim>
```

### 3. Parallel sweep — N independent questions

Headless background OS processes (not subagents; the spawn tree does not apply).
Outputs go to scratchpad files; Claude reads and synthesizes (compute over ingest).
No zsh word-splitting loops over unquoted vars (`[[feedback-zsh-no-wordsplit]]`) — write the calls inline:

```bash
OUT=<scratchpad-dir>
~/.local/bin/codex exec --sandbox read-only --ephemeral --skip-git-repo-check "<q1>" > "$OUT/c1.out" 2>/dev/null &
~/.local/bin/grok -p "<q2>" --sandbox read-only --output-format plain > "$OUT/g1.out" 2>/dev/null &
wait
```

## Integration rule (non-negotiable)

External output is **another model's hypothesis**. Before acting on any factual claim it
makes about this repo or an API: verify with LSP/Grep/Read or docs (primary artifact
wins — `docs/model-uplift-playbook.md`). In prose, report unverified claims with a
confidence label (`[Probable — según codex/grok, sin verificar]`), never as bare fact.

## Anti-patterns (kills this skill if violated — Commandment IX)

- Delegating WRITE work to an external model (implementation, edits) — Claude builds inline.
- Quoting external output as verified fact without an independent check.
- Using it as an oracle for repo facts that Grep/LSP answer faster and reliably.
- Firing it on trivial questions Claude answers directly — each call costs ~30-90s wall-clock.

## Commandments cubiertos

| # | How |
|---|---|
| II | Cross-model verification; refuter mode attacks confirmation bias; double contrast on high stakes |
| X | Parallel sweeps are cheap background processes |
| VIII | Every external prompt carries context/goal/constraints/deliverable/verification |

## Related
- `decide` (heavy tier) — internal multi-perspective challenge; consult adds an EXTERNAL model
- `prompt-engineer` — refine the delegation prompt when the ask is complex

**Version**: 2.0.0 (multi-model, 031 — was `codex-consult` 1.0.0)
