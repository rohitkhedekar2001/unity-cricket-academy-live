import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, AppIconName } from './app-icon.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase text-neutral-500">{{ label }}</p>
        <span *ngIf="icon" class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-academy-red">
          <app-icon [name]="icon" [size]="20"></app-icon>
        </span>
      </div>
      <p class="mt-2 text-3xl font-black text-neutral-950">{{ value }}</p>
      <p *ngIf="hint" class="mt-1 text-sm text-neutral-500">{{ hint }}</p>
    </div>
  `
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() hint = '';
  @Input() icon: AppIconName | null = null;
}
