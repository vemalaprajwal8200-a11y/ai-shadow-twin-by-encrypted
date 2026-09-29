-- Run in the Supabase SQL Editor to enable verified student registration.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    role text not null default 'student' check (role in ('student', 'faculty')),
    student_id text,
    course_id text,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, role, student_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', ''),
        'student',
        nullif(new.raw_user_meta_data ->> 'student_id', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, role)
select
    id,
    coalesce(raw_user_meta_data ->> 'display_name', ''),
    'student'
from auth.users
on conflict (id) do nothing;

-- Run as a Supabase project administrator to grant faculty access:
-- update public.profiles p
-- set role = 'faculty'
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('faculty@example.com');