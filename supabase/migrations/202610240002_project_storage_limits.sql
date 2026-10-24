-- Bound user-controlled project source size at the database layer as well as the API layer.
-- This protects storage even when an authenticated client writes directly through PostgREST.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_files_limits_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_files_limits_check
      check (
        jsonb_typeof(files) = 'array'
        and jsonb_array_length(files) <= 30
        and octet_length(files::text) <= 1500000
      );
  end if;
end
$$;
