-- Mamascript Phase 0: core schema (profiles, vaults, entries, social)
-- Run in Supabase SQL Editor or via: supabase db push

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  mobile text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_mobile_idx on public.profiles (mobile);

-- Auto-create profile on signup (name/mobile from user_metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.email,
    new.raw_user_meta_data->>'mobile'
  )
  on conflict (id) do update set
    name = excluded.name,
    email = coalesce(excluded.email, public.profiles.email),
    mobile = coalesce(excluded.mobile, public.profiles.mobile),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Vaults & membership
-- ---------------------------------------------------------------------------
create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_members (
  vault_id uuid not null references public.vaults (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (vault_id, user_id)
);

create index if not exists vault_members_user_idx on public.vault_members (user_id);

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (vault_id, email)
);

-- ---------------------------------------------------------------------------
-- Entries (recipes, rituals, festivals, songs)
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  entry_type text not null default 'recipe' check (entry_type in ('recipe', 'ritual', 'festival', 'song')),
  title text not null,
  description text default '',
  ingredients jsonb default '[]'::jsonb,
  steps jsonb default '[]'::jsonb,
  prep_time text,
  cook_time text,
  servings text,
  notes text default '',
  occasion text,
  items_needed jsonb default '[]'::jsonb,
  participants text,
  significance text,
  time_of_year text,
  language text,
  lyrics_original text,
  lyrics_english text,
  when_sung text,
  image_url text,
  audio_path text,
  has_audio boolean not null default false,
  audio_duration double precision,
  original_language text,
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_vault_idx on public.entries (vault_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Comments & notifications
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_entry_idx on public.comments (entry_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text default '',
  link text,
  entry_id uuid references public.entries (id) on delete set null,
  vault_id uuid references public.vaults (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: is vault member
-- ---------------------------------------------------------------------------
create or replace function public.is_vault_member(p_vault_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vault_members
    where vault_id = p_vault_id and user_id = p_user_id
  );
$$;

create or replace function public.is_vault_owner(p_vault_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vault_members
    where vault_id = p_vault_id and user_id = p_user_id and role = 'owner'
  );
$$;
