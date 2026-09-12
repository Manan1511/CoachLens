create type delivery_status as enum (
  'DATA_SUPPRESSED',
  'FORM_BENCHMARK',
  'MECHANICAL_WATCH',
  'TECHNICAL_CONCERN'
);

create type window_pattern as enum (
  'NOT_APPLICABLE',
  'ISOLATED',
  '3_OF_5_MATCHED'
);

create table athletes (
  id text primary key,
  name text not null,
  dob date,
  guardian_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table sessions (
  id text primary key,
  athlete_id text not null references athletes(id) on delete cascade,
  session_date date not null,
  created_at timestamptz not null default now()
);

create index sessions_athlete_id_idx on sessions(athlete_id);

-- raw_keypoints/capture_metadata are jsonb, matching the ingestion contract
-- (src/schemas/delivery.py). No raw video is ever stored here.
create table deliveries (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  raw_keypoints jsonb not null,
  capture_metadata jsonb not null,
  created_at timestamptz not null default now()
);

create index deliveries_session_id_idx on deliveries(session_id);

-- One row per (athlete, metric) fixed reference baseline, e.g. metric =
-- 'front_knee_angle_deg' or 'forward_trunk_tilt_deg'.
create table baselines (
  athlete_id text not null references athletes(id) on delete cascade,
  metric text not null,
  fixed_median_deg double precision not null,
  fixed_iqr_deg double precision not null,
  confirmed_at timestamptz not null default now(),
  primary key (athlete_id, metric)
);

create table drills (
  id text primary key,
  title text not null,
  prescription text not null,
  contraindications text[] not null default '{}',
  credential text not null
);

create table verdicts (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null references deliveries(id) on delete cascade,
  status delivery_status not null,
  window_pattern window_pattern not null default 'NOT_APPLICABLE',
  window_matches integer not null default 0,
  delta_deg double precision,
  uncertainty_band_deg double precision,
  summary text not null,
  drill_id text references drills(id),
  created_at timestamptz not null default now()
);

create index verdicts_delivery_id_idx on verdicts(delivery_id);

create table coach_actions (
  id uuid primary key default gen_random_uuid(),
  verdict_id uuid not null references verdicts(id) on delete cascade,
  action text not null check (action in ('APPROVE', 'DISMISS', 'NUDGE_FFS')),
  note text,
  nudge_frame_delta integer,
  created_at timestamptz not null default now()
);

create index coach_actions_verdict_id_idx on coach_actions(verdict_id);
