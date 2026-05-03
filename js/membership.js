/* ================================================================
   JAN KALYAN PARTY — membership.js (Updated)
   Rules:
   - Age: 18+ for all types
   - General Member: Annual fee ₹10 minimum
   - Active Member: Auto-upgrade after adding 25 General Members
   - Tenure: 3 years, 1st April → 31st March
   - Aadhaar: 12 digits only
   - Email: Optional
   - Address: Village/City → Block → Sub District → District → Full Address
   ================================================================ */

'use strict';

/* ================================================================
   MEMBERSHIP TENURE CALCULATOR
   Starts: 1st April of current year (or next year if past March)
   Ends:   31st March, 3 years later
   ================================================================ */
const TenureCalc = (() => {

  function getStartDate() {
    const now   = new Date();
    const month = now.getMonth(); // 0=Jan, 3=April
    // If current month is Jan-March, start from April of THIS year
    // else start from April of NEXT year
    const startYear = month < 3 ? now.getFullYear() : now.getFullYear() + 1;
    // But if we are already in April or later of current year, start NOW
    // Simplified: always start from nearest 1st April
    const nearest = new Date(now.getFullYear(), 3, 1); // April 1 this year
    const start   = now >= nearest
      ? new Date(now.getFullYear(), 3, 1)       // April 1 this year
      : new Date(now.getFullYear() - 1, 3, 1);  // April 1 last year (already started)

    return start;
  }

  function getEndDate(startDate) {
    // 3 years from start, ending 31st March
    return new Date(startDate.getFullYear() + 3, 2, 31); // March 31
  }

  function formatTenure() {
    const start = getStartDate();
    const end   = getEndDate(start);
    const fmt   = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    return {
      start     : fmt(start),
      end       : fmt(end),
      startDate : start,
      endDate   : end,
      display   : `${fmt(start)} — ${fmt(end)}`
    };
  }

  return { getStartDate, getEndDate, formatTenure };
})();

window.TenureCalc = TenureCalc;

/* ================================================================
   ID GENERATOR
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
    if (!used.includes(id)) {
      used.push(id);
      SecureStore.set(USED_KEY, used);
    }
  }

  function isUsed(id) {
    return getUsedIDs().includes(id);
  }

  function generate(prefix = 'GM') {
    const year = new Date().getFullYear();
    let id;
    do {
      const random = Math.floor(100000 + Math.random() * 900000);
      id = `JKP-${prefix}-${year}-${random}`;
    } while (isUsed(id));
    markUsed(id);
    return id;
  }

  function forType(type) {
    const map = { general: 'GM', active: 'AM', volunteer: 'VOL' };
    return generate(map[type] || 'GM');
  }

  function exists(id) {
    // Check in all member stores
    const users      = SecureStore.get('users') || [];
    const standalone = SecureStore.get('standalone_members') || [];
    const all        = [...users, ...standalone];
    return all.some(u => u.memberId === id || u.volunteerId === id);
  }

  return { generate, forType, exists, isUsed };
})();

window.IDGenerator = IDGenerator;

/* ================================================================
   ID CARD RENDERER
   ================================================================ */
const IDCardRenderer = (() => {

  const typeLabels = {
    general   : 'General Member',
    active    : 'Active Member',
    volunteer : 'Volunteer',
  };

  const typeColors = {
    general   : 'linear-gradient(135deg, #1565C0, #1976D2)',
    active    : 'linear-gradient(135deg, #E55A00, #FF6B00)',
    volunteer : 'linear-gradient(135deg, #2E7D32, #388E3C)',
  };

  function render(data) {
    const {
      name, memberId, membershipType,
      state, district, subDistrict, block, village,
      issuedDate, tenureEnd, fee
    } = data;

    const bg    = typeColors[membershipType] || typeColors.general;
    const label = typeLabels[membershipType] || 'Member';

    return `
      <div class="id-card" style="background:${bg};" id="rendered-id-card">
        <div class="id-card-top">
          <img src="assets/logo.png" alt="JKP Logo" onerror="this.style.display='none'">
          <div>
            <div class="id-card-pname">Jan Kalyan Party</div>
            <div class="id-card-pslogan">जात पर न पात पर, प्राथमिकता विकास पर</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-size:0.60rem;opacity:0.65;text-transform:uppercase;letter-spacing:1px;">Official</div>
            <div style="font-size:0.72rem;font-weight:700;">Membership Card</div>
          </div>
        </div>

        <div class="id-card-hr"></div>

        <div class="id-card-name">${sanitizeHTML(name)}</div>
        <div class="id-card-type">${label}</div>

        <div class="id-card-row">
          <div class="id-card-field">
            <label>Member ID</label>
            <span class="id-card-id">${sanitizeHTML(memberId)}</span>
          </div>
          <div class="id-card-field">
            <label>State</label>
            <span>${sanitizeHTML(state || '—')}</span>
          </div>
          <div class="id-card-field">
            <label>District</label>
            <span>${sanitizeHTML(district || '—')}</span>
          </div>
        </div>

        <div class="id-card-row" style="margin-top:10px;">
          <div class="id-card-field">
            <label>Issue Date</label>
            <span>${sanitizeHTML(issuedDate)}</span>
          </div>
          <div class="id-card-field">
            <label>Valid Until</label>
            <span>${sanitizeHTML(tenureEnd || '—')}</span>
          </div>
          ${fee ? `
          <div class="id-card-field">
            <label>Annual Fee</label>
            <span>₹${sanitizeHTML(String(fee))}</span>
          </div>` : ''}
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
   MEMBERSHIP FORM — General Member
   ================================================================ */
const MembershipForm = (() => {

  async function submit(formEl, membershipType) {

    // Security
    if (!Honeypot.check(formEl)) {
      Toast.show('Submission blocked. Please try again.', 'error'); return false;
    }
    if (!RateLimiter.check('membership', 3, 120000)) {
      Toast.show('Too many attempts. Please wait 2 minutes.', 'error'); return false;
    }

    // Raw values
    const raw = {
      name        : formEl.querySelector('[name="mem_name"]')?.value        || '',
      dob         : formEl.querySelector('[name="mem_dob"]')?.value         || '',
      email       : formEl.querySelector('[name="mem_email"]')?.value       || '',
      phone       : formEl.querySelector('[name="mem_phone"]')?.value       || '',
      gender      : formEl.querySelector('[name="mem_gender"]')?.value      || '',
      aadhaar     : formEl.querySelector('[name="mem_aadhaar"]')?.value     || '',
      village     : formEl.querySelector('[name="mem_village"]')?.value     || '',
      block       : formEl.querySelector('[name="mem_block"]')?.value       || '',
      subDistrict : formEl.querySelector('[name="mem_sub_district"]')?.value|| '',
      district    : formEl.querySelector('[name="mem_district"]')?.value    || '',
      fullAddress : formEl.querySelector('[name="mem_full_address"]')?.value|| '',
      state       : formEl.querySelector('[name="mem_state"]')?.value       || '',
      fee         : formEl.querySelector('[name="mem_fee"]')?.value         || '',
      agreeConst  : formEl.querySelector('[name="mem_agree_constitution"]')?.checked || false,
      agreeTC     : formEl.querySelector('[name="mem_agree_tc"]')?.checked  || false,
    };

    // Sanitize
    const data = {
      name        : Sanitizer.name(raw.name),
      dob         : Sanitizer.clean(raw.dob,         { maxLength: 20  }),
      email       : raw.email ? Sanitizer.email(raw.email) : '',
      phone       : Sanitizer.phone(raw.phone),
      gender      : Sanitizer.clean(raw.gender,      { maxLength: 20  }),
      aadhaar     : raw.aadhaar.replace(/\D/g, '').substring(0, 12),
      village     : Sanitizer.clean(raw.village,     { maxLength: 100 }),
      block       : Sanitizer.clean(raw.block,       { maxLength: 100 }),
      subDistrict : Sanitizer.clean(raw.subDistrict, { maxLength: 100 }),
      district    : Sanitizer.clean(raw.district,    { maxLength: 100 }),
      fullAddress : Sanitizer.clean(raw.fullAddress, { maxLength: 400 }),
      state       : Sanitizer.clean(raw.state,       { maxLength: 60  }),
      fee         : parseInt(raw.fee) || 0,
      agreeConst  : raw.agreeConst,
      agreeTC     : raw.agreeTC,
    };

    // Validate required fields
    const rules = [
      { field: 'mem_name',        required: true, minLength: 3,  requiredMsg: 'Full name is required.' },
      { field: 'mem_dob',         required: true,                requiredMsg: 'Date of birth is required.' },
      { field: 'mem_phone',       required: true, type: 'phone', requiredMsg: 'Mobile number is required.' },
      { field: 'mem_gender',      required: true,                requiredMsg: 'Please select gender.' },
      { field: 'mem_aadhaar',     required: true,                requiredMsg: 'Aadhaar number is required.' },
      { field: 'mem_village',     required: true,                requiredMsg: 'Village / City is required.' },
      { field: 'mem_block',       required: true,                requiredMsg: 'Block is required.' },
      { field: 'mem_sub_district',required: true,                requiredMsg: 'Sub District is required.' },
      { field: 'mem_district',    required: true,                requiredMsg: 'District is required.' },
      { field: 'mem_full_address',required: true, minLength: 10, requiredMsg: 'Full address is required.' },
      { field: 'mem_state',       required: true,                requiredMsg: 'Please select your state.' },
    ];

    if (membershipType === 'general') {
      rules.push({ field: 'mem_fee', required: true, requiredMsg: 'Annual fee is required.' });
    }

    if (!Validator.validate(formEl, rules)) return false;

    // Age check (18+)
    if (data.dob) {
      const dob   = new Date(data.dob);
      const today = new Date();
      let age     = today.getFullYear() - dob.getFullYear();
      const m     = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        Validator.showError(formEl.querySelector('[name="mem_dob"]'),
          'You must be at least 18 years old to register.');
        return false;
      }
    }

    // Aadhaar must be exactly 12 digits
    if (data.aadhaar.length !== 12) {
      Validator.showError(formEl.querySelector('[name="mem_aadhaar"]'),
        'Aadhaar number must be exactly 12 digits.');
      return false;
    }

    // Fee validation for General Member
    if (membershipType === 'general') {
      if (data.fee < 10) {
        Validator.showError(formEl.querySelector('[name="mem_fee"]'),
          'Minimum annual fee is ₹10.');
        return false;
      }
    }

    // Email format check (only if provided)
    if (data.email && !Validator.isValidEmail(data.email)) {
      Validator.showError(formEl.querySelector('[name="mem_email"]'),
        'Please enter a valid email address.');
      return false;
    }

    // Terms checks
    if (!data.agreeConst) {
      Toast.show('You must agree to the Party Constitution (Clause 2).', 'error');
      return false;
    }
    if (!data.agreeTC) {
      Toast.show('You must agree to the Membership Terms & Conditions (Clause 3).', 'error');
      return false;
    }

    // Generate ID & tenure
    const memberId   = IDGenerator.forType(membershipType);
    const tenure     = TenureCalc.formatTenure();
    const issuedDate = formatDate();

    // Build record
    const record = {
      id             : 'MEM_' + Date.now(),
      name           : data.name,
      email          : data.email,
      phone          : data.phone,
      dob            : data.dob,
      gender         : data.gender,
      aadhaar        : data.aadhaar,
      village        : data.village,
      block          : data.block,
      subDistrict    : data.subDistrict,
      district       : data.district,
      fullAddress    : data.fullAddress,
      state          : data.state,
      fee            : data.fee,
      membershipType,
      memberId,
      status         : 'active',
      issuedDate,
      tenureStart    : tenure.start,
      tenureEnd      : tenure.end,
      joinedDate     : issuedDate,
      joinedTimestamp: Date.now(),
      referredMembers: [],   // IDs of members referred by this member
    };

    // Save
    const session = getSession();
    if (session && session.id) {
      UserStore.update(session.id, {
        membershipType,
        memberId,
        status         : 'active',
        phone          : data.phone  || session.phone,
        state          : data.state  || session.state,
        district       : data.district,
        village        : data.village,
        block          : data.block,
        subDistrict    : data.subDistrict,
        fullAddress    : data.fullAddress,
        aadhaar        : data.aadhaar,
        dob            : data.dob,
        gender         : data.gender,
        fee            : data.fee,
        issuedDate,
        tenureStart    : tenure.start,
        tenureEnd      : tenure.end,
        referredMembers: [],
      });
      refreshSessionAfterMembership(session.id);
    } else {
      const existing = SecureStore.get('standalone_members') || [];
      existing.push(record);
      SecureStore.set('standalone_members', existing);
    }

    return {
      success  : true,
      memberId,
      issuedDate,
      tenureEnd: tenure.end,
      data     : { ...data, membershipType },
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

    if (!Honeypot.check(formEl)) {
      Toast.show('Submission blocked.', 'error'); return false;
    }
    if (!RateLimiter.check('volunteer', 3, 120000)) {
      Toast.show('Too many attempts. Please wait.', 'error'); return false;
    }

    const raw = {
      name        : formEl.querySelector('[name="vol_name"]')?.value        || '',
      dob         : formEl.querySelector('[name="vol_dob"]')?.value         || '',
      email       : formEl.querySelector('[name="vol_email"]')?.value       || '',
      phone       : formEl.querySelector('[name="vol_phone"]')?.value       || '',
      gender      : formEl.querySelector('[name="vol_gender"]')?.value      || '',
      village     : formEl.querySelector('[name="vol_village"]')?.value     || '',
      block       : formEl.querySelector('[name="vol_block"]')?.value       || '',
      subDistrict : formEl.querySelector('[name="vol_sub_district"]')?.value|| '',
      district    : formEl.querySelector('[name="vol_district"]')?.value    || '',
      fullAddress : formEl.querySelector('[name="vol_full_address"]')?.value|| '',
      state       : formEl.querySelector('[name="vol_state"]')?.value       || '',
      occupation  : formEl.querySelector('[name="vol_occupation"]')?.value  || '',
      skills      : formEl.querySelector('[name="vol_skills"]')?.value      || '',
      availability: formEl.querySelector('[name="vol_availability"]')?.value|| '',
      agreeConst  : formEl.querySelector('[name="vol_agree_constitution"]')?.checked || false,
      agreeTC     : formEl.querySelector('[name="vol_agree_tc"]')?.checked  || false,
    };

    const data = {
      name        : Sanitizer.name(raw.name),
      dob         : Sanitizer.clean(raw.dob,         { maxLength: 20  }),
      email       : raw.email ? Sanitizer.email(raw.email) : '',
      phone       : Sanitizer.phone(raw.phone),
      gender      : Sanitizer.clean(raw.gender,      { maxLength: 20  }),
      village     : Sanitizer.clean(raw.village,     { maxLength: 100 }),
      block       : Sanitizer.clean(raw.block,       { maxLength: 100 }),
      subDistrict : Sanitizer.clean(raw.subDistrict, { maxLength: 100 }),
      district    : Sanitizer.clean(raw.district,    { maxLength: 100 }),
      fullAddress : Sanitizer.clean(raw.fullAddress, { maxLength: 400 }),
      state       : Sanitizer.clean(raw.state,       { maxLength: 60  }),
      occupation  : Sanitizer.clean(raw.occupation,  { maxLength: 100 }),
      skills      : Sanitizer.clean(raw.skills,      { maxLength: 500 }),
      availability: Sanitizer.clean(raw.availability,{ maxLength: 60  }),
      agreeConst  : raw.agreeConst,
      agreeTC     : raw.agreeTC,
    };

    const rules = [
      { field: 'vol_name',         required: true, minLength: 3,  requiredMsg: 'Full name is required.' },
      { field: 'vol_dob',          required: true,                requiredMsg: 'Date of birth is required.' },
      { field: 'vol_phone',        required: true, type: 'phone', requiredMsg: 'Mobile number is required.' },
      { field: 'vol_gender',       required: true,                requiredMsg: 'Please select gender.' },
      { field: 'vol_village',      required: true,                requiredMsg: 'Village / City is required.' },
      { field: 'vol_block',        required: true,                requiredMsg: 'Block is required.' },
      { field: 'vol_sub_district', required: true,                requiredMsg: 'Sub District is required.' },
      { field: 'vol_district',     required: true,                requiredMsg: 'District is required.' },
      { field: 'vol_full_address', required: true, minLength: 10, requiredMsg: 'Full address is required.' },
      { field: 'vol_state',        required: true,                requiredMsg: 'Please select your state.' },
      { field: 'vol_availability', required: true,                requiredMsg: 'Please select availability.' },
    ];

    if (!Validator.validate(formEl, rules)) return false;

    // Age 18+
    if (data.dob) {
      const dob   = new Date(data.dob);
      const today = new Date();
      let age     = today.getFullYear() - dob.getFullYear();
      const m     = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        Validator.showError(formEl.querySelector('[name="vol_dob"]'),
          'You must be at least 18 years old.');
        return false;
      }
    }

    if (data.email && !Validator.isValidEmail(data.email)) {
      Validator.showError(formEl.querySelector('[name="vol_email"]'),
        'Please enter a valid email address.');
      return false;
    }

    if (!data.agreeConst) {
      Toast.show('You must agree to the Party Constitution (Clause 2).', 'error'); return false;
    }
    if (!data.agreeTC) {
      Toast.show('You must agree to the Terms & Conditions (Clause 3).', 'error'); return false;
    }

    const volunteerId = IDGenerator.generate('VOL');
    const issuedDate  = formatDate();

    const session = getSession();
    if (session && session.id) {
      UserStore.update(session.id, {
        membershipType : 'volunteer',
        volunteerId,
        memberId       : volunteerId,
        status         : 'active',
        phone          : data.phone    || session.phone,
        state          : data.state    || session.state,
        district       : data.district,
        village        : data.village,
        block          : data.block,
        subDistrict    : data.subDistrict,
        fullAddress    : data.fullAddress,
        occupation     : data.occupation,
        skills         : data.skills,
        availability   : data.availability,
        issuedDate,
      });
      refreshSessionAfterMembership(session.id);
    } else {
      const record = {
        id: 'VOL_' + Date.now(), ...data,
        membershipType : 'volunteer',
        volunteerId, memberId: volunteerId,
        issuedDate, status: 'active',
        joinedDate: issuedDate, joinedTimestamp: Date.now(),
      };
      const existing = SecureStore.get('standalone_volunteers') || [];
      existing.push(record);
      SecureStore.set('standalone_volunteers', existing);
    }

    return { success: true, volunteerId, memberId: volunteerId, issuedDate, data: { ...data, membershipType: 'volunteer' } };
  }

  return { submit };
})();

window.VolunteerForm = VolunteerForm;

/* ================================================================
   ACTIVE MEMBERSHIP UPGRADE
   Member enters 25 referred General Member IDs to get upgraded
   ================================================================ */
const ActiveUpgrade = (() => {

  const REQUIRED = 25;

  // Add a referred member ID to current user's list
  function addReferral(currentUserId, referredMemberId) {

    // Clean input
    const id = referredMemberId.trim().toUpperCase();

    if (!id) return { success: false, message: 'Please enter a Member ID.' };

    // Check if ID exists in the system
    if (!IDGenerator.exists(id)) {
      return { success: false, message: `Member ID "${id}" not found in the system.` };
    }

    // Get current user
    const user = UserStore.findById(currentUserId);
    if (!user) return { success: false, message: 'User not found.' };

    // Can't add own ID
    if (user.memberId === id) {
      return { success: false, message: 'You cannot add your own Member ID.' };
    }

    const referred = user.referredMembers || [];

    // Already added
    if (referred.includes(id)) {
      return { success: false, message: `Member ID "${id}" already added.` };
    }

    // Add it
    referred.push(id);
    UserStore.update(currentUserId, { referredMembers: referred });

    const count     = referred.length;
    const remaining = REQUIRED - count;

    // Check if threshold reached → auto-upgrade
    if (count >= REQUIRED) {
      upgradeToActive(currentUserId);
      return {
        success  : true,
        upgraded : true,
        count,
        message  : `🎉 Congratulations! You have added ${count} members and are now upgraded to Active Member!`
      };
    }

    return {
      success  : true,
      upgraded : false,
      count,
      remaining,
      message  : `✅ Member added! You have added ${count}/${REQUIRED} members. ${remaining} more to go!`
    };
  }

  // Upgrade user to Active Member
  function upgradeToActive(userId) {
    const newId      = IDGenerator.generate('AM');
    const issuedDate = formatDate();
    const tenure     = TenureCalc.formatTenure();

    UserStore.update(userId, {
      membershipType : 'active',
      memberId       : newId,
      previousGMId   : UserStore.findById(userId)?.memberId,
      status         : 'active',
      upgradedDate   : issuedDate,
      tenureStart    : tenure.start,
      tenureEnd      : tenure.end,
    });

    refreshSessionAfterMembership(userId);
    return newId;
  }

  // Get progress for a user
  function getProgress(userId) {
    const user    = UserStore.findById(userId);
    if (!user) return { count: 0, remaining: REQUIRED, referred: [] };
    const referred  = user.referredMembers || [];
    const count     = referred.length;
    return {
      count,
      remaining : Math.max(0, REQUIRED - count),
      referred,
      percent   : Math.min(100, Math.round((count / REQUIRED) * 100)),
      required  : REQUIRED,
    };
  }

  return { addReferral, upgradeToActive, getProgress, REQUIRED };
})();

window.ActiveUpgrade = ActiveUpgrade;

/* ================================================================
   SHOW SUCCESS POPUP (Modal)
   Called after successful form submission
   ================================================================ */
function showMembershipSuccessPopup(result, isVolunteer = false) {
  const { memberId, volunteerId, issuedDate, tenureEnd, data } = result;
  const finalId    = memberId || volunteerId;
  const memberType = isVolunteer ? 'volunteer' : data.membershipType;
  const tenure     = TenureCalc.formatTenure();

  // Build ID card HTML
  const cardHTML = IDCardRenderer.render({
    name           : data.name,
    memberId       : finalId,
    membershipType : memberType,
    state          : data.state,
    district       : data.district,
    issuedDate,
    tenureEnd      : tenureEnd || tenure.end,
    fee            : data.fee || null,
  });

  // Build popup content
  const popupHTML = `
    <div style="text-align:center; padding: 4px 0 16px;">
      <div style="width:64px;height:64px;background:linear-gradient(135deg,#4CAF50,#2E7D32);
           border-radius:50%;display:flex;align-items:center;justify-content:center;
           font-size:1.9rem;margin:0 auto 14px;box-shadow:0 8px 24px rgba(76,175,80,0.3);">🎉</div>
      <div style="font-size:1.2rem;font-weight:800;color:var(--text-dark);margin-bottom:6px;">
        ${isVolunteer ? 'Welcome, Volunteer!' : 'Membership Successful!'}
      </div>
      <div style="font-size:0.86rem;color:var(--gray-600);margin-bottom:4px;">
        Your <strong>${isVolunteer ? 'Volunteer' : (memberType === 'general' ? 'General' : 'Active') + ' Member'}</strong>
        registration is complete.
      </div>
      <div style="font-size:0.80rem;color:var(--gray-600);margin-bottom:20px;">
        Membership valid: <strong>${tenure.display}</strong>
      </div>
    </div>

    ${cardHTML}

    <!-- Login alert -->
    <div style="background:var(--blue-pale);border-left:4px solid var(--blue);
         border-radius:0 8px 8px 0;padding:14px 16px;margin-top:18px;
         font-size:0.82rem;color:var(--blue-dark);line-height:1.65;">
      <strong>ℹ️ Important:</strong> Please
      <a href="member-area.html" style="color:var(--orange);font-weight:700;">login to your Member Area</a>
      to view, download and print your official ID card at any time.
    </div>

    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-blue btn-sm" onclick="printIDCard('rendered-id-card')">
        🖨️ Print ID Card
      </button>
      <button class="btn btn-outline-orange btn-sm"
              onclick="copyToClipboard('${finalId}', 'Member ID copied!')">
        📋 Copy Member ID
      </button>
      <a href="member-area.html" class="btn btn-orange btn-sm">
        👤 Login / Member Area
      </a>
    </div>

    <p style="font-size:0.73rem;color:var(--gray-400);text-align:center;margin-top:14px;">
      Your Member ID: <strong style="color:var(--orange);letter-spacing:1px;">${sanitizeHTML(finalId)}</strong>
      — Save this for your records.
    </p>
  `;

  // Inject into modal
  const modalBody = document.getElementById('success-modal-body');
  if (modalBody) {
    modalBody.innerHTML = popupHTML;
    Modal.open('success-modal');
  }
}

window.showMembershipSuccessPopup = showMembershipSuccessPopup;

/* ================================================================
   MEMBERSHIP PAGE CONTROLLER
   ================================================================ */
function initMembershipPage() {

  // General Member Form
  const generalForm = document.getElementById('general-member-form');
  if (generalForm) {
    Validator.attachLiveClear(generalForm);
    Honeypot.inject(generalForm);
    SubmitTimeGuard.stamp(generalForm);

    generalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = generalForm.querySelector('[type="submit"]');
      SubmitGuard.lockButton(btn, 'Submitting...');
      const result = await MembershipForm.submit(generalForm, 'general');
      if (result && result.success) {
        showMembershipSuccessPopup(result, false);
        generalForm.reset();
      }
      SubmitGuard.unlockButton(btn);
    });
  }

  // Volunteer Form
  const volunteerForm = document.getElementById('volunteer-form');
  if (volunteerForm) {
    Validator.attachLiveClear(volunteerForm);
    Honeypot.inject(volunteerForm);
    SubmitTimeGuard.stamp(volunteerForm);

    volunteerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = volunteerForm.querySelector('[type="submit"]');
      SubmitGuard.lockButton(btn, 'Submitting...');
      const result = await VolunteerForm.submit(volunteerForm);
      if (result && result.success) {
        showMembershipSuccessPopup(result, true);
        volunteerForm.reset();
      }
      SubmitGuard.unlockButton(btn);
    });
  }
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMembershipPage();
  console.log('%c🪪 Membership module loaded', 'color:#FF6B00;font-size:11px;');
});
