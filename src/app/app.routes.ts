import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';
import { LoginComponent } from './auth/login.component';
import { AppShellComponent } from './layout/app-shell.component';
import { DashboardComponent } from './pages/dashboard.component';
import { StudentsComponent } from './pages/students.component';
import { StudentDetailComponent } from './pages/student-detail.component';
import { CoachesComponent } from './pages/coaches.component';
import { CoachDetailComponent } from './pages/coach-detail.component';
import { BatchesComponent } from './pages/batches.component';
import { AttendanceComponent } from './pages/attendance.component';
import { FeesComponent } from './pages/fees.component';
import { MatchesComponent } from './pages/matches.component';
import { SalariesComponent } from './pages/salaries.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'students', component: StudentsComponent },
      { path: 'students/:id', component: StudentDetailComponent },
      { path: 'coaches', component: CoachesComponent, canActivate: [adminGuard] },
      { path: 'coaches/:id', component: CoachDetailComponent },
      { path: 'batches', component: BatchesComponent },
      { path: 'attendance', component: AttendanceComponent },
      { path: 'fees', component: FeesComponent },
      { path: 'matches', component: MatchesComponent },
      { path: 'salaries', component: SalariesComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
