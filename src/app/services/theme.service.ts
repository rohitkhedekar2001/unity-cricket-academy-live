import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly darkMode = signal(localStorage.getItem('uca-theme') === 'dark');

  constructor() {
    effect(() => {
      const isDark = this.darkMode();
      document.documentElement.classList.toggle('dark-theme', isDark);
      localStorage.setItem('uca-theme', isDark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.darkMode.update((enabled) => !enabled);
  }
}
