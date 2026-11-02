# Callibre – Inbound Team Rewards (v3 rebuild)

Gamification rewards platform for inbound contact centre agents. Agents earn
points for performance metrics, build streaks, unlock badges, and redeem
points for prizes from a budget-tracked catalogue.

This is a clean-source rebuild of PointPlay v2. It connects to the **same
live Supabase database**, so all existing agents, points, prizes, users and
history carry over with zero migration. Business rules (metrics, streak
bonuses, all 10 badges, week label format, password hashing) were recovered
from the original build and match exactly.

## Renaming the app

The Super Admin can rename the app live, no code needed: log in, go to
Settings -> App branding, type the new name and tagline, save. Everyone
sees it on their next refresh. This requires the small `app_settings`
table; run `sql/app-settings-update.sql` once in the Supabase SQL editor
to create it (30 seconds).

The fallback/default name lives in `src/config.js`, and the installed
PWA (home screen) name is fixed at build time from that file, so update
it there too if the name change is permanent.

## Local development

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build to dist/
```

## Deploy: GitHub + Cloudflare

Every commit to the `main` branch on GitHub deploys automatically.

- Cloudflare builds with `npm run build` and serves `./dist` (see `wrangler.jsonc`).
- Data lives in Supabase (`src/supabase.js`). No database changes are needed to redeploy.
- Release routine: bump `src/version.js`, add a line to `CHANGELOG.md`, commit.
