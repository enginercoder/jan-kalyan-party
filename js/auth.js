/* ================================================================
   JAN KALYAN PARTY — auth.js
   Handles: User Registration, Login, Logout, Session Management,
            Member Area Dashboard population
   Depends on: main.js, security.js
   ================================================================ */

'use strict';

/* ================================================================
   USER STORE
   Manages users in SecureStore (localStorage with obfuscation)
   In production: replace with real API calls
   ================================================================ */
const UserStore = (() => {

  const KEY = 'users';

  function getAll() {
    return SecureStore.get(KEY) || [];
  }

  function save(users) {
    SecureStore.set(KEY, users);
  }

  function findByEmail(email) {
    const users = getAll();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  function findByPhone(phone) {
    const users = getAll();
    return users.find(u => u.phone === phone) || null;
  }

  function findById(id) {
    const users = getAll();
    return users.find(u => u.id === id) || null;
  }

  function add(user) {
    const users = getAll();
    users.push(user);
    save(users);
  }

  function update(id, updates) {
    const users   = getAll();
    const index   = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users[index]  = { ...users[index], ...updates };
    save(users);
    return true;
  }

  function emailExists(email) {
    return !!findByEmail(email);
  }

  function phoneExists(phone) {
    return !!findByPhone(phone);
  }

  return { getAll, findByEmail, findByPhone, findById, add, update, emailExists, phoneExists };
})();

window.UserStore = UserStore;

/* ================================================================
   SIMPLE PASSWORD HASH
   In production: use bcrypt via backend.
   For static/demo: SHA-256 via Web Crypto API
   ================================================================ */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  // Add a static salt prefix for demo — in production use unique per-user salt
  const data    = encoder.encode('JKP_SALT_2024_' + password);
  const hash    = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/* ================================================================
   REGISTRATION
   ================================================================ */
const Registration = (() => {

  async function submit(formEl) {

    // 1. Honeypot check
    if (!Honeypot.check(formEl)) {
      Toast.show('Registration blocked. Please try again.', 'error');
      return false;
    }

    // 2. Submit time guard
    if (!SubmitTimeGuard.check(formEl)) {
      Toast.show('Please take your time filling the form.', 'error');
      return false;
    }

    // 3. Rate limiting (max 3 registrations per minute per browser)
    if (!RateLimiter.check('register', 3, 60000)) {
      Toast.show('Too many attempts. Please wait a minute and try again.', 'error');
      return false;
    }

    // 4. Get & sanitize values
    const raw = {
      name            : formEl.querySelector('[name="reg_name"]')?.value || '',
      email           : formEl.querySelector('[name="reg_email"]')?.value || '',
      phone           : formEl.querySelector('[name="reg_phone"]')?.value || '',
      password        : formEl.querySelector('[name="reg_password"]')?.value || '',
      confirmPassword : formEl.querySelector('[name="reg_confirm_password"]')?.value || '',
      state           : formEl.querySelector('[name="reg_state"]')?.value || '',
      district        : formEl.querySelector('[name="reg_district"]')?.value || '',
      agree           : formEl.querySelector('[name="reg_agree"]')?.checked || false,
    };

    const data = {
      name     : Sanitizer.name(raw.name),
      email    : Sanitizer.email(raw.email),
      phone    : Sanitizer.phone(raw.phone),
      password : raw.password,    // Hash before storing
      confirmPassword : raw.confirmPassword,
      state    : Sanitizer.clean(raw.state, { maxLength: 60 }),
      district : Sanitizer.clean(raw.district, { maxLength: 60 }),
      agree    : raw.agree,
    };

    // 5. Validate
    const rules = [
      { field: 'reg_name',             required: true,  minLength: 3,  requiredMsg: 'Full name is required.' },
      { field: 'reg_email',            required: true,  type: 'email', requiredMsg: 'Email address is required.' },
      { field: 'reg_phone',            required: true,  type: 'phone', requiredMsg: 'Mobile number is required.' },
      { field: 'reg_password',         required: true,  minLength: 8,  requiredMsg: 'Password is required.' },
      { field: 'reg_confirm_password', required: true,  match: 'reg_password', matchMsg: 'Passwords do not match.', requiredMsg: 'Please confirm your password.' },
      { field: 'reg_state',            required: true,  requiredMsg: 'Please select your state.' },
    ];

    if (!Validator.validate(formEl, rules)) return false;

    // 6. Terms agreement
    if (!data.agree) {
      Toast.show('Please agree to the Terms & Conditions.', 'error');
      return false;
    }

    // 7. Check duplicates
    if (UserStore.emailExists(data.email)) {
      const emailInput = formEl.querySelector('[name="reg_email"]');
      Validator.showError(emailInput, 'This email is already registered.');
      return false;
    }

    if (data.phone && UserStore.phoneExists(data.phone)) {
      const phoneInput = formEl.querySelector('[name="reg_phone"]');
      Validator.showError(phoneInput, 'This mobile number is already registered.');
      return false;
    }

    // 8. Hash password
    const passwordHash = await hashPassword(data.password);

    // 9. Create user object
    const userId   = 'USR_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
    const newUser  = {
      id             : userId,
      name           : data.name,
      email          : data.email,
      phone          : data.phone,
      passwordHash   : passwordHash,
      state          : data.state,
      district       : data.district,
      membershipType : null,      // Set after membership form
      memberId       : null,      // Set after membership form
      volunteerId    : null,
      status         : 'registered',
      joinedDate     : formatDate(),
      joinedTimestamp: Date.now(),
    };

    // 10. Save user
    UserStore.add(newUser);

    // 11. Auto login after registration
    const session = buildSession(newUser);
    setSession(session);

    Toast.show(`Welcome, ${data.name}! Account created successfully.`, 'success');
    return { success: true, user: newUser };
  }

  return { submit };
})();

window.Registration = Registration;

/* ================================================================
   LOGIN
   ================================================================ */
const Login = (() => {

  async function submit(formEl) {

    // 1. Rate limiting (max 5 login attempts per minute)
    if (!RateLimiter.check('login', 5, 60000)) {
      Toast.show('Too many login attempts. Please wait a minute.', 'error');
      return false;
    }

    // 2. Get values
    const identifier = Sanitizer.clean(
      formEl.querySelector('[name="login_identifier"]')?.value || ''
    );
    const password   = formEl.querySelector('[name="login_password"]')?.value || '';

    // 3. Validate
    if (!identifier) {
      const el = formEl.querySelector('[name="login_identifier"]');
      Validator.showError(el, 'Email or mobile number is required.');
      return false;
    }
    if (!password) {
      const el = formEl.querySelector('[name="login_password"]');
      Validator.showError(el, 'Password is required.');
      return false;
    }

    // 4. Find user (by email or phone)
    let user = UserStore.findByEmail(identifier);
    if (!user) user = UserStore.findByPhone(identifier);

    if (!user) {
      const el = formEl.querySelector('[name="login_identifier"]');
      Validator.showError(el, 'No account found with this email or mobile number.');
      return false;
    }

    // 5. Verify password
    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      const el = formEl.querySelector('[name="login_password"]');
      Validator.showError(el, 'Incorrect password. Please try again.');
      return false;
    }

    // 6. Create session
    const session = buildSession(user);
    setSession(session);

    Toast.show(`Welcome back, ${user.name}!`, 'success');
    return { success: true, user };
  }

  return { submit };
})();

window.Login = Login;

/* ================================================================
   SESSION BUILDER
   ================================================================ */
function buildSession(user) {
  return {
    id             : user.id,
    name           : user.name,
    email          : user.email,
    phone          : user.phone,
    membershipType : user.membershipType,
    memberId       : user.memberId,
    volunteerId    : user.volunteerId,
    status         : user.status,
    state          : user.state,
    district       : user.district,
    joinedDate     : user.joinedDate,
    loginTime      : Date.now(),
  };
}

/* ================================================================
   LOGOUT
   ================================================================ */
function logout() {
  clearSession();
  Toast.show('You have been logged out successfully.', 'info', 2500);
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1500);
}

window.logout = logout;

/* ================================================================
   DASHBOARD POPULATION
   Reads session and fills in the Member Area dashboard
   ================================================================ */
function populateDashboard() {
  const session = getSession();
  if (!session) return;

  // Refresh with latest user data from store
  const user = UserStore.findById(session.id) || session;

  // Welcome message
  const welcomeEl = document.getElementById('dash-welcome-name');
  if (welcomeEl) welcomeEl.textContent = user.name;

  // Member ID display
  const memberIdEl = document.getElementById('dash-member-id');
  if (memberIdEl) {
    memberIdEl.textContent = user.memberId || user.volunteerId || 'Pending Membership';
  }

  // Membership type
  const memTypeEl = document.getElementById('dash-membership-type');
  if (memTypeEl) {
    memTypeEl.textContent = formatMembershipLabel(user.membershipType) || 'Not yet joined';
  }

  // Status badge
  const statusEl = document.getElementById('dash-status');
  if (statusEl) {
    const isActive = user.memberId || user.volunteerId;
    statusEl.innerHTML = isActive
      ? '<span class="badge-active">✓ Active</span>'
      : '<span class="badge-pending">⏳ Pending</span>';
  }

  // Personal info rows
  const fields = {
    'dash-name'     : user.name,
    'dash-email'    : user.email,
    'dash-phone'    : user.phone     || '—',
    'dash-state'    : user.state     || '—',
    'dash-district' : user.district  || '—',
    'dash-joined'   : user.joinedDate || '—',
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  // Populate ID card in dashboard
  populateIDCard(user);

  // Show/hide join membership prompt
  const joinPrompt = document.getElementById('dash-join-prompt');
  if (joinPrompt) {
    joinPrompt.style.display = (user.memberId || user.volunteerId) ? 'none' : 'block';
  }
}

function formatMembershipLabel(type) {
  const labels = {
    'general'   : '🔵 General Member',
    'active'    : '🟠 Active Member',
    'volunteer' : '🟢 Volunteer',
  };
  return labels[type] || null;
}

window.populateDashboard = populateDashboard;

/* ================================================================
   POPULATE ID CARD (inside dashboard)
   ================================================================ */
function populateIDCard(user) {
  const card = document.getElementById('dash-id-card');
  if (!card) return;

  const hasId = user.memberId || user.volunteerId;
  if (!hasId) {
    card.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--gray-600);">
        <p style="font-size:2rem;">🪪</p>
        <p style="font-weight:600; margin-top:8px;">No Membership Yet</p>
        <p style="font-size:0.82rem; margin-top:4px;">Join as a Member or Volunteer to get your official ID card.</p>
      </div>`;
    return;
  }

  const typeLabel = {
    'general'   : 'General Member',
    'active'    : 'Active Member',
    'volunteer' : 'Volunteer',
  };

  card.innerHTML = `
    <div class="id-card">
      <div class="id-card-top">
        <img src="assets/logo.png" alt="JKP Logo">
        <div>
          <div class="id-card-pname">Jan Kalyan Party</div>
          <div class="id-card-pslogan">जात पर न पात पर, प्राथमिकता विकास पर</div>
        </div>
      </div>
      <div class="id-card-hr"></div>
      <div class="id-card-name">${sanitizeHTML(user.name)}</div>
      <div class="id-card-type">${typeLabel[user.membershipType] || 'Member'}</div>
      <div class="id-card-row">
        <div class="id-card-field">
          <label>Member ID</label>
          <span class="id-card-id">${sanitizeHTML(user.memberId || user.volunteerId)}</span>
        </div>
        <div class="id-card-field">
          <label>State</label>
          <span>${sanitizeHTML(user.state || '—')}</span>
        </div>
        <div class="id-card-field">
          <label>Joined</label>
          <span>${sanitizeHTML(user.joinedDate || '—')}</span>
        </div>
      </div>
      <div class="id-card-issued">Issued by: Jan Kalyan Party | jankalyanpartyofficial@gmail.com</div>
    </div>
    <button class="btn btn-outline-orange btn-sm mt-2" onclick="printIDCard('dash-id-card')" style="margin-top:14px;">
      🖨️ Print / Download ID Card
    </button>
  `;
}

/* ================================================================
   MEMBER AREA PAGE CONTROLLER
   Manages tabs (Login / Register) and dashboard visibility
   ================================================================ */
function initMemberAreaPage() {
  const authCard      = document.getElementById('auth-card');
  const dashboardWrap = document.getElementById('dashboard-wrap');
  const loginForm     = document.getElementById('login-form');
  const registerForm  = document.getElementById('register-form');
  const tabLogin      = document.getElementById('tab-login');
  const tabRegister   = document.getElementById('tab-register');
  const logoutBtn     = document.getElementById('logout-btn');

  if (!authCard && !dashboardWrap) return; // Not on member area page

  // Check if already logged in
  const session = getSession();
  if (session && validateSessionIntegrity()) {
    showDashboard();
    populateDashboard();
  } else {
    showAuth();
  }

  // Tab switching
  if (tabLogin) {
    tabLogin.addEventListener('click', () => switchTab('login'));
  }
  if (tabRegister) {
    tabRegister.addEventListener('click', () => switchTab('register'));
  }

  // Login form submit
  if (loginForm) {
    Validator.attachLiveClear(loginForm);
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('[type="submit"]');
      SubmitGuard.lockButton(submitBtn, 'Logging in...');

      const result = await Login.submit(loginForm);

      if (result && result.success) {
        showDashboard();
        populateDashboard();
      } else {
        SubmitGuard.unlockButton(submitBtn);
      }
    });
  }

  // Register form submit
  if (registerForm) {
    Validator.attachLiveClear(registerForm);
    PasswordChecker.attach('reg_password', 'pwd-strength-bar', 'pwd-strength-label');

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('[type="submit"]');
      SubmitGuard.lockButton(submitBtn, 'Creating account...');

      const result = await Registration.submit(registerForm);

      if (result && result.success) {
        showDashboard();
        populateDashboard();
      } else {
        SubmitGuard.unlockButton(submitBtn);
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  function switchTab(tab) {
    if (!tabLogin || !tabRegister || !loginForm || !registerForm) return;

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
    }
  }

  function showDashboard() {
    if (authCard)      authCard.style.display      = 'none';
    if (dashboardWrap) {
      dashboardWrap.style.display = 'block';
      dashboardWrap.classList.add('active');
    }
  }

  function showAuth() {
    if (authCard)      authCard.style.display      = '';
    if (dashboardWrap) {
      dashboardWrap.style.display = 'none';
      dashboardWrap.classList.remove('active');
    }
  }
}

/* ================================================================
   UPDATE SESSION after membership is assigned
   Call this from membership.js after a member registers
   ================================================================ */
function refreshSessionAfterMembership(userId) {
  const user = UserStore.findById(userId);
  if (!user) return;

  const session = buildSession(user);
  setSession(session);
}

window.refreshSessionAfterMembership = refreshSessionAfterMembership;

/* ================================================================
   STATES LIST (Indian States & UTs)
   ================================================================ */
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Populate state dropdowns
function populateStateDropdowns() {
  document.querySelectorAll('select[name="reg_state"], select[name="mem_state"], select[name="vol_state"]').forEach(select => {
    // Keep first placeholder option
    const placeholder = select.querySelector('option[value=""]');
    select.innerHTML  = '';
    if (placeholder) select.appendChild(placeholder);

    INDIAN_STATES.forEach(state => {
      const opt   = document.createElement('option');
      opt.value   = state;
      opt.textContent = state;
      select.appendChild(opt);
    });
  });
}

window.INDIAN_STATES         = INDIAN_STATES;
window.populateStateDropdowns = populateStateDropdowns;

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  populateStateDropdowns();
  initMemberAreaPage();
  console.log('%c👤 Auth module loaded', 'color:#1565C0;font-size:11px;');
});
