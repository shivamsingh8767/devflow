/**
 * DEVFLOW — Task Service
 * Abstracted data layer for task operations and progress calculations.
 */

import { initialTasks } from '../data/demoData.js';
import { projectService } from './projectService.js';

class TaskService {
  constructor() {
    this.storageKey = 'devflow_tasks';
    this.listeners = new Set();
    this.tasks = this.loadTasks();
  }

  loadTasks() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage not available, fallback to initial tasks', e);
    }
    return [...initialTasks];
  }

  persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('Could not persist tasks to localStorage', e);
    }
  }

  getTasks() {
    return [...this.tasks];
  }

  getTasksByProject(projectId) {
    return this.tasks.filter((t) => t.projectId === projectId);
  }

  getTaskById(id) {
    return this.tasks.find((t) => t.id === id) || null;
  }

  addTask({ title, projectId, priority, status, dueDate }) {
    if (!title || !title.trim()) {
      throw new Error('Please enter a task title.');
    }

    const project = projectService.getProjectById(projectId) || projectService.getProjects()[0];
    const targetProjectId = project ? project.id : 'proj-1';
    const targetProjectName = project ? project.name : 'LifeQuest';

    const newTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      projectId: targetProjectId,
      projectName: targetProjectName,
      priority: priority || 'Medium',
      status: status || 'Todo',
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    this.tasks.unshift(newTask);
    this.persist();
    this.notify();
    return newTask;
  }

  toggleTaskComplete(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    if (task.status === 'Completed') {
      task.status = 'Todo';
    } else {
      task.status = 'Completed';
    }

    this.persist();
    this.notify();
    return task;
  }

  updateTaskStatus(id, newStatus) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    task.status = newStatus;
    this.persist();
    this.notify();
    return task;
  }

  deleteTask(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const removed = this.tasks.splice(index, 1)[0];
      this.persist();
      this.notify();
      return removed;
    }
    return null;
  }

  getStats() {
    const projects = projectService.getProjects();
    const activeProjects = projects.filter((p) => p.status !== 'Archived').length;

    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.status === 'Completed').length;
    const openTasks = totalTasks - completedTasks;

    // Overall progress percentage
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
        listener(this.getTasks(), stats);
      } catch (e) {
        console.error('Task listener error', e);
      }
    });
  }
}

export const taskService = new TaskService();
