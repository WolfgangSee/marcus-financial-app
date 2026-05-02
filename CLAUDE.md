# Marcus Financial Planning App

## What this is
A client-facing retirement readiness calculator for Marcus Reed, a financial planner based in Denver, CO. Prospects fill in their numbers before a first meeting and get an instant gap analysis. Marcus receives a formatted email summary.

## Stack
- React 18 + Vite 5, no backend, no database, no external APIs
- Pure client-side math (compound interest, 25× expense rule, 7% return assumption)
- All user-facing strings live in `src/voice.js` — edit copy there, never in JSX
- Styles are inline JSX + a `<style>` block inside `App.jsx`, no CSS files

## Fonts
- Serif (headings, numbers, body): `Georgia, 'Palatino Linotype', Palatino, serif`
- Sans (labels, buttons, UI): `'Segoe UI', system-ui, -apple-system, sans-serif`
- Original fonts were Newsreader + Instrument Sans (Google Fonts) — swapped to system fonts

## File structure
```
src/
  App.jsx      — entire UI (~1050 lines), single component tree
  voice.js     — all copy strings + interpolate() helper
  main.jsx     — React root mount, 10 lines
Dockerfile     — two-stage build: Node builds, nginx serves
```

## Key app logic (App.jsx)
- `calcProjected()` — future value of savings + monthly contributions
- `solveMonthly()` — back-solves required monthly savings to hit target
- Target = 25× estimated annual expenses (income × 0.75 minus annual savings)
- 5 status variants: `good_shape`, `on_track`, `close`, `behind`, `far_behind`
- 3 situation flags: `hasDebt` (savings < 0), `negativeCashflow` (monthly < 0), `shortRunway` (< 10 years to retire)
- Sliders update live projections without recalculating status
- URL state: results encoded as base64 JSON in `?s=` param for shareable links
- Email flow: builds plain-text email body → copy to clipboard → shows thank-you screen

## Deployment
- GitHub: `WolfgangSee/marcus-financial-app` (private), branch `main`
- Coolify VPS: auto-deploys on push via Dockerfile (Build Pack: Dockerfile)
- Live URL: `marcus.wse.quest`
- Deploy: `git add`, `git commit`, `git push` — Coolify picks it up automatically

## Artifact versions (for claude.ai sharing)
- `artifact/claude-artifact.jsx` — paste into claude.ai as a React artifact, native rendering
- `artifact/index.html` — standalone browser file, uses React + Babel from CDN (fine for demos, slower load)

## Email
- `MARCUS_EMAIL` in App.jsx is a placeholder (`marcus@@reedwealthplanning.com`) — needs real address before launch
- "Send email" button is demo-only — copies body to clipboard, no actual sending implemented yet

## What's not built yet
- Real email sending (needs a backend or service like Resend/Mailgun)
- Marcus's real email address
- Any authentication or analytics
