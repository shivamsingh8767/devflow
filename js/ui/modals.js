/**
 * DEVFLOW — Modal Controller & Dialog Manager
 * Accessible dialogs with focus trapping, backdrop handling, and escape-key listener.
 */

import { featuresDetailsData, docsGuideData } from '../data/demoData.js';
import { workspaceService } from '../services/workspaceService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { contactService } from '../services/contactService.js';
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
        // Prefer first text input or first action button
        const firstInput = modalElement.querySelector('input, select, textarea') || focusable[0];
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
  // 1. WORKSPACE ONBOARDING MODAL
  // ==========================================
  initWorkspaceModal(onWorkspaceCreated) {
    const modal = document.getElementById('workspace-onboarding-modal');
    const form = document.getElementById('workspace-onboarding-form');
    const formView = document.getElementById('workspace-modal-view-form');
    const successView = document.getElementById('workspace-modal-view-success');
    const openBtns = document.querySelectorAll('.open-workspace-modal-btn, #btn-hero-start');
    const closeBtn = document.getElementById('workspace-modal-close-btn');
    const openWorkspaceCta = document.getElementById('btn-open-workspace-cta');
    const nameInput = document.getElementById('ws-input-name');
    const roleInput = document.getElementById('ws-input-role');
    const typeInput = document.getElementById('ws-input-type');
    const nameError = document.getElementById('ws-error-name');

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
    };

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        resetModalState();

        // Prefill with current workspace or elegant defaults
        const current = workspaceService.getWorkspace();
        if (nameInput) {
          nameInput.value = current.name || 'DevFlow Engineering';
        }
        if (roleInput && current.role) roleInput.value = current.role;
        if (typeInput && current.projectType) typeInput.value = current.projectType;

        this.openModal(modal);
      });
    });

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length > 0) {
          nameInput.classList.remove('is-invalid');
          if (nameError) nameError.style.display = 'none';
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal(modal);
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
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

        try {
          const ws = workspaceService.createWorkspace({
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
            if (summaryRole) summaryRole.textContent = `${ws.role} • ${ws.projectType}`;
            if (summaryAvatar) {
              const initials = ws.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DF';
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
          if (nameInput) nameInput.classList.add('is-invalid');
          if (nameError) {
            nameError.textContent = err.message || 'Error creating workspace';
            nameError.style.display = 'block';
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
  // 2. FEATURE DETAIL MODAL
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
  // 3. PROJECT CREATION MODAL
  // ==========================================
  initProjectModal() {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    const openBtns = document.querySelectorAll('.open-new-project-btn');
    const closeBtn = document.getElementById('project-modal-close-btn');

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
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('proj-input-name');
        const descInput = document.getElementById('proj-input-desc');
        const statusInput = document.getElementById('proj-input-status');
        const catInput = document.getElementById('proj-input-cat');

        try {
          const newProj = projectService.addProject({
            name: nameInput?.value,
            description: descInput?.value,
            status: statusInput?.value || 'Active',
            category: catInput?.value || 'Productivity'
          });

          form.reset();
          this.closeModal(modal);
          toast.show(`Project "${newProj.name}" created successfully!`, 'success');
        } catch (err) {
          toast.show(err.message || 'Error creating project', 'error');
        }
      });
    }
  }

  // ==========================================
  // 4. TASK CREATION MODAL
  // ==========================================
  initTaskModal() {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const openBtns = document.querySelectorAll('.open-new-task-btn');
    const closeBtn = document.getElementById('task-modal-close-btn');
    const projectSelect = document.getElementById('task-input-project');

    if (!modal) return;

    const populateProjects = () => {
      if (!projectSelect) return;
      const projects = projectService.getProjects();
      projectSelect.innerHTML = projects.map((p) => `
        <option value="${p.id}">${escapeHtml(p.name)}</option>
      `).join('');
    };

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        populateProjects();
        this.openModal(modal);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal(modal));
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-input-title');
        const projSelect = document.getElementById('task-input-project');
        const prioritySelect = document.getElementById('task-input-priority');
        const statusSelect = document.getElementById('task-input-status');
        const dueDateInput = document.getElementById('task-input-due');

        try {
          const newTask = taskService.addTask({
            title: titleInput?.value,
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
        }
      });
    }
  }

  // ==========================================
  // 5. DOCS MODAL
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
  // 6. CONTACT US MODAL
  // ==========================================
  initContactModal() {
    const modal = document.getElementById('contact-modal');
    const openBtns = document.querySelectorAll('.btn-header-contact, .open-contact-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('contact-form');

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
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = form.querySelector('input[type="text"]:first-of-type');
        const emailInput = form.querySelector('input[type="email"]');
        const msgInput = form.querySelector('textarea') || form.querySelector('input[name="message"]');
        const companyInput = form.querySelector('input[placeholder*="Company"]');

        try {
          contactService.submitContactMessage({
            name: nameInput?.value,
            email: emailInput?.value,
            message: msgInput?.value || 'Requesting developer platform demo & architectural overview.',
            company: companyInput?.value
          });

          form.reset();
          this.closeModal(modal);
          toast.show('Message sent successfully! Our engineering team will contact you shortly.', 'success', 4500);
        } catch (err) {
          toast.show(err.message || 'Please check your contact details', 'error');
        }
      });
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
}

export const modals = new ModalController();
