/**
 * DEVFLOW — Workspace Service
 * Manages developer workspaces backed by real Supabase data (public.workspaces).
 * 
 * Database Schema:
 * public.workspaces (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   owner_id UUID REFERENCES auth.users(id) NOT NULL,
 *   name TEXT NOT NULL,
 *   role TEXT NOT NULL,
 *   project_type TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * )
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { authService } from './authService.js';

class WorkspaceService {
  constructor() {
    this.storageKey = 'devflow_active_workspace_id';
    this.listeners = new Set();
    this.activeWorkspace = null;
    this.workspaces = [];
    this.isLoading = false;
    this.error = null;
    this.initialized = false;
  }

  /**
   * Initialize workspace service and sync with current user
   */
  async init() {
    if (this.initialized) return this.workspaces;
    this.initialized = true;

    // Reactively refresh workspaces whenever user auth state changes
    authService.subscribe(async (user) => {
      if (user) {
        await this.fetchWorkspaces();
      } else {
        this.activeWorkspace = null;
        this.workspaces = [];
        this.error = null;
        try {
          localStorage.removeItem(this.storageKey);
        } catch (e) {
          // ignore storage error
        }
        this.notify();
      }
    });

    if (authService.isAuthenticated()) {
      await this.fetchWorkspaces();
    }

    return this.workspaces;
  }

  /**
   * Get the currently active workspace object (or first workspace, or null)
   */
  getWorkspace() {
    if (this.activeWorkspace) {
      return { ...this.activeWorkspace };
    }
    if (this.workspaces && this.workspaces.length > 0) {
      return { ...this.workspaces[0] };
    }
    return null;
  }

  /**
   * Get all workspaces owned by current authenticated user
   */
  getUserWorkspaces() {
    return [...this.workspaces];
  }

  /**
   * Alias for getUserWorkspaces
   */
  getAllWorkspaces() {
    return [...this.workspaces];
  }

  /**
   * Set active workspace by workspace object
   */
  setActiveWorkspace(ws) {
    this.activeWorkspace = ws ? { ...ws } : null;
    if (ws && ws.id) {
      try {
        localStorage.setItem(this.storageKey, ws.id);
      } catch (e) {
        console.warn('Could not cache active workspace ID', e);
      }
    } else {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        // ignore
      }
    }
    this.notify();
  }

  /**
   * Select active workspace by workspace ID
   */
  selectWorkspace(workspaceId) {
    if (!workspaceId) return null;
    const found = this.workspaces.find((w) => w.id === workspaceId);
    if (found) {
      this.setActiveWorkspace(found);
      return found;
    }
    return null;
  }

  /**
   * Fetch all workspaces for the currently authenticated user from Supabase
   */
  async fetchWorkspaces() {
    const session = await authService.getValidSession();
    const user = session?.user || authService.getUser();
    this.isLoading = true;
    this.error = null;

    if (!user || !user.id) {
      this.workspaces = [];
      this.activeWorkspace = null;
      this.isLoading = false;
      this.notify();
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('id, owner_id, name, role, project_type, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch workspaces notice:', error.message || error);
          this.error = 'Unable to load workspaces.';
          this.workspaces = [];
          this.activeWorkspace = null;
        } else {
          this.workspaces = (data || []).map((row) => ({
            ...row,
            projectType: row.project_type
          }));

          // Restore previously selected active workspace if valid
          let cachedId = null;
          try {
            cachedId = localStorage.getItem(this.storageKey);
          } catch (e) {
            // ignore
          }

          if (cachedId && this.workspaces.some((w) => w.id === cachedId)) {
            const matched = this.workspaces.find((w) => w.id === cachedId);
            this.activeWorkspace = matched || this.workspaces[0];
          } else if (this.workspaces.length > 0) {
            this.activeWorkspace = this.workspaces[0];
          } else {
            this.activeWorkspace = null;
          }
        }
      } catch (err) {
        console.error('Workspaces query network notice:', err);
        this.error = 'Unable to load workspaces.';
        this.workspaces = [];
        this.activeWorkspace = null;
      } finally {
        this.isLoading = false;
        this.notify();
      }
    } else {
      this.isLoading = false;
      this.workspaces = [];
      this.activeWorkspace = null;
      this.notify();
    }

    return this.workspaces;
  }

  /**
   * Create a new workspace row in Supabase for the authenticated user
   */
  async createWorkspace({ name, role, projectType }) {
    const session = await authService.getValidSession();
    const user = session?.user || authService.getUser();
    if (!user || !user.id || !session) {
      throw new Error('Authentication required. Please sign in to create a workspace.');
    }

    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error('Please enter a workspace name.');
    }

    const cleanRole = role?.trim() || 'Staff Platform Engineer';
    const cleanType = projectType?.trim() || 'Web Application';

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .insert([
            {
              owner_id: user.id,
              name: trimmedName,
              role: cleanRole,
              project_type: cleanType
            }
          ])
          .select('id, owner_id, name, role, project_type, created_at')
          .single();

        if (error) {
          console.error('Supabase workspace insert notice:', error.message || error);
          if (error.message && /row-level security/i.test(error.message)) {
            throw new Error('Authentication session expired or invalid. Please sign in again.');
          }
          throw new Error('Unable to create your workspace. Please try again.');
        }

        if (!data) {
          throw new Error('Unable to create your workspace. Please try again.');
        }

        const createdRecord = {
          ...data,
          projectType: data.project_type || cleanType
        };

        // Add to workspace collection and mark as active
        this.workspaces = [createdRecord, ...this.workspaces.filter((w) => w.id !== createdRecord.id)];
        this.setActiveWorkspace(createdRecord);
        return createdRecord;
      } catch (err) {
        console.error('Workspace creation notice:', err);
        if (err.message && (err.message.includes('Authentication') || err.message.includes('sign in') || err.message.includes('workspace name'))) {
          throw err;
        }
        throw new Error('Unable to create your workspace. Please try again.');
      }
    } else {
      throw new Error('Supabase client is not connected. Please check configuration.');
    }
  }

  /**
   * Update an existing workspace
   */
  async updateWorkspace(workspaceId, updates = {}) {
    const user = authService.getUser();
    if (!user || !user.id) {
      throw new Error('Authentication required to update workspace.');
    }
    if (!workspaceId) {
      throw new Error('Workspace ID is required.');
    }

    const payload = {};
    if (updates.name) payload.name = updates.name.trim();
    if (updates.role) payload.role = updates.role.trim();
    if (updates.project_type || updates.projectType) {
      payload.project_type = updates.project_type || updates.projectType;
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('workspaces')
        .update(payload)
        .eq('id', workspaceId)
        .eq('owner_id', user.id)
        .select('id, owner_id, name, role, project_type, created_at')
        .single();

      if (error) {
        console.error('Supabase workspace update error:', error.message || error);
        throw new Error('Unable to update workspace.');
      }

      const updated = {
        ...data,
        projectType: data.project_type
      };

      this.workspaces = this.workspaces.map((w) => (w.id === workspaceId ? updated : w));
      if (this.activeWorkspace?.id === workspaceId) {
        this.setActiveWorkspace(updated);
      } else {
        this.notify();
      }

      return updated;
    }
    return null;
  }

  /**
   * Delete a workspace by ID
   */
  async deleteWorkspace(workspaceId) {
    const user = authService.getUser();
    if (!user || !user.id) {
      throw new Error('Authentication required to delete workspace.');
    }
    if (!workspaceId) return;

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Supabase workspace delete error:', error.message || error);
        throw new Error('Unable to delete workspace.');
      }

      this.workspaces = this.workspaces.filter((w) => w.id !== workspaceId);
      if (this.activeWorkspace?.id === workspaceId) {
        this.setActiveWorkspace(this.workspaces.length > 0 ? this.workspaces[0] : null);
      } else {
        this.notify();
      }
    }
  }

  /**
   * Subscribe to workspace state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all registered subscribers
   */
  notify() {
    const active = this.getWorkspace();
    this.listeners.forEach((listener) => {
      try {
        listener(active, [...this.workspaces], {
          isLoading: this.isLoading,
          error: this.error
        });
      } catch (e) {
        console.error('Workspace listener notice:', e);
      }
    });
  }
}

export const workspaceService = new WorkspaceService();
