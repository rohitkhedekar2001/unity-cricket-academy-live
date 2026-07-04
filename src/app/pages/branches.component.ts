import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Branch, Fee, Student } from '../models/app.models';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-2xl font-black">Branches</h2>
          <p class="text-sm text-neutral-500">Manage academy branches and view branch-wise activity.</p>
        </div>
        <button class="btn-primary" (click)="openForm()">Add branch</button>
      </div>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article *ngFor="let branch of branches()" class="panel p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-black text-neutral-950">{{ branch.name }}</h3>
              <p class="mt-1 text-sm text-neutral-500">{{ branch.location || 'No location added' }}</p>
            </div>
            <span class="badge" [ngClass]="branch.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'">{{ branch.is_active ? 'Active' : 'Inactive' }}</span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-neutral-50 p-3"><p class="form-label">Batches</p><p class="text-xl font-black">{{ branch.batches?.length || 0 }}</p></div>
            <div class="rounded-lg bg-neutral-50 p-3"><p class="form-label">Students</p><p class="text-xl font-black">{{ studentCount(branch.id) }}</p></div>
            <div class="rounded-lg bg-green-50 p-3"><p class="form-label">Collected</p><p class="text-xl font-black text-green-700">{{ money(collection(branch.id)) }}</p></div>
            <div class="rounded-lg bg-red-50 p-3"><p class="form-label">Pending</p><p class="text-xl font-black text-academy-red">{{ pendingCount(branch.id) }}</p></div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <button class="btn-secondary" (click)="openForm(branch)">Edit</button>
            <button class="btn-secondary" [disabled]="saving()" (click)="toggleActive(branch)">{{ branch.is_active ? 'Deactivate' : 'Reactivate' }}</button>
          </div>
        </article>
      </section>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <form class="modal-panel max-w-lg" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} branch</h3>
          <button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button>
        </div>
        <div class="mt-4 space-y-4">
          <label class="block"><span class="form-label">Branch name</span><input class="form-input mt-1" [class.border-red-500]="invalid('name')" formControlName="name"><small *ngIf="invalid('name')" class="text-xs font-semibold text-red-600">Branch name is required.</small></label>
          <label class="block"><span class="form-label">Location</span><input class="form-input mt-1" formControlName="location"></label>
          <label class="flex items-center gap-2 text-sm font-bold"><input type="checkbox" formControlName="is_active"> Active branch</label>
        </div>
        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mobile-actions mt-5"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save branch' }}</button></div>
      </form>
    </div>
  `
})
export class BranchesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly branches = signal<Branch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly fees = signal<Fee[]>([]);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly formError = signal('');
  readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  readonly branchStudents = computed(() => new Map(this.branches().map((branch) => [branch.id, this.students().filter((student) => student.batch?.branch_id === branch.id)])));
  readonly form = this.fb.group({ id: [''], name: ['', Validators.required], location: [''], is_active: [true] });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const [branches, students, fees] = await Promise.all([
      this.data.listBranches('all'),
      this.data.listStudents('', 'active'),
      this.data.listFees()
    ]);
    this.branches.set(branches);
    this.students.set(students);
    this.fees.set(fees);
  }

  openForm(branch?: Branch): void {
    this.form.reset({ id: branch?.id ?? '', name: branch?.name ?? '', location: branch?.location ?? '', is_active: branch?.is_active ?? true });
    this.formError.set('');
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.data.saveBranch({ ...value, id: value.id || undefined } as Partial<Branch>);
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Branch saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save branch.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(branch: Branch): Promise<void> {
    this.saving.set(true);
    try {
      await this.data.updateBranchActiveStatus(branch.id, !branch.is_active);
      await this.load();
      this.toast.success(branch.is_active ? 'Branch deactivated.' : 'Branch reactivated.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update branch.');
    } finally {
      this.saving.set(false);
    }
  }

  studentCount(branchId: string): number {
    return this.branchStudents().get(branchId)?.length ?? 0;
  }

  collection(branchId: string): number {
    const studentIds = new Set((this.branchStudents().get(branchId) || []).map((student) => student.id));
    return this.fees()
      .filter((fee) => studentIds.has(fee.student_id) && fee.paid_date?.slice(0, 7) === this.selectedMonth())
      .reduce((total, fee) => total + (fee.amount || 0), 0);
  }

  pendingCount(branchId: string): number {
    return (this.branchStudents().get(branchId) || []).filter((student) => !this.hasCoverage(student.id)).length;
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  private hasCoverage(studentId: string): boolean {
    const month = this.selectedMonth();
    return this.fees().some((fee) => {
      if (fee.student_id !== studentId) return false;
      const start = fee.coverage_start_date?.slice(0, 7) || fee.month;
      const end = fee.coverage_end_date?.slice(0, 7) || fee.month;
      return month >= start && month <= end;
    });
  }
}
