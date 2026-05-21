import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { AttendanceStatus, Batch, Branch, Coach, Student } from '../models/app.models';
import { ToastService } from '../services/toast.service';

interface AbsenceAlert {
  student: Student;
  dates: string[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-5">
      <div><h2 class="text-2xl font-black">Attendance</h2><p class="text-sm text-neutral-500">Bulk mark attendance by date and batch.</p></div>
      <div class="panel grid gap-3 p-4 md:grid-cols-3">
        <label><span class="form-label">Date</span><input class="form-input mt-1" type="date" [(ngModel)]="date" (change)="loadAttendance()"></label>
        <label><span class="form-label">Branch</span><select class="form-input mt-1" [(ngModel)]="branchId" (change)="onBranchChange()"><option value="">{{ auth.isAdmin() ? 'All Branches' : 'All My Branches' }}</option><option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option></select></label>
        <label><span class="form-label">Batch</span><select class="form-input mt-1" [(ngModel)]="batchId" (change)="loadAttendance()"><option value="">Select batch</option><option *ngFor="let batch of filteredBatches()" [value]="batch.id">{{ batch.name }}</option></select></label>
      </div>
      <section class="panel p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="font-black">Student attendance</h3>
            <p class="text-sm text-neutral-500">Present {{ studentPresent() }} · Absent {{ studentAbsent() }} · Total {{ filteredStudents().length }}</p>
          </div>
          <button class="btn-primary" [disabled]="!batchId || savingStudents() || loading()" (click)="saveStudents()">{{ savingStudents() ? 'Saving...' : 'Save students' }}</button>
        </div>
        <div *ngIf="loading()" class="mt-4 rounded-lg bg-neutral-50 p-4 text-sm font-semibold text-neutral-500">Loading saved attendance...</div>
        <div *ngIf="!loading()" class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="sticky top-0 bg-neutral-950 text-white">
              <tr><th class="p-3">Student</th><th>Status</th><th class="text-right pr-3">Mark attendance</th></tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr *ngIf="filteredStudents().length === 0"><td colspan="3" class="p-4 text-center font-semibold text-neutral-500">No active students found for this batch.</td></tr>
              <tr *ngFor="let student of filteredStudents()" class="transition hover:bg-orange-50/40">
                <td class="p-3 font-bold">{{ student.name }}</td>
                <td><span class="badge" [ngClass]="studentStatus()[student.id] === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">{{ studentStatus()[student.id] || 'Present' }}</span></td>
                <td class="pr-3">
                  <div class="ml-auto grid max-w-xs grid-cols-2 gap-2">
                    <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition" [ngClass]="studentStatus()[student.id] === 'Present' ? 'border-green-600 bg-green-600 text-white shadow-soft' : 'border-neutral-200 bg-white text-neutral-700 hover:border-green-500'" (click)="setStudent(student.id, 'Present')">Present</button>
                    <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition" [ngClass]="studentStatus()[student.id] === 'Absent' ? 'border-red-600 bg-red-600 text-white shadow-soft' : 'border-neutral-200 bg-white text-neutral-700 hover:border-red-500'" (click)="setStudent(student.id, 'Absent')">Absent</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section *ngIf="auth.isAdmin()" class="panel p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="font-black">Coach attendance</h3>
            <p class="text-sm text-neutral-500">Present {{ coachPresent() }} · Absent {{ coachAbsent() }} · Total {{ coaches().length }}</p>
          </div>
          <button class="btn-primary" [disabled]="savingCoaches() || loading()" (click)="saveCoaches()">{{ savingCoaches() ? 'Saving...' : 'Save coaches' }}</button>
        </div>
        <div *ngIf="!loading()" class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="sticky top-0 bg-neutral-950 text-white">
              <tr><th class="p-3">Coach</th><th>Status</th><th class="text-right pr-3">Mark attendance</th></tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr *ngIf="coaches().length === 0"><td colspan="3" class="p-4 text-center font-semibold text-neutral-500">No coaches found.</td></tr>
              <tr *ngFor="let coach of coaches()" class="transition hover:bg-orange-50/40">
                <td class="p-3 font-bold">{{ coach.profile?.name }}</td>
                <td><span class="badge" [ngClass]="coachStatus()[coach.id] === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">{{ coachStatus()[coach.id] || 'Present' }}</span></td>
                <td class="pr-3">
                  <div class="ml-auto grid max-w-xs grid-cols-2 gap-2">
                    <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition" [ngClass]="coachStatus()[coach.id] === 'Present' ? 'border-green-600 bg-green-600 text-white shadow-soft' : 'border-neutral-200 bg-white text-neutral-700 hover:border-green-500'" (click)="setCoach(coach.id, 'Present')">Present</button>
                    <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition" [ngClass]="coachStatus()[coach.id] === 'Absent' ? 'border-red-600 bg-red-600 text-white shadow-soft' : 'border-neutral-200 bg-white text-neutral-700 hover:border-red-500'" (click)="setCoach(coach.id, 'Absent')">Absent</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <div *ngIf="absenceAlertOpen()" class="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-4">
      <div class="mx-auto my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div class="border-b border-red-100 bg-red-50 p-5">
          <p class="text-xs font-black uppercase text-red-700">Attendance Alert</p>
          <h2 class="mt-1 text-xl font-black text-neutral-950">3 consecutive days absent</h2>
          <p class="mt-2 text-sm font-semibold text-red-800">The following students have been absent for 3 consecutive days.</p>
          <p class="mt-1 text-sm text-neutral-700">Please call or message their parents/guardians to check on their attendance and availability.</p>
        </div>

        <div class="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          <h3 class="font-black">Students List</h3>
          <article *ngFor="let alert of absenceAlerts()" class="rounded-lg border border-neutral-200 p-4">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 class="font-black text-neutral-950">{{ alert.student.name }}</h4>
                <p class="mt-1 text-sm font-semibold text-neutral-500">Absent on:</p>
                <ul class="mt-2 space-y-1 text-sm text-neutral-700">
                  <li *ngFor="let absentDate of alert.dates">{{ displayDate(absentDate) }}</li>
                </ul>
                <p *ngIf="!alert.student.phone_number" class="mt-2 text-xs font-semibold text-red-600">No parent/guardian phone number saved.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <a class="btn-secondary" [class.pointer-events-none]="!alert.student.phone_number" [class.opacity-50]="!alert.student.phone_number" [href]="callLink(alert.student)">Call Parent</a>
                <a class="btn-primary" [class.pointer-events-none]="!alert.student.phone_number" [class.opacity-50]="!alert.student.phone_number" [href]="whatsappLink(alert)" target="_blank" rel="noopener">Send WhatsApp</a>
              </div>
            </div>
          </article>
        </div>

        <div class="flex flex-col gap-2 border-t border-neutral-100 p-5 sm:flex-row sm:justify-end">
          <button class="btn-secondary" type="button" (click)="remindLater()">Remind Me Later</button>
          <button class="btn-primary" type="button" (click)="absenceAlertOpen.set(false)">Close</button>
        </div>
      </div>
    </div>
  `
})
export class AttendanceComponent implements OnInit {
  readonly batches = signal<Batch[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly studentStatus = signal<Record<string, AttendanceStatus>>({});
  readonly coachStatus = signal<Record<string, AttendanceStatus>>({});
  readonly loading = signal(false);
  readonly savingStudents = signal(false);
  readonly savingCoaches = signal(false);
  readonly absenceAlertOpen = signal(false);
  readonly absenceAlerts = signal<AbsenceAlert[]>([]);
  date = new Date().toISOString().slice(0, 10);
  branchId = '';
  batchId = '';
  constructor(private readonly data: DataService, readonly auth: AuthService, private readonly toast: ToastService) {}
  async ngOnInit(): Promise<void> {
    const [branches, batches, students, coaches] = await Promise.all([this.data.listBranches().catch(() => []), this.data.listMyBatches(), this.data.listStudents('', 'active'), this.data.listCoaches().catch(() => [])]);
    this.branches.set(branches); this.batches.set(batches); this.students.set(students); this.coaches.set(coaches);
    this.batchId = batches[0]?.id ?? '';
    await this.loadAttendance();
  }
  filteredBatches(): Batch[] { return this.batches().filter((batch) => !this.branchId || batch.branch_id === this.branchId); }
  filteredStudents(): Student[] { return this.students().filter((student) => student.batch_id === this.batchId); }
  async onBranchChange(): Promise<void> {
    this.batchId = this.filteredBatches()[0]?.id ?? '';
    await this.loadAttendance();
  }
  async loadAttendance(): Promise<void> {
    if (!this.batchId) return;
    this.loading.set(true);
    try {
      const rows = await this.data.listStudentAttendance(this.batchId, this.date);
      const statuses: Record<string, AttendanceStatus> = {};
      this.filteredStudents().forEach((student) => statuses[student.id] = 'Present');
      rows.forEach((row) => statuses[row.student_id] = row.status);
      this.studentStatus.set(statuses);
      if (this.auth.isAdmin()) {
        const coachRows = await this.data.listCoachAttendance(this.date);
        const coachStatuses: Record<string, AttendanceStatus> = {};
        this.coaches().forEach((coach) => coachStatuses[coach.id] = 'Present');
        coachRows.forEach((row) => coachStatuses[row.coach_id] = row.status);
        this.coachStatus.set(coachStatuses);
      }
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load saved attendance.');
    } finally {
      this.loading.set(false);
    }
  }
  setStudent(id: string, status: AttendanceStatus): void { this.studentStatus.update((value) => ({ ...value, [id]: status })); }
  setCoach(id: string, status: AttendanceStatus): void { this.coachStatus.update((value) => ({ ...value, [id]: status })); }
  async saveStudents(): Promise<void> {
    this.savingStudents.set(true);
    try {
      await this.data.saveStudentAttendance(this.filteredStudents().map((student) => ({ student_id: student.id, batch_id: this.batchId, date: this.date, status: this.studentStatus()[student.id] || 'Present' })));
      this.toast.success('Student attendance saved.');
      await this.checkConsecutiveAbsences();
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to save attendance.');
    } finally {
      this.savingStudents.set(false);
    }
  }
  async saveCoaches(): Promise<void> {
    this.savingCoaches.set(true);
    try {
      await this.data.saveCoachAttendance(this.coaches().map((coach) => ({ coach_id: coach.id, date: this.date, status: this.coachStatus()[coach.id] || 'Present' })));
      this.toast.success('Coach attendance saved.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to save coach attendance.');
    } finally {
      this.savingCoaches.set(false);
    }
  }
  studentPresent(): number { return this.filteredStudents().filter((student) => (this.studentStatus()[student.id] || 'Present') === 'Present').length; }
  studentAbsent(): number { return this.filteredStudents().length - this.studentPresent(); }
  coachPresent(): number { return this.coaches().filter((coach) => (this.coachStatus()[coach.id] || 'Present') === 'Present').length; }
  coachAbsent(): number { return this.coaches().length - this.coachPresent(); }

  private async checkConsecutiveAbsences(): Promise<void> {
    const today = this.date;
    const previousDay = this.shiftDate(today, -1);
    const twoDaysAgo = this.shiftDate(today, -2);
    const rows = await this.data.listStudentAttendanceRange(this.batchId, twoDaysAgo, previousDay);
    const absentByStudent = new Map<string, Set<string>>();
    rows.filter((row) => row.status === 'Absent').forEach((row) => {
      absentByStudent.set(row.student_id, new Set([...(absentByStudent.get(row.student_id) || []), row.date]));
    });
    const alerts = this.filteredStudents()
      .filter((student) => (this.studentStatus()[student.id] || 'Present') === 'Absent')
      .filter((student) => absentByStudent.get(student.id)?.has(twoDaysAgo) && absentByStudent.get(student.id)?.has(previousDay))
      .map((student) => ({ student, dates: [twoDaysAgo, previousDay, today] }));
    this.absenceAlerts.set(alerts);
    this.absenceAlertOpen.set(alerts.length > 0);
  }

  private shiftDate(value: string, days: number): string {
    const [year, month, date] = value.split('-').map(Number);
    const next = new Date(year, month - 1, date);
    next.setDate(next.getDate() + days);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }

  displayDate(value: string): string {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }

  callLink(student: Student): string {
    return student.phone_number ? `tel:${student.phone_number}` : '#';
  }

  whatsappLink(alert: AbsenceAlert): string {
    const phone = this.normalizePhone(alert.student.phone_number || '');
    if (!phone) return '#';
    const absentDates = alert.dates.map((date) => this.displayDate(date)).join(', ');
    const text = encodeURIComponent(
      `Hello, this is Unity Cricket Academy. ${alert.student.name} has been absent for 3 consecutive days (${absentDates}). Please let us know about their attendance and availability.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  remindLater(): void {
    this.absenceAlertOpen.set(false);
    this.toast.info('Attendance reminder dismissed for now.');
  }
}
