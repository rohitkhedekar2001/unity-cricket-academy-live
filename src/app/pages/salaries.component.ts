import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Coach, Salary } from '../models/app.models';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';

interface SalarySummary {
  fixedSalary: number;
  workingDays: number;
  leaveTaken: number;
  extraLeave: number;
  perDaySalary: number;
  leaveDeduction: number;
  baseSalary: number;
  additions: number;
  deductions: number;
  grandTotal: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div>
        <h2 class="text-2xl font-black">Salaries</h2>
        <p class="text-sm text-neutral-500">Generate salaries from attendance, paid leaves, personal coaching, bonuses, penalties, and advances.</p>
      </div>

      <form class="panel space-y-5 p-4" [formGroup]="form" (ngSubmit)="generate()">
        <div class="grid gap-4 md:grid-cols-3">
          <label><span class="form-label">Coach</span><select class="form-input mt-1" formControlName="coach_id"><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name }}</option></select></label>
          <label><span class="form-label">Month</span><input class="form-input mt-1" type="month" formControlName="month"></label>
          <label><span class="form-label">Fixed monthly salary</span><input class="form-input mt-1 bg-neutral-100" type="number" formControlName="fixed_salary" readonly></label>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <label><span class="form-label">Working days</span><input class="form-input mt-1 bg-neutral-100" type="number" formControlName="working_days" readonly></label>
          <label><span class="form-label">Leave Taken</span><input class="form-input mt-1" type="number" min="0" formControlName="leave_taken"></label>
          <label><span class="form-label">Paid Leave</span><input class="form-input mt-1" type="number" min="0" formControlName="paid_leave"></label>
          <label><span class="form-label">Per Day Salary</span><input class="form-input mt-1 bg-neutral-100" type="number" formControlName="per_day_salary" readonly></label>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <label><span class="form-label">Personal Coaching Count</span><input class="form-input mt-1" type="number" min="0" formControlName="personal_coaching_count"></label>
          <label><span class="form-label">Personal Coaching Amount</span><input class="form-input mt-1" type="number" min="0" formControlName="personal_coaching_amount"></label>
          <label><span class="form-label">Bonus</span><input class="form-input mt-1" type="number" min="0" formControlName="bonus"></label>
          <label><span class="form-label">Penalty</span><input class="form-input mt-1" type="number" min="0" formControlName="penalty_amount"></label>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <label><span class="form-label">Advance Taken</span><input class="form-input mt-1" type="number" min="0" formControlName="advance_taken"></label>
          <label><span class="form-label">Leave Deduction</span><input class="form-input mt-1 bg-neutral-100" type="number" formControlName="leave_deduction" readonly></label>
          <label><span class="form-label">Base Salary</span><input class="form-input mt-1 bg-neutral-100" type="number" formControlName="base_salary" readonly></label>
          <label><span class="form-label">Grand Total Salary</span><input class="form-input mt-1 bg-neutral-100 font-black text-academy-red" type="number" formControlName="grand_total_salary" readonly></label>
        </div>

        <section class="grid gap-3 rounded-lg bg-neutral-50 p-4 md:grid-cols-4">
          <div><p class="form-label">Base Salary</p><p class="mt-1 text-xl font-black">{{ money(summary().baseSalary) }}</p></div>
          <div><p class="form-label">Total Additions</p><p class="mt-1 text-xl font-black text-green-700">{{ money(summary().additions) }}</p></div>
          <div><p class="form-label">Total Deductions</p><p class="mt-1 text-xl font-black text-red-700">{{ money(summary().deductions) }}</p></div>
          <div><p class="form-label">Final Payable Salary</p><p class="mt-1 text-xl font-black text-academy-red">{{ money(summary().grandTotal) }}</p></div>
        </section>

        <div class="flex justify-end">
          <button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Generating...' : 'Generate salary' }}</button>
        </div>
      </form>

      <section class="panel overflow-hidden">
        <div class="divide-y divide-neutral-100 2xl:hidden">
          <p *ngIf="salaries().length === 0" class="p-4 text-center font-semibold text-neutral-500">No salary records found.</p>
          <article *ngFor="let salary of salaries()" class="space-y-4 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-black text-neutral-950">{{ salary.coach?.profile?.name }}</h3>
                <p class="text-sm font-semibold text-neutral-500">{{ salary.month }}</p>
              </div>
              <span class="rounded-lg bg-red-50 px-3 py-2 text-right text-base font-black text-academy-red">{{ money(salary.grand_total_salary || salary.final_salary) }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <p><span class="form-label block">Working Days</span>{{ salary.working_days || '-' }}</p>
              <p><span class="form-label block">Leaves</span>{{ salary.leave_taken || salary.leaves }}</p>
              <p><span class="form-label block">Paid Leave</span>{{ salary.paid_leave || 2 }}</p>
              <p><span class="form-label block">Base</span>{{ money(salary.base_salary || salary.final_salary) }}</p>
              <p><span class="form-label block">Additions</span>{{ money((salary.personal_coaching_amount || 0) + (salary.bonus || 0)) }}</p>
              <p><span class="form-label block">Deductions</span>{{ money((salary.leave_deduction || 0) + (salary.penalty_amount || 0) + (salary.advance_taken || 0)) }}</p>
            </div>
            <div class="flex justify-end">
              <button *ngIf="auth.isAdmin()" class="btn-danger !px-4" [disabled]="deleting()" (click)="askDelete(salary)">Delete</button>
            </div>
          </article>
        </div>

        <table class="hidden w-full min-w-[1100px] text-left text-sm 2xl:table">
          <thead class="bg-neutral-950 text-white">
            <tr><th class="p-3">Coach</th><th>Month</th><th>Working Days</th><th>Leaves</th><th>Paid Leave</th><th>Base</th><th>Additions</th><th>Deductions</th><th class="text-right">Final Payable</th><th class="text-right pr-3">Action</th></tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngIf="salaries().length === 0"><td colspan="10" class="p-4 text-center font-semibold text-neutral-500">No salary records found.</td></tr>
            <tr *ngFor="let salary of salaries()">
              <td class="p-3 font-bold">{{ salary.coach?.profile?.name }}</td>
              <td>{{ salary.month }}</td>
              <td>{{ salary.working_days || '-' }}</td>
              <td>{{ salary.leave_taken || salary.leaves }}</td>
              <td>{{ salary.paid_leave || 2 }}</td>
              <td>{{ money(salary.base_salary || salary.final_salary) }}</td>
              <td>{{ money((salary.personal_coaching_amount || 0) + (salary.bonus || 0)) }}</td>
              <td>{{ money((salary.leave_deduction || 0) + (salary.penalty_amount || 0) + (salary.advance_taken || 0)) }}</td>
              <td class="text-right font-bold text-academy-red">{{ money(salary.grand_total_salary || salary.final_salary) }}</td>
              <td class="pr-3 text-right"><button *ngIf="auth.isAdmin()" class="btn-danger !px-3" [disabled]="deleting()" (click)="askDelete(salary)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteLabel()" (cancel)="deleteTarget.set(null)" (confirm)="removeSalary()"></app-delete-confirm>
    </section>
  `
})
export class SalariesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly coaches = signal<Coach[]>([]);
  readonly salaries = signal<Salary[]>([]);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<Salary | null>(null);
  readonly summary = signal<SalarySummary>({
    fixedSalary: 0,
    workingDays: 26,
    leaveTaken: 0,
    extraLeave: 0,
    perDaySalary: 0,
    leaveDeduction: 0,
    baseSalary: 0,
    additions: 0,
    deductions: 0,
    grandTotal: 0
  });

  readonly form = this.fb.group({
    coach_id: ['', Validators.required],
    month: [new Date().toISOString().slice(0, 7), Validators.required],
    fixed_salary: [{ value: 0, disabled: true }],
    working_days: [{ value: 26, disabled: true }],
    leave_taken: [0, [Validators.required, Validators.min(0)]],
    paid_leave: [2, [Validators.required, Validators.min(0)]],
    per_day_salary: [{ value: 0, disabled: true }],
    leave_deduction: [{ value: 0, disabled: true }],
    base_salary: [{ value: 0, disabled: true }],
    personal_coaching_count: [0, [Validators.required, Validators.min(0)]],
    personal_coaching_amount: [0, [Validators.required, Validators.min(0)]],
    bonus: [0, [Validators.required, Validators.min(0)]],
    penalty_amount: [0, [Validators.required, Validators.min(0)]],
    advance_taken: [0, [Validators.required, Validators.min(0)]],
    grand_total_salary: [{ value: 0, disabled: true }]
  });

  async ngOnInit(): Promise<void> {
    const [coaches, salaries] = await Promise.all([this.data.listCoaches(), this.data.listSalaries()]);
    this.coaches.set(coaches);
    this.salaries.set(salaries);
    this.form.patchValue({ coach_id: coaches[0]?.id ?? '' });
    this.syncCoachSalary();
    this.syncWorkingDays();
    this.recalculate();
    this.form.valueChanges.subscribe(() => this.recalculate());
    this.form.get('coach_id')?.valueChanges.subscribe(() => {
      this.syncCoachSalary();
      void this.loadAttendanceDefaults();
    });
    this.form.get('month')?.valueChanges.subscribe(() => {
      this.syncWorkingDays();
      void this.loadAttendanceDefaults();
    });
    await this.loadAttendanceDefaults();
  }

  async generate(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.data.generateSalary({
        coachId: value.coach_id!,
        month: value.month!,
        personalCoachingCount: this.number(value.personal_coaching_count),
        personalCoachingAmount: this.number(value.personal_coaching_amount),
        bonus: this.number(value.bonus),
        penaltyAmount: this.number(value.penalty_amount),
        advanceTaken: this.number(value.advance_taken),
        paidLeave: this.number(value.paid_leave)
      });
      this.salaries.set(await this.data.listSalaries());
      this.toast.success('Salary generated successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to generate salary.');
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(salary: Salary): void {
    this.deleteTarget.set(salary);
  }

  deleteLabel(): string {
    const salary = this.deleteTarget();
    return salary ? `salary for ${salary.coach?.profile?.name ?? 'coach'} (${salary.month})` : 'salary record';
  }

  async removeSalary(): Promise<void> {
    const salary = this.deleteTarget();
    if (!salary || !this.auth.isAdmin()) return;
    this.deleting.set(true);
    try {
      await this.data.delete('salaries', salary.id);
      this.deleteTarget.set(null);
      this.salaries.set(await this.data.listSalaries());
      this.toast.success('Salary record deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to delete salary record.');
    } finally {
      this.deleting.set(false);
    }
  }

  private async loadAttendanceDefaults(): Promise<void> {
    const coachId = this.form.get('coach_id')?.value;
    const month = this.form.get('month')?.value;
    if (!coachId || !month) return;
    try {
      const attendance = await this.data.listCoachAttendanceForMonth(coachId, month);
      const leaves = attendance.filter((record) => record.status === 'Absent').length;
      this.form.patchValue({ leave_taken: leaves }, { emitEvent: true });
    } catch {
      this.recalculate();
    }
  }

  private syncCoachSalary(): void {
    const coach = this.coaches().find((item) => item.id === this.form.get('coach_id')?.value);
    this.form.patchValue({ fixed_salary: coach?.salary_per_month ?? 0 }, { emitEvent: false });
  }

  private syncWorkingDays(): void {
    const month = this.form.get('month')?.value || new Date().toISOString().slice(0, 7);
    this.form.patchValue({ working_days: this.calculateWorkingDays(month) }, { emitEvent: false });
  }

  private recalculate(): void {
    const value = this.form.getRawValue();
    const fixedSalary = this.number(value.fixed_salary);
    const workingDays = Math.max(this.number(value.working_days), 1);
    const leaveTaken = this.number(value.leave_taken);
    const paidLeave = this.number(value.paid_leave);
    const extraLeave = Math.max(leaveTaken - paidLeave, 0);
    const perDaySalary = fixedSalary / workingDays;
    const leaveDeduction = Math.round(perDaySalary * extraLeave);
    const baseSalary = Math.max(fixedSalary - leaveDeduction, 0);
    const additions = this.number(value.personal_coaching_amount) + this.number(value.bonus);
    const deductions = leaveDeduction + this.number(value.penalty_amount) + this.number(value.advance_taken);
    const grandTotal = Math.max(baseSalary + additions - this.number(value.penalty_amount) - this.number(value.advance_taken), 0);

    this.summary.set({ fixedSalary, workingDays, leaveTaken, extraLeave, perDaySalary, leaveDeduction, baseSalary, additions, deductions, grandTotal });
    this.form.patchValue({
      per_day_salary: Math.round(perDaySalary),
      leave_deduction: leaveDeduction,
      base_salary: baseSalary,
      grand_total_salary: grandTotal
    }, { emitEvent: false });
  }

  private calculateWorkingDays(month: string): number {
    const [year, monthNumber] = month.split('-').map(Number);
    const totalDays = new Date(year, monthNumber, 0).getDate();
    let sundays = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      if (new Date(year, monthNumber - 1, day).getDay() === 0) sundays += 1;
    }
    return totalDays - sundays;
  }

  private number(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }
}
