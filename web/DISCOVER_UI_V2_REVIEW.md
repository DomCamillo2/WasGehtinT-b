# Review: Discover UI (default = v2)

Stand: 2026-08-02. Discover is **always** `DiscoverExperienceV2` — there is no classic/`?ui=new` split anymore.

## Current state

- `/discover` mounts v2 only (`discover/page.tsx` → `DiscoverExperienceV2`).
- Visual system: **Neckar Night** (cool ink, copper accent, Figtree + Bricolage wordmark).
- Dead legacy UI removed: `discover-premium.tsx`, `EventCard.tsx`, `Navbar.tsx`.

## Historical fixes (still relevant)

1. `liked=1` without login — client clears liked for guests.
2. Calendar month sync with `?date=`.
3. LocalStorage only for merkliste IDs, not fake upvote counts.
4. Empty-state copy points at real filters, not a classic view.

## Remaining product polish

- More venue logos under `public/logos/venues/`.
- Optional loading hint for “Mehr Wochen laden”.
- E2E for liked+guest, calendar URL, filter reset.
