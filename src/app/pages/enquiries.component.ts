import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Enquiry,
  EnquiryInterest,
  EnquirySource,
  EnquiryStatus,
  enquiryInterests,
  enquirySources,
  enquiryStatuses
} from '../models/app.models';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-black uppercase text-academy-red">Enquiry & Admission Follow-up</p>
          <h2 class="text-2xl font-black">Enquiries</h2>
          <p class="text-sm text-neutral-500">Store visitor details, follow up by text message, and convert interested players to students.</p>
        </div>
        <button class="btn-primary" (click)="openForm()">Add enquiry</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article class="panel p-4">
          <p class="form-label">Total enquiries</p>
          <p class="mt-2 text-3xl font-black">{{ enquiries().length }}</p>
        </article>
        <article class="panel p-4">
          <p class="form-label">Follow-up required</p>
          <p class="mt-2 text-3xl font-black text-orange-600">{{ countByStatus('Follow-up Required') }}</p>
        </article>
        <article class="panel p-4">
          <p class="form-label">Interested</p>
          <p class="mt-2 text-3xl font-black text-green-700">{{ countByStatus('Interested') }}</p>
        </article>
        <article class="panel p-4">
          <p class="form-label">Converted</p>
          <p class="mt-2 text-3xl font-black text-academy-red">{{ countByStatus('Converted') }}</p>
        </article>
      </div>

      <div class="panel p-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input class="form-input" placeholder="Search player or mobile" [value]="search()" (input)="search.set($any($event.target).value); load()">
          <select class="form-input" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value); load()">
            <option value="">All statuses</option>
            <option *ngFor="let status of statuses" [value]="status">{{ status }}</option>
          </select>
          <select class="form-input" [value]="batchFilter()" (change)="batchFilter.set($any($event.target).value); load()">
            <option value="">All interested batches</option>
            <option *ngFor="let batch of interestedBatchOptions()" [value]="batch">{{ batch }}</option>
          </select>
          <select class="form-input" [value]="sourceFilter()" (change)="sourceFilter.set($any($event.target).value); load()">
            <option value="">All sources</option>
            <option *ngFor="let source of sources" [value]="source">{{ source }}</option>
          </select>
          <button class="btn-secondary" (click)="clearFilters()">Clear</button>
        </div>
      </div>

      <div *ngIf="loading()" class="panel p-6 text-center text-sm font-semibold text-neutral-500">Loading enquiries...</div>

      <div *ngIf="!loading() && enquiries().length === 0" class="panel p-8 text-center">
        <h3 class="text-lg font-black">No enquiries found</h3>
        <p class="mt-1 text-sm text-neutral-500">Add the first enquiry when a visitor/player comes to the academy.</p>
      </div>

      <div *ngIf="!loading() && enquiries().length > 0" class="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-soft lg:block">
        <table class="w-full min-w-[1040px] text-left text-sm">
          <thead class="bg-neutral-950 text-white">
            <tr>
              <th class="p-3">Player</th>
              <th>Mobile</th>
              <th>Age / DOB</th>
              <th>Interested Batch</th>
              <th>Source</th>
              <th>Status</th>
              <th>Visit Date</th>
              <th>Remarks</th>
              <th class="pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr *ngFor="let enquiry of enquiries()" class="transition hover:bg-orange-50/40">
              <td class="p-3 font-bold">{{ enquiry.player_name }}</td>
              <td>{{ enquiry.mobile_number }}</td>
              <td>{{ ageDob(enquiry) }}</td>
              <td>{{ enquiry.interested_batch || '-' }}</td>
              <td>{{ enquiry.source }}</td>
              <td><span class="badge" [ngClass]="statusClass(enquiry.status)">{{ enquiry.status }}</span></td>
              <td>{{ enquiry.visit_date | date: 'dd MMM yyyy' }}</td>
              <td class="max-w-[220px] truncate" [title]="enquiry.remarks || ''">{{ enquiry.remarks || '-' }}</td>
              <td class="pr-3 text-right">
                <div class="flex justify-end gap-2">
                  <button class="btn-secondary !px-3" (click)="sendText(enquiry)">Text</button>
                  <button class="btn-secondary !px-3" (click)="openForm(enquiry)">Edit</button>
                  <button *ngIf="auth.isAdmin() && enquiry.status !== 'Closed' && enquiry.status !== 'Converted'" class="btn-secondary !px-3" (click)="setStatus(enquiry, 'Closed')">Close</button>
                  <button *ngIf="canConvert(enquiry)" class="btn-primary !px-3" (click)="convertToStudent(enquiry)">Convert</button>
                  <button *ngIf="auth.isAdmin()" class="btn-danger !px-3" (click)="deleteTarget.set(enquiry)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 lg:hidden">
        <article *ngFor="let enquiry of enquiries()" class="panel p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-black">{{ enquiry.player_name }}</h3>
              <p class="text-sm text-neutral-500">{{ enquiry.mobile_number }} &middot; {{ ageDob(enquiry) }}</p>
            </div>
            <span class="badge shrink-0" [ngClass]="statusClass(enquiry.status)">{{ enquiry.status }}</span>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt class="form-label">Batch</dt><dd class="font-semibold">{{ enquiry.interested_batch || '-' }}</dd></div>
            <div><dt class="form-label">Source</dt><dd class="font-semibold">{{ enquiry.source }}</dd></div>
            <div><dt class="form-label">Interested In</dt><dd class="font-semibold">{{ enquiry.interested_in }}</dd></div>
            <div><dt class="form-label">Visit Date</dt><dd class="font-semibold">{{ enquiry.visit_date | date: 'dd MMM yyyy' }}</dd></div>
          </dl>
          <p class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">{{ enquiry.remarks || 'No remarks added.' }}</p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button class="btn-secondary" (click)="sendText(enquiry)">Text Message</button>
            <button class="btn-secondary" (click)="openForm(enquiry)">Edit</button>
            <button *ngIf="auth.isAdmin() && enquiry.status !== 'Closed' && enquiry.status !== 'Converted'" class="btn-secondary" (click)="setStatus(enquiry, 'Closed')">Close</button>
            <button *ngIf="canConvert(enquiry)" class="btn-primary" (click)="convertToStudent(enquiry)">Convert</button>
            <button *ngIf="auth.isAdmin()" class="btn-danger" (click)="deleteTarget.set(enquiry)">Delete</button>
          </div>
        </article>
      </div>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 overflow-auto bg-black/55 p-4">
      <form class="modal-panel mx-auto my-6 max-w-3xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-black uppercase text-academy-red">Admission Follow-up</p>
            <h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} enquiry</h3>
          </div>
          <button type="button" class="btn-secondary !px-3" (click)="formOpen.set(false)">Close</button>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span class="form-label">Player Name</span>
            <input class="form-input mt-1" [class.border-red-500]="invalid('player_name')" formControlName="player_name">
            <small *ngIf="invalid('player_name')" class="text-xs font-semibold text-red-600">Player name is required.</small>
          </label>
          <label>
            <span class="form-label">Mobile Number</span>
            <input class="form-input mt-1" [class.border-red-500]="invalid('mobile_number')" formControlName="mobile_number">
            <small *ngIf="invalid('mobile_number')" class="text-xs font-semibold text-red-600">Please enter a valid 10 digit mobile number.</small>
          </label>
          <label>
            <span class="form-label">DOB</span>
            <input class="form-input mt-1" [class.border-red-500]="invalid('dob')" type="date" formControlName="dob">
            <small *ngIf="invalid('dob')" class="text-xs font-semibold text-red-600">Future DOB is not allowed.</small>
          </label>
          <label>
            <span class="form-label">Age</span>
            <input class="form-input mt-1" [class.border-red-500]="invalid('age') || form.hasError('ageOrDob')" type="number" min="3" formControlName="age">
            <small *ngIf="form.hasError('ageOrDob') && (form.touched || form.dirty)" class="text-xs font-semibold text-red-600">Enter either age or DOB.</small>
          </label>
          <label>
            <span class="form-label">Interested Batch / Age Group</span>
            <input class="form-input mt-1" formControlName="interested_batch" placeholder="U-14, Evening U16, Senior, etc.">
          </label>
          <label>
            <span class="form-label">Source</span>
            <select class="form-input mt-1" formControlName="source">
              <option *ngFor="let source of sources" [value]="source">{{ source }}</option>
            </select>
          </label>
          <label>
            <span class="form-label">Interested In</span>
            <select class="form-input mt-1" formControlName="interested_in">
              <option *ngFor="let interest of interests" [value]="interest">{{ interest }}</option>
            </select>
          </label>
          <label>
            <span class="form-label">Status</span>
            <select class="form-input mt-1" formControlName="status">
              <option *ngFor="let status of statuses" [value]="status">{{ status }}</option>
            </select>
          </label>
          <label class="md:col-span-2">
            <span class="form-label">Remarks / Discussion Notes</span>
            <textarea class="form-input mt-1" rows="4" formControlName="remarks" placeholder="Write short discussion notes here."></textarea>
          </label>
        </div>

        <div class="mobile-actions mt-5">
          <button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button>
          <button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save enquiry' }}</button>
        </div>
      </form>
    </div>

    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteTarget()?.player_name || 'enquiry'" (cancel)="deleteTarget.set(null)" (confirm)="remove()"></app-delete-confirm>
  `
})
export class EnquiriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly enquiries = signal<Enquiry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly deleteTarget = signal<Enquiry | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly batchFilter = signal('');
  readonly sourceFilter = signal('');
  readonly sources = enquirySources;
  readonly interests = enquiryInterests;
  readonly statuses = enquiryStatuses;

  readonly form = this.fb.group({
    id: [''],
    player_name: ['', Validators.required],
    mobile_number: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    dob: ['', this.notFutureDate],
    age: [null as number | null, [Validators.min(3), Validators.max(80)]],
    interested_batch: [''],
    source: ['Walk-in' as EnquirySource, Validators.required],
    interested_in: ['Regular Coaching' as EnquiryInterest, Validators.required],
    remarks: [''],
    status: ['New' as EnquiryStatus, Validators.required]
  }, { validators: this.ageOrDobRequired });

  async ngOnInit(): Promise<void> {
    this.form.get('dob')?.valueChanges.subscribe((dob) => {
      if (dob) this.form.patchValue({ age: this.calculateAge(dob) }, { emitEvent: false });
    });
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.data.listEnquiries({
        search: this.search(),
        status: this.statusFilter(),
        interestedBatch: this.batchFilter(),
        source: this.sourceFilter()
      });
      this.enquiries.set(rows);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load enquiries.');
    } finally {
      this.loading.set(false);
    }
  }

  openForm(enquiry?: Enquiry): void {
    this.form.reset({
      id: enquiry?.id ?? '',
      player_name: enquiry?.player_name ?? '',
      mobile_number: enquiry?.mobile_number ?? '',
      dob: enquiry?.dob ?? '',
      age: enquiry?.age ?? null,
      interested_batch: enquiry?.interested_batch ?? '',
      source: enquiry?.source ?? 'Walk-in',
      interested_in: enquiry?.interested_in ?? 'Regular Coaching',
      remarks: enquiry?.remarks ?? '',
      status: enquiry?.status ?? 'New'
    });
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const ageValue = value.age === null || value.age === undefined ? null : Number(value.age);
    this.saving.set(true);
    try {
      await this.data.saveEnquiry({
        id: value.id || undefined,
        player_name: value.player_name?.trim(),
        mobile_number: value.mobile_number?.trim(),
        dob: value.dob || null,
        age: Number.isFinite(ageValue) ? ageValue : null,
        interested_batch: value.interested_batch?.trim() || null,
        source: value.source as EnquirySource,
        interested_in: value.interested_in as EnquiryInterest,
        remarks: value.remarks?.trim() || null,
        status: value.status as EnquiryStatus
      });
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Enquiry saved successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to save enquiry.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    try {
      await this.data.delete('enquiries', target.id);
      this.deleteTarget.set(null);
      await this.load();
      this.toast.success('Enquiry deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to delete enquiry.');
    }
  }

  async setStatus(enquiry: Enquiry, status: EnquiryStatus): Promise<void> {
    try {
      await this.data.updateEnquiryStatus(enquiry.id, status);
      await this.load();
      this.toast.success(`Enquiry marked as ${status}.`);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update enquiry status.');
    }
  }

  sendText(enquiry: Enquiry): void {
    const phone = this.normalizePhone(enquiry.mobile_number);
    const message = `Hello ${enquiry.player_name}, thank you for visiting Unity Cricket Academy. We would be happy to guide you for ${enquiry.interested_in}. Please reply here for admission or follow-up details.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  convertToStudent(enquiry: Enquiry): void {
    void this.router.navigate(['/students'], {
      queryParams: {
        fromEnquiry: '1',
        enquiryId: enquiry.id,
        name: enquiry.player_name,
        phone: enquiry.mobile_number,
        dob: enquiry.dob || '',
        age: enquiry.age || '',
        ageGroup: enquiry.interested_batch || '',
        remarks: enquiry.remarks || ''
      }
    });
  }

  canConvert(enquiry: Enquiry): boolean {
    return enquiry.status !== 'Converted' && enquiry.status !== 'Closed';
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.batchFilter.set('');
    this.sourceFilter.set('');
    void this.load();
  }

  interestedBatchOptions(): string[] {
    return [...new Set(this.enquiries().map((item) => item.interested_batch).filter((value): value is string => !!value))].sort();
  }

  countByStatus(status: EnquiryStatus): number {
    return this.enquiries().filter((item) => item.status === status).length;
  }

  ageDob(enquiry: Enquiry): string {
    const parts = [];
    if (enquiry.age !== null && enquiry.age !== undefined) parts.push(`${enquiry.age} yrs`);
    if (enquiry.dob) parts.push(new Date(`${enquiry.dob}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    return parts.join(' / ') || '-';
  }

  statusClass(status: EnquiryStatus): string {
    const classes: Record<EnquiryStatus, string> = {
      New: 'bg-blue-100 text-blue-800',
      'Follow-up Required': 'bg-orange-100 text-orange-800',
      Interested: 'bg-green-100 text-green-800',
      'Not Interested': 'bg-neutral-100 text-neutral-700',
      Converted: 'bg-red-100 text-red-800',
      Closed: 'bg-neutral-900 text-white'
    };
    return classes[status];
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return Math.max(age, 0);
  }

  private notFutureDate(control: AbstractControl<string | null>): ValidationErrors | null {
    return control.value && control.value > new Date().toISOString().slice(0, 10) ? { futureDate: true } : null;
  }

  private ageOrDobRequired(group: AbstractControl): ValidationErrors | null {
    const dob = group.get('dob')?.value;
    const age = group.get('age')?.value;
    return dob || age ? null : { ageOrDob: true };
  }
}
