# Reviewer Memory


## 2026-04-20 — Session 1970c713
- The `additionalContext` field in `UserPromptSubmit` hooks has a visible size limit well below 26KB — injecting large markdown files via this mechanism results in truncation, not delivery. Verify the limit before designing delivery mechanisms that depend on it.
- Bun.stdin.text() hangs on Windows when the subprocess is spawned via Bun.spawn regardless of stdin flavor. The fix (Node-style process.stdin event listeners) is in `hook-stdin.ts` and should be used in ALL new hooks on this project.
- Orchestration rule files in `rules/` are auto-injected into ALL sessions (Lead + subagents). Removing Lead-only rules from `rules/` saves ~25K tokens per subagent spawn — this is a real and measurable improvement.
- Builder agent memory deletions without documented rationale are a Commandment IX violation — the accumulated knowledge is the observability layer. Any bulk deletion should include a commit message explaining what was removed and why.


## 2026-05-29 — Review feature 002 (self-audit)
- En audits con scoring numerico, el bug recurrente es el score-of-record inconsistente entre artefactos: scoring.md prosa/titulo dice un numero, la tabla + mean + frontmatter + deliverable dicen otro. Verificar SIEMPRE que el numero usado en el calculo del mean coincide con titulo y prosa de cada categoria. El numero defendible es el que la rubrica deriva del anchor, no el que la prosa repite.
- Discriminador APPROVED_WITH_WARNINGS vs NEEDS_CHANGES para reports: "el defecto hace fallar un AC del DELIVERABLE, o solo mancha un artefacto de soporte (build/*.md)?". Si el deliverable es internamente consistente y los anchors derivan el valor correcto, es warning de soporte, no fallo de AC. Un verdict que dice "viola AC3" + "8/8 satisfechos" + "fix obligatorio" bajo AW2 es internamente contradictorio — elegir lane.
- Word count y star-counts: NUNCA afirmar "~N palabras/stars" sin medir (wc -w, GitHub API). report.md afirmaba 2500-4500 pero medía 2356 (bajo rango). El reviewer independiente pierde toda credibilidad si rubber-stampea un structural assertion sin ejecutar la medicion.
