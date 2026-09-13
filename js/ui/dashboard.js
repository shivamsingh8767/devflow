/**
 * DEVFLOW — Interactive Workspace Dashboard Controller
 * Fully integrated with Supabase data layer (Workspaces, Projects, Tasks).
 */

import { workspaceService } from '../services/workspaceService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { authService } from '../services/authService.js';
import { googleAuthService } from '../services/googleAuthService.js';
import { googleChatService } from '../services/googleChatService.js';
import { toast } from './toast.js';

class DashboardController {
  constructor() {
    this.currentTab = 'overview';
    this.activeTaskFilter = 'all';
    this.searchQuery = '';
    this.container = null;
    this.isVisible = false;
    this.isGoogleSigningIn = false;
  }

  async init() {
    this.container = document.getElementById('devflow-interactive-dashboard');
    if (!this.container) return;

    // Subscriptions to Reactive Services
    workspaceService.subscribe((_ws, _workspaces, state) => {
      this.render(state);
    });

    projectService.subscribe((_projects, state) => {
      this.render(state);
    });

    taskService.subscribe((_tasks, _stats, state) => {
      this.render(state);
    });

    authService.subscribe((_user) => {
      this.render();
    });

    googleAuthService.subscribe((user, token) => {
      if (this.currentTab === 'chat') {
        if (token) {
          googleChatService.fetchSpaces();
        }
        this.renderTabContent();
      }
    });

    googleChatService.subscribe(() => {
      if (this.currentTab === 'chat') {
        this.renderTabContent();
      }
    });

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

  render(state = {}) {
    if (!this.container) return;
    const ws = workspaceService.getWorkspace();

    // Render Workspace Title & Role in Dashboard Header/Sidebar
    const wsNameEl = this.container.querySelector('.dash-ws-name');
    const wsRoleEl = this.container.querySelector('.dash-ws-role');
    const wsBadgeEl = this.container.querySelector('.dash-ws-badge');
    const wsAvatarEl = this.container.querySelector('.dash-ws-avatar');

    const displayName = ws?.name || 'DevFlow Workspace';
    const displayRole = ws ? `${ws.role || 'Platform Engineer'} • ${ws.projectType || ws.project_type || 'Cloud Platform'}` : 'Configure Workspace';

    if (wsNameEl) wsNameEl.textContent = displayName;
    if (wsRoleEl) wsRoleEl.textContent = displayRole;
    if (wsBadgeEl) wsBadgeEl.textContent = displayName;
    if (wsAvatarEl) {
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'DF';
      wsAvatarEl.textContent = initials;
    }

    this.renderTabContent(state);
  }

  renderTabContent(state = {}) {
    const mainContent = this.container.querySelector('.dash-main-viewport');
    if (!mainContent) return;

    if (state.isLoading) {
      mainContent.innerHTML = this.getLoadingSkeletonHtml();
      return;
    }

    if (state.error) {
      mainContent.innerHTML = this.getErrorHtml(state.error);
      this.bindErrorEvents();
      return;
    }

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
    } else if (this.currentTab === 'chat') {
      mainContent.innerHTML = this.getChatHtml();
      this.bindChatEvents();
    }
  }

  getLoadingSkeletonHtml() {
    return `
      <div class="dash-loading-state" role="status" aria-label="Loading workspace data">
        <div class="dash-metrics-grid">
          <div class="dash-metric-card skeleton-card"></div>
          <div class="dash-metric-card skeleton-card"></div>
          <div class="dash-metric-card skeleton-card"></div>
          <div class="dash-metric-card skeleton-card"></div>
        </div>
        <div class="dash-split-grid" style="margin-top: 1.25rem;">
          <div class="dash-panel-box skeleton-box" style="height: 280px;"></div>
          <div class="dash-panel-box skeleton-box" style="height: 280px;"></div>
        </div>
      </div>
    `;
  }

  getErrorHtml(errorMsg) {
    return `
      <div class="dash-panel-box full-width" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <h3 class="dash-panel-title" style="margin-bottom: 0.5rem;">Something went wrong while loading your workspace.</h3>
        <p class="dash-panel-sub" style="margin-bottom: 1.5rem; max-width: 460px; margin-left: auto; margin-right: auto;">
          ${escapeHtml(errorMsg || 'Please verify your network connection and database synchronization.')}
        </p>
        <button class="dash-btn-primary btn-retry-fetch" style="margin: 0 auto;">
          <span>Try Again</span>
        </button>
      </div>
    `;
  }

  bindErrorEvents() {
    const retryBtn = this.container.querySelector('.btn-retry-fetch');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        workspaceService.fetchWorkspaces();
      });
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
              <span>+ New Project</span>
            </button>
          </div>

          <div class="dash-projects-list">
            ${projects.length === 0 ? `
              <div class="dash-empty-state">
                <div class="dash-empty-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <p class="dash-empty-title">No projects yet</p>
                <p class="dash-empty-sub">Create your first repository to track architecture and issues.</p>
                <button class="dash-btn-secondary open-new-project-btn" style="margin-top: 10px;">+ New Project</button>
              </div>
            ` : projects.map((p) => {
              const pTasks = taskService.getTasksByProject(p.id);
              return `
                <div class="dash-project-tile" data-project-id="${p.id}">
                  <div class="dash-proj-color-bar" style="background-color: ${p.badgeColor || '#3b82f6'};"></div>
                  <div class="dash-proj-details">
                    <div class="dash-proj-header">
                      <span class="dash-proj-title">${escapeHtml(p.name)}</span>
                      <span class="dash-status-pill ${(p.status || 'Active').toLowerCase().replace(' ', '-')}">${p.status || 'Active'}</span>
                    </div>
                    <p class="dash-proj-desc">${escapeHtml(p.description || 'Active repository.')}</p>
                    <div class="dash-proj-meta">
                      <span class="dash-proj-tag">${escapeHtml(p.category || 'Productivity')}</span>
                      <span class="dash-proj-count">${pTasks.length} tasks</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
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
              <span>+ Add Task</span>
            </button>
          </div>

          <div class="dash-tasks-list">
            ${tasks.length === 0 ? `
              <div class="dash-empty-state">
                <div class="dash-empty-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                </div>
                <p class="dash-empty-title">No tasks yet</p>
                <p class="dash-empty-sub">Add issues and engineering tasks to monitor sprint velocity.</p>
                <button class="dash-btn-secondary open-new-task-btn" style="margin-top: 10px;">+ Add Task</button>
              </div>
            ` : tasks.map((t) => `
              <div class="dash-task-item ${t.status === 'Completed' ? 'completed' : ''}" data-task-id="${t.id}">
                <button class="dash-task-check" aria-label="Toggle task status">
                  ${t.status === 'Completed' ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ` : ''}
                </button>
                <div class="dash-task-body">
                  <div class="dash-task-title">${escapeHtml(t.title)}</div>
                  <div class="dash-task-tags">
                    <span class="dash-task-proj-badge">${escapeHtml(t.projectName || 'Project')}</span>
                    <span class="dash-priority-pill ${(t.priority || 'Medium').toLowerCase()}">${t.priority || 'Medium'}</span>
                    <span class="dash-due-date">Due ${t.dueDate || t.due_date || 'Soon'}</span>
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
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskItem = btn.closest('.dash-task-item');
        const taskId = taskItem?.getAttribute('data-task-id');
        if (taskId) {
          try {
            const updated = await taskService.toggleTaskComplete(taskId);
            if (updated) {
              if (updated.status === 'Completed') {
                toast.show(`✓ Task "${updated.title}" marked completed!`, 'success');
              } else {
                toast.show(`Task "${updated.title}" moved to Todo`, 'info');
              }
            }
          } catch (err) {
            toast.show('Error updating task status', 'error');
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

        ${projects.length === 0 ? `
          <div class="dash-empty-state" style="padding: 3.5rem 1rem;">
            <div class="dash-empty-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h4 class="dash-empty-title">No projects yet</h4>
            <p class="dash-empty-sub">Get started by creating your first project in this workspace.</p>
            <button class="dash-btn-primary open-new-project-btn" style="margin: 1rem auto 0;">+ Create Project</button>
          </div>
        ` : `
          <div class="dash-projects-grid">
            ${projects.map((p) => {
              const pTasks = taskService.getTasksByProject(p.id);
              const pCompleted = pTasks.filter((t) => t.status === 'Completed' || t.status === 'completed').length;
              const pProgress = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;

              return `
                <div class="dash-proj-card">
                  <div class="dash-proj-card-top">
                    <div class="dash-proj-avatar" style="background-color: ${p.badgeColor || '#3b82f6'};">
                      ${escapeHtml(p.name.substring(0, 2).toUpperCase())}
                    </div>
                    <span class="dash-status-pill ${(p.status || 'Active').toLowerCase().replace(' ', '-')}">${p.status || 'Active'}</span>
                  </div>
                  <h4 class="dash-proj-card-title">${escapeHtml(p.name)}</h4>
                  <p class="dash-proj-card-desc">${escapeHtml(p.description || 'Active repository.')}</p>
                  
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
                    <span class="dash-proj-tag">${escapeHtml(p.category || 'Productivity')}</span>
                    <button class="dash-link-action open-new-task-btn" data-project-id="${p.id}" title="Add task to this project">
                      + Add Task
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  bindProjectsEvents() {
    // Event bindings handled by global modal triggers
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

    const allTasksCount = taskService.getTasks().length;
    const completedCount = taskService.getStats().completedTasksCount;

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
          <button class="dash-filter-pill ${this.activeTaskFilter === 'all' ? 'active' : ''}" data-filter="all">All Tasks (${allTasksCount})</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'todo' ? 'active' : ''}" data-filter="todo">To Do</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">In Progress</button>
          <button class="dash-filter-pill ${this.activeTaskFilter === 'completed' ? 'active' : ''}" data-filter="completed">Completed (${completedCount})</button>
        </div>

        <div class="dash-tasks-table">
          ${tasks.length === 0 ? `
            <div class="dash-empty-state">
              <div class="dash-empty-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <p class="dash-empty-title">No tasks yet.</p>
              <p class="dash-empty-sub">Create your first task to track progress and sprint velocity.</p>
              <button class="dash-btn-secondary open-new-task-btn" style="margin-top: 10px;">+ Add Task</button>
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
                <span class="dash-task-proj-badge">${escapeHtml(t.projectName || 'Project')}</span>
              </div>
              <div class="dash-task-col-priority">
                <span class="dash-priority-pill ${(t.priority || 'Medium').toLowerCase()}">${t.priority || 'Medium'}</span>
              </div>
              <div class="dash-task-col-status">
                <span class="dash-status-pill ${(t.status || 'Todo').toLowerCase().replace(' ', '-')}">${t.status || 'Todo'}</span>
              </div>
              <div class="dash-task-col-due">
                <span>${t.dueDate || t.due_date || '—'}</span>
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
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('[data-task-id]');
        const taskId = row?.getAttribute('data-task-id');
        if (taskId) {
          try {
            const updated = await taskService.toggleTaskComplete(taskId);
            if (updated) {
              if (updated.status === 'Completed') {
                toast.show(`✓ "${updated.title}" marked completed!`, 'success');
              } else {
                toast.show(`"${updated.title}" moved to Todo`, 'info');
              }
            }
          } catch (err) {
            toast.show('Error updating task', 'error');
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

  // ==========================================
  // VIEW 5: GOOGLE CHAT
  // ==========================================
  getChatHtml() {
    const isConnected = googleAuthService.isConnected();
    const googleUser = googleAuthService.getGoogleUser();
    const { spaces, activeSpace, messages, isLoadingSpaces, isLoadingMessages, error } =
      googleChatService;

    if (!isConnected) {
      return `
        <div class="dash-chat-auth-card">
          <div class="dash-chat-auth-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 class="dash-panel-title" style="margin-bottom: 0.5rem; font-size: 1.25rem;">Connect Google Chat</h3>
          <p class="dash-panel-sub" style="margin-bottom: 1.75rem; line-height: 1.5;">
            Collaborate in real-time Chat Spaces, post project status reports, and sync team discussion threads with permission from your Google account.
          </p>

          <button class="gsi-material-button btn-google-signin" id="btn-google-chat-signin" type="button" aria-label="Sign in with Google">
            <div class="gsi-material-button-state"></div>
            <div class="gsi-material-button-content-wrapper">
              <div class="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display: block;">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span class="gsi-material-button-contents">Sign in with Google</span>
              <span style="display: none;">Sign in with Google</span>
            </div>
          </button>
        </div>
      `;
    }

    return `
      <!-- Google Chat Connected Workspace -->
      <div class="dash-panel-box full-width" style="padding: 0; overflow: hidden; background: #f8fafc;">
        
        <!-- Top Status Bar -->
        <div style="padding: 0.875rem 1.25rem; background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
              ${escapeHtml((googleUser?.displayName || googleUser?.email || 'G')[0].toUpperCase())}
            </div>
            <div>
              <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <span>${escapeHtml(googleUser?.displayName || 'Google Workspace User')}</span>
                <span class="dash-status-pill active" style="font-size: 0.6rem;">Connected</span>
              </div>
              <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(googleUser?.email || '')}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="dash-btn-secondary btn-chat-refresh" title="Refresh Google Chat spaces" style="padding: 6px 12px; font-size: 0.75rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Refresh</span>
            </button>
            <button class="dash-btn-secondary btn-chat-disconnect" style="padding: 6px 12px; font-size: 0.75rem; color: #dc2626;">
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        <!-- Main 2-Column Chat Layout -->
        <div class="dash-chat-layout" style="padding: 1.25rem;">
          
          <!-- Left Column: Spaces List -->
          <div class="dash-chat-sidebar">
            <div class="dash-chat-sidebar-header">
              <span class="dash-chat-sidebar-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Spaces (${spaces.length})</span>
              </span>
              <button class="dash-link-action btn-open-create-space" style="font-size: 0.75rem;">+ New Space</button>
            </div>

            <div class="dash-chat-spaces-list">
              ${isLoadingSpaces ? `
                <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                  Loading Google Chat spaces...
                </div>
              ` : spaces.length === 0 ? `
                <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                  <p style="margin-bottom: 0.5rem;">No spaces found.</p>
                  <button class="dash-btn-primary btn-open-create-space" style="font-size: 0.75rem; padding: 6px 12px; margin: 0 auto;">
                    + Create First Space
                  </button>
                </div>
              ` : spaces.map((s) => {
                const isSelected = activeSpace && activeSpace.name === s.name;
                const displayName = s.displayName || s.name?.split('/').pop() || 'Untitled Space';
                const spaceType = s.spaceType || (s.type === 'ROOM' ? 'SPACE' : 'CHAT');
                return `
                  <button class="dash-space-item ${isSelected ? 'active' : ''}" data-space-name="${escapeHtml(s.name)}">
                    <div class="dash-space-avatar">
                      ${spaceType === 'SPACE' ? '#' : '@'}
                    </div>
                    <div class="dash-space-details">
                      <div class="dash-space-name">${escapeHtml(displayName)}</div>
                      <div class="dash-space-meta">${escapeHtml(spaceType)}</div>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right Column: Active Space Conversation & Composer -->
          <div class="dash-chat-main">
            ${!activeSpace ? `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); padding: 2rem; text-align: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Select a Space</div>
                <div style="font-size: 0.8125rem;">Choose a Google Chat space from the left to read and post messages.</div>
              </div>
            ` : `
              <!-- Active Space Header -->
              <div class="dash-chat-header">
                <div class="dash-chat-active-info">
                  <div class="dash-space-avatar" style="width: 36px; height: 36px; font-size: 0.875rem;">
                    ${activeSpace.spaceType === 'SPACE' ? '#' : '@'}
                  </div>
                  <div>
                    <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary);">
                      ${escapeHtml(activeSpace.displayName || activeSpace.name)}
                    </div>
                    <div style="font-size: 0.6875rem; color: var(--text-muted);">
                      ${escapeHtml(activeSpace.spaceType || 'Google Chat Space')}
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 6px;">
                  <button class="dash-btn-secondary btn-share-sprint" title="Share Sprint Update to this space" style="padding: 5px 10px; font-size: 0.6875rem;">
                    📢 Share Sprint
                  </button>
                </div>
              </div>

              <!-- Message History Scrollbox -->
              <div class="dash-chat-messages" id="dash-chat-messages-container">
                ${isLoadingMessages ? `
                  <div style="padding: 3rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    Loading messages...
                  </div>
                ` : messages.length === 0 ? `
                  <div style="padding: 3rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💬</div>
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">No messages yet</div>
                    <div>Be the first to post a message or project update to this space.</div>
                  </div>
                ` : messages.map((m) => {
                  const author = m.sender?.displayName || m.sender?.name?.split('/').pop() || 'User';
                  const isSelf = m.sender?.email === googleUser?.email || m.sender?.name === googleUser?.uid;
                  const time = m.createTime ? new Date(m.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return `
                    <div class="dash-chat-msg ${isSelf ? 'self' : ''}">
                      <div class="dash-msg-avatar">
                        ${escapeHtml(author[0].toUpperCase())}
                      </div>
                      <div>
                        <div class="dash-msg-header">
                          <span class="dash-msg-author">${escapeHtml(author)}</span>
                          <span class="dash-msg-time">${escapeHtml(time)}</span>
                        </div>
                        <div class="dash-msg-bubble">
                          ${escapeHtml(m.text || '')}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Chat Input & Quick Action Chips -->
              <div class="dash-chat-input-area">
                <div class="dash-chat-quick-actions">
                  <span style="font-size: 0.6875rem; color: var(--text-muted); align-self: center;">Quick Post:</span>
                  <button class="dash-quick-chip quick-chip-status" type="button">⚡ Project Status</button>
                  <button class="dash-quick-chip quick-chip-tasks" type="button">📋 Active Tasks</button>
                  <button class="dash-quick-chip quick-chip-deploy" type="button">🚀 Release Preview</button>
                </div>

                <form class="dash-chat-form" id="dash-chat-form">
                  <input
                    type="text"
                    id="dash-chat-input-text"
                    class="dash-chat-input"
                    placeholder="Message #${escapeHtml(activeSpace.displayName || 'space')}..."
                    autocomplete="off"
                  />
                  <button type="submit" class="dash-chat-send-btn" id="dash-chat-send-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    <span>Send</span>
                  </button>
                </form>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  bindChatEvents() {
    // 1. Google Sign-In button
    const signinBtn = this.container.querySelector('#btn-google-chat-signin');
    if (signinBtn) {
      signinBtn.addEventListener('click', async () => {
        try {
          signinBtn.disabled = true;
          toast.show('Connecting to Google Chat...', 'info');
          await googleAuthService.signInWithGoogle();
          toast.show('✓ Connected to Google Chat successfully!', 'success');
          await googleChatService.fetchSpaces();
          this.renderTabContent();
        } catch (err) {
          console.error('Sign in error:', err);
          toast.show(err.message || 'Google Chat sign-in was cancelled or failed.', 'error');
        } finally {
          signinBtn.disabled = false;
        }
      });
    }

    // 2. Disconnect button
    const disconnectBtn = this.container.querySelector('.btn-chat-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', async () => {
        if (confirm('Disconnect Google Chat integration?')) {
          await googleAuthService.signOut();
          toast.show('Disconnected from Google Chat', 'info');
          this.renderTabContent();
        }
      });
    }

    // 3. Refresh button
    const refreshBtn = this.container.querySelector('.btn-chat-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        toast.show('Refreshing spaces...', 'info');
        await googleChatService.fetchSpaces();
      });
    }

    // 4. Space Item Selection
    const spaceItems = this.container.querySelectorAll('.dash-space-item');
    spaceItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const spaceName = btn.getAttribute('data-space-name');
        const target = googleChatService.spaces.find((s) => s.name === spaceName);
        if (target) {
          googleChatService.setActiveSpace(target);
        }
      });
    });

    // 5. Create New Space Button
    const createSpaceBtns = this.container.querySelectorAll('.btn-open-create-space');
    createSpaceBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const spaceName = prompt('Enter a name for the new Google Chat Space:');
        if (!spaceName || !spaceName.trim()) return;

        try {
          toast.show('Creating Google Chat space...', 'info');
          const newSpace = await googleChatService.createSpace(spaceName.trim());
          toast.show(`✓ Space "${newSpace.displayName || spaceName}" created!`, 'success');
        } catch (err) {
          toast.show(err.message || 'Failed to create space in Google Chat', 'error');
        }
      });
    });

    // 6. Send Message Form
    const chatForm = this.container.querySelector('#dash-chat-form');
    const chatInput = this.container.querySelector('#dash-chat-input-text');
    const sendBtn = this.container.querySelector('#dash-chat-send-btn');

    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value?.trim();
        if (!text) return;

        if (!googleChatService.activeSpace) {
          toast.show('Please select a space first.', 'error');
          return;
        }

        try {
          if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span>Sending...</span>';
          }

          await googleChatService.sendMessage(googleChatService.activeSpace.name, text);
          chatInput.value = '';
          toast.show('✓ Message posted to Google Chat', 'success');

          // Scroll messages to bottom
          const msgContainer = this.container.querySelector('#dash-chat-messages-container');
          if (msgContainer) {
            msgContainer.scrollTop = msgContainer.scrollHeight;
          }
        } catch (err) {
          toast.show(err.message || 'Failed to send message', 'error');
        } finally {
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Send</span>
            `;
          }
        }
      });
    }

    // 7. Quick Action Chips & Share Sprint
    const chipStatus = this.container.querySelector('.quick-chip-status');
    const chipTasks = this.container.querySelector('.quick-chip-tasks');
    const chipDeploy = this.container.querySelector('.quick-chip-deploy');
    const shareSprintBtn = this.container.querySelector('.btn-share-sprint');

    if (chipStatus && chatInput) {
      chipStatus.addEventListener('click', () => {
        const ws = workspaceService.getWorkspace();
        const stats = taskService.getStats();
        chatInput.value = `📊 [DevFlow Update] Workspace "${ws?.name || 'DevFlow'}" status: ${stats.activeProjectsCount} active projects, ${stats.completedTasksCount}/${stats.totalTasksCount} tasks completed (${stats.overallProgressPercent}% velocity).`;
        chatInput.focus();
      });
    }

    if (chipTasks && chatInput) {
      chipTasks.addEventListener('click', () => {
        const tasks = taskService.getTasks().slice(0, 3);
        const taskList = tasks.map((t) => `• [${t.status}] ${t.title}`).join(' | ');
        chatInput.value = `📋 [DevFlow Tasks] Top sprint priorities: ${taskList || 'No active tasks'}`;
        chatInput.focus();
      });
    }

    if (chipDeploy && chatInput) {
      chipDeploy.addEventListener('click', () => {
        chatInput.value = `🚀 [DevFlow CI/CD] Live preview build healthy across 35 edge nodes (p99 latency 2.1ms).`;
        chatInput.focus();
      });
    }

    if (shareSprintBtn && chatInput) {
      shareSprintBtn.addEventListener('click', () => {
        const ws = workspaceService.getWorkspace();
        const stats = taskService.getStats();
        chatInput.value = `📢 [Sprint Report] Workspace: ${ws?.name || 'DevFlow'} | Overall Progress: ${stats.overallProgressPercent}% | Open Tasks: ${stats.openTasksCount} | Ready for review.`;
        chatInput.focus();
      });
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const dashboard = new DashboardController();

