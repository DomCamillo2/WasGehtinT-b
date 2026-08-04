# Design & motion toolkit for agents

**Researched:** 2026-08-02 · **Updated:** 2026-08-04  
**Purpose:** MCP servers + GitHub repos that help ship UI/motion that looks intentional (design-expert), not generic AI slop.  
**Stack fit:** WasGehtTüb already uses Next.js + Tailwind + `framer-motion` + Neckar Night tokens. Prefer restraint over effect soup.

> Product constraints (do not ignore): cool ink / Neckar green / copper `#c4783a`; Figtree + Bricolage; **no** purple SaaS defaults, glass blur chrome, glow pulses, or universal fade-up everywhere. See root `AGENTS.md` and `AUDIT.md`.

---

## High-end animation stacks (vibecoding without hand-rolling)

Use these when you want production-feeling motion **without** inventing keyframes from scratch. Still filter every paste against Neckar Night / anti-slop.

| Tool | What it is | Fit for WasGehtTüb | How agents should use it |
|---|---|---|---|
| **[Aceternity UI](https://ui.aceternity.com/)** | Copy-paste React/Tailwind components: canvas reveals, 3D tilt, glowing cards, backgrounds | **Marketing / Welcome only** — glowing mesh & 3D tilt read as AI-generic on Discover | Steal *structure* (reveal timing, section choreography). Recolor to ink/copper. Strip glow/blur defaults. MCP: [devinoldenburg/aceternity-mcp](https://github.com/devinoldenburg/aceternity-mcp) |
| **[Spline](https://spline.design/)** | Design or grab interactive 3D scenes; embed via URL / `@splinetool/react-spline` | **Optional Welcome hero accent only** — not Discover feed (perf + clutter) | Embed one calm scene max (e.g. soft venue light). Prefer static full-bleed photo unless 3D clearly wins. Honor `prefers-reduced-motion` (hide Spline). |
| **[GSAP](https://gsap.com/)** ([greensock/GSAP](https://github.com/greensock/GSAP)) | Timeline + ScrollTrigger for scrubbed, pin, multi-step sequences at 60fps | **Welcome / long-form marketing** scroll stories; avoid on Discover list scroll | Prompt agents: “GSAP ScrollTrigger scrub opacity/y only; copper accent; no scale bounce.” Keep `framer-motion` for UI state; add GSAP only when a scroll timeline needs it. |
| **[LottieFiles](https://lottiefiles.com/)** | Lightweight vector / micro-interactions (JSON → `lottie-react` / `dotlottie`) | Empty states, save confirm, install hint — **not** full-page heroes | Prefer short, muted Lotties (copper/ink). Cap size; always respect reduced motion (static frame or CSS). |

### Decision cheat sheet

```
Need UI state (tabs, sheets, toast)?     → framer-motion / CSS tokens (already in repo)
Need scroll-driven storytelling?         → GSAP ScrollTrigger (Welcome only)
Need fancy marketing block fast?         → Aceternity / Magic UI → recolor + de-glow
Need one 3D object in hero?              → Spline URL embed (or skip)
Need tiny delight (empty / confirm)?     → Lottie (or CSS — often enough)
```

### Prompt seeds for agents (high-end, not slop)

- **Aceternity → Neckar:** “Use an Aceternity-style section reveal, but solid ink surfaces, copper `#c4783a` hairlines, no glow, no purple mesh, Figtree/Bricolage.”
- **GSAP Welcome scrub:** “Pin the hero brand for 40% scroll; fade supporting line in; keep one full-bleed photo; duration tied to scroll, ease none on scrub.”
- **Spline:** “Embed Spline only behind a `prefers-reduced-motion: reduce` gate; pause when offscreen; max one scene on `/`.”
- **Lottie:** “Replace spinner flourish with a 1.2s muted copper check Lottie; fall back to CSS if reduced-motion.”

---

## Recommended MCP servers (priority order)

### Tier A — install for this project

| MCP | Repo / install | Why |
|---|---|---|
| **Figma (official / Cursor)** | Already available in this Cursor workspace (`Figma` MCP + skills: `figma-design-to-code`, `figma-use`, `figma-implement-motion`) | Best path: design in Figma (incl. Motion timelines) → agent implements with real tokens/keyframes. Config 2026 Motion is MCP-exportable. |
| **Framelink Figma Context** | [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) (~14k★) · `npx -y figma-developer-mcp` | Highest-signal design→code MCP when you paste a Figma URL. Simplifies layout/typography for agents. Needs a Figma PAT. |
| **Magic UI MCP** | [magicuidesign/mcp](https://github.com/magicuidesign/mcp) · `npx -y @magicuidesign/mcp@latest` | Search/install polished animated React components (marquees, blur-fade, backgrounds) without inventing mediocre motion. |

### Tier B — optional / when needed

| MCP | Repo | When to use |
|---|---|---|
| **shadcn/ui MCP** | [Jpisnice/shadcn-ui-mcp-server](https://github.com/Jpisnice/shadcn-ui-mcp-server) (~2.7k★) | If/when you adopt shadcn primitives; not required for current Discover UI. |
| **Aceternity MCP** | [devinoldenburg/aceternity-mcp](https://github.com/devinoldenburg/aceternity-mcp) | Heavier “wow” marketing components — use sparingly; easy to look AI-generic. |
| **21st Magic MCP** | [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp) | Text→UI generation inside Cursor; validate against Neckar Night before shipping. |
| **better-icons** | [better-auth/better-icons](https://github.com/better-auth/better-icons) | Semantic icon search when Lucide naming is ambiguous. |
| **Conductor** | [Dragoon0x/conductor](https://github.com/Dragoon0x/conductor) | Experimental Figma MCP with 8px grid / type-scale / a11y intelligence — interesting but DYOR. |
| **Penpot MCP** | [penpot/penpot-mcp](https://github.com/penpot/penpot-mcp) | Only if you switch to open-source Penpot instead of Figma. |

### Already in this Cursor cloud env

- **Figma** — design-to-code, motion, variables, FigJam/Slides skills  
- **Notion** — product/docs (not visual design)  
- **Datadog** — ops (ignore for UI)  
- **cursor-cloud** — agent diagnostics  

**Do not** install every design MCP at once — tool sprawl hurts agents. Prefer: **Figma + Magic UI** (+ Framelink if official Figma MCP is unavailable).

### Example Cursor MCP snippet (local)

```json
{
  "mcpServers": {
    "magicui": {
      "command": "npx",
      "args": ["-y", "@magicuidesign/mcp@latest"]
    },
    "figma-framelink": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": { "FIGMA_API_KEY": "${FIGMA_API_KEY}" }
    }
  }
}
```

---

## GitHub repos — animation & expert-looking UI

### Core libraries (use these)

| Repo | Stars (approx.) | Role for WasGehtTüb |
|---|---|---|
| [motiondivision/motion](https://github.com/motiondivision/motion) (Motion / formerly Framer Motion) | very high | **Already in use** via `framer-motion`. Prefer `LazyMotion` + intentional variants (`discover-motion.tsx`). Package rename: `motion` also works. |
| [greensock/GSAP](https://github.com/greensock/GSAP) | high | Scroll-scrub / pin / multi-step timelines (Welcome). Don’t dual-stack with Motion on Discover. |
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) + [LottieFiles](https://lottiefiles.com/) | high | Micro-interactions / empty states. Prefer `lottie-react` or DotLottie; keep assets tiny. |
| [splinetool/react-spline](https://github.com/splinetool/react-spline) | med | Embed Spline scenes in React/Next — Welcome only; lazy-load. |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | high | Smooth scroll for marketing surfaces — optional; Discover feed is list-first. |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | very high | Prefer Spline for one-off 3D; R3F only if you own the scene code. |

### Component / inspiration libraries (copy patterns, don’t dump wholesale)

| Repo | Notes |
|---|---|
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) (~22k★) | Best “design engineer” animated primitives + official MCP. Pair with our copper/ink palette. |
| [aceternity/ui](https://ui.aceternity.com/) (Aceternity UI) | Heavy wow components (tilt, glow, canvas). **Strip glow**; Welcome/marketing only. |
| [boldpiq/boldpiq-web](https://github.com/boldpiq/boldpiq-web) | Elite Motion+GSAP components + **110+ Awwwards-style prompts** (`PROMPTS.md`) — gold for agent prompts. |
| [syntax-syndicate/motion-primitives-website](https://github.com/syntax-syndicate/motion-primitives-website) | 150+ copy-paste Motion/GSAP/Three examples — study structure, don’t paste glassmorphism. |
| [omerakben/tuel-animate](https://github.com/omerakben/tuel-animate) | TS monorepo, SSR-aware Motion/GSAP packages — good architecture reference. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Primitives + accessibility; not “fancy”, but expert-grade foundations. |

### Design craft / anti-slop references

| Resource | Why |
|---|---|
| [animations.dev](https://animations.dev) / Emil Kowalski | Timing, easing, layout animation taste — already referenced in `discover-motion.tsx` |
| Hallmark / no-slop-ui (see `AUDIT.md`) | Avoid AI-default purple/glow/pill soup |
| Figma Motion (Config 2026) | Design motion in Figma → Dev Mode / MCP → code |

---

## How agents should use this for WasGehtTüb

1. **Compose, don’t collage** — one hero composition, brand-first, full-bleed atmosphere; no card grids in the hero.
2. **Motion budget** — 2–3 intentional motions per surface (enter, state change, scroll accent). Prefer opacity/transform over blur/glow.
3. **Source of truth** — Figma (tokens + Motion) → implement with existing `discover-motion.tsx` easings (`easeOut` / short durations).
4. **Steal craft, not themes** — from Magic UI / boldpiq take *timing and structure*; recolor to Neckar Night.
5. **Libraries** — default `framer-motion` + CSS tokens. Add **GSAP** only for Welcome scroll timelines; **Lottie** for micro-delight; **Aceternity/Magic UI** as paste-then-recolor; **Spline** as optional hero accent (never Discover cards).
6. **Verify** — desktop + mobile; honor `prefers-reduced-motion` (already wired in `DiscoverMotionRoot`; gate Spline/Lottie/GSAP the same way).

### Prompt seeds (adapted from award-site craft)

Use with our tokens, not purple gradients:

- Sticky section: left narrative, right full-bleed venue photo; scrub opacity of type only.
- Marquee: venue names / genres at low contrast; pause on hover; copper underline on active.
- Card enter: 180–250ms ease-out fade + 8–12px Y; stagger ≤ 40ms; never scale-on-hover 1.05.
- Nav: active tab = copper hairline + weight change; no glow.

Full prompt catalogs: `boldpiq-web/PROMPTS.md`, Magic UI docs, Aceternity examples (filter aggressively).

---

## Catalog indexes (meta)

- [AgentRank — Best MCP servers for design](https://agentrank-ai.com/blog/best-mcp-servers-design/)
- [MCP.Directory — Design category](https://mcp.directory/awesome-mcp-servers)
- [toluwojay/awesome-ai-tools-for-ui](https://github.com/toluwojay/awesome-ai-tools-for-ui)
- [sunnamed434/awesome-mcp-registry](https://github.com/sunnamed434/awesome-mcp-registry)

---

## Out of scope / avoid for this product

- TouchDesigner MCP (live generative art — not Discover)
- Excalidraw MCP (diagramming)
- Shipping Aceternity-style mesh/glow heroes as the default Discover look
- Spline/Three “exploding robots” or product turntables on Discover cards
- Dual Motion+GSAP on the same Discover scroll surface
- Adding Three.js / Spline “because it’s cool” without a product reason

---

## Changelog

| Date | Note |
|---|---|
| 2026-08-02 | Initial research saved for vibecoding agents |
| 2026-08-04 | Added Aceternity / Spline / GSAP / Lottie high-end stack + agent prompts; copper token aligned to `#c4783a` |
