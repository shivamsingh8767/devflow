/**
 * DEVFLOW — Task Service
 * Abstracted data layer for task operations & real-time statistics backed by Supabase (public.tasks).
 * 
 * Schema:
 * public.tasks (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   priority TEXT DEFAULT 'Medium',
 *   status TEXT DEFAULT 'Todo',
 *   due_date DATE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * )
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { authService } from './authService.js';
import { projectService } from './projectService.js';

class TaskService {
  constructor() {
    this.storageKey = 'devflow_local_tasks';
    this.listeners = new Set();
    this.tasks = [];
    this.isLoading = false;
    this.error = null;
    this.realtimeChannel = null;
  }

  async init() {
    projectService.subscribe(async (projects) => {
      const projectIds = (projects || []).map((p) => p.id);
      if (projectIds.length > 0) {
        await this.fetchTasks(projectIds);
        this.setupRealtime(projectIds);
      } else {
        this.tasks = [];
        this.cleanupRealtime();
        this.notify();
      }
    });

    const currentProjects = projectService.getProjects();
    const projectIds = currentProjects.map((p) => p.id);
    if (projectIds.length > 0) {
      await this.fetchTasks(projectIds);
      this.setupRealtime(projectIds);
    }
  }

  getTasks() {
    return [...this.tasks];
  }

  getTasksByProject(projectId) {
    return this.tasks.filter((t) => t.project_id === projectId || t.projectId === projectId);
  }

  getTasksForProject(projectId) {
    return this.getTasksByProject(projectId);
  }

  getTask(id) {
    return this.getTaskById(id);
  }

  getTaskById(id) {
    return this.tasks.find((t) => t.id === id) || null;
  }

  async fetchTasks(projectIds) {
    if (!projectIds || projectIds.length === 0) {
      this.tasks = [];
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
          .from('tasks')
          .select('id, project_id, title, priority, status, due_date, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase tasks fetch notice:', error.message || error);
          this.error = 'Unable to load tasks.';
          this.tasks = [];
        } else {
          this.tasks = (data || []).map((t) => {
            const proj = projectService.getProjectById(t.project_id);
            return {
              ...t,
              projectId: t.project_id,
              projectName: proj ? proj.name : 'Project',
              dueDate: t.due_date,
              status: this.normalizeStatus(t.status)
            };
          });
        }
      } catch (err) {
        console.error('Tasks query notice:', err);
        this.error = 'Unable to load tasks.';
        this.tasks = [];
      } finally {
        this.isLoading = false;
        this.notify();
      }
    } else {
      // Local fallback for offline/demo testing
      this.isLoading = false;
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        this.tasks = saved.filter((t) => projectIds.includes(t.project_id || t.projectId));
      } catch (e) {
        console.warn(e);
        this.tasks = [];
      }
      this.notify();
    }

    return this.tasks;
  }

  normalizeStatus(status) {
    if (!status) return 'Todo';
    const lower = String(status).toLowerCase();
    if (lower === 'completed') return 'Completed';
    if (lower === 'in progress' || lower === 'in_progress') return 'In Progress';
    if (lower === 'cancelled') return 'Cancelled';
    return 'Todo';
  }

  /**
   * Create a task in public.tasks in Supabase
   */
  async createTask({ title, projectId, priority, status, dueDate }) {
    if (!title || !title.trim()) {
      throw new Error('Please enter a task title.');
    }

    const session = await authService.getValidSession();
    const user = session?.user || authService.getUser();
    if (!user || !user.id) {
      throw new Error('Please sign in to create tasks.');
    }

    const projects = projectService.getProjects();
    const targetProject = (projectId && projectService.getProjectById(projectId)) || projects[0];

    if (!targetProject) {
      throw new Error('Please create a project first before adding tasks.');
    }

    const trimmedTitle = title.trim();
    const cleanPriority = priority || 'Medium';
    const cleanStatus = status || 'Todo';
    const cleanDueDate = dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            project_id: targetProject.id,
            title: trimmedTitle,
            priority: cleanPriority,
            status: cleanStatus,
            due_date: cleanDueDate
          }
        ])
        .select('id, project_id, title, priority, status, due_date, created_at')
        .single();

      if (error) {
        console.error('Supabase task creation notice:', error.message || error);
        if (error.message && /row-level security/i.test(error.message)) {
          throw new Error('Authentication session expired or unauthorized. Please sign in again.');
        }
        throw new Error(error.message || 'Error creating task in Supabase.');
      }

      const newTask = {
        ...data,
        projectId: data.project_id,
        projectName: targetProject.name,
        dueDate: data.due_date,
        status: this.normalizeStatus(data.status)
      };

      this.tasks = [newTask, ...this.tasks.filter((t) => t.id !== newTask.id)];
      this.notify();
      return newTask;
    } else {
      const newTask = {
        id: `task-${Date.now()}`,
        project_id: targetProject.id,
        projectId: targetProject.id,
        projectName: targetProject.name,
        title: trimmedTitle,
        priority: cleanPriority,
        status: cleanStatus,
        due_date: cleanDueDate,
        dueDate: cleanDueDate,
        created_at: new Date().toISOString()
      };

      this.tasks.unshift(newTask);
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        saved.unshift(newTask);
        localStorage.setItem(this.storageKey, JSON.stringify(saved));
      } catch (e) {
        console.warn(e);
      }

      this.notify();
      return newTask;
    }
  }

  // Alias for backward compatibility
  async addTask(taskData) {
    return this.createTask(taskData);
  }

  async updateTask(id, { title, priority, status, dueDate }) {
    if (!id) throw new Error('Task ID is required for update.');
    await authService.getValidSession();

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (priority !== undefined) updatePayload.priority = priority;
    if (status !== undefined) updatePayload.status = this.normalizeStatus(status);
    if (dueDate !== undefined) updatePayload.due_date = dueDate;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', id)
        .select('id, project_id, title, priority, status, due_date, created_at')
        .single();

      if (error) {
        console.error('Supabase task update notice:', error.message || error);
        throw new Error(error.message || 'Error updating task in Supabase.');
      }

      const proj = projectService.getProjectById(data.project_id);
      const updated = {
        ...data,
        projectId: data.project_id,
        projectName: proj ? proj.name : 'Project',
        dueDate: data.due_date,
        status: this.normalizeStatus(data.status)
      };

      this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t));
      this.notify();
      return updated;
    } else {
      const taskIndex = this.tasks.findIndex((t) => t.id === id);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updatePayload };
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
        } catch (e) {
          console.warn(e);
        }
        this.notify();
        return this.tasks[taskIndex];
      }
      return null;
    }
  }

  async toggleTaskComplete(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    const newStatus = task.status === 'Completed' ? 'Todo' : 'Completed';
    return await this.updateTaskStatus(id, newStatus);
  }

  async updateTaskStatus(id, newStatus) {
    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) return null;

    const normalized = this.normalizeStatus(newStatus);
    await authService.getValidSession();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: normalized })
        .eq('id', id)
        .select('id, project_id, title, priority, status, due_date, created_at')
        .single();

      if (error) {
        console.error('Supabase task status update notice:', error.message || error);
        throw new Error(error.message || 'Error updating task status.');
      }

      const proj = projectService.getProjectById(data.project_id);
      const updated = {
        ...this.tasks[taskIndex],
        ...data,
        projectId: data.project_id,
        projectName: proj ? proj.name : this.tasks[taskIndex].projectName,
        dueDate: data.due_date,
        status: normalized
      };
      this.tasks[taskIndex] = updated;
      this.notify();
      return updated;
    } else {
      this.tasks[taskIndex].status = normalized;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
      } catch (e) {
        console.warn(e);
      }
      this.notify();
      return this.tasks[taskIndex];
    }
  }

  async deleteTask(id) {
    if (!id) return;
    await authService.getValidSession();

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase task deletion notice:', error.message || error);
        throw new Error(error.message || 'Error deleting task.');
      }
    }

    this.tasks = this.tasks.filter((t) => t.id !== id);
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const filtered = saved.filter((t) => t.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn(e);
    }
    this.notify();
  }

  setupRealtime(projectIds) {
    if (!isSupabaseConfigured() || !projectIds || projectIds.length === 0) return;
    this.cleanupRealtime();

    try {
      this.realtimeChannel = supabase
        .channel('public:tasks:all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (_payload) => {
            const currentProjects = projectService.getProjects();
            const ids = currentProjects.map((p) => p.id);
            if (ids.length > 0) {
              this.fetchTasks(ids);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error for tasks:', err);
    }
  }

  cleanupRealtime() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  getStats() {
    const projects = projectService.getProjects();
    const activeProjects = projects.filter((p) => p.status !== 'Archived').length;

    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.status === 'Completed' || t.status === 'completed').length;
    const openTasks = totalTasks - completedTasks;

    // Calculated percentage from actual records
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      activeProjectsCount: activeProjects,
      totalTasksCount: totalTasks,
      openTasksCount: openTasks,
      completedTasksCount: completedTasks,
      overallProgressPercent: overallProgress
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(this.getTasks(), stats, {
          isLoading: this.isLoading,
          error: this.error
        });
      } catch (e) {
        console.error('Task listener error', e);
      }
    });
  }
}

export const taskService = new TaskService();
