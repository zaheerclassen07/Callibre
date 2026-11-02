-- ============================================================
-- CALLIBRE v3.3.0 - INBOUND SERVICE DRIVE
-- Run ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run. Does not touch any existing table or data.
-- ============================================================

-- The drive rules (points, limits, targets). One row, id = 'main'.
create table if not exists drive_rules (
  id text primary key,
  rules jsonb not null,
  updated_at timestamp default now()
);

-- One row per agent per month.
create table if not exists drive_scores (
  id text primary key,
  month text not null,                 -- e.g. 2026-11
  agent_id text references agents(id) on delete cascade,
  days_off int,
  times_late int,
  adherence numeric,                   -- 0.95 = 95%
  qa numeric,                          -- 0.85 = 85%
  final_warning boolean default false,
  updated_at timestamp default now(),
  unique (month, agent_id)
);

-- Centre results per month.
create table if not exists drive_centre (
  month text primary key,
  asa numeric,                         -- seconds
  answer_rate numeric,                 -- 0.95 = 95%
  updated_at timestamp default now()
);

do $$
declare t text;
begin
  foreach t in array array['drive_rules','drive_scores','drive_centre']
  loop
    execute format('alter table %I enable row level security', t);
    begin execute format('create policy "%s read" on %I for select using (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s insert" on %I for insert with check (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s update" on %I for update using (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s delete" on %I for delete using (true)', t, t); exception when duplicate_object then null; end;
  end loop;
end $$;
