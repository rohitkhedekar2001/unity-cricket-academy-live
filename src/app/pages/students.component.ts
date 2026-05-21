import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Batch, Branch, feePackages, FeePackage, Student } from '../models/app.models';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-2xl font-black">Students</h2>
          <p class="text-sm text-neutral-500">{{ auth.isAdmin() ? 'Search, filter, add, edit, and manage active status.' : 'Add and manage students assigned to your batches.' }}</p>
        </div>
        <button class="btn-primary" [disabled]="!auth.isAdmin() && batches().length === 0" (click)="openForm()">Add student</button>
      </div>

      <div class="panel p-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <input class="form-input" placeholder="Search students" [value]="search()" (input)="search.set($any($event.target).value); load()">
          <select class="form-input" [value]="activeFilter()" (change)="activeFilter.set($any($event.target).value); load()">
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <select *ngIf="auth.isAdmin()" class="form-input" [value]="branchFilter()" (change)="branchFilter.set($any($event.target).value); batchFilter.set(''); load()">
            <option value="">All branches</option>
            <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
          </select>
          <select *ngIf="auth.isAdmin()" class="form-input" [value]="batchFilter()" (change)="batchFilter.set($any($event.target).value); load()">
            <option value="">All batches</option>
            <option *ngFor="let batch of filterBatches()" [value]="batch.id">{{ batch.name }}</option>
          </select>
          <input *ngIf="auth.isAdmin()" class="form-input" placeholder="Age" type="number" min="3" [value]="ageFilter() ?? ''" (input)="setAgeFilter($any($event.target).value)">
          <select *ngIf="auth.isAdmin()" class="form-input" [value]="feeFilter()" (change)="feeFilter.set($any($event.target).value); load()">
            <option value="">All fee plans</option>
            <option *ngFor="let key of feeKeys" [value]="key">{{ feePackages[key].label }}</option>
          </select>
          <button *ngIf="auth.isAdmin()" type="button" class="btn-secondary" (click)="clearFilters()">Clear</button>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-soft">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-neutral-950 text-white">
            <tr><th class="p-3">Name</th><th>Branch</th><th>Batch</th><th>Fee plan</th><th>Phone</th><th>Status</th><th class="text-right pr-3">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngFor="let student of students()" class="transition hover:bg-orange-50/40">
              <td class="p-3 font-bold"><a [routerLink]="['/students', student.id]" class="hover:text-academy-red">{{ student.name }}</a></td>
              <td>{{ student.batch?.branch?.name || '-' }}</td>
              <td>{{ student.batch?.name || 'Unassigned' }}</td>
              <td>{{ student.fee_plan_name }} &middot; {{ money(student.fee_plan_amount) }}</td>
              <td>{{ student.phone_number || '-' }}</td>
              <td><span class="badge" [class.bg-green-100]="student.is_active" [class.text-green-800]="student.is_active" [class.bg-neutral-100]="!student.is_active">{{ student.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="space-x-2 pr-3 text-right">
                <button class="btn-secondary !px-3" (click)="openForm(student)">Edit</button>
                <button class="btn-secondary !px-3" [disabled]="togglingId() === student.id" (click)="toggleActive(student)">{{ togglingId() === student.id ? 'Saving...' : (student.is_active ? 'Deactivate' : 'Activate') }}</button>
                <button *ngIf="auth.isAdmin()" class="btn-danger !px-3" (click)="askDelete(student)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 overflow-auto bg-black/55 p-4">
      <form class="mx-auto my-6 max-w-3xl rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} student</h3>
          <button type="button" class="btn-secondary !px-3" (click)="formOpen.set(false)">Close</button>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label><span class="form-label">Name</span><input class="form-input mt-1" [class.border-red-500]="invalid('name')" formControlName="name"><small *ngIf="invalid('name')" class="text-xs font-semibold text-red-600">Student name is required.</small></label>
          <label><span class="form-label">Phone</span><input class="form-input mt-1" [class.border-red-500]="invalid('phone_number')" formControlName="phone_number"><small *ngIf="invalid('phone_number')" class="text-xs font-semibold text-red-600">Please enter valid mobile number.</small></label>
          <label><span class="form-label">Date of birth</span><input class="form-input mt-1" [class.border-red-500]="invalid('dob')" type="date" formControlName="dob"><small *ngIf="invalid('dob')" class="text-xs font-semibold text-red-600">{{ form.get('dob')?.hasError('required') ? 'Date of birth is required.' : 'Future DOB is not allowed.' }}</small></label>
          <label><span class="form-label">Age</span><input class="form-input mt-1 bg-neutral-100 text-neutral-700" type="number" formControlName="age" readonly></label>
          <label><span class="form-label">Admission date</span><input class="form-input mt-1" type="date" formControlName="admission_date"></label>
          <label><span class="form-label">School</span><input class="form-input mt-1" formControlName="school_name"></label>
          <label><span class="form-label">Age group</span><input class="form-input mt-1" formControlName="age_group"></label>
          <label *ngIf="auth.isAdmin()"><span class="form-label">Branch</span><select class="form-input mt-1" formControlName="branch_id" (change)="onFormBranchChange()"><option value="">Select branch</option><option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option></select></label>
          <label><span class="form-label">Batch</span><select class="form-input mt-1" [class.border-red-500]="invalid('batch_id')" formControlName="batch_id"><option *ngIf="auth.isAdmin()" [ngValue]="null">Unassigned</option><option *ngFor="let batch of formBatches()" [value]="batch.id">{{ batch.name }}</option></select><small *ngIf="invalid('batch_id')" class="text-xs font-semibold text-red-600">Batch is required for coaches.</small></label>
          <label><span class="form-label">Fee package</span><select class="form-input mt-1" formControlName="fee_package" (change)="syncFee()"><option *ngFor="let key of feeKeys" [value]="key">{{ feePackages[key].label }} &middot; {{ money(feePackages[key].amount) }}</option></select></label>
          <label><span class="form-label">Fee amount</span><input class="form-input mt-1" type="number" formControlName="fee_plan_amount"></label>
          <label class="md:col-span-2"><span class="form-label">Address</span><textarea class="form-input mt-1" formControlName="address" rows="3"></textarea></label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button>
          <button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save student' }}</button>
        </div>
        <p *ngIf="formError()" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
      </form>
    </div>

    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteTarget()?.name || 'student'" (cancel)="deleteTarget.set(null)" (confirm)="remove()"></app-delete-confirm>
  `
})
export class StudentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly students = signal<Student[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly togglingId = signal<string | null>(null);
  readonly formError = signal('');
  readonly deleteTarget = signal<Student | null>(null);
  readonly search = signal('');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly branchFilter = signal('');
  readonly batchFilter = signal('');
  readonly ageFilter = signal<number | null>(null);
  readonly feeFilter = signal('');
  readonly feePackages = feePackages;
  readonly feeKeys = Object.keys(feePackages) as FeePackage[];
  readonly form = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    dob: ['', [Validators.required, this.notFutureDate]],
    age: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
    date_of_birth: [''],
    admission_date: [new Date().toISOString().slice(0, 10), Validators.required],
    address: [''],
    phone_number: ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
    fee_package: ['Monthly1800' as FeePackage, Validators.required],
    fee_plan_name: ['Monthly', Validators.required],
    fee_plan_amount: [1800, Validators.required],
    school_name: [''],
    age_group: [''],
    branch_id: [''],
    batch_id: [null as string | null],
    is_active: [true]
  });

  async ngOnInit(): Promise<void> {
    this.form.get('dob')?.valueChanges.subscribe((dob) => this.updateAgeFromDob(dob || ''));
    const [branches, batches] = await Promise.all([this.data.listBranches().catch(() => []), this.data.listMyBatches()]);
    this.branches.set(branches);
    this.batches.set(batches);
    await this.load();
    this.openPrefilledStudentFormFromEnquiry();
  }

  load(): Promise<void> {
    return this.data.listStudents(this.search(), this.activeFilter(), {
      batchId: this.auth.isAdmin() ? this.batchFilter() : undefined,
      branchId: this.auth.isAdmin() ? this.branchFilter() : undefined,
      age: this.auth.isAdmin() ? this.ageFilter() : null,
      feePackage: this.auth.isAdmin() ? this.feeFilter() : undefined
    }).then((rows) => this.students.set(rows));
  }

  filterBatches(): Batch[] {
    return this.batches().filter((batch) => !this.branchFilter() || batch.branch_id === this.branchFilter());
  }

  formBatches(): Batch[] {
    const branchId = this.form.value.branch_id;
    return this.batches().filter((batch) => !branchId || batch.branch_id === branchId);
  }

  onFormBranchChange(): void {
    this.form.patchValue({ batch_id: null });
  }

  openForm(student?: Student, prefill?: Partial<Student>): void {
    this.form.reset({
      id: student?.id ?? prefill?.id ?? '',
      name: student?.name ?? prefill?.name ?? '',
      dob: student?.dob ?? student?.date_of_birth ?? prefill?.dob ?? prefill?.date_of_birth ?? '',
      age: student?.age ?? prefill?.age ?? 0,
      date_of_birth: student?.date_of_birth ?? student?.dob ?? prefill?.date_of_birth ?? prefill?.dob ?? '',
      admission_date: student?.admission_date ?? new Date().toISOString().slice(0, 10),
      address: student?.address ?? prefill?.address ?? '',
      phone_number: student?.phone_number ?? prefill?.phone_number ?? '',
      fee_package: student?.fee_package ?? prefill?.fee_package ?? 'Monthly1800',
      fee_plan_name: student?.fee_plan_name ?? prefill?.fee_plan_name ?? 'Monthly',
      fee_plan_amount: student?.fee_plan_amount ?? prefill?.fee_plan_amount ?? 1800,
      school_name: student?.school_name ?? '',
      age_group: student?.age_group ?? prefill?.age_group ?? '',
      branch_id: student?.batch?.branch_id ?? this.batches().find((batch) => batch.id === (student?.batch_id ?? prefill?.batch_id))?.branch_id ?? this.branchFilter() ?? '',
      batch_id: student?.batch_id ?? prefill?.batch_id ?? (this.auth.isAdmin() ? null : this.formBatches()[0]?.id ?? this.batches()[0]?.id ?? null),
      is_active: student?.is_active ?? true
    });
    this.updateAgeFromDob(this.form.get('dob')?.value || '', student?.age ?? prefill?.age ?? 0);
    this.applyCoachBatchValidator();
    this.formError.set('');
    this.formOpen.set(true);
  }

  syncFee(): void {
    const selected = feePackages[this.form.value.fee_package as FeePackage];
    this.form.patchValue({ fee_plan_name: selected.label, fee_plan_amount: selected.amount });
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    this.applyCoachBatchValidator();
    if (this.form.invalid || this.hasDuplicate()) return;
    const value = this.form.getRawValue();
    value.date_of_birth = value.dob;
    this.saving.set(true);
    try {
      const { branch_id: _branchId, ...student } = value;
      await this.data.saveStudent({ ...student, id: value.id || undefined } as Partial<Student>);
      const enquiryId = this.route.snapshot.queryParamMap.get('enquiryId');
      if (enquiryId && !value.id) await this.data.updateEnquiryStatus(enquiryId, 'Converted');
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Student saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save student.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(student: Student): Promise<void> {
    this.togglingId.set(student.id);
    try {
      await this.data.updateStudentActiveStatus(student.id, !student.is_active);
      await this.load();
      this.toast.success(student.is_active ? 'Student deactivated.' : 'Student reactivated.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update student status.');
    } finally {
      this.togglingId.set(null);
    }
  }

  askDelete(student: Student): void {
    this.deleteTarget.set(student);
  }

  async remove(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    await this.data.delete('students', target.id);
    this.deleteTarget.set(null);
    await this.load();
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  setAgeFilter(value: string): void {
    this.ageFilter.set(value ? Number(value) : null);
    void this.load();
  }

  clearFilters(): void {
    this.search.set('');
    this.activeFilter.set('all');
    this.branchFilter.set('');
    this.batchFilter.set('');
    this.ageFilter.set(null);
    this.feeFilter.set('');
    void this.load();
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  hasDuplicate(): boolean {
    const value = this.form.getRawValue();
    const name = value.name?.trim().toLowerCase();
    const phone = value.phone_number?.trim();
    const id = value.id || '';
    if (name && value.batch_id && this.students().some((student) => student.id !== id && student.batch_id === value.batch_id && student.name.trim().toLowerCase() === name)) {
      this.formError.set('Student already exists in this batch.');
      return true;
    }
    if (phone && this.students().some((student) => student.id !== id && student.phone_number === phone)) {
      this.formError.set('Phone number already exists.');
      return true;
    }
    return false;
  }

  notFutureDate(control: { value: string | null }) {
    return control.value && control.value > new Date().toISOString().slice(0, 10) ? { futureDate: true } : null;
  }

  private updateAgeFromDob(dob: string, fallbackAge = 0): void {
    const age = dob ? this.calculateAge(dob) : fallbackAge;
    this.form.get('age')?.setValue(age, { emitEvent: false });
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    const hasBirthdayPassed = monthDifference > 0 || (monthDifference === 0 && today.getDate() >= birthDate.getDate());
    if (!hasBirthdayPassed) age -= 1;
    return Math.max(age, 0);
  }

  private applyCoachBatchValidator(): void {
    const batchControl = this.form.get('batch_id');
    if (!batchControl) return;
    if (this.auth.isAdmin()) {
      batchControl.clearValidators();
    } else {
      batchControl.setValidators([Validators.required]);
    }
    batchControl.updateValueAndValidity({ emitEvent: false });
  }

  private openPrefilledStudentFormFromEnquiry(): void {
    const params = this.route.snapshot.queryParamMap;
    if (!params.get('fromEnquiry')) return;
    const dob = params.get('dob') || '';
    const age = dob ? this.calculateAge(dob) : Number(params.get('age') || 0);
    this.openForm(undefined, {
      name: params.get('name') || '',
      phone_number: params.get('phone') || '',
      dob,
      date_of_birth: dob,
      age,
      age_group: params.get('ageGroup') || '',
      address: params.get('remarks') ? `Enquiry notes: ${params.get('remarks')}` : ''
    });
    this.toast.info('Student form opened with enquiry details. Please select final batch and fee package.');
  }
}
