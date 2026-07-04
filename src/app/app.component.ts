import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingSpinnerComponent } from './shared/loading-spinner.component';
import { ToastContainerComponent } from './shared/toast-container.component';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingSpinnerComponent, ToastContainerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-loading-spinner [show]="auth.loading() || data.busy()"></app-loading-spinner>
    <app-toast-container></app-toast-container>
  `
})
export class AppComponent {
  constructor(readonly auth: AuthService, readonly data: DataService, readonly theme: ThemeService) {}
}
