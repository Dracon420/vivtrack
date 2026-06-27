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
