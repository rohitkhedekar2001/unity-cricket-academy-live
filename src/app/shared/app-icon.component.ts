import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type AppIconName = 'users' | 'user-check' | 'batches' | 'rupee' | 'wallet' | 'sun' | 'moon';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <g [ngSwitch]="name">
        <g *ngSwitchCase="'users'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </g>
        <g *ngSwitchCase="'user-check'">
          <path d="M2 21a8 8 0 0 1 13.29-6" />
          <circle cx="9" cy="7" r="4" />
          <path d="m16 19 2 2 4-4" />
        </g>
        <g *ngSwitchCase="'batches'">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </g>
        <g *ngSwitchCase="'rupee'">
          <path d="M6 3h12" />
          <path d="M6 8h12" />
          <path d="m6 13 8.5 8" />
          <path d="M6 13h3" />
          <path d="M9 13c6.67 0 6.67-10 0-10" />
        </g>
        <g *ngSwitchCase="'wallet'">
          <path d="M19 7V4a1 1 0 0 0-1-1H5a3 3 0 0 0 0 6h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3V6" />
          <path d="M16 13h2" />
        </g>
        <g *ngSwitchCase="'sun'">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.42 1.42" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </g>
        <g *ngSwitchCase="'moon'">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
        </g>
      </g>
    </svg>
  `
})
export class AppIconComponent {
  @Input({ required: true }) name: AppIconName = 'users';
  @Input() size = 20;
}
