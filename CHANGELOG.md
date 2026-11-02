# Callibre change log

## v3.3.1 (2 Nov 2026)
- Set up for a brand new Supabase project: one script, sql/new-project-setup.sql, creates all 18 tables, starter data and the superadmin login.
- Supabase details now go in 2 marked lines in src/supabase.js. If they're missing, the app says so instead of showing a blank page.
- Removed the old, overlapping SQL scripts to avoid confusion.

## v3.3.0 (2 Nov 2026)
- New "Service Drive" tab: the Inbound Service Drive (Nov 2026 to Feb 2027), same rules as the Excel workbook.
- Agents score up to 100 points a month: absence (35), late coming (30), adherence (35).
- To win: QA 85%+ and no final written warning.
- Admins enter month-end scores per agent; points, "Can win?" and ranks work themselves out.
- Results: monthly top 3, winning team, centre ASA and answer rate, team event unlock, grand prize top 10, most improved.
- Agents see their own score breakdown. Other agents' QA and warnings are never shown to agents.
- Super Admin can change points, limits, targets and prize wording in How it works.
- Needs sql/service-drive.sql run once in Supabase (3 new tables, existing data untouched).

## v3.2.0 (2 Nov 2026)
- Hosting moved from Google AI Studio to Cloudflare, deployed from GitHub. Supabase unchanged.
- Added wrangler.jsonc and _headers (always serve the latest version, no stale cache).
- Removed Netlify, Bun and AI Studio config files.

## v3.1.0 (2 Nov 2026)
- Removed the "offline fallback / sandbox" mode. The app now only ever reads and saves to the live Supabase database.
- If the database can't be reached, a red "Not connected" message and Retry button show instead of sample data. Nothing is saved to the browser.
- The app reloads data automatically when the internet connection comes back.
- Old browsers stuck on the red "OFFLINE FALLBACK MODE" banner are cleared automatically on first load.
- Sample logins (john, jane, alice) no longer exist anywhere in the app.
- Custom badges now save to Supabase only (no browser copies).
- Version number shown in Settings.

## v3.0.0
- Baseline export from Google AI Studio (agent-rewards_2_.zip).
