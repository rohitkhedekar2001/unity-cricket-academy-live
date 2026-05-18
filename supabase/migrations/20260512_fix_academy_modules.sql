-- Run this migration on an existing Unity Cricket Academy Supabase project.
-- It fixes fees, attendance upsert keys, duplicate prevention, and coach registration RPC.

alter table public.fees
add column if not exists fee_package text not null default 'Monthly1800';

alter table public.students
add column if not exists dob date;

update public.students
set dob = date_of_birth
where dob is null and date_of_birth is not null;

alter table public.salaries
add column if not exists working_days int not null default 26,
add column if not exists paid_leave int not null default 2,
add column if not exists leave_taken int not null default 0,
add column if not exists leave_deduction int not null default 0,
add column if not exists base_salary int not null default 0,
add column if not exists personal_coaching_count int not null default 0,
add column if not exists personal_coaching_amount int not null default 0,
add column if not exists bonus int not null default 0,
add column if not exists penalty_amount int not null default 0,
add column if not exists advance_taken int not null default 0,
add column if not exists grand_total_salary int not null default 0;

update public.salaries
set working_days = greatest(coalesce(working_days, 26), 1),
    paid_leave = greatest(coalesce(paid_leave, 2), 0),
    leave_taken = greatest(coalesce(nullif(leave_taken, 0), leaves, 0), 0),
    leave_deduction = greatest(coalesce(nullif(leave_deduction, 0), deduction, 0), 0),
    base_salary = greatest(coalesce(nullif(base_salary, 0), final_salary, 0), 0),
    grand_total_salary = greatest(coalesce(nullif(grand_total_salary, 0), final_salary, 0), 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fees_fee_package_check'
  ) then
    alter table public.fees
    add constraint fees_fee_package_check
    check (fee_package in ('Monthly1800','MonthlySummerCamp2500','ThreeMonths4800','SixMonths9000','OneYear15000','Personal5000'));
  end if;
end $$;

alter table public.student_attendance
drop constraint if exists student_attendance_student_id_date_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'student_attendance_student_id_batch_id_date_key'
  ) then
    alter table public.student_attendance
    add constraint student_attendance_student_id_batch_id_date_key unique (student_id, batch_id, date);
  end if;
end $$;

create unique index if not exists uq_coaches_phone_number
on public.coaches(phone_number)
where phone_number is not null and length(trim(phone_number)) > 0;

create unique index if not exists uq_batches_name
on public.batches(lower(name));

create unique index if not exists uq_students_name_batch
on public.students(lower(name), batch_id)
where batch_id is not null;

create unique index if not exists uq_students_phone_number
on public.students(phone_number)
where phone_number is not null and length(trim(phone_number)) > 0;

create index if not exists idx_fees_package on public.fees(fee_package);
create index if not exists idx_fees_student_month on public.fees(student_id, month);
create index if not exists idx_student_attendance_batch_date on public.student_attendance(batch_id, date);

drop function if exists public.create_coach_account(text, text, text, int, boolean, text, date, text);

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

drop policy if exists "Assigned coaches insert fees" on public.fees;
drop policy if exists "Assigned coaches update own student fees" on public.fees;
drop policy if exists "Assigned coaches insert students" on public.students;

create policy "Assigned coaches insert students" on public.students for insert to authenticated
with check (public.is_assigned_coach_for_batch(batch_id));

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
  from generate_series(month_start, month_end, interval '1 day') as day_value
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
