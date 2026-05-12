import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="grid min-h-screen place-items-center bg-neutral-950 p-4">
      <section class="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <div class="flex items-center gap-3">
          <img src="assets/logo.png" alt="Unity Cricket Academy logo" class="h-14 w-14 rounded-lg object-cover">
          <div>
            <h1 class="text-2xl font-black text-neutral-950">Unity Cricket Academy</h1>
            <p class="text-sm text-neutral-500">Management System</p>
          </div>
        </div>
        <form class="mt-7 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <label class="block">
            <span class="form-label">Email</span>
            <input class="form-input mt-1" formControlName="email" type="email" autocomplete="email">
          </label>
          <label class="block">
            <span class="form-label">Password</span>
            <input class="form-input mt-1" formControlName="password" type="password" autocomplete="current-password">
          </label>
          <p *ngIf="error()" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ error() }}</p>
          <button class="btn-primary w-full" [disabled]="form.invalid || saving()" type="submit">
            Sign in
          </button>
        </form>
        <p class="mt-5 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
          Default admin: admin&#64;cricketacademy.com / Admin&#64;123
        </p>
      </section>
    </main>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['admin@cricketacademy.com', [Validators.required, Validators.email]],
    password: ['Admin@123', [Validators.required]]
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.form.value.email ?? '', this.form.value.password ?? '');
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      this.saving.set(false);
    }
  }
}
