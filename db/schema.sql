-- HIJRAA WELLNESS schema (idempotent: safe to run on every deploy)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'doctor' check (role in ('admin','doctor','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ic text not null,
  gender text check (gender in ('Male','Female')),
  dob date,
  phone text,
  address text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists patients_ic_norm_idx on patients (upper(regexp_replace(ic, '[^0-9A-Za-z]', '', 'g')));
create index if not exists patients_name_idx on patients (lower(name));

-- Visits from previous encounters / other facilities (manual or Excel import)
create table if not exists past_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_date date,
  facility text,
  doctor text,
  complaint text,
  diagnosis text,
  treatment text,
  notes text,
  source text not null default 'manual',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists past_records_patient_idx on past_records (patient_id, visit_date desc);

create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_at timestamptz not null default now(),
  visit_type text not null default 'Consultation',
  status text not null default 'open' check (status in ('open','closed')),
  chief_complaint text,
  history text,
  examination text,
  notes text,
  bp_systolic int, bp_diastolic int, pulse int, resp_rate int,
  temperature numeric(4,1), spo2 int, weight numeric(5,1), height numeric(5,1),
  glucose numeric(4,1), pain_score int,
  investigations jsonb not null default '[]',
  diagnoses jsonb not null default '[]',
  plan text,
  doctor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists encounters_patient_idx on encounters (patient_id, encounter_at desc);

create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete cascade,
  kind text not null default 'Medication',
  name text not null,
  dose text, frequency text, duration text, instructions text,
  status text not null default 'active' check (status in ('active','completed','stopped')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists treatments_patient_idx on treatments (patient_id, created_at desc);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 15,
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no-show')),
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists appointments_time_idx on appointments (scheduled_at);
create index if not exists appointments_patient_idx on appointments (patient_id, scheduled_at desc);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  title text not null,
  category text not null default 'Other',
  mime text not null,
  size int not null,
  data bytea not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists documents_patient_idx on documents (patient_id, created_at desc);

-- v2: link follow-up appointments to the encounter that booked them
alter table appointments add column if not exists encounter_id uuid references encounters(id) on delete set null;

-- v3: investigations & diagnosis are free text written by the doctor
alter table encounters add column if not exists investigation_notes text;
alter table encounters add column if not exists diagnosis_notes text;

-- v3: sign in with a username; email is optional
alter table users add column if not exists username text;
alter table users alter column email drop not null;
update users set username = lower(email) where username is null and email is not null;
create unique index if not exists users_username_idx on users (lower(username));

-- v4: encounter layout (imaging findings, diagnosis flags) and chargeable items
alter table encounters add column if not exists imaging_notes text;
alter table encounters add column if not exists diagnosis_sensitive boolean not null default false;
alter table encounters add column if not exists diagnosis_notifiable boolean not null default false;
alter table encounters add column if not exists charges jsonb not null default '[]';
