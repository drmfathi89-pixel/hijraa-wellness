# HIJRAA WELLNESS — Clinic Management System

Mobile-first clinic management system (installable PWA) built with Next.js 16 + Postgres (Neon), deployable on Vercel.

## Modules
1. **Patient biodata**: name, IC/passport, gender, DOB, age (auto), phone, address. A Malaysian IC auto-fills DOB and gender. Duplicate ICs are blocked.
2. **Past medical records**: timeline of previous visits from other facilities plus completed HIJRAA encounters. Add manually, or **import from Excel** (.xlsx/.csv) per patient or in bulk (`/import`). Rows are matched by IC, and patients are auto-created if missing.
3. **File management**: upload PDFs and images (or take a photo with the phone camera). Files are viewed **inside the app** without downloading (PDFs are rendered with pdf.js, so they work on Android too).
4. **Encounter**: patient notes (complaint, history, examination), vital signs with abnormal flags and auto BMI, investigations, diagnosis (with ICD-10), draft/complete, print.
5. **Management**: patient plan, treatment/prescriptions (active/completed/stopped), appointments (per patient and clinic calendar), follow-up booking from the encounter.

Plus: login with roles (admin/doctor/staff), user management, dashboard, PWA install.

## Deploy (GitHub → Vercel + Neon)
1. Create a Neon project → copy the **pooled** connection string.
2. Import this GitHub repo in Vercel → add environment variables `DATABASE_URL` and `AUTH_SECRET` (`openssl rand -base64 32`).
   (Or add the Neon integration from the Vercel Marketplace, which sets `DATABASE_URL` for you.)
3. Deploy. The database schema is applied automatically during the build (`scripts/migrate.mjs`).
4. Open the site → you are taken to **/setup** to create the first admin account.
5. On your phone: open the site → *Add to Home Screen* (iPhone Safari) / *Install app* (Android Chrome).

## Local development
```bash
cp .env.example .env.local   # fill in values
npm install
npm run db:migrate
npm run dev
```

## Notes
- Files are stored in Postgres (max 4 MB each, a Vercel request limit). Large phone photos are compressed automatically.
- Patient data is never cached by the service worker. Only static assets are cached.
- Times are shown in Malaysia time (Asia/Kuala_Lumpur).
