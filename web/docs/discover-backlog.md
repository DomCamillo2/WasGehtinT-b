# Discover v2 — backlog (report follow-ups)

Ordered for impact vs effort. See git history / Phase A for items already shipped (contrast tweaks, load-more spacing, skeleton fallback, weeks-button loading).

---

## P0 — High impact, reasonable scope

| # | Item | Why | Acceptance criteria | Effort |
|---|------|-----|---------------------|--------|
| 1 | Collapsing / compact header on scroll | Frees vertical space; addresses “heavy header” | After ~80–120px scroll on mobile, secondary chrome (subtitle, optional chip row) hides or shrinks; search + category stays reachable (sticky mini bar or expand affordance) | M |
| 2 | Debounced URL sync for search `q` | Fewer `router.replace` calls, cleaner history | `q` updates URL 300–400ms after typing stops; immediate clear still updates | S |
| 3 | Touch comfort pass (44px) | WCAG comfort / review | View mode toggles + category chips meet **44×44px** hit area (padding or min size) on `max-sm` | S–M |
| 4 | Gemerkt / empty state copy | Clear mental model when `liked=1` and 0 rows | Dedicated title + body + CTA (“Events entdecken”) vs generic “Keine Events gefunden” | S |

---

## P1 — Strong UX wins

| # | Item | Why | Acceptance criteria | Effort |
|---|------|-----|---------------------|--------|
| 5 | Hero fallback initials | Less dominant “big letter” | Smaller initial, lower opacity, or tile pattern; keep only when no image | S |
| 6 | CTA hierarchy on mobile | “Ich bin dabei!” more visible | Full-width CTA row on `max-sm` **or** stronger primary fill + idle vs pressed contrast | M |
| 7 | Multi-column feed from `md`/`lg` | Tablets/desktop less sparse | 2 columns for cards (and optionally list) at breakpoints; gap + max width | M |
| 8 | Infinite / automatic “more weeks” | Less hunting for button | When user nears list end **and** `canLoadMore`, auto `router.replace` with next `weeks` + loading bar (guard against double fetch) | L |
| 9 | Cookie banner contrast | AA readability | Audit component; text/background ≥ 4.5:1; focus visible | S (if component isolated) |

---

## P2 — Polish & depth

| # | Item | Why | Acceptance criteria | Effort |
|---|------|-----|---------------------|--------|
| 10 | Sticky search affordance | Less scroll-to-top | FAB or header icon focuses search / opens panel | M |
| 11 | Filter sheet (“Mehr”) on mobile | Classic discover without clutter | Sheet with link to classic discover + optional advanced filters | L |
| 12 | Bottom nav: desktop layout | Wide screens | Side rail or top tabs when `lg+` | M |
| 13 | Full a11y audit | Keyboard + SR | Tab order, focus traps, live regions for errors, `alt` on meaningful images | L |
| 14 | `isHot` on card | Uses existing prop | Small “Im Trend” chip when hot; or remove unused prop | S |

---

## Suggested sprints

- **Sprint 1:** P0 #1–4  
- **Sprint 2:** P1 #5–7  
- **Sprint 3:** P1 #8–9  
- **Sprint 4:** P2 #10–14 as capacity allows  

---

## Dependencies / notes

- **P1 #8** reuses weeks-navigation loading patterns; guard double-fetch. Feed must **not** remount on `currentWeeks` (that reset scroll / `visibleCount`).  
- **P1 #7** use CSS grid; mind LCP (hero `priority` / above-the-fold).  
- **P0 #1** respect `prefers-reduced-motion` for show/hide.  

---

## Product corrections (outdated report language)

- Bottom bar is **Gemerkt** (saved), not Map; **Karte** lives in the header view switcher.  
- “Large letter” on cards is the **no-image fallback**, not the default when hero images load.
