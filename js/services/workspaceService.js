/**
 * DEVFLOW — Workspace Service
 * Manages active developer workspace and onboarding profile.
 */

import { initialWorkspace } from '../data/demoData.js';

class WorkspaceService {
  constructor() {
    this.storageKey = 'devflow_workspace';
    this.listeners = new Set();
    this.workspace = this.loadWorkspace();
  }

  loadWorkspace() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage not available, fallback to in-memory state', e);
    }
    return { ...initialWorkspace };
  }

  getWorkspace() {
    return { ...this.workspace };
  }

  createWorkspace({ name, role, projectType }) {
    if (!name || !name.trim()) {
      throw new Error('Workspace name is required.');
    }

    this.workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      role: role || 'Lead Developer',
      projectType: projectType || 'Fullstack Application',
      created_at: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.workspace));
    } catch (e) {
      console.warn('Could not persist workspace to localStorage', e);
    }

    this.notify();
    return this.workspace;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.workspace);
      } catch (e) {
        console.error('Workspace listener error', e);
      }
    });
  }
}

export const workspaceService = new WorkspaceService();
