import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';
import { LoginComponent } from './auth/login.component';
import { AppShellComponent } from './layout/app-shell.component';
import { DashboardComponent } from './pages/dashboard.component';
import { StudentsComponent } from './pages/students.component';
import { StudentDetailComponent } from './pages/student-detail.component';
import { CoachesComponent } from './pages/coaches.component';
import { CoachDetailComponent } from './pages/coach-detail.component';
import { BranchesComponent } from './pages/branches.component';
import { BatchesComponent } from './pages/batches.component';
import { AttendanceComponent } from './pages/attendance.component';
import { FeesComponent } from './pages/fees.component';
import { MatchesComponent } from './pages/matches.component';
import { StaffTasksComponent } from './pages/staff-tasks.component';
import { EnquiriesComponent } from './pages/enquiries.component';
import { SalariesComponent } from './pages/salaries.component';
import { CoachPerformanceComponent } from './features/coach-performance/coach-performance.component';

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
      { path: 'branches', component: BranchesComponent, canActivate: [adminGuard] },
      { path: 'batches', component: BatchesComponent },
      { path: 'attendance', component: AttendanceComponent },
      { path: 'fees', component: FeesComponent },
      { path: 'enquiries', component: EnquiriesComponent },
      { path: 'matches', component: MatchesComponent },
      { path: 'tasks', component: StaffTasksComponent },
      { path: 'coach-performance', pathMatch: 'full', redirectTo: 'coach-performance/dashboard' },
      { path: 'coach-performance/dashboard', component: CoachPerformanceComponent, canActivate: [adminGuard], data: { section: 'dashboard' } },
      { path: 'coach-performance/rankings', component: CoachPerformanceComponent, canActivate: [adminGuard], data: { section: 'rankings' } },
      { path: 'coach-performance/logs', component: CoachPerformanceComponent, canActivate: [adminGuard], data: { section: 'logs' } },
      { path: 'coach-performance/enquiries', component: CoachPerformanceComponent, canActivate: [adminGuard], data: { section: 'enquiries' } },
      { path: 'coach-performance/adjustments', component: CoachPerformanceComponent, canActivate: [adminGuard], data: { section: 'adjustments' } },
      { path: 'salaries', component: SalariesComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
