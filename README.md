# Alex K Bells — website

Public website for Alex K Bells, kettlebell coach in Cumbernauld.
Next.js 16 · TypeScript · Tailwind CSS v4.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
```

Preview provisional content (prices, timetable) with the review marker:

```bash
CONTENT_PREVIEW=true npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Builds, serves and runs Playwright + axe |
| `npm run check` | lint + typecheck + unit tests + build |

## Documentation

- [CORE.md](CORE.md) — business facts, status, open decisions
- [DESIGN.md](DESIGN.md) — design system
- [CONTENT.md](CONTENT.md) — sitemap, content sources, approval workflow, questions for the client
- [ARCHITECTURE.md](ARCHITECTURE.md) — technical decisions, env vars, future booking design
- [TASKS.md](TASKS.md) — checklist
- [AGENTS.md](AGENTS.md) — rules for AI-assisted development
