import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-neutral-950">Confirm delete</h2>
            <p class="mt-1 text-sm text-neutral-600">Type DELETE to permanently remove {{ itemName }}.</p>
          </div>
          <button class="btn-secondary !px-2" type="button" (click)="cancel.emit()" title="Close">
            X
          </button>
        </div>
        <input class="form-input mt-4" [ngModel]="text()" (ngModelChange)="text.set($event)" [ngModelOptions]="{ standalone: true }" placeholder="DELETE" autocomplete="off">
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-secondary" type="button" (click)="cancel.emit()">Cancel</button>
          <button class="btn-danger" type="button" [disabled]="text() !== 'DELETE'" (click)="confirm.emit()">
            Delete
          </button>
        </div>
      </section>
    </div>
  `
})
export class DeleteConfirmComponent implements OnChanges {
  @Input() open = false;
  @Input() itemName = 'this item';
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  readonly text = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) this.text.set('');
  }
}
