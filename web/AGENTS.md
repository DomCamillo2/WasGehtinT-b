<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent map (web/)

This is the canonical Next.js app. Full agent instructions live at the **repo root** `AGENTS.md`.

Quick links:

- Architecture rules: `ARCHITECTURE.md`
- Scraper index: `src/lib/scrapers/README.md`
- Env knobs: `.env.example`
- Go-live: `GO_LIVE_CHECKLIST.md`

Priority surface: Discover + external events. Follow ACL: UI never imports `@/lib/data` or raw snake_case DB fields.
