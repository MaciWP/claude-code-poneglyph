---
description: Sincroniza la configuración .claude/ a global (~/.claude/) via symlinks
allowed-tools: [Bash, AskUserQuestion]
version: 2.0.0
---

# /sync-claude

Sincroniza los archivos de `.claude/` del proyecto actual hacia `~/.claude/` del usuario mediante symlinks.

## Uso Rápido

```bash
# 1. Verificar sistema primero
/sync-claude --check

# 2. Ver preview
/sync-claude

# 3. Ejecutar con backup
/sync-claude --execute --backup
```

## Opciones

| Argumento | Efecto |
|-----------|--------|
| `--check` | Verificar sistema y permisos (recomendado primero) |
| `--status` | Solo muestra estado actual |
| `--execute` | Aplica cambios |
| `--backup` | Guarda contenido existente |
| `--unlink` | Elimina symlinks |
| `--method` | Forzar: `auto`, `symlink`, `junction`, `copy` |
| `--force` | Sin confirmación |

## Ejemplos

```bash
# Verificar si el sistema puede crear symlinks
/sync-claude --check

# Ver qué cambios se harían
/sync-claude

# Ejecutar (con backup del existente)
/sync-claude --execute --backup

# En Windows sin permisos: forzar junction
/sync-claude --method junction --execute

# Eliminar todos los symlinks
/sync-claude --unlink

# Ver estado actual
/sync-claude --status
```

## Ejecución

$ARGUMENTS contiene las opciones adicionales.

```bash
bun .claude/skills/sync-claude/scripts/sync-claude.ts $ARGUMENTS
```
