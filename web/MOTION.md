# Discover motion & anti-slop direction

Research sources applied to WasGehtTüb Discover:

- [Vanszs/Anti-AI-UI](https://github.com/Vanszs/Anti-AI-UI) — filter bans + animation recipes
- [rwcod/anti-ai-slop-ui](https://github.com/rwcod/anti-ai-slop-ui) — motion must communicate state
- [motiondivision/motion](https://github.com/motiondivision/motion) / framer-motion LazyMotion — layoutId + sheet presence

## Visual direction
**Campus Night Editorial** — Tübingen Altstadt timber ink, brick accent `#c4783a`, Bricolage wordmark + Figtree body. Solid surfaces. No teal glow, glass nav, purple wash, or Inter.

## Motion stack
1. **CSS tokens** (`--dur-*`, `--ease-*`) for hover/press/empty/confirm
2. **framer-motion LazyMotion + `m`** for shared layout (filter ring, nav underline) and sheet enter/exit
3. **No** universal scroll fade-up, `hover:scale-105`, glow pulse, or decorative spring defaults
4. **Optional upgrades** (Welcome / marketing only — see `docs/DESIGN_MOTION_TOOLKIT.md`): GSAP ScrollTrigger, Lottie micro-interactions, Aceternity/Magic UI paste-then-recolor, Spline embed behind reduced-motion gate. Keep Discover on CSS + Motion.

## Intentional motions (≤3 jobs)
1. Filter chip active ring slides via `layoutId`
2. Bottom-nav underline slides via `layoutId`
3. Filter sheet: fade backdrop + ease-out slide; empty state / save toast: short opacity+y

`prefers-reduced-motion` collapses spatial motion to 0 duration / CSS `animation: none`.
