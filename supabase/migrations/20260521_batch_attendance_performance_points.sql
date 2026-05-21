-- Coach performance attendance points must be awarded once per batch submission,
-- not once per student attendance row.

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
    perform public.add_coach_credit_point(
      point_coach_id,
      'Attendance',
      point_value,
      new.batch_id,
      'student_attendance_batch',
      note,
      new.created_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_performance_student_attendance_points on public.student_attendance;
create trigger trg_performance_student_attendance_points
after insert on public.student_attendance
for each row execute function public.performance_student_attendance_points();

-- Convert already-created per-student attendance credits into one batch/date credit.
with batch_attendance_points as (
  select
    b.coach_id,
    sa.batch_id,
    sa.date,
    min(sa.created_at) as first_saved_at,
    (array_agg(sa.created_by order by sa.created_at))[1] as created_by,
    case
      when min(sa.created_at)::date = sa.date then 10
      when min(sa.created_at)::date = sa.date + 1 then -25
      else -50
    end as points,
    case
      when min(sa.created_at)::date = sa.date then 'Batch attendance saved on attendance date for ' || sa.date::text
      when min(sa.created_at)::date = sa.date + 1 then 'Batch attendance saved next day for ' || sa.date::text
      else 'Old batch attendance entered in bulk or late for ' || sa.date::text
    end as description
  from public.student_attendance sa
  join public.batches b on b.id = sa.batch_id
  where b.coach_id is not null
  group by b.coach_id, sa.batch_id, sa.date
)
insert into public.coach_credit_points (
  coach_id,
  category,
  points,
  reference_id,
  reference_type,
  description,
  created_at,
  created_by
)
select
  coach_id,
  'Attendance',
  points,
  batch_id,
  'student_attendance_batch',
  description,
  first_saved_at,
  created_by
from batch_attendance_points batch_points
where not exists (
  select 1
  from public.coach_credit_points existing
  where existing.coach_id = batch_points.coach_id
    and existing.category = 'Attendance'
    and existing.reference_id = batch_points.batch_id
    and existing.reference_type = 'student_attendance_batch'
    and existing.description = batch_points.description
);

delete from public.coach_credit_points
where category = 'Attendance'
  and reference_type = 'student_attendance';

-- Rebuild monthly score snapshots from the corrected point logs.
with monthly_totals as (
  select
    coach_id,
    to_char(created_at, 'YYYY-MM') as month,
    coalesce(sum(points) filter (where category in ('Attendance','Coach Attendance')), 0)::int as attendance_score,
    coalesce(sum(points) filter (where category = 'Fees'), 0)::int as fee_score,
    coalesce(sum(points) filter (where category = 'Enquiries'), 0)::int as enquiry_score,
    coalesce(sum(points) filter (where category = 'Tasks'), 0)::int as task_score,
    coalesce(sum(points) filter (where category = 'Growth'), 0)::int as growth_score,
    coalesce(sum(points) filter (where category = 'Bonus'), 0)::int as bonus_score,
    coalesce(sum(points) filter (where category = 'Penalty'), 0)::int as penalty_score,
    coalesce(sum(points), 0)::int as total_score
  from public.coach_credit_points
  group by coach_id, to_char(created_at, 'YYYY-MM')
)
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
select
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
  public.performance_grade(total_score),
  now()
from monthly_totals
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

notify pgrst, 'reload schema';
