/* ================================================================
   JAN KALYAN PARTY — membership.js
   Handles: General Member, Active Member, Volunteer registration,
            Unique ID generation, ID card rendering, form flows
   Depends on: main.js, security.js, auth.js
   ================================================================ */

'use strict';

/* ================================================================
   MEMBERSHIP ID GENERATOR
   Format:
     General Member  → JKP-GM-YYYY-XXXXXX
     Active Member   → JKP-AM-YYYY-XXXXXX
     Volunteer       → JKP-VOL-YYYY-XXXXXX
   ================================================================ */
const IDGenerator = (() => {

  const USED_KEY = 'used_ids';

  function getUsedIDs() {
    return SecureStore.get(USED_KEY) || [];
  }

  function markUsed(id) {
    const used = getUsedIDs();
    used.push(id);
    SecureStore.set(USED_KEY, used);
  }

  function isUsed(id) {
    return getUsedIDs().includes(id);
  }

  function generate(type = 'GM') {
    const year   = new Date().getFullYear();
    let id;
    // Keep generating until unique
    do {
      const random = Math.floor(100000 + Math.random() * 900000);
      id = `JKP-${type}-${year}-${random}`;
    } while (isUsed(id));

    markUsed(id);
    return id;
  }

  function forType(membershipType) {
    const typeMap = {
      'general'   : 'GM',
      'active'    : 'AM',
      'volunteer' : 'VOL',
    };
    const code = typeMap[membershipType] || 'GM';
    return generate(code);
  }

  return { generate, forType };
})();

window.IDGenerator = IDGenerator;

/* ================================================================
   ID CARD RENDERER
   Builds the visual HTML membership card
   ================================================================ */
const IDCardRenderer = (() => {

  const typeLabels = {
    'general'   : 'General Member',
    'active'    : 'Active Member',
    'volunteer' : 'Volunteer',
  };

  const typeColors = {
    'general'   : 'linear-gradient(135deg, #1565C0, #1976D2)',
    'active'    : 'linear-gradient(135deg, #E55A00, #FF6B00)',
    'volunteer' : 'linear-gradient(135deg, #2E7D32, #388E3C)',
  };

  function render(data) {
    const {
      name, memberId, membershipType,
      state, district, phone, email,
      issuedDate
    } = data;

    const bgColor   = typeColors[membershipType]  || typeColors['general'];
    const typeLabel = typeLabels[membershipType] || 'Member';

    return `
      <div class="id-card" style="background: ${bgColor};" id="rendered-id-card">
        <div class="id-card-top">
          <img src="assets/logo.png" alt="JKP Logo" onerror="this.style.display='none'">
          <div>
            <div class="id-card-pname">Jan Kalyan Party</div>
            <div class="id-card-pslogan">जात पर न पात पर, प्राथमिकता विकास पर</div>
          </div>
          <div style="margin-left:auto; text-align:right;">
            <div style="font-size:0.62rem; opacity:0.65; text-transform:uppercase; letter-spacing:1px;">Official</div>
            <div style="font-size:0.75rem; font-weight:700;">Membership Card</div>
          </div>
        </div>

        <div class="id-card-hr"></div>

        <div class="id-card-name">${sanitizeHTML(name)}</div>
        <div class="id-card-type">${typeLabel}</div>

        <div class="id-card-row">
          <div class="id-card-field">
            <label>Member ID</label>
            <span class="id-card-id">${sanitizeHTML(memberId)}</span>
          </div>
          <div class="id-card-field">
            <label>State</label>
            <span>${sanitizeHTML(state || '—')}</span>
          </div>
          ${district ? `
          <div class="id-card-field">
            <label>District</label>
            <span>${sanitizeHTML(district)}</span>
          </div>` : ''}
        </div>

        <div class="id-card-row" style="margin-top:10px;">
          ${phone ? `
          <div class="id-card-field">
            <label>Mobile</label>
            <span>${sanitizeHTML(phone)}</span>
          </div>` : ''}
          <div class="id-card-field">
            <label>Issue Date</label>
            <span>${sanitizeHTML(issuedDate)}</span>
          </div>
        </div>

        <div class="id-card-hr" style="margin-top:14px;"></div>
        <div class="id-card-issued">
          ✦ Jan Kalyan Party | jankalyanpartyofficial@gmail.com | +91 7376409590
        </div>
      </div>
    `;
  }

  return { render };
})();

window.IDCardRenderer = IDCardRenderer;

/* ================================================================
   MEMBERSHIP FORM HANDLER — General & Active Member
   ================================================================ */
const MembershipForm = (() => {

  async function submit(formEl, membershipType) {

    // --- Security checks ---
    if (!Honeypot.check(formEl)) {
      Toast.show('Submission blocked. Please try again.', 'error');
      return false;
    }
    if (!SubmitTimeGuard.check(formEl)) {
      Toast.show('Please take a moment to fill out the form carefully.', 'error');
      return false;
    }
    if (!RateLimiter.check('membership', 3, 120000)) {
      Toast.show('Too many attempts. Please wait 2 minutes.', 'error');
      return false;
    }

    // --- Get raw values ---
    const raw = {
      name     : formEl.querySelector('[name="mem_name"]')?.value     || '',
      email    : formEl.querySelector('[name="mem_email"]')?.value    || '',
      phone    : formEl.querySelector('[name="mem_phone"]')?.value    || '',
      dob      : formEl.querySelector('[name="mem_dob"]')?.value      || '',
      gender   : formEl.querySelector('[name="mem_gender"]')?.value   || '',
      aadhaar  : formEl.querySelector('[name="mem_aadhaar"]')?.value  || '',
      state    : formEl.querySelector('[name="mem_state"]')?.value    || '',
      district : formEl.querySelector('[name="mem_district"]')?.value || '',
      address  : formEl.querySelector('[name="mem_address"]')?.value  || '',
      agree    : formEl.querySelector('[name="mem_agree"]')?.checked  || false,
    };

    // --- Sanitize ---
    const data = {
      name     : Sanitizer.name(raw.name),
      email    : Sanitizer.email(raw.email),
      phone    : Sanitizer.phone(raw.phone),
      dob      : Sanitizer.clean(raw.dob,      { maxLength: 20  }),
      gender   : Sanitizer.clean(raw.gender,   { maxLength: 20  }),
      aadhaar  : Sanitizer.aadhaar(raw.aadhaar),
      state    : Sanitizer.clean(raw.state,    { maxLength: 60  }),
      district : Sanitizer.clean(raw.district, { maxLength: 60  }),
      address  : Sanitizer.clean(raw.address,  { maxLength: 300 }),
      agree    : raw.agree,
    };

    // --- Validate ---
    const rules = [
      { field: 'mem_name',    required: true, minLength: 3, requiredMsg: 'Full name is required.' },
      { field: 'mem_email',   required: true, type: 'email', requiredMsg: 'Email is required.' },
      { field: 'mem_phone',   required: true, type: 'phone', requiredMsg: 'Mobile number is required.' },
      { field: 'mem_dob',     required: true, requiredMsg: 'Date of birth is required.' },
      { field: 'mem_gender',  required: true, requiredMsg: 'Please select gender.' },
      { field: 'mem_aadhaar', required: true, type: 'aadhaar', requiredMsg: 'Aadhaar number is required.' },
      { field: 'mem_state',   required: true, requiredMsg: 'Please select your state.' },
    ];

    if (!Validator.validate(formEl, rules)) return false;

    if (!data.agree) {
      Toast.show('Please agree to the Terms & Conditions.', 'error');
      return false;
    }

    // --- Age validation (must be 18+) ---
    if (data.dob) {
      const dob     = new Date(data.dob);
      const today   = new Date();
      const age     = today.getFullYear() - dob.getFullYear();
      const monthOk = today.getMonth() > dob.getMonth() ||
                      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
      const realAge = monthOk ? age : age - 1;

      if (realAge < 18) {
        const dobInput = formEl.querySelector('[name="mem_dob"]');
        Validator.showError(dobInput, 'You must be at least 18 years old to register.');
        return false;
      }
    }

    // --- Generate membership ID ---
    const memberId   = IDGenerator.forType(membershipType);
    const issuedDate = formatDate();

    // --- Save to UserStore (if logged in, update existing; else create new) ---
    const session = getSession();
    if (session && session.id) {
      UserStore.update(session.id, {
        membershipType,
        memberId,
        status    : 'active',
        phone     : data.phone     || session.phone,
        state     : data.state     || session.state,
        district  : data.district  || session.district,
        aadhaar   : data.aadhaar,
        dob       : data.dob,
        gender    : data.gender,
        address   : data.address,
        issuedDate,
      });
      refreshSessionAfterMembership(session.id);
    } else {
      // Stand-alone membership (not logged in — store separately)
      const record = {
        id             : 'MEM_' + Date.now(),
        name           : data.name,
        email          : data.email,
        phone          : data.phone,
        dob            : data.dob,
        gender         : data.gender,
        aadhaar        : data.aadhaar,
        state          : data.state,
        district       : data.district,
        address        : data.address,
        membershipType,
        memberId,
        issuedDate,
        status         : 'active',
        joinedDate     : issuedDate,
        joinedTimestamp: Date.now(),
      };
      // Store in a separate list
      const existing = SecureStore.get('standalone_members') || [];
      existing.push(record);
      SecureStore.set('standalone_members', existing);
    }

    return {
      success   : true,
      memberId,
      issuedDate,
      data      : { ...data, membershipType },
    };
  }

  return { submit };
})();

window.MembershipForm = MembershipForm;

/* ================================================================
   VOLUNTEER FORM HANDLER
   ================================================================ */
const VolunteerForm = (() => {

  async function submit(formEl) {

    // --- Security checks ---
    if (!Honeypot.check(formEl)) {
      Toast.show('Submission blocked. Please try again.', 'error');
      return false;
    }
    if (!SubmitTimeGuard.check(formEl)) {
      Toast.show('Please take a moment to fill out the form carefully.', 'error');
      return false;
    }
    if (!RateLimiter.check('volunteer', 3, 120000)) {
      Toast.show('Too many attempts. Please wait 2 minutes.', 'error');
      return false;
    }

    // --- Get raw values ---
    const raw = {
      name        : formEl.querySelector('[name="vol_name"]')?.value        || '',
      email       : formEl.querySelector('[name="vol_email"]')?.value       || '',
      phone       : formEl.querySelector('[name="vol_phone"]')?.value       || '',
      dob         : formEl.querySelector('[name="vol_dob"]')?.value         || '',
      gender      : formEl.querySelector('[name="vol_gender"]')?.value      || '',
      state       : formEl.querySelector('[name="vol_state"]')?.value       || '',
      district    : formEl.querySelector('[name="vol_district"]')?.value    || '',
      address     : formEl.querySelector('[name="vol_address"]')?.value     || '',
      occupation  : formEl.querySelector('[name="vol_occupation"]')?.value  || '',
      skills      : formEl.querySelector('[name="vol_skills"]')?.value      || '',
      availability: formEl.querySelector('[name="vol_availability"]')?.value|| '',
      agree       : formEl.querySelector('[name="vol_agree"]')?.checked     || false,
    };

    // --- Sanitize ---
    const data = {
      name        : Sanitizer.name(raw.name),
      email       : Sanitizer.email(raw.email),
      phone       : Sanitizer.phone(raw.phone),
      dob         : Sanitizer.clean(raw.dob,          { maxLength: 20  }),
      gender      : Sanitizer.clean(raw.gender,       { maxLength: 20  }),
      state       : Sanitizer.clean(raw.state,        { maxLength: 60  }),
      district    : Sanitizer.clean(raw.district,     { maxLength: 60  }),
      address     : Sanitizer.clean(raw.address,      { maxLength: 300 }),
      occupation  : Sanitizer.clean(raw.occupation,   { maxLength: 100 }),
      skills      : Sanitizer.clean(raw.skills,       { maxLength: 500 }),
      availability: Sanitizer.clean(raw.availability, { maxLength: 60  }),
      agree       : raw.agree,
    };

    // --- Validate ---
    const rules = [
      { field: 'vol_name',         required: true, minLength: 3, requiredMsg: 'Full name is required.' },
      { field: 'vol_email',        required: true, type: 'email', requiredMsg: 'Email is required.' },
      { field: 'vol_phone',        required: true, type: 'phone', requiredMsg: 'Mobile number is required.' },
      { field: 'vol_dob',          required: true, requiredMsg: 'Date of birth is required.' },
      { field: 'vol_gender',       required: true, requiredMsg: 'Please select gender.' },
      { field: 'vol_state',        required: true, requiredMsg: 'Please select your state.' },
      { field: 'vol_availability', required: true, requiredMsg: 'Please select availability.' },
    ];

    if (!Validator.validate(formEl, rules)) return false;

    if (!data.agree) {
      Toast.show('Please agree to the Terms & Conditions.', 'error');
      return false;
    }

    // --- Age check (18+) ---
    if (data.dob) {
      const dob   = new Date(data.dob);
      const today = new Date();
      let age     = today.getFullYear() - dob.getFullYear();
      const m     = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        Validator.showError(formEl.querySelector('[name="vol_dob"]'), 'You must be at least 18 years old.');
        return false;
      }
    }

    // --- Generate Volunteer ID ---
    const volunteerId = IDGenerator.forType('volunteer');
    const issuedDate  = formatDate();

    // --- Save ---
    const session = getSession();
    if (session && session.id) {
      UserStore.update(session.id, {
        membershipType : 'volunteer',
        volunteerId,
        memberId       : volunteerId,
        status         : 'active',
        phone          : data.phone    || session.phone,
        state          : data.state    || session.state,
        district       : data.district || session.district,
        occupation     : data.occupation,
        skills         : data.skills,
        availability   : data.availability,
        issuedDate,
      });
      refreshSessionAfterMembership(session.id);
    } else {
      const record = {
        id             : 'VOL_' + Date.now(),
        ...data,
        membershipType : 'volunteer',
        volunteerId,
        memberId       : volunteerId,
        issuedDate,
        status         : 'active',
        joinedDate     : issuedDate,
        joinedTimestamp: Date.now(),
      };
      const existing = SecureStore.get('standalone_volunteers') || [];
      existing.push(record);
      SecureStore.set('standalone_volunteers', existing);
    }

    return {
      success     : true,
      volunteerId,
      issuedDate,
      data        : { ...data, membershipType: 'volunteer' },
    };
  }

  return { submit };
})();

window.VolunteerForm = VolunteerForm;

/* ================================================================
   SHOW SUCCESS STATE WITH ID CARD
   Called after successful form submission
   ================================================================ */
function showMembershipSuccess(containerEl, result, isVolunteer = false) {
  const { memberId, volunteerId, issuedDate, data } = result;
  const finalId    = memberId || volunteerId;
  const memberType = isVolunteer ? 'volunteer' : data.membershipType;

  const cardHTML = IDCardRenderer.render({
    name           : data.name,
    memberId       : finalId,
    membershipType : memberType,
    state          : data.state,
    district       : data.district,
    phone          : data.phone,
    issuedDate,
  });

  containerEl.innerHTML = `
    <div class="success-box">
      <div class="success-icon">🎉</div>
      <div class="success-title">
        ${isVolunteer ? 'Welcome, Volunteer!' : 'Membership Successful!'}
      </div>
      <div class="success-desc">
        ${isVolunteer
          ? `Thank you for joining as a <strong>Volunteer</strong>. Your unique ID is below.`
          : `You are now a <strong>${data.membershipType === 'general' ? 'General' : 'Active'} Member</strong> of Jan Kalyan Party!`
        }
      </div>
    </div>

    ${cardHTML}

    <div style="display:flex; gap:12px; margin-top:18px; flex-wrap:wrap; justify-content:center;">
      <button class="btn btn-blue btn-sm" onclick="printIDCard('rendered-id-card')">
        🖨️ Print ID Card
      </button>
      <button class="btn btn-outline-orange btn-sm" onclick="copyToClipboard('${finalId}', 'Member ID copied!')">
        📋 Copy Member ID
      </button>
      <a href="member-area.html" class="btn btn-orange btn-sm">
        👤 Go to Member Area
      </a>
    </div>

    <p style="font-size:0.76rem; color:var(--gray-600); text-align:center; margin-top:14px;">
      📧 A confirmation will be sent to <strong>${sanitizeHTML(data.email)}</strong> once our team processes your application.
    </p>
  `;
}

window.showMembershipSuccess = showMembershipSuccess;

/* ================================================================
   MEMBERSHIP PAGE CONTROLLER
   Controls modal flows and form submissions on membership.html
   ================================================================ */
function initMembershipPage() {

  // ---- General Member Form ----
  const generalForm = document.getElementById('general-member-form');
  if (generalForm) {
    Validator.attachLiveClear(generalForm);
    Honeypot.inject(generalForm);
    SubmitTimeGuard.stamp(generalForm);

    generalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn    = generalForm.querySelector('[type="submit"]');
      const result = await handleMemberFormSubmit(generalForm, 'general', btn);
      if (result) {
        const container = document.getElementById('general-form-container');
        if (container) showMembershipSuccess(container, result);
      }
    });
  }

  // ---- Active Member Form ----
  const activeForm = document.getElementById('active-member-form');
  if (activeForm) {
    Validator.attachLiveClear(activeForm);
    Honeypot.inject(activeForm);
    SubmitTimeGuard.stamp(activeForm);

    activeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn    = activeForm.querySelector('[type="submit"]');
      const result = await handleMemberFormSubmit(activeForm, 'active', btn);
      if (result) {
        const container = document.getElementById('active-form-container');
        if (container) showMembershipSuccess(container, result);
      }
    });
  }

  // ---- Volunteer Form ----
  const volunteerForm = document.getElementById('volunteer-form');
  if (volunteerForm) {
    Validator.attachLiveClear(volunteerForm);
    Honeypot.inject(volunteerForm);
    SubmitTimeGuard.stamp(volunteerForm);

    volunteerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn    = volunteerForm.querySelector('[type="submit"]');
      SubmitGuard.lockButton(btn, 'Submitting...');

      const result = await VolunteerForm.submit(volunteerForm);

      if (result && result.success) {
        const container = document.getElementById('volunteer-form-container');
        if (container) showMembershipSuccess(container, result, true);
        Toast.show('Volunteer registration successful!', 'success');
      } else {
        SubmitGuard.unlockButton(btn);
      }
    });
  }
}

async function handleMemberFormSubmit(formEl, membershipType, btn) {
  SubmitGuard.lockButton(btn, 'Submitting...');
  const result = await MembershipForm.submit(formEl, membershipType);
  if (result && result.success) {
    Toast.show(`${membershipType === 'general' ? 'General' : 'Active'} Membership registered!`, 'success');
    return result;
  } else {
    SubmitGuard.unlockButton(btn);
    return null;
  }
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMembershipPage();
  console.log('%c🪪 Membership module loaded', 'color:#FF6B00;font-size:11px;');
});
