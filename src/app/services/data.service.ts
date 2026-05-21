import { Injectable, signal } from '@angular/core';
import { SupabaseClientService } from '../core/supabase.client';
import { AuthService } from './auth.service';
import {
  AttendanceStatus,
  Batch,
  Branch,
  Coach,
  Enquiry,
  EnquiryStatus,
  Fee,
  AcademyMatch,
  MatchCoach,
  MatchNote,
  MatchPlayer,
  Salary,
  StaffTask,
  StaffTaskComment,
  StaffTaskStatus,
  Student,
  StudentAttendance,
  CoachAttendance
} from '../models/app.models';

type Table = 'profiles' | 'students' | 'coaches' | 'branches' | 'batches' | 'fees' | 'salaries' | 'student_attendance' | 'coach_attendance' | 'matches' | 'match_players' | 'match_coaches' | 'match_notes' | 'staff_tasks' | 'staff_task_assignments' | 'staff_task_comments' | 'staff_task_logs' | 'enquiries';

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
    filters: { batchId?: string; branchId?: string; age?: number | null; feePackage?: string } = {}
  ): Promise<Student[]> {
    const batchSelect = filters.branchId
      ? 'batch:batches!inner(id,name,timing,coach_id,branch_id,branch:branches(id,name,location,is_active))'
      : 'batch:batches(id,name,timing,coach_id,branch_id,branch:branches(id,name,location,is_active))';
    let query = this.supabase.client
      .from('students')
      .select(`*, ${batchSelect}`)
      .order('name');
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    if (active !== 'all') query = query.eq('is_active', active === 'active');
    if (filters.batchId) query = query.eq('batch_id', filters.batchId);
    if (filters.branchId) query = query.eq('batch.branch_id', filters.branchId);
    if (filters.age !== undefined && filters.age !== null) query = query.eq('age', filters.age);
    if (filters.feePackage) query = query.eq('fee_package', filters.feePackage);
    return this.run<Student[]>(() => query);
  }

  listMatchStudents(): Promise<Student[]> {
    if (this.auth.isAdmin()) return this.listStudents('', 'active');
    return this.run<Student[]>(() => this.supabase.client.rpc('list_match_students'));
  }

  getStudent(id: string): Promise<Student> {
    return this.run<Student>(() =>
      this.supabase.client.from('students').select('*, batch:batches(*, branch:branches(id,name,location,is_active))').eq('id', id).single()
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
        .select('*, batch:batches(id,name,timing,coach_id,branch_id,branch:branches(id,name,location,is_active))')
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

  listBranches(active: 'all' | 'active' = 'active'): Promise<Branch[]> {
    let query = this.supabase.client
      .from('branches')
      .select('*, batches(id,name,timing,coach_id,students(id,name,is_active))')
      .order('name');
    if (active === 'active') query = query.eq('is_active', true);
    return this.run<Branch[]>(() => query);
  }

  saveBranch(branch: Partial<Branch>): Promise<Branch> {
    return this.upsert<Branch>('branches', branch);
  }

  updateBranchActiveStatus(id: string, isActive: boolean): Promise<Branch> {
    return this.run<Branch>(() =>
      this.supabase.client
        .from('branches')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single()
    );
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
        .select('*, branch:branches(id,name,location,is_active), coach:coaches(id,designation,profile:profiles(name,email)), students(id,name,is_active)')
        .order('name')
    );
  }

  listMyBatches(): Promise<Batch[]> {
    if (this.auth.isAdmin()) return this.listBatches();
    return this.run<Batch[]>(() =>
      this.supabase.client
        .from('batches')
        .select('*, branch:branches(id,name,location,is_active), coach:coaches(id,user_id,designation,profile:profiles(name,email)), students(id,name,is_active)')
        .order('name')
    );
  }

  listMatchBatches(): Promise<Batch[]> {
    if (this.auth.isAdmin()) return this.listBatches();
    return this.run<Batch[]>(() => this.supabase.client.rpc('list_match_batches'));
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

  listStudentAttendanceRange(batchId: string, startDate: string, endDate: string): Promise<StudentAttendance[]> {
    return this.run<StudentAttendance[]>(() =>
      this.supabase.client
        .from('student_attendance')
        .select('*, student:students(*)')
        .eq('batch_id', batchId)
        .gte('date', startDate)
        .lte('date', endDate)
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

  listMatches(): Promise<AcademyMatch[]> {
    return this.run<AcademyMatch[]>(() =>
      this.supabase.client
        .from('matches')
        .select('*, players:match_players(*, student:students(*, batch:batches(id,name,timing,coach_id)), coach:coaches(*, profile:profiles(name,email))), coaches:match_coaches(*, coach:coaches(*, profile:profiles(name,email))), match_notes(*, profile:profiles(name,email,role))')
        .order('match_datetime', { ascending: false })
    );
  }

  saveMatch(match: Partial<AcademyMatch>): Promise<AcademyMatch> {
    return this.upsert<AcademyMatch>('matches', match);
  }

  async saveMatchPlayers(matchId: string, players: Array<Partial<MatchPlayer>>): Promise<void> {
    await this.run(() => this.supabase.client.from('match_players').delete().eq('match_id', matchId));
    if (players.length === 0) return;
    await this.run(() => this.supabase.client.from('match_players').insert(players.map((player) => ({
      match_id: matchId,
      student_id: 'student_id' in player ? player.student_id : null,
      coach_id: 'coach_id' in player ? player.coach_id : null,
      player_name: player.player_name ?? null,
      player_group: player.player_group ?? null,
      role: player.role ?? 'Batsman',
      fee_status: player.fee_status ?? 'Pending',
      attendance_confirmed: player.attendance_confirmed ?? false
    }))));
  }

  async saveMatchCoaches(matchId: string, coaches: string[]): Promise<void> {
    await this.run(() => this.supabase.client.from('match_coaches').delete().eq('match_id', matchId));
    const uniqueCoachIds = [...new Set(coaches.filter(Boolean))];
    if (uniqueCoachIds.length === 0) return;
    await this.run(() => this.supabase.client.from('match_coaches').insert(uniqueCoachIds.map((coachId) => ({ match_id: matchId, coach_id: coachId }))));
  }

  async saveMatchPlayer(player: Partial<MatchPlayer>): Promise<MatchPlayer> {
    if (!player.id) return this.upsert<MatchPlayer>('match_players', player);
    const { id, ...changes } = player;
    return this.run<MatchPlayer>(() => this.supabase.client.from('match_players').update(changes).eq('id', id).select().single());
  }

  async addMatchNote(matchId: string, note: string): Promise<MatchNote> {
    return this.run<MatchNote>(() => this.supabase.client.from('match_notes').insert({ match_id: matchId, note }).select('*, profile:profiles(name,email,role)').single());
  }

  listStaffTasks(): Promise<StaffTask[]> {
    return this.run<StaffTask[]>(() =>
      this.supabase.client
        .from('staff_tasks')
        .select('*, creator:profiles!staff_tasks_created_by_fkey(name,email,role), assignments:staff_task_assignments(*, coach:coaches(*, profile:profiles(name,email))), comments:staff_task_comments(*, profile:profiles(name,email,role)), logs:staff_task_logs(*, profile:profiles(name,email,role))')
        .order('deadline', { ascending: true })
    );
  }

  saveStaffTask(task: Partial<StaffTask>): Promise<StaffTask> {
    return this.upsert<StaffTask>('staff_tasks', task);
  }

  async saveTaskAssignments(taskId: string, coachIds: string[]): Promise<void> {
    await this.run(() => this.supabase.client.from('staff_task_assignments').delete().eq('task_id', taskId));
    const uniqueCoachIds = [...new Set(coachIds.filter(Boolean))];
    if (uniqueCoachIds.length === 0) return;
    await this.run(() => this.supabase.client.from('staff_task_assignments').insert(uniqueCoachIds.map((coachId) => ({ task_id: taskId, coach_id: coachId }))));
  }

  async updateTaskStatus(taskId: string, status: StaffTaskStatus): Promise<StaffTask> {
    const changes: Partial<StaffTask> = { status };
    if (status === 'Completed') changes.completed_at = new Date().toISOString();
    if (status === 'Pending' || status === 'In Progress') {
      changes.completed_at = null;
      changes.approved_at = null;
      if (status === 'Pending') changes.reopened_at = new Date().toISOString();
    }
    return this.run<StaffTask>(() => this.supabase.client.from('staff_tasks').update(changes as any).eq('id', taskId).select().single());
  }

  async approveTask(taskId: string): Promise<StaffTask> {
    return this.run<StaffTask>(() => this.supabase.client.from('staff_tasks').update({ approved_at: new Date().toISOString(), status: 'Completed' }).eq('id', taskId).select().single());
  }

  async addTaskComment(taskId: string, comment: string): Promise<StaffTaskComment> {
    return this.run<StaffTaskComment>(() => this.supabase.client.from('staff_task_comments').insert({ task_id: taskId, comment }).select('*, profile:profiles(name,email,role)').single());
  }

  listEnquiries(filters: { search?: string; status?: string; interestedBatch?: string; source?: string } = {}): Promise<Enquiry[]> {
    let query = this.supabase.client
      .from('enquiries')
      .select('*, creator:profiles!enquiries_created_by_fkey(name,email,role)')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (filters.search?.trim()) {
      const value = filters.search.trim();
      query = query.or(`player_name.ilike.%${value}%,mobile_number.ilike.%${value}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.interestedBatch) query = query.eq('interested_batch', filters.interestedBatch);
    if (filters.source) query = query.eq('source', filters.source);
    return this.run<Enquiry[]>(() => query);
  }

  saveEnquiry(enquiry: Partial<Enquiry>): Promise<Enquiry> {
    return this.upsert<Enquiry>('enquiries', enquiry);
  }

  updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry> {
    return this.run<Enquiry>(() =>
      this.supabase.client
        .from('enquiries')
        .update({ status })
        .eq('id', id)
        .select('*, creator:profiles!enquiries_created_by_fkey(name,email,role)')
        .single()
    );
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
