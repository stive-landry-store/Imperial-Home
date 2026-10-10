create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_own_select" on public.push_subscriptions;
create policy "push_own_select" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push_own_insert" on public.push_subscriptions;
create policy "push_own_insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push_own_update" on public.push_subscriptions;
create policy "push_own_update" on public.push_subscriptions for update using (auth.uid() = user_id);
drop policy if exists "push_own_delete" on public.push_subscriptions;
create policy "push_own_delete" on public.push_subscriptions for delete using (auth.uid() = user_id);
