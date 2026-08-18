# Harness Adapters

Poneglyph has one behavioral doctrine and host-specific adapters. Portability is
intentional, not assumed: a feature is installed only when the target host has a
compatible native contract.

| Concern | Claude Code | Codex | Grok Build |
|---|---|---|---|
| Global doctrine | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | `~/.grok/rules/poneglyph-sp.md` (symlink to generated twin) |
| Repository instructions | `CLAUDE.md` | `AGENTS.md` addendum | Host-specific |
| Skills | Full `.claude/skills/` | `dev`, `verify`, `anti-hallucination`, `drillme`, `lessons` | Discovered from `.claude/skills` when cwd is a Poneglyph/compat tree; no `Skill()` tool |
| Hooks | Five native Claude hooks | Deliberately excluded | Deliberately excluded |
| Output style | `outputStyle: Poneglyph` | Doctrine governs prose | Twin only — do not link the style (double-load). If the host system prompt conflicts with the house style, **Poneglyph wins** when talking to Oriol. |
| `/flow` | `Skill()` / `Agent()` / Claude `Workflow` as written | Not installed | Same `flow.md`. `Skill(x)` → Read `.claude/skills/x/SKILL.md`. No Claude `Workflow` (Grok `workflow` is Rhai). |

## Ownership

- `.claude/settings.global.json` is the single source for the Claude **user**
  profile. `sync-claude.ts` merges it with the ignored machine overlay and writes
  `~/.claude/settings.json`.
- `.claude/settings.json` is the shared **project** profile. It must not register
  global hooks or permissions, because Claude loads it in addition to user settings
  while working on Poneglyph.
- `AGENTS.md` is a repository addendum. The full Codex doctrine is linked directly
  to `~/.codex/AGENTS.md`, preventing duplicate instruction payloads in this repo.

## Portable Skill Vocabulary

The portable skills are written against Claude Code tool names. On other hosts,
read them as capabilities, not APIs: `Glob`/`Grep`/`LSP` → the host's own file
search and code inspection; `AskUserQuestion` → ask the user in chat;
`Skill(x)` → read `.claude/skills/x/SKILL.md` (Grok) or `~/.codex/skills/x/SKILL.md`
when installed (Codex). A reference to a skill that is not in the Codex
allowlist (`skill-advisor`, `critic`, `scope`, …) means apply the intent
inline — never invent the tool.

## Installation and Verification

```bash
bun .claude/commands/sync-claude.ts --execute --backup --force
bun .claude/scripts/sync-codex.ts --execute --backup --force
bun .claude/commands/sync-claude.ts --validate-hooks
bun .claude/scripts/sync-codex.ts --status
ln -sfn "$(pwd)/.claude/system-prompts/poneglyph-sp.md" ~/.grok/rules/poneglyph-sp.md
bun .claude/scripts/flow-state.ts status
```

For Claude, `/status` identifies loaded settings scopes and
`.claude/learned/instructions-loaded.log` records instruction files. Codex has no
equivalent Poneglyph hook: inspect `~/.codex/AGENTS.md` and `~/.codex/skills/`
instead. Open `/flow` lifecycles: `flow-state.ts status` (do not rely on a
SessionStart hook — that reminder was cut). Grok MCP auth (Binora/GitHub) is
machine/env, not this adapter. There is no Codex eval harness (Claude
`evals/run.ts` only).

## Model Routing

Model names are capabilities of the active host, not a portable taxonomy — no
Poneglyph doc hard-codes them. Resolve at runtime: Claude Code lists its live
tiers in the `Agent` tool's model options; Codex uses the model configured in
`~/.codex/config.toml` (run `codex exec` without `-m`; pass `-m` only for a
user-named tier); Grok Build is single-model. Propose capability classes
(cheapest / mid / top tier) and let the host supply the names. Use inline
tooling for cheap searches; never request a tier merely because another
provider or an old document mentioned it.
