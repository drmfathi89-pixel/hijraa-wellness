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
Neon is configured in `neon.ts` (Postgres only) and linked to project `patient-shape-07791828`, branch `production`.
1. Push this repo to GitHub.
2. In Vercel, go to **Add New → Project**, import the repo, and add these environment variables:
   - `DATABASE_URL`: Neon's **pooled** connection string (Neon console → project → **Connect**, connection pooling on).
   - `DATABASE_URL_UNPOOLED` (recommended): the same string with pooling off, used for migrations.
   - `AUTH_SECRET` (optional): if omitted, the session key is derived from `DATABASE_URL`.
3. Deploy. `scripts/migrate.mjs` applies the schema before `next build`.
4. Open the site and go to **/setup** to create the first admin account.
5. On your phone: *Add to Home Screen* (iPhone Safari) or *Install app* (Android Chrome).

With the Neon CLI, `neon deploy` / `neon env pull` writes the same variables into `.env.local`.

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
- `vercel.json` runs the app's functions in Singapore (`sin1`), next to the Neon database (`ap-southeast-1`), so each query is a short round trip.

## WhatsApp gateway (automatic sending)
Without a gateway, WhatsApp messages open in the WhatsApp app for you to press send. To send automatically from the clinic's own number:
- **This PC** (recommended, free): the clinic PC runs **HIJRAA PC Gateway** (`pc-gateway/`, downloadable in the app as a zip). It links WhatsApp by QR, then polls `/api/pc-gateway/sync` with a PC token, so nothing on the internet has to reach the PC. Messages queue in `wa_outbox` while the PC is off. Test without WhatsApp: `node index.mjs --mock --url http://localhost:3000 --token <token>`.
- **WAHA** (free, self-hosted): run the `devlikeapro/waha` Docker image on an always-on host with `WAHA_API_KEY` set. In the app, go to **WhatsApp → Gateway**, choose WAHA, enter its address and API key, then **Connect phone** and scan the QR code (WhatsApp → Linked devices).
- **Fonnte** (hosted): link the phone on fonnte.com, then paste the device token under **WhatsApp → Gateway**.

Automatic evening TCA reminders run daily at 12:00 UTC (8 pm Malaysia) via `vercel.json` crons. They need a `CRON_SECRET` environment variable in Vercel, plus the "Send TCA reminders automatically" option ticked.
