-- Coach Credit & Performance Management System
-- Run this on the existing Unity Cricket Academy Supabase project.

create table if not exists public.coach_credit_points (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  category text not null check (category in ('Growth','Attendance','Fees','Coach Attendance','Tasks','Enquiries','Bonus','Penalty')),
  points integer not null,
  reference_id uuid,
  reference_type text,
  description text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid()
);

create table if not exists public.coach_monthly_scores (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  total_score integer not null default 0,
  attendance_score integer not null default 0,
  fee_score integer not null default 0,
  enquiry_score integer not null default 0,
  task_score integer not null default 0,
  growth_score integer not null default 0,
  bonus_score integer not null default 0,
  penalty_score integer not null default 0,
  grade text not null default 'Critical',
  calculated_at timestamptz not null default now(),
  unique (coach_id, month)
);

create table if not exists public.coach_manual_adjustments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  adjustment_type text not null check (adjustment_type in ('bonus','penalty')),
  points integer not null check (points > 0),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.enquiries
add column if not exists student_name text,
add column if not exists parent_phone text,
add column if not exists age_group text,
add column if not exists interested_batch_id uuid references public.batches(id) on delete set null,
add column if not exists discussion_notes text,
add column if not exists followup_status text default 'Follow-up',
add column if not exists enquiry_status text default 'Interested' check (enquiry_status in ('Interested','Follow-up','Joined','Not Interested')),
add column if not exists assigned_coach_id uuid references public.coaches(id) on delete set null,
add column if not exists converted_student_id uuid references public.students(id) on delete set null;

update public.enquiries e
set student_name = coalesce(e.student_name, e.player_name),
    parent_phone = coalesce(e.parent_phone, e.mobile_number),
    age_group = coalesce(e.age_group, e.interested_batch),
    discussion_notes = coalesce(e.discussion_notes, e.remarks),
    assigned_coach_id = coalesce(e.assigned_coach_id, c.id),
    enquiry_status = coalesce(e.enquiry_status, case when e.status = 'Converted' then 'Joined' when e.status = 'Not Interested' then 'Not Interested' when e.status = 'Follow-up Required' then 'Follow-up' else 'Interested' end)
from public.coaches c
where c.user_id = e.created_by;

create index if not exists idx_coach_credit_points_coach_month on public.coach_credit_points(coach_id, created_at);
create index if not exists idx_coach_credit_points_category on public.coach_credit_points(category);
create index if not exists idx_coach_monthly_scores_month on public.coach_monthly_scores(month);
create index if not exists idx_coach_manual_adjustments_coach on public.coach_manual_adjustments(coach_id);
create index if not exists idx_enquiries_assigned_coach on public.enquiries(assigned_coach_id);
create index if not exists idx_enquiries_status_performance on public.enquiries(enquiry_status);

create or replace function public.performance_grade(p_score integer)
returns text
language sql
immutable
as $$
  select case
    when p_score >= 90 then 'Elite Coach'
    when p_score >= 75 then 'Excellent'
    when p_score >= 60 then 'Good'
    when p_score >= 40 then 'Needs Improvement'
    else 'Critical'
  end
$$;

create or replace function public.add_coach_credit_point(
  p_coach_id uuid,
  p_category text,
  p_points integer,
  p_reference_id uuid,
  p_reference_type text,
  p_description text,
  p_created_by uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  point_id uuid;
begin
  if p_coach_id is null or coalesce(p_points, 0) = 0 then
    return null;
  end if;

  insert into public.coach_credit_points (
    coach_id,
    category,
    points,
    reference_id,
    reference_type,
    description,
    created_by
  )
  values (
    p_coach_id,
    p_category,
    p_points,
    p_reference_id,
    p_reference_type,
    p_description,
    p_created_by
  )
  returning id into point_id;

  return point_id;
end;
$$;

create or replace function public.performance_sync_enquiry_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_coach_id uuid;
begin
  if new.created_by is not null then
    select id into creator_coach_id from public.coaches where user_id = new.created_by limit 1;
  end if;

  new.student_name := coalesce(new.student_name, new.player_name);
  new.parent_phone := coalesce(new.parent_phone, new.mobile_number);
  new.age_group := coalesce(new.age_group, new.interested_batch);
  new.discussion_notes := coalesce(new.discussion_notes, new.remarks);
  new.assigned_coach_id := coalesce(new.assigned_coach_id, creator_coach_id);
  new.enquiry_status := coalesce(
    new.enquiry_status,
    case
      when new.status = 'Converted' then 'Joined'
      when new.status = 'Not Interested' then 'Not Interested'
      when new.status = 'Follow-up Required' then 'Follow-up'
      else 'Interested'
    end
  );
  return new;
end;
$$;

drop trigger if exists trg_performance_sync_enquiry_fields on public.enquiries;
create trigger trg_performance_sync_enquiry_fields
before insert or update on public.enquiries
for each row execute function public.performance_sync_enquiry_fields();

create or replace function public.performance_enquiry_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  point_coach_id uuid;
  next_status text;
  previous_status text;
begin
  point_coach_id := new.assigned_coach_id;
  next_status := coalesce(new.enquiry_status, case when new.status = 'Converted' then 'Joined' else null end);
  if tg_op = 'INSERT' then
    perform public.add_coach_credit_point(point_coach_id, 'Enquiries', 2, new.id, 'enquiry', 'Added new enquiry', new.created_by);
    return new;
  end if;

  previous_status := coalesce(old.enquiry_status, case when old.status = 'Converted' then 'Joined' else null end);
  if next_status = 'Joined' and previous_status is distinct from 'Joined' then
    perform public.add_coach_credit_point(point_coach_id, 'Growth', 20, new.id, 'enquiry', 'Enquiry converted to student', auth.uid());
  elsif next_status = 'Not Interested' and previous_status is distinct from 'Not Interested' then
    perform public.add_coach_credit_point(point_coach_id, 'Growth', -5, new.id, 'enquiry', 'Invalid or not interested enquiry', auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_performance_enquiry_points_insert on public.enquiries;
create trigger trg_performance_enquiry_points_insert
after insert on public.enquiries
for each row execute function public.performance_enquiry_points();

drop trigger if exists trg_performance_enquiry_points_update on public.enquiries;
create trigger trg_performance_enquiry_points_update
after update on public.enquiries
for each row execute function public.performance_enquiry_points();

create or replace function public.performance_student_insert_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  point_coach_id uuid;
begin
  select b.coach_id into point_coach_id from public.batches b where b.id = new.batch_id;
  perform public.add_coach_credit_point(point_coach_id, 'Growth', 10, new.id, 'student', 'New student added', auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_performance_student_insert_points on public.students;
create trigger trg_performance_student_insert_points
after insert on public.students
for each row execute function public.performance_student_insert_points();

create or replace function public.performance_fee_insert_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  point_coach_id uuid;
begin
  select b.coach_id into point_coach_id
  from public.students s
  join public.batches b on b.id = s.batch_id
  where s.id = new.student_id;
  perform public.add_coach_credit_point(point_coach_id, 'Fees', 5, new.id, 'fee', 'Fee payment recorded', auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_performance_fee_insert_points on public.fees;
create trigger trg_performance_fee_insert_points
after insert on public.fees
for each row execute function public.performance_fee_insert_points();

create or replace function public.performance_student_attendance_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  point_coach_id uuid;
  point_value int;
  note text;
begin
  select coach_id into point_coach_id from public.batches where id = new.batch_id;
  if new.created_at::date = new.date then
    point_value := 10;
    note := 'Batch attendance saved on attendance date for ' || new.date::text;
  elsif new.created_at::date = new.date + 1 then
    point_value := -25;
    note := 'Batch attendance saved next day for ' || new.date::text;
  else
    point_value := -50;
    note := 'Old batch attendance entered in bulk or late for ' || new.date::text;
  end if;

  if point_coach_id is not null and not exists (
    select 1
    from public.coach_credit_points
    where coach_id = point_coach_id
      and category = 'Attendance'
      and reference_id = new.batch_id
      and reference_type = 'student_attendance_batch'
      and description = note
  ) then
    perform public.add_coach_credit_point(point_coach_id, 'Attendance', point_value, new.batch_id, 'student_attendance_batch', note, new.created_by);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_performance_student_attendance_points on public.student_attendance;
create trigger trg_performance_student_attendance_points
after insert on public.student_attendance
for each row execute function public.performance_student_attendance_points();

create or replace function public.performance_coach_attendance_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_coach_credit_point(
    new.coach_id,
    'Coach Attendance',
    case when new.status = 'Present' then 2 else -5 end,
    new.id,
    'coach_attendance',
    case when new.status = 'Present' then 'Coach marked present' else 'Coach marked absent' end,
    new.created_by
  );
  return new;
end;
$$;

drop trigger if exists trg_performance_coach_attendance_points on public.coach_attendance;
create trigger trg_performance_coach_attendance_points
after insert on public.coach_attendance
for each row execute function public.performance_coach_attendance_points();

create or replace function public.performance_staff_task_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_coach record;
  point_value int;
  note text;
begin
  if old.status is distinct from new.status and new.status = 'Completed' then
    if new.completed_at::date < new.deadline then
      point_value := 15;
      note := 'Task completed before deadline';
    elsif new.completed_at::date = new.deadline then
      point_value := 10;
      note := 'Task completed on time';
    else
      point_value := 2;
      note := 'Task completed late';
    end if;
    for assigned_coach in select coach_id from public.staff_task_assignments where task_id = new.id loop
      perform public.add_coach_credit_point(assigned_coach.coach_id, 'Tasks', point_value, new.id, 'staff_task', note, auth.uid());
    end loop;
  elsif old.status = 'Completed' and new.status <> 'Completed' then
    for assigned_coach in select coach_id from public.staff_task_assignments where task_id = new.id loop
      perform public.add_coach_credit_point(assigned_coach.coach_id, 'Tasks', -10, new.id, 'staff_task', 'Task reopened', auth.uid());
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_performance_staff_task_points on public.staff_tasks;
create trigger trg_performance_staff_task_points
after update on public.staff_tasks
for each row execute function public.performance_staff_task_points();

create or replace function public.performance_manual_adjustment_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_coach_credit_point(
    new.coach_id,
    case when new.adjustment_type = 'bonus' then 'Bonus' else 'Penalty' end,
    case when new.adjustment_type = 'bonus' then new.points else -new.points end,
    new.id,
    'manual_adjustment',
    new.reason,
    new.created_by
  );
  return new;
end;
$$;

drop trigger if exists trg_performance_manual_adjustment_points on public.coach_manual_adjustments;
create trigger trg_performance_manual_adjustment_points
after insert on public.coach_manual_adjustments
for each row execute function public.performance_manual_adjustment_points();

create or replace function public.fee_collection_score_for_coach(p_coach_id uuid, p_month text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count int;
  paid_count int;
  collection_percent numeric;
  month_start date;
begin
  month_start := to_date(p_month || '-01', 'YYYY-MM-DD');

  select count(*)::int into active_count
  from public.students s
  join public.batches b on b.id = s.batch_id
  where b.coach_id = p_coach_id
    and s.is_active = true
    and s.admission_date < month_start;

  if active_count = 0 then
    return 0;
  end if;

  select count(distinct s.id)::int into paid_count
  from public.students s
  join public.batches b on b.id = s.batch_id
  join public.fees f on f.student_id = s.id and f.month = p_month and f.amount > 0
  where b.coach_id = p_coach_id
    and s.is_active = true
    and s.admission_date < month_start;

  collection_percent := (paid_count::numeric / active_count::numeric) * 100;
  return case
    when collection_percent >= 95 then 25
    when collection_percent >= 85 then 15
    when collection_percent >= 70 then 5
    when collection_percent >= 50 then -10
    else -25
  end;
end;
$$;

create or replace function public.calculate_coach_monthly_scores(p_month text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  coach_row record;
  month_start timestamptz;
  month_end timestamptz;
  attendance_total int;
  fee_total int;
  enquiry_total int;
  task_total int;
  growth_total int;
  bonus_total int;
  penalty_total int;
  grand_total int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can calculate coach performance scores';
  end if;

  month_start := (p_month || '-01')::date;
  month_end := month_start + interval '1 month';

  for coach_row in select id from public.coaches where is_active = true loop
    select coalesce(sum(points), 0)::int into attendance_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category in ('Attendance','Coach Attendance') and created_at >= month_start and created_at < month_end;

    fee_total := public.fee_collection_score_for_coach(coach_row.id, p_month);

    select coalesce(sum(points), 0)::int into enquiry_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category = 'Enquiries' and created_at >= month_start and created_at < month_end;

    select coalesce(sum(points), 0)::int into task_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category = 'Tasks' and created_at >= month_start and created_at < month_end;

    select coalesce(sum(points), 0)::int into growth_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category = 'Growth' and created_at >= month_start and created_at < month_end;

    select coalesce(sum(points), 0)::int into bonus_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category = 'Bonus' and created_at >= month_start and created_at < month_end;

    select coalesce(sum(points), 0)::int into penalty_total
    from public.coach_credit_points
    where coach_id = coach_row.id and category = 'Penalty' and created_at >= month_start and created_at < month_end;

    grand_total := attendance_total + fee_total + enquiry_total + task_total + growth_total + bonus_total + penalty_total;

    insert into public.coach_monthly_scores (
      coach_id,
      month,
      total_score,
      attendance_score,
      fee_score,
      enquiry_score,
      task_score,
      growth_score,
      bonus_score,
      penalty_score,
      grade,
      calculated_at
    )
    values (
      coach_row.id,
      p_month,
      grand_total,
      attendance_total,
      fee_total,
      enquiry_total,
      task_total,
      growth_total,
      bonus_total,
      penalty_total,
      public.performance_grade(grand_total),
      now()
    )
    on conflict (coach_id, month) do update
    set total_score = excluded.total_score,
        attendance_score = excluded.attendance_score,
        fee_score = excluded.fee_score,
        enquiry_score = excluded.enquiry_score,
        task_score = excluded.task_score,
        growth_score = excluded.growth_score,
        bonus_score = excluded.bonus_score,
        penalty_score = excluded.penalty_score,
        grade = excluded.grade,
        calculated_at = now();
  end loop;
end;
$$;

alter table public.coach_credit_points enable row level security;
alter table public.coach_monthly_scores enable row level security;
alter table public.coach_manual_adjustments enable row level security;

drop policy if exists "Admins read coach credit points" on public.coach_credit_points;
drop policy if exists "System writes coach credit points" on public.coach_credit_points;
drop policy if exists "Admins insert coach credit points" on public.coach_credit_points;
drop policy if exists "Admins manage monthly scores" on public.coach_monthly_scores;
drop policy if exists "Admins manage manual adjustments" on public.coach_manual_adjustments;

create policy "Admins read coach credit points" on public.coach_credit_points
for select to authenticated using (public.is_admin());

create policy "Admins insert coach credit points" on public.coach_credit_points
for insert to authenticated with check (public.is_admin());

create policy "Admins manage monthly scores" on public.coach_monthly_scores
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage manual adjustments" on public.coach_manual_adjustments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.calculate_coach_monthly_scores(text) to authenticated;
revoke execute on function public.add_coach_credit_point(uuid,text,integer,uuid,text,text,uuid) from anon, authenticated;

notify pgrst, 'reload schema';
