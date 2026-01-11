# Code Review

**Scope**: Solo evaluar codigo cambiado.

| Area | Regla |
|------|-------|
| Libraries | Usar completamente, delegar tests a ellas |
| Complexity | Solucion mas simple que funcione |
| Style | Respetar estilo del proyecto |
| Comments | YOLO - codigo auto-explicativo. NO borrar comments existentes |
| Architecture | routes -> services -> data. DI patterns |
| Imports | File-level only. Named exports > default |
| Types | Todos params/returns tipados. `interface` > `type`. `unknown` > `any` |
| Async | try/catch obligatorio. `Promise.all` para paralelo |
| Errors | Tipos especificos, mensajes utiles, logging |
| Security | Validar input, sanitizar, env vars para secrets |
| Tests | Solo logica custom. `bun test`. Files: `*.test.ts` |
