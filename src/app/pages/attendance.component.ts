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
      <div><h2 class="text-2xl font-black">Attendance</h2><p class="text-sm text-neutral-500">Bulk mark student attendance and coach attendance.</p></div>
      <div class="panel grid gap-3 p-4 md:grid-cols-2">
        <label><span class="form-label">Date</span><input class="form-input mt-1" type="date" [(ngModel)]="date" (change)="loadAttendance()"></label>
        <label><span class="form-label">Batch</span><select class="form-input mt-1" [(ngModel)]="batchId" (change)="loadAttendance()"><option value="">Select batch</option><option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option></select></label>
      </div>
      <section class="panel p-4">
        <div class="flex items-center justify-between"><h3 class="font-black">Student attendance</h3><button class="btn-primary" [disabled]="!batchId || savingStudents()" (click)="saveStudents()">{{ savingStudents() ? 'Saving...' : 'Save' }}</button></div>
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <p *ngIf="filteredStudents().length === 0" class="text-sm font-semibold text-neutral-500">No active students found for this batch.</p>
          <div *ngFor="let student of filteredStudents()" class="rounded-lg border border-neutral-200 p-3">
            <p class="font-bold">{{ student.name }}</p>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" class="btn-secondary" [ngClass]="studentStatus()[student.id] === 'Present' ? 'bg-green-600 text-white border-green-600' : ''" (click)="setStudent(student.id, 'Present')">Present</button>
              <button type="button" class="btn-secondary" [ngClass]="studentStatus()[student.id] === 'Absent' ? 'bg-red-600 text-white border-red-600' : ''" (click)="setStudent(student.id, 'Absent')">Absent</button>
            </div>
          </div>
        </div>
      </section>
      <section *ngIf="auth.isAdmin()" class="panel p-4">
        <div class="flex items-center justify-between"><h3 class="font-black">Coach attendance</h3><button class="btn-primary" [disabled]="savingCoaches()" (click)="saveCoaches()">{{ savingCoaches() ? 'Saving...' : 'Save' }}</button></div>
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div *ngFor="let coach of coaches()" class="rounded-lg border border-neutral-200 p-3">
            <p class="font-bold">{{ coach.profile?.name }}</p>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" class="btn-secondary" [ngClass]="coachStatus()[coach.id] === 'Present' ? 'bg-green-600 text-white border-green-600' : ''" (click)="setCoach(coach.id, 'Present')">Present</button>
              <button type="button" class="btn-secondary" [ngClass]="coachStatus()[coach.id] === 'Absent' ? 'bg-red-600 text-white border-red-600' : ''" (click)="setCoach(coach.id, 'Absent')">Absent</button>
            </div>
          </div>
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
  readonly savingStudents = signal(false);
  readonly savingCoaches = signal(false);
  date = new Date().toISOString().slice(0, 10);
  batchId = '';
  constructor(private readonly data: DataService, readonly auth: AuthService, private readonly toast: ToastService) {}
  async ngOnInit(): Promise<void> {
    const [batches, students, coaches] = await Promise.all([this.data.listBatches(), this.data.listStudents('', 'active'), this.data.listCoaches().catch(() => [])]);
    this.batches.set(batches); this.students.set(students); this.coaches.set(coaches);
    this.batchId = batches[0]?.id ?? '';
    await this.loadAttendance();
  }
  filteredStudents(): Student[] { return this.students().filter((student) => student.batch_id === this.batchId); }
  async loadAttendance(): Promise<void> {
    if (!this.batchId) return;
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
}
