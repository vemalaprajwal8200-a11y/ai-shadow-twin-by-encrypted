-- Run in the Supabase SQL Editor to enable student registration.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    role text not null default 'student' check (role in ('student', 'faculty')),
    student_id text,
    course_id text,
    created_at timestamptz not null default now()
);

-- Admins add approved faculty emails here before those users register.
create table if not exists public.faculty_invites (
    email text primary key check (email = pg_catalog.lower(email)),
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.faculty_invites enable row level security;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.faculty_invites from anon, authenticated;
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
declare
    assigned_role text := 'student';
    approved_email text;
begin
    if new.raw_user_meta_data ->> 'requested_role' = 'faculty' and new.email is not null then
        delete from public.faculty_invites
        where email = pg_catalog.lower(new.email)
        returning email into approved_email;

        if approved_email is not null then
            assigned_role := 'faculty';
        end if;
    end if;

    insert into public.profiles (id, display_name, role, student_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', ''),
        assigned_role,
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

-- Before a faculty member registers, an administrator can approve one signup:
-- insert into public.faculty_invites (email)
-- values (pg_catalog.lower('faculty@example.com'))
-- on conflict (email) do nothing;
-- The trigger consumes this invite and assigns the faculty role.
--
-- To grant faculty access to an account that already exists:
-- update public.profiles p
-- set role = 'faculty'
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('faculty@example.com');