# Motion optimization plan — WasGehtTüb

**Date:** 2026-08-04  
**Tools considered:** Aceternity UI, Spline, GSAP, Lottie, existing framer-motion  
**Constraint:** Neckar Night / anti-slop (no glow, mesh, purple, universal fade-up)

---

## Current state (audit)

| Surface | Today | Gap |
|---|---|---|
| Welcome `/` | Ken-burns + staggered opacity/y (framer) | No scroll depth; timing duplicated; CTA feels static after load |
| Discover feed | CSS press/underline; card-lift | Intentionally quiet — good. Don’t add GSAP here |
| Event detail | Static SSR | Feels abrupt after rich card → detail |
| Spontan | Per-item fade-up stagger | Borderline decorative; keep short |
| Confirm / Merken | CSS toast | Fine without Lottie |

## Decision (what to ship vs skip)

| Tool | Ship now? | Why |
|---|---|---|
| **framer-motion** | Yes | Already in bundle; enter choreography + detail stagger |
| **GSAP + ScrollTrigger** | Yes — Welcome only | Scroll-linked hero parallax / scrim without dual-stacking Discover |
| **Aceternity patterns** | Steal craft only | Clip/wordmark reveal + CTA press — **no** glow/tilt packages |
| **Lottie** | No (this pass) | CSS toast already covers micro-delight; avoid new asset pipeline |
| **Spline** | No | 3D hero fights full-bleed photo brand; perf cost on mobile |

## Implemented optimizations

1. Shared Welcome choreography variants (opacity/y, copper CTA press) via Motion  
2. GSAP ScrollTrigger on Welcome: hero translateY + scrim deepen on scroll (reduced-motion off)  
3. Aceternity-inspired **wordmark clip reveal** (CSS, no glow)  
4. Event detail client enter: staggered sections (facts → about → related)  
5. Docs: toolkit + this plan

## Explicit non-goals

- Glow cards, 3D tilt on Discover  
- GSAP on the Discover feed scroll  
- Spline robots / product turntables  
