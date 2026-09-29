-- =============================================================================
-- Migration: Roles Single Source of Truth & Trigger Setup
-- File: docs/roles_migration.sql
-- Description:
--   Creates or updates the public.profiles table to act as the single source
--   of truth for user roles ('student' or 'faculty').
--   Sets up an automatic trigger on auth.users insert to populate profiles,
--   validating the role from raw_user_meta_data.
--   Enforces Row Level Security (RLS) so users can only SELECT their own row,
--   with NO client permissions to insert or update the role column.
-- =============================================================================

-- Step 1: Create public.profiles table if it does not already exist
create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    role text not null default 'student' check (role in ('student', 'faculty')),
    student_id text,
    course_id text,
    created_at timestamptz not null default now()
);

-- Step 2: Compatibility layer for existing tables that may have used 'id' as the column name
do $$
begin
    -- If 'id' column exists but 'user_id' does not, add user_id and copy values over
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
            alter table public.profiles add column user_id uuid references auth.users(id) on delete cascade;
            update public.profiles set user_id = id where user_id is null;
        end if;
    end if;

    -- Ensure 'id' column exists if client queries expect it
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
            alter table public.profiles add column id uuid;
            update public.profiles set id = user_id where id is null;
        end if;
    end if;
end $$;

-- Step 3: Ensure check constraint on role column is strictly ('student', 'faculty')
do $$
begin
    alter table public.profiles drop constraint if exists profiles_role_check;
    alter table public.profiles add constraint profiles_role_check check (role in ('student', 'faculty'));
exception
    when others then null;
end $$;

-- Step 4: Configure Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Revoke dangerous direct permissions from anon and authenticated clients
revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

-- Allow users to SELECT only their own profile row
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
    on public.profiles
    for select
    to authenticated
    using (
        auth.uid() = user_id
        or (id is not null and auth.uid() = id)
    );

-- Allow users to update ONLY non-role display details (name, student_id)
-- Note: NO policy exists for the client to change the 'role' column!
drop policy if exists profiles_update_own_details on public.profiles;
create policy profiles_update_own_details
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = user_id or auth.uid() = id)
    with check (auth.uid() = user_id or auth.uid() = id);

-- Step 5: Create trigger function to handle new user registration
-- This function runs with SECURITY DEFINER privileges to create the profile row
-- whenever a new row is inserted into auth.users.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    raw_role text;
    valid_role text;
    meta_name text;
    meta_student_id text;
begin
    -- 1. Read role from raw_user_meta_data.
    -- Supports new standard 'role' key, with fallback to legacy 'requested_role'.
    raw_role := coalesce(
        new.raw_user_meta_data ->> 'role',
        new.raw_user_meta_data ->> 'requested_role',
        'student'
    );

    -- 2. Validate role: must be strictly 'student' or 'faculty'. Default to 'student' if missing or invalid.
    if raw_role in ('student', 'faculty') then
        valid_role := raw_role;
    else
        valid_role := 'student';
    end if;

    meta_name := coalesce(new.raw_user_meta_data ->> 'display_name', '');
    meta_student_id := nullif(new.raw_user_meta_data ->> 'student_id', '');

    -- 3. Insert new row into public.profiles
    -- Handles tables with user_id, id, or both.
    insert into public.profiles (user_id, id, display_name, role, student_id)
    values (
        new.id,
        new.id,
        meta_name,
        valid_role,
        meta_student_id
    )
    on conflict (user_id) do update
    set
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        student_id = coalesce(excluded.student_id, public.profiles.student_id),
        role = case
            when public.profiles.role = 'faculty' then 'faculty'
            else excluded.role
        end;

    return new;
end;
$$;

-- Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

-- Step 6: Backfill existing accounts created before this fix
-- Existing accounts without a profiles row get backfilled with their metadata role or default to 'student'
insert into public.profiles (user_id, id, display_name, role)
select
    u.id as user_id,
    u.id as id,
    coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
    case
        when u.raw_user_meta_data ->> 'role' in ('student', 'faculty') then u.raw_user_meta_data ->> 'role'
        when u.raw_user_meta_data ->> 'requested_role' in ('student', 'faculty') then u.raw_user_meta_data ->> 'requested_role'
        else 'student'
    end as role
from auth.users u
where not exists (
    select 1 from public.profiles p where p.user_id = u.id or p.id = u.id
)
on conflict do nothing;

-- Step 7: Helper snippet to set or update role for specific existing users by email
-- Run this in the SQL Editor to grant faculty privileges to any existing account:
-- -----------------------------------------------------------------------------
-- UPDATE public.profiles
-- SET role = 'faculty'
-- WHERE user_id IN (
--     SELECT id FROM auth.users WHERE lower(email) = lower('faculty@university.edu')
-- ) OR id IN (
--     SELECT id FROM auth.users WHERE lower(email) = lower('faculty@university.edu')
-- );
