# binOra Jira Ticket Writer — full authoring protocol

Vendored from Oriol's cowork skill (2026-08-05), adapted to Claude Code (code
access, no Figma viewer — see SKILL.md §Environment adaptations). JRV
conventions (site, types, workflow, épicas, prioridad, components) live in
SKILL.md — not repeated here.

Produce concise, scannable Jira tickets for the binOra product team. Developers
AND product owners must understand the ticket at a glance — no dense prose, no
repetition, no walls of text.

**What a ticket is here**: a PRODUCT requirement draft that travels
BORRADOR → QUÉ → CÓMO → BACKLOG → desarrollo. The author owns the QUÉ; the CÓMO
belongs to the developer and is debated in refinement. Define the requirement,
don't over-constrain the solution: if the creator supplies a technical detail
that is really an implementation choice, ask whether it's a hard product
requirement — default to leaving it open. In Tareas, `🔧 Detalle técnico → CÓMO`
stays pending unless the team already decided it.

**The interview IS the product.** The value is the questions, not the
formatting. Never skip the interview because the input looks complete.

**Calibration**: read `references/ejemplos.md` before drafting (real good/bad
JRV patterns — imported from the cowork 2026-08-05).

## Language and delivery

- Ticket content **always in Spanish**; team's English tech terms stay (tool,
  endpoint, tenant, badge, Data Center, rack, draft, toast, flag, Kanban, batch).
- Deliver the body inside a fenced ```markdown block (copy-paste-ready raw
  markdown); **Título** as plain text outside the block, before it.

## binOra product context

Multi-tenant DCIM platform: **asset inventory** (Data Center → sala → fila →
rack → asset; type, model, state, capacity, evidences) · **Central de Procesos**
(MAC, Mantenimiento, altas/bajas; tasks, subtareas, peticionario, validador,
evidences, Kanban, reports) · **roles & permissions** (tenant-level, hierarchy
access) · **MCP integration** (FastMCP tools for AI agents) · designs in
**Figma** (link + node id).

## Jira-safe markdown

USE: headings, bold, `- [ ]` checkboxes (team format for ACs y pruebas), bullet
and numbered lists, links. AVOID: tables, code fences (inline `code` sparingly),
nesting >2 levels, blockquotes, horizontal rules. If checkboxes render literal
after connector creation, fall back to plain bullets and say so.

## Non-negotiable writing rules

1. **Zero duplication** — each fact in exactly ONE section (verifiable behavior
   → AC; why → Antecedentes; transversal policy → Reglas de negocio).
2. **One AC = one checkable statement, ≤ ~15 words** — markable ✓/✗, never a
   mechanism description. "Según diseño" is NOT an AC.
3. **Bloques de ACs** (bold checkbox + sub-checkboxes) only for distinct facets;
   the bold line is a short label; no groups of one.
4. **Product-level outcomes, not implementation detail** — prefer "devuelve los
   datos relevantes del activo" over listing eight fields, unless a field IS
   the requirement. Anything with several valid technical solutions stays open.
5. **No conversations or pending flags inside the ticket** — "revisar",
   "pendiente de valorar", "(Rubén) yo creo…" mean the interview stopped early;
   resolve NOW or move to `❓ Preguntas` (owner in parentheses).
6. **Optional sections stay out unless they earn their place.** `🖇️ Referencias`
   is MANDATORY for frontend tickets (Figma link — ask if missing). Never
   deliver empty template skeletons.
7. **References must be actionable** — Figma nodes, related JRV, Confluence,
   API specs. Never inspiration links.
8. **🚫 Fuera de alcance is EXCEPTIONAL** — only for genuine scope doubt, naming
   the deferred ticket. Never to preclude technical options.
9. **🧪 Pruebas — terse, situations only** — never restate ACs; only particular
   situations (empty states, boundaries, permission oddities, cross-tenant).
10. **Brevity by default** — base ticket fits one screen; Antecedentes ≤4 lines;
    history = 1 line + link; logs = 2-3 significant lines, full dump as comment;
    `{{variable}}` placeholders; defaults explicit ("Valor por defecto: 5%").

## DoD, ACs y DoR — use the vocabulary precisely

- **Criterios de Aceptación (DoD funcional)** — per-ticket, product-owned: when
  THIS item delivers its value. What the `✅` section drafts.
- **DoD transversal** — team-wide bar (tests, PR review, contract, coverage);
  lives in working agreements; NEVER copied into Historias. Mention quality only
  when it EXCEEDS the bar ("requiere prueba de carga con 10.000 activos").
- **DoR** — entry gate to refinement = the interview's stop condition; not part
  of the ticket.

*El DoR decide cuándo el borrador está listo para refinar; el DoD funcional
(los ACs) decide cuándo la historia está terminada; el DoD transversal es de
equipo y no se copia en tickets.*

## Ticket types and templates (headers verbatim; `[brackets]` = guidance)

Pick by intent: capability de usuario → Historia · comportamiento roto → Error ·
capability para agente IA vía MCP → Agent Story (type Historia) · trabajo
interno/técnico → Tarea · investigación timeboxed → Spike. Mixed deliverables →
propose splitting.

### 1. Historia de Usuario (type: Historia)

```
## 🧩 Historia de Usuario. Contexto (EL QUÉ)

**Como** [rol]
**Quiero** [capacidad]
**Para** [valor de negocio]

#### Antecedentes:
[Opcional, máx. 4 líneas. Por qué ahora / decisión de alcance. Si nace de otro ticket: 1 línea + enlace.]

## ✅ Criterios de Aceptación (DoD funcional)

- [ ] [Afirmación única marcable ✓/✗]
- [ ] **[Bloque: etiqueta corta]**
- [ ] [Sub-AC marcable]

## 🧠 Reglas de negocio [opcional]
## 🚫 Fuera de alcance [excepcional]
## 🖇️ Referencias [obligatoria si es frontend]
## 🧪 Pruebas a realizar por el equipo de producto [opcional]
- [ ] [Situación particular → comportamiento esperado, 1 línea]
## ❓ Preguntas [opcional, mejor resolverlas antes]
- [Duda pendiente (responsable)]
```

### 2. Error (bug)

```
### 🐞 Descripción del error
[1-3 frases: qué falla, dónde, impacto y workaround. Diagnóstico: 1-2 líneas + enlace; nunca el stack completo.]

### 📍 Pasos para reproducir
1. [Paso]

### ❌ Resultado actual
[1-2 frases. Captura si aporta.]

### ✅ Resultado correcto esperado
- [ ] [Comportamiento esperado, marcable]

### 🧪 Entorno / Contexto
- Entorno: [dev / pre / producción + tenant]
- Navegador/cliente: [solo si es relevante]

### 🖇️ Referencias [opcional]
```

### 3. Agent Story (MCP — type: Historia)

```
## 🧩 Historia de Usuario. Contexto (EL QUÉ)

**Como** agente de IA conectado a binOra mediante MCP
**Quiero** [capacidad de la tool]
**Para** [valor: qué análisis/automatización habilita]

#### Antecedentes:
[Opcional: qué falta hoy en el servidor MCP.]

## ✅ Criterios de Aceptación (DoD funcional)

- [ ] [Contrato a nivel de producto: qué pide el agente y qué recibe]
- [ ] [Error accionable (datos inválidos → error estructurado sin ejecutar)]
- [ ] [Confirmación explícita del usuario antes de acciones de escritura]
- [ ] [Respeto de permisos del usuario autenticado en la sesión MCP]
- [ ] [Paginación/límites solo si la operación lo exige]

## 🧠 Reglas de negocio [opcional]
## 🖇️ Referencias [opcional]
## 🧪 Pruebas a realizar por el equipo de producto [opcional]
- [ ] [Desde Claude vía MCP: situación → resultado esperado]
```

### 4. Tarea (técnica o de ajuste)

```
### 🎯 Introducción y Objetivo: Definir el QUÉ queremos conseguir con esta tarea
[1-3 frases. Cambio trivial → una frase basta.]

### 🔧 Detalle técnico → CÓMO [opcional]
[Solo decisiones YA acordadas; si no, omite — el CÓMO es del refinamiento.]

## ✅ Criterios de Aceptación (AC)
- [ ] [Resultado verificable]

## 🖇️ Referencias [opcional]
```

### 5. Spike (type: Spikes)

```
### 🔍 Objetivo del Spike
[Qué decisión habilita y para quién.]

### 📌 Alcance del Spike y enfoque propuesto
- [Qué se evalúa (2-3 opciones máx.) contra qué criterios]
- [Timebox propuesto]

### ❓ Hipótesis o Preguntas a Responder
### 📦 Entregable
- [P. ej.: recomendación documentada + comparativa breve]
```

## Interview mode — grill until solid (mandatory)

1. **Never draft in the first reply** — minimum TWO question turns, however
   complete the input looks (exception: explicit "no me preguntes, dame un
   borrador ya" → assumptions listed above the draft).
2. **1-2 questions per turn**, depth-first; if B depends on A, ask A first.
3. **Always propose a recommended answer** ("¿Límite por defecto? Propongo
   10.000"). Never "¿tú qué opinas?".
4. **Explore before asking** — Jira, Confluence, binOra MCP, and HERE also the
   code (repos directly): confirm instead of asking cold.
5. **Questions gather inputs too** — Figma URL, cómo funciona hoy, fragmento de log.
6. **Challenge the request** at least once — ¿qué problema real resuelve?, ¿es
   la pieza más pequeña con valor?, ¿choca con algo existente? (the team has
   rejected features here — e.g. bulk validation via MCP vs traceability);
   conclusion → Antecedentes, 2-3 líneas.
7. **Detect and confirm relationships** — duplicates (propose linking), blocks /
   is blocked by / relates to.
8. **Ask for BOTH audiences** — dev (defaults, errors, contracts, edges) and
   product (value, scope, dependencies).
9. **No invented answers, no forced decisions** — PRODUCT ambiguity → ask;
   TECHNICAL choices → leave open unless hard requirement; "decide tú" on a
   product point → decide, state it explicitly, move on.
10. **DoR = stop condition**; if one fails, that's the next question:
    valor claro · ACs marcables y de nivel producto · alcance acotado (dudoso
    fuera o troceado) · referencias obligatorias (Figma si frontend) · épica
    propuesta y duplicados comprobados · ninguna pregunta de PRODUCTO abierta.

## Context sources (Claude Code environment)

- **Jira (Atlassian connector)**: ALWAYS search JRV for duplicates/related (2-3
  keywords) and the parent epic before drafting.
- **The code — we have it here**: field names, endpoints, current behavior →
  verify directly in binora-backend/frontend/contract (workspace map:
  `worktrees-bjumper` §Workspace topology). Never guess, never ask what the
  repo answers, never paste large code into tickets (paths/endpoint names only).
- **binOra MCP (Desarrollo connector)**: "cómo funciona hoy" live; check
  whether an MCP tool already exists (essential for Agent Stories).
- **Figma**: no viewer here — mandatory reference (link + node id) for frontend
  tickets; ask the user for it; ACs capture only what the design can't express.
- **Confluence (Atlassian connector)**: search before asking the creator to
  re-explain.

## Final phase — validation gate and creation (mandatory)

1. **Shrink pass**: delete mechanism-ACs and "según diseño", unearned optional
   sections, non-actionable references, duplicated facts, inline pending-flags.
2. Show the complete ticket: Título + ```markdown body + agreed Jira fields
   (tipo, épica, components, prioridad si no Medium, enlaces).
3. Ask **"Listo" / "Refinar" / "Cancelar"** — offering your own remaining
   refinement ideas proactively. Iteration is the default expectation.
   Cancelar or unclear → chat only, NEVER create. Listo (unambiguous) → create.
4. Create in `JRV` with the exact Spanish type, parent epic and agreed fields;
   verify estado **BORRADOR** (transition if not); create confirmed links after.
5. Connector unavailable/creation fails → copy-paste markdown fallback + say so.
