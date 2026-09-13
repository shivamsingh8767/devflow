/**
 * DEVFLOW — Project Service
 * Abstracted data layer for project operations (Supabase ready).
 */

import { initialProjects } from '../data/demoData.js';

class ProjectService {
  constructor() {
    this.storageKey = 'devflow_projects';
    this.listeners = new Set();
    this.projects = this.loadProjects();
  }

  loadProjects() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage not available, fallback to default demo projects', e);
    }
    return [...initialProjects];
  }

  persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Could not persist projects to localStorage', e);
    }
  }

  getProjects() {
    return [...this.projects];
  }

  getProjectById(id) {
    return this.projects.find((p) => p.id === id) || null;
  }

  addProject({ name, description, status, category }) {
    if (!name || !name.trim()) {
      throw new Error('Please enter a project name.');
    }

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const randomColor = colors[this.projects.length % colors.length];

    const newProject = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: description ? description.trim() : 'Active developer workspace project.',
      status: status || 'Active',
      category: category || 'Productivity',
      badgeColor: randomColor,
      tasksCount: 0,
      completedTasksCount: 0,
      created_at: new Date().toISOString()
    };

    // Prepend to project list
    this.projects.unshift(newProject);
    this.persist();
    this.notify();
    return newProject;
  }

  deleteProject(id) {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      const removed = this.projects.splice(index, 1)[0];
      this.persist();
      this.notify();
      return removed;
    }
    return null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getProjects());
      } catch (e) {
        console.error('Project listener error', e);
      }
    });
  }
}

export const projectService = new ProjectService();
