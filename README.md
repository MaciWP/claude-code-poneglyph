# Claude Code Poneglyph

Multi-agent orchestration system for Claude Code — a personal meta-configuration
(skills, agents, hooks, the 5-phase `/flow` workflow) for **Oriol Macias**.

> **This file is the single source of truth for installation.**
> Deep per-tool detail lives in [`docs/`](./docs); the steps below are the
> canonical path to a working setup on **Windows 11 (PowerShell, no admin)**.

---

## What you need

| Tool | Why | Required? |
|------|-----|-----------|
| **Bun** ≥ 1.3 | Runs every hook (`.ts`) and the test suite (`bun test`) | **Yes** |
| **Git** (PortableGit) | Version control; the `git-branch` statusline widget | **Yes** |
| **ccstatusline** | Status bar: cost + quota reset + usage | Optional |
| **Node.js** | — | **No** (project is bun-only; node is not installed and not needed) |

Verified working baseline on this machine: **Bun 1.3.6**, **MinGit 2.51.2**,
**ccstatusline 2.2.10**, test suite **81 pass / 0 fail**.

---

## Install — step by step

### 1. Bun (portable, no admin)

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
$rel   = Invoke-RestMethod "https://api.github.com/repos/oven-sh/bun/releases/latest" -Headers @{ "User-Agent" = "ps" }
$asset = $rel.assets | Where-Object { $_.name -eq 'bun-windows-x64.zip' } | Select-Object -First 1
$zip   = "$env:TEMP\bun-windows-x64.zip"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing
$tmp = "$env:TEMP\bun-extract"; Expand-Archive $zip -DestinationPath $tmp -Force
$bunExe = Get-ChildItem $tmp -Recurse -Filter bun.exe | Select-Object -First 1
$binDir = "$env:USERPROFILE\.bun\bin"; New-Item -ItemType Directory -Force $binDir | Out-Null
Copy-Item $bunExe.FullName "$binDir\bun.exe" -Force
# Persist on User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$binDir*") { [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User") }
& "$binDir\bun.exe" --version   # -> 1.3.6
```

> **Do NOT** use `irm bun.sh/install.ps1 | iex` — remote-script execution is the
> exact risk class the repo blocks in `permissions.deny` (`curl * | sh`).

Full detail + uninstall: [`docs/statusline-setup.md`](./docs/statusline-setup.md) §Step 1-2.

### 2. Git (PortableGit, no admin)

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$rel = Invoke-RestMethod "https://api.github.com/repos/git-for-windows/git/releases/latest" -Headers @{ "User-Agent" = "ps" }
$asset = $rel.assets | Where-Object { $_.name -match 'MinGit-.*-64-bit\.zip' -and $_.name -notmatch 'busybox' } | Select-Object -First 1
$ProgressPreference = 'SilentlyContinue'
$zip = "$env:TEMP\MinGit.zip"; $dest = "$env:LOCALAPPDATA\Programs\PortableGit"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing
Expand-Archive $zip -DestinationPath $dest -Force
# Persist on User PATH + configure identity
$gitCmd = "$dest\cmd"; $userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$gitCmd*") { [Environment]::SetEnvironmentVariable("Path", "$userPath;$gitCmd", "User") }
git config --global user.name  "Oriol Macias"
git config --global user.email "oriolomb@gmail.com"
git config --global core.autocrlf true
git config --global init.defaultBranch main
git config --global pull.rebase false
```

Full detail: [`docs/git-setup.md`](./docs/git-setup.md).

### 3. Clone + install deps

```powershell
git clone https://github.com/MaciWP/claude-code-poneglyph.git
cd claude-code-poneglyph
bun install
```

### 4. ⚠️ settings.json PATH — the critical Windows gotcha

Claude Code **does not expand** `${HOME}` / `${PATH}` inside `settings.json`
`env` (GitHub issue [#4276](https://github.com/anthropics/claude-code/issues/4276)),
and on Windows it **replaces** the process PATH with the literal `env.PATH`
string. A Unix-style value (`${HOME}/.bun/bin:...`) therefore wipes `bun`, `git`
and everything else from PATH → hooks and `bun test` fail.

This repo's `.claude/settings.json` ships an **explicit Windows `env.PATH`**
(absolute dirs, `;`-separated, `bun\bin` first). If your username or tool
locations differ, regenerate it:

```powershell
$bun  = "$env:USERPROFILE\.bun\bin"
$git  = "$env:LOCALAPPDATA\Programs\PortableGit\cmd"
$real = "$bun;$git;" + [Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH","User")
# Put $real (backslashes escaped as \\) into .claude/settings.json -> env.PATH
```

> **Restart Claude Code after editing `settings.json`** — `env` is injected at
> startup; a running session keeps the old PATH.

### 5. ccstatusline (optional)

```powershell
& "$env:USERPROFILE\.bun\bin\bun.exe" install -g ccstatusline@latest
```

Then add the `statusLine` block + widget config — full steps in
[`docs/statusline-setup.md`](./docs/statusline-setup.md).

### 6. Verify

```powershell
bun --version            # 1.3.6
git --version            # 2.51.2
bun test ./.claude/hooks/   # -> 81 pass, 0 fail
```

If `bun` is "not found" inside Claude Code's Bash tool: you skipped the
**restart** in Step 4, or `env.PATH` doesn't include `…\.bun\bin`.

---

## How hooks resolve

Hooks run from the **project** copy via the documented `${CLAUDE_PROJECT_DIR}`
placeholder (which *does* expand, unlike `$HOME`):

```json
"command": "bun ${CLAUDE_PROJECT_DIR}/.claude/hooks/security-gate.ts"
```

| Event | Hook | Purpose |
|-------|------|---------|
| `PostToolUse` | `validators/code-validator.ts` | Validate edited code |
| `Stop` | `security-gate.ts` (async) | Scan for leaked secrets |
| `PostCompact` | `post-compact.ts` | Re-inject Lead reminder |
| `PermissionRequest` | `auto-approve.ts` | Auto-approve safe calls |

---

## Global install (optional, not done by default)

By design poneglyph is meant to apply to **all** projects via `~/.claude/`.
**Current state on this machine: NOT installed globally** — `~/.claude/` has no
`hooks/`, `skills/`, `agents/` or `commands/`; the orchestration lives only in
this repo. To install globally:

```
/sync-claude
```

> `/sync-claude` syncs **folders + `CLAUDE.md`** via symlinks/junctions but
> **not `settings.json`** — copy the `statusLine` (and, if you want global hooks,
> the `hooks` + `env` blocks) into `~/.claude/settings.json` by hand. When global
> hooks point at `~/.claude/hooks/`, switch their command paths from
> `${CLAUDE_PROJECT_DIR}` to the absolute `~/.claude/hooks/` location.

---

## Layout

| Path | What |
|------|------|
| `CLAUDE.md` | Project doctrine — 10 Commandments + orchestration rules |
| `.claude/skills/` | 20 skills (6 phase skills + transversal + domain) |
| `.claude/agents/` | builder, reviewer, scout |
| `.claude/hooks/` | 4 hooks + tests (`__tests__/`) |
| `.claude/commands/` | `/flow`, `/decide`, `/explain-changes`, `/sync-claude` |
| `.claude/plans/` | `/flow` feature lifecycles (`{NNN}-{slug}/`) |
| `docs/` | Machine bootstrap records (git, statusline) |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `bun: command not found` in Bash tool | `env.PATH` wrong, or no restart | Fix Step 4 + restart Claude Code |
| `git` widget shows `Processing…` | git not on PATH | Step 2 (PortableGit on User PATH) |
| Hooks never fire | path pointed at non-existent `~/.claude/hooks` | Use `${CLAUDE_PROJECT_DIR}` (already fixed) |
| `bun test` fails to find files | wrong cwd | run from repo root |
