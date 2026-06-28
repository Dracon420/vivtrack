-- VivTrack Database Schema (safe to re-run)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/qdtokactmtyrpomfayga/sql/new

-- Drop existing policies so re-run doesn't error
drop policy if exists "Users own their animals" on public.animals;
drop policy if exists "Users own their enclosures" on public.enclosures;
drop policy if exists "Users own their care events" on public.care_events;
drop policy if exists "Users own their care schedules" on public.animal_care_schedules;
drop policy if exists "Users own their weight records" on public.weight_records;
drop policy if exists "Users own their medications" on public.medications;
drop policy if exists "Users own their feeder colonies" on public.feeder_colonies;
drop policy if exists "Users own their CUC cultures" on public.cuc_cultures;
drop policy if exists "Users own their colony events" on public.colony_log_events;

-- Animals
create table if not exists public.animals (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  qr_code_token text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.animals enable row level security;
create policy "Users own their animals" on public.animals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists animals_qr_token_idx on public.animals (qr_code_token);

-- Enclosures
create table if not exists public.enclosures (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.enclosures enable row level security;
create policy "Users own their enclosures" on public.enclosures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Care events
create table if not exists public.care_events (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  animal_id uuid not null,
  type text not null,
  occurred_at timestamptz not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.care_events enable row level security;
create policy "Users own their care events" on public.care_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists care_events_animal_id_idx on public.care_events (animal_id);
create index if not exists care_events_animal_type_idx on public.care_events (animal_id, type);

-- Animal care schedules
create table if not exists public.animal_care_schedules (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  animal_id uuid not null unique,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.animal_care_schedules enable row level security;
create policy "Users own their care schedules" on public.animal_care_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists schedules_animal_id_idx on public.animal_care_schedules (animal_id);

-- Weight records
create table if not exists public.weight_records (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  animal_id uuid not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.weight_records enable row level security;
create policy "Users own their weight records" on public.weight_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists weight_records_animal_id_idx on public.weight_records (animal_id);

-- Medications
create table if not exists public.medications (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  animal_id uuid not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.medications enable row level security;
create policy "Users own their medications" on public.medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists medications_animal_id_idx on public.medications (animal_id);

-- Feeder colonies
create table if not exists public.feeder_colonies (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.feeder_colonies enable row level security;
create policy "Users own their feeder colonies" on public.feeder_colonies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CUC cultures
create table if not exists public.cuc_cultures (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.cuc_cultures enable row level security;
create policy "Users own their CUC cultures" on public.cuc_cultures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Colony log events
create table if not exists public.colony_log_events (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  colony_id uuid not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.colony_log_events enable row level security;
create policy "Users own their colony events" on public.colony_log_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists colony_log_events_colony_id_idx on public.colony_log_events (colony_id);

-- Plants
drop policy if exists "Users own their plants" on public.plants;
create table if not exists public.plants (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.plants enable row level security;
create policy "Users own their plants" on public.plants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expenses
drop policy if exists "Users own their expenses" on public.expenses;
create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy "Users own their expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists expenses_user_id_idx on public.expenses (user_id);

-- ── Subscription / Freemium ───────────────────────────────────────────────

-- User profiles (subscription tier)
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  plan_type text check (plan_type in ('monthly', 'annual', 'lifetime')),
  is_trialing boolean not null default false,
  ls_customer_id text,
  ls_subscription_id text,
  ls_customer_portal_url text,
  subscription_expires_at timestamptz,
  promo_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If you ran an earlier version of this schema (with paddle_ columns), run these once:
-- alter table public.profiles add column if not exists plan_type text;
-- alter table public.profiles add column if not exists is_trialing boolean not null default false;
-- alter table public.profiles add column if not exists ls_customer_id text;
-- alter table public.profiles add column if not exists ls_subscription_id text;
-- alter table public.profiles add column if not exists ls_customer_portal_url text;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- Promo codes table
drop policy if exists "Authenticated users can check codes" on public.promo_codes;
create table if not exists public.promo_codes (
  code text primary key,
  description text,
  is_active boolean default true,
  max_uses integer,
  uses_count integer default 0,
  grants_tier text default 'pro',
  created_at timestamptz default now()
);
alter table public.promo_codes enable row level security;
create policy "Authenticated users can check codes" on public.promo_codes
  for select to authenticated using (is_active = true);

-- Auto-create profile when a new user signs up
create or replace function public.create_user_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_user_profile();

-- Promo code redemption (runs server-side with elevated privileges)
create or replace function public.redeem_promo_code(p_code text)
returns json language plpgsql security definer as $$
declare
  v_code public.promo_codes%rowtype;
  v_user_id uuid;
  v_profile public.profiles%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into v_profile from public.profiles where user_id = v_user_id;
  if not found then
    insert into public.profiles (user_id) values (v_user_id);
    select * into v_profile from public.profiles where user_id = v_user_id;
  end if;

  if v_profile.subscription_tier = 'pro' then
    return json_build_object('success', false, 'error', 'Already on Pro tier');
  end if;
  if v_profile.promo_code is not null then
    return json_build_object('success', false, 'error', 'A promo code has already been used on this account');
  end if;

  select * into v_code from public.promo_codes
    where code = upper(p_code) and is_active = true;
  if not found then
    return json_build_object('success', false, 'error', 'Invalid or expired code');
  end if;

  if v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses then
    return json_build_object('success', false, 'error', 'This code has reached its use limit');
  end if;

  update public.promo_codes set uses_count = uses_count + 1 where code = upper(p_code);
  update public.profiles set
    subscription_tier = v_code.grants_tier,
    promo_code = upper(p_code),
    updated_at = now()
  where user_id = v_user_id;

  return json_build_object('success', true, 'tier', v_code.grants_tier);
end;
$$;

-- Manual utility to correct a subscription record by LS customer ID if needed.
create or replace function public.update_ls_subscription(
  p_ls_customer_id text,
  p_ls_subscription_id text,
  p_tier text,
  p_plan_type text default null,
  p_is_trialing boolean default false,
  p_expires_at timestamptz default null
)
returns void language plpgsql security definer as $$
begin
  update public.profiles set
    subscription_tier = p_tier,
    plan_type = p_plan_type,
    is_trialing = p_is_trialing,
    ls_subscription_id = p_ls_subscription_id,
    subscription_expires_at = p_expires_at,
    updated_at = now()
  where ls_customer_id = p_ls_customer_id;
end;
$$;

-- Seed sample promo codes (safe to re-run)
insert into public.promo_codes (code, description, is_active, max_uses) values
  ('VIVTRACK_BETA', 'Beta tester — unlimited pro access', true, null),
  ('FOUNDER2026', 'Founder access — first 50 users', true, 50)
on conflict (code) do nothing;

-- Enable realtime (ignore if already added)
do $$ begin alter publication supabase_realtime add table public.animals; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.enclosures; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.care_events; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.animal_care_schedules; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.weight_records; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.medications; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.feeder_colonies; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.cuc_cultures; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.colony_log_events; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.plants; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.expenses; exception when others then null; end $$;
