create extension if not exists pgcrypto;

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_id text unique not null,
  submitted_at timestamptz not null default now(),
  name text not null default 'Anonymous',
  role text not null,
  location text not null,
  faced_environment_risk text not null,
  current_alert_source text not null,
  alerts_are_timely text not null,
  rakshak_usefulness text not null,
  most_useful_feature text not null,
  preferred_language text not null,
  improvement_needed text not null,
  suggestion text not null default ''
);

create table if not exists public.source_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  endpoint text not null,
  status text not null,
  record_count integer not null default 0,
  error_message text,
  fetched_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.environmental_observations (
  id uuid primary key default gen_random_uuid(),
  observation_type text not null,
  source_name text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  observed_at timestamptz,
  fetched_at timestamptz not null default now(),
  external_id text,
  payload jsonb not null,
  unique (observation_type, source_name, external_id)
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  generated_at timestamptz not null default now(),
  algorithm text not null,
  verified_inputs jsonb not null default '{}'::jsonb,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null
);

create index if not exists idx_feedback_submitted_at
  on public.feedback_responses (submitted_at desc);

create index if not exists idx_source_fetch_logs_fetched_at
  on public.source_fetch_logs (fetched_at desc);

create index if not exists idx_observations_type_time
  on public.environmental_observations (observation_type, fetched_at desc);

create index if not exists idx_analysis_module_time
  on public.analysis_results (module, generated_at desc);

alter table public.feedback_responses enable row level security;
alter table public.source_fetch_logs enable row level security;
alter table public.environmental_observations enable row level security;
alter table public.analysis_results enable row level security;

-- No public policies are intentionally created.
-- Rakshak accesses these tables only from FastAPI using SUPABASE_SECRET_KEY.
