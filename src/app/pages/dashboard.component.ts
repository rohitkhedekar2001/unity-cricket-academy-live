import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../shared/stat-card.component';
import { DataService } from '../services/data.service';
import { Batch, Coach, Fee, Student } from '../models/app.models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="text-2xl font-black text-neutral-950">Dashboard</h2>
        <p class="text-sm text-neutral-500">Live academy overview from Supabase.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total students" [value]="students().length"></app-stat-card>
        </a>
        <a routerLink="/coaches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Total coaches" [value]="coaches().length"></app-stat-card>
        </a>
        <a routerLink="/batches" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active batches" [value]="batches().length"></app-stat-card>
        </a>
        <a routerLink="/fees" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Monthly fees" [value]="money(monthlyFees())"></app-stat-card>
        </a>
        <a routerLink="/students" class="block focus:outline-none focus:ring-2 focus:ring-academy-orange">
          <app-stat-card label="Active students" [value]="activeStudents()"></app-stat-card>
        </a>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="panel p-4">
          <h3 class="font-black text-neutral-950">Recent payments</h3>
          <div class="mt-3 divide-y divide-neutral-100">
            <p *ngIf="fees().length === 0" class="py-4 text-sm text-neutral-500">No fee records yet.</p>
            <div *ngFor="let fee of fees().slice(0, 8)" class="flex items-center justify-between gap-3 py-3 text-sm">
              <span class="font-medium">{{ studentName(fee.student_id) }} &middot; {{ fee.month }} &middot; {{ fee.fee_plan_name }}</span>
              <span class="shrink-0 font-bold text-academy-red">{{ money(fee.amount) }}</span>
            </div>
          </div>
        </section>
        <section class="panel p-4">
          <h3 class="font-black text-neutral-950">Batch strength</h3>
          <div class="mt-3 space-y-3">
            <div *ngFor="let batch of batches()" class="rounded-lg bg-neutral-50 p-3">
              <div class="flex justify-between text-sm font-bold">
                <span>{{ batch.name }}</span>
                <span>{{ batch.students?.length || 0 }} students</span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-neutral-200">
                <div class="h-2 rounded-full bg-academy-orange" [style.width.%]="Math.min((batch.students?.length || 0) * 8, 100)"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  readonly students = signal<Student[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly fees = signal<Fee[]>([]);
  readonly Math = Math;

  constructor(private readonly data: DataService) {}

  async ngOnInit(): Promise<void> {
    const [students, coaches, batches, fees] = await Promise.all([
      this.data.listStudents(),
      this.data.listCoaches().catch(() => []),
      this.data.listBatches(),
      this.data.listFees()
    ]);
    this.students.set(students);
    this.coaches.set(coaches);
    this.batches.set(batches);
    this.fees.set(fees);
  }

  activeStudents(): number {
    return this.students().filter((student) => student.is_active).length;
  }

  monthlyFees(): number {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.fees().filter((fee) => fee.month === month).reduce((sum, fee) => sum + fee.amount, 0);
  }

  studentName(id: string): string {
    return this.students().find((student) => student.id === id)?.name ?? 'Student';
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }
}
