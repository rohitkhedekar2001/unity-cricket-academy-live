import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../services/data.service';
import { Fee, Student, StudentAttendance } from '../models/app.models';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent],
  template: `
    <section *ngIf="student()" class="space-y-5">
      <a routerLink="/students" class="text-sm font-bold text-academy-red">Back to students</a>
      <div class="panel p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 class="text-3xl font-black">{{ student()?.name }}</h2>
            <p class="text-sm text-neutral-500">{{ student()?.batch?.name || 'Unassigned batch' }} · {{ student()?.age_group || 'No age group' }}</p>
          </div>
          <span class="badge" [class.bg-green-100]="student()?.is_active" [class.text-green-800]="student()?.is_active" [class.bg-neutral-100]="!student()?.is_active">{{ student()?.is_active ? 'Active' : 'Inactive' }}</span>
        </div>
        <div class="mt-5 grid gap-3 md:grid-cols-3">
          <p><span class="form-label block">Phone</span>{{ student()?.phone_number || '-' }}</p>
          <p><span class="form-label block">School</span>{{ student()?.school_name || '-' }}</p>
          <p><span class="form-label block">Admission</span>{{ student()?.admission_date }}</p>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <app-stat-card label="Total paid" [value]="money(totalPaid())"></app-stat-card>
        <app-stat-card label="Expected plan" [value]="money(student()?.fee_plan_amount || 0)" [hint]="student()?.fee_plan_name || ''"></app-stat-card>
        <app-stat-card label="Pending this cycle" [value]="money(pending())"></app-stat-card>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="panel p-4">
          <h3 class="font-black">Attendance history</h3>
          <div class="mt-3 max-h-80 overflow-auto divide-y divide-neutral-100">
            <p *ngIf="attendance().length === 0" class="py-4 text-sm text-neutral-500">No attendance marked yet.</p>
            <div *ngFor="let row of attendance()" class="flex justify-between py-3 text-sm">
              <span>{{ row.date }}</span><span class="font-bold" [class.text-green-700]="row.status === 'Present'" [class.text-red-700]="row.status === 'Absent'">{{ row.status }}</span>
            </div>
          </div>
        </section>
        <section class="panel p-4">
          <h3 class="font-black">Fee history</h3>
          <div class="mt-3 max-h-80 overflow-auto divide-y divide-neutral-100">
            <p *ngIf="fees().length === 0" class="py-4 text-sm text-neutral-500">No payments recorded.</p>
            <div *ngFor="let fee of fees()" class="flex justify-between py-3 text-sm">
              <span>{{ fee.month }} · {{ fee.paid_date }}</span><span class="font-bold text-academy-red">{{ money(fee.amount) }}</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  `
})
export class StudentDetailComponent implements OnInit {
  readonly student = signal<Student | null>(null);
  readonly fees = signal<Fee[]>([]);
  readonly attendance = signal<StudentAttendance[]>([]);

  constructor(private readonly route: ActivatedRoute, private readonly data: DataService) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const [student, fees, attendance] = await Promise.all([
      this.data.getStudent(id),
      this.data.listFees(id),
      this.data.listStudentAttendanceHistory(id)
    ]);
    this.student.set(student);
    this.fees.set(fees);
    this.attendance.set(attendance);
  }

  totalPaid(): number {
    return this.fees().reduce((sum, fee) => sum + fee.amount, 0);
  }

  pending(): number {
    return Math.max((this.student()?.fee_plan_amount || 0) - this.totalPaid(), 0);
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }
}
