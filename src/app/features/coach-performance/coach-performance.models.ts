export type PerformanceCategory = 'Growth' | 'Attendance' | 'Fees' | 'Coach Attendance' | 'Tasks' | 'Enquiries' | 'Bonus' | 'Penalty';
export type PerformanceGrade = 'Elite Coach' | 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical';
export type ManualAdjustmentType = 'bonus' | 'penalty';

export interface CoachCreditPoint {
  id: string;
  coach_id: string;
  category: PerformanceCategory;
  points: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string;
  created_at: string;
  created_by: string | null;
  coach?: { profile?: { name: string; email: string } | null } | null;
  creator?: { name: string; email: string } | null;
}

export interface CoachMonthlyScore {
  id: string;
  coach_id: string;
  month: string;
  total_score: number;
  attendance_score: number;
  fee_score: number;
  enquiry_score: number;
  task_score: number;
  growth_score: number;
  bonus_score: number;
  penalty_score: number;
  grade: PerformanceGrade;
  calculated_at: string;
  coach?: { profile?: { name: string; email: string } | null } | null;
}

export interface CoachManualAdjustment {
  id: string;
  coach_id: string;
  adjustment_type: ManualAdjustmentType;
  points: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface PerformanceEnquiry {
  id: string;
  student_name: string | null;
  parent_phone: string | null;
  age_group: string | null;
  interested_batch_id: string | null;
  discussion_notes: string | null;
  followup_status: string | null;
  enquiry_status: string | null;
  assigned_coach_id: string | null;
  converted_student_id: string | null;
  created_at: string;
  created_by: string | null;
  assigned_coach?: { profile?: { name: string; email: string } | null } | null;
}

export interface CoachPerformanceSummary {
  coachId: string;
  coachName: string;
  total: number;
  attendance: number;
  fees: number;
  tasks: number;
  enquiries: number;
  growth: number;
  bonus: number;
  penalty: number;
  grade: PerformanceGrade;
}

export const performanceCategories: PerformanceCategory[] = ['Growth', 'Attendance', 'Fees', 'Coach Attendance', 'Tasks', 'Enquiries', 'Bonus', 'Penalty'];
