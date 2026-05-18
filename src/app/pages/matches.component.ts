import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademyMatch, Batch, Coach, MatchPlayer, MatchPlayerRole, matchPlayerRoles, matchStatuses, Student } from '../models/app.models';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { DeleteConfirmComponent } from '../shared/delete-confirm.component';

type SelectedMatchParticipant = {
  student_id?: string;
  coach_id?: string;
  player_name?: string;
  player_group?: string;
  role: MatchPlayerRole;
  fee_status: 'Paid' | 'Pending';
  attendance_confirmed: boolean;
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmComponent],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-2xl font-black">Match Management</h2>
          <p class="text-sm text-neutral-500">Plan matches, assign squads, track player fees, and share match notes.</p>
        </div>
        <button class="btn-primary" [disabled]="loading()" (click)="openForm()">Create match</button>
      </div>

      <section class="panel p-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input class="form-input" placeholder="Search opponent or venue" [value]="search()" (input)="search.set($any($event.target).value)">
          <input class="form-input" placeholder="Age group" [value]="ageFilter()" (input)="ageFilter.set($any($event.target).value)">
          <input class="form-input" placeholder="Venue" [value]="venueFilter()" (input)="venueFilter.set($any($event.target).value)">
          <input class="form-input" type="date" [value]="dateFilter()" (change)="dateFilter.set($any($event.target).value)">
          <select class="form-input" [value]="batchFilter()" (change)="batchFilter.set($any($event.target).value)">
            <option value="">All Batches</option>
            <option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option>
          </select>
        </div>
        <button class="btn-secondary mt-3" type="button" (click)="clearFilters()">Clear filters</button>
      </section>

      <section class="grid gap-4 md:grid-cols-4">
        <div class="panel p-4"><p class="form-label">Matches</p><p class="mt-1 text-2xl font-black">{{ filteredMatches().length }}</p></div>
        <div class="panel p-4"><p class="form-label">Completed</p><p class="mt-1 text-2xl font-black text-green-700">{{ completedCount() }}</p></div>
        <div class="panel p-4"><p class="form-label">Cancelled</p><p class="mt-1 text-2xl font-black text-academy-red">{{ cancelledCount() }}</p></div>
        <div class="panel p-4"><p class="form-label">Upcoming</p><p class="mt-1 text-2xl font-black text-orange-700">{{ upcomingCount() }}</p></div>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article *ngFor="let match of filteredMatches()" class="panel overflow-hidden">
          <div class="border-b border-neutral-100 bg-neutral-950 p-4 text-white">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-black uppercase text-orange-300">{{ match.status }} | {{ match.age_group || 'Open age group' }}</p>
                <h3 class="mt-1 text-xl font-black">Unity vs {{ match.opponent_team }}</h3>
                <p class="text-sm text-white/70">{{ match.venue }} | {{ displayDate(match.match_datetime) }}</p>
              </div>
              <span class="rounded-lg bg-white px-3 py-2 text-sm font-black text-neutral-950">{{ money(match.match_fee) }} / player</span>
            </div>
          </div>

          <div class="space-y-4 p-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-lg bg-green-50 p-3"><p class="form-label">Collected</p><p class="text-lg font-black text-green-700">{{ money(matchCollected(match)) }}</p></div>
              <div class="rounded-lg bg-red-50 p-3"><p class="form-label">Pending</p><p class="text-lg font-black text-academy-red">{{ money(matchPending(match)) }}</p></div>
              <div class="rounded-lg bg-orange-50 p-3"><p class="form-label">Players</p><p class="text-lg font-black text-orange-700">{{ match.players?.length || 0 }}</p></div>
            </div>

            <div>
              <p class="form-label mb-2">Team selection</p>
              <div class="max-h-64 overflow-auto rounded-lg border border-neutral-200">
                <table class="w-full min-w-[700px] text-left text-sm">
                  <thead class="sticky top-0 bg-neutral-100"><tr><th class="p-3">Player</th><th>Group</th><th>Role</th><th>Match Fee</th><th>Attendance</th></tr></thead>
                  <tbody class="divide-y divide-neutral-100">
                    <tr *ngIf="!match.players?.length"><td colspan="5" class="p-4 text-center font-semibold text-neutral-500">No players selected.</td></tr>
                    <tr *ngFor="let player of match.players">
                      <td class="p-3 font-bold">{{ participantName(player) }}</td>
                      <td>{{ participantGroup(player) }}</td>
                      <td>{{ player.role }}</td>
                      <td><button class="rounded-full px-3 py-1 text-xs font-black transition" [ngClass]="player.fee_status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" (click)="toggleFee(player)">{{ player.fee_status }}</button></td>
                      <td><label class="inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" [checked]="player.attendance_confirmed" (change)="toggleAttendance(player)"> Confirmed</label></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="form-label">Instructions</p>
              <p class="mt-1 text-sm text-neutral-700">{{ match.notes || 'No special instructions added.' }}</p>
            </div>

            <div>
              <p class="form-label mb-2">Shared notes</p>
              <div class="space-y-2">
                <p *ngIf="!match.match_notes?.length" class="rounded-lg bg-neutral-50 p-3 text-sm font-semibold text-neutral-500">No notes yet.</p>
                <div *ngFor="let note of match.match_notes" class="rounded-lg bg-neutral-50 p-3">
                  <p class="text-sm text-neutral-800">{{ note.note }}</p>
                  <p class="mt-1 text-xs font-bold text-neutral-500">{{ note.profile?.name || 'Staff' }} | {{ displayDate(note.created_at) }}</p>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <input class="form-input" placeholder="Add note" [value]="noteValue(match.id)" (input)="setNoteDraft(match.id, $any($event.target).value)">
                <button class="btn-secondary whitespace-nowrap" [disabled]="saving()" (click)="addNote(match)">Add</button>
              </div>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
              <button class="btn-secondary" (click)="downloadSummary(match)">Download summary</button>
              <button class="btn-secondary" (click)="openForm(match)">Edit</button>
              <button *ngIf="auth.isAdmin()" class="btn-danger" [disabled]="deleting()" (click)="askDelete(match)">Delete</button>
            </div>
          </div>
        </article>
        <div *ngIf="!loading() && filteredMatches().length === 0" class="panel p-8 text-center font-semibold text-neutral-500 xl:col-span-2">No matches found.</div>
      </section>
    </section>

    <div *ngIf="formOpen()" class="fixed inset-0 z-40 overflow-y-auto bg-black/55 p-4">
      <form class="mx-auto my-6 w-full max-w-5xl rounded-lg bg-white p-5 shadow-2xl" [formGroup]="form" (ngSubmit)="save()">
        <div class="flex items-center justify-between"><h3 class="text-lg font-black">{{ form.value.id ? 'Edit' : 'Create' }} match</h3><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Close</button></div>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <label><span class="form-label">Opponent team</span><input class="form-input mt-1" formControlName="opponent_team"></label>
          <label><span class="form-label">Venue</span><input class="form-input mt-1" formControlName="venue"></label>
          <label><span class="form-label">Date and time</span><input class="form-input mt-1" type="datetime-local" formControlName="match_datetime"></label>
          <label><span class="form-label">Match fee</span><input class="form-input mt-1" type="number" min="0" formControlName="match_fee"></label>
          <label><span class="form-label">Age group/category</span><input class="form-input mt-1" formControlName="age_group"></label>
          <label><span class="form-label">Status</span><select class="form-input mt-1" formControlName="status"><option *ngFor="let status of statuses" [value]="status">{{ status }}</option></select></label>
        </div>
        <label class="mt-4 block"><span class="form-label">Notes / special instructions</span><textarea class="form-input mt-1 min-h-24" formControlName="notes"></textarea></label>

        <section class="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <p class="form-label mb-2">Select players</p>
            <select class="form-input mb-3" [value]="playerBatchFilter()" (change)="playerBatchFilter.set($any($event.target).value)">
              <option value="">Select batch to show students</option>
              <option *ngFor="let batch of batches()" [value]="batch.id">{{ batch.name }}</option>
            </select>
            <div class="max-h-96 overflow-auto rounded-lg border border-neutral-200">
              <p *ngIf="!playerBatchFilter()" class="p-4 text-sm font-semibold text-neutral-500">Select a batch to view all active students from that batch.</p>
              <p *ngIf="playerBatchFilter() && batchStudents().length === 0" class="p-4 text-sm font-semibold text-neutral-500">No active students found in this batch.</p>
              <div *ngFor="let student of batchStudents()" class="grid gap-2 border-b border-neutral-100 p-3 md:grid-cols-[1fr_160px_110px]">
                <label class="flex items-center gap-2 font-bold"><input type="checkbox" [checked]="isStudentSelected(student.id)" (change)="toggleStudentPlayer(student)"> {{ student.name }} <span class="text-xs text-neutral-500">({{ batchName(student.batch_id) }})</span></label>
                <select class="form-input" [disabled]="!isStudentSelected(student.id)" [value]="playerRole(studentKey(student.id))" (change)="setPlayerRole(studentKey(student.id), $any($event.target).value)">
                  <option *ngFor="let role of roles" [value]="role">{{ role }}</option>
                </select>
                <select class="form-input" [disabled]="!isStudentSelected(student.id)" [value]="playerFee(studentKey(student.id))" (change)="setPlayerFee(studentKey(student.id), $any($event.target).value)">
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
            <div *ngIf="canSelectCoachPlayers()" class="mt-4">
              <p class="form-label mb-2">Coach players for Senior/Intrasquad</p>
              <div class="max-h-64 overflow-auto rounded-lg border border-neutral-200">
                <div *ngFor="let coach of coaches()" class="grid gap-2 border-b border-neutral-100 p-3 md:grid-cols-[1fr_160px_110px]">
                  <label class="flex items-center gap-2 font-bold"><input type="checkbox" [checked]="isCoachPlayerSelected(coach.id)" (change)="toggleCoachPlayer(coach)"> {{ coach.profile?.name }} <span class="text-xs text-neutral-500">({{ coach.designation }})</span></label>
                  <select class="form-input" [disabled]="!isCoachPlayerSelected(coach.id)" [value]="playerRole(coachKey(coach.id))" (change)="setPlayerRole(coachKey(coach.id), $any($event.target).value)">
                    <option *ngFor="let role of roles" [value]="role">{{ role }}</option>
                  </select>
                  <select class="form-input" [disabled]="!isCoachPlayerSelected(coach.id)" [value]="playerFee(coachKey(coach.id))" (change)="setPlayerFee(coachKey(coach.id), $any($event.target).value)">
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p class="form-label mb-2">Assign coaches</p>
            <div class="grid gap-2 rounded-lg border border-neutral-200 p-3">
              <label *ngFor="let coach of coaches()" class="flex items-center gap-2 font-bold"><input type="checkbox" [checked]="selectedCoachIds().includes(coach.id)" (change)="toggleCoach(coach.id)"> {{ coach.profile?.name }} <span class="text-xs text-neutral-500">({{ coach.designation }})</span></label>
            </div>
            <div class="mt-4 rounded-lg bg-orange-50 p-4">
              <p class="form-label">Team summary</p>
              <p class="mt-1 text-sm font-semibold">Players: {{ selectedPlayers().length }} | Coaches: {{ selectedCoachIds().length }}</p>
              <p class="mt-1 text-sm font-semibold">This match expected fee: {{ money((form.value.match_fee || 0) * selectedPlayers().length) }}</p>
            </div>
          </div>
        </section>

        <p *ngIf="formError()" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ formError() }}</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="btn-secondary" (click)="formOpen.set(false)">Cancel</button><button class="btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save match' }}</button></div>
      </form>
    </div>
    <app-delete-confirm [open]="!!deleteTarget()" [itemName]="deleteLabel()" (cancel)="deleteTarget.set(null)" (confirm)="removeMatch()"></app-delete-confirm>
  `
})
export class MatchesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly matches = signal<AcademyMatch[]>([]);
  readonly students = signal<Student[]>([]);
  readonly coaches = signal<Coach[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly formOpen = signal(false);
  readonly formError = signal('');
  readonly deleteTarget = signal<AcademyMatch | null>(null);
  readonly selectedPlayers = signal<SelectedMatchParticipant[]>([]);
  readonly selectedCoachIds = signal<string[]>([]);
  readonly playerBatchFilter = signal('');
  readonly noteDraft = signal<Record<string, string>>({});
  readonly search = signal('');
  readonly ageFilter = signal('');
  readonly venueFilter = signal('');
  readonly dateFilter = signal('');
  readonly batchFilter = signal('');
  readonly roles = matchPlayerRoles;
  readonly statuses = matchStatuses;
  readonly form = this.fb.group({
    id: [''],
    opponent_team: ['', Validators.required],
    venue: ['', Validators.required],
    match_datetime: ['', Validators.required],
    match_fee: [0, [Validators.required, Validators.min(0)]],
    age_group: ['', Validators.required],
    status: ['Upcoming', Validators.required],
    notes: ['']
  });

  readonly filteredMatches = computed(() => {
    const search = this.search().trim().toLowerCase();
    const age = this.ageFilter().trim().toLowerCase();
    const venue = this.venueFilter().trim().toLowerCase();
    const date = this.dateFilter();
    const batchId = this.batchFilter();
    return this.matches().filter((match) => {
      const searchable = `${match.opponent_team} ${match.venue}`.toLowerCase();
      const hasBatch = !batchId || (match.players || []).some((player) => player.student?.batch_id === batchId);
      return (!search || searchable.includes(search))
        && (!age || (match.age_group || '').toLowerCase().includes(age))
        && (!venue || (match.venue || '').toLowerCase().includes(venue))
        && (!date || match.match_datetime.slice(0, 10) === date)
        && hasBatch;
    });
  });

  readonly batchStudents = computed(() => {
    const batchId = this.playerBatchFilter();
    return batchId ? this.students().filter((student) => student.batch_id === batchId) : [];
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [matches, students, coaches, batches] = await Promise.all([
        this.data.listMatches(),
        this.data.listMatchStudents(),
        this.data.listCoaches(),
        this.data.listMatchBatches()
      ]);
      this.matches.set(matches);
      this.students.set(students);
      this.coaches.set(coaches);
      this.batches.set(batches);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to load matches.');
    } finally {
      this.loading.set(false);
    }
  }

  openForm(match?: AcademyMatch): void {
    this.form.reset({
      id: match?.id ?? '',
      opponent_team: match?.opponent_team ?? '',
      venue: match?.venue ?? '',
      match_datetime: match?.match_datetime ? match.match_datetime.slice(0, 16) : new Date().toISOString().slice(0, 16),
      match_fee: match?.match_fee ?? 0,
      age_group: match?.age_group ?? '',
      status: match?.status ?? 'Upcoming',
      notes: match?.notes ?? ''
    });
    this.selectedPlayers.set((match?.players || []).map((player) => ({
      student_id: player.student_id ?? undefined,
      coach_id: player.coach_id ?? undefined,
      player_name: player.player_name ?? this.participantName(player),
      player_group: player.player_group ?? this.participantGroup(player),
      role: player.role,
      fee_status: player.fee_status,
      attendance_confirmed: player.attendance_confirmed
    })));
    this.selectedCoachIds.set((match?.coaches || []).map((coach) => coach.coach_id));
    this.playerBatchFilter.set(match?.players?.find((player) => player.student?.batch_id)?.student?.batch_id ?? this.batches()[0]?.id ?? '');
    this.formError.set('');
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (this.selectedPlayers().length === 0) {
      this.formError.set('Please select at least one player.');
      return;
    }
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      const saved = await this.data.saveMatch({
        id: value.id || undefined,
        opponent_team: value.opponent_team!,
        venue: value.venue!,
        match_datetime: value.match_datetime!,
        match_fee: Number(value.match_fee || 0),
        age_group: value.age_group!,
        status: value.status as AcademyMatch['status'],
        notes: value.notes || null
      });
      await Promise.all([
        this.data.saveMatchPlayers(saved.id, this.selectedPlayers()),
        this.data.saveMatchCoaches(saved.id, this.selectedCoachIds())
      ]);
      this.formOpen.set(false);
      await this.load();
      this.toast.success('Match saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save match.';
      this.formError.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  toggleStudentPlayer(student: Student): void {
    const exists = this.isStudentSelected(student.id);
    this.selectedPlayers.update((players) => exists ? players.filter((player) => player.student_id !== student.id) : [...players, { student_id: student.id, player_name: student.name, player_group: this.batchName(student.batch_id), role: 'Batsman', fee_status: 'Pending', attendance_confirmed: false }]);
  }

  toggleCoachPlayer(coach: Coach): void {
    const exists = this.isCoachPlayerSelected(coach.id);
    this.selectedPlayers.update((players) => exists ? players.filter((player) => player.coach_id !== coach.id) : [...players, { coach_id: coach.id, player_name: coach.profile?.name ?? 'Coach', player_group: 'Coach / Staff', role: 'All-rounder', fee_status: 'Pending', attendance_confirmed: false }]);
  }

  isStudentSelected(studentId: string): boolean { return this.selectedPlayers().some((player) => player.student_id === studentId); }
  isCoachPlayerSelected(coachId: string): boolean { return this.selectedPlayers().some((player) => player.coach_id === coachId); }
  canSelectCoachPlayers(): boolean {
    const category = (this.form.get('age_group')?.value || '').trim().toLowerCase();
    return category.includes('senior') || category.includes('intrasquad') || category.includes('intra squad');
  }
  playerRole(key: string): MatchPlayerRole { return this.selectedPlayers().find((player) => this.playerKey(player) === key)?.role ?? 'Batsman'; }
  playerFee(key: string): 'Paid' | 'Pending' { return this.selectedPlayers().find((player) => this.playerKey(player) === key)?.fee_status ?? 'Pending'; }
  setPlayerRole(key: string, role: MatchPlayerRole): void { this.selectedPlayers.update((players) => players.map((player) => this.playerKey(player) === key ? { ...player, role } : player)); }
  setPlayerFee(key: string, fee_status: 'Paid' | 'Pending'): void { this.selectedPlayers.update((players) => players.map((player) => this.playerKey(player) === key ? { ...player, fee_status } : player)); }
  studentKey(id: string): string { return `student:${id}`; }
  coachKey(id: string): string { return `coach:${id}`; }
  toggleCoach(coachId: string): void { this.selectedCoachIds.update((ids) => ids.includes(coachId) ? ids.filter((id) => id !== coachId) : [...ids, coachId]); }

  async toggleFee(player: MatchPlayer): Promise<void> {
    try {
      await this.data.saveMatchPlayer({ id: player.id, fee_status: player.fee_status === 'Paid' ? 'Pending' : 'Paid' });
      await this.load();
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update fee status.');
    }
  }

  async toggleAttendance(player: MatchPlayer): Promise<void> {
    try {
      await this.data.saveMatchPlayer({ id: player.id, attendance_confirmed: !player.attendance_confirmed });
      await this.load();
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to update attendance.');
    }
  }

  setNoteDraft(matchId: string, value: string): void { this.noteDraft.update((draft) => ({ ...draft, [matchId]: value })); }
  noteValue(matchId: string): string { return this.noteDraft()[matchId] || ''; }

  async addNote(match: AcademyMatch): Promise<void> {
    const note = (this.noteDraft()[match.id] || '').trim();
    if (!note) return;
    this.saving.set(true);
    try {
      await this.data.addMatchNote(match.id, note);
      this.setNoteDraft(match.id, '');
      await this.load();
      this.toast.success('Note added.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to add note.');
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(match: AcademyMatch): void { this.deleteTarget.set(match); }
  deleteLabel(): string { const match = this.deleteTarget(); return match ? `match against ${match.opponent_team}` : 'match'; }
  async removeMatch(): Promise<void> {
    const match = this.deleteTarget();
    if (!match || !this.auth.isAdmin()) return;
    this.deleting.set(true);
    try {
      await this.data.delete('matches', match.id);
      this.deleteTarget.set(null);
      await this.load();
      this.toast.success('Match deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Unable to delete match.');
    } finally {
      this.deleting.set(false);
    }
  }

  downloadSummary(match: AcademyMatch): void {
    const rows = [
      ['Player', 'Group', 'Role', 'Fee Status', 'Attendance'],
      ...(match.players || []).map((player) => [
        this.participantName(player),
        this.participantGroup(player),
        player.role,
        player.fee_status,
        player.attendance_confirmed ? 'Confirmed' : 'Pending'
      ]),
      [],
      ['Grand Total Collected', this.money(this.matchCollected(match))],
      ['Grand Total Pending', this.money(this.matchPending(match))]
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-summary-${this.slug(match.opponent_team)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  matchCollected(match: AcademyMatch): number { return (match.players || []).filter((player) => player.fee_status === 'Paid').length * (match.match_fee || 0); }
  matchPending(match: AcademyMatch): number { return (match.players || []).filter((player) => player.fee_status !== 'Paid').length * (match.match_fee || 0); }
  upcomingCount(): number { return this.filteredMatches().filter((match) => match.status === 'Upcoming').length; }
  completedCount(): number { return this.filteredMatches().filter((match) => match.status === 'Completed').length; }
  cancelledCount(): number { return this.filteredMatches().filter((match) => match.status === 'Cancelled').length; }
  participantName(player: MatchPlayer): string { return player.player_name || player.student?.name || player.coach?.profile?.name || 'Player'; }
  participantGroup(player: MatchPlayer): string { return player.player_group || (player.student ? (player.student.batch?.name || this.batchName(player.student.batch_id)) : 'Coach / Staff'); }
  batchName(id: string | null): string { return this.batches().find((batch) => batch.id === id)?.name ?? 'Unassigned'; }
  displayDate(value: string): string { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'; }
  money(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0); }
  clearFilters(): void { this.search.set(''); this.ageFilter.set(''); this.venueFilter.set(''); this.dateFilter.set(''); this.batchFilter.set(''); }
  private playerKey(player: SelectedMatchParticipant): string { return player.student_id ? this.studentKey(player.student_id) : this.coachKey(player.coach_id || ''); }
  private slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'match'; }
}
