/* ================================================================
   JAN KALYAN PARTY — donation.js
   Handles: Donation form, amount selection, UPI display,
            receipt generation, donation records
   Depends on: main.js, security.js
   ================================================================ */

'use strict';

/* ================================================================
   DONATION CONFIG
   ================================================================ */
const DONATION_CONFIG = {
  upiId       : 'jankalyanparty@sbi',
  partyName   : 'Jan Kalyan Party',
  phone       : '7376409590',
  email       : 'jankalyanpartyofficial@gmail.com',
  minAmount   : 10,
  maxAmount   : 1000000,
  presetAmounts: [100, 251, 500, 1000, 2100, 5000],
};

/* ================================================================
   DONATION RECEIPT GENERATOR
   ================================================================ */
const ReceiptGenerator = (() => {

  function generateReceiptNo() {
    const year   = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `JKP-DON-${year}-${random}`;
  }

  function render(data) {
    const {
      receiptNo, donorName, donorEmail,
      donorPhone, amount, paymentMode,
      donationDate, message
    } = data;

    return `
      <div class="donation-receipt" id="donation-receipt">
        <div class="receipt-header">
          <div class="receipt-header-left">
            <img src="assets/logo.png" alt="JKP Logo"
                 style="width:52px;height:52px;object-fit:contain;border-radius:50%;background:rgba(255,255,255,0.15);padding:5px;"
                 onerror="this.style.display='none'">
            <div>
              <div style="font-size:1.1rem;font-weight:800;color:white;">Jan Kalyan Party</div>
              <div style="font-size:0.65rem;opacity:0.80;font-family:'Noto Sans Devanagari',sans-serif;">
                जात पर न पात पर, प्राथमिकता विकास पर
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.7rem;opacity:0.70;text-transform:uppercase;letter-spacing:1px;">Donation Receipt</div>
            <div style="font-size:0.95rem;font-weight:800;letter-spacing:1px;">${sanitizeHTML(receiptNo)}</div>
          </div>
        </div>

        <div class="receipt-body">
          <div class="receipt-amount-display">
            <div style="font-size:0.75rem;color:var(--gray-600);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
              Donation Amount
            </div>
            <div style="font-size:2.2rem;font-weight:900;color:var(--orange);">
              ₹${parseInt(amount).toLocaleString('en-IN')}
            </div>
          </div>

          <div class="receipt-grid">
            <div class="receipt-field">
              <label>Donor Name</label>
              <span>${sanitizeHTML(donorName)}</span>
            </div>
            <div class="receipt-field">
              <label>Email</label>
              <span>${sanitizeHTML(donorEmail || '—')}</span>
            </div>
            <div class="receipt-field">
              <label>Mobile</label>
              <span>${sanitizeHTML(donorPhone || '—')}</span>
            </div>
            <div class="receipt-field">
              <label>Payment Mode</label>
              <span>${sanitizeHTML(paymentMode || 'UPI')}</span>
            </div>
            <div class="receipt-field">
              <label>Donation Date</label>
              <span>${sanitizeHTML(donationDate)}</span>
            </div>
            <div class="receipt-field">
              <label>Receipt No.</label>
              <span style="font-weight:700;color:var(--orange);">${sanitizeHTML(receiptNo)}</span>
            </div>
          </div>

          ${message ? `
          <div class="receipt-message">
            <label>Message</label>
            <p>${sanitizeHTML(message)}</p>
          </div>` : ''}

          <div class="receipt-note">
            <strong>📌 Note:</strong> This is a computer-generated acknowledgement of your donation to Jan Kalyan Party.
            Donations to political parties may be eligible for tax benefits under Section 80GGB/80GGC of the Income Tax Act.
            Please retain this receipt for your records.
          </div>

          <div class="receipt-footer">
            <span>📧 ${DONATION_CONFIG.email}</span>
            <span>📞 +91 ${DONATION_CONFIG.phone}</span>
            <span>🌐 Jan Kalyan Party</span>
          </div>
        </div>
      </div>
    `;
  }

  return { generateReceiptNo, render };
})();

window.ReceiptGenerator = ReceiptGenerator;

/* ================================================================
   DONATION STORE
   Keeps a local record of donations
   ================================================================ */
const DonationStore = (() => {
  const KEY = 'donations';

  function getAll() {
    return SecureStore.get(KEY) || [];
  }

  function add(record) {
    const all = getAll();
    all.push(record);
    SecureStore.set(KEY, all);
  }

  function getTotal() {
    return getAll().reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);
  }

  return { getAll, add, getTotal };
})();

window.DonationStore = DonationStore;

/* ================================================================
   DONATION FORM HANDLER
   ================================================================ */
const DonationForm = (() => {

  async function submit(formEl) {

    // --- Security checks ---
    if (!Honeypot.check(formEl)) {
      Toast.show('Submission blocked. Please try again.', 'error');
      return false;
    }
    if (!SubmitTimeGuard.check(formEl)) {
      Toast.show('Please fill the form carefully.', 'error');
      return false;
    }
    if (!RateLimiter.check('donation', 5, 60000)) {
      Toast.show('Too many attempts. Please wait a moment.', 'error');
      return false;
    }

    // --- Get values ---
    const raw = {
      name       : formEl.querySelector('[name="don_name"]')?.value       || '',
      email      : formEl.querySelector('[name="don_email"]')?.value      || '',
      phone      : formEl.querySelector('[name="don_phone"]')?.value      || '',
      amount     : formEl.querySelector('[name="don_amount"]')?.value     || '',
      paymentMode: formEl.querySelector('[name="don_payment_mode"]')?.value || 'UPI',
      pan        : formEl.querySelector('[name="don_pan"]')?.value        || '',
      message    : formEl.querySelector('[name="don_message"]')?.value    || '',
      agree      : formEl.querySelector('[name="don_agree"]')?.checked    || false,
    };

    // --- Sanitize ---
    const data = {
      name       : Sanitizer.name(raw.name),
      email      : Sanitizer.email(raw.email),
      phone      : Sanitizer.phone(raw.phone),
      amount     : parseInt(raw.amount.replace(/[^0-9]/g, '')) || 0,
      paymentMode: Sanitizer.clean(raw.paymentMode, { maxLength: 30 }),
      pan        : Sanitizer.clean(raw.pan,         { maxLength: 10 }).toUpperCase(),
      message    : Sanitizer.clean(raw.message,     { maxLength: 300 }),
      agree      : raw.agree,
    };

    // --- Validate ---
    const rules = [
      { field: 'don_name',  required: true, minLength: 3, requiredMsg: 'Your name is required.' },
      { field: 'don_email', required: true, type: 'email', requiredMsg: 'Email is required.' },
      { field: 'don_phone', required: true, type: 'phone', requiredMsg: 'Mobile number is required.' },
    ];

    if (!Validator.validate(formEl, rules)) return false;

    // --- Amount validation ---
    if (!data.amount || data.amount < DONATION_CONFIG.minAmount) {
      Toast.show(`Minimum donation amount is ₹${DONATION_CONFIG.minAmount}.`, 'error');
      const amountInput = formEl.querySelector('[name="don_amount"]');
      if (amountInput) {
        amountInput.focus();
        amountInput.classList.add('is-error');
      }
      return false;
    }

    if (data.amount > DONATION_CONFIG.maxAmount) {
      Toast.show(`Maximum single donation is ₹${DONATION_CONFIG.maxAmount.toLocaleString('en-IN')}.`, 'error');
      return false;
    }

    // --- PAN validation (if provided) ---
    if (data.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan)) {
      const panInput = formEl.querySelector('[name="don_pan"]');
      Validator.showError(panInput, 'Please enter a valid PAN number (e.g. ABCDE1234F).');
      return false;
    }

    // --- Terms agreement ---
    if (!data.agree) {
      Toast.show('Please agree to the donation terms.', 'error');
      return false;
    }

    // --- Generate receipt ---
    const receiptNo    = ReceiptGenerator.generateReceiptNo();
    const donationDate = formatDate();

    // --- Save record ---
    const record = {
      id           : receiptNo,
      donorName    : data.name,
      donorEmail   : data.email,
      donorPhone   : data.phone,
      amount       : data.amount,
      paymentMode  : data.paymentMode,
      pan          : data.pan,
      message      : data.message,
      receiptNo,
      donationDate,
      timestamp    : Date.now(),
    };

    DonationStore.add(record);

    return {
      success : true,
      receiptNo,
      donationDate,
      data    : record,
    };
  }

  return { submit };
})();

window.DonationForm = DonationForm;

/* ================================================================
   SHOW DONATION SUCCESS
   ================================================================ */
function showDonationSuccess(containerEl, result) {
  const { receiptNo, donationDate, data } = result;

  const receiptHTML = ReceiptGenerator.render({
    receiptNo,
    donorName   : data.donorName,
    donorEmail  : data.donorEmail,
    donorPhone  : data.donorPhone,
    amount      : data.amount,
    paymentMode : data.paymentMode,
    donationDate,
    message     : data.message,
  });

  containerEl.innerHTML = `
    <div class="success-box">
      <div class="success-icon">🙏</div>
      <div class="success-title">Thank You for Your Support!</div>
      <div class="success-desc">
        Your donation of <strong>₹${parseInt(data.amount).toLocaleString('en-IN')}</strong>
        has been recorded. Receipt No: <strong>${sanitizeHTML(receiptNo)}</strong>
      </div>
    </div>

    ${receiptHTML}

    <div style="display:flex;gap:12px;margin-top:18px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-blue btn-sm" onclick="printDonationReceipt()">
        🖨️ Print Receipt
      </button>
      <button class="btn btn-outline-orange btn-sm"
              onclick="copyToClipboard('${receiptNo}', 'Receipt number copied!')">
        📋 Copy Receipt No.
      </button>
      <a href="index.html" class="btn btn-orange btn-sm">🏠 Back to Home</a>
    </div>

    <p style="font-size:0.76rem;color:var(--gray-600);text-align:center;margin-top:14px;">
      📧 Confirmation will be sent to <strong>${sanitizeHTML(data.donorEmail)}</strong>
    </p>
  `;
}

window.showDonationSuccess = showDonationSuccess;

/* ================================================================
   PRINT DONATION RECEIPT
   ================================================================ */
function printDonationReceipt() {
  const receipt = document.getElementById('donation-receipt');
  if (!receipt) return;

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Donation Receipt — Jan Kalyan Party</title>
        <link rel="stylesheet" href="css/style.css">
        <style>
          body { margin: 40px; background: #f5f5f5; }
          .donation-receipt { max-width: 600px; margin: 0 auto; }
          @media print {
            body { margin: 0; background: white; }
            .btn { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${receipt.outerHTML}
        <script>window.onload = () => window.print();<\/script>
      </body>
    </html>
  `);
  win.document.close();
}

window.printDonationReceipt = printDonationReceipt;

/* ================================================================
   AMOUNT INPUT — only allow digits
   ================================================================ */
function initAmountInput() {
  const amountInput = document.querySelector('[name="don_amount"]');
  if (!amountInput) return;

  amountInput.addEventListener('input', () => {
    // Strip non-digits
    amountInput.value = amountInput.value.replace(/[^0-9]/g, '');
    // Remove leading zeros
    amountInput.value = amountInput.value.replace(/^0+/, '');
    // Clear error on typing
    amountInput.classList.remove('is-error');

    // Sync active preset button
    const val     = parseInt(amountInput.value) || 0;
    const amtBtns = document.querySelectorAll('.amt-btn:not([data-custom])');
    amtBtns.forEach(btn => {
      const btnAmt = parseInt(btn.dataset.amount) || 0;
      btn.classList.toggle('active', btnAmt === val);
    });
  });
}

/* ================================================================
   PAN INPUT — auto uppercase
   ================================================================ */
function initPanInput() {
  const panInput = document.querySelector('[name="don_pan"]');
  if (!panInput) return;

  panInput.addEventListener('input', () => {
    panInput.value = panInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
  });
}

/* ================================================================
   UPI QR DISPLAY (Text-based for GitHub Pages)
   ================================================================ */
function initUPISection() {
  const upiText = document.querySelector('.upi-id-text');
  if (upiText) {
    upiText.textContent = DONATION_CONFIG.upiId;
  }

  // Build UPI deep link for mobile
  const upiLinkBtn = document.getElementById('upi-pay-btn');
  if (upiLinkBtn) {
    upiLinkBtn.addEventListener('click', () => {
      const amount    = document.querySelector('[name="don_amount"]')?.value || '';
      const upiLink   = `upi://pay?pa=${DONATION_CONFIG.upiId}&pn=${encodeURIComponent(DONATION_CONFIG.partyName)}&am=${amount}&cu=INR&tn=JKP+Donation`;
      window.location.href = upiLink;
    });
  }
}

/* ================================================================
   DONATION PAGE CONTROLLER
   ================================================================ */
function initDonationPage() {
  const donationForm = document.getElementById('donation-form');
  if (!donationForm) return;

  Validator.attachLiveClear(donationForm);
  Honeypot.inject(donationForm);
  SubmitTimeGuard.stamp(donationForm);
  initAmountInput();
  initPanInput();
  initUPISection();

  donationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = donationForm.querySelector('[type="submit"]');
    SubmitGuard.lockButton(btn, 'Processing...');

    const result = await DonationForm.submit(donationForm);

    if (result && result.success) {
      const container = document.getElementById('donation-form-container');
      if (container) {
        showDonationSuccess(container, result);
      }
      Toast.show('Donation recorded successfully!', 'success');
    } else {
      SubmitGuard.unlockButton(btn);
    }
  });
}

/* ================================================================
   DONATION RECEIPT STYLES (injected dynamically)
   ================================================================ */
function injectReceiptStyles() {
  if (document.getElementById('receipt-styles')) return;

  const style = document.createElement('style');
  style.id    = 'receipt-styles';
  style.textContent = `
    .donation-receipt {
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.14);
      margin-top: 20px;
      font-family: 'Poppins', sans-serif;
    }
    .receipt-header {
      background: linear-gradient(135deg, #0D47A1, #1565C0);
      padding: 22px 26px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      color: white;
    }
    .receipt-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .receipt-body {
      background: white;
      padding: 24px 26px;
    }
    .receipt-amount-display {
      text-align: center;
      padding: 18px;
      background: var(--orange-pale, #FFF3E8);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .receipt-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .receipt-field label {
      display: block;
      font-size: 0.68rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .receipt-field span {
      font-size: 0.88rem;
      font-weight: 600;
      color: #1A1A2E;
    }
    .receipt-message {
      background: #F5F5F5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .receipt-message label {
      font-size: 0.70rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 4px;
    }
    .receipt-message p {
      font-size: 0.86rem;
      color: #424242;
      line-height: 1.6;
    }
    .receipt-note {
      background: #E3F0FF;
      border-left: 4px solid #1565C0;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 0.78rem;
      color: #0D47A1;
      line-height: 1.65;
      margin-bottom: 16px;
    }
    .receipt-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.74rem;
      color: #9E9E9E;
      padding-top: 14px;
      border-top: 1px solid #E8E8E8;
    }
    @media (max-width: 480px) {
      .receipt-grid { grid-template-columns: 1fr; }
      .receipt-footer { flex-direction: column; }
    }
  `;
  document.head.appendChild(style);
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  injectReceiptStyles();
  initDonationPage();
  console.log('%c💰 Donation module loaded', 'color:#FF6B00;font-size:11px;');
});
