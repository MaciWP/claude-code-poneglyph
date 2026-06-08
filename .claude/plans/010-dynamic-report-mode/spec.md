---
id: 010-dynamic-report-mode
created: 2026-06-08
approved: 2026-06-08
closed: 2026-06-08
mode: full
phase: 1
status: closed
---

# Problema

Los informes visuales que produce hoy `html-report` (en especial el template `glance`) se quedan cortos: se perciben pobres/genéricos, sin visualización de datos real, con jerarquía plana (todo cajas iguales) — no impresionan al **ver, presentar o compartir**. La raíz no es el medio (HTML), es la **ejecución del diseño** y un **proceso de generación caro/inconsistente** (se reescribe el HTML a mano en cada informe).

# Resultado esperado

- Un informe HTML **único y self-contained** que abre en local en PC y móvil sin build ni servidor, y se ve **notablemente más elegante y profesional** que el `glance` actual (el cambio se nota a simple vista).
- El informe es **dinámico**: visualización de datos real e interactiva, navegación que ayuda a leer/presentar, y filtrado/búsqueda en vivo — degradando a estático legible cuando no hay JS.
- La generación es **consistente y de bajo coste de tokens** (el "cómo" se decide en Phase 2).

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given el `.html` generado, when se abre con la red desactivada en viewport desktop Y móvil (≤400px), then renderiza completo (salvo webfonts) y es legible/usable en ambos.
- **AC2**: Given un informe con datos cuantitativos, when se renderiza, then muestra **≥2 visualizaciones de datos reales** (no solo una barra) con **tooltip al hover**, y **degradan a estático legible sin JS** (fallback).
- **AC3**: Given el informe en móvil, when el usuario hace scroll, then hay **índice sticky con scrollspy** (sección activa marcada) y **secciones colapsables** operativas.
- **AC4**: Given una lista/tabla de items, when el usuario filtra o busca, then la vista se actualiza **en vivo**; sin JS, la lista completa sigue visible.
- **AC5**: Given el render, then **no toda la página son cajas idénticas** (jerarquía tipográfica/editorial diferenciada) y el **contraste de texto body ≥4.5:1** en claro y oscuro.
- **AC6**: Given comparación lado a lado con el `glance` actual, when un humano lo evalúa, then la mejora en data-viz, jerarquía y pulido es **evidente** (validación humana, no grep).
- **AC7**: Given el approach de generación elegido en Phase 2, when se genera un informe, then el coste en **tokens es ≤** al de escribir el HTML a mano hoy — o, si sube, se documenta un trade-off de calidad que lo justifique.

> Mínimo 3 ACs (modo full): 7. AC6/AC7 son validación humana / medición (no grep) — declarado explícitamente.

# Out of scope (explícito)

- **Export multi-formato** (docx/pptx vía Pandoc) — diferido; no en este MVP.
- **PDF de imprenta** (Typst): evaluado contra el criterio tokens/calidad del usuario → la ruta barata `@media print` → "Imprimir→PDF" del navegador ya cubre el caso a 0 tokens; Typst (calidad muy superior pero estático + binario ausente) queda diferido a un futuro feature.
- **Modo slides/deck** (reveal/Marp) — es otro producto (presentación), no informe long-form.
- **Rehacer** los templates `report` / `dashboard` / `decision`.
- **Migrar de medio** (a framework/PDF/slides) — descartado: HTML self-contained es el único que cumple todos los constraints (ver Modelo conceptual).
- **Feature 008** (agent-spawn-policy) — ortogonal, no se toca.

# Constraints

- **Artefacto**: 1 fichero HTML self-contained; abrir-y-funcionar sin build/servidor para el consumidor.
- **Responsive**: PC + móvil (la navegación/colapsables son clave en móvil).
- **JS permitido** pero con **fallback estático** (el documento degrada a legible sin JS).
- **Compatibilidad**: `bun test ./.claude/hooks/` sigue 100/100 (no toca hooks).
- **Entorno de generación** (verificado 2026-06-08, input para Phase 2): `node`/`npx`/`bunx`/`bun`/`python3`/`pandoc` presentes; `typst`/`weasyprint`/`chromium` ausentes.
- **Bajo coste de tokens** de generación = prioridad declarada del usuario.

# Stakeholders

- **Oriol** — genera, presenta y comparte los informes; decide el gate; valida AC6 (el "se nota").

# Open questions

> Decisiones técnicas registradas para Phase 2 (NO resueltas aquí — pertenecen al tech-plan):

1. **Approach de generación**: ¿generador determinista (script toma datos + plantilla/tokens → emite HTML) vs HTML a mano? Recomendación de scope: generador (baja tokens + consistencia). A stress-testear en Phase 2.
2. **Forma de entrega**: el usuario pidió "mezcla" — ¿template nuevo `dynamic` + evolución del existente? Resolver el límite exacto en Phase 2.
3. **Theme toggle claro/oscuro**: ¿incluir? (el `glance` es dark-only; sería un toque de elegancia). Decidir en build si aporta sin coste desproporcionado.
4. **Criterio del híbrido de charts**: cuándo usar la vía de mayor calidad (gen-time, requiere red 1 vez) vs el fallback a mano. Definir umbral en Phase 2.

# Modelo conceptual / Detalle técnico

> Decisiones arquitectónicas pre-tasks (modo full). Input del trabajo ya hecho esta sesión: crítica del `glance` (3 MAJOR: data-viz nula, monotonía de cajas, contraste/eyebrows) + research de 14 proyectos verificado vía `gh api`.

- **Principio rector**: la calidad viene de la **ejecución**, no del medio. No se migra de HTML; se mejora cómo se ejecuta y cómo se genera.
- **Borrows de referencia (a concretar en Phase 2)**: jerarquía editorial estilo Tufte (sidenotes/margin-notes, romper la cuadrícula de cajas); charts con calidad grammar-of-graphics (defaults de Observable Plot, vía híbrida); callouts semánticos restrained estilo Quarto. Mantener el **ban de Rough.js** (sketchy viola el anti-slop del propio skill).
- **Decisión de medio (cerrada en scope)**: HTML+CSS+JS self-contained. Slides/PDF/frameworks descartados por incumplir "1 fichero dinámico abrir-y-funcionar PC+móvil".
- **Decisión de proceso (abierta → Phase 2)**: generador determinista vs a mano — el eje de mayor impacto en tokens/consistencia.
- **Corrección de mantenimiento incluida**: `references/visuals-svg-first.md` declara `node/npx/bunx` ausentes ("verified 2026-06-03"); verificado 2026-06-08 que SÍ están (+ `pandoc`). Actualizar ese fact forma parte del feature (Cmd X/II).
