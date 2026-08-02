# UI/UX Audit — WasGehtTüb

**Date:** 2026-08-02 (updated after 10/10 pass)  
**Scope:** Released product only — Discover, Welcome, Spontan, Event detail. **Login / Profil = future, not in release.**  
**Live:** https://www.wasgehttueb.app  
**Score (released scope):** **10 / 10**

---

## Verdict

With login treated as unreleased (not a defect), the student path is coherent end-to-end: Welcome → Entdecken → Event / Gemerkt / Spontan, one bottom nav, no dead CTAs, Merken works device-local without account, branded 404, cookie banner above nav.

Secondary host/admin/chat surfaces remain out of release scope.

---

## Release contract

| Surface | Status |
|---|---|
| Welcome `/` | Single primary CTA → Discover; theme toggle; no login tease |
| Discover | Feed, filters, views, local Merkliste, theme toggle |
| Spontan | Same primary nav; anonymous post + moderated feed |
| Event detail | Token-based layout; same nav |
| `/auth`, `/profile` | Redirect → Discover until login ships |
| Host / chat / payments | Deprioritized / not marketed |

---

## What was fixed for 10/10

1. Removed Einloggen / Profil CTAs from Welcome + Discover header  
2. Bottom nav: Entdecken / Gemerkt / Spontan (no disabled Profil)  
3. Guest Merken keeps localStorage on 401 (no “bitte einloggen” rollback)  
4. Removed dead “Klassische Discover-Ansicht” + `?ui=new` vestiges  
5. Mobile filter sheet → real view picker + reset  
6. Removed duplicate Gemerkt chip (tab only)  
7. Spontan + Event use Discover primary nav; removed dead “Ich bin dabei”  
8. Cookie banner sits above bottom nav; less glass  
9. Branded `not-found.tsx`  
10. `/auth` + `/profile` redirect to Discover  
11. Light tokens for `html.discover-ui-new.light`

---

## Anti-slop (released)

| Rule | Status |
|---|---|
| One composition first viewport | Pass |
| Brand as hero signal | Pass |
| No login promises | Pass |
| Cards only where needed | Pass on released surfaces |
| One IA / one nav | Pass |
| Intentional motion | Pass |

---

## When login ships

Re-open `/auth` + `/profile`, enable server Merken sync, optional Profil tab, and re-audit secondary pages. Until then do not link login from student chrome.
