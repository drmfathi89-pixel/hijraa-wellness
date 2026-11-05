# HIJRAA WELLNESS — Clinic Management System

Mobile-first clinic management system (installable PWA) built with Next.js 16 + Postgres (Neon), deployable on Vercel.

## Modules
1. **Patient biodata**: name, IC/passport, gender, DOB, age (auto), phone, address. A Malaysian IC auto-fills DOB and gender. Duplicate ICs are blocked.
2. **Past medical records**: timeline of previous visits from other facilities plus completed HIJRAA encounters. Add manually, or **import from Excel** (.xlsx/.csv) per patient or in bulk (`/import`). Rows are matched by IC, and patients are auto-created if missing.
3. **File management**: upload PDFs and images (or take a photo with the phone camera). Files are viewed **inside the app** without downloading (PDFs are rendered with pdf.js, so they work on Android too).
4. **Encounter**: patient notes (complaint, history, examination), vital signs with abnormal flags and auto BMI, investigations, diagnosis (with ICD-10), draft/complete, print.
5. **Management**: patient plan, treatment/prescriptions (active/completed/stopped), appointments (per patient and clinic calendar), follow-up booking from the encounter.

Plus: login with roles (admin/doctor/staff), user management, dashboard, PWA install.

## Deploy (Neon + Vercel)
Neon is configured in `neon.ts` (Postgres only) and linked to project `patient-shape-07791828`, branch `production` (`.neon/`).
1. `neon login`, then `neon deploy`: this provisions the services and writes `NEON_BRANCH`, `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) into `.env.local`.
2. In Vercel, import the GitHub repo and set `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `AUTH_SECRET` (`openssl rand -base64 32`).
3. Deploy. `scripts/migrate.mjs` applies the schema over the **direct** connection before `next build`. The app's queries use the **pooled** URL, validated through `parseEnv(neon.ts)`.
4. Open the site and go to **/setup** to create the first admin account.
5. On your phone: *Add to Home Screen* (iPhone Safari) or *Install app* (Android Chrome).

## Local development
```bash
npm install
neon env pull                # or: cp .env.example .env.local and fill in
npm run db:migrate
npm run dev
```

## Notes
- Files are stored in Postgres (max 4 MB each, a Vercel request limit). Large phone photos are compressed automatically.
- Patient data is never cached by the service worker. Only static assets are cached.
- Times are shown in Malaysia time (Asia/Kuala_Lumpur).
