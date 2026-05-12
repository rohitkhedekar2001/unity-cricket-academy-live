import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Batch, Coach, Salary, Student } from '../models/app.models';
import { DataService } from '../services/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section *ngIf="coach()" class="space-y-5">
      <a routerLink="/coaches" class="text-sm font-bold text-academy-red">Back to coaches</a>
      <div class="panel p-5"><h2 class="text-3xl font-black">{{ coach()?.profile?.name }}</h2><p class="text-neutral-500">{{ coach()?.designation }} · {{ coach()?.profile?.email }}</p></div>
      <div class="grid gap-4 lg:grid-cols-3">
        <section class="panel p-4"><h3 class="font-black">Assigned batches</h3><p *ngFor="let batch of batches()" class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm font-semibold">{{ batch.name }} · {{ batch.timing }}</p></section>
        <section class="panel p-4"><h3 class="font-black">Assigned students</h3><p *ngFor="let student of students()" class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm font-semibold">{{ student.name }}</p></section>
        <section class="panel p-4"><h3 class="font-black">Salary history</h3><div *ngFor="let salary of salaries()" class="mt-3 rounded-lg bg-neutral-50 p-3 text-sm"><b>{{ salary.month }}</b><span class="float-right">{{ money(salary.final_salary) }}</span><p class="text-neutral-500">Leaves {{ salary.leaves }} · Deduction {{ money(salary.deduction) }}</p></div></section>
      </div>
    </section>
  `
})
export class CoachDetailComponent implements OnInit {
  readonly coach = signal<Coach | null>(null);
  readonly batches = signal<Batch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly salaries = signal<Salary[]>([]);
  constructor(private readonly route: ActivatedRoute, private readonly data: DataService) {}
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const [coach, batches, students, salaries] = await Promise.all([this.data.getCoach(id), this.data.listBatches(), this.data.listStudents(), this.data.listSalaries(id)]);
    this.coach.set(coach);
    const assigned = batches.filter((batch) => batch.coach_id === id);
    this.batches.set(assigned);
    this.students.set(students.filter((student) => assigned.some((batch) => batch.id === student.batch_id)));
    this.salaries.set(salaries);
  }
  money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }
}
