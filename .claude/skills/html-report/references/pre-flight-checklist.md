# Pre-flight checklist (quality gate)

Run before declaring any `html-report` render done. **Gate semantics: if any item fails, the output is NOT done** — fix or justify. Items trace to `taste-hard-rules.md` and `anti-slop.md` (no novel rules here).

## Typography
- [ ] Body line length 45–75ch (`max-width: 65ch`)
- [ ] No font weight below 400; headings 500–600
- [ ] One modular type scale (consistent ratio)
- [ ] Tabular numerals on every data column
- [ ] No long-form paragraph centered

## Color & contrast
- [ ] Body text contrast ≥ 4.5:1; large text / UI ≥ 3:1 (both light AND dark mode)
- [ ] No untinted `#808080` grey; neutrals tinted
- [ ] No grey text on a colored background
- [ ] No purple/indigo gradient; one restrained non-purple accent
- [ ] No pure `#000` / `#fff`

## Spacing & layout
- [ ] All spacing on the 4px scale
- [ ] More space between groups than within
- [ ] No cards-in-cards; not everything wrapped in a container
- [ ] Not everything centered (intentional alignment)

## Depth
- [ ] All shadows share one light-source offset ratio
- [ ] Shadows hue-matched (not semi-transparent black)

## Motion (if any)
- [ ] Each animation has a stated purpose
- [ ] Component animations ≤ 300ms; easing by direction (out/in/in-out)
- [ ] Animates only `transform` + `opacity`
- [ ] `prefers-reduced-motion` path present
- [ ] Theme switch triggers no transition

## Accessibility
- [ ] State conveyed by text/label, not color alone
- [ ] Charts/figures carry `role="img"` + `aria-label`

## Anti-slop sweep
- [ ] Zero items from `anti-slop.md` Absolute Bans present
- [ ] No em-dash decoration; no fake-precise stats / "Jane Doe" filler
- [ ] No icon-tile-above-every-heading / equal 3-col grid default

## Self-contained (html-report invariants)
- [ ] Single inlined `<style>`; the only allowed external request is one Google Fonts `<link>` (v1.2.0 client-grade). For pure-offline: omit it and confirm the system-stack fallback renders.
- [ ] `report.template`: dark/light both render. `dashboard.template`: dark-first + print-light (no OS flip, by design). Print stylesheet intact in both.
