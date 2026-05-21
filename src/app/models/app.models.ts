export type Role = 'Admin' | 'Coach';
export type AttendanceStatus = 'Present' | 'Absent';
export type MatchStatus = 'Upcoming' | 'Completed' | 'Cancelled';
export type MatchPlayerRole = 'Captain' | 'Wicket Keeper (WK)' | 'Batsman' | 'Bowler' | 'All-rounder';
export type MatchFeeStatus = 'Paid' | 'Pending';
export type StaffTaskPriority = 'High' | 'Medium' | 'Low';
export type StaffTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type StaffTaskCategory = 'Training' | 'Match Management' | 'Fees Collection' | 'Attendance' | 'Equipment' | 'Social Media' | 'Other';
export type EnquirySource = 'Walk-in' | 'Reference' | 'Instagram' | 'WhatsApp' | 'Other';
export type EnquiryInterest = 'Regular Coaching' | 'Personal Coaching' | 'Match Practice';
export type EnquiryStatus = 'New' | 'Follow-up Required' | 'Interested' | 'Not Interested' | 'Converted' | 'Closed';
export type CoachDesignation = string;
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
  is_active: boolean;
  profile?: Profile | null;
}

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
  batches?: Batch[];
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
  branch_id: string | null;
  coach?: Coach | null;
  branch?: Branch | null;
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
  package_months: number | null;
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  next_due_date: string | null;
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
  working_days: number;
  paid_leave: number;
  leave_taken: number;
  leave_deduction: number;
  base_salary: number;
  personal_coaching_count: number;
  personal_coaching_amount: number;
  bonus: number;
  penalty_amount: number;
  advance_taken: number;
  grand_total_salary: number;
  coach?: Coach;
}

export interface AcademyMatch {
  id: string;
  opponent_team: string;
  venue: string;
  match_datetime: string;
  match_fee: number;
  age_group: string;
  status: MatchStatus;
  notes: string | null;
  created_by: string | null;
  created_at?: string;
  players?: MatchPlayer[];
  coaches?: MatchCoach[];
  match_notes?: MatchNote[];
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  student_id: string | null;
  coach_id: string | null;
  player_name: string | null;
  player_group: string | null;
  role: MatchPlayerRole;
  fee_status: MatchFeeStatus;
  attendance_confirmed: boolean;
  student?: Student | null;
  coach?: Coach | null;
}

export interface MatchCoach {
  id: string;
  match_id: string;
  coach_id: string;
  coach?: Coach;
}

export interface MatchNote {
  id: string;
  match_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
  profile?: Profile | null;
}

export interface StaffTask {
  id: string;
  title: string;
  description: string;
  priority: StaffTaskPriority;
  deadline: string;
  category: StaffTaskCategory;
  notes: string | null;
  status: StaffTaskStatus;
  approved_at: string | null;
  completed_at: string | null;
  reopened_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  assignments?: StaffTaskAssignment[];
  comments?: StaffTaskComment[];
  logs?: StaffTaskLog[];
  creator?: Profile | null;
}

export interface StaffTaskAssignment {
  id: string;
  task_id: string;
  coach_id: string;
  assigned_at: string;
  coach?: Coach | null;
}

export interface StaffTaskComment {
  id: string;
  task_id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  profile?: Profile | null;
}

export interface StaffTaskLog {
  id: string;
  task_id: string;
  action: string;
  details: string | null;
  created_by: string | null;
  created_at: string;
  profile?: Profile | null;
}

export interface Enquiry {
  id: string;
  player_name: string;
  mobile_number: string;
  dob: string | null;
  age: number | null;
  interested_batch: string | null;
  source: EnquirySource;
  interested_in: EnquiryInterest;
  remarks: string | null;
  status: EnquiryStatus;
  visit_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile | null;
}

export const matchPlayerRoles: MatchPlayerRole[] = ['Captain', 'Wicket Keeper (WK)', 'Batsman', 'Bowler', 'All-rounder'];
export const matchStatuses: MatchStatus[] = ['Upcoming', 'Completed', 'Cancelled'];
export const taskPriorities: StaffTaskPriority[] = ['High', 'Medium', 'Low'];
export const taskStatuses: StaffTaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];
export const taskCategories: StaffTaskCategory[] = ['Training', 'Match Management', 'Fees Collection', 'Attendance', 'Equipment', 'Social Media', 'Other'];
export const enquirySources: EnquirySource[] = ['Walk-in', 'Reference', 'Instagram', 'WhatsApp', 'Other'];
export const enquiryInterests: EnquiryInterest[] = ['Regular Coaching', 'Personal Coaching', 'Match Practice'];
export const enquiryStatuses: EnquiryStatus[] = ['New', 'Follow-up Required', 'Interested', 'Not Interested', 'Converted', 'Closed'];

export const feePackages: Record<FeePackage, { label: string; amount: number }> = {
  Monthly1800: { label: 'Monthly', amount: 1800 },
  MonthlySummerCamp2500: { label: 'Monthly Summer Camp', amount: 2500 },
  ThreeMonths4800: { label: '3 Months', amount: 4800 },
  SixMonths9000: { label: '6 Months', amount: 9000 },
  OneYear15000: { label: '1 Year', amount: 15000 },
  Personal5000: { label: 'Personal Coaching', amount: 5000 }
};

export const coachDesignations: string[] = [
  'HeadCoach',
  'SeniorCoach',
  'AssistantCoachLevel3',
  'AssistantCoachLevel2',
  'AssistantCoachLevel1',
  'Marker',
  'AssistantCoachLevel4',
  'AssistantCoachLevel5'
];
