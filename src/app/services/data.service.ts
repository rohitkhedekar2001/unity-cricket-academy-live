import { Injectable, signal } from '@angular/core';
import { SupabaseClientService } from '../core/supabase.client';
import { AuthService } from './auth.service';
import {
  AttendanceStatus,
  Batch,
  Coach,
  Fee,
  Salary,
  Student,
  StudentAttendance,
  CoachAttendance
} from '../models/app.models';

type Table = 'profiles' | 'students' | 'coaches' | 'batches' | 'fees' | 'salaries' | 'student_attendance' | 'coach_attendance';

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly busy = signal(false);

  constructor(private readonly supabase: SupabaseClientService, private readonly auth: AuthService) {}

  private async run<T>(fn: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
    this.busy.set(true);
    const { data, error } = await fn();
    this.busy.set(false);
    if (error) throw error;
    return data as T;
  }

  listStudents(
    search = '',
    active: 'all' | 'active' | 'inactive' = 'all',
    filters: { batchId?: string; age?: number | null; feePackage?: string } = {}
  ): Promise<Student[]> {
    let query = this.supabase.client
      .from('students')
      .select('*, batch:batches(id,name,timing,coach_id)')
      .order('name');
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    if (active !== 'all') query = query.eq('is_active', active === 'active');
    if (filters.batchId) query = query.eq('batch_id', filters.batchId);
    if (filters.age !== undefined && filters.age !== null) query = query.eq('age', filters.age);
    if (filters.feePackage) query = query.eq('fee_package', filters.feePackage);
    return this.run<Student[]>(() => query);
  }

  getStudent(id: string): Promise<Student> {
    return this.run<Student>(() =>
      this.supabase.client.from('students').select('*, batch:batches(*)').eq('id', id).single()
    );
  }

  saveStudent(student: Partial<Student>): Promise<Student> {
    if (!student.id && !this.auth.isAdmin()) {
      return this.createAssignedBatchStudent(student);
    }
    return this.upsert<Student>('students', student);
  }

  private createAssignedBatchStudent(student: Partial<Student>): Promise<Student> {
    return this.run<Student>(() =>
      this.supabase.client.rpc('create_assigned_batch_student', {
        p_name: student.name,
        p_age: student.age,
        p_dob: student.dob || student.date_of_birth || null,
        p_date_of_birth: student.date_of_birth || null,
        p_admission_date: student.admission_date,
        p_address: student.address || null,
        p_phone_number: student.phone_number || null,
        p_fee_package: student.fee_package,
        p_fee_plan_name: student.fee_plan_name,
        p_fee_plan_amount: student.fee_plan_amount,
        p_school_name: student.school_name || null,
        p_age_group: student.age_group || null,
        p_batch_id: student.batch_id,
        p_is_active: student.is_active ?? true
      })
    );
  }

  updateStudentActiveStatus(id: string, isActive: boolean): Promise<Student> {
    return this.run<Student>(() =>
      this.supabase.client
        .from('students')
        .update({ is_active: isActive })
        .eq('id', id)
        .select('*, batch:batches(id,name,timing,coach_id)')
        .single()
    );
  }

  listCoaches(active: 'all' | 'active' | 'inactive' = 'active'): Promise<Coach[]> {
    let query = this.supabase.client
      .from('coaches')
      .select('*, profile:profiles(id,name,email,role)')
      .order('designation');
    if (active !== 'all') query = query.eq('is_active', active === 'active');
    return this.run<Coach[]>(() => query);
  }

  listAllCoaches(): Promise<Coach[]> {
    return this.run<Coach[]>(() =>
      this.supabase.client
        .from('coaches')
        .select('*, profile:profiles(id,name,email,role)')
        .order('designation')
    );
  }

  getCoach(id: string): Promise<Coach> {
    return this.run<Coach>(() =>
      this.supabase.client.from('coaches').select('*, profile:profiles(*)').eq('id', id).single()
    );
  }

  updateCoachActiveStatus(id: string, isActive: boolean): Promise<Coach> {
    return this.run<Coach>(() =>
      this.supabase.client
        .from('coaches')
        .update({ is_active: isActive })
        .eq('id', id)
        .select('*, profile:profiles(id,name,email,role)')
        .single()
    );
  }

  async createCoachAccount(payload: {
    name: string;
    email: string;
    password: string;
    salary_per_month: number;
    has_admin_access: boolean;
    phone_number: string | null;
    date_of_birth: string | null;
    designation: string;
  }): Promise<string> {
    const currentSession = this.auth.session();
    const { data, error } = await this.supabase.client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { name: payload.name, role: payload.has_admin_access ? 'Admin' : 'Coach' } }
    });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error('Unable to create Supabase auth user. Check that Email auth is enabled.');

    if (currentSession?.access_token && currentSession.refresh_token) {
      await this.supabase.client.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      });
    }

    return this.run<string>(() => this.supabase.client.rpc('create_coach_account', {
      p_user_id: userId,
      p_name: payload.name,
      p_email: payload.email,
      p_salary_per_month: payload.salary_per_month,
      p_has_admin_access: payload.has_admin_access,
      p_phone_number: payload.phone_number,
      p_date_of_birth: payload.date_of_birth,
      p_designation: payload.designation
    }));
  }

  saveCoach(coach: Partial<Coach>): Promise<Coach> {
    return this.upsert<Coach>('coaches', coach);
  }

  async updateCoachAccount(payload: {
    p_coach_id: string;
    p_name: string;
    p_email: string;
    p_salary_per_month: number;
    p_has_admin_access: boolean;
    p_phone_number: string | null;
    p_date_of_birth: string | null;
    p_designation: string;
  }): Promise<void> {
    await this.run<string>(() => this.supabase.client.rpc('update_coach_account', payload));
  }

  async deleteCoachAccount(coachId: string): Promise<void> {
    await this.run<string>(() => this.supabase.client.rpc('delete_coach_account', { p_coach_id: coachId }));
  }

  listBatches(): Promise<Batch[]> {
    return this.run<Batch[]>(() =>
      this.supabase.client
        .from('batches')
        .select('*, coach:coaches(id,designation,profile:profiles(name,email)), students(id,name,is_active)')
        .order('name')
    );
  }

  listMyBatches(): Promise<Batch[]> {
    if (this.auth.isAdmin()) return this.listBatches();
    return this.run<Batch[]>(() =>
      this.supabase.client
        .from('batches')
        .select('*, coach:coaches(id,user_id,designation,profile:profiles(name,email)), students(id,name,is_active)')
        .order('name')
    );
  }

  saveBatch(batch: Partial<Batch>): Promise<Batch> {
    return this.upsert<Batch>('batches', batch);
  }

  listStudentAttendance(batchId: string, date: string): Promise<StudentAttendance[]> {
    return this.run<StudentAttendance[]>(() =>
      this.supabase.client
        .from('student_attendance')
        .select('*, student:students(*)')
        .eq('batch_id', batchId)
        .eq('date', date)
    );
  }

  listStudentAttendanceHistory(studentId: string): Promise<StudentAttendance[]> {
    return this.run<StudentAttendance[]>(() =>
      this.supabase.client
        .from('student_attendance')
        .select('*, student:students(*)')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
    );
  }

  async saveStudentAttendance(records: Array<{ student_id: string; batch_id: string; date: string; status: AttendanceStatus }>): Promise<void> {
    await this.run(() => this.supabase.client.from('student_attendance').upsert(records, { onConflict: 'student_id,batch_id,date' }));
  }

  listCoachAttendance(date: string): Promise<CoachAttendance[]> {
    return this.run<CoachAttendance[]>(() =>
      this.supabase.client.from('coach_attendance').select('*, coach:coaches(*, profile:profiles(name,email))').eq('date', date)
    );
  }

  listCoachAttendanceHistory(coachId: string): Promise<CoachAttendance[]> {
    return this.run<CoachAttendance[]>(() =>
      this.supabase.client
        .from('coach_attendance')
        .select('*, coach:coaches(*, profile:profiles(name,email))')
        .eq('coach_id', coachId)
        .order('date', { ascending: false })
    );
  }

  async saveCoachAttendance(records: Array<{ coach_id: string; date: string; status: AttendanceStatus }>): Promise<void> {
    await this.run(() => this.supabase.client.from('coach_attendance').upsert(records, { onConflict: 'coach_id,date' }));
  }

  listFees(studentId?: string): Promise<Fee[]> {
    let query = this.supabase.client.from('fees').select('*').order('paid_date', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    return this.run<Fee[]>(() => query);
  }

  saveFee(fee: Partial<Fee>): Promise<Fee> {
    return this.upsert<Fee>('fees', fee);
  }

  listSalaries(coachId?: string): Promise<Salary[]> {
    let query = this.supabase.client
      .from('salaries')
      .select('*, coach:coaches(*, profile:profiles(name,email))')
      .order('month', { ascending: false });
    if (coachId) query = query.eq('coach_id', coachId);
    return this.run<Salary[]>(() => query);
  }

  listCoachAttendanceForMonth(coachId: string, month: string): Promise<CoachAttendance[]> {
    const startDate = `${month}-01`;
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    return this.run<CoachAttendance[]>(() =>
      this.supabase.client
        .from('coach_attendance')
        .select('*, coach:coaches(*, profile:profiles(name,email))')
        .eq('coach_id', coachId)
        .gte('date', startDate)
        .lte('date', endDate)
    );
  }

  generateSalary(payload: {
    coachId: string;
    month: string;
    personalCoachingCount: number;
    personalCoachingAmount: number;
    bonus: number;
    penaltyAmount: number;
    advanceTaken: number;
    paidLeave: number;
  }): Promise<string> {
    return this.run<string>(() => this.supabase.client.rpc('generate_salary', {
      p_coach_id: payload.coachId,
      p_month: payload.month,
      p_personal_coaching_count: payload.personalCoachingCount,
      p_personal_coaching_amount: payload.personalCoachingAmount,
      p_bonus: payload.bonus,
      p_penalty_amount: payload.penaltyAmount,
      p_advance_taken: payload.advanceTaken,
      p_paid_leave: payload.paidLeave
    }));
  }

  delete(table: Table, id: string): Promise<null> {
    return this.run<null>(() => this.supabase.client.from(table).delete().eq('id', id));
  }

  private upsert<T>(table: Table, value: Partial<T>): Promise<T> {
    return this.run<T>(() => this.supabase.client.from(table).upsert(value as any).select().single());
  }
}
