import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Coach,
  StaffTask,
  StaffTaskCategory,
  StaffTaskPriority,
  StaffTaskStatus,
  taskCategories,
  taskPriorities,
  taskStatuses
} from '../models/app.models';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-2xl font-black">Staff Tasks</h2>
          <p class="text-sm text-neutral-500">{{ auth.isAdmin() ? 'Assign, review, and track coach task performance.' : 'View assigned tasks, update progress, and add comments.' }}</p>
        </div>
        <button *ngIf="auth.isAdmin()" class="btn-primary" [disabled]="loading()" (click)="openForm()">Create task</button>
      </div>

      <section *ngIf="!auth.isAdmin() && reminderOpen() && coachPendingTasks().length" class="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-soft">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="font-black text-orange-900">Pending task reminder</h3>
            <p class="text-sm font-semibold text-orange-800">You have {{ coachPendingTasks().length }} pending or overdue task(s).</p>
          </div>
          <button class="btn-secondary" type="button" (click)="reminderOpen.set(false)">Dismiss</button>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-4">
        <div class="panel p-4"><p class="form-label">Pending</p><p class="mt-1 text-2xl font-black text-orange-700">{{ countByStatus('Pending') }}</p></div>
        <div class="panel p-4"><p class="form-label">In Progress</p><p class="mt-1 text-2xl font-black text-blue-700">{{ countByStatus('In Progress') }}</p></div>
        <div class="panel p-4"><p class="form-label">Completed</p><p class="mt-1 text-2xl font-black text-green-700">{{ countByStatus('Completed') }}</p></div>
        <div class="panel p-4"><p class="form-label">Overdue</p><p class="mt-1 text-2xl font-black text-academy-red">{{ countByStatus('Overdue') }}</p></div>
      </section>

      <section *ngIf="auth.isAdmin()" class="grid gap-4 md:grid-cols-3">
        <div class="panel p-4"><p class="form-label">Completion Rate</p><p class="mt-1 text-2xl font-black">{{ completionRate() }}%</p></div>
        <div class="panel p-4"><p class="form-label">Average Completion</p><p class="mt-1 text-2xl font-black">{{ averageCompletionDays() }} days</p></div>
        <div class="panel p-4"><p class="form-label">Monthly Completed</p><p class="mt-1 text-2xl font-black text-green-700">{{ monthlyCompleted() }}</p></div>
      </section>

      <section class="panel p-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input class="form-input" placeholder="Search task" [value]="search()" (input)="search.set($any($event.target).value)">
          <select class="form-input" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)"><option value="">All Status</option><option *ngFor="let status of statuses" [value]="status">{{ status }}</option></select>
          <select class="form-input" [value]="priorityFilter()" (change)="priorityFilter.set($any($event.target).value)"><option value="">All Priority</option><option *ngFor="let priority of priorities" [value]="priority">{{ priority }}</option></select>
          <select class="form-input" [value]="categoryFilter()" (change)="categoryFilter.set($any($event.target).value)"><option value="">All Category</option><option *ngFor="let category of categories" [value]="category">{{ category }}</option></select>
          <select *ngIf="auth.isAdmin()" class="form-input" [value]="coachFilter()" (change)="coachFilter.set($any($event.target).value)"><option value="">All Coaches</option><option *ngFor="let coach of coaches()" [value]="coach.id">{{ coach.profile?.name }}</option></select>
          <input class="form-input" type="date" [value]="dateFilter()" (change)="dateFilter.set($any($event.target).value)">
        </div>
        <button class="btn-secondary mt-3" type="button" (click)="clearFilters()">Clear filters</button>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article *ngFor="let task of filteredTasks()" class="panel overflow-hidden">
          <div class="border-b border-neutral-100 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-black uppercase text-academy-red">{{ task.category }} | {{ task.priority }}</p>
                <h3 class="mt-1 text-lg font-black">{{ task.title }}</h3>
                <p class="text-sm text-neutral-500">Due {{ displayDate(task.deadline) }} | Created by {{ task.creator?.name || 'Admin' }}</p>
              </div>
              <span class="badge" [ngClass]="statusClass(effectiveStatus(task))">{{ effectiveStatus(task) }}</span>
            </div>
            <p class="mt-3 text-sm text-neutral-700">{{ task.description }}</p>
            <p *ngIf="task.notes" class="mt-2 rounded-lg bg-orange-50 p-3 text-sm font-semibold text-orange-800">{{ task.notes }}</p>
          </div>

          <div class="space-y-4 p-4">
            <div>
              <p class="form-label mb-2">Assigned coaches</p>
              <div class="flex flex-wrap gap-2">
                <span *ngFor="let assignment of task.assignments" class="badge bg-neutral-100 text-neutral-800">{{ assignment.coach?.profile?.name }}</span>
                <span *ngIf="!task.assignments?.length" class="text-sm font-semibold text-neutral-500">No coaches assigned.</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button *ngIf="!auth.isAdmin() && effectiveStatus(task) === 'Pending'" class="btn-secondary" (click)="changeStatus(task, 'In Progress')">Start</button>
              <button *ngIf="!auth.isAdmin() && effectiveStatus(task) !== 'Completed'" class="btn-primary" (click)="changeStatus(task, 'Completed')">Mark completed</button>
              <button *ngIf="auth.isAdmin() && task.status === 'Completed' && !task.approved_at" class="btn-primary" (click)="approve(task)">Approve completion</button>
              <button *ngIf="auth.isAdmin() && task.status === 'Completed'" class="btn-secondary" (click)="changeStatus(task, 'Pending')">Reopen</button>
              <button *ngIf="auth.isAdmin()" class="btn-secondary" (click)="openForm(task)">Edit</button>
              <button *ngIf="auth.isAdmin()" class="btn-danger" [disabled]="deleting()" (click)="askDelete(task)">Delete</button>
            </div>

            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="form-label mb-2">Comments & updates</p>
              <div class="max-h-52 space-y-2 overflow-auto">
                <p *ngIf="!task.comments?.length" class="text-sm font-semibold text-neutral-500">No comments yet.</p>
                <div *ngFor="let comment of task.comments" class="rounded-lg bg-white p-3">
                  <p class="text-sm">{{ comment.comment }}</p>
                  <p class="mt-1 text-xs font-bold text-neutral-500">{{ comment.profile?.name || 'Staff' }} | {{ displayDateTime(comment.created_at) }}</p>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <input class="form-input" placeholder="Add progress update" [value]="commentValue(task.id)" (input)="setCommentDraft(task.id, $any($event.target).value)">
                <button class="btn-secondary whitespace-nowrap" [disabled]="saving()" (click)="addComment(task)">Add</button>
              </div>
            </div>

            <details class="rounded-lg border border-neutral-200 p-3">
              <summary class="cursor-pointer text-sm font-black">Activity logs</summary>
              <div class="mt-2 space-y-2">
                <p *ngIf="!task.logs?.length" class="text-sm font-semibold text-neutral-500">No activity yet.</p>
                <p *ngFor="let log of task.logs" class="text-xs font-semibold text-neutral-600">{{ displayDateTime(log.created_at) }} - {{ log.profile?.name || 'System' }} {{ log.action }} {{ log.details || '' }}</p>
              </div>
            </details>
          </div>
        </article>
        <div *ngIf="!loading() && filteredTasks().length === 0" class="panel p-8 text-center font-semibold text-neutral-500 xl:col-span-2">No tasks found.</div>
      </section>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 overflow-y-auto bg-black/55 p-4">
      <form class="mx-auto my-6 w-full max-w-4xl rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Create' }} task</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label><span class="form-label">Task title</span><input class="form-input mt-1" formControlName="title"></label>
          <label><span class="form-label">Deadline</span><input class="form-input mt-1" type="date" formControlName="deadline"></label>
          <label><span class="form-label">Priority</span><select class="form-input mt-1" formControlName="priority"><option *ngFor="let priority of priorities" [value]="priority">{{ priority }}</option></select></label>
          <label><span class="form-label">Category</span><select class="form-input mt-1" formControlName="category"><option *ngFor="let category of categories" [value]="category">{{ category }}</option></select></label>
        </div>
        <label class="mt-4 block"><span class="form-label">Description</span><textarea class="form-input mt-1 min-h-24" formControlName="description"></textarea></label>
        <label class="mt-4 block"><span class="form-label">Notes / instructions</span><textarea class="form-input mt-1 min-h-20" formControlName="notes"></textarea></label>
        <div class="mt-4">
          <p class="form-label mb-2">Assign coach(es)</p>
          <div class="grid max-h-64 gap-2 overflow-auto rounded-lg border border-neutral-200 p-3 md:grid-cols-2">
            <label *ngFor="let coach of coaches()" class="flex items-center gap-2 font-bold"><input type="checkbox" [checked]="selectedCoachIds().includes(coach.id)" (change)="toggleCoach(coach.id)"> {{ coach.profile?.name }} <span class="text-xs text-neutral-500">({{ coach.designation }})</span></label>
          </div>
        </div>
        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save task' }}</button></div>
      </form>
    </div>
    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteLabel()" (cancel)="deleteTarget.set(null)" (confirm)="removeTask()"></app-delete-confirm>
  `
})
export class StaffTasksComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly tasks = signal<StaffTask[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly reminderOpen = signal(true);
  readonly formOpen = signal(false);
  readonly formError = signal('');
  readonly deleteTarget = signal<StaffTask | null>(null);
  readonly selectedCoachIds = signal<string[]>([]);
  readonly commentDraft = signal<Record<string, string>>({});
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly priorityFilter = signal('');
  readonly categoryFilter = signal('');
  readonly coachFilter = signal('');
  readonly dateFilter = signal('');
  readonly priorities = taskPriorities;
  readonly statuses = taskStatuses;
  readonly categories = taskCategories;
  readonly form = this.fb.group({
    id: [''],
    title: ['', Validators.required],
    description: ['', Validators.required],
    priority: ['Medium' as StaffTaskPriority, Validators.required],
    deadline: [new Date().toISOString().slice(0, 10), Validators.required],
    category: ['Training' as StaffTaskCategory, Validators.required],
    notes: ['']
  });

  readonly filteredTasks = computed(() => {
    const search = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const category = this.categoryFilter();
    const coachId = this.coachFilter();
    const date = this.dateFilter();
    return this.tasks().filter((task) => {
      const text = `${task.title} ${task.description} ${task.category}`.toLowerCase();
      const taskStatus = this.effectiveStatus(task);
      const hasCoach = !coachId || (task.assignments || []).some((assignment) => assignment.coach_id === coachId);
      return (!search || text.includes(search))
        && (!status || taskStatus === status)
        && (!priority || task.priority === priority)
        && (!category || task.category === category)
        && (!date || task.deadline === date)
        && hasCoach;
    });
  });

  readonly coachPendingTasks = computed(() => this.tasks().filter((task) => ['Pending', 'Overdue'].includes(this.effectiveStatus(task))));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [tasks, coaches] = await Promise.all([this.data.listStaffTasks(), this.data.listCoaches()]);
      this.tasks.set(tasks);
      this.coaches.set(coaches);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load staff tasks.');
    } finally {
      this.loading.set(false);
    }
  }

  openForm(task?: StaffTask): void {
    if (!this.auth.isAdmin()) return;
    this.form.reset({
      id: task?.id ?? '',
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'Medium',
      deadline: task?.deadline ?? new Date().toISOString().slice(0, 10),
      category: task?.category ?? 'Training',
      notes: task?.notes ?? ''
    });
    this.selectedCoachIds.set((task?.assignments || []).map((assignment) => assignment.coach_id));
    this.formError.set('');
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    if (!this.auth.isAdmin()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (this.selectedCoachIds().length === 0) {
      this.formError.set('Please assign at least one coach.');
      return;
    }
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      const saved = await this.data.saveStaffTask({
        id: value.id || undefined,
        title: value.title!,
        description: value.description!,
        priority: value.priority as StaffTaskPriority,
        deadline: value.deadline!,
        category: value.category as StaffTaskCategory,
        notes: value.notes || null,
        status: value.id ? this.tasks().find((task) => task.id === value.id)?.status ?? 'Pending' : 'Pending'
      });
      await this.data.saveTaskAssignments(saved.id, this.selectedCoachIds());
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Task saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save task.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  toggleCoach(coachId: string): void {
    this.selectedCoachIds.update((ids) => ids.includes(coachId) ? ids.filter((id) => id !== coachId) : [...ids, coachId]);
  }

  async changeStatus(task: StaffTask, status: StaffTaskStatus): Promise<void> {
    try {
      await this.data.updateTaskStatus(task.id, status);
      await this.load();
      this.toast.success(status === 'Completed' ? 'Task marked as completed.' : 'Task updated.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update task.');
    }
  }

  async approve(task: StaffTask): Promise<void> {
    if (!this.auth.isAdmin()) return;
    try {
      await this.data.approveTask(task.id);
      await this.load();
      this.toast.success('Task completion approved.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to approve task.');
    }
  }

  async addComment(task: StaffTask): Promise<void> {
    const comment = this.commentValue(task.id).trim();
    if (!comment) return;
    this.saving.set(true);
    try {
      await this.data.addTaskComment(task.id, comment);
      this.setCommentDraft(task.id, '');
      await this.load();
      this.toast.success('Comment added.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to add comment.');
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(task: StaffTask): void { this.deleteTarget.set(task); }
  deleteLabel(): string { return this.deleteTarget()?.title ?? 'task'; }

  async removeTask(): Promise<void> {
    const task = this.deleteTarget();
    if (!task || !this.auth.isAdmin()) return;
    this.deleting.set(true);
    try {
      await this.data.delete('staff_tasks', task.id);
      this.deleteTarget.set(null);
      await this.load();
      this.toast.success('Task deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to delete task.');
    } finally {
      this.deleting.set(false);
    }
  }

  effectiveStatus(task: StaffTask): StaffTaskStatus {
    if (task.status !== 'Completed' && task.deadline < new Date().toISOString().slice(0, 10)) return 'Overdue';
    return task.status;
  }

  countByStatus(status: StaffTaskStatus): number { return this.filteredTasks().filter((task) => this.effectiveStatus(task) === status).length; }
  completionRate(): number { return this.tasks().length ? Math.round((this.tasks().filter((task) => task.status === 'Completed').length / this.tasks().length) * 100) : 0; }
  monthlyCompleted(): number { const month = new Date().toISOString().slice(0, 7); return this.tasks().filter((task) => task.completed_at?.slice(0, 7) === month).length; }
  averageCompletionDays(): number {
    const completed = this.tasks().filter((task) => task.completed_at);
    if (!completed.length) return 0;
    const totalDays = completed.reduce((sum, task) => sum + Math.max(Math.ceil((new Date(task.completed_at!).getTime() - new Date(task.created_at).getTime()) / 86400000), 0), 0);
    return Math.round(totalDays / completed.length);
  }
  statusClass(status: StaffTaskStatus): string {
    if (status === 'Completed') return 'bg-green-100 text-green-800';
    if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
    if (status === 'Overdue') return 'bg-red-100 text-red-800';
    return 'bg-orange-100 text-orange-800';
  }
  setCommentDraft(taskId: string, value: string): void { this.commentDraft.update((draft) => ({ ...draft, [taskId]: value })); }
  commentValue(taskId: string): string { return this.commentDraft()[taskId] || ''; }
  displayDate(value: string): string { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)); }
  displayDateTime(value: string): string { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  clearFilters(): void { this.search.set(''); this.statusFilter.set(''); this.priorityFilter.set(''); this.categoryFilter.set(''); this.coachFilter.set(''); this.dateFilter.set(''); }
}
