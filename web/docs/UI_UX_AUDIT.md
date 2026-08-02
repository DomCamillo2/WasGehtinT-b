# UI/UX Audit — WasGehtTüb

**Date:** 2026-08-02  
**Scope:** Production `web/` on https://www.wasgehttueb.app (post-merge Neckar Night welcome)  
**Method:** Code review of App Router + key components, live HTML probes on `/`, `/discover`, `/auth`, `/event/…`, `/profile`, `/spontan`, legal pages  
**Score:** **6.5 / 10** — Discover + Welcome are strong; secondary surfaces and IA still feel like two products

---

## Verdict

The core student job (“what’s on in Tübingen tonight?”) is clear on Welcome → Discover. Visual direction (Neckar Night, Figtree/Bricolage, copper accent) is coherent on those surfaces. Trust breaks when users leave Discover: blank profile, dead “classic” links, disabled Profil tab vs working header avatar, light `zinc` cards under forced dark shell, and two different bottom navs.

Fix the P0/P1 IA and theme continuity first; polish motion/copy after.

---

## What’s working

| Area | Why it works |
|---|---|
| Welcome `/` | Full-bleed hero, brand-first wordmark, one headline, one sentence, two CTAs — matches anti-slop hero budget |
| Discover feed | Strong a11y (skip link, tabs, `role="feed"`, 44px targets), view modes, empty states with CTAs, skeleton loading |
| Theme bootstrap | `theme-init-script` prevents FOUC; welcome/auth toggle is usable |
| Motion budget | Discover tokens + reduced-motion; welcome has 2–3 intentional enters (not scroll-fade spam) |
| Live content | `/discover` returns real events with aria-rich markup |

---

## Severity legend

- **P0** — Broken or trust-breaking path (blank screen, dead CTA, contradictory IA)
- **P1** — Consistent friction / visual system break
- **P2** — Polish, debt, or low-traffic surfaces

---

## Findings

### P0 — Broken paths

1. **`/profile` returns blank when logged out**  
   `profile/page.tsx` does `return null` if `loadProfilePageData()` is empty. Live probe shows spinner/empty shell, not a login redirect.  
   **Fix:** `redirect("/auth?next=/profile")` (or equivalent).

2. **“Klassische Discover-Ansicht” is a no-op**  
   `buildClassicDiscoverHref()` only strips `?ui=` and links back to the same V2 `/discover`. Desktop filter icon + sheet CTA promise a classic view that no longer exists.  
   **Fix:** Remove CTA or wire it to a real advanced-filters panel; drop vestigial `?ui=new` from Welcome/Auth links.

3. **Profil IA contradiction**  
   Header avatar/link goes to `/profile` or `/auth`, but bottom nav Profil is `disabled` (“kommt bald”). Users learn two different truths about the same feature.  
   **Fix:** Enable Profil → `/profile` or `/auth`, or remove the tab until ready. Don’t ship both.

### P1 — System & consistency

4. **Theme toggle lies on Discover**  
   `html.discover-ui-new` forces dark tokens and `color-scheme: dark`. Welcome offers light/dark; Discover ignores it. Students who pick light mode bounce into forced night.  
   **Fix:** Either honor theme on Discover (recommended for “friendly” positioning) or hide/disable the toggle with copy that Discover is night-only.

5. **Two bottom navigations**  
   - Discover: Entdecken / Gemerkt / Spontan / Profil(disabled)  
   - Legacy `BottomNav`: Entdecken / Posten / Gemerkt (`grid-cols-4` with **3** items → uneven gaps)  
   Leaving Discover (e.g. Spontan) swaps IA and chrome.  
   **Fix:** One nav model app-wide; retire Posten-sheet nav or promote it into Discover IA deliberately.

6. **Secondary pages still light SaaS chrome**  
   Profile, host, requests, chat, reset-password, admin use `Card` + `zinc-*` / amber chips under dark `discover-ui-new` shell → low contrast, “wrong product” feel.  
   **Fix:** Tokenize secondary pages to Neckar Night surfaces; kill raw `zinc`/`bg-white` on themed routes.

7. **Gemerkt duplicated**  
   Category/header chip **and** bottom tab both mean “saved”. Redundant for a 4-tab bar. Prefer one primary entry (usually tab).

8. **Chrome stacking on mobile**  
   Sticky header + category chips + search FAB + bottom nav + cookie banner (`z-50` both) compete for vertical space (`pb-[9.5rem]`). First content sits low; consent can obscure nav.  
   **Fix:** Lower cookie banner above nav with gap, or collapse one chrome layer; audit safe-area padding once.

9. **Event detail is a one-off**  
   Hardcoded cream/ink hex, nested bordered boxes, no shared detail component — drifts from Discover cards and lacks Merken parity in the same visual language.  
   **Fix:** Extract `EventDetail` using Discover tokens; one clear primary action (Merken / Quelle / Teilen).

### P2 — Polish & debt

10. **Brand repeated on Welcome** — header wordmark + hero wordmark. Acceptable for brand-first, but on narrow screens the header mark can feel redundant; consider logo-only in header once hero brand is visible.  
11. **Hero image `alt=""`** — decorative OK with scrim, but SEO/social share still generic; fine if intentional.  
12. **Welcome/Auth still use `backdrop-blur`** on toggle/secondary CTA — mild conflict with anti-glass guidance. Soften to solid translucent fills.  
13. **Auth login sheet** — no focus trap / Escape documented; overlay dismiss is click-only.  
14. **Legacy `BottomNav` backdrop-blur + shadow** — violates AUDIT anti-glass notes.  
15. **Accent doc drift** — `AUDIT.md` cites `#d48745`, CSS uses `#c4783a`. Pick one source of truth.  
16. **No `not-found.tsx`** — event/party 404s get framework default, not branded empty.  
17. **Chat empty / thread chips** — opaque IDs (“Chat abc123”); Card-only empty states.  
18. **Spontan** under Discover dark class but Posten/legacy patterns — unclear whether Spontan is first-class or experimental.  
19. **Legal pages** — functional, but still Discover-shell flavored; fine for P2.  
20. **Admin / debug** — out of student scope; keep visually separate so they don’t leak patterns into product UI.

---

## Flow scores

| Flow | Score | Notes |
|---|---|---|
| Welcome → Discover | 8/10 | Clear; vestigial `?ui=new` only nit |
| Welcome → Auth | 7.5/10 | Splash is on-brand; sheet a11y P2 |
| Discover browse / filter / views | 8/10 | Best surface; dead classic CTA + chrome density |
| Discover → Event detail | 6/10 | Content OK; visual/system break |
| Discover → Spontan | 5/10 | Nav swap + mixed chrome |
| Profile / host / requests | 4/10 | Blank logout path; zinc cards |
| Legal | 7/10 | Adequate |

---

## Recommended backlog (ship order)

1. Redirect unauthenticated `/profile` → `/auth`  
2. Resolve Profil tab vs header (one behavior)  
3. Delete or replace “Klassische Discover-Ansicht” + strip `?ui=new`  
4. Unify bottom nav (Discover model everywhere students go)  
5. Theme policy: honor light mode on Discover **or** communicate night-only  
6. Retheme secondary pages to Neckar tokens (profile, spontan, event detail first)  
7. Cookie banner vs bottom nav collision  
8. Branded `not-found.tsx`  
9. Align accent hex in docs vs CSS  
10. Auth sheet focus trap / Escape

---

## Anti-slop checklist (current)

| Rule | Welcome | Discover | Secondary |
|---|---|---|---|
| One composition first viewport | Pass | Pass (feed) | Fail (card stacks) |
| Brand as hero signal | Pass | Weak (logo only) | Weak |
| No inset hero cards | Pass | N/A | N/A |
| No purple / cream-terracotta slop | Pass | Pass | Mixed (`zinc`/amber) |
| Cards only for interaction | Pass | Pass | Fail |
| Expressive fonts | Pass | Pass | Pass (when shell loads) |
| Intentional motion ≤3 | Pass | Pass | Sparse / none |

---

## Key files

- Welcome: `web/src/components/landing/welcome-page.tsx`
- Auth: `web/src/components/landing/splash-auth.tsx`
- Discover: `web/src/components/discover/discover-feed-v2.tsx`, `discover-bottom-nav-v2.tsx`
- Tokens: `web/src/app/globals.css` (`html.discover-ui-new`)
- Shell: `web/src/components/layout/app-shell.tsx`, `bottom-nav.tsx`
- Profile blank: `web/src/app/profile/page.tsx`
- Direction docs: `web/AUDIT.md`, `web/MOTION.md`, `web/docs/DESIGN_MOTION_TOOLKIT.md`
