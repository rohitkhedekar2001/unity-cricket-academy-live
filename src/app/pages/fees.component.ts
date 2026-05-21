import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Batch, Branch, feePackages, FeePackage, Fee, Student } from '../models/app.models';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';

interface FeeStatusRow {
  student: Student;
  batchName: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentDate: string;
  status: 'Paid' | 'Partial' | 'Pending';
  coverageLabel: string;
  coverageStart: string;
  coverageEnd: string;
  nextDueDate: string;
  fees: Fee[];
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-2xl font-black">Fees</h2>
          <p class="text-sm text-neutral-500">{{ auth.isAdmin() ? 'Track paid and pending fees across every batch.' : 'Track fees only for students assigned to your batches.' }}</p>
        </div>
        <button class="btn-primary" [disabled]="loading()" (click)="openForm()">Add fee</button>
      </div>

      <section class="panel p-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input class="form-input" placeholder="Search student" [value]="search()" (input)="search.set($any($event.target).value)">
          <input class="form-input" type="month" [value]="selectedMonth()" (change)="selectedMonth.set($any($event.target).value)">
          <select class="form-input" [value]="selectedBranch()" (change)="selectedBranch.set($any($event.target).value); selectedBatch.set('')">
            <option value="">{{ auth.isAdmin() ? 'All Branches' : 'All My Branches' }}</option>
            <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
          </select>
          <select class="form-input" [value]="selectedBatch()" (change)="selectedBatch.set($any($event.target).value)">
            <option value="">{{ auth.isAdmin() ? 'All Batches' : 'All My Batches' }}</option>
            <option *ngFor="let batch of filteredBatches()" [value]="batch.id">{{ batch.name }}</option>
          </select>
          <button type="button" class="btn-secondary" (click)="clearFilters()">Clear</button>
        </div>
      </section>

      <section class="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="font-black text-neutral-950">Monthly Fee Report</h3>
          <p class="text-sm text-neutral-500">{{ reportBatch() ? 'Download the selected batch fee report with paid and pending students.' : auth.isAdmin() ? 'Download a combined academy fee report for all batches.' : 'Download a combined report for your assigned batches.' }}</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select class="form-input sm:w-56" [value]="reportBranch()" (change)="reportBranch.set($any($event.target).value); reportBatch.set('')">
            <option value="">{{ auth.isAdmin() ? 'All Branches' : 'All My Branches' }}</option>
            <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
          </select>
          <select class="form-input sm:w-56" [value]="reportBatch()" (change)="reportBatch.set($any($event.target).value)">
            <option value="">{{ auth.isAdmin() ? 'All Batches' : 'All My Batches' }}</option>
            <option *ngFor="let batch of reportBatches()" [value]="batch.id">{{ batch.name }}</option>
          </select>
          <button class="btn-primary" type="button" [disabled]="loading() || reportBusy()" (click)="downloadSelectedFeeReport()">{{ reportBusy() ? 'Preparing...' : reportBatch() ? 'Download Batch PDF' : 'Download Combined PDF' }}</button>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-3">
        <div class="panel p-4"><p class="form-label">Paid Students</p><p class="mt-1 text-2xl font-black text-green-700">{{ paidRows().length }}</p></div>
        <div class="panel p-4"><p class="form-label">Pending Students</p><p class="mt-1 text-2xl font-black text-academy-red">{{ pendingRows().length }}</p></div>
        <div class="panel p-4"><p class="form-label">Collected</p><p class="mt-1 text-2xl font-black text-neutral-950">{{ money(totalPaid()) }}</p></div>
      </section>

      <div class="flex rounded-lg border border-neutral-200 bg-white p-1 shadow-soft">
        <button type="button" class="flex-1 rounded-md px-4 py-2 text-sm font-black transition" [ngClass]="activeTab() === 'paid' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-orange-50'" (click)="activeTab.set('paid')">Paid Fees</button>
        <button type="button" class="flex-1 rounded-md px-4 py-2 text-sm font-black transition" [ngClass]="activeTab() === 'pending' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-orange-50'" (click)="activeTab.set('pending')">Pending Fees</button>
      </div>

      <section class="panel overflow-hidden">
        <div *ngIf="loading()" class="p-6 text-center text-sm font-bold text-neutral-500">Loading fee details...</div>
        <div *ngIf="!loading()" class="overflow-x-auto">
          <table class="w-full min-w-[1360px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-neutral-950 text-white">
              <tr>
                <th class="w-52 whitespace-nowrap px-4 py-3">Student Name</th>
                <th class="w-40 whitespace-nowrap px-4 py-3">Batch</th>
                <th class="w-32 whitespace-nowrap px-4 py-3 text-right">Fee Amount</th>
                <th class="w-32 whitespace-nowrap px-4 py-3 text-right">Paid Amount</th>
                <th class="w-36 whitespace-nowrap px-4 py-3 text-right">Pending Amount</th>
                <th class="w-80 whitespace-nowrap px-4 py-3">Coverage Period</th>
                <th class="w-36 whitespace-nowrap px-4 py-3">Next Due</th>
                <th class="w-36 whitespace-nowrap px-4 py-3">Status</th>
                <th class="w-56 whitespace-nowrap px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 bg-white">
              <tr *ngIf="visibleRows().length === 0"><td colspan="9" class="p-6 text-center font-semibold text-neutral-500">{{ activeTab() === 'paid' ? 'No paid fee records found.' : 'No pending students found.' }}</td></tr>
              <tr *ngFor="let row of visibleRows()" class="transition hover:bg-orange-50/40">
                <td class="px-4 py-3 align-middle font-bold text-neutral-950">{{ row.student.name }}</td>
                <td class="px-4 py-3 align-middle text-neutral-700">{{ row.batchName }}</td>
                <td class="px-4 py-3 text-right align-middle font-semibold">{{ money(row.expectedAmount) }}</td>
                <td class="px-4 py-3 text-right align-middle font-black text-green-700">{{ money(row.paidAmount) }}</td>
                <td class="px-4 py-3 text-right align-middle font-black" [class.text-academy-red]="row.pendingAmount > 0">{{ money(row.pendingAmount) }}</td>
                <td class="px-4 py-3 align-middle">
                  <div class="min-w-[280px] rounded-lg bg-orange-50 px-3 py-2">
                    <p class="font-black leading-5 text-neutral-950">{{ coveragePeriod(row) || '-' }}</p>
                    <p class="mt-1 text-xs font-semibold text-neutral-500">{{ row.paymentDate ? 'Paid on ' + displayDate(row.paymentDate) : 'No payment yet' }}</p>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 align-middle font-semibold">{{ displayDate(row.nextDueDate) }}</td>
                <td class="px-4 py-3 align-middle"><span class="badge" [ngClass]="statusClass(row.status)">{{ row.status }}</span></td>
                <td class="px-4 py-3 align-middle">
                  <div class="flex flex-wrap justify-end gap-2">
                    <button class="btn-secondary !px-3 !py-2" (click)="openFormForStudent(row.student)">Add</button>
                    <a *ngIf="row.pendingAmount > 0" class="btn-primary !px-3 !py-2" [class.pointer-events-none]="!row.student.phone_number" [class.opacity-50]="!row.student.phone_number" [href]="feeReminderLink(row)" target="_blank" rel="noopener">WhatsApp</a>
                    <button *ngIf="row.fees[0]" class="btn-secondary !px-3 !py-2" (click)="openForm(row.fees[0])">Edit</button>
                    <button *ngIf="auth.isAdmin() && row.fees[0]" class="btn-danger !px-3 !py-2" [disabled]="deleting()" (click)="askDelete(row.fees[0])">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel overflow-hidden">
        <div class="flex flex-col gap-1 border-b border-neutral-100 p-4">
          <h3 class="font-black">Payment Records</h3>
          <p class="text-sm text-neutral-500">Individual fee entries for the selected month and batch.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-neutral-950 text-white"><tr><th class="w-52 whitespace-nowrap px-4 py-3">Student</th><th class="w-40 whitespace-nowrap px-4 py-3">Batch</th><th class="w-28 whitespace-nowrap px-4 py-3">Month</th><th class="w-44 whitespace-nowrap px-4 py-3">Plan</th><th class="w-80 whitespace-nowrap px-4 py-3">Coverage</th><th class="w-36 whitespace-nowrap px-4 py-3">Next Due</th><th class="w-36 whitespace-nowrap px-4 py-3">Paid Date</th><th class="w-32 whitespace-nowrap px-4 py-3 text-right">Amount</th><th class="w-40 whitespace-nowrap px-4 py-3 text-right">Action</th></tr></thead>
            <tbody class="divide-y divide-neutral-100 bg-white">
              <tr *ngIf="visibleFees().length === 0"><td colspan="9" class="p-5 text-center font-semibold text-neutral-500">No payment records found.</td></tr>
              <tr *ngFor="let fee of visibleFees()" class="transition hover:bg-orange-50/40">
                <td class="px-4 py-3 align-middle font-bold text-neutral-950">{{ studentName(fee.student_id) }}</td>
                <td class="px-4 py-3 align-middle text-neutral-700">{{ batchName(studentById(fee.student_id)?.batch_id ?? null) }}</td>
                <td class="whitespace-nowrap px-4 py-3 align-middle">{{ fee.month }}</td>
                <td class="px-4 py-3 align-middle">{{ fee.fee_plan_name }}</td>
                <td class="px-4 py-3 align-middle">
                  <div class="min-w-[280px] rounded-lg bg-orange-50 px-3 py-2 font-bold text-neutral-950">{{ feeCoverageLabel(fee) }}</div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 align-middle font-semibold">{{ displayDate(feeNextDueDate(fee)) }}</td>
                <td class="whitespace-nowrap px-4 py-3 align-middle">{{ displayDate(fee.paid_date) }}</td>
                <td class="px-4 py-3 text-right align-middle font-bold text-academy-red">{{ money(fee.amount) }}</td>
                <td class="px-4 py-3 align-middle"><div class="flex justify-end gap-2"><button class="btn-secondary !px-3 !py-2" (click)="openForm(fee)">Edit</button><button *ngIf="auth.isAdmin()" class="btn-danger !px-3 !py-2" [disabled]="deleting()" (click)="askDelete(fee)">Delete</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
    <div *ngIf="formOpen()" class="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <form class="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} fee</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 space-y-4">
          <label *ngIf="auth.isAdmin()" class="block"><span class="form-label">Branch</span><select class="form-input mt-1" formControlName="branch_id" (change)="onFormBranchChange()"><option value="">Select branch</option><option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option></select></label>
          <label class="block"><span class="form-label">Batch</span><select class="form-input mt-1" formControlName="batch_id" (change)="onBatchChange()"><option value="">Select batch</option><option *ngFor="let batch of formBatches()" [value]="batch.id">{{ batch.name }}</option></select></label>
          <label class="block"><span class="form-label">Student</span><select class="form-input mt-1" [class.border-red-500]="invalid('student_id')" formControlName="student_id"><option value="">Select student</option><option *ngFor="let student of filteredStudents()" [value]="student.id">{{ student.name }}</option></select><small *ngIf="invalid('student_id')" class="text-xs font-semibold text-red-600">Student is required.</small></label>
          <label class="block"><span class="form-label">Fee package</span><select class="form-input mt-1" formControlName="fee_package" (change)="syncFee()"><option *ngFor="let key of feeKeys" [value]="key">{{ feePackages[key].label }}</option></select></label>
          <label class="block"><span class="form-label">Month</span><input class="form-input mt-1" [class.border-red-500]="invalid('month')" type="month" formControlName="month"><small *ngIf="invalid('month')" class="text-xs font-semibold text-red-600">Month is required.</small></label>
          <label class="block"><span class="form-label">Amount</span><input class="form-input mt-1" [class.border-red-500]="invalid('amount')" type="number" formControlName="amount"><small *ngIf="invalid('amount')" class="text-xs font-semibold text-red-600">Amount is required.</small></label>
          <label class="block"><span class="form-label">Paid date</span><input class="form-input mt-1" [class.border-red-500]="invalid('paid_date')" type="date" formControlName="paid_date"><small *ngIf="invalid('paid_date')" class="text-xs font-semibold text-red-600">Paid date is required.</small></label>
          <div class="rounded-lg bg-orange-50 p-3 text-sm text-neutral-700">
            <p class="font-black text-neutral-950">Coverage preview</p>
            <p>{{ formCoveragePreview() }}</p>
          </div>
        </div>
        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save fee' }}</button></div>
      </form>
    </div>
    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteLabel()" (cancel)="deleteTarget.set(null)" (confirm)="removeFee()"></app-delete-confirm>
  `
})
export class FeesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly fees = signal<Fee[]>([]);
  readonly students = signal<Student[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly loading = signal(false);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly reportBusy = signal(false);
  readonly formError = signal('');
  readonly deleteTarget = signal<Fee | null>(null);
  readonly activeTab = signal<'paid' | 'pending'>('paid');
  readonly selectedBranch = signal('');
  readonly selectedBatch = signal('');
  readonly reportBranch = signal('');
  readonly reportBatch = signal('');
  readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  readonly search = signal('');
  readonly feePackages = feePackages;
  readonly feeKeys = Object.keys(feePackages) as FeePackage[];
  readonly form = this.fb.group({ id: [''], branch_id: [''], batch_id: ['', Validators.required], student_id: ['', Validators.required], fee_package: ['Monthly1800' as FeePackage], amount: [1800, Validators.required], fee_plan_name: ['Monthly'], fee_plan_amount: [1800], package_months: [1], coverage_start_date: [''], coverage_end_date: [''], next_due_date: [''], month: [new Date().toISOString().slice(0, 7), Validators.required], paid_date: [new Date().toISOString().slice(0, 10), Validators.required] });

  readonly filteredBatches = computed(() => this.batches().filter((batch) => !this.selectedBranch() || batch.branch_id === this.selectedBranch()));
  readonly reportBatches = computed(() => this.batches().filter((batch) => !this.reportBranch() || batch.branch_id === this.reportBranch()));

  readonly visibleStudents = computed(() => {
    const batchId = this.selectedBatch();
    const search = this.search().trim().toLowerCase();
    return this.students().filter((student) => {
      const matchesBatch = !batchId || student.batch_id === batchId;
      const matchesBranch = !this.selectedBranch() || student.batch?.branch_id === this.selectedBranch();
      const matchesSearch = !search || student.name.toLowerCase().includes(search);
      return matchesBranch && matchesBatch && matchesSearch;
    });
  });

  readonly visibleFees = computed(() => {
    const studentIds = new Set(this.visibleStudents().map((student) => student.id));
    return this.fees().filter((fee) => studentIds.has(fee.student_id) && fee.paid_date?.slice(0, 7) === this.selectedMonth());
  });

  readonly feeRows = computed<FeeStatusRow[]>(() => this.visibleStudents().map((student) => {
    const fees = this.coveringFees(student.id, this.selectedMonth());
    const paidAmount = fees.reduce((total, fee) => total + (fee.amount || 0), 0);
    const expectedAmount = fees.length ? Math.max(...fees.map((fee) => fee.fee_plan_amount || 0), student.fee_plan_amount || 0) : student.fee_plan_amount || 0;
    const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
    const latestFee = this.latestFee(fees);
    const coverage = latestFee ? this.normalizedCoverage(latestFee) : null;
    return {
      student,
      batchName: this.batchName(student.batch_id),
      expectedAmount,
      paidAmount,
      pendingAmount,
      paymentDate: fees.map((fee) => fee.paid_date).sort().reverse()[0] ?? '',
      status: pendingAmount === 0 && paidAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending',
      coverageLabel: coverage ? `Paid for ${this.displayMonth(coverage.start)} to ${this.displayMonth(coverage.end)}` : '',
      coverageStart: coverage?.start ?? '',
      coverageEnd: coverage?.end ?? '',
      nextDueDate: latestFee?.next_due_date || coverage?.nextDueDate || '',
      fees
    };
  }));

  readonly paidRows = computed(() => this.feeRows().filter((row) => row.status === 'Paid'));
  readonly pendingRows = computed(() => this.feeRows().filter((row) => row.pendingAmount > 0));
  readonly visibleRows = computed(() => this.activeTab() === 'paid' ? this.paidRows() : this.pendingRows());
  readonly totalPaid = computed(() => this.visibleFees().reduce((total, fee) => total + (fee.amount || 0), 0));

  async ngOnInit(): Promise<void> {
    await this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [students, branches, batches, fees] = await Promise.all([this.data.listStudents('', 'active'), this.data.listBranches().catch(() => []), this.data.listMyBatches(), this.data.listFees()]);
      this.students.set(students);
      this.branches.set(branches);
      this.batches.set(batches);
      this.fees.set(fees);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load fee details.');
    } finally {
      this.loading.set(false);
    }
  }
  openForm(fee?: Fee): void {
    const student = this.students().find((item) => item.id === fee?.student_id);
    const batchId = student?.batch_id ?? this.batches()[0]?.id ?? '';
    const branchId = student?.batch?.branch_id ?? this.batches().find((batch) => batch.id === batchId)?.branch_id ?? '';
    this.form.reset({
      id: fee?.id ?? '',
      branch_id: branchId,
      batch_id: batchId,
      student_id: fee?.student_id ?? this.students().find((item) => item.batch_id === batchId)?.id ?? '',
      fee_package: fee?.fee_package ?? 'Monthly1800',
      amount: fee?.amount ?? 1800,
      fee_plan_name: fee?.fee_plan_name ?? 'Monthly',
      fee_plan_amount: fee?.fee_plan_amount ?? 1800,
      package_months: fee ? this.inferPackageMonths(fee) : this.feePackageMonths('Monthly1800'),
      coverage_start_date: fee?.coverage_start_date ?? '',
      coverage_end_date: fee?.coverage_end_date ?? '',
      next_due_date: fee?.next_due_date ?? '',
      month: fee?.month ?? new Date().toISOString().slice(0, 7),
      paid_date: fee?.paid_date ?? new Date().toISOString().slice(0, 10)
    });
    this.formError.set('');
    this.formOpen.set(true);
  }
  openFormForStudent(student: Student): void {
    this.form.reset({
      id: '',
      branch_id: student.batch?.branch_id ?? this.batches().find((batch) => batch.id === student.batch_id)?.branch_id ?? '',
      batch_id: student.batch_id ?? '',
      student_id: student.id,
      fee_package: student.fee_package ?? 'Monthly1800',
      amount: student.fee_plan_amount ?? 0,
      fee_plan_name: student.fee_plan_name ?? feePackages[student.fee_package ?? 'Monthly1800'].label,
      fee_plan_amount: student.fee_plan_amount ?? 0,
      package_months: this.feePackageMonths(student.fee_package ?? 'Monthly1800'),
      coverage_start_date: '',
      coverage_end_date: '',
      next_due_date: '',
      month: this.selectedMonth(),
      paid_date: new Date().toISOString().slice(0, 10)
    });
    this.formError.set('');
    this.formOpen.set(true);
  }
  formBatches(): Batch[] { return this.batches().filter((batch) => !this.form.value.branch_id || batch.branch_id === this.form.value.branch_id); }
  filteredStudents(): Student[] { return this.students().filter((student) => student.batch_id === this.form.value.batch_id); }
  onFormBranchChange(): void { this.form.patchValue({ batch_id: '', student_id: '' }); }
  onBatchChange(): void { this.form.patchValue({ student_id: this.filteredStudents()[0]?.id ?? '' }); }
  syncFee(): void { const selected = feePackages[this.form.value.fee_package as FeePackage]; const months = this.feePackageMonths(this.form.value.fee_package as FeePackage); this.form.patchValue({ amount: selected.amount, fee_plan_name: selected.label, fee_plan_amount: selected.amount, package_months: months }); }
  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    try {
      const { batch_id: _batchId, branch_id: _branchId, ...fee } = value;
      const coverage = this.calculateCoverage(value.month || new Date().toISOString().slice(0, 7), this.feePackageMonths(value.fee_package as FeePackage));
      await this.data.saveFee({
        ...fee,
        id: value.id || undefined,
        package_months: coverage.packageMonths,
        coverage_start_date: coverage.startDate,
        coverage_end_date: coverage.endDate,
        next_due_date: coverage.nextDueDate
      } as Partial<Fee>);
      this.formOpen.set(false);
      this.fees.set(await this.data.listFees());
      this.toast.success('Fee saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save fee.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }
  askDelete(fee: Fee): void { this.deleteTarget.set(fee); }
  deleteLabel(): string {
    const fee = this.deleteTarget();
    return fee ? `fee record for ${this.studentName(fee.student_id)} (${fee.month})` : 'fee record';
  }
  async removeFee(): Promise<void> {
    const fee = this.deleteTarget();
    if (!fee || !this.auth.isAdmin()) return;
    this.deleting.set(true);
    try {
      await this.data.delete('fees', fee.id);
      this.deleteTarget.set(null);
      this.fees.set(await this.data.listFees());
      this.toast.success('Fee record deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to delete fee record.');
    } finally {
      this.deleting.set(false);
    }
  }
  clearFilters(): void {
    this.selectedBatch.set('');
    this.selectedBranch.set('');
    this.reportBatch.set('');
    this.reportBranch.set('');
    this.search.set('');
    this.selectedMonth.set(new Date().toISOString().slice(0, 7));
  }
  studentName(id: string): string { return this.students().find((student) => student.id === id)?.name ?? 'Student'; }
  studentById(id: string): Student | undefined { return this.students().find((student) => student.id === id); }
  batchName(id: string | null): string { return this.batches().find((batch) => batch.id === id)?.name ?? 'Unassigned'; }
  branchName(id: string | null): string { return this.branches().find((branch) => branch.id === id)?.name ?? 'Branch'; }
  feeCoverageLabel(fee: Fee): string {
    const coverage = this.normalizedCoverage(fee);
    return `${this.displayDate(coverage.start)} to ${this.displayDate(coverage.end)}`;
  }
  feeNextDueDate(fee: Fee): string {
    return this.normalizedCoverage(fee).nextDueDate;
  }
  coveragePeriod(row: FeeStatusRow): string {
    if (row.coverageStart && row.coverageEnd) {
      return `${this.displayDate(row.coverageStart)} to ${this.displayDate(row.coverageEnd)}`;
    }
    return row.coverageLabel;
  }
  displayDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
  formCoveragePreview(): string {
    const month = this.form.value.month || new Date().toISOString().slice(0, 7);
    const coverage = this.calculateCoverage(month, this.feePackageMonths(this.form.value.fee_package as FeePackage));
    return `This payment covers ${this.displayDate(coverage.startDate)} to ${this.displayDate(coverage.endDate)}. Next due date: ${this.displayDate(coverage.nextDueDate)}.`;
  }
  statusClass(status: FeeStatusRow['status']): string {
    if (status === 'Paid') return 'bg-green-100 text-green-800';
    if (status === 'Partial') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
  feeReminderLink(row: FeeStatusRow): string {
    const phone = this.normalizePhone(row.student.phone_number || '');
    if (!phone) return '#';
    const message = encodeURIComponent(
      `Hello, this is Unity Cricket Academy. This is a gentle reminder that ${row.student.name}'s fee for ${this.selectedMonth()} is pending. Pending amount: ${this.money(row.pendingAmount)}. Please complete the payment at your convenience. Thank you.`
    );
    return `https://wa.me/${phone}?text=${message}`;
  }
  money(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0); }
  invalid(name: string): boolean { const control = this.form.get(name); return !!control && control.invalid && (control.touched || control.dirty); }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  async downloadSelectedFeeReport(): Promise<void> {
    await this.downloadFeeReport(this.reportBatch(), this.reportBranch());
  }

  private async downloadFeeReport(batchId: string, branchId: string): Promise<void> {
    const rows = this.reportRows(batchId, branchId);
    if (rows.length === 0) {
      this.toast.info('No fee data found for the selected report.');
      return;
    }
    this.reportBusy.set(true);
    try {
      const month = this.selectedMonth();
      const branchLabel = branchId ? this.branchName(branchId) : this.auth.isAdmin() ? 'All Branches' : 'Assigned Branches';
      const batchLabel = batchId ? this.batchName(batchId) : branchLabel;
      const logo = await this.loadLogo();
      const pages = this.renderFeeReportCanvases(month, batchLabel, rows, logo);
      const pdf = this.createPdfFromCanvases(pages);
      this.savePdf(pdf, `fee-report-${this.slug(batchLabel)}-${month}.pdf`);
      this.toast.success('Fee report downloaded successfully.');
    } catch {
      this.toast.error('Unable to generate fee report.');
    } finally {
      this.reportBusy.set(false);
    }
  }

  private reportRows(batchId: string, branchId: string): FeeStatusRow[] {
    const search = this.search().trim().toLowerCase();
    return this.students().filter((student) => {
      const matchesBatch = !batchId || student.batch_id === batchId;
      const matchesBranch = !branchId || student.batch?.branch_id === branchId;
      const matchesSearch = !search || student.name.toLowerCase().includes(search);
      return matchesBranch && matchesBatch && matchesSearch;
    }).map((student): FeeStatusRow => {
      const fees = this.coveringFees(student.id, this.selectedMonth());
      const paidAmount = fees.reduce((total, fee) => total + (fee.amount || 0), 0);
      const expectedAmount = fees.length ? Math.max(...fees.map((fee) => fee.fee_plan_amount || 0), student.fee_plan_amount || 0) : student.fee_plan_amount || 0;
      const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
      const status: FeeStatusRow['status'] = pendingAmount === 0 && paidAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending';
      const latestFee = this.latestFee(fees);
      const coverage = latestFee ? this.normalizedCoverage(latestFee) : null;
      return {
        student,
        batchName: this.batchName(student.batch_id),
        expectedAmount,
        paidAmount,
        pendingAmount,
        paymentDate: fees.map((fee) => fee.paid_date).sort().reverse()[0] ?? '',
        status,
        coverageLabel: coverage ? `Paid for ${this.displayMonth(coverage.start)} to ${this.displayMonth(coverage.end)}` : '',
        coverageStart: coverage?.start ?? '',
        coverageEnd: coverage?.end ?? '',
        nextDueDate: latestFee?.next_due_date || coverage?.nextDueDate || '',
        fees
      };
    });
  }

  private coveringFees(studentId: string, month: string): Fee[] {
    return this.fees()
      .filter((fee) => fee.student_id === studentId)
      .filter((fee) => {
        const coverage = this.normalizedCoverage(fee);
        return month >= coverage.start.slice(0, 7) && month <= coverage.end.slice(0, 7);
      });
  }

  private latestFee(fees: Fee[]): Fee | null {
    return [...fees].sort((left, right) => (right.paid_date || '').localeCompare(left.paid_date || ''))[0] ?? null;
  }

  private normalizedCoverage(fee: Fee): { start: string; end: string; nextDueDate: string } {
    const packageMonths = this.inferPackageMonths(fee);
    const fallback = this.calculateCoverage(fee.month, packageMonths);
    const storedStart = fee.coverage_start_date || fallback.startDate;
    const storedEnd = fee.coverage_end_date || fallback.endDate;
    const storedMonths = this.coverageMonthCount(storedStart, storedEnd);
    if (storedMonths < packageMonths) {
      return {
        start: fallback.startDate,
        end: fallback.endDate,
        nextDueDate: fallback.nextDueDate
      };
    }
    return {
      start: storedStart,
      end: storedEnd,
      nextDueDate: fee.next_due_date || this.nextDateAfter(storedEnd)
    };
  }

  calculateCoverage(month: string, packageMonths: number): { packageMonths: number; startDate: string; endDate: string; nextDueDate: string } {
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const nextDue = new Date(year, monthNumber - 1 + packageMonths, 1);
    const end = new Date(nextDue);
    end.setDate(end.getDate() - 1);
    return {
      packageMonths,
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
      nextDueDate: this.formatDate(nextDue)
    };
  }

  feePackageMonths(packageName: FeePackage): number {
    const months: Record<FeePackage, number> = {
      Monthly1800: 1,
      MonthlySummerCamp2500: 1,
      ThreeMonths4800: 3,
      SixMonths9000: 6,
      OneYear15000: 12,
      Personal5000: 1
    };
    return months[packageName] ?? 1;
  }

  private inferPackageMonths(fee: Fee): number {
    if (fee.package_months && fee.package_months > 1) return fee.package_months;
    const text = `${fee.fee_package || ''} ${fee.fee_plan_name || ''}`.toLowerCase();
    if (text.includes('year') || text.includes('12')) return 12;
    if (text.includes('six') || text.includes('6')) return 6;
    if (text.includes('three') || text.includes('3')) return 3;
    if (fee.fee_plan_amount >= 14000 || fee.amount >= 14000) return 12;
    if (fee.fee_plan_amount >= 8500 || fee.amount >= 8500) return 6;
    if (fee.fee_plan_amount >= 4500 || fee.amount >= 4500) return 3;
    return this.feePackageMonths(fee.fee_package);
  }

  private coverageMonthCount(start: string, end: string): number {
    const [startYear, startMonth] = start.slice(0, 7).split('-').map(Number);
    const [endYear, endMonth] = end.slice(0, 7).split('-').map(Number);
    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  }

  private nextDateAfter(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    return this.formatDate(date);
  }

  private displayMonth(value: string): string {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 7)}-01T00:00:00`));
  }

  private formatDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private async loadLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'assets/logo.png';
    });
  }

  private renderFeeReportCanvases(month: string, batchLabel: string, rows: FeeStatusRow[], logo: HTMLImageElement | null): HTMLCanvasElement[] {
    const pages: HTMLCanvasElement[] = [];
    let canvas = this.createA4Canvas();
    let ctx = canvas.getContext('2d')!;
    let pageNumber = 1;
    let y = this.startFeeReportPage(ctx, logo, month, batchLabel, rows);
    const groupedRows = this.groupRowsByBatch(rows);

    const addPage = (): void => {
      this.footer(ctx, `Page ${pageNumber}`);
      pages.push(canvas);
      pageNumber += 1;
      canvas = this.createA4Canvas();
      ctx = canvas.getContext('2d')!;
      y = this.startFeeReportPage(ctx, logo, month, batchLabel, rows);
    };

    groupedRows.forEach(([batchName, batchRows]) => {
      const paid = batchRows.filter((row) => row.status === 'Paid');
      const pending = batchRows.filter((row) => row.status !== 'Paid');
      if (y + 180 > 985) addPage();
      y = this.batchReportHeader(ctx, batchName, batchRows, y);
      this.chunk(paid, 10).forEach((chunk, index) => {
        if (y + 80 + chunk.length * 48 > 985) addPage();
        y = this.feeReportSection(ctx, index === 0 ? 'Paid Students' : 'Paid Students (continued)', chunk, y, '#15803d');
      });
      if (paid.length === 0) y = this.feeReportSection(ctx, 'Paid Students', paid, y, '#15803d');
      this.chunk(pending, 10).forEach((chunk, index) => {
        if (y + 80 + chunk.length * 48 > 985) addPage();
        y = this.feeReportSection(ctx, index === 0 ? 'Unpaid / Pending Students' : 'Unpaid / Pending Students (continued)', chunk, y, '#dc2626');
      });
      if (pending.length === 0) y = this.feeReportSection(ctx, 'Unpaid / Pending Students', pending, y, '#dc2626');
      y += 18;
    });

    this.footer(ctx, `Page ${pageNumber}`);
    pages.push(canvas);
    return pages;
  }

  private startFeeReportPage(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, month: string, batchLabel: string, rows: FeeStatusRow[]): number {
    this.paintPage(ctx);
    this.paintHeader(ctx, logo, 'MONTHLY FEE REPORT', `${month} | ${batchLabel}`);
    const totalExpected = rows.reduce((sum, row) => sum + row.expectedAmount, 0);
    const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    const totalPending = rows.reduce((sum, row) => sum + row.pendingAmount, 0);
    this.metric(ctx, 'Students', String(rows.length), 56, 165, '#111827');
    this.metric(ctx, 'Collected', this.inrText(totalPaid), 246, 165, '#15803d');
    this.metric(ctx, 'Pending', this.inrText(totalPending), 436, 165, '#dc2626');
    this.text(ctx, `Expected collection: ${this.inrText(totalExpected)} | Paid: ${rows.filter((row) => row.status === 'Paid').length} | Pending/Partial: ${rows.filter((row) => row.status !== 'Paid').length}`, 56, 270, 12, '#6b7280', 'bold');
    return 302;
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
    this.text(ctx, subtitle, 520, 70, 12, '#ffffff', 'bold');
  }

  private metric(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, color: string): void {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(x, y, 170, 76);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(x, y, 170, 76);
    this.text(ctx, label, x + 14, y + 24, 11, '#6b7280', 'bold');
    this.text(ctx, value, x + 14, y + 55, 20, color, 'bold');
  }

  private groupRowsByBatch(rows: FeeStatusRow[]): Array<[string, FeeStatusRow[]]> {
    const groups = new Map<string, FeeStatusRow[]>();
    rows.forEach((row) => groups.set(row.batchName, [...(groups.get(row.batchName) || []), row]));
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }

  private batchReportHeader(ctx: CanvasRenderingContext2D, batchName: string, rows: FeeStatusRow[], y: number): number {
    const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    const totalPending = rows.reduce((sum, row) => sum + row.pendingAmount, 0);
    ctx.fillStyle = '#111111';
    ctx.fillRect(38, y, 718, 42);
    this.text(ctx, batchName, 54, y + 27, 15, '#ffffff', 'bold');
    this.text(ctx, `${rows.length} students | Collected ${this.inrText(totalPaid)} | Pending ${this.inrText(totalPending)}`, 370, y + 27, 10, '#fed7aa', 'bold');
    return y + 58;
  }

  private feeReportSection(ctx: CanvasRenderingContext2D, title: string, rows: FeeStatusRow[], y: number, color: string): number {
    this.text(ctx, title, 42, y, 13, color, 'bold');
    y += 12;
    if (rows.length === 0) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(38, y, 718, 32);
      this.text(ctx, 'No students in this section.', 54, y + 21, 10, '#6b7280', 'bold');
      return y + 46;
    }
    return this.feeReportTable(ctx, 38, y, rows);
  }

  private feeReportTable(ctx: CanvasRenderingContext2D, x: number, y: number, rows: FeeStatusRow[]): number {
    const headers = ['#', 'Student', 'Package', 'Paid', 'Pending', 'Pay Date', 'Coverage', 'Next'];
    const widths = [28, 145, 82, 78, 82, 82, 145, 76];
    let currentX = x;
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, widths.reduce((sum, width) => sum + width, 0), 38);
    headers.forEach((header, index) => {
      this.text(ctx, header, currentX + 6, y + 25, 10, '#ffffff', 'bold');
      currentX += widths[index];
    });
    rows.forEach((row, index) => {
      currentX = x;
      const rowY = y + 38 + index * 48;
      ctx.fillStyle = index % 2 === 0 ? '#fff7ed' : '#ffffff';
      ctx.fillRect(x, rowY, widths.reduce((sum, width) => sum + width, 0), 48);
      const values = [
        String(index + 1),
        row.student.name,
        this.truncate(row.fees[0]?.fee_plan_name || row.student.fee_plan_name || 'Fee', 14),
        this.inrText(row.paidAmount),
        this.inrText(row.pendingAmount),
        row.paymentDate || '-',
        row.coverageLabel || '-',
        row.nextDueDate || '-'
      ];
      values.forEach((value, col) => {
        const color = col === 3 ? '#15803d' : col === 4 && row.pendingAmount > 0 ? '#dc2626' : '#111827';
        this.text(ctx, this.truncate(value, col === 1 ? 26 : 13), currentX + 6, rowY + 29, 9, color, col >= 3 ? 'bold' : 'normal');
        currentX += widths[col];
      });
    });
    return y + 38 + rows.length * 48 + 18;
  }

  private footer(ctx: CanvasRenderingContext2D, pageText: string): void {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(46, 1038, 702, 1);
    this.text(ctx, 'Unity Cricket Academy monthly fee report', 56, 1068, 11, '#6b7280');
    this.text(ctx, `${pageText} | Generated on ${new Date().toLocaleDateString('en-IN')}`, 520, 1068, 11, '#6b7280');
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

  private inrText(value: number): string {
    return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)}`;
  }

  private truncate(value: string, length: number): string {
    return value.length > length ? `${value.slice(0, length - 3)}...` : value;
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'fees';
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
