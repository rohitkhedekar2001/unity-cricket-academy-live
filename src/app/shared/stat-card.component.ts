import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <p class="text-xs font-semibold uppercase text-neutral-500">{{ label }}</p>
      <p class="mt-2 text-3xl font-black text-neutral-950">{{ value }}</p>
      <p *ngIf="hint" class="mt-1 text-sm text-neutral-500">{{ hint }}</p>
    </div>
  `
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() hint = '';
}
