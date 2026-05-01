/* ================================================================
   JAN KALYAN PARTY — main.js
   Handles: Navbar, Mobile Menu, Scroll Effects, Animations,
            Ticker, Back-to-Top, Toast Notifications, Utilities
   ================================================================ */

'use strict';

/* ================================================================
   SCROLL PROGRESS BAR
   ================================================================ */
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress     = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width    = progress + '%';
  }, { passive: true });
}

/* ================================================================
   STICKY HEADER SHADOW
   ================================================================ */
function initStickyHeader() {
  const header = document.querySelector('header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ================================================================
   ACTIVE NAV LINK (based on current page)
   ================================================================ */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks    = document.querySelectorAll('.nav-links a, .mobile-nav-links a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ================================================================
   MOBILE NAV DRAWER
   ================================================================ */
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

  if (!hamburger || !mobileNav) return;

  function openNav() {
    hamburger.classList.add('open');
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    if (mobileNav.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  // Close when a link is clicked
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (
      mobileNav.classList.contains('open') &&
      !mobileNav.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      closeNav();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeNav();
    }
  });
}

/* ================================================================
   SCROLL REVEAL ANIMATION
   ================================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay for grouped elements
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ================================================================
   AUTO STAGGER DELAY for grid children
   ================================================================ */
function initStaggerDelay() {
  const staggerGroups = document.querySelectorAll('[data-stagger]');

  staggerGroups.forEach(group => {
    const children = group.querySelectorAll('.reveal');
    const base     = parseInt(group.dataset.stagger) || 100;
    children.forEach((child, i) => {
      child.dataset.delay = i * base;
    });
  });
}

/* ================================================================
   BACK TO TOP BUTTON
   ================================================================ */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ================================================================
   SMOOTH SCROLL for anchor links
   ================================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 90; // header height buffer
        const top    = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ================================================================
   TICKER (duplicate content for seamless loop)
   ================================================================ */
function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;

  // Duplicate items for seamless looping
  const clone = track.cloneNode(true);
  track.parentElement.appendChild(clone);
}

/* ================================================================
   COUNTER ANIMATION (for hero stats)
   ================================================================ */
function animateCounter(el, target, duration = 1800) {
  let start     = 0;
  const suffix  = el.dataset.suffix || '';
  const step    = target / (duration / 16);

  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target.toLocaleString('en-IN') + suffix;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start).toLocaleString('en-IN') + suffix;
    }
  }, 16);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.dataset.count);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ================================================================
   TOAST NOTIFICATION SYSTEM
   ================================================================ */
const Toast = (() => {
  function getContainer() {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function show(message, type = 'success', duration = 4000) {
    const wrap = getContainer();

    const icons = {
      success : '✅',
      error   : '❌',
      info    : 'ℹ️',
      warning : '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.success}</span>
      <span class="toast-msg">${sanitizeHTML(message)}</span>
    `;

    wrap.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.opacity    = '0';
      toast.style.transform  = 'translateX(36px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

// Make Toast globally accessible
window.Toast = Toast;

/* ================================================================
   MODAL SYSTEM
   ================================================================ */
const Modal = (() => {
  function open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
      const firstInput = overlay.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 310);
  }

  function close(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  function init() {
    // Close buttons inside modals
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Click outside to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });

    // Open triggers
    document.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        open(btn.dataset.modalOpen);
      });
    });
  }

  return { open, close, closeAll, init };
})();

window.Modal = Modal;

/* ================================================================
   SECURITY: HTML Sanitizer (basic XSS prevention)
   ================================================================ */
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

window.sanitizeHTML = sanitizeHTML;

/* ================================================================
   INPUT SANITIZER (strip dangerous chars from form inputs)
   ================================================================ */
function sanitizeInput(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[<>'"`;]/g, '')          // strip dangerous chars
    .trim();
}

window.sanitizeInput = sanitizeInput;

/* ================================================================
   FORM VALIDATOR UTILITY
   ================================================================ */
const Validator = (() => {
  function showError(input, message) {
    input.classList.add('is-error');
    const errEl = input.parentElement.querySelector('.form-error');
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.add('show');
    }
  }

  function clearError(input) {
    input.classList.remove('is-error');
    const errEl = input.parentElement.querySelector('.form-error');
    if (errEl) errEl.classList.remove('show');
  }

  function clearAll(form) {
    form.querySelectorAll('.form-control').forEach(clearError);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
  }

  function isValidAadhaar(aadhar) {
    return /^\d{12}$/.test(aadhar.replace(/\s/g, ''));
  }

  function isStrongPassword(pwd) {
    return pwd.length >= 8;
  }

  function validate(form, rules) {
    let isValid = true;
    clearAll(form);

    rules.forEach(rule => {
      const input = form.querySelector(`[name="${rule.field}"]`);
      if (!input) return;

      const value = input.value.trim();

      if (rule.required && !value) {
        showError(input, rule.requiredMsg || 'This field is required.');
        isValid = false;
        return;
      }

      if (value && rule.type === 'email' && !isValidEmail(value)) {
        showError(input, 'Please enter a valid email address.');
        isValid = false;
        return;
      }

      if (value && rule.type === 'phone' && !isValidPhone(value)) {
        showError(input, 'Please enter a valid 10-digit mobile number.');
        isValid = false;
        return;
      }

      if (value && rule.type === 'aadhaar' && !isValidAadhaar(value)) {
        showError(input, 'Please enter a valid 12-digit Aadhaar number.');
        isValid = false;
        return;
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        showError(input, `Minimum ${rule.minLength} characters required.`);
        isValid = false;
        return;
      }

      if (value && rule.match) {
        const matchInput = form.querySelector(`[name="${rule.match}"]`);
        if (matchInput && value !== matchInput.value) {
          showError(input, rule.matchMsg || 'Values do not match.');
          isValid = false;
          return;
        }
      }
    });

    return isValid;
  }

  // Live error clearing on input
  function attachLiveClear(form) {
    form.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('input', () => clearError(input));
      input.addEventListener('change', () => clearError(input));
    });
  }

  return { validate, showError, clearError, clearAll, isValidEmail, isValidPhone, isStrongPassword, attachLiveClear };
})();

window.Validator = Validator;

/* ================================================================
   RATE LIMITER (prevent form spam)
   ================================================================ */
const RateLimiter = (() => {
  const attempts = {};

  function check(key, maxAttempts = 5, windowMs = 60000) {
    const now  = Date.now();
    const data = attempts[key] || { count: 0, resetAt: now + windowMs };

    if (now > data.resetAt) {
      attempts[key] = { count: 1, resetAt: now + windowMs };
      return true;
    }

    if (data.count >= maxAttempts) {
      return false; // Rate limited
    }

    attempts[key] = { count: data.count + 1, resetAt: data.resetAt };
    return true;
  }

  function reset(key) {
    delete attempts[key];
  }

  return { check, reset };
})();

window.RateLimiter = RateLimiter;

/* ================================================================
   COPY TO CLIPBOARD
   ================================================================ */
function copyToClipboard(text, successMsg = 'Copied!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      Toast.show(successMsg, 'success', 2500);
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const el       = document.createElement('textarea');
  el.value       = text;
  el.style.position = 'fixed';
  el.style.opacity  = '0';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    Toast.show(successMsg, 'success', 2500);
  } catch {
    Toast.show('Could not copy. Please copy manually.', 'error');
  }
  document.body.removeChild(el);
}

window.copyToClipboard = copyToClipboard;

/* ================================================================
   HERO SCROLL HINT
   ================================================================ */
function initHeroScroll() {
  const hint = document.querySelector('.hero-scroll');
  if (!hint) return;

  hint.addEventListener('click', () => {
    const nextSection = document.querySelector('.ticker-bar') ||
                        document.querySelector('section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* ================================================================
   DONATION AMOUNT BUTTONS
   ================================================================ */
function initDonationAmounts() {
  const amtBtns  = document.querySelectorAll('.amt-btn');
  const customInput = document.getElementById('custom-amount');

  amtBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      amtBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (customInput) {
        if (btn.dataset.custom) {
          customInput.value = '';
          customInput.focus();
        } else {
          customInput.value = btn.dataset.amount || '';
        }
      }
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      amtBtns.forEach(b => b.classList.remove('active'));
      const customBtn = document.querySelector('.amt-btn[data-custom]');
      if (customBtn && customInput.value) customBtn.classList.add('active');
    });
  }
}

/* ================================================================
   COPY UPI ID
   ================================================================ */
function initCopyUPI() {
  const copyBtn = document.querySelector('.copy-btn');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    const upiId = document.querySelector('.upi-id-text');
    if (upiId) {
      copyToClipboard(upiId.textContent.trim(), 'UPI ID copied!');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2500);
    }
  });
}

/* ================================================================
   PREVENT RIGHT CLICK on sensitive sections (ID card)
   ================================================================ */
function initContextMenuProtection() {
  document.querySelectorAll('.id-card, .id-card-container').forEach(el => {
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ================================================================
   DISABLE DEVTOOLS SHORTCUT KEYS (basic deterrent)
   ================================================================ */
function initDevToolsDeterrent() {
  document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
    }
    // Disable Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U (basic)
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
    }
    // Disable Ctrl+U (view source)
    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
    }
  });
}

/* ================================================================
   SESSION CHECK (redirect if not logged in on protected pages)
   ================================================================ */
function requireAuth(redirectTo = 'member-area.html') {
  const session = getSession();
  if (!session) {
    Toast.show('Please login to access this page.', 'info');
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1500);
    return false;
  }
  return true;
}

/* ================================================================
   SESSION HELPERS (used by auth.js too)
   ================================================================ */
function getSession() {
  try {
    const raw = sessionStorage.getItem('jkp_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(data) {
  try {
    sessionStorage.setItem('jkp_session', JSON.stringify(data));
  } catch {
    // Storage not available
  }
}

function clearSession() {
  sessionStorage.removeItem('jkp_session');
}

window.getSession   = getSession;
window.setSession   = setSession;
window.clearSession = clearSession;
window.requireAuth  = requireAuth;

/* ================================================================
   UNIQUE ID GENERATOR
   ================================================================ */
function generateMemberID(type = 'GM') {
  const year   = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `JKP-${type}-${year}-${random}`;
}

function generateVolunteerID() {
  const year   = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `JKP-VOL-${year}-${random}`;
}

window.generateMemberID   = generateMemberID;
window.generateVolunteerID = generateVolunteerID;

/* ================================================================
   FORMAT DATE
   ================================================================ */
function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    day   : '2-digit',
    month : 'long',
    year  : 'numeric'
  });
}

window.formatDate = formatDate;

/* ================================================================
   LAZY LOAD IMAGES
   ================================================================ */
function initLazyImages() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src   = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });

  imgs.forEach(img => observer.observe(img));
}

/* ================================================================
   PRINT ID CARD
   ================================================================ */
function printIDCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const win  = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>JKP Membership Card</title>
        <link rel="stylesheet" href="css/style.css">
        <style>
          body { margin: 40px; background: #f5f5f5; }
          .id-card { max-width: 400px; margin: 0 auto; }
          @media print {
            body { margin: 0; background: white; }
          }
        </style>
      </head>
      <body>
        ${card.outerHTML}
        <script>window.onload = () => window.print();<\/script>
      </body>
    </html>
  `);
  win.document.close();
}

window.printIDCard = printIDCard;

/* ================================================================
   INIT ALL
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initProgressBar();
  initStickyHeader();
  initActiveNav();
  initMobileNav();
  initStaggerDelay();
  initScrollReveal();
  initBackToTop();
  initSmoothScroll();
  initTicker();
  initCounters();
  initHeroScroll();
  initDonationAmounts();
  initCopyUPI();
  initContextMenuProtection();
  initLazyImages();
  Modal.init();

  // Only enable devtools deterrent in production
  // initDevToolsDeterrent();

  console.log('%c🏛 Jan Kalyan Party Website', 'color:#FF6B00;font-size:18px;font-weight:bold;');
  console.log('%cजात पर न पात पर, प्राथमिकता विकास पर', 'color:#1565C0;font-size:13px;');
});
