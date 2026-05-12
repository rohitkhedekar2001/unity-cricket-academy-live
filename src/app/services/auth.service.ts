import { Injectable, computed, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../models/app.models';
import { SupabaseClientService } from '../core/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAdmin = computed(() => this.profile()?.role === 'Admin');
  readonly isCoach = computed(() => this.profile()?.role === 'Coach');

  constructor(private readonly supabase: SupabaseClientService, private readonly router: Router) {
    void this.bootstrap();
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      void this.loadProfile();
    });
    effect(() => {
      if (!this.session()) this.profile.set(null);
    });
  }

  async bootstrap(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabase.client.auth.getSession();
    this.session.set(data.session);
    await this.loadProfile();
    this.loading.set(false);
  }

  async login(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.session.set(data.session);
    await this.loadProfile();
  }

  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.session.set(null);
    this.profile.set(null);
    await this.router.navigateByUrl('/login');
  }

  async loadProfile(): Promise<void> {
    const user = this.session()?.user;
    if (!user) {
      this.profile.set(null);
      return;
    }
    const { data, error } = await this.supabase.client.from('profiles').select('*').eq('id', user.id).single();
    if (error) {
      this.profile.set(null);
      return;
    }
    this.profile.set(data as Profile);
  }
}
