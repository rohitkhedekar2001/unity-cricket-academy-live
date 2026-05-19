import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Coach } from '../../models/app.models';
import { ToastService } from '../../services/toast.service';
import { CoachCreditPoint, CoachMonthlyScore, CoachPerformanceSummary, PerformanceEnquiry, performanceCategories } from './coach-performance.models';
import { CoachPerformanceService } from './coach-performance.service';

type Section = 'dashboard' | 'rankings' | 'logs' | 'enquiries' | 'adjustments';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-black uppercase text-academy-red">Coach Credit & Performance</p>
          <h2 class="text-2xl font-black">Performance Management</h2>
          <p class="text-sm text-neutral-500">Admin-only scoring, rankings, enquiry analytics, and manual bonus/penalty control.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input class="form-input sm:w-44" type="month" [value]="month()" (change)="month.set($any($event.target).value); reload()">
          <button class="btn-primary" [disabled]="loading()" (click)="calculateSnapshot()">{{ loading() ? 'Working...' : 'Save Monthly Snapshot' }}</button>
        </div>
      </div>

      <nav class="grid gap-2 md:grid-cols-5">
        <a *ngFor="let item of sections" [routerLink]="item.path" class="rounded-lg border px-3 py-2 text-center text-sm font-black transition"
          [ngClass]="section() === item.key ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-academy-orange hover:text-academy-red'">
          {{ item.label }}
        </a>
      </nav>

      <section *ngIf="section() === 'dashboard'" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-4">
          <article class="panel p-4"><p class="form-label">Top Coach</p><p class="mt-2 text-2xl font-black">{{ summaries()[0]?.coachName || '-' }}</p><p class="text-sm text-green-700">{{ summaries()[0]?.total || 0 }} points</p></article>
          <article class="panel p-4"><p class="form-label">Lowest Coach</p><p class="mt-2 text-2xl font-black">{{ lowestCoach()?.coachName || '-' }}</p><p class="text-sm text-red-700">{{ lowestCoach()?.total || 0 }} points</p></article>
          <article class="panel p-4"><p class="form-label">Logs This Month</p><p class="mt-2 text-2xl font-black">{{ logs().length }}</p></article>
          <article class="panel p-4"><p class="form-label">Total Score Pool</p><p class="mt-2 text-2xl font-black">{{ totalPool() }}</p></article>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <article *ngFor="let coach of summaries()" class="panel p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-black">{{ coach.coachName }}</h3>
                <p class="text-sm text-neutral-500">{{ coach.grade }}</p>
              </div>
              <div class="rounded-lg bg-neutral-950 px-4 py-2 text-right text-white">
                <p class="text-xs font-bold uppercase text-orange-300">Score</p>
                <p class="text-2xl font-black">{{ coach.total }}</p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div class="rounded-lg bg-green-50 p-3"><p class="form-label">Attendance</p><p class="font-black">{{ coach.attendance }}</p></div>
              <div class="rounded-lg bg-orange-50 p-3"><p class="form-label">Fees</p><p class="font-black">{{ coach.fees }}</p></div>
              <div class="rounded-lg bg-blue-50 p-3"><p class="form-label">Tasks</p><p class="font-black">{{ coach.tasks }}</p></div>
              <div class="rounded-lg bg-red-50 p-3"><p class="form-label">Penalty</p><p class="font-black">{{ coach.penalty }}</p></div>
            </div>
          </article>
        </div>
      </section>

      <section *ngIf="section() === 'rankings'" class="panel overflow-hidden">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-neutral-950 text-white"><tr><th class="p-3">Rank</th><th>Coach</th><th>Total</th><th>Grade</th><th>Attendance</th><th>Fees</th><th>Tasks</th><th>Enquiry</th></tr></thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngFor="let row of summaries(); let index = index"><td class="p-3 font-black">#{{ index + 1 }}</td><td class="font-bold">{{ row.coachName }}</td><td>{{ row.total }}</td><td><span class="badge" [ngClass]="gradeClass(row.grade)">{{ row.grade }}</span></td><td>{{ row.attendance }}</td><td>{{ row.fees }}</td><td>{{ row.tasks }}</td><td>{{ row.enquiries }}</td></tr>
          </tbody>
        </table>
      </section>

      <section *ngIf="section() === 'logs'" class="space-y-4">
        <div class="panel grid gap-3 p-4 md:grid-cols-3">
          <select class="form-input" [value]="coachFilter()" (change)="coachFilter.set($any($event.target).value); reload()"><option value="">All coaches</option><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name || coach.designation }}</option></select>
          <select class="form-input" [value]="categoryFilter()" (change)="categoryFilter.set($any($event.target).value); reload()"><option value="">All categories</option><option *ngFor="let category of categories" [value]="category">{{ category }}</option></select>
          <button class="btn-secondary" (click)="coachFilter.set(''); categoryFilter.set(''); reload()">Clear</button>
        </div>
        <div class="panel overflow-hidden">
          <table class="w-full min-w-[880px] text-left text-sm">
            <thead class="bg-neutral-950 text-white"><tr><th class="p-3">Date</th><th>Coach</th><th>Category</th><th>Points</th><th>Description</th><th>Reference</th></tr></thead>
            <tbody class="divide-y divide-neutral-100">
              <tr *ngFor="let log of logs()"><td class="p-3">{{ log.created_at | date:'dd MMM yyyy, h:mm a' }}</td><td class="font-bold">{{ log.coach?.profile?.name || coachName(log.coach_id) }}</td><td>{{ log.category }}</td><td class="font-black" [class.text-green-700]="log.points > 0" [class.text-red-700]="log.points < 0">{{ log.points }}</td><td>{{ log.description }}</td><td>{{ log.reference_type || '-' }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section *ngIf="section() === 'enquiries'" class="space-y-4">
        <div class="panel grid gap-3 p-4 md:grid-cols-3">
          <input class="form-input" placeholder="Search name or phone" [value]="enquirySearch()" (input)="enquirySearch.set($any($event.target).value); loadEnquiries()">
          <select class="form-input" [value]="coachFilter()" (change)="coachFilter.set($any($event.target).value); loadEnquiries()"><option value="">All coaches</option><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name || coach.designation }}</option></select>
          <select class="form-input" [value]="enquiryStatusFilter()" (change)="enquiryStatusFilter.set($any($event.target).value); loadEnquiries()"><option value="">All statuses</option><option value="Interested">Interested</option><option value="Follow-up">Follow-up</option><option value="Joined">Joined</option><option value="Not Interested">Not Interested</option></select>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article *ngFor="let enquiry of enquiries()" class="panel p-4">
            <div class="flex items-start justify-between gap-3"><h3 class="font-black">{{ enquiry.student_name || 'Enquiry' }}</h3><span class="badge bg-orange-100 text-orange-800">{{ enquiry.enquiry_status || 'New' }}</span></div>
            <p class="mt-1 text-sm text-neutral-500">{{ enquiry.parent_phone || '-' }} · {{ enquiry.age_group || '-' }}</p>
            <p class="mt-3 text-sm text-neutral-700">{{ enquiry.discussion_notes || 'No notes added.' }}</p>
            <p class="mt-3 text-xs font-bold uppercase text-neutral-500">Coach: {{ enquiry.assigned_coach?.profile?.name || coachName(enquiry.assigned_coach_id || '') }}</p>
          </article>
        </div>
      </section>

      <section *ngIf="section() === 'adjustments'" class="grid gap-4 lg:grid-cols-[420px_1fr]">
        <form class="panel p-4" [formGroup]="adjustmentForm" (ngSubmit)="saveAdjustment()">
          <h3 class="font-black">Add Bonus / Penalty</h3>
          <div class="mt-4 space-y-3">
            <label class="block"><span class="form-label">Coach</span><select class="form-input mt-1" formControlName="coach_id"><option value="">Select coach</option><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name || coach.designation }}</option></select></label>
            <label class="block"><span class="form-label">Type</span><select class="form-input mt-1" formControlName="adjustment_type"><option value="bonus">Bonus</option><option value="penalty">Penalty</option></select></label>
            <label class="block"><span class="form-label">Points</span><input class="form-input mt-1" type="number" min="1" formControlName="points"></label>
            <label class="block"><span class="form-label">Reason / Description</span><textarea class="form-input mt-1" rows="4" formControlName="reason"></textarea></label>
          </div>
          <button class="btn-primary mt-4 w-full" [disabled]="adjustmentForm.invalid || loading()">Save Adjustment</button>
        </form>
        <div class="panel p-4">
          <h3 class="font-black">Monthly Snapshots</h3>
          <div class="mt-3 space-y-2">
            <article *ngFor="let score of monthlyScores()" class="rounded-lg border border-neutral-200 p-3">
              <div class="flex items-center justify-between"><p class="font-black">{{ score.coach?.profile?.name || coachName(score.coach_id) }}</p><span class="badge" [ngClass]="gradeClass(score.grade)">{{ score.grade }}</span></div>
              <p class="mt-1 text-sm text-neutral-500">Total {{ score.total_score }} · Attendance {{ score.attendance_score }} · Fees {{ score.fee_score }} · Tasks {{ score.task_score }}</p>
            </article>
          </div>
        </div>
      </section>
    </section>
  `
})
export class CoachPerformanceComponent implements OnInit {
  private readonly service = inject(CoachPerformanceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly loading = this.service.busy;
  readonly coaches = signal<Coach[]>([]);
  readonly logs = signal<CoachCreditPoint[]>([]);
  readonly enquiries = signal<PerformanceEnquiry[]>([]);
  readonly monthlyScores = signal<CoachMonthlyScore[]>([]);
  readonly month = signal(new Date().toISOString().slice(0, 7));
  readonly coachFilter = signal('');
  readonly categoryFilter = signal('');
  readonly enquirySearch = signal('');
  readonly enquiryStatusFilter = signal('');
  readonly section = signal<Section>('dashboard');
  readonly categories = performanceCategories;
  readonly sections: Array<{ key: Section; label: string; path: string }> = [
    { key: 'dashboard', label: 'Dashboard', path: '/coach-performance/dashboard' },
    { key: 'rankings', label: 'Monthly Rankings', path: '/coach-performance/rankings' },
    { key: 'logs', label: 'Point Logs', path: '/coach-performance/logs' },
    { key: 'enquiries', label: 'Enquiries', path: '/coach-performance/enquiries' },
    { key: 'adjustments', label: 'Rewards & Penalties', path: '/coach-performance/adjustments' }
  ];
  readonly adjustmentForm = this.fb.group({
    coach_id: ['', Validators.required],
    adjustment_type: ['bonus' as 'bonus' | 'penalty', Validators.required],
    points: [1, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });
  readonly summaries = computed<CoachPerformanceSummary[]>(() => this.service.buildLiveSummary(this.coaches(), this.logs()));
  readonly lowestCoach = computed(() => [...this.summaries()].reverse()[0] ?? null);
  readonly totalPool = computed(() => this.summaries().reduce((total, item) => total + item.total, 0));

  async ngOnInit(): Promise<void> {
    this.route.data.subscribe((data) => {
      this.section.set((data['section'] as Section) || 'dashboard');
      if (this.section() === 'enquiries') void this.loadEnquiries();
    });
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      const [coaches, logs, scores] = await Promise.all([
        this.service.listCoaches(),
        this.service.listPointLogs({ coachId: this.coachFilter(), category: this.categoryFilter(), month: this.month() }),
        this.service.listMonthlyScores(this.month()).catch(() => [])
      ]);
      this.coaches.set(coaches);
      this.logs.set(logs);
      this.monthlyScores.set(scores);
      if (this.section() === 'enquiries') await this.loadEnquiries();
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load performance details.');
    }
  }

  async loadEnquiries(): Promise<void> {
    try {
      this.enquiries.set(await this.service.listPerformanceEnquiries({ coachId: this.coachFilter(), status: this.enquiryStatusFilter(), search: this.enquirySearch() }));
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load enquiry analytics.');
    }
  }

  async calculateSnapshot(): Promise<void> {
    try {
      await this.service.calculateMonthlyScores(this.month());
      this.monthlyScores.set(await this.service.listMonthlyScores(this.month()));
      this.toast.success('Monthly performance snapshot saved.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to calculate monthly scores.');
    }
  }

  async saveAdjustment(): Promise<void> {
    if (this.adjustmentForm.invalid) return;
    const value = this.adjustmentForm.getRawValue();
    try {
      await this.service.addAdjustment({ coach_id: value.coach_id!, adjustment_type: value.adjustment_type!, points: Number(value.points || 0), reason: value.reason! });
      this.adjustmentForm.reset({ coach_id: '', adjustment_type: 'bonus', points: 1, reason: '' });
      await this.reload();
      this.toast.success('Adjustment saved and points logged.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to save adjustment.');
    }
  }

  coachName(coachId: string): string {
    return this.coaches().find((coach) => coach.id === coachId)?.profile?.name || 'Coach';
  }

  gradeClass(grade: string): string {
    if (grade === 'Elite Coach' || grade === 'Excellent') return 'bg-green-100 text-green-800';
    if (grade === 'Good') return 'bg-blue-100 text-blue-800';
    if (grade === 'Needs Improvement') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
}
