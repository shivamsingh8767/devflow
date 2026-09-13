/**
 * DEVFLOW — Developer Productivity Platform
 * Vanilla JavaScript Application Controller & Supabase Lifecycle Manager
 */

import { authService } from './services/authService.js';
import { workspaceService } from './services/workspaceService.js';
import { projectService } from './services/projectService.js';
import { taskService } from './services/taskService.js';
import { testSupabaseConnection } from './services/supabaseClient.js';
import { modals } from './ui/modals.js';
import { dashboard } from './ui/dashboard.js';
import { toast } from './ui/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Header, Mobile Menu, and Navigation Links
  initHeaderScroll();
  initMobileMenu();
  initSmoothNavigation();

  // 2. Initialize Hero Mockup & Interactive Panel
  initPanelPills();
  initHotspotTooltip();

  // 3. Initialize Scroll Reveal & Stats Counter
  initScrollReveal();
  initStatsCounter();

  // 4. Initialize Core Data Services & Auth Layer
  await initServices();

  // 5. Initialize Interactive Product Dashboard
  dashboard.init();

  // 6. Initialize Header Auth UI Synchronizer
  initHeaderAuth();

  // 7. Initialize All Modal Dialogs
  modals.initAuthModal((_user) => {
    // On successful login or signup, open workspace onboarding or show dashboard
    const currentWs = workspaceService.getWorkspace();
    if (!currentWs || !currentWs.id) {
      const wsModal = document.getElementById('workspace-onboarding-modal');
      if (wsModal) modals.openModal(wsModal);
    } else {
      dashboard.show();
    }
  });

  modals.initWorkspaceModal((_workspace) => {
    // When workspace is created from Hero CTA, switch and reveal dashboard
    dashboard.show();
  });

  modals.initFeatureModals(() => {
    // When user clicks "Test in Live Demo" inside a feature modal
    dashboard.show();
  });

  modals.initProjectModal();
  modals.initTaskModal();
  modals.initDocsModal();
  modals.initContactModal();
});

/**
 * Initialize backend service singletons
 */
async function initServices() {
  try {
    await testSupabaseConnection();
    await authService.init();
    await workspaceService.init();
    await projectService.init();
    await taskService.init();
  } catch (err) {
    console.warn('Service initialization notice:', err);
  }
}

/**
 * Synchronize Header Auth UI with Auth Service
 */
function initHeaderAuth() {
  const signInBtn = document.getElementById('btn-header-signin');
  const userProfile = document.getElementById('header-user-profile');
  const userAvatar = document.getElementById('header-user-avatar');
  const userEmail = document.getElementById('header-user-email');
  const signOutBtn = document.getElementById('btn-header-signout');

  const mobileSignInBtn = document.getElementById('btn-mobile-signin');
  const mobileSignOutBtn = document.getElementById('btn-mobile-signout');

  const syncAuthUi = (user) => {
    if (user) {
      const email = user.email || 'user@devflow.io';
      const name = user.user_metadata?.full_name || email.split('@')[0];
      const initials = (name || email).substring(0, 2).toUpperCase();

      if (signInBtn) signInBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      if (userAvatar) userAvatar.textContent = initials;
      if (userEmail) userEmail.textContent = email;

      if (mobileSignInBtn) mobileSignInBtn.style.display = 'none';
      if (mobileSignOutBtn) mobileSignOutBtn.style.display = 'block';
    } else {
      if (signInBtn) signInBtn.style.display = 'inline-flex';
      if (userProfile) userProfile.style.display = 'none';

      if (mobileSignInBtn) mobileSignInBtn.style.display = 'block';
      if (mobileSignOutBtn) mobileSignOutBtn.style.display = 'none';
    }
  };

  authService.subscribe((user) => {
    syncAuthUi(user);
  });

  // Initial sync
  syncAuthUi(authService.getUser());

  // Sign out handlers
  const handleSignOut = async () => {
    try {
      await authService.signOut();
      toast.show('Signed out successfully.', 'info');
    } catch (err) {
      toast.show('Error signing out.', 'error');
    }
  };

  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
  if (mobileSignOutBtn) {
    mobileSignOutBtn.addEventListener('click', handleSignOut);
  }
}

/**
 * 1. Header scroll state for sticky blur/border
 */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * 2. Mobile Menu toggle and responsive navigation
 */
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mainNav = document.querySelector('.main-nav');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-actions a, .mobile-actions button');

  if (!menuBtn || !mainNav) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuBtn.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuBtn.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

/**
 * 3. Smooth Anchor Navigation
 */
function initSmoothNavigation() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId !== '#' && targetId.length > 1) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/**
 * 4. Hero Floating Panel Pill Tabs
 */
function initPanelPills() {
  const pills = document.querySelectorAll('.pill-tag');
  const headline = document.querySelector('.panel-headline');
  const subline = document.querySelector('.panel-subline');

  const contentMap = {
    'architecture': {
      title: 'Unique architecture & ergonomics',
      sub: 'From local commits to multi-region cloud edge.'
    },
    'performance': {
      title: 'Ultra-fast sub-millisecond builds',
      sub: 'Engineered with zero-overhead compiler graphs.'
    },
    'cloud': {
      title: 'Autonomous edge & 3D cloud clusters',
      sub: 'Instant failover with real-time telemetry.'
    }
  };

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const target = pill.getAttribute('data-target') || 'architecture';
      const data = contentMap[target];

      if (data && headline && subline) {
        headline.style.opacity = '0';
        subline.style.opacity = '0';

        setTimeout(() => {
          headline.textContent = data.title;
          subline.textContent = data.sub;
          headline.style.opacity = '1';
          subline.style.opacity = '1';
        }, 150);
      }
    });
  });
}

/**
 * 5. Hotspot pin interactive tooltip & simulation
 */
function initHotspotTooltip() {
  const pin = document.querySelector('.panel-hotspot-pin');
  const callout = document.querySelector('.floating-callout-badge');

  if (pin && callout) {
    pin.addEventListener('click', () => {
      callout.style.transform = 'scale(1.08) translateY(-10px)';
      toast.show('⚡ Cluster Node Active: 35 Edge Regions synchronized with sub-millisecond latency.', 'info', 4000);
      setTimeout(() => {
        callout.style.transform = '';
      }, 400);
    });
  }
}

/**
 * 6. Subtle Intersection Observer Reveal Controller
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((el) => el.classList.add('revealed'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const customDelay = el.getAttribute('data-delay');
        if (customDelay) {
          el.style.transitionDelay = `${customDelay}ms`;
        }
        el.classList.add('revealed');
        obs.unobserve(el);
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * 7. Count-Up Animation for Statistics
 */
function initStatsCounter() {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(statsSection);

  function animateCounters() {
    const counters = document.querySelectorAll('.stat-metric[data-count]');
    counters.forEach((counter) => {
      const target = parseFloat(counter.getAttribute('data-count'));
      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      const duration = 1800;
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        const currentVal = (target * easeOutQuad).toFixed(target % 1 === 0 ? 0 : 1);

        counter.textContent = `${prefix}${currentVal}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = `${prefix}${target}${suffix}`;
        }
      }

      requestAnimationFrame(update);
    });
  }
}
