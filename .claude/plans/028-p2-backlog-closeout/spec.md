---
id: 028-p2-backlog-closeout
created: 2026-07-08
approved: 2026-07-08
mode: standard
phase: 1
status: closed
---

# Problema

El backlog P2 de la auditoría v2 (2026-07-02) acumula findings verificados sin ejecutar: el gate de seguridad del critic despacha un skill cuyo nombre colisiona con el built-in nativo (el modelo ve el nativo, confirmado en sesión), `minimumVersion` deja pasar versiones de CC anteriores al fix de rules simlinkadas, learning-inbox genera ruido y escribe en repos sin protección de gitignore con un split sin documentar frente a la auto-memory nativa, dos capacidades nativas útiles (Stop `additionalContext`, `Skill(verify)`) siguen sin cablear, y quedan tres flecos menores (cita dudosa SK-07, resumabilidad D6, defaults stale de RI-3).

# Resultado esperado

- El skill propio de seguridad tiene **identidad no colisionante**: el gate del critic lo despacha inequívocamente y su superficie de activación vuelve a llegar al modelo.
- El **suelo de versión** de CC cubre los fixes de los que depende la capa global (rules condicionales vía symlink), con la relación `minimumVersion`↔`requiredMinimumVersion` verificada y documentada.
- **learning-inbox saneado**: los repos externos no arriesgan commitear transcripts, las capturas dejan de ser ruido (truncados mid-word, confianza ínfima), y el reparto de responsabilidades con la auto-memory nativa queda escrito donde se mantiene el hook.
- Los avisos del **security-gate llegan al modelo** (no solo al usuario) para corregir en el propio turno; la verificación end-to-end nativa (`verify`) queda cableada en los puntos donde la doctrina exige probar comportamiento real.
- Los tres flecos cerrados o justificados: cita SK-07, marcador de fase 2.5 en la maquinaria de estado, defaults de ultracode-audit.

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given el rename aplicado, when se lista la superficie model-facing de skills, then la descripción es-ES del skill propio aparece (no la del built-in) y `grep` de dispatchers (critic/flow/paths) → 0 referencias al nombre viejo en capa viva.
- **AC2**: Given settings.json, when se lee el gate de versión, then ≥2.1.198 y la decisión minimumVersion-vs-requiredMinimumVersion está anotada con fuente.
- **AC3**: Given learning-inbox saneado, when corre sobre fixtures de captura (transcript con corrección real vs ruido), then las capturas basura de la clase documentada (truncado mid-word / confianza <umbral) no entran al inbox — con test; y project-onboard propone `.claude/learned/` en el gitignore de proyectos nuevos.
- **AC4**: Given un warning de secreto del security-gate, when termina el turno, then el modelo recibe `additionalContext` accionable (test del payload) además del aviso al usuario.
- **AC5**: Given la doctrina, when se lee §Post-implementation verification y el critic, then `Skill(verify)` está cableado para cambios con superficie de runtime.
- **AC6**: Given los flecos, when se revisan, then SK-07 resuelto (cita corregida o justificada), D6 cerrado o descartado con motivo, RI-3 defaults apuntando a layout vivo. Suites verdes en todo.

# Out of scope (explícito)

- **Los trials CG-03/04/09/10** (auto-approve vs classifier nativo, critic sobre /code-review, sandbox nativo, best-of-n en background): cada uno exige experimentación viva y evaluación propia — meterlos aquí convertiría un closeout en un research. Quedan como backlog de trials, uno por sesión si se quieren.
- P3 cross-repo (limpieza binora/cv, cierre de sus lifecycles) — tu tejado, comandos ya entregados.
- Baseline de evals (acción del usuario fuera de sandbox) y validación conductual post-Fable (primera sesión con Opus).
- Rediseños de los hooks más allá de lo listado (nada de re-arquitectura de learning-inbox: sanear, no reescribir).

# Constraints

- Rename con barrido completo de dispatchers (fix-la-clase): la colisión se resuelve del todo o no se toca.
- learning-inbox: sanear el filtro/captura existente, cambios con tests (hay suite previa).
- Convenciones de capas intactas (es-ES superficie / EN cuerpo; hooks sin imports de fuera de hooks/).
- Suites verdes en cada cierre de HU; settings = `sensitive:`.

# Stakeholders

- **Oriol** — ratifica gates; decide el nombre nuevo del skill en Fase 2.
- **El Lead post-Fable** — consumidor del gate de seguridad desambiguado y de los avisos in-turn.

# Open questions

- Ninguna tras drillme (saturado): el único punto abierto real —nombre nuevo del skill— es decisión técnica de Fase 2 con propuesta que ratificarás en el gate 2→3.
