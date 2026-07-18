# Prompt snippets (optional)

These are **examples** of how to talk about the tool. Adapt freely; nothing here is required.

## ES — preguntar capacidades

```
Consulta AGENTS.md / skill worktrees-bjumper de worktrees-bjumper.
DEVENV_ROOT=/path/to/worktrees-bjumper
Explícame qué comandos tengo, parámetros, pros/contras y precauciones
para lo que quiero hacer: <describe la tarea>.
No asumas un flujo fijo.
```

## ES — crear sandbox si hace falta

```
DEVENV_ROOT=…
Si no hay un entorno usable para la rama feature/JRV-123, crea uno con
devenv (repos que hagan falta). Si ya existe algo adecuado, reutilízalo.
Dime ports y worktrees. No borres nada sin preguntar.
```

## EN — inspect only

```
DEVENV_ROOT=…
Using devenv.py, list environments as JSON and summarize ports/servers.
Do not create or remove anything.
```

## EN — cleanup when asked

```
Remove devenv environment <name> with --yes only if I confirmed.
Keep git branches unless I say otherwise.
```
