import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 1;

  success(text: string): void {
    this.show('success', text);
  }

  error(text: string): void {
    this.show('error', text);
  }

  info(text: string): void {
    this.show('info', text);
  }

  private show(kind: ToastKind, text: string): void {
    const id = this.nextId++;
    this.messages.update((messages) => [...messages, { id, kind, text }]);
    window.setTimeout(() => this.messages.update((messages) => messages.filter((item) => item.id !== id)), 4500);
  }
}
