/**
 * DEVFLOW — Project Service
 * Abstracted data layer for project operations backed by Supabase (public.projects).
 * 
 * Schema:
 * public.projects (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   status TEXT DEFAULT 'Active',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * )
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { authService } from './authService.js';
import { workspaceService } from './workspaceService.js';

class ProjectService {
  constructor() {
    this.storageKey = 'devflow_local_projects';
    this.listeners = new Set();
    this.projects = [];
    this.isLoading = false;
    this.error = null;
    this.realtimeChannel = null;
  }

  async init() {
    workspaceService.subscribe(async (activeWs) => {
      if (activeWs && activeWs.id) {
        await this.fetchProjects(activeWs.id);
        this.setupRealtime(activeWs.id);
      } else {
        this.projects = [];
        this.cleanupRealtime();
        this.notify();
      }
    });

    const currentWs = workspaceService.getWorkspace();
    if (currentWs && currentWs.id) {
      await this.fetchProjects(currentWs.id);
      this.setupRealtime(currentWs.id);
    }
  }

  getProjects() {
    return [...this.projects];
  }

  getProject(projectId) {
    return this.getProjectById(projectId);
  }

  getProjectById(id) {
    return this.projects.find((p) => p.id === id) || null;
  }

  /**
   * Fetch all projects for a specific workspace from public.projects
   */
  async getProjectsForWorkspace(workspaceId) {
    return this.fetchProjects(workspaceId);
  }

  async fetchProjects(workspaceId) {
    if (!workspaceId) {
      this.projects = [];
      this.notify();
      return [];
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        await authService.getValidSession();
        const { data, error } = await supabase
          .from('projects')
          .select('id, workspace_id, name, description, status, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase projects fetch error:', error.message || error);
          this.error = 'Unable to load projects.';
          this.projects = [];
        } else {
          const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
          this.projects = (data || []).map((p, idx) => ({
            ...p,
            badgeColor: colors[idx % colors.length],
            category: 'Productivity'
          }));
        }
      } catch (err) {
        console.error('Projects query failure:', err);
        this.error = 'Unable to load projects.';
        this.projects = [];
      } finally {
        this.isLoading = false;
        this.notify();
      }
    } else {
      // Local storage fallback for offline/demo testing
      this.isLoading = false;
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        this.projects = saved.filter((p) => p.workspace_id === workspaceId || p.workspaceId === workspaceId);
      } catch (e) {
        console.warn(e);
        this.projects = [];
      }
      this.notify();
    }

    return this.projects;
  }

  /**
   * Create a project under a real workspace in Supabase
   */
  async createProject(workspaceId, { name, description, status, category }) {
    if (!name || !name.trim()) {
      throw new Error('Please enter a project name.');
    }

    const session = await authService.getValidSession();
    const user = session?.user || authService.getUser();
    if (!user || !user.id) {
      throw new Error('Please sign in to create projects.');
    }

    const currentWs = workspaceService.getWorkspace();
    const targetWsId = workspaceId || currentWs?.id;

    if (!targetWsId) {
      throw new Error('Please create or select a workspace first before adding projects.');
    }

    // Verify the workspace belongs to current user or is current active workspace
    if (currentWs && currentWs.id === targetWsId && currentWs.owner_id && currentWs.owner_id !== user.id) {
      throw new Error('You do not have permission to add projects to this workspace.');
    }

    const trimmedName = name.trim();
    const cleanDesc = description ? description.trim() : 'Active developer workspace project.';
    const cleanStatus = status || 'Active';
    const cleanCategory = category || 'Productivity';
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const badgeColor = colors[this.projects.length % colors.length];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            workspace_id: targetWsId,
            name: trimmedName,
            description: cleanDesc,
            status: cleanStatus
          }
        ])
        .select('id, workspace_id, name, description, status, created_at')
        .single();

      if (error) {
        console.error('Supabase project creation error:', error.message || error);
        if (error.message && /row-level security/i.test(error.message)) {
          throw new Error('Authentication session expired or unauthorized. Please sign in again.');
        }
        throw new Error(error.message || 'Unable to create project in Supabase.');
      }

      const newProject = {
        ...data,
        badgeColor,
        category: cleanCategory
      };

      // Prepend to project list
      this.projects = [newProject, ...this.projects.filter((p) => p.id !== newProject.id)];
      this.notify();
      return newProject;
    } else {
      const newProject = {
        id: `proj-${Date.now()}`,
        workspace_id: targetWsId,
        name: trimmedName,
        description: cleanDesc,
        status: cleanStatus,
        category: cleanCategory,
        badgeColor,
        created_at: new Date().toISOString()
      };

      this.projects.unshift(newProject);
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        saved.unshift(newProject);
        localStorage.setItem(this.storageKey, JSON.stringify(saved));
      } catch (e) {
        console.warn(e);
      }

      this.notify();
      return newProject;
    }
  }

  // Alias for backward compatibility
  async addProject(projectData) {
    const ws = workspaceService.getWorkspace();
    return this.createProject(projectData.workspaceId || ws?.id, projectData);
  }

  /**
   * Update an existing project in Supabase
   */
  async updateProject(projectId, { name, description, status, category }) {
    if (!projectId) {
      throw new Error('Project ID is required for update.');
    }

    await authService.getValidSession();
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (status !== undefined) updatePayload.status = status;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select('id, workspace_id, name, description, status, created_at')
        .single();

      if (error) {
        console.error('Supabase project update error:', error.message || error);
        throw new Error(error.message || 'Unable to update project in Supabase.');
      }

      const updatedProj = {
        ...data,
        category: category || 'Productivity'
      };

      this.projects = this.projects.map((p) => (p.id === projectId ? { ...p, ...updatedProj } : p));
      this.notify();
      return updatedProj;
    } else {
      this.projects = this.projects.map((p) => (p.id === projectId ? { ...p, ...updatePayload } : p));
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        const updatedSaved = saved.map((p) => (p.id === projectId ? { ...p, ...updatePayload } : p));
        localStorage.setItem(this.storageKey, JSON.stringify(updatedSaved));
      } catch (e) {
        console.warn(e);
      }
      this.notify();
      return this.getProjectById(projectId);
    }
  }

  /**
   * Delete a project from Supabase
   */
  async deleteProject(id) {
    if (!id) return;
    await authService.getValidSession();

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase project deletion error:', error.message || error);
        throw new Error(error.message || 'Error deleting project.');
      }
    }

    this.projects = this.projects.filter((p) => p.id !== id);
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const filtered = saved.filter((p) => p.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn(e);
    }
    this.notify();
  }

  setupRealtime(workspaceId) {
    if (!isSupabaseConfigured() || !workspaceId) return;
    this.cleanupRealtime();

    try {
      this.realtimeChannel = supabase
        .channel(`public:projects:ws_${workspaceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
          (_payload) => {
            this.fetchProjects(workspaceId);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription setup error for projects:', err);
    }
  }

  cleanupRealtime() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getProjects(), {
          isLoading: this.isLoading,
          error: this.error
        });
      } catch (e) {
        console.error('Project listener error', e);
      }
    });
  }
}

export const projectService = new ProjectService();
