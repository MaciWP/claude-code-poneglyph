---
name: react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - react performance
    - next.js
    - nextjs
    - vercel
    - bundle size
    - waterfall
    - rendering
    - react optimization
    - server components
    - data fetching
for_agents: [builder, reviewer]
version: "1.0.0"
license: MIT
metadata:
  author: vercel
---

# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Contains 45 rules
across 8 categories, prioritized by impact to guide automated refactoring and code generation.

## When to Apply

Reference these guidelines when:

- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category                  | Impact      | Prefix       |
|----------|---------------------------|-------------|--------------|
| 1        | Eliminating Waterfalls    | CRITICAL    | `async-`     |
| 2        | Bundle Size Optimization  | CRITICAL    | `bundle-`    |
| 3        | Server-Side Performance   | HIGH        | `server-`    |
| 4        | Client-Side Data Fetching | MEDIUM-HIGH | `client-`    |
| 5        | Re-render Optimization    | MEDIUM      | `rerender-`  |
| 6        | Rendering Performance     | MEDIUM      | `rendering-` |
| 7        | JavaScript Performance    | LOW-MEDIUM  | `js-`        |
| 8        | Advanced Patterns         | LOW         | `advanced-`  |

## Quick Reference

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` - Move await into branches where actually used
- `async-parallel` - Use Promise.all() for independent operations
- `async-dependencies` - Use better-all for partial dependencies
- `async-api-routes` - Start promises early, await late in API routes
- `async-suspense-boundaries` - Use Suspense to stream content

### 2. Bundle Size Optimization (CRITICAL)

- `bundle-barrel-imports` - Import directly, avoid barrel files
- `bundle-dynamic-imports` - Use next/dynamic for heavy components
- `bundle-defer-third-party` - Load analytics/logging after hydration
- `bundle-conditional` - Load modules only when feature is activated
- `bundle-preload` - Preload on hover/focus for perceived speed

### 3. Server-Side Performance (HIGH)

- `server-cache-react` - Use React.cache() for per-request deduplication
- `server-cache-lru` - Use LRU cache for cross-request caching
- `server-serialization` - Minimize data passed to client components
- `server-parallel-fetching` - Restructure components to parallelize fetches
- `server-after-nonblocking` - Use after() for non-blocking operations

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

- `client-swr-dedup` - Use SWR for automatic request deduplication
- `client-event-listeners` - Deduplicate global event listeners

### 5. Re-render Optimization (MEDIUM)

- `rerender-defer-reads` - Don't subscribe to state only used in callbacks
- `rerender-memo` - Extract expensive work into memoized components
- `rerender-dependencies` - Use primitive dependencies in effects
- `rerender-derived-state` - Subscribe to derived booleans, not raw values
- `rerender-functional-setstate` - Use functional setState for stable callbacks
- `rerender-lazy-state-init` - Pass function to useState for expensive values
- `rerender-transitions` - Use startTransition for non-urgent updates

### 6. Rendering Performance (MEDIUM)

- `rendering-animate-svg-wrapper` - Animate div wrapper, not SVG element
- `rendering-content-visibility` - Use content-visibility for long lists
- `rendering-hoist-jsx` - Extract static JSX outside components
- `rendering-svg-precision` - Reduce SVG coordinate precision
- `rendering-hydration-no-flicker` - Use inline script for client-only data
- `rendering-activity` - Use Activity component for show/hide
- `rendering-conditional-render` - Use ternary, not && for conditionals

### 7. JavaScript Performance (LOW-MEDIUM)

- `js-batch-dom-css` - Group CSS changes via classes or cssText
- `js-index-maps` - Build Map for repeated lookups
- `js-cache-property-access` - Cache object properties in loops
- `js-cache-function-results` - Cache function results in module-level Map
- `js-cache-storage` - Cache localStorage/sessionStorage reads
- `js-combine-iterations` - Combine multiple filter/map into one loop
- `js-length-check-first` - Check array length before expensive comparison
- `js-early-exit` - Return early from functions
- `js-hoist-regexp` - Hoist RegExp creation outside loops
- `js-min-max-loop` - Use loop for min/max instead of sort
- `js-set-map-lookups` - Use Set/Map for O(1) lookups
- `js-tosorted-immutable` - Use toSorted() for immutability

### 8. Advanced Patterns (LOW)

- `advanced-event-handler-refs` - Store event handlers in refs
- `advanced-use-latest` - useLatest for stable callback refs

## Content Map

44 rule files grouped into 8 categories by filename prefix. Each rule file contains a brief explanation, incorrect + correct code examples, and references. Read the specific rule files that match your task; you don't need to read all 44.

| Topic | File | Contents |
|---|---|---|
| Section definitions and priorities | `${CLAUDE_SKILL_DIR}/rules/_sections.md` | The 8 section definitions, their impact levels, and filename-prefix conventions. Read first if you're navigating the skill for the first time and need an overview of how the rules are organized. |
| Waterfall elimination (CRITICAL) | `${CLAUDE_SKILL_DIR}/rules/async-*.md` | 5 rules on eliminating sequential await chains, using `Promise.all()`, deferring awaits, Suspense boundaries, and API route patterns. Read when auditing code with multiple `await` statements, slow initial loads, or you see sequential network calls that could be parallel. Rules: `async-defer-await`, `async-parallel`, `async-dependencies`, `async-api-routes`, `async-suspense-boundaries`. |
| Bundle size (CRITICAL) | `${CLAUDE_SKILL_DIR}/rules/bundle-*.md` | 5 rules on barrel imports, dynamic imports, deferring third-party scripts, conditional module loading, and preloading. Read when optimizing bundle size, auditing third-party dependencies, touching `next/dynamic`, or improving Time to Interactive / LCP. Rules: `bundle-barrel-imports`, `bundle-dynamic-imports`, `bundle-defer-third-party`, `bundle-conditional`, `bundle-preload`. |
| Server-side performance (HIGH) | `${CLAUDE_SKILL_DIR}/rules/server-*.md` | 4 rules on `React.cache()`, LRU caching, minimizing client serialization, and parallel server fetches. Read when writing Next.js server components, RSC data fetching, or touching `"use server"` actions. Rules: `server-cache-react`, `server-cache-lru`, `server-serialization`, `server-parallel-fetching`. |
| Client-side data fetching (MEDIUM-HIGH) | `${CLAUDE_SKILL_DIR}/rules/client-*.md` | 2 rules on SWR deduplication and deduplicating global event listeners. Read when implementing client-side data fetching hooks or adding global event handlers (scroll, resize, etc.). Rules: `client-swr-dedup`, `client-event-listeners`. |
| Re-render optimization (MEDIUM) | `${CLAUDE_SKILL_DIR}/rules/rerender-*.md` | 7 rules on deferring reads, memoization, dependency arrays, derived state subscription, functional setState, lazy state init, and transitions. Read when debugging unnecessary re-renders, touching `useState`/`useEffect`/`useMemo`, or seeing excessive React DevTools profiler flashes. Rules: `rerender-defer-reads`, `rerender-memo`, `rerender-dependencies`, `rerender-derived-state`, `rerender-functional-setstate`, `rerender-lazy-state-init`, `rerender-transitions`. |
| Rendering performance (MEDIUM) | `${CLAUDE_SKILL_DIR}/rules/rendering-*.md` | 7 rules on SVG animation, `content-visibility`, JSX hoisting, SVG precision, hydration flicker, `<Activity>` component, and conditional render. Read when writing components with heavy JSX, SVG graphics, long lists, or seeing hydration mismatch flicker. Rules: `rendering-activity`, `rendering-hoist-jsx`, `rendering-animate-svg-wrapper`, `rendering-content-visibility`, `rendering-svg-precision`, `rendering-hydration-no-flicker`, `rendering-conditional-render`. |
| JavaScript micro-optimization (LOW-MEDIUM) | `${CLAUDE_SKILL_DIR}/rules/js-*.md` | 12 rules on hot-path micro-optimizations: batching DOM/CSS, Set/Map lookups, property access caching, function result caching, RegExp hoisting, combined iterations, length checks, early exit, toSorted, etc. Read when profiling hot paths, optimizing loops in performance-critical code, or refactoring tight data processing loops. Usually lower priority than async/bundle/server. |
| Advanced patterns (LOW) | `${CLAUDE_SKILL_DIR}/rules/advanced-*.md` | 2 rules on storing event handlers in refs and `useLatest` for stable callback refs. Read when you need stable callback identity across renders (e.g., in event handlers attached via `useEffect`). Rules: `advanced-event-handler-refs`, `advanced-use-latest`. |
| Full compiled guide | `${CLAUDE_SKILL_DIR}/AGENTS.md` | The full guide with all 44 rules expanded inline. Read only if you need every rule at once (e.g., generating a comprehensive audit report) — otherwise prefer the individual `rules/<name>.md` files listed above. |

### Rule file anatomy

Each `rules/<name>.md` file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references
