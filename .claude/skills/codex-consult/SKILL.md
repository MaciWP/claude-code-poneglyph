---
name: codex-consult
description: |
  Consulta a OpenAI Codex (CLI headless, `codex exec`) como segundo modelo: preguntas puntuales, segundas opiniones/refutación de planes o diffs, y sweeps paralelos read-only. Codex NUNCA escribe en el repo (`--sandbox read-only` forzado); su respuesta se trata como hipótesis de otro modelo, no como verdad — Claude verifica antes de integrar.
  Úsala cuando: quieras contrastar con otro modelo, pedir una segunda opinión externa sobre un plan/diff/decisión, refutar un enfoque, o paralelizar varias consultas independientes, "pregúntale a codex", "segunda opinión", "contrasta con gpt", "qué opina codex".
  Keywords - codex, openai, gpt, sol, segunda opinión, second opinion, consulta a codex,
  pregúntale a codex, contrasta con otro modelo, refuta con codex, external model, cross-check
disable-model-invocation: false
when_to_use: |
  "pregúntale a codex", "segunda opinión de otro modelo", "contrasta con gpt/codex", "qué opina codex", "refuta este plan con codex", "second opinion", "ask codex"
---

# codex-consult — external second brain (read-only)

Consult OpenAI Codex headlessly from a Claude Code session. Its only reason to exist:
**cheap cross-model verification and parallel read-only consultation** (Commandments II, VII, VIII).
It is NOT a delegation channel — Codex never writes to the repo, and its output is a
hypothesis to verify, never a source of truth.

## Binary and environment (verified 2026-07-17)

| Fact | Value |
|---|---|
| Working binary | `/Applications/Codex.app/Contents/Resources/codex` (codex-cli 0.142.0) |
| npm install (`~/.nvm/.../bin/codex`) | **BROKEN** — vendor native binary missing (spawn ENOENT). Do not use. |
| Auth | ChatGPT session (`codex login status` → "Logged in using ChatGPT") |
| Bash sandbox | Kills the process (exit 137). Run `codex exec` with the sandbox disabled — Codex's own `--sandbox read-only` is the guardrail (OS-enforced). |
| Output contract | stderr = progress stream, stdout = final agent message only |

```bash
CODEX=/Applications/Codex.app/Contents/Resources/codex
```

If the binary is missing, stop and tell the user (Codex.app moved/uninstalled). If auth
fails, report it and stop — never retry auth loops.

## Mandatory flags — every invocation

```bash
"$CODEX" exec --sandbox read-only --ephemeral --skip-git-repo-check "<prompt>"
```

- `--sandbox read-only` — Codex can read the workspace but cannot write/create/delete. NEVER use `workspace-write` or `danger-full-access` (out of ratified scope).
- `--ephemeral` — no session persisted to disk.
- `--skip-git-repo-check` — allows running from any cwd.
- Long prompts: pipe via stdin (`printf '%s' "$PROMPT" | "$CODEX" exec ... -`) to avoid shell-quoting breakage.

## Modes

### 1. Consult (default) — one targeted question

Build the prompt per Commandment VIII: **context + goal + constraints + deliverable +
how the answer will be verified**. Paste the relevant code/plan INTO the prompt — Codex
reads the cwd but do not assume it will find the right files; give it the material.

```bash
"$CODEX" exec --sandbox read-only --ephemeral --skip-git-repo-check \
  "Context: <what/why>. Goal: <question>. Constraints: <stack, style>. Deliverable: <format>. <pasted material>"
```

### 2. Second opinion / refuter — plans, diffs, decisions

Use Codex as an external refuter (`[[feedback-refuter-not-optional]]`). Prompt template:

```text
You are an adversarial reviewer. Try to REFUTE the following <plan|diff|decision>.
Do not be agreeable: find concrete failure scenarios, missing cases, and simpler alternatives.
For each objection, state the evidence or the test that would confirm it.
If you cannot refute it, say so explicitly and state what you checked.
---
<the plan/diff/decision, pasted verbatim>
```

### 3. Parallel sweep — N independent questions

Headless background processes (best-of-n pattern — processes, not subagents; the spawn
tree does not apply). Outputs go to scratchpad files; Claude reads and synthesizes
(compute over ingest). No zsh word-splitting loops over unquoted vars (`[[feedback-zsh-no-wordsplit]]`) — write the calls inline:

```bash
CODEX=/Applications/Codex.app/Contents/Resources/codex
OUT=<scratchpad-dir>
"$CODEX" exec --sandbox read-only --ephemeral --skip-git-repo-check "<q1>" > "$OUT/c1.out" 2>/dev/null &
"$CODEX" exec --sandbox read-only --ephemeral --skip-git-repo-check "<q2>" > "$OUT/c2.out" 2>/dev/null &
wait
```

## Integration rule (non-negotiable)

Codex output is **another model's hypothesis**. Before acting on any factual claim it
makes about this repo or an API: verify with LSP/Grep/Read or docs (model-uplift #3,
primary artifact wins). In prose, report unverified Codex claims with a confidence
label (`[Probable — según Codex, sin verificar]`), never as bare fact.

## Anti-patterns (kills this skill if violated — Commandment X)

- Delegating WRITE work to Codex (implementation, edits) — out of scope; Claude builds inline.
- Quoting Codex output as verified fact without an independent check.
- Using Codex as an oracle for repo facts that Grep/LSP answer faster and reliably.
- Firing it on trivial questions Claude answers directly — each call costs ~30-90s wall-clock.

## Commandments cubiertos

| # | How |
|---|---|
| II | Cross-model verification; refuter mode attacks confirmation bias |
| VII | Parallel sweeps are cheap background processes |
| VIII | Every prompt to Codex carries context/goal/constraints/deliverable/verification |

## Related
- `best-of-n` — the headless-CLI background pattern this mirrors (`claude -p` counterpart)
- `decision-stress-test` — internal multi-perspective challenge; codex-consult adds an EXTERNAL model
- `prompt-engineer` — refine the delegation prompt when the ask is complex

**Version**: 1.0.0
