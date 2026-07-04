import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';

interface NavItem {
  label: string;
  path?: string;
  admin?: boolean;
  children?: Array<{ label: string; path: string }>;
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen overflow-x-hidden bg-neutral-100 lg:flex">
      <div *ngIf="menuOpen()" class="fixed inset-0 z-20 bg-black/50 lg:hidden" (click)="menuOpen.set(false)"></div>
      <aside [class.hidden]="!menuOpen()" class="fixed inset-y-0 left-0 z-30 w-[min(18rem,86vw)] bg-neutral-950 text-white shadow-2xl lg:static lg:block lg:w-72 lg:shadow-none">
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-white/10 p-4">
            <div class="flex items-center gap-3">
              <img src="assets/logo.png" alt="Unity Cricket Academy logo" class="h-12 w-12 rounded-lg object-cover">
              <div>
                <p class="text-lg font-black">Unity Cricket</p>
                <p class="text-xs text-orange-300">Academy</p>
              </div>
            </div>
            <button class="rounded-lg border border-white/10 px-3 py-2 text-sm font-black lg:hidden" (click)="menuOpen.set(false)" title="Close menu">
              X
            </button>
          </div>
          <nav class="flex-1 space-y-1 overflow-y-auto p-3">
            <ng-container *ngFor="let item of nav">
              <a *ngIf="!item.children" [routerLink]="item.path || '/'" routerLinkActive="bg-white/10 text-orange-300"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                [class.hidden]="item.admin && !auth.isAdmin()" (click)="menuOpen.set(false)">
                <span class="h-2 w-2 rounded-full bg-academy-orange"></span>
                {{ item.label }}
              </a>
              <ng-container *ngIf="item.children as children">
                <div *ngIf="!item.admin || auth.isAdmin()" class="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <p class="px-2 pb-1 text-xs font-black uppercase text-orange-300">{{ item.label }}</p>
                  <a *ngFor="let child of children" [routerLink]="child.path" routerLinkActive="bg-white/10 text-orange-300"
                    class="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                    (click)="menuOpen.set(false)">
                    <span class="h-1.5 w-1.5 rounded-full bg-academy-orange"></span>
                    {{ child.label }}
                  </a>
                </div>
              </ng-container>
            </ng-container>
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
        <header class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-4">
          <button class="btn-secondary lg:hidden" (click)="menuOpen.set(true)" title="Open menu">
            Menu
          </button>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase text-academy-red">Unity Cricket Academy</p>
            <h1 class="truncate text-base font-black text-neutral-950 sm:text-lg">Management Console</h1>
          </div>
          <span class="badge shrink-0 bg-orange-100 text-orange-800">{{ auth.profile()?.role }}</span>
        </header>
        <main class="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:p-6">
          <router-outlet></router-outlet>
        </main>
      </section>

      <div *ngIf="taskReminderOpen() && pendingTaskCount() > 0" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <div class="modal-panel max-w-md">
          <p class="text-xs font-black uppercase text-academy-red">Task Reminder</p>
          <h2 class="mt-1 text-xl font-black">You have {{ pendingTaskCount() }} pending task(s)</h2>
          <p class="mt-2 text-sm text-neutral-600">Open the Tasks section to view deadlines, comments, and progress updates.</p>
          <div class="mobile-actions mt-5">
            <button class="btn-secondary" (click)="taskReminderOpen.set(false)">Later</button>
            <a class="btn-primary" routerLink="/tasks" (click)="taskReminderOpen.set(false)">Open Tasks</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AppShellComponent {
  readonly menuOpen = signal(false);
  readonly taskReminderOpen = signal(false);
  readonly pendingTaskCount = signal(0);
  private reminderLoaded = false;
  readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Students', path: '/students' },
    { label: 'Coaches', path: '/coaches', admin: true },
    { label: 'Branches', path: '/branches', admin: true },
    { label: 'Batches', path: '/batches' },
    { label: 'Attendance', path: '/attendance' },
    { label: 'Fees', path: '/fees' },
    { label: 'Enquiries', path: '/enquiries' },
    { label: 'Matches', path: '/matches' },
    { label: 'Tasks', path: '/tasks' },
    {
      label: 'Coach Performance',
      admin: true,
      children: [
        { label: 'Dashboard', path: '/coach-performance/dashboard' },
        { label: 'Monthly Rankings', path: '/coach-performance/rankings' },
        { label: 'Point Logs', path: '/coach-performance/logs' },
        { label: 'Enquiries', path: '/coach-performance/enquiries' },
        { label: 'Rewards & Penalties', path: '/coach-performance/adjustments' }
      ]
    },
    { label: 'Salaries', path: '/salaries', admin: true }
  ];
  constructor(readonly auth: AuthService, private readonly data: DataService) {
    effect(() => {
      const profile = this.auth.profile();
      if (profile?.role === 'Coach' && !this.reminderLoaded) {
        this.reminderLoaded = true;
        void this.loadTaskReminder();
      }
    });
  }

  private async loadTaskReminder(): Promise<void> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = await this.data.listStaffTasks();
      const pending = tasks.filter((task) => task.status !== 'Completed' && (task.status === 'Pending' || task.deadline < today));
      this.pendingTaskCount.set(pending.length);
      this.taskReminderOpen.set(pending.length > 0);
    } catch {
      this.pendingTaskCount.set(0);
    }
  }
}
