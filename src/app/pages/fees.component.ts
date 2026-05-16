import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Batch, feePackages, FeePackage, Fee, Student } from '../models/app.models';
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
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input class="form-input" placeholder="Search student" [value]="search()" (input)="search.set($any($event.target).value)">
          <input class="form-input" type="month" [value]="selectedMonth()" (change)="selectedMonth.set($any($event.target).value)">
          <select *ngIf="auth.isAdmin()" class="form-input" [value]="selectedBatch()" (change)="selectedBatch.set($any($event.target).value)">
            <option value="">All Batches</option>
            <option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option>
          </select>
          <button type="button" class="btn-secondary" (click)="clearFilters()">Clear</button>
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
        <table *ngIf="!loading()" class="w-full min-w-[940px] text-left text-sm">
          <thead class="bg-neutral-950 text-white">
            <tr><th class="p-3">Student Name</th><th>Batch</th><th class="text-right">Fee Amount</th><th class="text-right">Paid Amount</th><th class="text-right">Pending Amount</th><th>Payment Date</th><th>Payment Status</th><th class="pr-3 text-right">Action</th></tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngIf="visibleRows().length === 0"><td colspan="8" class="p-5 text-center font-semibold text-neutral-500">{{ activeTab() === 'paid' ? 'No paid fee records found.' : 'No pending students found.' }}</td></tr>
            <tr *ngFor="let row of visibleRows()" class="transition hover:bg-orange-50/40">
              <td class="p-3 font-bold">{{ row.student.name }}</td>
              <td>{{ row.batchName }}</td>
              <td class="text-right">{{ money(row.expectedAmount) }}</td>
              <td class="text-right font-bold text-green-700">{{ money(row.paidAmount) }}</td>
              <td class="text-right font-bold" [class.text-academy-red]="row.pendingAmount > 0">{{ money(row.pendingAmount) }}</td>
              <td>{{ row.paymentDate || '-' }}</td>
              <td><span class="badge" [ngClass]="statusClass(row.status)">{{ row.status }}</span></td>
              <td class="space-x-2 pr-3 text-right">
                <button class="btn-secondary !px-3" (click)="openFormForStudent(row.student)">Add</button>
                <button *ngIf="row.fees[0]" class="btn-secondary !px-3" (click)="openForm(row.fees[0])">Edit</button>
                <button *ngIf="auth.isAdmin() && row.fees[0]" class="btn-danger !px-3" [disabled]="deleting()" (click)="askDelete(row.fees[0])">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel overflow-hidden">
        <div class="flex flex-col gap-1 border-b border-neutral-100 p-4">
          <h3 class="font-black">Payment Records</h3>
          <p class="text-sm text-neutral-500">Individual fee entries for the selected month and batch.</p>
        </div>
        <table class="w-full min-w-[820px] text-left text-sm">
          <thead class="bg-neutral-950 text-white"><tr><th class="p-3">Student</th><th>Batch</th><th>Month</th><th>Plan</th><th>Paid date</th><th class="text-right">Amount</th><th class="pr-3 text-right">Action</th></tr></thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngIf="visibleFees().length === 0"><td colspan="7" class="p-4 text-center font-semibold text-neutral-500">No payment records found.</td></tr>
            <tr *ngFor="let fee of visibleFees()" class="transition hover:bg-orange-50/40">
              <td class="p-3 font-bold">{{ studentName(fee.student_id) }}</td>
              <td>{{ batchName(studentById(fee.student_id)?.batch_id ?? null) }}</td>
              <td>{{ fee.month }}</td>
              <td>{{ fee.fee_plan_name }}</td>
              <td>{{ fee.paid_date }}</td>
              <td class="text-right font-bold text-academy-red">{{ money(fee.amount) }}</td>
              <td class="space-x-2 pr-3 text-right"><button class="btn-secondary !px-3" (click)="openForm(fee)">Edit</button><button *ngIf="auth.isAdmin()" class="btn-danger !px-3" [disabled]="deleting()" (click)="askDelete(fee)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
    <div *ngIf="formOpen()" class="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <form class="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} fee</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 space-y-4">
          <label class="block"><span class="form-label">Batch</span><select class="form-input mt-1" formControlName="batch_id" (change)="onBatchChange()"><option value="">Select batch</option><option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option></select></label>
          <label class="block"><span class="form-label">Student</span><select class="form-input mt-1" [class.border-red-500]="invalid('student_id')" formControlName="student_id"><option value="">Select student</option><option *ngFor="let student of filteredStudents()" [value]="student.id">{{ student.name }}</option></select><small *ngIf="invalid('student_id')" class="text-xs font-semibold text-red-600">Student is required.</small></label>
          <label class="block"><span class="form-label">Fee package</span><select class="form-input mt-1" formControlName="fee_package" (change)="syncFee()"><option *ngFor="let key of feeKeys" [value]="key">{{ feePackages[key].label }}</option></select></label>
          <label class="block"><span class="form-label">Month</span><input class="form-input mt-1" [class.border-red-500]="invalid('month')" type="month" formControlName="month"><small *ngIf="invalid('month')" class="text-xs font-semibold text-red-600">Month is required.</small></label>
          <label class="block"><span class="form-label">Amount</span><input class="form-input mt-1" [class.border-red-500]="invalid('amount')" type="number" formControlName="amount"><small *ngIf="invalid('amount')" class="text-xs font-semibold text-red-600">Amount is required.</small></label>
          <label class="block"><span class="form-label">Paid date</span><input class="form-input mt-1" [class.border-red-500]="invalid('paid_date')" type="date" formControlName="paid_date"><small *ngIf="invalid('paid_date')" class="text-xs font-semibold text-red-600">Paid date is required.</small></label>
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
  readonly batches = signal<Batch[]>([]);
  readonly loading = signal(false);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly formError = signal('');
  readonly deleteTarget = signal<Fee | null>(null);
  readonly activeTab = signal<'paid' | 'pending'>('paid');
  readonly selectedBatch = signal('');
  readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  readonly search = signal('');
  readonly feePackages = feePackages;
  readonly feeKeys = Object.keys(feePackages) as FeePackage[];
  readonly form = this.fb.group({ id: [''], batch_id: ['', Validators.required], student_id: ['', Validators.required], fee_package: ['Monthly1800' as FeePackage], amount: [1800, Validators.required], fee_plan_name: ['Monthly'], fee_plan_amount: [1800], month: [new Date().toISOString().slice(0, 7), Validators.required], paid_date: [new Date().toISOString().slice(0, 10), Validators.required] });

  readonly visibleStudents = computed(() => {
    const batchId = this.selectedBatch();
    const search = this.search().trim().toLowerCase();
    return this.students().filter((student) => {
      const matchesBatch = !this.auth.isAdmin() || !batchId || student.batch_id === batchId;
      const matchesSearch = !search || student.name.toLowerCase().includes(search);
      return matchesBatch && matchesSearch;
    });
  });

  readonly visibleFees = computed(() => {
    const studentIds = new Set(this.visibleStudents().map((student) => student.id));
    return this.fees().filter((fee) => studentIds.has(fee.student_id) && fee.month === this.selectedMonth());
  });

  readonly feeRows = computed<FeeStatusRow[]>(() => this.visibleStudents().map((student) => {
    const fees = this.visibleFees().filter((fee) => fee.student_id === student.id);
    const paidAmount = fees.reduce((total, fee) => total + (fee.amount || 0), 0);
    const expectedAmount = student.fee_plan_amount || fees[0]?.fee_plan_amount || 0;
    const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
    return {
      student,
      batchName: this.batchName(student.batch_id),
      expectedAmount,
      paidAmount,
      pendingAmount,
      paymentDate: fees.map((fee) => fee.paid_date).sort().reverse()[0] ?? '',
      status: pendingAmount === 0 && paidAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending',
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
      const [students, batches, fees] = await Promise.all([this.data.listStudents('', 'active'), this.data.listMyBatches(), this.data.listFees()]);
      this.students.set(students);
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
    this.form.reset({
      id: fee?.id ?? '',
      batch_id: batchId,
      student_id: fee?.student_id ?? this.students().find((item) => item.batch_id === batchId)?.id ?? '',
      fee_package: fee?.fee_package ?? 'Monthly1800',
      amount: fee?.amount ?? 1800,
      fee_plan_name: fee?.fee_plan_name ?? 'Monthly',
      fee_plan_amount: fee?.fee_plan_amount ?? 1800,
      month: fee?.month ?? new Date().toISOString().slice(0, 7),
      paid_date: fee?.paid_date ?? new Date().toISOString().slice(0, 10)
    });
    this.formError.set('');
    this.formOpen.set(true);
  }
  openFormForStudent(student: Student): void {
    this.form.reset({
      id: '',
      batch_id: student.batch_id ?? '',
      student_id: student.id,
      fee_package: student.fee_package ?? 'Monthly1800',
      amount: student.fee_plan_amount ?? 0,
      fee_plan_name: student.fee_plan_name ?? feePackages[student.fee_package ?? 'Monthly1800'].label,
      fee_plan_amount: student.fee_plan_amount ?? 0,
      month: this.selectedMonth(),
      paid_date: new Date().toISOString().slice(0, 10)
    });
    this.formError.set('');
    this.formOpen.set(true);
  }
  filteredStudents(): Student[] { return this.students().filter((student) => student.batch_id === this.form.value.batch_id); }
  onBatchChange(): void { this.form.patchValue({ student_id: this.filteredStudents()[0]?.id ?? '' }); }
  syncFee(): void { const selected = feePackages[this.form.value.fee_package as FeePackage]; this.form.patchValue({ amount: selected.amount, fee_plan_name: selected.label, fee_plan_amount: selected.amount }); }
  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    try {
      const { batch_id: _batchId, ...fee } = value;
      await this.data.saveFee({ ...fee, id: value.id || undefined } as Partial<Fee>);
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
    this.search.set('');
    this.selectedMonth.set(new Date().toISOString().slice(0, 7));
  }
  studentName(id: string): string { return this.students().find((student) => student.id === id)?.name ?? 'Student'; }
  studentById(id: string): Student | undefined { return this.students().find((student) => student.id === id); }
  batchName(id: string | null): string { return this.batches().find((batch) => batch.id === id)?.name ?? 'Unassigned'; }
  statusClass(status: FeeStatusRow['status']): string {
    if (status === 'Paid') return 'bg-green-100 text-green-800';
    if (status === 'Partial') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
  money(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0); }
  invalid(name: string): boolean { const control = this.form.get(name); return !!control && control.invalid && (control.touched || control.dirty); }
}
