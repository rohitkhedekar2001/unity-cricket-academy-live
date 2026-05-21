-- Fee package coverage support.
-- Run this once on an existing Unity Cricket Academy Supabase project.

alter table public.fees
add column if not exists package_months int not null default 1,
add column if not exists coverage_start_date date,
add column if not exists coverage_end_date date,
add column if not exists next_due_date date;

update public.fees
set package_months = case
      when fee_package = 'ThreeMonths4800' then 3
      when fee_package = 'SixMonths9000' then 6
      when fee_package = 'OneYear15000' then 12
      when lower(coalesce(fee_plan_name, '')) like '%year%' or lower(coalesce(fee_plan_name, '')) like '%12%' then 12
      when lower(coalesce(fee_plan_name, '')) like '%six%' or lower(coalesce(fee_plan_name, '')) like '%6%' then 6
      when lower(coalesce(fee_plan_name, '')) like '%three%' or lower(coalesce(fee_plan_name, '')) like '%3%' then 3
      when fee_plan_amount >= 14000 or amount >= 14000 then 12
      when fee_plan_amount >= 8500 or amount >= 8500 then 6
      when fee_plan_amount >= 4500 or amount >= 4500 then 3
      else 1
    end;

update public.fees
set coverage_start_date = to_date(month || '-01', 'YYYY-MM-DD'),
    coverage_end_date = (
      to_date(month || '-01', 'YYYY-MM-DD')
      + (package_months || ' months')::interval
      - interval '1 day'
    )::date,
    next_due_date = (
      to_date(month || '-01', 'YYYY-MM-DD')
      + (package_months || ' months')::interval
    )::date
where coverage_start_date is null
   or coverage_end_date is null
   or next_due_date is null
   or (
      (
        (extract(year from coverage_end_date)::int - extract(year from coverage_start_date)::int) * 12
        + (extract(month from coverage_end_date)::int - extract(month from coverage_start_date)::int)
        + 1
      ) < package_months
   );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fees_package_months_check'
  ) then
    alter table public.fees
    add constraint fees_package_months_check check (package_months > 0);
  end if;
end $$;

create index if not exists idx_fees_student_coverage
on public.fees(student_id, coverage_start_date, coverage_end_date);

notify pgrst, 'reload schema';
