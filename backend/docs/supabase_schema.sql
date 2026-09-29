-- Run this file in the Supabase SQL Editor.

create table if not exists public.courses (
    course_id text primary key,
    filename text,
    status text,
    items_done int default 0,
    items_total int default 0,
    created_at timestamptz default now()
);

create table if not exists public.items (
    item_id text primary key,
    course_id text references public.courses(course_id),
    order_index int,
    type text,
    text text,
    answer_key text,
    created_at timestamptz default now()
);

create table if not exists public.runs (
    run_id text primary key,
    item_id text,
    persona text,
    answer text,
    reasoning text,
    confidence float,
    context_mode text default 'taught_only',
    created_at timestamptz default now()
);

create table if not exists public.findings (
    item_id text primary key,
    course_id text,
    label text,
    defect_type text,
    severity text,
    evidence text,
    suggested_rewrite text,
    review text default 'pending',
    created_at timestamptz default now()
);

create index if not exists items_course_order_idx
    on public.items(course_id, order_index);
create index if not exists runs_item_idx
    on public.runs(item_id);
create index if not exists findings_course_idx
    on public.findings(course_id);

alter table public.courses enable row level security;
alter table public.items enable row level security;
alter table public.runs enable row level security;
alter table public.findings enable row level security;


-- Do not add public policies. The backend service-role key bypasses RLS.
-- In the Supabase dashboard, create a Storage bucket named "course-files" and leave it PRIVATE.
