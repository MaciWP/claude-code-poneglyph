---
id: US-012
phase: 2.3
status: completed
estimate: 45m
blocks: [US-020]
blockedBy: []
priority: medium
risk: low
---

# US-012 · CUT 6 skills `meta-create-*` (absorbidas por agent `extension-architect`)

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** eliminar las 6 skills `meta-create-*` y consolidar su lógica en el agent `extension-architect`
**Para** no tener 6 skills + 1 agent para el mismo propósito ("crear extensiones de Claude Code")

## Contexto extendido

### Evidencia recogida

Las 6 skills:
| Skill | Función |
|---|---|
| `meta-create-agent` | Genera nuevos subagents desde templates |
| `meta-create-skill` | Genera nuevas skills desde templates |
| `meta-create-hook` | Genera nuevos hooks desde templates |
| `meta-create-rule` | Genera nuevas rules desde templates |
| `meta-create-mcp` | Configura MCP servers |
| `meta-create-plugin` | Crea plugins (bundled skills/agents/hooks) |

Más el agent existente:
| Agent | Función |
|---|---|
| `extension-architect` | Crea/gestiona agents, skills, hooks, MCP configurations |

**Solapamiento**: el agente `extension-architect` cubre el mismo dominio que las 6 skills. La función de "generar boilerplate de extensión" puede vivir en uno u otro lugar, pero no en ambos.

### Frecuencia de uso esperada

Crear nuevas extensiones es una actividad **infrecuente** (semanal en máximo). No es trabajo de cada turno. Mantener 6 skills cargadas en system prompt para esto es desperdicio de contexto.

### Por qué importa

- **6 × ~110 líneas = ~660 líneas** de templates que viven en system prompt cada turno
- **Bloat en matching de skills**: 6 descripciones que casi nunca se necesitan diluyen el matching de otras skills útiles
- **El agente `extension-architect` ya existe** y es el lugar lógico para esta lógica
- **Commandment X**: el meta-sistema no debería tener 6 + 1 piezas para una misma capacidad

## Análisis — pros y contras

### Pros del corte

- **Reduce ~660 líneas** de system prompt
- **Mata 6 descripciones** que compiten por matching con las útiles
- **Centraliza la lógica** en `extension-architect` (lugar más natural)
- **Frecuencia de uso baja** justifica la centralización: cuando crees una extensión nueva, llamas explícitamente al agent, no esperas que se auto-active
- **Consistente con el patrón del replanteo**: cortar lo redundante

### Contras del corte

- **El agent `extension-architect` debe absorber la lógica** — eso es US-020 (que depende de esta)
- **Si las 6 skills tienen templates específicos (e.g. agent.md template con frontmatter exacto)**, hay que migrar esos templates al agent o a una carpeta de templates
- **Pérdida de auto-activación**: si pedías "crea un nuevo hook X" y la skill se activaba sola, ahora hay que invocar explícitamente el agent

### Mitigación de contras

- Los templates se migran a `.claude/templates/` o quedan dentro del agent
- El agent puede tener triggers en su description que cubran los casos comunes
- US-020 (siguiente historia lógica) se encarga de la absorción

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Las 6 skills contienen plantillas únicas que se pierden | Media | Medio | Antes de cortar, leer cada skill y extraer templates a `.claude/templates/<tipo>.md` |
| El agente `extension-architect` no está preparado para 6 dominios | Alta | Bajo | Esta historia es bloqueante de US-020 — el agent se actualiza en esa |
| Tras cortar, no hay forma de invocar la funcionalidad porque el agent no es trivial de descubrir | Media | Bajo | Documentar en CLAUDE.md raíz (US-022) cómo invocar |
| Hay scripts que invocan las skills programáticamente | Baja | Bajo | Grep antes de cortar |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar las 6 skills (15 min, ~2 min cada una)

Para cada skill:
```bash
Read .claude/skills/meta-create-agent/SKILL.md
Read .claude/skills/meta-create-skill/SKILL.md
Read .claude/skills/meta-create-hook/SKILL.md
Read .claude/skills/meta-create-rule/SKILL.md
Read .claude/skills/meta-create-mcp/SKILL.md
Read .claude/skills/meta-create-plugin/SKILL.md
```

**Identificar en cada una**:
- ¿Templates literal (frontmatter ejemplo, structure)?
- ¿Lógica única (validaciones, checks)?
- ¿Referencias externas (docs, esquemas)?

### Paso 2 — Extraer templates (10 min)

Si las skills contienen templates literales (la mayoría sí), crear `.claude/templates/`:

```bash
.claude/templates/
├── agent.md       (frontmatter ejemplo + estructura)
├── skill.md       (idem)
├── hook.ts        (idem)
├── rule.md        (idem)
├── mcp.json       (idem)
└── plugin.md      (idem)
```

Estos templates son LIVING — el agent `extension-architect` los lee cuando crea algo nuevo. No vuelven a estar en system prompt.

### Paso 3 — Eliminar las 6 skills (5 min)

```bash
Bash: rm -rf .claude/skills/meta-create-agent
Bash: rm -rf .claude/skills/meta-create-skill
Bash: rm -rf .claude/skills/meta-create-hook
Bash: rm -rf .claude/skills/meta-create-rule
Bash: rm -rf .claude/skills/meta-create-mcp
Bash: rm -rf .claude/skills/meta-create-plugin
```

### Paso 4 — Verificar referencias huérfanas (5 min)

```bash
Grep "meta-create" .claude/
Grep "meta-create" CLAUDE.md
Grep "meta-create" C:\Users\Maci\.claude\CLAUDE.md
```

Lista de archivos a actualizar:
- Probablemente CLAUDE.md raíz (US-022)
- Posible mención en `orchestrator-protocol` skill (al referir agentes meta)
- Posible mención en `extension-architect` agent (que ya las menciona como skills hermanas)

Updates puntuales: hacer en US-020.

### Paso 5 — Tests (3 min)

```bash
Bash: bun test ./.claude/hooks/
```

No debe afectar — las skills no tienen tests propios típicamente.

### Paso 6 — Commit (5 min)

```
refactor(skills): cut 6 meta-create-* skills (absorbed by extension-architect)

- Templates extracted to .claude/templates/<type>.md (living, read on demand)
- 6 × ~110 lines (~660 total) removed from system prompt
- Functionality preserved via extension-architect agent (updated in US-020)

Rationale: extension creation is infrequent (~weekly at most).
Keeping 6 skills loaded every turn wastes context window.
```

## Criterios de aceptación

- [ ] `.claude/skills/meta-create-*` (6 carpetas) no existen
- [ ] `.claude/templates/` creada con 6 archivos (1 por tipo) — si las skills contenían templates
- [ ] `Grep "meta-create" .claude/` → solo referencias documentales (a actualizar en US-020/US-022) o cero
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. 6 carpetas de skills eliminadas
2. Templates extraídos a `.claude/templates/`
3. Referencias huérfanas listadas (a tratar en US-020/US-022)
4. Tests pasan
5. Commit con mensaje claro
6. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura las 6 skills + elimina templates añadidos
```

Sin riesgo de pérdida — todo está en git history.

## Notas

- US-020 es el complemento de esta historia: ahí se actualiza el agent `extension-architect` para usar los templates y manejar los 6 tipos
- Ambas historias pueden hacerse juntas en el mismo commit si es más cómodo conceptualmente — pero por separar responsabilidades y commits, mejor secuenciar
- Si en Paso 1 alguna skill resulta tener lógica realmente única (no es solo template), evaluar:
  - Llevar esa lógica al agent `extension-architect`
  - O mantener esa skill específica si la lógica es ortogonal al agent
- Por ejemplo, `meta-create-plugin` puede tener lógica de bundling que no es trivial — verificar si justifica mantenerse separada
