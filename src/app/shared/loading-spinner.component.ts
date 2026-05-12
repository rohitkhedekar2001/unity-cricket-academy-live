import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="fixed inset-0 z-40 grid place-items-center bg-white/70 backdrop-blur-sm">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-academy-red"></div>
    </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() show = false;
}
