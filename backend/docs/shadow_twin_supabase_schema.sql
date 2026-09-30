-- Shadow-Twin Supabase schema for the Vite + FastAPI application.
-- Run this entire file once in the Supabase SQL Editor. It is safe to rerun.
-- Backend service-role operations stay server-side; browser access uses RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    user_id uuid unique references auth.users(id) on delete cascade,
    full_name text not null default '',
    display_name text not null default '',
    role text not null default 'student' check (role in ('student', 'faculty')),
    institution text,
    department text,
    student_id text,
    course_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists institution text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists course_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
update public.profiles set id = user_id where id is null and user_id is not null;
update public.profiles set user_id = id where user_id is null and id is not null;
update public.profiles set full_name = display_name where full_name = '' and display_name <> '';
update public.profiles set display_name = full_name where display_name = '' and full_name <> '';
create unique index if not exists profiles_id_uidx on public.profiles(id);
create unique index if not exists profiles_user_id_uidx on public.profiles(user_id);
alter table public.profiles alter column role set default 'student';

create table if not exists public.faculty_invites (
    email text primary key check (email = lower(email)),
    created_at timestamptz not null default now()
);
alter table public.faculty_invites enable row level security;
revoke all on public.faculty_invites from anon, authenticated;

create table if not exists public.user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    runs_per_item integer not null default 1 check (runs_per_item between 1 and 10),
    confidence_threshold numeric(4,3) not null default 0.65 check (confidence_threshold between 0 and 1),
    theme text not null default 'light' check (theme in ('light', 'dark')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.personas (
    persona_id uuid primary key default gen_random_uuid(),
    faculty_id uuid references auth.users(id) on delete cascade,
    name text not null,
    description text,
    prompt text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.courses (
    course_id text primary key default gen_random_uuid()::text,
    faculty_id uuid not null references auth.users(id) on delete cascade,
    course_name text not null,
    course_code text,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.courses add column if not exists faculty_id uuid references auth.users(id) on delete cascade;
alter table public.courses add column if not exists course_name text;
alter table public.courses add column if not exists filename text;
alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists updated_at timestamptz not null default now();
update public.courses set course_name = coalesce(course_name, filename, 'Untitled course') where course_name is null;

create table if not exists public.units (
    unit_id uuid primary key default gen_random_uuid(),
    course_id text not null references public.courses(course_id) on delete cascade,
    unit_name text not null,
    unit_order integer not null default 1,
    created_at timestamptz not null default now(),
    unique (course_id, unit_order)
);

create table if not exists public.uploads (
    upload_id uuid primary key default gen_random_uuid(),
    course_id text not null references public.courses(course_id) on delete cascade,
    unit_id uuid references public.units(unit_id) on delete set null,
    uploaded_by uuid not null references auth.users(id) on delete cascade,
    file_name text not null,
    file_type text not null,
    file_size_bytes bigint not null default 0,
    storage_path text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.content_items (
    content_item_id uuid primary key default gen_random_uuid(),
    course_id text not null references public.courses(course_id) on delete cascade,
    unit_id uuid references public.units(unit_id) on delete set null,
    upload_id uuid references public.uploads(upload_id) on delete cascade,
    item_type text not null check (item_type in ('slide', 'question')),
    title text not null default '',
    content_text text not null,
    answer_key text,
    order_index integer not null default 1,
    created_at timestamptz not null default now(),
    unique (upload_id, order_index)
);

create table if not exists public.analysis_runs (
    analysis_run_id uuid primary key default gen_random_uuid(),
    course_id text not null references public.courses(course_id) on delete cascade,
    started_by uuid not null references auth.users(id) on delete cascade,
    status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
    processed_items integer not null default 0,
    total_items integer not null default 0,
    error_message text,
    created_at timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz
);

alter table public.analysis_runs add column if not exists error_message text;

create table if not exists public.item_results (
    result_id uuid primary key default gen_random_uuid(),
    analysis_run_id uuid not null references public.analysis_runs(analysis_run_id) on delete cascade,
    content_item_id uuid not null references public.content_items(content_item_id) on delete cascade,
    persona_id uuid references public.personas(persona_id) on delete set null,
    answer text not null default '',
    reasoning text not null default '',
    confidence numeric(4,3) not null check (confidence between 0 and 1),
    created_at timestamptz not null default now()
);

create table if not exists public.verdicts (
    verdict_id uuid primary key default gen_random_uuid(),
    analysis_run_id uuid not null references public.analysis_runs(analysis_run_id) on delete cascade,
    course_id text not null references public.courses(course_id) on delete cascade,
    content_item_id uuid not null unique references public.content_items(content_item_id) on delete cascade,
    verdict text not null check (verdict in ('clear', 'ambiguous', 'flawed')),
    confidence numeric(4,3) not null check (confidence between 0 and 1),
    reason text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.flags (
    flag_id uuid primary key default gen_random_uuid(),
    analysis_run_id uuid not null references public.analysis_runs(analysis_run_id) on delete cascade,
    course_id text not null references public.courses(course_id) on delete cascade,
    content_item_id uuid not null unique references public.content_items(content_item_id) on delete cascade,
    verdict_id uuid references public.verdicts(verdict_id) on delete set null,
    status text not null default 'open' check (status in ('open', 'confirmed', 'dismissed', 'resolved')),
    severity text not null default 'medium',
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    review_note text,
    created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
    session_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id text not null references public.courses(course_id) on delete cascade,
    title text not null default 'New Conversation',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
    message_id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(session_id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.report_exports (
    export_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id text references public.courses(course_id) on delete set null,
    file_name text not null,
    row_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists courses_faculty_idx on public.courses(faculty_id);
create index if not exists units_course_order_idx on public.units(course_id, unit_order);
create index if not exists uploads_course_idx on public.uploads(course_id, created_at);
create index if not exists content_items_course_idx on public.content_items(course_id, order_index);
create index if not exists analysis_runs_course_idx on public.analysis_runs(course_id, created_at desc);
create index if not exists item_results_item_idx on public.item_results(content_item_id);
create index if not exists verdicts_course_idx on public.verdicts(course_id);
create index if not exists flags_course_status_idx on public.flags(course_id, status);
create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.personas enable row level security;
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.uploads enable row level security;
alter table public.content_items enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.item_results enable row level security;
alter table public.verdicts enable row level security;
alter table public.flags enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.report_exports enable row level security;

-- Policies scope faculty data to auth.uid(); the service-role backend bypasses RLS.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = user_id or auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = user_id or auth.uid() = id) with check (auth.uid() = user_id or auth.uid() = id);

drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists personas_read_available on public.personas;
create policy personas_read_available on public.personas for select to authenticated using (faculty_id is null or faculty_id = auth.uid());
drop policy if exists personas_manage_own on public.personas;
create policy personas_manage_own on public.personas for all to authenticated using (faculty_id = auth.uid()) with check (faculty_id = auth.uid());

drop policy if exists courses_manage_own on public.courses;
create policy courses_manage_own on public.courses for all to authenticated using (faculty_id = auth.uid()) with check (faculty_id = auth.uid());

drop policy if exists units_course_owner on public.units;
create policy units_course_owner on public.units for all to authenticated using (exists (select 1 from public.courses c where c.course_id = units.course_id and c.faculty_id = auth.uid())) with check (exists (select 1 from public.courses c where c.course_id = units.course_id and c.faculty_id = auth.uid()));
drop policy if exists uploads_course_owner on public.uploads;
create policy uploads_course_owner on public.uploads for all to authenticated using (exists (select 1 from public.courses c where c.course_id = uploads.course_id and c.faculty_id = auth.uid())) with check (uploaded_by = auth.uid() and exists (select 1 from public.courses c where c.course_id = uploads.course_id and c.faculty_id = auth.uid()));
drop policy if exists content_items_course_owner on public.content_items;
create policy content_items_course_owner on public.content_items for all to authenticated using (exists (select 1 from public.courses c where c.course_id = content_items.course_id and c.faculty_id = auth.uid())) with check (exists (select 1 from public.courses c where c.course_id = content_items.course_id and c.faculty_id = auth.uid()));
drop policy if exists analysis_runs_course_owner on public.analysis_runs;
create policy analysis_runs_course_owner on public.analysis_runs for all to authenticated using (exists (select 1 from public.courses c where c.course_id = analysis_runs.course_id and c.faculty_id = auth.uid())) with check (started_by = auth.uid() and exists (select 1 from public.courses c where c.course_id = analysis_runs.course_id and c.faculty_id = auth.uid()));
drop policy if exists item_results_course_owner on public.item_results;
create policy item_results_course_owner on public.item_results for all to authenticated using (exists (select 1 from public.content_items i join public.courses c using (course_id) where i.content_item_id = item_results.content_item_id and c.faculty_id = auth.uid())) with check (exists (select 1 from public.content_items i join public.courses c using (course_id) where i.content_item_id = item_results.content_item_id and c.faculty_id = auth.uid()));
drop policy if exists verdicts_course_owner on public.verdicts;
create policy verdicts_course_owner on public.verdicts for all to authenticated using (exists (select 1 from public.courses c where c.course_id = verdicts.course_id and c.faculty_id = auth.uid())) with check (exists (select 1 from public.courses c where c.course_id = verdicts.course_id and c.faculty_id = auth.uid()));
drop policy if exists flags_course_owner on public.flags;
create policy flags_course_owner on public.flags for all to authenticated using (exists (select 1 from public.courses c where c.course_id = flags.course_id and c.faculty_id = auth.uid())) with check (exists (select 1 from public.courses c where c.course_id = flags.course_id and c.faculty_id = auth.uid()));
drop policy if exists chat_sessions_own on public.chat_sessions;
create policy chat_sessions_own on public.chat_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists chat_messages_own on public.chat_messages;
create policy chat_messages_own on public.chat_messages for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.chat_sessions s where s.session_id = chat_messages.session_id and s.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.chat_sessions s where s.session_id = chat_messages.session_id and s.user_id = auth.uid()));
drop policy if exists report_exports_own on public.report_exports;
create policy report_exports_own on public.report_exports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    assigned_role text := 'student';
    user_full_name text;
    approved_email text;
begin
    if coalesce(new.raw_user_meta_data ->> 'role', new.raw_user_meta_data ->> 'requested_role') = 'faculty' and new.email is not null then
        delete from public.faculty_invites
        where email = lower(new.email)
        returning email into approved_email;
        if approved_email is not null then assigned_role := 'faculty'; end if;
    end if;
    user_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1));
    insert into public.profiles (id, user_id, full_name, display_name, role)
    values (new.id, new.id, user_full_name, user_full_name, assigned_role)
    on conflict (id) do update set full_name = excluded.full_name, display_name = excluded.display_name;
    insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, user_id, full_name, display_name, role)
select u.id, u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'display_name', split_part(coalesce(u.email, ''), '@', 1)),
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'display_name', split_part(coalesce(u.email, ''), '@', 1)),
       'student'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id or p.user_id = u.id)
on conflict do nothing;

insert into public.user_settings (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- Faculty access is granted by an administrator after verifying the account:
-- update public.profiles p set role = 'faculty'
-- from auth.users u where p.user_id = u.id and lower(u.email) = lower('faculty@example.com');

insert into public.personas (faculty_id, name, description, prompt, is_active)
select null, seed.name, seed.description, seed.prompt, true
from (values
    ('Beginner', 'Needs patient, step-by-step explanations.', 'Reason like a beginning student and state each step.'),
    ('Average', 'Understands core ideas and common examples.', 'Reason like an average student with standard course preparation.'),
    ('Careful', 'Checks assumptions and edge cases.', 'Reason carefully, validate assumptions, and consider edge cases.')
) as seed(name, description, prompt)
where not exists (select 1 from public.personas p where p.faculty_id is null and p.name = seed.name);

-- Private upload bucket and per-user path policy: <user_id>/<course_id>/<file_name>.
insert into storage.buckets (id, name, public) values ('course-uploads', 'course-uploads', false)
on conflict (id) do update set public = false;
drop policy if exists course_uploads_read_own on storage.objects;
create policy course_uploads_read_own on storage.objects for select to authenticated using (bucket_id = 'course-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists course_uploads_insert_own on storage.objects;
create policy course_uploads_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'course-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists course_uploads_update_own on storage.objects;
create policy course_uploads_update_own on storage.objects for update to authenticated using (bucket_id = 'course-uploads' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'course-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists course_uploads_delete_own on storage.objects;
create policy course_uploads_delete_own on storage.objects for delete to authenticated using (bucket_id = 'course-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace view public.v_twin_status with (security_invoker = true) as
select coalesce((
    select case when r.status = 'running' then 'Analyzing' when r.status = 'queued' then 'Queued' when r.status = 'failed' then 'Needs attention' else 'Ready' end
    from public.analysis_runs r join public.courses c using (course_id)
    where c.faculty_id = auth.uid() order by r.created_at desc limit 1
), 'Ready') as status_label;

create or replace view public.v_course_overview with (security_invoker = true) as
select c.course_id, c.faculty_id, c.course_name, c.course_code, c.description, c.created_at,
       (select count(*) from public.units u where u.course_id = c.course_id) as unit_count,
       (select count(*) from public.content_items i where i.course_id = c.course_id) as item_count,
       (select max(r.completed_at) from public.analysis_runs r where r.course_id = c.course_id and r.status = 'completed') as last_analyzed_at,
       coalesce((select r.status from public.analysis_runs r where r.course_id = c.course_id order by r.created_at desc limit 1), 'not_started') as status_label
from public.courses c where c.faculty_id = auth.uid();

create or replace view public.v_flagged_per_unit with (security_invoker = true) as
select u.course_id, u.unit_id, u.unit_name, u.unit_order,
       count(i.content_item_id) as item_count,
       count(i.content_item_id) filter (where f.flag_id is not null) as flagged_count
from public.units u left join public.content_items i on i.unit_id = u.unit_id
left join public.flags f on f.content_item_id = i.content_item_id and f.status <> 'dismissed'
group by u.course_id, u.unit_id, u.unit_name, u.unit_order;

create or replace view public.v_verdict_split with (security_invoker = true) as
with counts as (
    select course_id, verdict, count(*)::integer as item_count from public.verdicts group by course_id, verdict
)
select course_id, verdict, item_count,
       round(100.0 * item_count / nullif(sum(item_count) over (partition by course_id), 0), 1) as pct
from counts;

create or replace view public.v_needs_attention with (security_invoker = true) as
select f.flag_id, f.course_id, f.content_item_id, f.status, f.severity, f.review_note, f.reviewed_at, f.created_at,
       i.title, i.item_type, i.content_text, u.unit_name, u.unit_order,
       v.verdict, v.confidence, v.reason, v.reason as flag_reason
from public.flags f join public.content_items i using (content_item_id)
left join public.units u using (unit_id)
left join public.verdicts v using (content_item_id)
where f.status in ('open', 'confirmed');

create or replace view public.v_persona_performance with (security_invoker = true) as
select ar.course_id, p.persona_id, p.name as persona_name,
       count(ir.result_id)::integer as run_count,
       count(distinct ir.content_item_id)::integer as item_count,
       round(avg(ir.confidence), 3) as avg_confidence
from public.item_results ir join public.analysis_runs ar using (analysis_run_id)
left join public.personas p using (persona_id)
group by ar.course_id, p.persona_id, p.name;

create or replace view public.v_analysis_progress with (security_invoker = true) as
select analysis_run_id, course_id, status, processed_items, total_items, error_message, created_at, started_at, completed_at,
       case when total_items > 0 then round(100.0 * processed_items / total_items, 1) else 0 end as progress_pct
from public.analysis_runs;

create or replace view public.v_content_items with (security_invoker = true) as
select i.content_item_id, i.course_id, i.unit_id, i.upload_id, i.item_type, i.title, i.content_text, i.answer_key, i.order_index, i.created_at,
       u.unit_name, u.unit_order,
       v.verdict, v.confidence, v.reason,
       count(f.flag_id) filter (where f.status <> 'dismissed') > 0 as is_flagged,
       coalesce(jsonb_agg(jsonb_build_object('flag_id', f.flag_id, 'status', f.status, 'severity', f.severity, 'review_note', f.review_note)) filter (where f.flag_id is not null), '[]'::jsonb) as flags
from public.content_items i left join public.units u using (unit_id)
left join public.verdicts v using (content_item_id)
left join public.flags f using (content_item_id)
group by i.content_item_id, u.unit_name, u.unit_order, v.verdict_id;

create or replace view public.v_accuracy_metrics with (security_invoker = true) as
select c.course_id,
       null::numeric as accuracy_pct,
       null::numeric as known_bad_flagged_pct,
       count(f.flag_id) filter (where f.status in ('confirmed', 'dismissed', 'resolved'))::integer as reviewed_count,
       count(f.flag_id) filter (where f.status = 'confirmed')::integer as confirmed_count,
       round(100.0 * count(f.flag_id) filter (where f.status = 'confirmed') / nullif(count(f.flag_id) filter (where f.status in ('confirmed', 'dismissed', 'resolved')), 0), 1) as confirmed_pct
from public.courses c left join public.flags f using (course_id)
group by c.course_id;

create or replace view public.v_defect_rate_per_unit with (security_invoker = true) as
select u.course_id, u.unit_id, u.unit_name, u.unit_order,
       count(i.content_item_id)::integer as item_count,
       count(i.content_item_id) filter (where v.verdict = 'flawed')::integer as flawed_count,
       round(100.0 * count(i.content_item_id) filter (where v.verdict = 'flawed') / nullif(count(i.content_item_id), 0), 1) as defect_rate_pct
from public.units u left join public.content_items i using (unit_id)
left join public.verdicts v using (content_item_id)
group by u.course_id, u.unit_id, u.unit_name, u.unit_order;

create or replace view public.v_flag_review with (security_invoker = true) as
select f.flag_id, f.course_id, f.content_item_id, f.verdict_id, f.status, f.severity, f.reviewed_by, f.reviewed_at, f.review_note, f.created_at,
       i.title, i.item_type, i.content_text, u.unit_name, u.unit_order,
       v.verdict, v.confidence, v.reason
from public.flags f join public.content_items i using (content_item_id)
left join public.units u using (unit_id)
left join public.verdicts v using (content_item_id);

-- Let authenticated users access the private bucket through owner-folder policies.
grant select, insert, update, delete on storage.objects to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, display_name, institution, department, student_id) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings, public.personas, public.courses, public.units,
    public.uploads, public.content_items, public.analysis_runs, public.item_results, public.verdicts,
    public.flags, public.chat_sessions, public.chat_messages, public.report_exports to authenticated;
grant select on public.v_twin_status, public.v_course_overview, public.v_flagged_per_unit,
    public.v_verdict_split, public.v_needs_attention, public.v_persona_performance,
    public.v_analysis_progress, public.v_content_items, public.v_accuracy_metrics,
    public.v_defect_rate_per_unit, public.v_flag_review to authenticated;
grant all privileges on all tables in schema public to service_role;
