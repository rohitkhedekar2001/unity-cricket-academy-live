-- Add Saint Mary monthly fee package.
-- Run once on the existing Supabase project before selecting this package in the app.

alter table public.students
drop constraint if exists students_fee_package_check;

alter table public.students
add constraint students_fee_package_check
check (fee_package in (
  'Monthly1800',
  'SaintMaryMonthly2000',
  'MonthlySummerCamp2500',
  'ThreeMonths4800',
  'SixMonths9000',
  'OneYear15000',
  'Personal5000'
));

alter table public.fees
drop constraint if exists fees_fee_package_check;

alter table public.fees
add constraint fees_fee_package_check
check (fee_package in (
  'Monthly1800',
  'SaintMaryMonthly2000',
  'MonthlySummerCamp2500',
  'ThreeMonths4800',
  'SixMonths9000',
  'OneYear15000',
  'Personal5000'
));

notify pgrst, 'reload schema';
