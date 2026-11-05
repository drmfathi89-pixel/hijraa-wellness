<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HIJRAA WELLNESS: deployment workflow

- **Auto-deploy every change.** The owner asked for every change to go live. After finishing a change, `npm run build` must pass; then commit and `git push origin main`. Vercel deploys `main` to production automatically (project `fathi13/hijraa-wellness`, https://hijraa-wellness.vercel.app).
- **Confirm each deploy.** Vercel reports to GitHub as the `Vercel` commit status: `curl -s https://api.github.com/repos/drmfathi89-pixel/hijraa-wellness/commits/<sha>/status`. Tell the owner whether it succeeded. A failed deploy leaves the previous one live.
- **Database:** Neon Postgres (project `patient-shape-07791828`, region ap-southeast-1). `DATABASE_URL` is set in Vercel's environment variables. Never commit connection strings or write them into files.
- **Schema changes** go in `db/schema.sql` and must stay idempotent. The build applies the file before `next build`, and fails on Vercel if the database is unreachable.
- `vercel.json` pins the framework to Next.js (the Vercel project was imported from an empty repo, so it was not auto-detected) and runs functions in Singapore (`sin1`), next to the database.
