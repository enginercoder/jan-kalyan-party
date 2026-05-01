/* ================================================================
   JAN KALYAN PARTY — security.js
   Handles: CSRF-like tokens, Honeypot fields, Input sanitization,
            Anti-spam, Anti-abuse, XSS prevention, Form protection
   ================================================================ */

'use strict';

/* ================================================================
   CSRF-LIKE TOKEN SYSTEM
   Generates a session token per page load.
   Every protected form must include & validate this token.
   ================================================================ */
const CSRFProtection = (() => {

  const TOKEN_KEY = 'jkp_csrf_token';

  function generate() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(TOKEN_KEY, token);
    return token;
  }

  function get() {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) token = generate();
    return token;
  }

  function validate(submittedToken) {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    if (!storedToken || !submittedToken) return false;
    return storedToken === submittedToken;
  }

  // Inject hidden CSRF token field into all protected forms
  function injectIntoForms() {
    const token = get();
    document.querySelectorAll('form[data-protected]').forEach(form => {
      let field = form.querySelector('input[name="_csrf"]');
      if (!field) {
        field      = document.createElement('input');
        field.type = 'hidden';
        field.name = '_csrf';
        form.appendChild(field);
      }
      field.value = token;
    });
  }

  return { generate, get, validate, injectIntoForms };
})();

window.CSRFProtection = CSRFProtection;

/* ================================================================
   HONEYPOT FIELD SYSTEM
   Invisible fields bots fill in — real users never see them.
   If a honeypot field has a value on submit → reject the form.
   ================================================================ */
const Honeypot = (() => {

  const FIELD_NAMES = ['website', 'url', 'fax', 'company_name', 'address2'];

  function inject(form) {
    if (!form) return;

    // Pick a random field name so bots can't hardcode ignoring it
    const name  = FIELD_NAMES[Math.floor(Math.random() * FIELD_NAMES.length)];
    const wrap  = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      tab-index: -1;
    `;

    const label       = document.createElement('label');
    label.htmlFor     = `hp_${name}`;
    label.textContent = 'Leave this empty';

    const input       = document.createElement('input');
    input.type        = 'text';
    input.id          = `hp_${name}`;
    input.name        = `hp_${name}`;
    input.value       = '';
    input.tabIndex    = -1;
    input.autocomplete = 'off';

    // Store field name on the form for validation
    form.dataset.honeypotField = `hp_${name}`;

    wrap.appendChild(label);
    wrap.appendChild(input);
    form.appendChild(wrap);
  }

  function check(form) {
    const fieldName = form.dataset.honeypotField;
    if (!fieldName) return true; // No honeypot = pass

    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!field) return true;

    if (field.value.trim() !== '') {
      console.warn('[Security] Honeypot triggered — bot detected.');
      return false; // Bot detected
    }
    return true; // Human
  }

  function injectAll() {
    document.querySelectorAll('form[data-protected]').forEach(inject);
  }

  return { inject, check, injectAll };
})();

window.Honeypot = Honeypot;

/* ================================================================
   SUBMIT TIME GUARD
   Real users take at least 3 seconds to fill a form.
   Bots submit instantly. Track form render time.
   ================================================================ */
const SubmitTimeGuard = (() => {

  const MIN_SECONDS = 3;

  function stamp(form) {
    if (!form) return;
    form.dataset.renderTime = Date.now().toString();
  }

  function check(form) {
    const renderTime = parseInt(form.dataset.renderTime || '0');
    if (!renderTime) return true; // No stamp = pass (backwards compat)

    const elapsed = (Date.now() - renderTime) / 1000;
    if (elapsed < MIN_SECONDS) {
      console.warn(`[Security] Form submitted too fast (${elapsed.toFixed(1)}s). Possible bot.`);
      return false;
    }
    return true;
  }

  function stampAll() {
    document.querySelectorAll('form[data-protected]').forEach(stamp);
  }

  return { stamp, check, stampAll };
})();

window.SubmitTimeGuard = SubmitTimeGuard;

/* ================================================================
   ADVANCED INPUT SANITIZER
   Strips all dangerous content from user input before storage.
   ================================================================ */
const Sanitizer = (() => {

  // Strip HTML tags and dangerous characters
  function stripHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
  }

  // Remove script injection patterns
  function stripScripts(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')        // onclick=, onload=, etc.
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '');
  }

  // Remove SQL injection patterns
  function stripSQL(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|GRANT|REVOKE)(\b)/gi, '')
      .replace(/--/g, '')
      .replace(/;/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // Full sanitize: run all filters
  function clean(str, options = {}) {
    if (typeof str !== 'string') return '';
    let out = str;
    out = stripHTML(out);
    out = stripScripts(out);
    if (!options.allowSQL) out = stripSQL(out);
    out = out.trim();

    // Enforce max length
    if (options.maxLength) {
      out = out.substring(0, options.maxLength);
    }

    return out;
  }

  // Sanitize an entire form's inputs before processing
  function cleanForm(form) {
    const cleaned = {};
    const inputs  = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea');

    inputs.forEach(input => {
      if (input.name && !input.name.startsWith('hp_')) {
        cleaned[input.name] = clean(input.value, { maxLength: 500 });
      }
    });

    // Checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.name) cleaned[cb.name] = cb.checked;
    });

    return cleaned;
  }

  // Sanitize phone: digits only, max 10
  function phone(str) {
    return str.replace(/\D/g, '').substring(0, 10);
  }

  // Sanitize name: letters, spaces, dots, hyphens only
  function name(str) {
    return clean(str).replace(/[^a-zA-Z\u0900-\u097F\s.\-']/g, '').substring(0, 100);
  }

  // Sanitize email: lowercase, strip spaces
  function email(str) {
    return clean(str).toLowerCase().replace(/\s/g, '').substring(0, 254);
  }

  // Sanitize Aadhaar: digits only, max 12
  function aadhaar(str) {
    return str.replace(/\D/g, '').substring(0, 12);
  }

  return { clean, cleanForm, stripHTML, stripScripts, stripSQL, phone, name, email, aadhaar };
})();

window.Sanitizer = Sanitizer;

/* ================================================================
   PASSWORD STRENGTH CHECKER
   ================================================================ */
const PasswordChecker = (() => {

  function score(password) {
    let points = 0;
    const checks = {
      length8   : password.length >= 8,
      length12  : password.length >= 12,
      uppercase : /[A-Z]/.test(password),
      lowercase : /[a-z]/.test(password),
      digit     : /\d/.test(password),
      special   : /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    };

    if (checks.length8)   points += 1;
    if (checks.length12)  points += 1;
    if (checks.uppercase) points += 1;
    if (checks.lowercase) points += 1;
    if (checks.digit)     points += 1;
    if (checks.special)   points += 2;

    return { points, checks };
  }

  function label(points) {
    if (points <= 1) return { text: 'Very Weak', color: '#e53935', width: '15%' };
    if (points <= 2) return { text: 'Weak',      color: '#FF6B00', width: '30%' };
    if (points <= 3) return { text: 'Fair',       color: '#FFC107', width: '50%' };
    if (points <= 4) return { text: 'Good',       color: '#8BC34A', width: '70%' };
    return                  { text: 'Strong',     color: '#4CAF50', width: '100%' };
  }

  // Attach live password strength UI to an input
  function attach(inputId, barId, labelId) {
    const input = document.getElementById(inputId);
    const bar   = document.getElementById(barId);
    const lbl   = document.getElementById(labelId);
    if (!input) return;

    input.addEventListener('input', () => {
      const { points } = score(input.value);
      const info       = label(points);

      if (bar) {
        bar.style.width      = info.width;
        bar.style.background = info.color;
        bar.style.transition = 'all 0.3s ease';
      }
      if (lbl) {
        lbl.textContent = input.value ? info.text : '';
        lbl.style.color = info.color;
      }
    });
  }

  return { score, label, attach };
})();

window.PasswordChecker = PasswordChecker;

/* ================================================================
   CONTENT SECURITY: Disable right-click + text selection
   on ID cards and sensitive membership data
   ================================================================ */
function initContentProtection() {
  const protectedEls = document.querySelectorAll(
    '.id-card, .member-id-display, .id-card-id'
  );

  protectedEls.forEach(el => {
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.style.userSelect     = 'none';
    el.style.webkitUserSelect = 'none';
  });
}

/* ================================================================
   SESSION INTEGRITY CHECK
   Validate stored session hasn't been tampered with
   ================================================================ */
function validateSessionIntegrity() {
  try {
    const raw = sessionStorage.getItem('jkp_session');
    if (!raw) return true; // No session = OK

    const session = JSON.parse(raw);

    // Must have required fields
    const required = ['id', 'name', 'email', 'membershipType', 'memberId', 'loginTime'];
    const hasAll   = required.every(key => Object.prototype.hasOwnProperty.call(session, key));

    if (!hasAll) {
      sessionStorage.removeItem('jkp_session');
      return false;
    }

    // Session must not be older than 8 hours
    const MAX_AGE = 8 * 60 * 60 * 1000;
    if (Date.now() - session.loginTime > MAX_AGE) {
      sessionStorage.removeItem('jkp_session');
      Toast.show('Your session has expired. Please log in again.', 'info');
      return false;
    }

    return true;
  } catch {
    sessionStorage.removeItem('jkp_session');
    return false;
  }
}

window.validateSessionIntegrity = validateSessionIntegrity;

/* ================================================================
   SECURE LOCAL STORAGE WRAPPER
   Adds basic obfuscation to stored data
   ================================================================ */
const SecureStore = (() => {

  const PREFIX = 'jkp_';

  function encode(data) {
    try {
      return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch {
      return null;
    }
  }

  function decode(raw) {
    try {
      return JSON.parse(decodeURIComponent(atob(raw)));
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      const encoded = encode(value);
      if (encoded) localStorage.setItem(PREFIX + key, encoded);
    } catch {
      // Storage unavailable
    }
  }

  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? decode(raw) : null;
    } catch {
      return null;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  }

  function clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  return { set, get, remove, clear };
})();

window.SecureStore = SecureStore;

/* ================================================================
   DUPLICATE SUBMISSION PREVENTION
   Prevents the same form from being submitted twice
   ================================================================ */
const SubmitGuard = (() => {
  const submitted = new Set();

  function lock(formId) {
    if (submitted.has(formId)) return false; // Already submitted
    submitted.add(formId);
    return true;
  }

  function unlock(formId) {
    submitted.delete(formId);
  }

  function lockButton(btn, text = 'Please wait...') {
    if (!btn) return;
    btn.disabled          = true;
    btn.dataset.origText  = btn.textContent;
    btn.textContent       = text;
    btn.style.opacity     = '0.7';
    btn.style.cursor      = 'not-allowed';
  }

  function unlockButton(btn) {
    if (!btn) return;
    btn.disabled      = false;
    btn.textContent   = btn.dataset.origText || btn.textContent;
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  }

  return { lock, unlock, lockButton, unlockButton };
})();

window.SubmitGuard = SubmitGuard;

/* ================================================================
   PHONE INPUT AUTO-FORMAT
   ================================================================ */
function initPhoneInputs() {
  document.querySelectorAll('input[type="tel"], input[name="phone"], input[name="mobile"]').forEach(input => {
    input.addEventListener('input', () => {
      // Remove non-digits
      let val = input.value.replace(/\D/g, '');
      // Limit to 10 digits
      val = val.substring(0, 10);
      input.value = val;
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pasted.replace(/\D/g, '').substring(0, 10);
      input.value  = digits;
    });
  });
}

/* ================================================================
   AADHAAR INPUT AUTO-FORMAT (####-####-####)
   ================================================================ */
function initAadhaarInputs() {
  document.querySelectorAll('input[name="aadhaar"]').forEach(input => {
    input.addEventListener('input', () => {
      let val = input.value.replace(/\D/g, '').substring(0, 12);
      // Group as #### #### ####
      val = val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      input.value = val;
    });
  });
}

/* ================================================================
   PASSWORD TOGGLE (show/hide)
   ================================================================ */
function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      if (target.type === 'password') {
        target.type   = 'text';
        btn.textContent = '🙈';
        btn.title = 'Hide password';
      } else {
        target.type   = 'password';
        btn.textContent = '👁';
        btn.title = 'Show password';
      }
    });
  });
}

/* ================================================================
   INIT ALL SECURITY FEATURES
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  CSRFProtection.injectIntoForms();
  Honeypot.injectAll();
  SubmitTimeGuard.stampAll();
  initContentProtection();
  validateSessionIntegrity();
  initPhoneInputs();
  initAadhaarInputs();
  initPasswordToggles();

  console.log('%c🔒 Security module loaded', 'color:#4CAF50;font-size:11px;');
});
