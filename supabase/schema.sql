-- Run in Supabase SQL Editor before going live.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  public_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;
alter table public.wallets enable row level security;

create policy "anon_insert_subscribers"
  on public.subscribers for insert
  to anon
  with check (true);

create policy "anon_insert_wallets"
  on public.wallets for insert
  to anon
  with check (true);
