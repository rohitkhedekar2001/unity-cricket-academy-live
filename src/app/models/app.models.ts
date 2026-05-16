export type Role = 'Admin' | 'Coach';
export type AttendanceStatus = 'Present' | 'Absent';
export type CoachDesignation =
  | 'HeadCoach'
  | 'SeniorCoach'
  | 'AssistantCoachLevel3'
  | 'AssistantCoachLevel2'
  | 'AssistantCoachLevel1';
export type FeePackage =
  | 'Monthly1800'
  | 'MonthlySummerCamp2500'
  | 'ThreeMonths4800'
  | 'SixMonths9000'
  | 'OneYear15000'
  | 'Personal5000';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
}

export interface Coach {
  id: string;
  user_id: string | null;
  salary_per_month: number;
  has_admin_access: boolean;
  phone_number: string | null;
  date_of_birth: string | null;
  designation: CoachDesignation;
  profile?: Profile | null;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  dob: string | null;
  date_of_birth: string | null;
  admission_date: string;
  address: string | null;
  phone_number: string | null;
  fee_package: FeePackage;
  fee_plan_name: string;
  fee_plan_amount: number;
  school_name: string | null;
  age_group: string | null;
  batch_id: string | null;
  is_active: boolean;
  batch?: Batch | null;
}

export interface Batch {
  id: string;
  name: string;
  timing: string;
  coach_id: string | null;
  coach?: Coach | null;
  students?: Student[];
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  batch_id: string;
  date: string;
  status: AttendanceStatus;
  created_by: string | null;
  updated_by: string | null;
  student?: Student;
}

export interface CoachAttendance {
  id: string;
  coach_id: string;
  date: string;
  status: AttendanceStatus;
  created_by: string | null;
  updated_by: string | null;
  coach?: Coach;
}

export interface Fee {
  id: string;
  student_id: string;
  fee_package: FeePackage;
  amount: number;
  fee_plan_name: string;
  fee_plan_amount: number;
  month: string;
  paid_date: string;
}

export interface Salary {
  id: string;
  coach_id: string;
  month: string;
  leaves: number;
  deduction: number;
  final_salary: number;
  coach?: Coach;
}

export const feePackages: Record<FeePackage, { label: string; amount: number }> = {
  Monthly1800: { label: 'Monthly', amount: 1800 },
  MonthlySummerCamp2500: { label: 'Monthly Summer Camp', amount: 2500 },
  ThreeMonths4800: { label: '3 Months', amount: 4800 },
  SixMonths9000: { label: '6 Months', amount: 9000 },
  OneYear15000: { label: '1 Year', amount: 15000 },
  Personal5000: { label: 'Personal Coaching', amount: 5000 }
};

export const coachDesignations: CoachDesignation[] = [
  'HeadCoach',
  'SeniorCoach',
  'AssistantCoachLevel3',
  'AssistantCoachLevel2',
  'AssistantCoachLevel1'
];
