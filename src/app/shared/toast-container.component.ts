import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm space-y-2">
      <div
        *ngFor="let message of toast.messages()"
        class="rounded-lg px-4 py-3 text-sm font-semibold shadow-2xl"
        [ngClass]="{
          'bg-green-600 text-white': message.kind === 'success',
          'bg-red-600 text-white': message.kind === 'error',
          'bg-neutral-950 text-white': message.kind === 'info'
        }"
      >
        {{ message.text }}
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  constructor(readonly toast: ToastService) {}
}
