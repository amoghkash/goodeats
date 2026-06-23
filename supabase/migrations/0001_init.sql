-- GoodEats schema: profiles, entries, push subscriptions + RLS + photo storage.
-- Safe to run once on a fresh Supabase project (SQL editor or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_path text not null,
  caption text,
  meal_type public.meal_type not null default 'snack',
  created_at timestamptz not null default now()
);

create index if not exists entries_created_at_idx
  on public.entries (created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Two trusted friends: everyone authenticated can READ the shared feed,
-- but can only write/delete their OWN rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Entries
create policy "entries readable by authenticated"
  on public.entries for select to authenticated using (true);
create policy "users insert own entries"
  on public.entries for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own entries"
  on public.entries for delete to authenticated using (auth.uid() = user_id);

-- Push subscriptions (private to each user)
create policy "users read own subscriptions"
  on public.push_subscriptions for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own subscriptions"
  on public.push_subscriptions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own subscriptions"
  on public.push_subscriptions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own subscriptions"
  on public.push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Photo storage (private bucket; files live under a <user-id>/ prefix)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

create policy "meal photos readable by authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos');

create policy "users upload own meal photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own meal photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
