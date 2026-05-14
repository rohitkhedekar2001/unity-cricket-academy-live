-- Unity Cricket Academy Management System
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('Admin', 'Coach')),
  created_at timestamptz not null default now()
);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  salary_per_month int not null default 0 check (salary_per_month >= 0),
  has_admin_access boolean not null default false,
  phone_number text,
  date_of_birth date,
  designation text not null check (designation in ('HeadCoach','SeniorCoach','AssistantCoachLevel3','AssistantCoachLevel2','AssistantCoachLevel1')),
  created_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timing text not null,
  coach_id uuid references public.coaches(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null check (age between 3 and 80),
  date_of_birth date,
  admission_date date not null default current_date,
  address text,
  phone_number text,
  fee_package text not null check (fee_package in ('Monthly1800','MonthlySummerCamp2500','ThreeMonths4800','SixMonths9000','OneYear15000','Personal5000')),
  fee_plan_name text not null,
  fee_plan_amount int not null check (fee_plan_amount >= 0),
  school_name text,
  age_group text,
  batch_id uuid references public.batches(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Present','Absent')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, batch_id, date)
);

create table if not exists public.coach_attendance (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Present','Absent')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, date)
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  fee_package text not null default 'Monthly1800' check (fee_package in ('Monthly1800','MonthlySummerCamp2500','ThreeMonths4800','SixMonths9000','OneYear15000','Personal5000')),
  amount int not null check (amount >= 0),
  fee_plan_name text not null,
  fee_plan_amount int not null check (fee_plan_amount >= 0),
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  paid_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.salaries (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  leaves int not null default 0 check (leaves >= 0),
  deduction int not null default 0 check (deduction >= 0),
  final_salary int not null default 0 check (final_salary >= 0),
  created_at timestamptz not null default now(),
  unique (coach_id, month)
);

create index if not exists idx_profiles_role on public.profiles(role);
create unique index if not exists uq_coaches_phone_number on public.coaches(phone_number) where phone_number is not null and length(trim(phone_number)) > 0;
create index if not exists idx_coaches_user_id on public.coaches(user_id);
create index if not exists idx_batches_coach_id on public.batches(coach_id);
create unique index if not exists uq_batches_name on public.batches(lower(name));
create index if not exists idx_students_batch_id on public.students(batch_id);
create index if not exists idx_students_active on public.students(is_active);
create unique index if not exists uq_students_name_batch on public.students(lower(name), batch_id) where batch_id is not null;
create unique index if not exists uq_students_phone_number on public.students(phone_number) where phone_number is not null and length(trim(phone_number)) > 0;
create index if not exists idx_student_attendance_batch_date on public.student_attendance(batch_id, date);
create index if not exists idx_coach_attendance_date on public.coach_attendance(date);
create index if not exists idx_fees_student_month on public.fees(student_id, month);
create index if not exists idx_salaries_coach_month on public.salaries(coach_id, month);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_student_attendance_updated on public.student_attendance;
create trigger trg_student_attendance_updated before update on public.student_attendance
for each row execute function public.touch_updated_at();

drop trigger if exists trg_coach_attendance_updated on public.coach_attendance;
create trigger trg_coach_attendance_updated before update on public.coach_attendance
for each row execute function public.touch_updated_at();

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'Admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.is_assigned_coach_for_batch(p_batch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.batches b
    join public.coaches c on c.id = b.coach_id
    where b.id = p_batch_id and c.user_id = auth.uid()
  )
$$;

create or replace function public.create_coach_account(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_salary_per_month int,
  p_has_admin_access boolean,
  p_phone_number text,
  p_date_of_birth date,
  p_designation text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_coach_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create coach accounts';
  end if;

  insert into public.profiles (id, name, email, role)
  values (p_user_id, p_name, lower(p_email), case when p_has_admin_access then 'Admin' else 'Coach' end)
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      role = excluded.role;

  insert into public.coaches (user_id, salary_per_month, has_admin_access, phone_number, date_of_birth, designation)
  values (p_user_id, p_salary_per_month, p_has_admin_access, p_phone_number, p_date_of_birth, p_designation)
  returning id into new_coach_id;

  return new_coach_id;
end;
$$;

create or replace function public.generate_salary(p_coach_id uuid, p_month text, p_working_days int default 26)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  base_salary int;
  leave_count int;
  extra_leaves int;
  deduction_amount int;
  salary_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate salaries';
  end if;
  if p_working_days <= 0 then
    raise exception 'Working days must be greater than zero';
  end if;

  select salary_per_month into base_salary from public.coaches where id = p_coach_id;
  if base_salary is null then
    raise exception 'Coach not found';
  end if;

  select count(*)::int into leave_count
  from public.coach_attendance
  where coach_id = p_coach_id and to_char(date, 'YYYY-MM') = p_month and status = 'Absent';

  extra_leaves := greatest(leave_count - 2, 0);
  deduction_amount := round((base_salary::numeric / p_working_days) * extra_leaves)::int;

  insert into public.salaries (coach_id, month, leaves, deduction, final_salary)
  values (p_coach_id, p_month, leave_count, deduction_amount, greatest(base_salary - deduction_amount, 0))
  on conflict (coach_id, month) do update
  set leaves = excluded.leaves,
      deduction = excluded.deduction,
      final_salary = excluded.final_salary
  returning id into salary_id;

  return salary_id;
end;
$$;

create or replace function public.delete_coach_account(p_coach_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete coach accounts';
  end if;

  select user_id into target_user_id from public.coaches where id = p_coach_id;
  delete from public.coaches where id = p_coach_id;

  if target_user_id is not null then
    delete from auth.users where id = target_user_id and email <> 'admin@cricketacademy.com';
  end if;

  return p_coach_id;
end;
$$;

create or replace function public.update_coach_account(
  p_coach_id uuid,
  p_name text,
  p_email text,
  p_salary_per_month int,
  p_has_admin_access boolean,
  p_phone_number text,
  p_date_of_birth date,
  p_designation text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update coach accounts';
  end if;

  select user_id into target_user_id from public.coaches where id = p_coach_id;

  update public.coaches
  set salary_per_month = p_salary_per_month,
      has_admin_access = p_has_admin_access,
      phone_number = p_phone_number,
      date_of_birth = p_date_of_birth,
      designation = p_designation
  where id = p_coach_id;

  if target_user_id is not null then
    update public.profiles
    set name = p_name,
        email = lower(p_email),
        role = case when p_has_admin_access then 'Admin' else 'Coach' end
    where id = target_user_id;

    update auth.users
    set email = lower(p_email),
        raw_user_meta_data = jsonb_build_object('name', p_name),
        updated_at = now()
    where id = target_user_id;
  end if;

  return p_coach_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.student_attendance enable row level security;
alter table public.coach_attendance enable row level security;
alter table public.fees enable row level security;
alter table public.salaries enable row level security;

create policy "Profiles readable by signed in users" on public.profiles for select to authenticated using (true);
create policy "Admins update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Coaches readable" on public.coaches for select to authenticated using (true);
create policy "Admins manage coaches" on public.coaches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Batches readable" on public.batches for select to authenticated using (public.is_admin() or public.is_assigned_coach_for_batch(id));
create policy "Admins manage batches" on public.batches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students readable by admin or assigned coach" on public.students for select to authenticated
using (public.is_admin() or public.is_assigned_coach_for_batch(batch_id));
create policy "Admins manage students" on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Assigned coaches insert students" on public.students for insert to authenticated
with check (public.is_assigned_coach_for_batch(batch_id));
create policy "Assigned coaches update students" on public.students for update to authenticated
using (public.is_assigned_coach_for_batch(batch_id))
with check (public.is_assigned_coach_for_batch(batch_id));

create policy "Student attendance readable" on public.student_attendance for select to authenticated
using (public.is_admin() or public.is_assigned_coach_for_batch(batch_id));
create policy "Student attendance manageable" on public.student_attendance for all to authenticated
using (public.is_admin() or public.is_assigned_coach_for_batch(batch_id))
with check (public.is_admin() or public.is_assigned_coach_for_batch(batch_id));

create policy "Coach attendance admins only" on public.coach_attendance for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Fees readable" on public.fees for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.students s where s.id = fees.student_id and public.is_assigned_coach_for_batch(s.batch_id)
  )
);
create policy "Admins manage fees" on public.fees for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Assigned coaches insert fees" on public.fees for insert to authenticated
with check (
  exists (
    select 1 from public.students s
    where s.id = fees.student_id and public.is_assigned_coach_for_batch(s.batch_id)
  )
);
create policy "Assigned coaches update own student fees" on public.fees for update to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = fees.student_id and public.is_assigned_coach_for_batch(s.batch_id)
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = fees.student_id and public.is_assigned_coach_for_batch(s.batch_id)
  )
);

create policy "Salaries readable by admin or owning coach" on public.salaries for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.coaches c where c.id = salaries.coach_id and c.user_id = auth.uid()
  )
);
create policy "Admins manage salaries" on public.salaries for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Create the default admin from Supabase Dashboard > Authentication > Users,
-- then run:
-- insert into public.profiles (id, name, email, role)
-- select id, 'Unity Admin', email, 'Admin'
-- from auth.users
-- where email = 'admin@cricketacademy.com'
-- on conflict (id) do update set name = excluded.name, email = excluded.email, role = excluded.role;
