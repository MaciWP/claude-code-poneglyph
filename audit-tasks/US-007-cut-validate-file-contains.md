---
id: US-007
phase: 2.1
status: completed
completed_at: 2026-05-23
estimate: 15m
blocks: []
blockedBy: []
priority: low
risk: very-low
---

# US-007 · CUT código muerto `validators/stop/validate-file-contains.ts`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** eliminar el archivo `validate-file-contains.ts` que existe en disco pero no está registrado
**Para** reducir código muerto y prevenir confusión sobre qué hooks están activos

## Contexto extendido

### Evidencia recogida

- El archivo `.claude/hooks/validators/stop/validate-file-contains.ts` existe físicamente
- **NO** aparece registrado en `.claude/settings.json` como hook activo
- No hay otra forma de ser invocado: los hooks solo se activan vía `settings.json`
- Es código sin ejecutar = código muerto por definición

### Por qué importa (aunque sea menor)

- **Confusión**: cualquiera revisando `.claude/hooks/` asume que todo lo que está ahí es activo
- **Mantenimiento implícito**: si alguien modifica los imports compartidos del directorio `validators/`, este archivo podría romperse silenciosamente o introducir cambios "para alinear" sin razón real
- **Commandment X**: la limpieza del meta-sistema es parte de la auditoría
- **Riesgo mínimo**: por definición, nada depende de un código no invocado

## Análisis — pros y contras

### Pros de cortar

- **Limpieza pura**: -1 archivo de código muerto
- **Reduce confusión** sobre qué hooks están activos
- **Coherente con la auditoría**: si quitamos hooks vivos pero zombis (US-005, US-006), también quitamos los muertos físicos
- **Cero riesgo de regresión**: si nada lo ejecuta, nada se rompe al quitarlo

### Contras de cortar

- **Si era un draft "para activar luego"**: pierdes el work-in-progress
- **Si fue intencional como utilitario compartido**: hay que confirmar que no lo es

### Mitigación de contras

- Antes de cortar: verificar si otros archivos lo importan
- Si es draft: convertirlo en TODO con fecha (issue/comment), no en archivo dormido

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Otro archivo lo importa como utilidad compartida | Muy baja (está en `/validators/stop/` que sugiere hook directo) | Bajo | Grep antes de cortar |
| Era un work-in-progress del usuario | Baja | Bajo | Si el archivo tiene TODO/FIXME/draft, NO cortar — convertir en issue |
| Tests existen y dependen del archivo | Baja | Bajo | Buscar test asociado y co-eliminar |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar el archivo (5 min)

```bash
Read .claude/hooks/validators/stop/validate-file-contains.ts
```

**Buscar señales de "work in progress"**:
- TODO / FIXME / WIP en comentarios
- Funciones sin implementar (`throw new Error("not implemented")`)
- Estructura placeholder

**Buscar señales de "utilitario compartido"**:
- `export` de funciones / clases
- Naming sugerente de utility (helpers, utils, lib)

**Buscar señales de "código completo pero no activado"**:
- Implementación coherente
- Estructura igual a otros hooks

### Paso 2 — Verificar importadores (5 min)

```bash
Grep "validate-file-contains" .claude/      # quién lo importa
Grep "validateFileContains" .claude/        # función exportada posible
Grep "validators/stop" .claude/             # uso del path
```

**Decisión basada en resultado**:

| Resultado | Acción |
|---|---|
| 0 importadores, archivo completo | CUT |
| 0 importadores, archivo WIP/draft | NO cortar — abrir issue o comentar la intención |
| 1+ importadores | NO cortar — re-evaluar la afirmación "no está registrado" |

### Paso 3 — Eliminar el archivo (1 min, si Paso 2 → CUT)

```bash
Bash: rm .claude/hooks/validators/stop/validate-file-contains.ts
```

### Paso 4 — Verificar tests (2 min)

```bash
Glob .claude/hooks/__tests__/validate-file-contains*  # buscar test asociado
```

Si existe: eliminar también.

```bash
Bash: bun test ./.claude/hooks/
```

Debe pasar.

### Paso 5 — Commit (2 min)

```
refactor(hooks): remove dead validate-file-contains.ts

Not registered in settings.json, no importers found.
Was occupying space in .claude/hooks/validators/stop/ giving
false impression of an active hook.
```

## Criterios de aceptación

- [ ] Archivo `.claude/hooks/validators/stop/validate-file-contains.ts` no existe
- [ ] `Grep "validate-file-contains" .claude/` → 0 resultados
- [ ] Tests asociados (si existían) eliminados
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Archivo eliminado
2. Tests pasan
3. Commit con mensaje claro
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
```

Trivial — no hay nada que dependa del archivo.

## Notas

- Esta historia es deliberadamente pequeña y de bajo riesgo, ideal para "calentamiento" al empezar Fase 2
- Si en el Paso 2 se descubre que el archivo SÍ se importa, **NO cortar** — eso significa que la afirmación inicial era incorrecta y hay que re-investigar
- Si se descubre WIP, **convertir en GitHub Issue o TODO comentado en código adyacente** antes de eliminar — no perder la intención sin documentar

## Log de ejecución (2026-05-23)

### Premisas re-validadas

| Premisa | Esperado por HU | Medido | Match |
|---|---|---|---|
| 1: Existe físicamente | sí | sí, `.claude/hooks/validators/stop/validate-file-contains.ts` (147 líneas, 4310 bytes) | ✓ |
| 2: NO registrado en `settings.json` | no registrado | 0 hits de `validate-file-contains` en `.claude/settings.json` | ✓ |
| 3: Sin importadores | 0 referencias | 0 importadores en código; menciones solo en docs/backlog (`PONEGLYPH-AUDIT.md`, `audit-tasks/`, `README.md`); 0 hits del símbolo `validateFileContains` fuera del propio archivo | ✓ |
| 4: Código completo no-WIP | completo | implementación coherente sin TODO/FIXME/WIP, sin `export` (script puro con `main()`) | ✓ |

### Anatomía del archivo eliminado

- **Path**: `.claude/hooks/validators/stop/validate-file-contains.ts`
- **Bytes**: 4310
- **Líneas**: 147
- **Símbolos exportados**: ninguno (script ejecutable con `#!/usr/bin/env bun`, sin `export`)
- **Comentarios TODO/FIXME/WIP**: ninguno
- **Función**: validador stop-hook que verificaba `VALIDATE_FILE_PATH` contra `VALIDATE_CONTAINS` (strings literales) o `VALIDATE_PATTERNS` (regex), todo configurable por env vars. Implementación completa pero nunca registrada.
- **Historia git**:
  - `38132c8` — feat: add stop hooks, browser-qa agent, playwright skill, and fix lint-staged (creación)
  - `be4d715` — fix: add stop_hook_active guard to all Stop/SubagentStop hooks (mantenimiento mecánico que tocó este archivo por estar en el directorio `validators/stop/`, no porque estuviera en uso)

### Tests asociados

Ninguno. `Glob .claude/hooks/__tests__/validate-file-contains*` y `Glob .claude/hooks/**/*validate-file-contains*.test.ts` no encontraron resultados.

### Cascade de referencias actualizadas

Ninguna referencia activa en código. Todas las menciones de `validate-file-contains` están en docs históricos/backlog (`PONEGLYPH-AUDIT.md`, `audit-tasks/README.md`, `audit-tasks/US-007-*.md`, `audit-tasks/US-023-*.md`, `audit-tasks/US-024-*.md`) y se mantienen intactas — son contexto válido de la auditoría, no referencias vivas al archivo.

### Verificaciones post

- `bun test ./.claude/hooks/`: baseline 139 pass / final 139 pass (sin tests co-eliminados)
- `Grep validate-file-contains .claude/`: 0 hits (post-CUT)
- HEAD pre-cambio: `69592a0a3614e899e3fb85b9f9185af008a15f0c`

### Decisiones tomadas

- Las menciones de `validators/stop` en `settings.json:94` y `agents/builder.md:17` apuntan a `validate-tests-pass.ts` (otro archivo, vivo y registrado), NO a `validate-file-contains.ts`. Confirmado por lectura directa de las líneas — no es referencia indirecta.
- El commit `be4d715` modificó este archivo recientemente, pero fue un cambio mecánico aplicado a "todos los Stop/SubagentStop hooks" del directorio, no evidencia de uso activo. La premisa 2 (no registrado) sigue siendo la verdad de campo.
- No hubo símbolos `export`, así que no fue necesario un grep adicional buscando símbolos individuales — el archivo no podía ser importado como utilidad compartida ni siquiera teóricamente.
