import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../shared/stat-card.component';
import { DataService } from '../services/data.service';
import { Batch, Branch, Coach, Fee, Student } from '../models/app.models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="text-2xl font-black text-neutral-950">Dashboard</h2>
        <p class="text-sm text-neutral-500">Live academy overview from Supabase.</p>
      </div>
      <section class="panel p-4">
        <select class="form-input max-w-sm" [value]="branchFilter()" (change)="branchFilter.set($any($event.target).value)">
          <option value="">All Branches</option>
          <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
        </select>
      </section>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total students" [value]="filteredStudents().length"></app-stat-card>
        </a>
        <a routerLink="/coaches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total coaches" [value]="coaches().length"></app-stat-card>
        </a>
        <a routerLink="/batches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active batches" [value]="filteredBatches().length"></app-stat-card>
        </a>
        <a routerLink="/fees" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Monthly fees" [value]="money(monthlyFees())"></app-stat-card>
        </a>
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active students" [value]="activeStudents()"></app-stat-card>
        </a>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="panel p-4">
          <h3 class="font-black text-neutral-950">Recent payments</h3>
          <div class="mt-3 divide-y divide-neutral-100">
            <p *ngIf="filteredFees().length === 0" class="py-4 text-sm text-neutral-500">No fee records yet.</p>
            <div *ngFor="let fee of filteredFees().slice(0, 8)" class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span class="min-w-0 break-words font-medium"><a [routerLink]="['/students', fee.student_id]" class="font-bold transition hover:text-academy-red hover:underline">{{ studentName(fee.student_id) }}</a> &middot; {{ fee.month }} &middot; {{ fee.fee_plan_name }}</span>
              <span class="shrink-0 font-bold text-academy-red">{{ money(fee.amount) }}</span>
            </div>
          </div>
        </section>
        <section class="panel p-4">
          <h3 class="font-black text-neutral-950">Batch strength</h3>
          <div class="mt-3 space-y-3">
            <div *ngFor="let batch of filteredBatches()" class="rounded-lg bg-neutral-50 p-3">
              <div class="flex flex-wrap justify-between gap-2 text-sm font-bold">
                <span class="min-w-0 break-words">{{ batch.name }}</span>
                <span>{{ batch.students?.length || 0 }} students</span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-neutral-200">
                <div class="h-2 rounded-full bg-academy-orange" [style.width.%]="Math.min((batch.students?.length || 0) * 8, 100)"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  readonly students = signal<Student[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly fees = signal<Fee[]>([]);
  readonly branchFilter = signal('');
  readonly Math = Math;
  readonly filteredBatches = computed(() => this.batches().filter((batch) => !this.branchFilter() || batch.branch_id === this.branchFilter()));
  readonly filteredStudents = computed(() => this.students().filter((student) => !this.branchFilter() || student.batch?.branch_id === this.branchFilter()));
  readonly filteredFees = computed(() => {
    const studentIds = new Set(this.filteredStudents().map((student) => student.id));
    return this.fees().filter((fee) => studentIds.has(fee.student_id));
  });

  constructor(private readonly data: DataService) {}

  async ngOnInit(): Promise<void> {
    const [students, coaches, branches, batches, fees] = await Promise.all([
      this.data.listStudents(),
      this.data.listCoaches().catch(() => []),
      this.data.listBranches().catch(() => []),
      this.data.listBatches(),
      this.data.listFees()
    ]);
    this.students.set(students);
    this.coaches.set(coaches);
    this.branches.set(branches);
    this.batches.set(batches);
    this.fees.set(fees);
  }

  activeStudents(): number {
    return this.filteredStudents().filter((student) => student.is_active).length;
  }

  monthlyFees(): number {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.filteredFees().filter((fee) => fee.paid_date?.slice(0, 7) === month).reduce((sum, fee) => sum + fee.amount, 0);
  }

  studentName(id: string): string {
    return this.students().find((student) => student.id === id)?.name ?? 'Student';
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }
}
