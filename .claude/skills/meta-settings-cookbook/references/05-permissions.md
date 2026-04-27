# Permission Rules Reference

## Syntax

Format: `Tool` or `Tool(specifier)`

| Pattern | Matches |
|---------|---------|
| `Bash` | All bash commands |
| `Bash(git *)` | Commands starting with `git` |
| `Bash(npm run *)` | Commands starting with `npm run` |
| `Read(./.env)` | Specific file |
| `Read(./secrets/**)` | Directory glob |
| `Edit(*.ts)` | Files by extension |
| `WebFetch(domain:example.com)` | Fetch by domain |
| `Write` | All write operations |

## Evaluation Order

1. **deny** checked first — if matches, blocked
2. **ask** checked next — if matches, prompts user
3. **allow** checked last — if matches, auto-approved
4. No match → default permission mode behavior

## Template: Restrictive Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(bun test *)",
      "Bash(bun run lint)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(curl *)",
      "Bash(rm -rf *)",
      "WebFetch"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

## Template: Permissive Permissions (trusted dev environment)

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Edit(*)",
      "Write(*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./secrets/**)"
    ],
    "defaultMode": "bypassPermissions"
  }
}
```

## Common Permission Patterns

| Use Case | Rule |
|----------|------|
| Allow all git commands | `Bash(git *)` |
| Allow specific test runner | `Bash(bun test *)` |
| Block env files | `Read(./.env)`, `Read(./.env.*)` |
| Block secrets directory | `Read(./secrets/**)` |
| Allow fetching specific domain | `WebFetch(domain:api.example.com)` |
| Block all web fetching | `WebFetch` in deny |
| Allow editing TypeScript only | `Edit(*.ts)` |
