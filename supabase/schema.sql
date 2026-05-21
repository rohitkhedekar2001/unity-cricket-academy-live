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
  designation text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timing text not null,
  branch_id uuid references public.branches(id) on delete set null,
  coach_id uuid references public.coaches(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null check (age between 3 and 80),
  dob date,
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
  package_months int not null default 1 check (package_months > 0),
  coverage_start_date date,
  coverage_end_date date,
  next_due_date date,
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
  working_days int not null default 26 check (working_days > 0),
  paid_leave int not null default 2 check (paid_leave >= 0),
  leave_taken int not null default 0 check (leave_taken >= 0),
  leave_deduction int not null default 0 check (leave_deduction >= 0),
  base_salary int not null default 0 check (base_salary >= 0),
  personal_coaching_count int not null default 0 check (personal_coaching_count >= 0),
  personal_coaching_amount int not null default 0 check (personal_coaching_amount >= 0),
  bonus int not null default 0 check (bonus >= 0),
  penalty_amount int not null default 0 check (penalty_amount >= 0),
  advance_taken int not null default 0 check (advance_taken >= 0),
  grand_total_salary int not null default 0 check (grand_total_salary >= 0),
  created_at timestamptz not null default now(),
  unique (coach_id, month)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  opponent_team text not null,
  venue text not null,
  match_datetime timestamptz not null,
  match_fee int not null default 0 check (match_fee >= 0),
  age_group text not null,
  status text not null default 'Upcoming' check (status in ('Upcoming','Completed','Cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade,
  player_name text,
  player_group text,
  role text not null default 'Batsman' check (role in ('Captain','Wicket Keeper (WK)','Batsman','Bowler','All-rounder')),
  fee_status text not null default 'Pending' check (fee_status in ('Paid','Pending')),
  attendance_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  check ((student_id is not null and coach_id is null) or (student_id is null and coach_id is not null))
);

create table if not exists public.match_coaches (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, coach_id)
);

create table if not exists public.match_notes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  deadline date not null,
  category text not null default 'Other' check (category in ('Training','Match Management','Fees Collection','Attendance','Equipment','Social Media','Other')),
  notes text,
  status text not null default 'Pending' check (status in ('Pending','In Progress','Completed','Overdue')),
  approved_at timestamptz,
  completed_at timestamptz,
  reopened_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (task_id, coach_id)
);

create table if not exists public.staff_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  comment text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  action text not null,
  details text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  mobile_number text not null,
  dob date,
  age int check (age is null or age between 3 and 80),
  interested_batch text,
  source text not null default 'Walk-in' check (source in ('Walk-in','Reference','Instagram','WhatsApp','Other')),
  interested_in text not null default 'Regular Coaching' check (interested_in in ('Regular Coaching','Personal Coaching','Match Practice')),
  remarks text,
  status text not null default 'New' check (status in ('New','Follow-up Required','Interested','Not Interested','Converted','Closed')),
  visit_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dob is not null or age is not null)
);

create index if not exists idx_profiles_role on public.profiles(role);
create unique index if not exists uq_coaches_phone_number on public.coaches(phone_number) where phone_number is not null and length(trim(phone_number)) > 0;
create index if not exists idx_coaches_user_id on public.coaches(user_id);
create index if not exists idx_coaches_active on public.coaches(is_active);
create index if not exists idx_branches_active on public.branches(is_active);
create index if not exists idx_batches_coach_id on public.batches(coach_id);
create index if not exists idx_batches_branch_id on public.batches(branch_id);
create unique index if not exists uq_batches_name on public.batches(lower(name));
create index if not exists idx_students_batch_id on public.students(batch_id);
create index if not exists idx_students_active on public.students(is_active);
create unique index if not exists uq_students_name_batch on public.students(lower(name), batch_id) where batch_id is not null;
create unique index if not exists uq_students_phone_number on public.students(phone_number) where phone_number is not null and length(trim(phone_number)) > 0;
create index if not exists idx_student_attendance_batch_date on public.student_attendance(batch_id, date);
create index if not exists idx_coach_attendance_date on public.coach_attendance(date);
create index if not exists idx_fees_student_month on public.fees(student_id, month);
create index if not exists idx_fees_student_coverage on public.fees(student_id, coverage_start_date, coverage_end_date);
create index if not exists idx_salaries_coach_month on public.salaries(coach_id, month);
create index if not exists idx_matches_datetime on public.matches(match_datetime);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_match_players_match_id on public.match_players(match_id);
create index if not exists idx_match_players_student_id on public.match_players(student_id);
create index if not exists idx_match_players_coach_id on public.match_players(coach_id);
create unique index if not exists uq_match_players_student on public.match_players(match_id, student_id) where student_id is not null;
create unique index if not exists uq_match_players_coach on public.match_players(match_id, coach_id) where coach_id is not null;
create index if not exists idx_match_coaches_match_id on public.match_coaches(match_id);
create index if not exists idx_match_coaches_coach_id on public.match_coaches(coach_id);
create index if not exists idx_match_notes_match_id on public.match_notes(match_id);
create index if not exists idx_staff_tasks_status on public.staff_tasks(status);
create index if not exists idx_staff_tasks_deadline on public.staff_tasks(deadline);
create index if not exists idx_staff_task_assignments_task on public.staff_task_assignments(task_id);
create index if not exists idx_staff_task_assignments_coach on public.staff_task_assignments(coach_id);
create index if not exists idx_staff_task_comments_task on public.staff_task_comments(task_id);
create index if not exists idx_staff_task_logs_task on public.staff_task_logs(task_id);
create index if not exists idx_enquiries_created_by on public.enquiries(created_by);
create index if not exists idx_enquiries_status on public.enquiries(status);
create index if not exists idx_enquiries_visit_date on public.enquiries(visit_date);
create index if not exists idx_enquiries_source on public.enquiries(source);
create index if not exists idx_enquiries_interested_batch on public.enquiries(interested_batch);

insert into public.branches (name, location, is_active)
values
  ('St. Mary', 'St. Mary', true),
  ('Zingabat Takli', 'Zingabat Takli', true)
on conflict (name) do update
set location = coalesce(public.branches.location, excluded.location),
    is_active = true;

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

create or replace function public.touch_simple_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_branches_updated on public.branches;
create trigger trg_branches_updated before update on public.branches
for each row execute function public.touch_simple_updated_at();

create or replace function public.touch_enquiry_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enquiries_updated on public.enquiries;
create trigger trg_enquiries_updated before update on public.enquiries
for each row execute function public.touch_enquiry_updated_at();

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
    where b.id = p_batch_id and c.user_id = auth.uid() and c.is_active = true
  )
$$;

create or replace function public.is_match_manager(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.is_admin(), false)
    or exists (select 1 from public.matches m where m.id = p_match_id and m.created_by = auth.uid())
    or exists (
      select 1
      from public.match_coaches mc
      join public.coaches c on c.id = mc.coach_id
      where mc.match_id = p_match_id and c.user_id = auth.uid() and c.is_active = true
    )
$$;

create or replace function public.list_match_students()
returns setof public.students
language sql
security definer
set search_path = public
stable
as $$
  select s.*
  from public.students s
  where s.is_active = true
  order by s.name
$$;

grant execute on function public.list_match_students() to authenticated;

create or replace function public.list_match_batches()
returns setof public.batches
language sql
security definer
set search_path = public
stable
as $$
  select b.*
  from public.batches b
  order by b.name
$$;

grant execute on function public.list_match_batches() to authenticated;

create or replace function public.is_assigned_to_task(p_task_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_task_assignments sta
    join public.coaches c on c.id = sta.coach_id
    where sta.task_id = p_task_id and c.user_id = auth.uid() and c.is_active = true
  )
$$;

create or replace function public.log_staff_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.staff_task_logs(task_id, action, details, created_by)
    values (new.id, 'created task', new.title, auth.uid());
    return new;
  end if;

  new.updated_at = now();
  new.updated_by = auth.uid();
  if old.status is distinct from new.status then
    insert into public.staff_task_logs(task_id, action, details, created_by)
    values (new.id, 'changed status', old.status || ' to ' || new.status, auth.uid());
  else
    insert into public.staff_task_logs(task_id, action, details, created_by)
    values (new.id, 'updated task', new.title, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_staff_task_log_insert on public.staff_tasks;
create trigger trg_staff_task_log_insert after insert on public.staff_tasks
for each row execute function public.log_staff_task_change();

drop trigger if exists trg_staff_task_log_update on public.staff_tasks;
create trigger trg_staff_task_log_update before update on public.staff_tasks
for each row execute function public.log_staff_task_change();

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

create or replace function public.create_assigned_batch_student(
  p_name text,
  p_age int,
  p_dob date,
  p_date_of_birth date,
  p_admission_date date,
  p_address text,
  p_phone_number text,
  p_fee_package text,
  p_fee_plan_name text,
  p_fee_plan_amount int,
  p_school_name text,
  p_age_group text,
  p_batch_id uuid,
  p_is_active boolean default true
)
returns public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_student public.students;
begin
  if p_batch_id is null then
    raise exception 'Batch is required';
  end if;

  if not (public.is_admin() or public.is_assigned_coach_for_batch(p_batch_id)) then
    raise exception 'You can add students only to your assigned batch';
  end if;

  insert into public.students (
    name,
    age,
    dob,
    date_of_birth,
    admission_date,
    address,
    phone_number,
    fee_package,
    fee_plan_name,
    fee_plan_amount,
    school_name,
    age_group,
    batch_id,
    is_active
  )
  values (
    trim(p_name),
    p_age,
    coalesce(p_dob, p_date_of_birth),
    coalesce(p_date_of_birth, p_dob),
    p_admission_date,
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_phone_number, '')), ''),
    p_fee_package,
    p_fee_plan_name,
    p_fee_plan_amount,
    nullif(trim(coalesce(p_school_name, '')), ''),
    nullif(trim(coalesce(p_age_group, '')), ''),
    p_batch_id,
    coalesce(p_is_active, true)
  )
  returning * into inserted_student;

  return inserted_student;
end;
$$;

grant execute on function public.create_assigned_batch_student(
  text,
  int,
  date,
  date,
  date,
  text,
  text,
  text,
  text,
  int,
  text,
  text,
  uuid,
  boolean
) to authenticated;

create or replace function public.generate_salary(
  p_coach_id uuid,
  p_month text,
  p_personal_coaching_count int default 0,
  p_personal_coaching_amount int default 0,
  p_bonus int default 0,
  p_penalty_amount int default 0,
  p_advance_taken int default 0,
  p_paid_leave int default 2
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fixed_salary int;
  working_day_count int;
  leave_count int;
  extra_leaves int;
  per_day_salary numeric;
  deduction_amount int;
  base_salary_amount int;
  grand_total_amount int;
  salary_id uuid;
  month_start date;
  month_end date;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate salaries';
  end if;

  select salary_per_month into fixed_salary from public.coaches where id = p_coach_id;
  if fixed_salary is null then
    raise exception 'Coach not found';
  end if;

  month_start := to_date(p_month || '-01', 'YYYY-MM-DD');
  month_end := (month_start + interval '1 month - 1 day')::date;

  select count(*)::int into working_day_count
  from generate_series(month_start, month_end, interval '1 day') as days(day_value)
  where extract(dow from day_value) <> 0;

  select count(*)::int into leave_count
  from public.coach_attendance
  where coach_id = p_coach_id and to_char(date, 'YYYY-MM') = p_month and status = 'Absent';

  extra_leaves := greatest(leave_count - greatest(coalesce(p_paid_leave, 2), 0), 0);
  per_day_salary := fixed_salary::numeric / greatest(working_day_count, 1);
  deduction_amount := round(per_day_salary * extra_leaves)::int;
  base_salary_amount := greatest(fixed_salary - deduction_amount, 0);
  grand_total_amount := greatest(
    base_salary_amount
    + greatest(coalesce(p_personal_coaching_amount, 0), 0)
    + greatest(coalesce(p_bonus, 0), 0)
    - greatest(coalesce(p_penalty_amount, 0), 0)
    - greatest(coalesce(p_advance_taken, 0), 0),
    0
  );

  insert into public.salaries (
    coach_id,
    month,
    leaves,
    deduction,
    final_salary,
    working_days,
    paid_leave,
    leave_taken,
    leave_deduction,
    base_salary,
    personal_coaching_count,
    personal_coaching_amount,
    bonus,
    penalty_amount,
    advance_taken,
    grand_total_salary
  )
  values (
    p_coach_id,
    p_month,
    leave_count,
    deduction_amount,
    grand_total_amount,
    working_day_count,
    greatest(coalesce(p_paid_leave, 2), 0),
    leave_count,
    deduction_amount,
    base_salary_amount,
    greatest(coalesce(p_personal_coaching_count, 0), 0),
    greatest(coalesce(p_personal_coaching_amount, 0), 0),
    greatest(coalesce(p_bonus, 0), 0),
    greatest(coalesce(p_penalty_amount, 0), 0),
    greatest(coalesce(p_advance_taken, 0), 0),
    grand_total_amount
  )
  on conflict (coach_id, month) do update
  set leaves = excluded.leaves,
      deduction = excluded.deduction,
      final_salary = excluded.final_salary,
      working_days = excluded.working_days,
      paid_leave = excluded.paid_leave,
      leave_taken = excluded.leave_taken,
      leave_deduction = excluded.leave_deduction,
      base_salary = excluded.base_salary,
      personal_coaching_count = excluded.personal_coaching_count,
      personal_coaching_amount = excluded.personal_coaching_amount,
      bonus = excluded.bonus,
      penalty_amount = excluded.penalty_amount,
      advance_taken = excluded.advance_taken,
      grand_total_salary = excluded.grand_total_salary
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
alter table public.branches enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.student_attendance enable row level security;
alter table public.coach_attendance enable row level security;
alter table public.fees enable row level security;
alter table public.salaries enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_coaches enable row level security;
alter table public.match_notes enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.staff_task_assignments enable row level security;
alter table public.staff_task_comments enable row level security;
alter table public.staff_task_logs enable row level security;
alter table public.enquiries enable row level security;

create policy "Profiles readable by signed in users" on public.profiles for select to authenticated using (true);
create policy "Admins update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Coaches readable" on public.coaches for select to authenticated using (true);
create policy "Admins manage coaches" on public.coaches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Branches readable" on public.branches for select to authenticated
using (
  public.is_admin() or exists (
    select 1
    from public.batches b
    where b.branch_id = branches.id and public.is_assigned_coach_for_batch(b.id)
  )
);
create policy "Admins manage branches" on public.branches for all to authenticated using (public.is_admin()) with check (public.is_admin());

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

create policy "Matches readable" on public.matches for select to authenticated using (true);
create policy "Admins delete matches" on public.matches for delete to authenticated using (public.is_admin());
create policy "Admins and coaches create matches" on public.matches for insert to authenticated with check (auth.uid() is not null);
create policy "Admins and coaches update matches" on public.matches for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Match players readable" on public.match_players for select to authenticated using (true);
create policy "Admins and coaches manage players" on public.match_players for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Match coaches readable" on public.match_coaches for select to authenticated using (true);
create policy "Admins and coaches manage coaches" on public.match_coaches for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Match notes readable" on public.match_notes for select to authenticated using (true);
create policy "Admins and coaches add notes" on public.match_notes for insert to authenticated
with check (auth.uid() is not null);

create policy "Staff tasks readable" on public.staff_tasks for select to authenticated
using (public.is_admin() or public.is_assigned_to_task(id));
create policy "Admins create tasks" on public.staff_tasks for insert to authenticated
with check (public.is_admin());
create policy "Admins update tasks" on public.staff_tasks for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "Assigned coaches update task status" on public.staff_tasks for update to authenticated
using (public.is_assigned_to_task(id)) with check (public.is_assigned_to_task(id));
create policy "Admins delete tasks" on public.staff_tasks for delete to authenticated
using (public.is_admin());

create policy "Task assignments readable" on public.staff_task_assignments for select to authenticated
using (public.is_admin() or public.is_assigned_to_task(task_id));
create policy "Admins manage task assignments" on public.staff_task_assignments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Task comments readable" on public.staff_task_comments for select to authenticated
using (public.is_admin() or public.is_assigned_to_task(task_id));
create policy "Task comments writable" on public.staff_task_comments for insert to authenticated
with check (public.is_admin() or public.is_assigned_to_task(task_id));

create policy "Task logs readable" on public.staff_task_logs for select to authenticated
using (public.is_admin() or public.is_assigned_to_task(task_id));
create policy "Task logs writable by system" on public.staff_task_logs for insert to authenticated
with check (auth.uid() is not null);

create policy "Admins manage enquiries" on public.enquiries for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "Coaches insert enquiries" on public.enquiries for insert to authenticated
with check (auth.uid() is not null and coalesce(created_by, auth.uid()) = auth.uid());
create policy "Coaches read own enquiries" on public.enquiries for select to authenticated
using (public.is_admin() or created_by = auth.uid());
create policy "Coaches update own enquiries" on public.enquiries for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Create the default admin from Supabase Dashboard > Authentication > Users,
-- then run:
-- insert into public.profiles (id, name, email, role)
-- select id, 'Unity Admin', email, 'Admin'
-- from auth.users
-- where email = 'admin@cricketacademy.com'
-- on conflict (id) do update set name = excluded.name, email = excluded.email, role = excluded.role;
