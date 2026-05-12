import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Coach, Salary } from '../models/app.models';
import { DataService } from '../services/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <div><h2 class="text-2xl font-black">Salaries</h2><p class="text-sm text-neutral-500">Generate salary using two free leaves and automatic deduction.</p></div>
      <form class="panel grid gap-4 p-4 md:grid-cols-4" [formGroup]="form" (ngSubmit)="generate()">
        <label><span class="form-label">Coach</span><select class="form-input mt-1" formControlName="coach_id"><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name }}</option></select></label>
        <label><span class="form-label">Month</span><input class="form-input mt-1" type="month" formControlName="month"></label>
        <label><span class="form-label">Working days</span><input class="form-input mt-1" type="number" formControlName="working_days"></label>
        <button class="btn-primary self-end" [disabled]="form.invalid">Generate</button>
      </form>
      <section class="panel overflow-hidden">
        <table class="w-full min-w-[760px] text-left text-sm"><thead class="bg-neutral-950 text-white"><tr><th class="p-3">Coach</th><th>Month</th><th>Leaves</th><th>Deduction</th><th class="text-right pr-3">Final salary</th></tr></thead><tbody class="divide-y divide-neutral-100"><tr *ngFor="let salary of salaries()"><td class="p-3 font-bold">{{ salary.coach?.profile?.name }}</td><td>{{ salary.month }}</td><td>{{ salary.leaves }}</td><td>{{ money(salary.deduction) }}</td><td class="pr-3 text-right font-bold text-academy-red">{{ money(salary.final_salary) }}</td></tr></tbody></table>
      </section>
    </section>
  `
})
export class SalariesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  readonly coaches = signal<Coach[]>([]);
  readonly salaries = signal<Salary[]>([]);
  readonly form = this.fb.group({ coach_id: ['', Validators.required], month: [new Date().toISOString().slice(0, 7), Validators.required], working_days: [26, [Validators.required, Validators.min(1)]] });
  async ngOnInit(): Promise<void> { const [coaches, salaries] = await Promise.all([this.data.listCoaches(), this.data.listSalaries()]); this.coaches.set(coaches); this.salaries.set(salaries); this.form.patchValue({ coach_id: coaches[0]?.id ?? '' }); }
  async generate(): Promise<void> { if (this.form.invalid) return; const value = this.form.getRawValue(); await this.data.generateSalary(value.coach_id!, value.month!, value.working_days!); this.salaries.set(await this.data.listSalaries()); }
  money(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0); }
}
