import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../shared/stat-card.component';
import { AppIconComponent } from '../shared/app-icon.component';
import { ThemeService } from '../services/theme.service';
import { DataService } from '../services/data.service';
import { Batch, Branch, Coach, Fee, Student } from '../models/app.models';

interface BatchDashboardSummary {
  batch: Batch;
  activeStudents: number;
  expectedFees: number;
  paidFees: number;
  collectionPercentage: number;
  coachName: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, AppIconComponent],
  template: `
    <section class="space-y-6 transition-colors duration-300" [ngClass]="darkMode() ? 'dashboard-dark rounded-lg p-4 sm:p-5' : ''">
      <div>
        <h2 class="text-2xl font-black text-neutral-950">Dashboard</h2>
        <p class="text-sm text-neutral-500">Live academy overview from Supabase.</p>
      </div>
      <section class="panel grid gap-3 p-4 sm:grid-cols-2">
        <label>
          <span class="form-label">Branch</span>
          <select class="form-input mt-1" [value]="branchFilter()" (change)="branchFilter.set($any($event.target).value)">
            <option value="">All Branches</option>
            <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
          </select>
        </label>
        <label>
          <span class="form-label">Fee Month</span>
          <input class="form-input mt-1" type="month" [value]="selectedMonth()" (change)="selectedMonth.set($any($event.target).value)">
        </label>
      </section>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total students" [value]="filteredStudents().length" icon="users"></app-stat-card>
        </a>
        <a routerLink="/coaches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total coaches" [value]="coaches().length" icon="user-check"></app-stat-card>
        </a>
        <a routerLink="/batches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active batches" [value]="filteredBatches().length" icon="batches"></app-stat-card>
        </a>
        <a routerLink="/fees" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Monthly fees" [value]="money(monthlyFees())" icon="wallet"></app-stat-card>
        </a>
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active students" [value]="activeStudents()" icon="user-check"></app-stat-card>
        </a>
      </div>
      <section class="space-y-4">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-black uppercase text-academy-red">Batch Overview</p>
            <h3 class="text-xl font-black text-neutral-950">Batch Strength</h3>
          </div>
          <p class="text-sm font-semibold text-neutral-500">Fee collection for {{ monthLabel() }}</p>
        </div>

        <div *ngIf="batchSummaries().length === 0" class="panel p-8 text-center">
          <div class="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-orange-100 text-academy-red"><app-icon name="batches" [size]="24"></app-icon></div>
          <h4 class="mt-3 font-black text-neutral-950">No batches found</h4>
          <p class="mt-1 text-sm text-neutral-500">No batches are available for the selected branch.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article *ngFor="let summary of batchSummaries()" class="panel group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
            <div class="h-1 bg-gradient-to-r from-academy-red via-academy-orange to-orange-300"></div>
            <div class="p-4 sm:p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neutral-950 text-orange-300"><app-icon name="users" [size]="22"></app-icon></div>
                  <h4 class="break-words text-lg font-black text-neutral-950">{{ summary.batch.name }}</h4>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-2xl font-black text-academy-red">{{ summary.activeStudents }}</p>
                  <p class="text-xs font-bold uppercase text-neutral-500">Active Students</p>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-orange-700"><app-icon name="rupee" [size]="17"></app-icon></span>
                  <span class="text-sm font-bold text-neutral-700">Fees Collection</span>
                </div>
                <span class="text-lg font-black text-academy-red">{{ summary.collectionPercentage }}%</span>
              </div>

              <div class="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200" role="progressbar" [attr.aria-valuenow]="summary.collectionPercentage" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full rounded-full bg-academy-orange transition-all duration-500" [style.width.%]="summary.collectionPercentage"></div>
              </div>
              <div class="mt-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-neutral-500">
                <span>Collected {{ money(summary.paidFees) }}</span>
                <span>Expected {{ money(summary.expectedFees) }}</span>
              </div>

              <div class="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-academy-red"><app-icon name="user-check" [size]="18"></app-icon></div>
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase text-neutral-500">Coach</p>
                  <p class="truncate text-sm font-black text-neutral-900">{{ summary.coachName }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
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
  readonly selectedMonth = signal(this.currentMonth());
  readonly theme = inject(ThemeService);
  readonly darkMode = this.theme.darkMode;
  readonly filteredBatches = computed(() => this.batches().filter((batch) => !this.branchFilter() || batch.branch_id === this.branchFilter()));
  readonly filteredStudents = computed(() => this.students().filter((student) => !this.branchFilter() || student.batch?.branch_id === this.branchFilter()));
  readonly filteredFees = computed(() => {
    const studentIds = new Set(this.filteredStudents().map((student) => student.id));
    return this.fees().filter((fee) => studentIds.has(fee.student_id));
  });
  readonly batchSummaries = computed<BatchDashboardSummary[]>(() => {
    const month = this.selectedMonth();
    const students = this.students();
    const fees = this.fees();

    return this.filteredBatches().map((batch) => {
      const activeStudents = students.filter((student) => student.batch_id === batch.id && student.is_active);
      const activeStudentIds = new Set(activeStudents.map((student) => student.id));
      const expectedFees = activeStudents.reduce((sum, student) => sum + Math.max(Number(student.fee_plan_amount) || 0, 0), 0);
      const paidFees = fees
        .filter((fee) => activeStudentIds.has(fee.student_id) && fee.paid_date?.slice(0, 7) === month)
        .reduce((sum, fee) => sum + Math.max(Number(fee.amount) || 0, 0), 0);
      const collectionPercentage = expectedFees > 0 ? Math.min(Math.round((paidFees / expectedFees) * 100), 100) : 0;

      return {
        batch,
        activeStudents: activeStudents.length,
        expectedFees,
        paidFees,
        collectionPercentage,
        coachName: batch.coach?.profile?.name || this.coaches().find((coach) => coach.id === batch.coach_id)?.profile?.name || 'Not assigned'
      };
    });
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
    return this.filteredFees().filter((fee) => fee.paid_date?.slice(0, 7) === this.selectedMonth()).reduce((sum, fee) => sum + fee.amount, 0);
  }

  monthLabel(): string {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    if (!year || !month) return 'selected month';
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }
}
