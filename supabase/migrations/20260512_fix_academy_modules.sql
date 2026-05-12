-- Run this migration on an existing Unity Cricket Academy Supabase project.
-- It fixes fees, attendance upsert keys, duplicate prevention, and coach registration RPC.

alter table public.fees
add column if not exists fee_package text not null default 'Monthly1800';

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
