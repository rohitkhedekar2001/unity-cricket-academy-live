-- Branch Management support for Unity Cricket Academy.
-- Run once on an existing Supabase project before deploying the branch UI.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.batches
add column if not exists branch_id uuid references public.branches(id) on delete set null;

insert into public.branches (name, location, is_active)
values
  ('St. Mary', 'St. Mary', true),
  ('Zingabat Takli', 'Zingabat Takli', true)
on conflict (name) do update
set location = coalesce(public.branches.location, excluded.location),
    is_active = true;

update public.batches b
set branch_id = branch.id
from public.branches branch
where b.branch_id is null
  and branch.name = 'St. Mary'
  and (
    lower(b.name) like '%st%mary%'
    or lower(b.name) like '%saint%mary%'
    or lower(b.name) like '%saint%marry%'
    or lower(b.name) like '%st%marry%'
  );

update public.batches b
set branch_id = branch.id
from public.branches branch
where b.branch_id is null
  and branch.name = 'Zingabat Takli';

create index if not exists idx_branches_active on public.branches(is_active);
create index if not exists idx_batches_branch_id on public.batches(branch_id);

create or replace function public.touch_simple_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_branches_updated on public.branches;
create trigger trg_branches_updated before update on public.branches
for each row execute function public.touch_simple_updated_at();

alter table public.branches enable row level security;

drop policy if exists "Branches readable" on public.branches;
drop policy if exists "Admins manage branches" on public.branches;

create policy "Branches readable" on public.branches for select to authenticated
using (
  public.is_admin() or exists (
    select 1
    from public.batches b
    where b.branch_id = branches.id and public.is_assigned_coach_for_batch(b.id)
  )
);

create policy "Admins manage branches" on public.branches for all to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
