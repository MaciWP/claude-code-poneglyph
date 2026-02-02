# Config Scope Rule

## Arquitectura de Dos Niveles

```
┌────────────────────────────────────────┐
│ Nivel 1: GLOBAL (Poneglyph)            │
│ ~/.claude/ ← symlink a Poneglyph       │
│ • Orquestación base                    │
│ • Agentes, skills, rules, hooks        │
└────────────────────┬───────────────────┘
                     │ se combina con
┌────────────────────▼───────────────────┐
│ Nivel 2: PROYECTO (Especialización)    │
│ ./CLAUDE.md ← del proyecto destino     │
│ ./.claude/  ← extensiones locales      │
│ • Contexto de dominio                  │
│ • Agentes/skills específicos           │
└────────────────────────────────────────┘
```

## Reglas

| Contexto | Modificar | Dónde |
|----------|-----------|-------|
| Orquestación base | Poneglyph | `D:\PYTHON\claude-code-poneglyph\` |
| Especialización | Proyecto destino | `./.claude/` del proyecto |

## Importante

- **Poneglyph** = origen de la orquestación (versionado en git)
- **~/.claude/** = symlink que propaga la base
- **Cada proyecto** = puede tener su propio `CLAUDE.md` + `.claude/`
- **Claude Code** = carga y combina AMBOS niveles
