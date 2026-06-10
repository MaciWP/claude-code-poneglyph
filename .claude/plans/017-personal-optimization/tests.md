---
spec: 017-personal-optimization
tasks: tasks/
created: 2026-06-10
phase: 2.5
status: draft
test_mode: tdd
tdd_policy: auxiliary
---

# Test specs per HU (TDD-mode)

## ¿Por qué TDD-mode?

US4/US11/US12 producen o modifican código ejecutable de hooks (`.ts` con lógica de stdin, matching y escritura). Oracle binario natural — cada test falla en rojo antes de implementar. Los tres llevan `tdd: forced` (la política `auxiliary` lo permite por nodo: hooks nuevos con lógica no trivial).

## US4 — tests (fix auto-approve + testabilidad)

### T4.1 — auto-approve procesa payload vía readHookStdin

- **Type**: unit
- **Pre-condition**: funciones de auto-approve.ts exportadas; payload PermissionRequest válido como entrada
- **Action**: `import { decidePermission } from '../auto-approve'; decidePermission(parsedPayload)`
- **Assert**: devuelve la decisión esperada (allow/passthrough) para un payload de herramienta permitida
- **Must fail before impl (red)**: `SyntaxError: The requested module '../auto-approve.ts' does not provide an export named 'decidePermission'` (hoy nada se exporta; lógica solo alcanzable vía import.meta.main)

### T4.2 — stdin malformado no cuelga ni crashea

- **Type**: unit
- **Pre-condition**: entrada vacía o JSON inválido simulada a través del contrato readHookStdin
- **Action**: `decidePermission(safeParse(''))` (ruta de payload inválido)
- **Assert**: salida silenciosa/no-decisión, exit limpio — nunca excepción no capturada ni espera infinita
- **Must fail before impl (red)**: mismo `SyntaxError` de export ausente; tras exportar, assertion `expected graceful no-op, got thrown TypeError` si el parse no está protegido

### T4.3 — guard de regresión del patrón stdin

- **Type**: unit (estático)
- **Pre-condition**: fichero auto-approve.ts en disco
- **Action**: leer el fuente y comprobar uso del helper compartido
- **Assert**: contiene `readHookStdin(` y NO contiene `Bun.stdin.text()`
- **Must fail before impl (red)**: `expected 0 occurrences of "Bun.stdin.text()", found 1 (line 70)`

## US11 — tests (learning-inbox hook)

### T11.1 — payload con señal produce entrada bien formada

- **Type**: unit
- **Pre-condition**: inbox inexistente; payload Stop simulado conteniendo una señal de corrección detectable
- **Action**: `import { extractCandidates, appendToInbox } from '../learning-inbox'; appendToInbox(extractCandidates(payload), tmpInbox)`
- **Assert**: tmpInbox existe y la entrada contiene tipo + confidence + contexto de origen (formato documentado en el header del hook)
- **Must fail before impl (red)**: `Cannot find module '../learning-inbox'` (el fichero no existe)

### T11.2 — payload sin señales = silencio

- **Type**: unit
- **Pre-condition**: payload Stop sin señales
- **Action**: `extractCandidates(payload)`
- **Assert**: devuelve lista vacía y NO se escribe ningún fichero
- **Must fail before impl (red)**: `Cannot find module '../learning-inbox'`

### T11.3 — inbox ausente se crea en el primer append

- **Type**: unit
- **Pre-condition**: directorio `learned/` no existe
- **Action**: `appendToInbox([candidate], tmpPath)`
- **Assert**: directorio + fichero creados; entrada única bien formada
- **Must fail before impl (red)**: `Cannot find module '../learning-inbox'`

## US12 — tests (skill-activation + InstructionsLoaded)

### T12.1 — prompt con match inyecta instrucción explícita

- **Type**: unit
- **Pre-condition**: lista de skills con keywords cargada de disco (fixture)
- **Action**: `import { matchSkills, buildInjection } from '../skill-activation'; buildInjection(matchSkills('valida este plan', skills))`
- **Assert**: salida contiene `Skill(drillme)` (o la skill correspondiente al fixture) y tiene ≤5 líneas
- **Must fail before impl (red)**: `Cannot find module '../skill-activation'`

### T12.2 — prompt sin match no inyecta nada

- **Type**: unit
- **Pre-condition**: fixture de skills
- **Action**: `matchSkills('hola buenos días', skills)`
- **Assert**: lista vacía → `buildInjection([])` devuelve cadena vacía / sin output
- **Must fail before impl (red)**: `Cannot find module '../skill-activation'`

### T12.3 — payload malformado sale silencioso

- **Type**: unit
- **Pre-condition**: stdin con JSON inválido vía contrato readHookStdin
- **Action**: ruta principal del hook con payload inválido
- **Assert**: exit 0 sin output ni excepción
- **Must fail before impl (red)**: `Cannot find module '../skill-activation'`

## Property-based (opt-in)

Omitido — ninguna HU tiene invariantes de parser/transformación pura que lo justifiquen (matching por keywords es tabla-dirigido, cubierto por ejemplos). Añadirlo sería coverage padding.
