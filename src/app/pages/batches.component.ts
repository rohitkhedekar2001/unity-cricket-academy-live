import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { Batch, Coach } from '../models/app.models';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 class="text-2xl font-black">Batches</h2><p class="text-sm text-neutral-500">Timing, strength, and assigned coach.</p></div>
        <button *ngIf="auth.isAdmin()" class="btn-primary" (click)="openForm()">Add batch</button>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article *ngFor="let batch of batches()" class="panel cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-lg" (click)="selected.set(batch)">
          <h3 class="text-xl font-black">{{ batch.name }}</h3>
          <p class="mt-1 text-sm text-neutral-500">{{ batch.timing }}</p>
          <div class="mt-4 flex items-center justify-between"><span class="badge bg-red-100 text-red-800">{{ batch.students?.length || 0 }} students</span><span class="text-sm font-bold">{{ batch.coach?.profile?.name || 'No coach' }}</span></div>
          <button *ngIf="auth.isAdmin()" class="btn-secondary mt-4 w-full" (click)="$event.stopPropagation(); openForm(batch)">Edit</button>
        </article>
      </div>
    </section>
    <div *ngIf="selected()" class="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <section class="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
        <div class="flex items-center justify-between"><h3 class="text-xl font-black">{{ selected()?.name }}</h3><button class="btn-secondary" (click)="selected.set(null)">Close</button></div>
        <p class="mt-2 text-neutral-600">{{ selected()?.timing }}</p>
        <p class="mt-4"><span class="form-label block">Coach</span>{{ selected()?.coach?.profile?.name || 'No coach assigned' }}</p>
        <p class="mt-3"><span class="form-label block">Strength</span>{{ selected()?.students?.length || 0 }} active and inactive students</p>
      </section>
    </div>
    <div *ngIf="formOpen()" class="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <form class="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Add' }} batch</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 space-y-4">
          <label class="block"><span class="form-label">Name</span><input class="form-input mt-1" [class.border-red-500]="invalid('name')" formControlName="name"><small *ngIf="invalid('name')" class="text-xs font-semibold text-red-600">Batch name is required and must be unique.</small></label>
          <label class="block"><span class="form-label">Timing</span><input class="form-input mt-1" [class.border-red-500]="invalid('timing')" formControlName="timing" placeholder="6:00 AM - 8:00 AM"><small *ngIf="invalid('timing')" class="text-xs font-semibold text-red-600">Timing is required.</small></label>
          <label class="block"><span class="form-label">Coach</span><select class="form-input mt-1" formControlName="coach_id"><option [ngValue]="null">Unassigned</option><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name }} &middot; {{ coach.designation }}</option></select></label>
        </div>
        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save batch' }}</button></div>
      </form>
    </div>
  `
})
export class BatchesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly batches = signal<Batch[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly selected = signal<Batch | null>(null);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly form = this.fb.group({ id: [''], name: ['', Validators.required], timing: ['', Validators.required], coach_id: [null as string | null] });
  async ngOnInit(): Promise<void> { await Promise.all([this.load(), this.data.listCoaches().then((rows) => this.coaches.set(rows)).catch(() => [])]); }
  load(): Promise<void> { return this.data.listBatches().then((rows) => this.batches.set(rows)); }
  openForm(batch?: Batch): void { this.form.reset({ id: batch?.id ?? '', name: batch?.name ?? '', timing: batch?.timing ?? '', coach_id: batch?.coach_id ?? null }); this.formError.set(''); this.formOpen.set(true); }
  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.hasDuplicate()) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.data.saveBatch({ ...value, id: value.id || undefined } as Partial<Batch>);
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Batch saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save batch.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  hasDuplicate(): boolean {
    const value = this.form.getRawValue();
    const name = value.name?.trim().toLowerCase();
    if (name && this.batches().some((batch) => batch.id !== value.id && batch.name.trim().toLowerCase() === name)) {
      this.formError.set('Batch name already exists.');
      return true;
    }
    return false;
  }
}
