/**
 * DEVFLOW — Modal Controller & Dialog Manager
 * Accessible dialogs with focus trapping, backdrop handling, escape-key listener,
 * and Supabase CRUD / Authentication integration.
 */

import { featuresDetailsData, docsGuideData } from '../data/demoData.js';
import { workspaceService } from '../services/workspaceService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { contactService } from '../services/contactService.js';
import { authService } from '../services/authService.js';
import { toast } from './toast.js';

class ModalController {
  constructor() {
    this.activeModal = null;
    this.previousActiveElement = null;
    this.initGlobalListeners();
  }

  initGlobalListeners() {
    // Escape key closes active modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });

    // Close on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('contact-modal-overlay')) {
        this.closeModal(e.target);
      }
    });
  }

  openModal(modalElement) {
    if (!modalElement) return;

    // If another modal is open, close it first
    if (this.activeModal && this.activeModal !== modalElement) {
      this.closeModal(this.activeModal, false);
    }

    this.previousActiveElement = document.activeElement;
    this.activeModal = modalElement;

    modalElement.classList.add('open');
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus on first focusable element
    setTimeout(() => {
      const focusable = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        const firstInput = modalElement.querySelector('input:not([type="hidden"]), select, textarea') || focusable[0];
        firstInput.focus();
      }
    }, 60);
  }

  closeModal(modalElement, restoreFocus = true) {
    const target = modalElement || this.activeModal;
    if (!target) return;

    target.classList.remove('open');
    target.setAttribute('aria-hidden', 'true');
    this.activeModal = null;
    document.body.style.overflow = '';

    if (restoreFocus && this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  // ==========================================
  // 1. AUTHENTICATION MODAL (Sign In / Sign Up)
  // ==========================================
  initAuthModal(onAuthSuccess) {
    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    const openBtns = document.querySelectorAll('.open-auth-btn, #btn-header-signin, #btn-mobile-signin');
    const closeBtn = document.getElementById('auth-modal-close-btn');
    const tabSignIn = document.getElementById('auth-tab-signin');
    const tabSignUp = document.getElementById('auth-tab-signup');
    const nameGroup = document.getElementById('auth-group-name');
    const nameInput = document.getElementById('auth-input-name');
    const emailInput = document.getElementById('auth-input-email');
    const passwordInput = document.getElementById('auth-input-password');
    const confirmPassGroup = document.getElementById('auth-group-confirm-password');
    const confirmPassInput = document.getElementById('auth-input-confirm-password');
    const submitBtn = document.getElementById('btn-submit-auth');
    const submitText = document.getElementById('auth-submit-text');
    const errorAlert = document.getElementById('auth-error-alert');
    const titleEl = document.getElementById('auth-modal-title');
    const descEl = document.getElementById('auth-modal-desc');
    const togglePrompt = document.getElementById('auth-toggle-prompt');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (!modal) return;

    let authMode = 'signin'; // 'signin' | 'signup'
    let pendingNextAction = null; // optional callback to trigger after successful login

    const setAuthMode = (mode) => {
      authMode = mode;
      if (errorAlert) {
        errorAlert.style.display = 'none';
        errorAlert.textContent = '';
      }

      if (mode === 'signup') {
        if (tabSignUp) tabSignUp.classList.add('active');
        if (tabSignIn) tabSignIn.classList.remove('active');
        if (nameGroup) nameGroup.style.display = 'flex';
        if (confirmPassGroup) confirmPassGroup.style.display = 'flex';
        if (titleEl) titleEl.textContent = 'Create DevFlow Account';
        if (descEl) descEl.textContent = 'Set up your credentials to sync projects, tasks, and team telemetry in Supabase.';
        if (submitText) submitText.textContent = 'CREATE ACCOUNT';
        if (togglePrompt) togglePrompt.textContent = 'Already have an account?';
        if (toggleLink) toggleLink.textContent = 'Sign In';
      } else {
        if (tabSignIn) tabSignIn.classList.add('active');
        if (tabSignUp) tabSignUp.classList.remove('active');
        if (nameGroup) nameGroup.style.display = 'none';
        if (confirmPassGroup) confirmPassGroup.style.display = 'none';
        if (titleEl) titleEl.textContent = 'Sign in to DevFlow';
        if (descEl) descEl.textContent = 'Access your persistent workspaces, build telemetry, and real-time pipelines.';
        if (submitText) submitText.textContent = 'SIGN IN';
        if (togglePrompt) togglePrompt.textContent = "Don't have an account?";
        if (toggleLink) toggleLink.textContent = 'Create Account';
      }
    };

    if (tabSignIn) {
      tabSignIn.addEventListener('click', () => setAuthMode('signin'));
    }
    if (tabSignUp) {
      tabSignUp.addEventListener('click', () => setAuthMode('signup'));
    }

    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
      });
    }

    this.openAuth = (preferredMode = 'signin', onComplete = null) => {
      pendingNextAction = onComplete;
      setAuthMode(preferredMode);
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (confirmPassInput) confirmPassInput.value = '';
      if (nameInput) nameInput.value = '';
      this.openModal(modal);
    };

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAuth('signin');
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorAlert) {
          errorAlert.style.display = 'none';
          errorAlert.textContent = '';
        }

        const email = emailInput?.value?.trim();
        const password = passwordInput?.value;
        const confirmPassword = confirmPassInput?.value;
        const fullName = nameInput?.value?.trim();

        if (!email || !email.includes('@') || !email.includes('.')) {
          if (errorAlert) {
            errorAlert.textContent = 'Please enter a valid email address.';
            errorAlert.style.display = 'block';
          }
          if (emailInput) emailInput.focus();
          return;
        }

        if (!password || password.length < 6) {
          if (errorAlert) {
            errorAlert.textContent = 'Password must be at least 6 characters.';
            errorAlert.style.display = 'block';
          }
          if (passwordInput) passwordInput.focus();
          return;
        }

        if (authMode === 'signup') {
          if (password !== confirmPassword) {
            if (errorAlert) {
              errorAlert.textContent = 'Passwords do not match.';
              errorAlert.style.display = 'block';
            }
            if (confirmPassInput) confirmPassInput.focus();
            return;
          }
        }

        // Loading state
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('loading');
        }
        if (submitText) {
          submitText.textContent = authMode === 'signup' ? 'CREATING ACCOUNT...' : 'SIGNING IN...';
        }

        try {
          let user;
          if (authMode === 'signup') {
            user = await authService.signUp({ email, password, confirmPassword, fullName });
            toast.show(`Account created for ${user?.email || email}!`, 'success');
          } else {
            user = await authService.signIn({ email, password });
            toast.show(`Welcome back, ${user?.email || email}!`, 'success');
          }

          this.closeModal(modal);

          if (typeof pendingNextAction === 'function') {
            const action = pendingNextAction;
            pendingNextAction = null;
            action(user);
          } else if (typeof onAuthSuccess === 'function') {
            onAuthSuccess(user);
          }
        } catch (err) {
          if (errorAlert) {
            errorAlert.textContent = err.message || 'Authentication failed. Please try again.';
            errorAlert.style.display = 'block';
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
          }
          if (submitText) {
            submitText.textContent = authMode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN';
          }
        }
      });
    }
  }

  // ==========================================
  // 2. WORKSPACE ONBOARDING MODAL
  // ==========================================
  initWorkspaceModal(onWorkspaceCreated) {
    const modal = document.getElementById('workspace-onboarding-modal');
    const form = document.getElementById('workspace-onboarding-form');
    const formView = document.getElementById('workspace-modal-view-form');
    const successView = document.getElementById('workspace-modal-view-success');
    const openBtns = document.querySelectorAll('.open-workspace-modal-btn, #btn-hero-start, #btn-mobile-get-started');
    const closeBtn = document.getElementById('workspace-modal-close-btn');
    const openWorkspaceCta = document.getElementById('btn-open-workspace-cta');
    const nameInput = document.getElementById('ws-input-name');
    const roleInput = document.getElementById('ws-input-role');
    const typeInput = document.getElementById('ws-input-type');
    const nameError = document.getElementById('ws-error-name');
    const generalError = document.getElementById('ws-form-error-alert');
    const submitBtn = document.getElementById('btn-submit-workspace');
    const submitText = document.getElementById('ws-submit-text');

    if (!modal) return;

    let createdWorkspaceData = null;

    const resetModalState = () => {
      if (formView) formView.style.display = 'block';
      if (successView) successView.style.display = 'none';
      if (nameInput) {
        nameInput.classList.remove('is-invalid');
      }
      if (nameError) {
        nameError.style.display = 'none';
        nameError.textContent = 'Please enter a workspace name.';
      }
      if (generalError) {
        generalError.style.display = 'none';
        generalError.textContent = 'Unable to create your workspace. Please try again.';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
      if (submitText) {
        submitText.textContent = 'CREATE WORKSPACE';
      }
    };

    const openWorkspaceModalDirectly = () => {
      resetModalState();
      const current = workspaceService.getWorkspace();
      if (nameInput) {
        nameInput.value = current?.name || '';
      }
      if (roleInput && current?.role) roleInput.value = current.role;
      if (typeInput && (current?.projectType || current?.project_type)) {
        typeInput.value = current.projectType || current.project_type;
      }
      this.openModal(modal);
    };

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();

        // Check if signed in, if not prompt auth first then continue to workspace modal
        const user = authService.getUser();
        if (!user && !authService.isAuthenticated()) {
          if (typeof this.openAuth === 'function') {
            this.openAuth('signup', () => {
              openWorkspaceModalDirectly();
            });
            toast.show('Please sign in or create an account to configure your workspace.', 'info', 4000);
            return;
          }
        }

        openWorkspaceModalDirectly();
      });
    });

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length > 0) {
          nameInput.classList.remove('is-invalid');
          if (nameError) nameError.style.display = 'none';
        }
        if (generalError) generalError.style.display = 'none';
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal(modal);
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (generalError) generalError.style.display = 'none';

        const nameVal = nameInput?.value?.trim();
        const roleVal = roleInput?.value || 'Staff Platform Engineer';
        const projectTypeVal = typeInput?.value || 'Web Application';

        // Custom inline validation
        if (!nameVal) {
          if (nameInput) {
            nameInput.classList.add('is-invalid');
            nameInput.focus();
          }
          if (nameError) {
            nameError.textContent = 'Please enter a workspace name.';
            nameError.style.display = 'block';
          }
          return;
        }

        const user = authService.getUser();
        if (!user || !user.id) {
          if (generalError) {
            generalError.textContent = 'Please sign in to create a workspace in Supabase.';
            generalError.style.display = 'block';
          }
          if (typeof this.openAuth === 'function') {
            this.openAuth('signin', () => {
              openWorkspaceModalDirectly();
            });
          }
          return;
        }

        // Loading state
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('loading');
        }
        if (submitText) {
          submitText.textContent = 'CREATING WORKSPACE...';
        }

        try {
          const ws = await workspaceService.createWorkspace({
            name: nameVal,
            role: roleVal,
            projectType: projectTypeVal
          });

          createdWorkspaceData = ws;

          // Transition into success view inside modal
          if (formView && successView) {
            const summaryName = document.getElementById('ws-success-summary-name');
            const summaryRole = document.getElementById('ws-success-summary-role');
            const summaryAvatar = document.getElementById('ws-success-avatar');

            if (summaryName) summaryName.textContent = ws.name;
            if (summaryRole) summaryRole.textContent = `${ws.role} • ${ws.projectType || ws.project_type}`;
            if (summaryAvatar) {
              const initials = ws.name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DF';
              summaryAvatar.textContent = initials;
            }

            formView.style.display = 'none';
            successView.style.display = 'block';

            // Focus CTA in success view
            setTimeout(() => {
              if (openWorkspaceCta) openWorkspaceCta.focus();
            }, 50);
          } else {
            this.closeModal(modal);
            toast.show(`Workspace "${ws.name}" created successfully!`, 'success');
            if (typeof onWorkspaceCreated === 'function') {
              onWorkspaceCreated(ws);
            }
          }
        } catch (err) {
          if (generalError) {
            generalError.textContent = err.message || 'Unable to create your workspace. Please try again.';
            generalError.style.display = 'block';
          }
          if (err.message && (err.message.includes('Authentication') || err.message.includes('sign in'))) {
            setTimeout(() => {
              if (typeof this.openAuth === 'function') {
                this.closeModal(modal);
                this.openAuth('signin', () => {
                  openWorkspaceModalDirectly();
                });
              }
            }, 1200);
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
          }
          if (submitText) {
            submitText.textContent = 'CREATE WORKSPACE';
          }
        }
      });
    }

    if (openWorkspaceCta) {
      openWorkspaceCta.addEventListener('click', () => {
        this.closeModal(modal);
        if (createdWorkspaceData) {
          toast.show(`Workspace "${createdWorkspaceData.name}" ready! Active cluster connected.`, 'success');
          if (typeof onWorkspaceCreated === 'function') {
            onWorkspaceCreated(createdWorkspaceData);
          }
        }
      });
    }
  }

  // ==========================================
  // 3. FEATURE DETAIL MODAL
  // ==========================================
  initFeatureModals(onExploreDemo) {
    const modal = document.getElementById('feature-detail-modal');
    const closeBtn = document.getElementById('feature-modal-close-btn');
    const featureCards = {
      'feature-card-ship': 'ship',
      'feature-card-collaborate': 'collaborate',
      'feature-card-track': 'track',
      'feature-card-analyze': 'analyze'
    };

    if (!modal) return;

    Object.entries(featureCards).forEach(([cardId, featureKey]) => {
      const card = document.getElementById(cardId);
      if (card) {
        card.style.cursor = 'pointer';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View details for feature: ${featureKey}`);

        const openHandler = () => {
          this.renderFeatureDetail(featureKey, onExploreDemo);
          this.openModal(modal);
        };

        card.addEventListener('click', openHandler);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openHandler();
          }
        });
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }
  }

  renderFeatureDetail(featureKey, onExploreDemo) {
    const data = featuresDetailsData[featureKey];
    if (!data) return;

    const kickerEl = document.getElementById('feat-modal-kicker');
    const titleEl = document.getElementById('feat-modal-title');
    const taglineEl = document.getElementById('feat-modal-tagline');
    const descEl = document.getElementById('feat-modal-desc');
    const benefitsListEl = document.getElementById('feat-modal-benefits');
    const metricValueEl = document.getElementById('feat-modal-metric-val');
    const metricCtxEl = document.getElementById('feat-modal-metric-ctx');
    const demoBoxEl = document.getElementById('feat-modal-demo-box');
    const demoCtaBtn = document.getElementById('feat-modal-cta-btn');

    if (kickerEl) kickerEl.textContent = data.kicker;
    if (titleEl) titleEl.textContent = data.title;
    if (taglineEl) taglineEl.textContent = data.tagline;
    if (descEl) descEl.textContent = data.description;

    if (benefitsListEl) {
      benefitsListEl.innerHTML = data.benefits.map((b) => `
        <li class="feat-benefit-item">
          <span class="feat-benefit-bullet">✓</span>
          <span>${escapeHtml(b)}</span>
        </li>
      `).join('');
    }

    if (metricValueEl) metricValueEl.textContent = data.metric;
    if (metricCtxEl) metricCtxEl.textContent = data.metricContext;

    if (demoBoxEl) {
      demoBoxEl.innerHTML = `
        <div class="feat-terminal-header">
          <span class="terminal-dot red"></span>
          <span class="terminal-dot yellow"></span>
          <span class="terminal-dot green"></span>
          <span class="terminal-title">devflow-terminal // ${escapeHtml(data.id)}</span>
        </div>
        <pre class="feat-terminal-code"><code>${escapeHtml(data.demoCode)}</code></pre>
      `;
    }

    if (demoCtaBtn) {
      demoCtaBtn.onclick = () => {
        this.closeModal(document.getElementById('feature-detail-modal'));
        if (typeof onExploreDemo === 'function') {
          onExploreDemo();
        }
      };
    }
  }

  // ==========================================
  // 4. PROJECT CREATION MODAL
  // ==========================================
  initProjectModal() {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    const closeBtn = document.getElementById('project-modal-close-btn');
    const submitBtn = document.getElementById('btn-submit-project');

    if (!modal) return;

    document.addEventListener('click', (e) => {
      const target = e.target.closest('.open-new-project-btn');
      if (target) {
        e.preventDefault();
        const user = authService.getUser();
        if (!user || !user.id) {
          toast.show('Please sign in to create projects.', 'info');
          if (typeof this.openAuth === 'function') {
            this.openAuth('signin');
          }
          return;
        }

        const ws = workspaceService.getWorkspace();
        if (!ws || !ws.id) {
          toast.show('Please create a workspace first before adding projects.', 'info');
          const wsModal = document.getElementById('workspace-modal');
          if (wsModal) this.openModal(wsModal);
          return;
        }

        this.openModal(modal);
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('proj-input-name');
        const descInput = document.getElementById('proj-input-desc');
        const statusInput = document.getElementById('proj-input-status');
        const catInput = document.getElementById('proj-input-cat');

        const trimmedName = nameInput?.value?.trim();
        if (!trimmedName) {
          toast.show('Please enter a project name', 'error');
          nameInput?.focus();
          return;
        }

        const ws = workspaceService.getWorkspace();
        if (!ws || !ws.id) {
          toast.show('Active workspace required to create a project.', 'error');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'CREATING PROJECT...';
        }

        try {
          const newProj = await projectService.createProject(ws.id, {
            name: trimmedName,
            description: descInput?.value,
            status: statusInput?.value || 'Active',
            category: catInput?.value || 'Productivity'
          });

          form.reset();
          this.closeModal(modal);
          toast.show(`Project "${newProj.name}" created in Supabase!`, 'success');
        } catch (err) {
          toast.show(err.message || 'Error creating project', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Project';
          }
        }
      });
    }
  }

  // ==========================================
  // 5. TASK CREATION MODAL
  // ==========================================
  initTaskModal() {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const closeBtn = document.getElementById('task-modal-close-btn');
    const projectSelect = document.getElementById('task-input-project');
    const submitBtn = document.getElementById('btn-submit-task');

    if (!modal) return;

    const populateProjects = (selectedProjectId = null) => {
      if (!projectSelect) return;
      const projects = projectService.getProjects();
      if (projects.length === 0) {
        projectSelect.innerHTML = '<option value="">No projects available (Create a project first)</option>';
        return;
      }
      projectSelect.innerHTML = projects.map((p) => `
        <option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
      `).join('');
    };

    document.addEventListener('click', (e) => {
      const target = e.target.closest('.open-new-task-btn');
      if (target) {
        e.preventDefault();
        const user = authService.getUser();
        if (!user || !user.id) {
          toast.show('Please sign in to add tasks.', 'info');
          if (typeof this.openAuth === 'function') {
            this.openAuth('signin');
          }
          return;
        }

        const projects = projectService.getProjects();
        if (projects.length === 0) {
          toast.show('Please create a project first before adding tasks.', 'info');
          const projModal = document.getElementById('project-modal');
          if (projModal) this.openModal(projModal);
          return;
        }

        const preferredProjectId = target.getAttribute('data-project-id');
        populateProjects(preferredProjectId);
        this.openModal(modal);
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-input-title');
        const projSelect = document.getElementById('task-input-project');
        const prioritySelect = document.getElementById('task-input-priority');
        const statusSelect = document.getElementById('task-input-status');
        const dueDateInput = document.getElementById('task-input-due');

        const trimmedTitle = titleInput?.value?.trim();
        if (!trimmedTitle) {
          toast.show('Please enter a task title', 'error');
          titleInput?.focus();
          return;
        }

        if (!projSelect?.value) {
          toast.show('Please create or select a project first', 'error');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'ADDING TASK...';
        }

        try {
          const newTask = await taskService.createTask({
            title: trimmedTitle,
            projectId: projSelect?.value,
            priority: prioritySelect?.value || 'Medium',
            status: statusSelect?.value || 'Todo',
            dueDate: dueDateInput?.value
          });

          form.reset();
          this.closeModal(modal);
          toast.show(`Task "${newTask.title}" added to ${newTask.projectName}!`, 'success');
        } catch (err) {
          toast.show(err.message || 'Error adding task', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Task';
          }
        }
      });
    }
  }

  // ==========================================
  // 6. DOCS MODAL
  // ==========================================
  initDocsModal() {
    const modal = document.getElementById('docs-modal');
    const openBtns = document.querySelectorAll('#nav-link-docs, .open-docs-btn');
    const closeBtn = document.getElementById('docs-modal-close-btn');

    if (!modal) return;

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.renderDocsGuide();
        this.openModal(modal);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }
  }

  renderDocsGuide() {
    const container = document.getElementById('docs-modal-content');
    if (!container) return;

    container.innerHTML = `
      <div class="docs-header-bar">
        <span class="docs-version-badge">${escapeHtml(docsGuideData.version)}</span>
        <h3 class="docs-title">${escapeHtml(docsGuideData.title)}</h3>
      </div>
      <div class="docs-sections-list">
        ${docsGuideData.sections.map((sec) => `
          <div class="docs-sec-card">
            <h4 class="docs-sec-heading">${escapeHtml(sec.heading)}</h4>
            <div class="docs-code-wrap">
              <pre><code>${escapeHtml(sec.code)}</code></pre>
            </div>
            <p class="docs-sec-notes">${escapeHtml(sec.notes)}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ==========================================
  // 7. CONTACT US MODAL
  // ==========================================
  initContactModal() {
    const modal = document.getElementById('contact-modal');
    const openBtns = document.querySelectorAll('.btn-header-contact, .open-contact-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('btn-submit-contact');

    if (!modal) return;

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(modal);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = form.querySelector('input[type="text"]:first-of-type');
        const emailInput = form.querySelector('input[type="email"]');
        const msgInput = form.querySelector('textarea') || form.querySelector('input[name="message"]');
        const companyInput = form.querySelector('input[placeholder*="Company"]');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'SENDING...';
        }

        try {
          await contactService.submitContactMessage({
            name: nameInput?.value,
            email: emailInput?.value,
            message: msgInput?.value || 'Requesting developer platform demo & architectural overview.',
            company: companyInput?.value
          });

          form.reset();
          this.closeModal(modal);
          toast.show('Message recorded! Our team will contact you shortly.', 'success', 4500);
        } catch (err) {
          toast.show(err.message || 'Please check your contact details', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
          }
        }
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

export const modals = new ModalController();
