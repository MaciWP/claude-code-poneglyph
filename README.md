# Poneglyph

Personal orchestration layer for Claude Code, Codex and Grok Build. Claude Code
has the full adapter; Codex receives the portable doctrine and a small verified
skill set; Grok receives the shared output style.

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

This repo's `.claude/settings.global.json` ships the global profile. Its ignored
machine overlay supplies the **explicit Windows `env.PATH`**
(absolute dirs, `;`-separated, `bun\bin` first). If your username or tool
locations differ, regenerate it:

```powershell
$bun  = "$env:USERPROFILE\.bun\bin"
$git  = "$env:LOCALAPPDATA\Programs\PortableGit\cmd"
$real = "$bun;$git;" + [Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH","User")
# Put $real (backslashes escaped as \\) into .claude/settings.machine.json -> env.PATH
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
bun test ./.claude/hooks/   # -> 0 fail
```

If `bun` is "not found" inside Claude Code's Bash tool: you skipped the
**restart** in Step 4, or `env.PATH` doesn't include `…\.bun\bin`.

---

## How global hooks resolve

Hooks run from the synced **user** layer through `$HOME/.claude/hooks/`. This
keeps them available in every project and gives `sync-claude.ts --validate-hooks`
one deterministic target to verify:

```json
"command": "bun $HOME/.claude/hooks/security-gate.ts"
```

The Poneglyph repository itself intentionally declares no hooks in its project
`settings.json`; Claude loads user and project settings together, so duplicating
the registrations there would execute each hook twice.

| Event | Hook | Purpose |
|-------|------|---------|
| `UserPromptSubmit` | `skill-activation.ts` | Precise `Skill()` hints on keyword match |
| `Stop` | `security-gate.ts` | Secret warn + git-discipline warn (session repo only) |
| `InstructionsLoaded` | `instructions-loaded.ts` | Log every instruction-layer load |
| `SessionStart` | `workspace-hint.ts` | Bjumper-workspace skill hint |
| `PostCompact` | `post-compact.ts` | Re-inject Lead reminder |

---

## Global installation

Poneglyph applies across projects through `~/.claude/` and `~/.codex/`. The
Claude synchronizer owns links plus the generated user settings profile; it does
not copy those hooks into the project scope.

```bash
bun .claude/commands/sync-claude.ts --execute --backup --force
bun .claude/scripts/sync-codex.ts --execute --backup --force
```

`sync-claude.ts` generates `~/.claude/settings.json` from
`.claude/settings.global.json` plus `.claude/settings.machine.json`. The tracked
`.claude/settings.json` remains deliberately hook-free to prevent duplicate hook
execution in this repository. Codex installs only the doctrine and the portable
skills; Claude hooks are not a compatible Codex implementation.

The current bridge topology and verification commands live in
[`.claude/docs/harness-adapters.md`](./.claude/docs/harness-adapters.md).

---

## Layout

| Path | What |
|------|------|
| `CLAUDE.md` | Global doctrine, linked into Claude and Codex user layers |
| `AGENTS.md` | Codex repository addendum; avoids repeating the global doctrine |
| `.claude/settings.global.json` | Claude user profile source, including global hooks |
| `.claude/settings.json` | Hook-free project profile |
| `.claude/skills/` | Claude adapter; Codex installs only three portable skills |
| `.claude/hooks/` | 5 hooks + tests (`__tests__/`) |
| `.claude/commands/` | `/flow`, `/role`, `/sync-claude`, `/commit-message`, `/pr-description` |
| `.claude/plans/` | `/flow` feature lifecycles (`{NNN}-{slug}/`) |
| `docs/` | Machine bootstrap records (git, statusline) |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `bun: command not found` in Bash tool | `env.PATH` wrong, or no restart | Fix Step 4 + restart Claude Code |
| `git` widget shows `Processing…` | git not on PATH | Step 2 (PortableGit on User PATH) |
| Claude hook fires twice in Poneglyph | hook registered in both user and project settings | Keep hooks only in `settings.global.json`; rerun sync |
| Codex lacks Poneglyph behavior | Codex adapter not installed | Run `sync-codex.ts --execute --backup --force` |
| `bun test` fails to find files | wrong cwd | run from repo root |
