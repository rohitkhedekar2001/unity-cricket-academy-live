import { Injectable, signal } from '@angular/core';
import { SupabaseClientService } from '../../core/supabase.client';
import { Coach } from '../../models/app.models';
import {
  CoachCreditPoint,
  CoachManualAdjustment,
  CoachMonthlyScore,
  CoachPerformanceSummary,
  ManualAdjustmentType,
  PerformanceEnquiry,
  PerformanceGrade
} from './coach-performance.models';

@Injectable({ providedIn: 'root' })
export class CoachPerformanceService {
  readonly busy = signal(false);

  constructor(private readonly supabase: SupabaseClientService) {}

  private async run<T>(fn: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
    this.busy.set(true);
    const { data, error } = await fn();
    this.busy.set(false);
    if (error) throw error;
    return data as T;
  }

  listCoaches(): Promise<Coach[]> {
    return this.run<Coach[]>(() =>
      this.supabase.client
        .from('coaches')
        .select('id,designation,is_active,profile:profiles(name,email)')
        .eq('is_active', true)
        .order('designation')
    );
  }

  listPointLogs(filters: { coachId?: string; category?: string; month?: string } = {}): Promise<CoachCreditPoint[]> {
    let query = this.supabase.client
      .from('coach_credit_points')
      .select('*, coach:coaches(profile:profiles(name,email)), creator:profiles!coach_credit_points_created_by_fkey(name,email)')
      .order('created_at', { ascending: false })
      .limit(250);
    if (filters.coachId) query = query.eq('coach_id', filters.coachId);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.month) {
      query = query.gte('created_at', `${filters.month}-01`);
      query = query.lt('created_at', this.nextMonthStart(filters.month));
    }
    return this.run<CoachCreditPoint[]>(() => query);
  }

  listMonthlyScores(month: string): Promise<CoachMonthlyScore[]> {
    return this.run<CoachMonthlyScore[]>(() =>
      this.supabase.client
        .from('coach_monthly_scores')
        .select('*, coach:coaches(profile:profiles(name,email))')
        .eq('month', month)
        .order('total_score', { ascending: false })
    );
  }

  async calculateMonthlyScores(month: string): Promise<void> {
    await this.run(() => this.supabase.client.rpc('calculate_coach_monthly_scores', { p_month: month }));
  }

  async addAdjustment(payload: { coach_id: string; adjustment_type: ManualAdjustmentType; points: number; reason: string }): Promise<CoachManualAdjustment> {
    return this.run<CoachManualAdjustment>(() => this.supabase.client.from('coach_manual_adjustments').insert(payload).select().single());
  }

  listPerformanceEnquiries(filters: { coachId?: string; status?: string; search?: string } = {}): Promise<PerformanceEnquiry[]> {
    let query = this.supabase.client
      .from('enquiries')
      .select('id,student_name,parent_phone,age_group,interested_batch_id,discussion_notes,followup_status,enquiry_status,assigned_coach_id,converted_student_id,created_at,created_by,assigned_coach:coaches!enquiries_assigned_coach_id_fkey(profile:profiles(name,email))')
      .order('created_at', { ascending: false })
      .limit(250);
    if (filters.coachId) query = query.eq('assigned_coach_id', filters.coachId);
    if (filters.status) query = query.eq('enquiry_status', filters.status);
    if (filters.search?.trim()) {
      const value = filters.search.trim();
      query = query.or(`student_name.ilike.%${value}%,parent_phone.ilike.%${value}%`);
    }
    return this.run<PerformanceEnquiry[]>(() => query);
  }

  buildLiveSummary(coaches: Coach[], logs: CoachCreditPoint[]): CoachPerformanceSummary[] {
    return coaches.map((coach) => {
      const coachLogs = logs.filter((log) => log.coach_id === coach.id);
      const sum = (categories: string[]) => coachLogs.filter((log) => categories.includes(log.category)).reduce((total, log) => total + log.points, 0);
      const summary: CoachPerformanceSummary = {
        coachId: coach.id,
        coachName: coach.profile?.name || coach.designation || 'Coach',
        attendance: sum(['Attendance', 'Coach Attendance']),
        fees: sum(['Fees']),
        tasks: sum(['Tasks']),
        enquiries: sum(['Enquiries']),
        growth: sum(['Growth']),
        bonus: Math.max(sum(['Bonus']), 0),
        penalty: Math.min(sum(['Penalty']), 0),
        total: coachLogs.reduce((total, log) => total + log.points, 0),
        grade: 'Critical'
      };
      summary.grade = this.grade(summary.total);
      return summary;
    }).sort((left, right) => right.total - left.total);
  }

  grade(score: number): PerformanceGrade {
    if (score >= 90) return 'Elite Coach';
    if (score >= 75) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Critical';
  }

  private nextMonthStart(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
