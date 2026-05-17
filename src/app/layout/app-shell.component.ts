import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-neutral-100 lg:flex">
      <aside [class.hidden]="!menuOpen()" class="fixed inset-0 z-30 bg-neutral-950 text-white lg:static lg:block lg:w-72">
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-white/10 p-4">
            <div class="flex items-center gap-3">
              <img src="assets/logo.png" alt="Unity Cricket Academy logo" class="h-12 w-12 rounded-lg object-cover">
              <div>
                <p class="text-lg font-black">Unity Cricket</p>
                <p class="text-xs text-orange-300">Academy</p>
              </div>
            </div>
            <button class="lg:hidden" (click)="menuOpen.set(false)" title="Close menu">
              X
            </button>
          </div>
          <nav class="flex-1 space-y-1 p-3">
            <a *ngFor="let item of nav" [routerLink]="item.path" routerLinkActive="bg-white/10 text-orange-300"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              [class.hidden]="item.admin && !auth.isAdmin()" (click)="menuOpen.set(false)">
              <span class="h-2 w-2 rounded-full bg-academy-orange"></span>
              {{ item.label }}
            </a>
          </nav>
          <div class="border-t border-white/10 p-4">
            <p class="text-sm font-bold">{{ auth.profile()?.name }}</p>
            <p class="text-xs text-white/60">{{ auth.profile()?.role }}</p>
            <button class="mt-3 w-full rounded-lg bg-academy-red px-3 py-2 text-sm font-bold transition hover:bg-red-700" (click)="auth.logout()">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <section class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button class="btn-secondary lg:hidden" (click)="menuOpen.set(true)" title="Open menu">
            Menu
          </button>
          <div>
            <p class="text-xs font-bold uppercase text-academy-red">Unity Cricket Academy</p>
            <h1 class="text-lg font-black text-neutral-950">Management Console</h1>
          </div>
          <span class="badge bg-orange-100 text-orange-800">{{ auth.profile()?.role }}</span>
        </header>
        <main class="mx-auto max-w-7xl p-4 md:p-6">
          <router-outlet></router-outlet>
        </main>
      </section>
    </div>
  `
})
export class AppShellComponent {
  readonly menuOpen = signal(false);
  readonly nav = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Students', path: '/students' },
    { label: 'Coaches', path: '/coaches', admin: true },
    { label: 'Batches', path: '/batches' },
    { label: 'Attendance', path: '/attendance' },
    { label: 'Fees', path: '/fees' },
    { label: 'Matches', path: '/matches' },
    { label: 'Salaries', path: '/salaries', admin: true }
  ];
  constructor(readonly auth: AuthService) {}
}
