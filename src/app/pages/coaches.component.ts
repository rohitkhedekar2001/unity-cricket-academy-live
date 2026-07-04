import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { coachDesignations, Coach } from '../models/app.models';
import { DataService } from '../services/data.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 class="text-2xl font-black">Coaches</h2><p class="text-sm text-neutral-500">Manage staff, designations, login access, and salaries.</p></div>
        <button class="btn-primary" (click)="openForm()">Add coach</button>
      </div>
      <div class="panel p-4">
        <div class="grid gap-3 md:grid-cols-[1fr_180px]">
          <input class="form-input" placeholder="Search coaches" [value]="search()" (input)="search.set($any($event.target).value)">
          <select class="form-input" [value]="activeFilter()" (change)="activeFilter.set($any($event.target).value); load()">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article *ngFor="let coach of filteredCoaches()" class="panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg" [class.opacity-70]="!coach.is_active">
          <div class="flex items-start justify-between gap-3">
            <div>
              <a [routerLink]="['/coaches', coach.id]" class="text-lg font-black hover:text-academy-red">{{ coach.profile?.name || 'Coach' }}</a>
              <p class="text-sm text-neutral-500">{{ coach.profile?.email }}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="badge bg-orange-100 text-orange-800">{{ coach.designation }}</span>
              <span class="badge" [ngClass]="coach.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'">{{ coach.is_active ? 'Active' : 'Inactive' }}</span>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p><span class="form-label block">Salary</span>{{ money(coach.salary_per_month) }}</p>
            <p><span class="form-label block">Admin access</span>{{ coach.has_admin_access ? 'Yes' : 'No' }}</p>
            <p><span class="form-label block">Phone</span>{{ coach.phone_number || '-' }}</p>
            <p><span class="form-label block">DOB</span>{{ coach.date_of_birth || '-' }}</p>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-3">
            <button class="btn-secondary flex-1" (click)="openForm(coach)">Edit</button>
            <button class="btn-secondary flex-1" [disabled]="togglingId() === coach.id" (click)="toggleActive(coach)">{{ togglingId() === coach.id ? 'Saving...' : (coach.is_active ? 'Deactivate' : 'Activate') }}</button>
            <button class="btn-danger flex-1" (click)="deleteTarget.set(coach)">Delete</button>
          </div>
        </article>
        <p *ngIf="filteredCoaches().length === 0" class="panel p-5 text-center text-sm font-semibold text-neutral-500 md:col-span-2 xl:col-span-3">No coaches found.</p>
      </div>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 overflow-auto bg-black/55 p-4">
      <form class="modal-panel mx-auto my-6 max-w-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ editingId() ? 'Edit coach' : 'Add coach account' }}</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label><span class="form-label">Name</span><input class="form-input mt-1" [class.border-red-500]="invalid('name')" formControlName="name"><small *ngIf="invalid('name')" class="text-xs font-semibold text-red-600">Coach name is required.</small></label>
          <label><span class="form-label">Email</span><input class="form-input mt-1" [class.border-red-500]="invalid('email')" type="email" formControlName="email"><small *ngIf="invalid('email')" class="text-xs font-semibold text-red-600">Enter a valid unique email.</small></label>
          <label *ngIf="!editingId()"><span class="form-label">Password</span><input class="form-input mt-1" [class.border-red-500]="invalid('password')" type="password" formControlName="password"><small *ngIf="invalid('password')" class="text-xs font-semibold text-red-600">Minimum 8 characters required.</small></label>
          <label><span class="form-label">Phone</span><input class="form-input mt-1" [class.border-red-500]="invalid('phone_number')" formControlName="phone_number"><small *ngIf="invalid('phone_number')" class="text-xs font-semibold text-red-600">Please enter valid mobile number.</small></label>
          <label><span class="form-label">Date of birth</span><input class="form-input mt-1" [class.border-red-500]="invalid('date_of_birth')" type="date" formControlName="date_of_birth"><small *ngIf="invalid('date_of_birth')" class="text-xs font-semibold text-red-600">Future DOB is not allowed.</small></label>
          <label><span class="form-label">Salary/month</span><input class="form-input mt-1" [class.border-red-500]="invalid('salary_per_month')" type="number" formControlName="salary_per_month"><small *ngIf="invalid('salary_per_month')" class="text-xs font-semibold text-red-600">Salary is required.</small></label>
          <label><span class="form-label">Designation</span><input class="form-input mt-1" [class.border-red-500]="invalid('designation')" list="coach-designations" formControlName="designation" placeholder="Head Coach, Marker, Assistant Level 4"><datalist id="coach-designations"><option *ngFor="let item of designationOptions()" [value]="item"></option></datalist><small *ngIf="invalid('designation')" class="text-xs font-semibold text-red-600">Designation is required.</small></label>
          <label class="flex items-center gap-3 pt-6"><input type="checkbox" formControlName="has_admin_access" class="h-5 w-5"> <span class="text-sm font-semibold">Allow admin access</span></label>
        </div>
        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mobile-actions mt-5"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save coach' }}</button></div>
      </form>
    </div>
    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteTarget()?.profile?.name || 'coach'" (cancel)="deleteTarget.set(null)" (confirm)="remove()"></app-delete-confirm>
  `
})
export class CoachesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly coaches = signal<Coach[]>([]);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly togglingId = signal<string | null>(null);
  readonly formError = signal('');
  readonly editingId = signal<string | null>(null);
  readonly deleteTarget = signal<Coach | null>(null);
  readonly search = signal('');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('active');
  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['Coach@123', [Validators.required, Validators.minLength(8)]],
    phone_number: ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
    date_of_birth: ['', [this.notFutureDate]],
    salary_per_month: [25000, Validators.required],
    designation: ['AssistantCoachLevel1', Validators.required],
    has_admin_access: [false]
  });

  ngOnInit(): Promise<void> { return this.load(); }
  load(): Promise<void> { return this.data.listCoaches(this.activeFilter()).then((rows) => this.coaches.set(rows)); }

  openForm(coach?: Coach): void {
    this.editingId.set(coach?.id ?? null);
    this.formError.set('');
    this.form.reset({
      name: coach?.profile?.name ?? '',
      email: coach?.profile?.email ?? '',
      password: 'Coach@123',
      phone_number: coach?.phone_number ?? '',
      date_of_birth: coach?.date_of_birth ?? '',
      salary_per_month: coach?.salary_per_month ?? 25000,
      designation: coach?.designation ?? 'AssistantCoachLevel1',
      has_admin_access: coach?.has_admin_access ?? false
    });
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.hasDuplicate()) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set('');
    try {
      if (this.editingId()) {
        await this.data.updateCoachAccount({
          p_coach_id: this.editingId()!,
          p_name: value.name!,
          p_email: value.email!,
          p_salary_per_month: value.salary_per_month!,
          p_has_admin_access: !!value.has_admin_access,
          p_phone_number: value.phone_number || null,
          p_date_of_birth: value.date_of_birth || null,
          p_designation: value.designation!.trim()
        });
      } else {
        await this.data.createCoachAccount({
          name: value.name!,
          email: value.email!,
          password: value.password || 'Coach@123',
          salary_per_month: value.salary_per_month!,
          has_admin_access: !!value.has_admin_access,
          phone_number: value.phone_number || null,
          date_of_birth: value.date_of_birth || null,
          designation: value.designation!.trim()
        });
      }
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Coach saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save coach.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    await this.data.deleteCoachAccount(target.id);
    this.deleteTarget.set(null);
    await this.load();
  }

  async toggleActive(coach: Coach): Promise<void> {
    this.togglingId.set(coach.id);
    try {
      await this.data.updateCoachActiveStatus(coach.id, !coach.is_active);
      await this.load();
      this.toast.success(coach.is_active ? 'Coach deactivated.' : 'Coach activated.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update coach status.');
    } finally {
      this.togglingId.set(null);
    }
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  designationOptions(): string[] {
    return Array.from(new Set([...coachDesignations, ...this.coaches().map((coach) => coach.designation).filter(Boolean)]));
  }

  filteredCoaches(): Coach[] {
    const search = this.search().trim().toLowerCase();
    return this.coaches().filter((coach) => {
      if (!search) return true;
      return `${coach.profile?.name ?? ''} ${coach.profile?.email ?? ''} ${coach.designation ?? ''}`.toLowerCase().includes(search);
    });
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  hasDuplicate(): boolean {
    const value = this.form.getRawValue();
    const currentId = this.editingId();
    const email = value.email?.trim().toLowerCase();
    const phone = value.phone_number?.trim();
    if (email && this.coaches().some((coach) => coach.id !== currentId && coach.profile?.email?.toLowerCase() === email)) {
      this.formError.set('Coach email already exists.');
      return true;
    }
    if (phone && this.coaches().some((coach) => coach.id !== currentId && coach.phone_number === phone)) {
      this.formError.set('Phone number already exists.');
      return true;
    }
    return false;
  }

  notFutureDate(control: { value: string | null }) {
    return control.value && control.value > new Date().toISOString().slice(0, 10) ? { futureDate: true } : null;
  }
}
