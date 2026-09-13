/**
 * DEVFLOW — Interactive Demo Dashboard Controller
 * Provides a functional, state-driven developer productivity workspace demo.
 */

import { workspaceService } from '../services/workspaceService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { toast } from './toast.js';

class DashboardController {
  constructor() {
    this.currentTab = 'overview';
    this.activeTaskFilter = 'all';
    this.searchQuery = '';
    this.container = null;
    this.isVisible = false;
  }

  init() {
    this.container = document.getElementById('devflow-interactive-dashboard');
    if (!this.container) return;

    // Subscriptions
    workspaceService.subscribe(() => this.render());
    projectService.subscribe(() => this.render());
    taskService.subscribe(() => this.render());

    // Navigation & Tab Switching
    const tabBtns = this.container.querySelectorAll('.dash-nav-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

    // Close Demo / Return to landing
    const closeBtns = this.container.querySelectorAll('.btn-close-demo');
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hide();
      });
    });

    // Global Demo Launch buttons
    const demoLaunchBtns = document.querySelectorAll('.launch-demo-btn, #btn-hero-demo, #btn-panel-demo');
    demoLaunchBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.show();
      });
    });

    // Initial render
    this.render();
  }

  show() {
    if (!this.container) return;
    this.isVisible = true;
    this.container.classList.add('active');
    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.render();
    toast.show('⚡ DevFlow Interactive Workspace loaded. Try creating a project or task!', 'info', 4000);
  }

  hide() {
    if (!this.container) return;
    this.isVisible = false;
    this.container.classList.remove('active');
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    const tabBtns = this.container.querySelectorAll('.dash-nav-btn');
    tabBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    this.renderTabContent();
  }

  render() {
    if (!this.container) return;
    const ws = workspaceService.getWorkspace();
    const stats = taskService.getStats();

    // Render Workspace Title & Role in Dashboard Header/Sidebar
    const wsNameEl = this.container.querySelector('.dash-ws-name');
    const wsRoleEl = this.container.querySelector('.dash-ws-role');
    const wsBadgeEl = this.container.querySelector('.dash-ws-badge');

    if (wsNameEl) wsNameEl.textContent = ws.name || 'DevFlow Workspace';
    if (wsRoleEl) wsRoleEl.textContent = `${ws.role || 'Staff Engineer'} • ${ws.projectType || 'Fullstack'}`;
    if (wsBadgeEl) wsBadgeEl.textContent = ws.name || 'Active Workspace';

    this.renderTabContent();
  }

  renderTabContent() {
    const mainContent = this.container.querySelector('.dash-main-viewport');
    if (!mainContent) return;

    if (this.currentTab === 'overview') {
      mainContent.innerHTML = this.getOverviewHtml();
      this.bindOverviewEvents();
    } else if (this.currentTab === 'projects') {
      mainContent.innerHTML = this.getProjectsHtml();
      this.bindProjectsEvents();
    } else if (this.currentTab === 'tasks') {
      mainContent.innerHTML = this.getTasksHtml();
      this.bindTasksEvents();
    } else if (this.currentTab === 'analytics') {
      mainContent.innerHTML = this.getAnalyticsHtml();
    }
  }

  // ==========================================
  // VIEW 1: OVERVIEW
  // ==========================================
  getOverviewHtml() {
    const stats = taskService.getStats();
    const projects = projectService.getProjects().slice(0, 3);
    const tasks = taskService.getTasks().slice(0, 5);

    return `
      <!-- Top Overview Metrics Bar -->
      <div class="dash-metrics-grid">
        
        <div class="dash-metric-card">
          <div class="dash-metric-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="dash-metric-info">
            <span class="dash-metric-num" id="stat-active-projects">${stats.activeProjectsCount}</span>
            <span class="dash-metric-label">Active Projects</span>
          </div>
        </div>

        <div class="dash-metric-card">
          <div class="dash-metric-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div class="dash-metric-info">
            <span class="dash-metric-num" id="stat-open-tasks">${stats.openTasksCount}</span>
            <span class="dash-metric-label">Open Tasks</span>
          </div>
        </div>

        <div class="dash-metric-card">
          <div class="dash-metric-icon emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="dash-metric-info">
            <span class="dash-metric-num" id="stat-completed-tasks">${stats.completedTasksCount}</span>
            <span class="dash-metric-label">Completed</span>
          </div>
        </div>

        <div class="dash-metric-card">
          <div class="dash-metric-icon mocha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div class="dash-metric-info">
            <span class="dash-metric-num" id="stat-overall-progress">${stats.overallProgressPercent}%</span>
            <span class="dash-metric-label">Overall Progress</span>
          </div>
          <div class="dash-progress-mini-bar">
            <div class="dash-progress-fill" style="width: ${stats.overallProgressPercent}%"></div>
          </div>
        </div>

      </div>

      <!-- Two Column Section: Recent Projects & Recent Tasks -->
      <div class="dash-split-grid">
        
        <!-- Left: Recent Projects -->
        <div class="dash-panel-box">
          <div class="dash-panel-head">
            <div>
              <h3 class="dash-panel-title">Recent Projects</h3>
              <p class="dash-panel-sub">Active developer workspaces &amp; repositories</p>
            </div>
            <button class="dash-btn-primary open-new-project-btn" aria-label="Create new project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>New Project</span>
            </button>
          </div>

          <div class="dash-projects-list">
            ${projects.map((p) => `
              <div class="dash-project-tile" data-project-id="${p.id}">
                <div class="dash-proj-color-bar" style="background-color: ${p.badgeColor || '#3b82f6'};"></div>
                <div class="dash-proj-details">
                  <div class="dash-proj-header">
                    <span class="dash-proj-title">${escapeHtml(p.name)}</span>
                    <span class="dash-status-pill ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>
                  </div>
                  <p class="dash-proj-desc">${escapeHtml(p.description)}</p>
                  <div class="dash-proj-meta">
                    <span class="dash-proj-tag">${escapeHtml(p.category || 'Engineering')}</span>
                    <span class="dash-proj-count">${taskService.getTasksByProject(p.id).length} tasks</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right: Recent Tasks -->
        <div class="dash-panel-box">
          <div class="dash-panel-head">
            <div>
              <h3 class="dash-panel-title">Recent Tasks</h3>
              <p class="dash-panel-sub">Click checkbox to complete / update progress</p>
            </div>
            <button class="dash-btn-primary open-new-task-btn" aria-label="Add new task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Add Task</span>
            </button>
          </div>

          <div class="dash-tasks-list">
            ${tasks.map((t) => `
              <div class="dash-task-item ${t.status === 'Completed' ? 'completed' : ''}" data-task-id="${t.id}">
                <button class="dash-task-check" aria-label="Toggle task status">
                  ${t.status === 'Completed' ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ` : ''}
                </button>
                <div class="dash-task-body">
                  <div class="dash-task-title">${escapeHtml(t.title)}</div>
                  <div class="dash-task-tags">
                    <span class="dash-task-proj-badge">${escapeHtml(t.projectName)}</span>
                    <span class="dash-priority-pill ${t.priority.toLowerCase()}">${t.priority}</span>
                    <span class="dash-due-date">Due ${t.dueDate || 'Soon'}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  bindOverviewEvents() {
    // Task check toggles
    const taskChecks = this.container.querySelectorAll('.dash-task-check');
    taskChecks.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskItem = btn.closest('.dash-task-item');
        const taskId = taskItem?.getAttribute('data-task-id');
        if (taskId) {
          const updated = taskService.toggleTaskComplete(taskId);
          if (updated) {
            if (updated.status === 'Completed') {
              toast.show(`✓ Task "${updated.title}" marked completed!`, 'success');
            } else {
              toast.show(`Task "${updated.title}" moved to Todo`, 'info');
            }
          }
        }
      });
    });
  }

  // ==========================================
  // VIEW 2: PROJECTS
  // ==========================================
  getProjectsHtml() {
    const projects = projectService.getProjects();

    return `
      <div class="dash-panel-box full-width">
        <div class="dash-panel-head">
          <div>
            <h3 class="dash-panel-title">All Workspace Projects</h3>
            <p class="dash-panel-sub">Manage and monitor repositories in your DevFlow cluster</p>
          </div>
          <button class="dash-btn-primary open-new-project-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ New Project</span>
          </button>
        </div>

        <div class="dash-projects-grid">
          ${projects.map((p) => {
            const pTasks = taskService.getTasksByProject(p.id);
            const pCompleted = pTasks.filter((t) => t.status === 'Completed').length;
            const pProgress = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;

            return `
              <div class="dash-proj-card">
                <div class="dash-proj-card-top">
                  <div class="dash-proj-avatar" style="background-color: ${p.badgeColor || '#3b82f6'};">
                    ${escapeHtml(p.name.substring(0, 2).toUpperCase())}
                  </div>
                  <span class="dash-status-pill ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>
                </div>
                <h4 class="dash-proj-card-title">${escapeHtml(p.name)}</h4>
                <p class="dash-proj-card-desc">${escapeHtml(p.description)}</p>
                
                <div class="dash-proj-card-progress">
                  <div class="dash-proj-prog-header">
                    <span>Progress</span>
                    <span>${pProgress}% (${pCompleted}/${pTasks.length})</span>
                  </div>
                  <div class="dash-progress-mini-bar">
                    <div class="dash-progress-fill" style="width: ${pProgress}%;"></div>
                  </div>
                </div>

                <div class="dash-proj-card-footer">
                  <span class="dash-proj-tag">${escapeHtml(p.category || 'Core')}</span>
                  <button class="dash-link-action open-new-task-btn" title="Add task to this project">
                    + Add Task
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  bindProjectsEvents() {
    // Custom actions inside project view if needed
  }

  // ==========================================
  // VIEW 3: TASKS
  // ==========================================
  getTasksHtml() {
    let tasks = taskService.getTasks();

    if (this.activeTaskFilter === 'todo') {
      tasks = tasks.filter((t) => t.status === 'Todo');
    } else if (this.activeTaskFilter === 'in-progress') {
      tasks = tasks.filter((t) => t.status === 'In Progress');
    } else if (this.activeTaskFilter === 'completed') {
      tasks = tasks.filter((t) => t.status === 'Completed');
    }

    return `
      <div class="dash-panel-box full-width">
        <div class="dash-panel-head">
          <div>
            <h3 class="dash-panel-title">Task Pipeline</h3>
            <p class="dash-panel-sub">Real-time issue tracking with automated commit linking</p>
          </div>
          <button class="dash-btn-primary open-new-task-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Add Task</span>
          </button>
        </div>

        <!-- Task Filter Pills -->
        <div class="dash-filter-row">
          <button class="dash-filter-pill ${this.activeTaskFilter === 'all' ? 'active' : ''}" data-filter="all">All Tasks (${taskService.getTasks().length})</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'todo' ? 'active' : ''}" data-filter="todo">To Do</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">In Progress</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'completed' ? 'active' : ''}" data-filter="completed">Completed (${taskService.getStats().completedTasksCount})</button>
        </div>

        <div class="dash-tasks-table">
          ${tasks.length === 0 ? `
            <div class="dash-empty-state">
              <p>No tasks match this filter.</p>
              <button class="dash-btn-secondary open-new-task-btn">+ Create First Task</button>
            </div>
          ` : tasks.map((t) => `
            <div class="dash-task-row ${t.status === 'Completed' ? 'completed' : ''}" data-task-id="${t.id}">
              <button class="dash-task-check" aria-label="Toggle task status">
                ${t.status === 'Completed' ? `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ` : ''}
              </button>
              <div class="dash-task-col-title">
                <span class="dash-task-name">${escapeHtml(t.title)}</span>
              </div>
              <div class="dash-task-col-proj">
                <span class="dash-task-proj-badge">${escapeHtml(t.projectName)}</span>
              </div>
              <div class="dash-task-col-priority">
                <span class="dash-priority-pill ${t.priority.toLowerCase()}">${t.priority}</span>
              </div>
              <div class="dash-task-col-status">
                <span class="dash-status-pill ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span>
              </div>
              <div class="dash-task-col-due">
                <span>${t.dueDate || '—'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindTasksEvents() {
    // Task Filter Buttons
    const filterBtns = this.container.querySelectorAll('.dash-filter-pill');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTaskFilter = btn.getAttribute('data-filter') || 'all';
        this.renderTabContent();
      });
    });

    // Checkbox completions
    const checks = this.container.querySelectorAll('.dash-task-check');
    checks.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('[data-task-id]');
        const taskId = row?.getAttribute('data-task-id');
        if (taskId) {
          const updated = taskService.toggleTaskComplete(taskId);
          if (updated) {
            if (updated.status === 'Completed') {
              toast.show(`✓ "${updated.title}" marked completed!`, 'success');
            } else {
              toast.show(`"${updated.title}" moved to Todo`, 'info');
            }
            this.renderTabContent();
          }
        }
      });
    });
  }

  // ==========================================
  // VIEW 4: ANALYTICS
  // ==========================================
  getAnalyticsHtml() {
    return `
      <div class="dash-panel-box full-width">
        <div class="dash-panel-head">
          <div>
            <h3 class="dash-panel-title">Developer Velocity &amp; Telemetry</h3>
            <p class="dash-panel-sub">Continuous monitoring across build nodes and edge regions</p>
          </div>
          <span class="dash-status-pill active">⚡ Live Stream (35 Nodes)</span>
        </div>

        <div class="dash-analytics-grid">
          
          <div class="dash-telemetry-card">
            <span class="telemetry-label">Average Build Latency</span>
            <span class="telemetry-metric">38 ms</span>
            <span class="telemetry-badge positive">↓ 42% vs last release</span>
            <div class="telemetry-bars">
              <div class="t-bar" style="height: 40%"></div>
              <div class="t-bar" style="height: 65%"></div>
              <div class="t-bar" style="height: 50%"></div>
              <div class="t-bar" style="height: 30%"></div>
              <div class="t-bar" style="height: 22%"></div>
            </div>
          </div>

          <div class="dash-telemetry-card">
            <span class="telemetry-label">Deployment Frequency</span>
            <span class="telemetry-metric">4.8 / day</span>
            <span class="telemetry-badge positive">↑ 18% team throughput</span>
            <div class="telemetry-bars">
              <div class="t-bar" style="height: 30%"></div>
              <div class="t-bar" style="height: 45%"></div>
              <div class="t-bar" style="height: 70%"></div>
              <div class="t-bar" style="height: 85%"></div>
              <div class="t-bar" style="height: 95%"></div>
            </div>
          </div>

          <div class="dash-telemetry-card">
            <span class="telemetry-label">CI/CD Pass Rate</span>
            <span class="telemetry-metric">99.8%</span>
            <span class="telemetry-badge positive">Zero breaking rollouts</span>
            <div class="telemetry-bars">
              <div class="t-bar" style="height: 95%"></div>
              <div class="t-bar" style="height: 98%"></div>
              <div class="t-bar" style="height: 99%"></div>
              <div class="t-bar" style="height: 100%"></div>
              <div class="t-bar" style="height: 100%"></div>
            </div>
          </div>

        </div>

        <div class="dash-terminal-stream">
          <div class="dash-stream-header">
            <span>Edge Cluster Telemetry Log</span>
            <span class="dash-stream-dot"></span>
          </div>
          <div class="dash-stream-body">
            <code>[12:28:44] [US-EAST] Node-04: Canary build healthy (2.1ms p99)</code>
            <code>[12:28:50] [EU-CENTRAL] Node-12: Incremental cache hit ratio: 98.4%</code>
            <code>[12:29:02] [AP-SOUTHEAST] Node-09: Live branch preview session bridged</code>
            <code>[12:29:15] [GLOBAL] Database RLS rule replication complete [0 errors]</code>
          </div>
        </div>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
}

export const dashboard = new DashboardController();
