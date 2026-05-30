---
spec: 003-html-report-skill
phase: 5
review_verdict: APPROVED
feature_closed: true
created: 2026-05-29
---

# Retro — 003 html-report-skill

## What worked
- **Dogfood-first reveló el gap real**: renderizar 002 → HTML destapó que los templates (no el corpus) eran el punto débil. El dogfood pagó.
- **Reference-driven convergencia**: una vez el usuario señaló shadcn/ui + Raycast + Geist, v7/v8 convergieron rápido. Antes (v1-v6) iteraba a ciegas.
- **Color = información** como diferenciador sobre shadcn (neutro): score health en KPIs tipo-nota, conteos neutros.
- **Bake a la template**: el diseño v8 ahora vive en `dashboard.template.html` → futuros informes lo heredan.

## Friction (lecciones)
- **8 iteraciones visuales (v1→v8)**. Lección dura: el Lead NO percibe lo visual — grep valida estructura/datos, NO taste. **Pedir una referencia visual al usuario en la 1ª-2ª iteración**, no en la 6ª, habría ahorrado ~5 vueltas.
- Self-contained-puro vs fuentes elegantes: tensión real. Resuelto a favor de web fonts (nivel cliente) con caveat documentado.

## Promotions (aplicadas / pendientes)
| Item | Estado |
|---|---|
| Diseño v8 (KPI cards, color=info, Geist, dark-first) → `dashboard.template.html` + tokens.css | ✅ aplicado (bake) |
| Lección "pedir referencia visual temprano" → memoria feedback | pendiente (anotar) |
| `components.html` C9 kpi-card-row (galería) | residual menor |

## Commandments
I (honestidad: acepté "es horrible/cutre" sin defender) · III (markdown-mode crítica, sin JS) · VIII (frontend-design + corpus) · X (un solo design family decide+html-report; tokens fuente única).

## Closure
7/7 AC, APPROVED. Olas B/C quedan como features futuras. Lifecycle 003 CERRADO.
