import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { AttendanceStatus, Batch, Coach, Student } from '../models/app.models';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-5">
      <div><h2 class="text-2xl font-black">Attendance</h2><p class="text-sm text-neutral-500">Bulk mark attendance by date and batch.</p></div>
      <div class="panel grid gap-3 p-4 md:grid-cols-2">
        <label><span class="form-label">Date</span><input class="form-input mt-1" type="date" [(ngModel)]="date" (change)="loadAttendance()"></label>
        <label><span class="form-label">Batch</span><select class="form-input mt-1" [(ngModel)]="batchId" (change)="loadAttendance()"><option value="">Select batch</option><option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option></select></label>
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
  `
})
export class AttendanceComponent implements OnInit {
  readonly batches = signal<Batch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly studentStatus = signal<Record<string, AttendanceStatus>>({});
  readonly coachStatus = signal<Record<string, AttendanceStatus>>({});
  readonly loading = signal(false);
  readonly savingStudents = signal(false);
  readonly savingCoaches = signal(false);
  date = new Date().toISOString().slice(0, 10);
  batchId = '';
  constructor(private readonly data: DataService, readonly auth: AuthService, private readonly toast: ToastService) {}
  async ngOnInit(): Promise<void> {
    const [batches, students, coaches] = await Promise.all([this.data.listMyBatches(), this.data.listStudents('', 'active'), this.data.listCoaches().catch(() => [])]);
    this.batches.set(batches); this.students.set(students); this.coaches.set(coaches);
    this.batchId = batches[0]?.id ?? '';
    await this.loadAttendance();
  }
  filteredStudents(): Student[] { return this.students().filter((student) => student.batch_id === this.batchId); }
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
}
