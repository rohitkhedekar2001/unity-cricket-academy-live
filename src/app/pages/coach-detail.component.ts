import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Batch, Coach, CoachAttendance, Salary, Student } from '../models/app.models';
import { DataService } from '../services/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section *ngIf="coach()" class="space-y-5">
      <a routerLink="/coaches" class="text-sm font-bold text-academy-red">Back to coaches</a>
      <div class="panel p-4 sm:p-5">
        <h2 class="break-words text-2xl font-black sm:text-3xl">{{ coach()?.profile?.name }}</h2>
        <p class="break-words text-neutral-500">{{ coach()?.designation }} &middot; {{ coach()?.profile?.email }}</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <section class="panel p-4"><h3 class="font-black">Assigned batches</h3><p *ngFor="let batch of batches()" class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm font-semibold">{{ batch.name }} &middot; {{ batch.timing }}</p><p *ngIf="batches().length === 0" class="mt-3 text-sm font-semibold text-neutral-500">No assigned batches.</p></section>
        <section class="panel p-4"><h3 class="font-black">Assigned students</h3><a *ngFor="let student of students()" [routerLink]="['/students', student.id]" class="mt-3 block rounded-lg bg-neutral-50 p-3 text-sm font-semibold transition hover:bg-orange-50 hover:text-academy-red">{{ student.name }}</a><p *ngIf="students().length === 0" class="mt-3 text-sm font-semibold text-neutral-500">No assigned students.</p></section>
        <section class="panel p-4"><h3 class="font-black">Salary history</h3><div *ngFor="let salary of salaries()" class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm"><b>{{ salary.month }}</b><span class="float-right">{{ money(salary.grand_total_salary ?? salary.final_salary) }}</span><p class="text-neutral-500">Leaves {{ salary.leave_taken ?? salary.leaves }} &middot; Deduction {{ money(salary.leave_deduction ?? salary.deduction) }}</p></div><p *ngIf="salaries().length === 0" class="mt-3 text-sm font-semibold text-neutral-500">No salary records.</p></section>
      </div>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="panel p-4"><p class="form-label">Total Attendance Records</p><p class="mt-1 text-2xl font-black">{{ attendance().length }}</p></div>
        <div class="panel p-4"><p class="form-label">Present Days</p><p class="mt-1 text-2xl font-black text-green-700">{{ presentCount() }}</p></div>
        <div class="panel p-4"><p class="form-label">Absent / Leave Days</p><p class="mt-1 text-2xl font-black text-academy-red">{{ absentCount() }}</p></div>
      </section>

      <section class="panel overflow-hidden">
        <div class="border-b border-neutral-100 p-4">
          <h3 class="font-black">Coach Attendance History</h3>
          <p class="text-sm text-neutral-500">Present and absent records saved from the attendance section.</p>
        </div>
        <div class="table-scroll">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="bg-neutral-950 text-white">
            <tr><th class="p-3">Date</th><th>Status</th><th>Marked By</th></tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngIf="attendance().length === 0"><td colspan="3" class="p-4 text-center font-semibold text-neutral-500">No attendance history found.</td></tr>
            <tr *ngFor="let record of attendance()" class="transition hover:bg-orange-50/40">
              <td class="p-3 font-bold">{{ record.date }}</td>
              <td><span class="badge" [ngClass]="record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">{{ record.status }}</span></td>
              <td>{{ record.updated_by || record.created_by || '-' }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>
    </section>
  `
})
export class CoachDetailComponent implements OnInit {
  readonly coach = signal<Coach | null>(null);
  readonly batches = signal<Batch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly salaries = signal<Salary[]>([]);
  readonly attendance = signal<CoachAttendance[]>([]);

  constructor(private readonly route: ActivatedRoute, private readonly data: DataService) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const [coach, batches, students, salaries, attendance] = await Promise.all([
      this.data.getCoach(id),
      this.data.listBatches(),
      this.data.listStudents(),
      this.data.listSalaries(id),
      this.data.listCoachAttendanceHistory(id)
    ]);
    this.coach.set(coach);
    const assigned = batches.filter((batch) => batch.coach_id === id);
    this.batches.set(assigned);
    this.students.set(students.filter((student) => assigned.some((batch) => batch.id === student.batch_id)));
    this.salaries.set(salaries);
    this.attendance.set(attendance);
  }

  presentCount(): number {
    return this.attendance().filter((record) => record.status === 'Present').length;
  }

  absentCount(): number {
    return this.attendance().filter((record) => record.status === 'Absent').length;
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }
}
