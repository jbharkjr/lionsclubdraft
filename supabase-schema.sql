create table if not exists public.draft_app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.draft_app_state enable row level security;

drop policy if exists "Allow read draft state" on public.draft_app_state;
drop policy if exists "Allow insert draft state" on public.draft_app_state;
drop policy if exists "Allow update draft state" on public.draft_app_state;

create policy "Allow read draft state"
on public.draft_app_state
for select
to anon
using (true);

create policy "Allow insert draft state"
on public.draft_app_state
for insert
to anon
with check (true);

create policy "Allow update draft state"
on public.draft_app_state
for update
to anon
using (true)
with check (true);
