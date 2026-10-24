-- BLINK production schema: profiles, projects, AI conversations/messages, and quota.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '' check (char_length(display_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled project' check (char_length(title) between 1 and 120),
  prompt text not null default '' check (char_length(prompt) <= 8000),
  html text not null default '' check (octet_length(html) <= 750000),
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 30 and octet_length(files::text) <= 1500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'New project conversation' check (char_length(title) between 1 and 180),
  model text not null default 'gpt-4.1-mini' check (char_length(model) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 60000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 12000),
  created_at timestamptz not null default now()
);

create table if not exists public.generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count between 0 and 100),
  primary key (user_id, window_start)
);

create index if not exists projects_user_updated_idx on public.projects(user_id, updated_at desc);
create index if not exists ai_conversations_project_idx on public.ai_conversations(project_id);
create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at asc, id asc);
create index if not exists ai_messages_user_created_idx on public.ai_messages(user_id, created_at desc);

create or replace function public.blink_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end; $$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute function public.blink_set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.blink_set_updated_at();
drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.blink_set_updated_at();

create or replace function public.blink_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.user_profiles(id,email,display_name)
 values(new.id,new.email,pg_catalog.left(pg_catalog.coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(pg_catalog.split_part(pg_catalog.coalesce(new.email,''),'@',1),'')),120))
 on conflict(id) do update set email=excluded.email;
 return new;
end; $$;
drop trigger if exists blink_auth_user_created on auth.users;
create trigger blink_auth_user_created after insert on auth.users for each row execute function public.blink_handle_new_user();

create or replace function public.consume_generation_quota(p_user_id uuid, p_limit integer default 20)
returns boolean language plpgsql security definer set search_path = 'pg_catalog','public' as $$
declare v_count integer; v_window timestamptz := pg_catalog.date_trunc('hour',pg_catalog.now());
begin
 if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Not authorized to consume quota for another user' using errcode='42501'; end if;
 if p_limit < 1 or p_limit > 100 then raise exception 'Invalid quota limit' using errcode='22023'; end if;
 insert into public.generation_usage(user_id,window_start,request_count) values(auth.uid(),v_window,1)
 on conflict(user_id,window_start) do update set request_count=public.generation_usage.request_count+1 where public.generation_usage.request_count<p_limit
 returning request_count into v_count;
 return v_count is not null;
end; $$;

create or replace function public.blink_schema_ready()
returns boolean language sql stable set search_path = '' as $$
 select pg_catalog.to_regclass('public.user_profiles') is not null
 and pg_catalog.to_regclass('public.projects') is not null
 and pg_catalog.to_regclass('public.ai_conversations') is not null
 and pg_catalog.to_regclass('public.ai_messages') is not null
 and pg_catalog.to_regclass('public.generation_usage') is not null; $$;

alter table public.user_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.generation_usage enable row level security;

drop policy if exists "Users can read their profile" on public.user_profiles;
create policy "Users can read their profile" on public.user_profiles for select to authenticated using((select auth.uid())=id);
drop policy if exists "Users can insert their profile" on public.user_profiles;
create policy "Users can insert their profile" on public.user_profiles for insert to authenticated with check((select auth.uid())=id);
drop policy if exists "Users can update their profile" on public.user_profiles;
create policy "Users can update their profile" on public.user_profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);

drop policy if exists "Owners can read their projects" on public.projects;
create policy "Owners can read their projects" on public.projects for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Owners can create their projects" on public.projects;
create policy "Owners can create their projects" on public.projects for insert to authenticated with check((select auth.uid())=user_id);
drop policy if exists "Owners can update their projects" on public.projects;
create policy "Owners can update their projects" on public.projects for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists "Owners can delete their projects" on public.projects;
create policy "Owners can delete their projects" on public.projects for delete to authenticated using((select auth.uid())=user_id);

drop policy if exists "Owners can read their AI conversations" on public.ai_conversations;
create policy "Owners can read their AI conversations" on public.ai_conversations for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
drop policy if exists "Owners can create their AI conversations" on public.ai_conversations;
create policy "Owners can create their AI conversations" on public.ai_conversations for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
drop policy if exists "Owners can update their AI conversations" on public.ai_conversations;
create policy "Owners can update their AI conversations" on public.ai_conversations for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
drop policy if exists "Owners can delete their AI conversations" on public.ai_conversations;
create policy "Owners can delete their AI conversations" on public.ai_conversations for delete to authenticated using((select auth.uid())=user_id);

drop policy if exists "Owners can read their AI messages" on public.ai_messages;
create policy "Owners can read their AI messages" on public.ai_messages for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
drop policy if exists "Owners can add messages to their conversations" on public.ai_messages;
create policy "Owners can add messages to their conversations" on public.ai_messages for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
drop policy if exists "Owners can delete their AI messages" on public.ai_messages;
create policy "Owners can delete their AI messages" on public.ai_messages for delete to authenticated using((select auth.uid())=user_id and exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));

grant usage on schema public to authenticated;
grant select,insert,update on public.user_profiles to authenticated;
grant select,insert,update,delete on public.projects to authenticated;
grant select,insert,update,delete on public.ai_conversations to authenticated;
grant select,insert,delete on public.ai_messages to authenticated;
revoke all on public.generation_usage from public,anon,authenticated;
revoke all on function public.consume_generation_quota(uuid,integer) from public,anon;
grant execute on function public.consume_generation_quota(uuid,integer) to authenticated;
revoke all on function public.blink_schema_ready() from public,anon,authenticated;
grant execute on function public.blink_schema_ready() to service_role;
revoke all on function public.blink_set_updated_at() from public,anon,authenticated;
revoke all on function public.blink_handle_new_user() from public,anon,authenticated;