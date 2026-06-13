-- Plately — run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Creates a per-user state table protected by Row Level Security so each account
-- can only read/write its own row. The whole app state is stored as one JSON blob.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- A user may only see and modify the row whose user_id matches their auth uid.
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Structured per-user profile (identity + body stats + computed targets).
-- The app also keeps this inside the app_state blob; this table makes the user's
-- information a first-class, queryable record in the database. Same RLS pattern.
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  name         text,
  sex          text,
  age          int,
  height_cm    numeric,
  units        text default 'imperial',
  start_weight numeric,
  goal_weight  numeric,
  activity     text,
  goal_type    text,
  goal_kcal    int,
  goal_protein int,
  goal_carbs   int,
  goal_fat     int,
  onboarded    boolean not null default false,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
