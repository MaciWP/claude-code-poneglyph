---
spec: 019-quality-gates
tasks: tasks/index.md
phase: 2.5
test_mode: tdd
tdd_policy: optional
notes: "Project policy auxiliary; US3 opts in `tdd: forced` (pure-function graders). Only US3 is TDD-mode — remaining HUs in validations.md."
---

# Tests — 019-quality-gates

Classification: `US3: TDD-mode (creates graders.ts, run.ts, graders.test.ts)`. All other HUs are validation-mode (markdown/config) → `validations.md`.

## US3 — tests (graders + runner)

> Red-first: `graders.test.ts` is written and run BEFORE `graders.ts` exists. Red state = import error / function undefined.

### T3.1 — bannedOpeners: fail on sycophantic opener (happy path of detection)
- **Type**: unit
- **Pre-condition**: fixture transcript whose first prose sentence is "¡Buena pregunta! Aquí va la respuesta…"
- **Action**: `bannedOpeners(transcript, caseSpec)`
- **Assert**: `{pass: false, detail}` and `detail` names the matched phrase ("buena pregunta")
- **Must fail before impl (red)**: `Cannot find module './graders'` / `bannedOpeners is not a function`

### T3.2 — bannedOpeners: pass on direct BLUF answer
- **Type**: unit
- **Pre-condition**: fixture transcript opening "El endpoint falla por X. Fix: …" (no kill-list phrase)
- **Action**: `bannedOpeners(transcript, caseSpec)`
- **Assert**: `{pass: true}`
- **Must fail before impl (red)**: same import/undefined error

### T3.3 — bannedOpeners: literal-quote exception (edge)
- **Type**: unit
- **Pre-condition**: transcript quoting the rule itself: `nunca abrir con "buena pregunta"`
- **Action**: `bannedOpeners(transcript, caseSpec)`
- **Assert**: `{pass: true}` — phrases inside quotes/code are exempt
- **Must fail before impl (red)**: import/undefined error

### T3.4 — esEsDetect: pass on Spanish prose, fail on English prose
- **Type**: unit (2 assertions)
- **Pre-condition**: fixture A = es-ES prose with accents; fixture B = English prose
- **Action**: `esEsDetect(A)` / `esEsDetect(B)`
- **Assert**: A → `{pass: true}`; B → `{pass: false, detail}` naming detected language signal
- **Must fail before impl (red)**: import/undefined error

### T3.5 — esEsDetect: code blocks stripped before detection (edge)
- **Type**: unit
- **Pre-condition**: es-ES prose wrapping a large English/TypeScript fenced code block + inline code
- **Action**: `esEsDetect(transcript)`
- **Assert**: `{pass: true}` — code content does not poison the language signal
- **Must fail before impl (red)**: import/undefined error

### T3.6 — blufPosition: answer-first passes, preamble-first fails
- **Type**: unit (2 assertions)
- **Pre-condition**: fixture A opens with the verdict/conclusion; fixture B opens with "Primero voy a explicar el contexto…" and buries the answer in the final paragraph
- **Action**: `blufPosition(A)` / `blufPosition(B)`
- **Assert**: A → pass; B → fail with detail on answer position
- **Must fail before impl (red)**: import/undefined error

### T3.7 — labelPresence: label with payload passes, bare label fails (edge)
- **Type**: unit
- **Pre-condition**: fixture A contains `[Probable — based on X; flips if Y]`; fixture B contains bare `[Probable]` where caseSpec expects payload
- **Action**: `labelPresence(A, caseSpec)` / `labelPresence(B, caseSpec)`
- **Assert**: A → pass; B → fail with detail "label without payload"
- **Must fail before impl (red)**: import/undefined error

### T3.8 — skillTriggerParse: detects Skill() invocation in stream-json transcript
- **Type**: unit (2 assertions)
- **Pre-condition**: fixture JSONL with a `Skill` tool_use event for `scope`; fixture without any Skill event
- **Action**: `skillTriggerParse(jsonl, {expected: 'scope'})`
- **Assert**: with-event → pass; without → fail naming the expected skill
- **Must fail before impl (red)**: import/undefined error

### T3.9 — skillTriggerParse: malformed JSONL line tolerated (edge)
- **Type**: unit
- **Pre-condition**: fixture JSONL with one corrupt line + one valid Skill event
- **Action**: `skillTriggerParse(jsonl, {expected: 'scope'})`
- **Assert**: pass — corrupt lines skipped, not thrown
- **Must fail before impl (red)**: import/undefined error

### T3.10 — runner offline mode: aggregate report + exit code
- **Type**: integration
- **Pre-condition**: `__tests__/fixtures/` dir with ≥2 stored transcripts + a mini cases.jsonl (1 passing, 1 failing case)
- **Action**: `bun .claude/evals/run.ts --offline .claude/evals/__tests__/fixtures`
- **Assert**: stdout reports per-case pass/fail + aggregate; exit code ≠ 0 (one case fails); with all-passing cases exit code = 0
- **Must fail before impl (red)**: `run.ts` does not exist — command errors

### T3.11 — grader purity (cross-cutting invariant)
- **Type**: unit (static assertion)
- **Pre-condition**: `graders.ts` implemented
- **Action**: `Grep "fetch\\(|Bun.spawn|child_process|fs\\.|Bun.file" .claude/evals/graders.ts`
- **Assert**: zero hits — graders have no I/O/network/model path (spec AC + US3 AC4)
- **Must fail before impl (red)**: n/a (structural check; enforced at green)

> Property-based opt-in considered for `esEsDetect`/`blufPosition` (pure transforms): NOT added — no generator produces meaningful natural-language counterexamples cheaply; example-based fixtures from real transcripts are the honest oracle (Commandment III, anti coverage-padding).
