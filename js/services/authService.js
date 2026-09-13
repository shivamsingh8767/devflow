/**
 * DEVFLOW — Authentication Service
 * Manages user sign-up, sign-in, sign-out, and session persistence with Supabase Auth.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.listeners = new Set();
    this.storageKey = 'devflow_local_auth_user';
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this.currentUser;
    this.initialized = true;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session) {
          this.currentSession = data.session;
          this.currentUser = data.session.user;
        }

        // Listen to ongoing auth state changes
        supabase.auth.onAuthStateChange((_event, session) => {
          this.currentSession = session;
          this.currentUser = session?.user || null;
          this.notify();
        });
      } catch (err) {
        console.warn('Supabase auth session fetch error:', err);
      }
    } else {
      // Local fallback session when Supabase env is not yet injected
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          this.currentUser = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Local session load error', e);
      }
    }

    this.notify();
    return this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  getSession() {
    return this.currentSession;
  }

  async getValidSession() {
    if (!isSupabaseConfigured()) return this.currentSession;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) {
        this.currentSession = data.session;
        this.currentUser = data.session.user;
        return data.session;
      }
    } catch (e) {
      console.warn('Session check error:', e);
    }
    return null;
  }

  isAuthenticated() {
    return Boolean(this.currentUser && (this.currentSession || !isSupabaseConfigured()));
  }

  /**
   * Format Supabase Auth errors into friendly, concise user messages
   */
  formatAuthError(err) {
    if (!err) return 'An error occurred during authentication.';
    const msg = typeof err === 'string' ? err : err.message || '';

    if (/invalid login credentials/i.test(msg) || /invalid_grant/i.test(msg)) {
      return 'Invalid email or password.';
    }
    if (/already registered/i.test(msg) || /user already exists/i.test(msg)) {
      return 'An account with this email already exists. Please sign in.';
    }
    if (/email not confirmed/i.test(msg)) {
      return 'Email not confirmed yet. Please check your inbox or sign in.';
    }
    if (/password/i.test(msg) && /characters/i.test(msg)) {
      return 'Password must be at least 6 characters.';
    }
    if (/rate limit/i.test(msg)) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return msg || 'Authentication failed. Please check your credentials.';
  }

  async signUp({ email, password, confirmPassword, fullName }) {
    const cleanEmail = email?.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || cleanEmail.split('@')[0]
          }
        }
      });

      if (error) {
        throw new Error(this.formatAuthError(error));
      }

      // Check if Supabase returned a dummy/existing user with 0 identities (existing email)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please sign in.');
      }

      let session = data.session;
      let user = data.user;

      // If signup did not return a session immediately, try signing in to establish session
      if (!session && user) {
        try {
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (signInRes.data?.session) {
            session = signInRes.data.session;
            user = signInRes.data.user;
          }
        } catch (signInErr) {
          console.warn('Auto sign-in notice after signup:', signInErr);
        }
      }

      if (!session) {
        // If email confirmation is required before establishing a session
        this.currentUser = null;
        this.currentSession = null;
        this.notify();
        throw new Error('Account created! Please check your email to confirm your account, then sign in.');
      }

      this.currentUser = user;
      this.currentSession = session;
      this.notify();
      return user;
    } else {
      // Local fallback session
      const user = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        user_metadata: {
          full_name: fullName?.trim() || cleanEmail.split('@')[0]
        },
        created_at: new Date().toISOString()
      };
      this.currentUser = user;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } catch (e) {
        console.warn(e);
      }
      this.notify();
      return user;
    }
  }

  async signIn({ email, password }) {
    const cleanEmail = email?.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        throw new Error(this.formatAuthError(error));
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      this.notify();
      return data.user;
    } else {
      const user = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        user_metadata: {
          full_name: cleanEmail.split('@')[0]
        },
        created_at: new Date().toISOString()
      };
      this.currentUser = user;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } catch (e) {
        console.warn(e);
      }
      this.notify();
      return user;
    }
  }

  async signOut() {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error', err);
      }
    }

    this.currentUser = null;
    this.currentSession = null;
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn(e);
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error('Auth listener error', e);
      }
    });
  }
}

export const authService = new AuthService();
