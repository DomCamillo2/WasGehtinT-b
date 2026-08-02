# Venue logos

Optional static logos for known Tübingen venues.

## Naming

Use a stable slug, for example:

- `club-haus.svg`
- `club-voltair.svg`
- `tangente.svg`
- `zentrum-zoo.svg`

Prefer SVG. PNG works if needed.

## Wiring

Map the filename in `web/src/lib/events/official-venues.ts` (`venueLogoPath` / venue metadata).
The discover UI falls back to category art when a file is missing.
