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

      <section class="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="font-black text-neutral-950">Monthly Salary Distribution</h3>
          <p class="text-sm text-neutral-500">Download a designed monthly PDF with every salary slip entry and total distribution.</p>
        </div>
        <button class="btn-primary" type="button" (click)="downloadMonthlySalaryReport()">Download Monthly PDF</button>
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="overflow-hidden rounded-lg bg-neutral-950 p-5 text-white shadow-soft">
          <p class="text-xs font-black uppercase text-orange-300">Total Salary Paid</p>
          <p class="mt-2 text-3xl font-black">{{ money(totalSalaryPaid()) }}</p>
          <p class="mt-1 text-sm text-neutral-300">All generated salary records</p>
        </div>
        <div class="rounded-lg border border-green-100 bg-green-50 p-5 shadow-soft">
          <p class="text-xs font-black uppercase text-green-700">This Month Paid</p>
          <p class="mt-2 text-3xl font-black text-green-800">{{ money(currentMonthPaid()) }}</p>
          <p class="mt-1 text-sm font-semibold text-green-700">{{ currentMonthLabel() }}</p>
        </div>
        <div class="rounded-lg border border-orange-100 bg-orange-50 p-5 shadow-soft">
          <p class="text-xs font-black uppercase text-orange-700">Salary Records</p>
          <p class="mt-2 text-3xl font-black text-orange-800">{{ salaries().length }}</p>
          <p class="mt-1 text-sm font-semibold text-orange-700">Generated entries</p>
        </div>
        <div class="rounded-lg border border-red-100 bg-red-50 p-5 shadow-soft">
          <p class="text-xs font-black uppercase text-red-700">Average Payable</p>
          <p class="mt-2 text-3xl font-black text-academy-red">{{ money(averageSalaryPaid()) }}</p>
          <p class="mt-1 text-sm font-semibold text-red-700">Across salary history</p>
        </div>
      </section>

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
              <button class="btn-secondary mr-2 !px-4" type="button" (click)="downloadSalarySlip(salary)">Download Slip</button>
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
              <td class="space-x-2 pr-3 text-right"><button class="btn-secondary !px-3" type="button" (click)="downloadSalarySlip(salary)">PDF</button><button *ngIf="auth.isAdmin()" class="btn-danger !px-3" [disabled]="deleting()" (click)="askDelete(salary)">Delete</button></td>
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

  salaryAmount(salary: Salary): number {
    return salary.grand_total_salary || salary.final_salary || 0;
  }

  async downloadSalarySlip(salary: Salary): Promise<void> {
    const coachName = salary.coach?.profile?.name || 'Coach';
    const logo = await this.loadLogo();
    const pdf = this.createPdfFromCanvases([this.renderSalarySlipCanvas(salary, logo)]);
    this.savePdf(pdf, `salary-slip-${this.slug(coachName)}-${salary.month}.pdf`);
  }

  async downloadMonthlySalaryReport(): Promise<void> {
    const month = this.form.get('month')?.value || new Date().toISOString().slice(0, 7);
    const rows = this.salaries().filter((salary) => salary.month === month);
    if (rows.length === 0) {
      this.toast.info('No salary records found for the selected month.');
      return;
    }
    const logo = await this.loadLogo();
    const pages = this.renderMonthlyReportCanvases(month, rows, logo);
    const pdf = this.createPdfFromCanvases(pages);
    this.savePdf(pdf, `salary-distribution-${month}.pdf`);
  }

  totalSalaryPaid(): number {
    return this.salaries().reduce((total, salary) => total + this.salaryAmount(salary), 0);
  }

  currentMonthPaid(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.salaries().filter((salary) => salary.month === month).reduce((total, salary) => total + this.salaryAmount(salary), 0);
  }

  averageSalaryPaid(): number {
    return this.salaries().length ? Math.round(this.totalSalaryPaid() / this.salaries().length) : 0;
  }

  currentMonthLabel(): string {
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date());
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  private inrText(value: number): string {
    return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)}`;
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'coach';
  }

  private async loadLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'assets/logo.png';
    });
  }

  private renderSalarySlipCanvas(salary: Salary, logo: HTMLImageElement | null): HTMLCanvasElement {
    const canvas = this.createA4Canvas();
    const ctx = canvas.getContext('2d')!;
    this.paintPage(ctx);
    this.paintHeader(ctx, logo, 'SALARY SLIP', salary.month);
    const coachName = salary.coach?.profile?.name || 'Coach';
    this.text(ctx, coachName, 56, 178, 26, '#111827', 'bold');
    this.text(ctx, salary.coach?.profile?.email || 'Unity Cricket Academy Staff', 56, 206, 14, '#6b7280');

    const additions = (salary.personal_coaching_amount || 0) + (salary.bonus || 0);
    const deductions = (salary.leave_deduction || salary.deduction || 0) + (salary.penalty_amount || 0) + (salary.advance_taken || 0);
    this.metric(ctx, 'Final Payable', this.inrText(this.salaryAmount(salary)), 516, 172, '#dc2626');
    this.metric(ctx, 'Working Days', String(salary.working_days || '-'), 56, 245, '#111827');
    this.metric(ctx, 'Leave Taken', String(salary.leave_taken || salary.leaves || 0), 246, 245, '#111827');
    this.metric(ctx, 'Paid Leave', String(salary.paid_leave || 2), 436, 245, '#111827');

    this.sectionTitle(ctx, 'Earnings', 56, 360);
    this.table(ctx, 56, 382, 682, [
      ['Base Salary', this.inrText(salary.base_salary || salary.final_salary)],
      ['Personal Coaching Count', String(salary.personal_coaching_count || 0)],
      ['Personal Coaching Amount', this.inrText(salary.personal_coaching_amount || 0)],
      ['Bonus', this.inrText(salary.bonus || 0)],
      ['Total Additions', this.inrText(additions)]
    ]);
    this.sectionTitle(ctx, 'Deductions', 56, 600);
    this.table(ctx, 56, 622, 682, [
      ['Leave Deduction', this.inrText(salary.leave_deduction || salary.deduction || 0)],
      ['Penalty', this.inrText(salary.penalty_amount || 0)],
      ['Advance Taken', this.inrText(salary.advance_taken || 0)],
      ['Total Deductions', this.inrText(deductions)]
    ]);
    this.totalBand(ctx, 'Net Payable Salary', this.inrText(this.salaryAmount(salary)), 56, 835);
    this.footer(ctx);
    return canvas;
  }

  private renderMonthlyReportCanvases(month: string, salaries: Salary[], logo: HTMLImageElement | null): HTMLCanvasElement[] {
    const pages: HTMLCanvasElement[] = [];
    const chunks = this.chunk(salaries, 12);
    chunks.forEach((chunk, pageIndex) => {
      const canvas = this.createA4Canvas();
      const ctx = canvas.getContext('2d')!;
      this.paintPage(ctx);
      this.paintHeader(ctx, logo, 'MONTHLY SALARY DISTRIBUTION', `${month} | Page ${pageIndex + 1} of ${chunks.length}`);
      const total = salaries.reduce((sum, salary) => sum + this.salaryAmount(salary), 0);
      this.metric(ctx, 'Total Distribution', this.inrText(total), 56, 165, '#dc2626');
      this.metric(ctx, 'Salary Records', String(salaries.length), 310, 165, '#111827');
      this.metric(ctx, 'Average Payable', this.inrText(Math.round(total / salaries.length)), 516, 165, '#111827');
      this.reportTable(ctx, 46, 285, chunk, pageIndex * 12);
      this.footer(ctx);
      pages.push(canvas);
    });
    return pages;
  }

  private createA4Canvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 794;
    canvas.height = 1123;
    return canvas;
  }

  private paintPage(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 794, 1123);
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 794, 132);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 122, 794, 10);
  }

  private paintHeader(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, title: string, subtitle: string): void {
    if (logo) {
      ctx.drawImage(logo, 54, 32, 72, 72);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(90, 68, 36, 0, Math.PI * 2);
      ctx.fill();
      this.text(ctx, 'UCA', 68, 76, 18, '#ffffff', 'bold');
    }
    this.text(ctx, 'UNITY CRICKET ACADEMY', 146, 58, 22, '#ffffff', 'bold');
    this.text(ctx, title, 146, 86, 14, '#fed7aa', 'bold');
    this.text(ctx, subtitle, 612, 70, 15, '#ffffff', 'bold');
  }

  private sectionTitle(ctx: CanvasRenderingContext2D, value: string, x: number, y: number): void {
    this.text(ctx, value, x, y, 18, '#111827', 'bold');
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x, y + 10, 110, 4);
  }

  private table(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, rows: string[][]): void {
    rows.forEach(([label, value], index) => {
      const rowY = y + index * 38;
      ctx.fillStyle = index % 2 === 0 ? '#fff7ed' : '#ffffff';
      ctx.fillRect(x, rowY, width, 38);
      ctx.strokeStyle = '#fed7aa';
      ctx.strokeRect(x, rowY, width, 38);
      this.text(ctx, label, x + 16, rowY + 25, 13, '#374151', index === rows.length - 1 ? 'bold' : 'normal');
      this.text(ctx, value, x + width - 210, rowY + 25, 13, '#111827', 'bold');
    });
  }

  private reportTable(ctx: CanvasRenderingContext2D, x: number, y: number, rows: Salary[], offset: number): void {
    const headers = ['#', 'Coach', 'Month', 'Base', 'Add', 'Deduct', 'Net Pay'];
    const widths = [36, 190, 76, 95, 80, 92, 110];
    let currentX = x;
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, widths.reduce((sum, width) => sum + width, 0), 38);
    headers.forEach((header, index) => {
      this.text(ctx, header, currentX + 8, y + 25, 11, '#ffffff', 'bold');
      currentX += widths[index];
    });
    rows.forEach((salary, index) => {
      currentX = x;
      const rowY = y + 38 + index * 44;
      ctx.fillStyle = index % 2 === 0 ? '#fff7ed' : '#ffffff';
      ctx.fillRect(x, rowY, widths.reduce((sum, width) => sum + width, 0), 44);
      const add = (salary.personal_coaching_amount || 0) + (salary.bonus || 0);
      const deduct = (salary.leave_deduction || salary.deduction || 0) + (salary.penalty_amount || 0) + (salary.advance_taken || 0);
      [String(offset + index + 1), salary.coach?.profile?.name || 'Coach', salary.month, this.inrText(salary.base_salary || salary.final_salary), this.inrText(add), this.inrText(deduct), this.inrText(this.salaryAmount(salary))].forEach((value, col) => {
        this.text(ctx, value.length > 23 ? `${value.slice(0, 22)}...` : value, currentX + 8, rowY + 27, 10, col === 6 ? '#dc2626' : '#111827', col === 6 ? 'bold' : 'normal');
        currentX += widths[col];
      });
    });
  }

  private metric(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, color: string): void {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(x, y, 170, 76);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(x, y, 170, 76);
    this.text(ctx, label, x + 14, y + 24, 11, '#6b7280', 'bold');
    this.text(ctx, value, x + 14, y + 55, 20, color, 'bold');
  }

  private totalBand(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number): void {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, 682, 78);
    this.text(ctx, label, x + 22, y + 48, 18, '#ffffff', 'bold');
    this.text(ctx, value, x + 470, y + 48, 24, '#fb923c', 'bold');
  }

  private footer(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(46, 1038, 702, 1);
    this.text(ctx, 'This is a system generated salary slip. No signature required.', 56, 1068, 11, '#6b7280');
    this.text(ctx, `Generated on ${new Date().toLocaleDateString('en-IN')}`, 560, 1068, 11, '#6b7280');
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(560, 1008);
    ctx.lineTo(728, 1008);
    ctx.stroke();
    this.text(ctx, 'Rohit S. Khedekar', 574, 1030, 13, '#111827', 'bold');
    this.text(ctx, 'Head Coach', 606, 1048, 11, '#6b7280', 'bold');
  }

  private text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight = 'normal'): void {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.fillText(value, x, y);
  }

  private createPdfFromCanvases(canvases: HTMLCanvasElement[]): Uint8Array {
    const objects: Uint8Array[] = [];
    const pageObjectIds: number[] = [];
    let objectId = 3;
    canvases.forEach((canvas, index) => {
      const pageId = objectId++;
      const imageId = objectId++;
      const contentId = objectId++;
      pageObjectIds.push(pageId);
      const imageBytes = this.base64Bytes(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
      const content = `q\n595 0 0 842 0 0 cm\n/Img${index + 1} Do\nQ`;
      objects[pageId] = this.ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Img${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects[imageId] = this.joinBytes([
        this.ascii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`),
        imageBytes,
        this.ascii('\nendstream')
      ]);
      objects[contentId] = this.ascii(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    objects[1] = this.ascii('<< /Type /Catalog /Pages 2 0 R >>');
    objects[2] = this.ascii(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`);
    return this.writePdf(objects);
  }

  private writePdf(objects: Uint8Array[]): Uint8Array {
    const chunks: Uint8Array[] = [this.ascii('%PDF-1.4\n')];
    const offsets = [0];
    let length = chunks[0].length;
    for (let id = 1; id < objects.length; id += 1) {
      if (!objects[id]) continue;
      offsets[id] = length;
      const objectBytes = this.joinBytes([this.ascii(`${id} 0 obj\n`), objects[id], this.ascii('\nendobj\n')]);
      chunks.push(objectBytes);
      length += objectBytes.length;
    }
    const xrefOffset = length;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) {
      xref += `${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(this.ascii(xref));
    return this.joinBytes(chunks);
  }

  private savePdf(pdf: Uint8Array, fileName: string): void {
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private base64Bytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  private ascii(value: string): Uint8Array {
    return new TextEncoder().encode(value);
  }

  private joinBytes(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, offset);
      offset += chunk.length;
    });
    return output;
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
    return chunks;
  }
}
