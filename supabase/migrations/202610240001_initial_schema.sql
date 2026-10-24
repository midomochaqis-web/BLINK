-- BLINK initial data model. Apply with the Supabase SQL editor or Supabase CLI.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled project' check (char_length(title) between 1 and 120),
  prompt text not null default '' check (char_length(prompt) <= 8000),
  html text not null default '' check (octet_length(html) <= 750000),
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Owners can read their projects" on public.projects;
create policy "Owners can read their projects" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Owners can create their projects" on public.projects;
create policy "Owners can create their projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can update their projects" on public.projects;
create policy "Owners can update their projects" on public.projects
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can delete their projects" on public.projects;
create policy "Owners can delete their projects" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Hourly generation quota, mutated only through the service-role RPC.
create table if not exists public.generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, window_start)
);
alter table public.generation_usage enable row level security;
revoke all on public.generation_usage from anon, authenticated;
revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;

create or replace function public.consume_generation_quota(
  p_user_id uuid,
  p_limit integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
  v_window timestamptz := date_trunc('hour', now());
begin
  if p_user_id is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid quota parameters';
  end if;

  insert into public.generation_usage (user_id, window_start, request_count)
  values (p_user_id, v_window, 1)
  on conflict (user_id, window_start)
  do update set request_count = public.generation_usage.request_count + 1
    where public.generation_usage.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.consume_generation_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_generation_quota(uuid, integer) to service_role;
