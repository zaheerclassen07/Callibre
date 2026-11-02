-- ============================================================
-- CALLIBRE v3.3.1 - NEW SUPABASE PROJECT SETUP
-- Run ONCE in a brand new Supabase project:
--   SQL Editor -> New query -> paste everything -> Run
-- Creates all 18 tables (including the Service Drive), security
-- policies, starter teams, metrics, prizes and the superadmin login.
-- Safe to re-run: nothing duplicates.
--
-- First login:  superadmin / Callibre@2026   (change it in Settings)
-- ============================================================

-- ---------- CORE TABLES ----------
create table if not exists teams (
  id text primary key,
  name text not null,
  full_name text,
  color text
);

create table if not exists agents (
  id text primary key,
  team_id text references teams(id),
  name text not null,
  emp_id text,
  color text,
  joined_week text
);

create table if not exists metrics (
  id text primary key,
  label text not null,
  pts int not null,
  icon text,
  description text
);

create table if not exists weekly_entries (
  id text primary key,
  agent_id text references agents(id) on delete cascade,
  week_label text not null,
  metric_id text not null,
  points numeric not null
);

create table if not exists prizes (
  id text primary key,
  name text not null,
  cost int not null,
  cost_rand numeric,
  icon text,
  stock_limit int,
  active boolean default true
);

create table if not exists redemptions (
  id text primary key,
  agent_id text references agents(id) on delete cascade,
  prize_name text not null,
  cost int not null,
  week text,
  date text
);

create table if not exists redeem_requests (
  id text primary key,
  agent_id text references agents(id) on delete cascade,
  prize_id text,
  prize_name text,
  cost int,
  status text default 'pending',
  date text
);

create table if not exists pp_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  role text not null default 'agent',
  agent_id text,
  team_id text,
  display_name text,
  created_at timestamp default now()
);

create table if not exists announcements (
  id text primary key,
  message text not null,
  created_by text not null,
  created_at timestamp default now(),
  expires_at timestamp,
  active boolean default true
);

create table if not exists budget_history (
  id text primary key,
  month text not null unique,
  allocated numeric default 5000,
  carryover numeric default 0,
  spend numeric default 0,
  created_at timestamp default now()
);

create table if not exists quests (
  id text primary key,
  title text not null,
  description text,
  target_type text not null,
  target_value int not null,
  team_id text,
  active boolean default true,
  created_at timestamp default now()
);

create table if not exists kudos (
  id text primary key,
  sender_id text,
  sender_name text,
  receiver_id text,
  receiver_name text,
  message text not null,
  emoji text,
  created_at text
);

create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamp default now()
);


create table if not exists custom_badges (
  id text primary key,
  name text not null,
  icon text,
  "desc" text,
  gradient_from text,
  gradient_to text,
  gradient_angle text
);

create table if not exists assigned_badges (
  id text primary key,
  badge_id text references custom_badges(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  assigned_at text
);

-- ---------- SERVICE DRIVE TABLES ----------
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


-- ---------- ROW LEVEL SECURITY ----------
-- RLS on, open policies for the app's key. Access control is
-- handled by the app's own roles (super admin, team leader, agent).
do $$
declare t text;
begin
  foreach t in array array[
    'teams','agents','metrics','weekly_entries','prizes','redemptions',
    'redeem_requests','pp_users','announcements','budget_history','app_settings',
    'quests','kudos','custom_badges','assigned_badges',
    'drive_rules','drive_scores','drive_centre'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    begin execute format('create policy "%s read" on %I for select using (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s insert" on %I for insert with check (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s update" on %I for update using (true)', t, t); exception when duplicate_object then null; end;
    begin execute format('create policy "%s delete" on %I for delete using (true)', t, t); exception when duplicate_object then null; end;
  end loop;
end $$;

-- ---------- STARTER DATA ----------

-- Teams (edit names to match your floor, or manage later in Admin -> Teams)
insert into teams (id, name, full_name, color) values
  ('csr', 'CSR', 'Client Service Reps', '#3498DB'),
  ('fa',  'FA',  'Financial Advisers Inbound', '#E74C8B')
on conflict (id) do nothing;

-- Performance metrics (same six as the original)
insert into metrics (id, label, pts, icon, description) values
  ('adherence', 'Schedule Adherence ≥95%',     50, '📅', 'Weekly adherence target'),
  ('fcr',       'First Call Resolution',       40, '✅', 'Resolved on first call'),
  ('aht',       'AHT Within Target Band',      30, '⏱️', 'Within ±30s of team avg'),
  ('coaching',  'Coaching Session Completed',  20, '🎓', 'Per session completed'),
  ('peer',      'Peer Nomination Badge',       25, '⭐', 'Max 1/week per agent'),
  ('team_sl',   'Team Service Level Met',      20, '🏆', 'Collective reward')
on conflict (id) do nothing;

-- Starter prize catalogue (edit anytime in the Prizes tab)
insert into prizes (id, name, cost, cost_rand, icon, stock_limit, active) values
  ('r1', 'R50 Checkers Voucher',    200,  50, '🛒', 5,    true),
  ('r2', 'R100 Woolworths Voucher', 380, 100, '🎁', 3,    true),
  ('r3', 'Half-Day Friday',         500,   0, '🌟', null, true),
  ('r4', 'Choice of Shift Slot',    300,   0, '📋', null, true),
  ('r5', 'Team Lunch Nomination',   450, 500, '🍽️', 2,    true),
  ('r6', 'Airtime R50',             180,  50, '📱', 8,    true)
on conflict (id) do nothing;

-- App branding (editable in-app: Settings -> App branding)
insert into app_settings (key, value) values
  ('app_name', 'Callibre'),
  ('app_tagline', 'Inbound Team Rewards')
on conflict (key) do nothing;

-- Superadmin login. Password is Callibre@2026 (SHA-256 below).
-- CHANGE IT after first login: Settings -> Change password.
insert into pp_users (id, username, password_hash, role, display_name) values
  ('u-super', 'superadmin',
   'a8e2335f572ec8b66a85484cea3731039551bc773e3b9e8beb09b86bbda09754',
   'super', 'Super Admin')
on conflict (username) do nothing;
