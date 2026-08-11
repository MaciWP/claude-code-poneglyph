# Harness Adapters

Poneglyph has one behavioral doctrine and host-specific adapters. Portability is
intentional, not assumed: a feature is installed only when the target host has a
compatible native contract.

| Concern | Claude Code | Codex | Grok Build |
|---|---|---|---|
| Global doctrine | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | Not installed by this repo |
| Repository instructions | `CLAUDE.md` | `AGENTS.md` addendum | Host-specific |
| Skills | Full `.claude/skills/` | `dev`, `verify`, `anti-hallucination` only | Not installed |
| Hooks | Five native Claude hooks | Deliberately excluded | Deliberately excluded |
| Output style | `outputStyle: Poneglyph` | Doctrine governs prose | `~/.grok/rules/poneglyph-style.md` |

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
`Skill(x)` → read `~/.codex/skills/x/SKILL.md` when installed. A reference to a
skill that is not installed under `~/.codex/skills/` (`drillme`, `skill-advisor`,
`critic`, `lessons`, ...) means apply the intent inline — ask the clarifying
questions, do the verification, skip the dispatch — never invent the tool.

## Installation and Verification

```bash
bun .claude/commands/sync-claude.ts --execute --backup --force
bun .claude/scripts/sync-codex.ts --execute --backup --force
bun .claude/commands/sync-claude.ts --validate-hooks
bun .claude/scripts/sync-codex.ts --status
```

For Claude, `/status` identifies loaded settings scopes and
`.claude/learned/instructions-loaded.log` records instruction files. Codex has no
equivalent Poneglyph hook: inspect `~/.codex/AGENTS.md` and `~/.codex/skills/`
instead.

## Model Routing

Model names are capabilities of the active host, not a portable taxonomy — no
Poneglyph doc hard-codes them. Resolve at runtime: Claude Code lists its live
tiers in the `Agent` tool's model options; Codex uses the model configured in
`~/.codex/config.toml` (run `codex exec` without `-m`; pass `-m` only for a
user-named tier); Grok Build is single-model. Propose capability classes
(cheapest / mid / top tier) and let the host supply the names. Use inline
tooling for cheap searches; never request a tier merely because another
provider or an old document mentioned it.
