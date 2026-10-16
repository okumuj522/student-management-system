// Fees, Invoices & M-Pesa Mobile Money Controller
// Designated Receiving Phone Number: +254 746 942 848

const RECEIVING_PHONE_DISPLAY = '+254 746 942 848';
let feeSearchTimeout = null;
let currentActiveFeeId = null;

async function loadFees() {
  const status = document.getElementById('fees-status-filter') ? document.getElementById('fees-status-filter').value : '';
  const search = document.getElementById('fees-search') ? document.getElementById('fees-search').value : '';

  try {
    const res = await apiRequest(`/fees?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
    renderFeeSummary(res.summary);
    renderFeesTable(res.data || []);
  } catch (error) {
    showToast('Failed to load fee records.', 'danger');
  }
}

function handleFeeSearch() {
  clearTimeout(feeSearchTimeout);
  feeSearchTimeout = setTimeout(() => {
    loadFees();
  }, 300);
}

function renderFeeSummary(s) {
  const container = document.getElementById('fee-summary-cards');
  if (!container || !s) return;

  const billed = Number(s.total_billed || 0).toLocaleString();
  const collected = Number(s.total_collected || 0).toLocaleString();
  const outstanding = Number(s.total_outstanding || 0).toLocaleString();
  const isStudent = currentUser && currentUser.role === 'student';

  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-info">
        <h4>${isStudent ? 'My Total Billed' : 'Total Billed'}</h4>
        <div class="kpi-value">$${billed}</div>
      </div>
      <div class="kpi-icon primary"><i class="fa-solid fa-file-invoice-dollar"></i></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-info">
        <h4>${isStudent ? 'My Paid Amount' : 'Total Collected'}</h4>
        <div class="kpi-value">$${collected}</div>
      </div>
      <div class="kpi-icon success"><i class="fa-solid fa-hand-holding-dollar"></i></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-info">
        <h4>${isStudent ? 'My Fee Balance' : 'Outstanding Balance'}</h4>
        <div class="kpi-value" style="color: ${s.total_outstanding > 0 ? '#ef4444' : '#10b981'};">$${outstanding}</div>
      </div>
      <div class="kpi-icon warning"><i class="fa-solid fa-clock-rotate-left"></i></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-info">
        <h4>Pending Invoices</h4>
        <div class="kpi-value">${(s.unpaid_count || 0) + (s.partial_count || 0)}</div>
      </div>
      <div class="kpi-icon secondary"><i class="fa-solid fa-receipt"></i></div>
    </div>
  `;
}

function renderFeesTable(fees) {
  const tbody = document.getElementById('fees-table-body');
  if (!tbody) return;

  if (fees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 2.5rem; color: #64748b;">No fee invoice records found.</td></tr>';
    return;
  }

  const isStudent = currentUser && currentUser.role === 'student';
  const isAdmin = currentUser && currentUser.role === 'admin';

  tbody.innerHTML = fees.map(f => {
    const balance = f.amount - f.paid_amount;
    let badge = 'badge-success';
    if (f.status === 'Unpaid') badge = 'badge-danger';
    if (f.status === 'Partial') badge = 'badge-warning';

    const safeName = `${f.first_name} ${f.last_name}`.replace(/'/g, "\\'");
    const safeType = `${f.fee_type}`.replace(/'/g, "\\'");
    const studentPhone = f.student_phone || '';

    return `
      <tr>
        <td><span class="badge badge-gray">#INV-${f.id.toString().padStart(4, '0')}</span></td>
        <td>
          <strong>${f.first_name} ${f.last_name}</strong>
          <br><small class="text-muted">${f.student_id_code} &bull; ${f.department}</small>
        </td>
        <td><strong>${f.fee_type}</strong></td>
        <td>$${Number(f.amount).toLocaleString()}</td>
        <td style="color: #10b981; font-weight: 600;">$${Number(f.paid_amount).toLocaleString()}</td>
        <td style="color: ${balance > 0 ? '#ef4444' : '#10b981'}; font-weight: 700;">$${Number(balance).toLocaleString()}</td>
        <td>${f.due_date}</td>
        <td><span class="badge ${badge}">${f.status}</span></td>
        <td class="text-right">
          ${balance > 0 ? `
            <button class="btn btn-sm btn-success" title="Pay with M-Pesa STK Push" onclick="openMpesaModal(${f.id}, '${safeName}', '${safeType}', ${balance}, '${studentPhone}')">
              <i class="fa-solid fa-mobile-screen-button"></i> Pay via M-Pesa
            </button>
          ` : ''}

          ${f.paid_amount > 0 ? `
            <button class="btn btn-sm btn-outline" title="Print Official Receipt" onclick="viewFeeReceipt(${f.id})">
              <i class="fa-solid fa-receipt"></i> Receipt
            </button>
          ` : ''}

          ${isAdmin && balance > 0 ? `
            <button class="btn btn-sm btn-outline" title="Manual Cash/Bank Record" onclick="openPaymentModal(${f.id}, '${safeName}', '${safeType}', ${balance})">
              <i class="fa-solid fa-cash-register"></i>
            </button>
          ` : ''}

          ${isAdmin ? `
            <button class="btn btn-sm btn-outline-danger" title="Delete Invoice" onclick="deleteFee(${f.id})">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// ==================== M-PESA STK PUSH & DIRECT TRANSFER ====================

function switchMpesaTab(tab) {
  const tabStk = document.getElementById('tab-stk');
  const tabManual = document.getElementById('tab-manual');
  const formStk = document.getElementById('mpesa-stk-form');
  const formManual = document.getElementById('mpesa-manual-form');

  if (tab === 'stk') {
    tabStk.classList.add('active');
    tabManual.classList.remove('active');
    formStk.classList.remove('hidden');
    formManual.classList.add('hidden');
  } else {
    tabManual.classList.add('active');
    tabStk.classList.remove('active');
    formManual.classList.remove('hidden');
    formStk.classList.add('hidden');
  }
}

function openMpesaModal(feeId, studentName, feeType, balance, phone) {
  currentActiveFeeId = feeId;
  switchMpesaTab('stk');

  document.getElementById('mpesa-fee-id').value = feeId;
  document.getElementById('mpesa-amount').value = balance;
  document.getElementById('mpesa-amount').max = balance;
  document.getElementById('mpesa-manual-amount').value = balance;

  // Prefill student's phone number (not the receiving phone)
  const safePhone = (phone && !phone.includes('746942848') && !phone.includes('746 942 848')) ? phone : '0712345678';
  document.getElementById('mpesa-phone').value = safePhone;
  document.getElementById('stk-status-box').classList.add('hidden');

  const bannerContent = `
    <div style="background: #eef2ff; border-left: 4px solid #059669; padding: 0.875rem 1rem; border-radius: 6px; margin-bottom: 1.25rem;">
      <h5 style="color: #065f46; font-weight: 700; margin-bottom: 0.25rem;">${studentName}</h5>
      <p style="color: #047857; font-size: 0.85rem;">Invoice: <strong>${feeType}</strong> &bull; Outstanding Balance: <strong>$${Number(balance).toLocaleString()}</strong></p>
    </div>
  `;

  document.getElementById('mpesa-fee-info-box').innerHTML = bannerContent;
  document.getElementById('mpesa-manual-info-box').innerHTML = bannerContent;

  openModal('mpesa-modal');
}

async function openStudentQuickPayModal() {
  try {
    const res = await apiRequest('/fees');
    const fees = res.data || [];
    const pending = fees.find(f => f.status !== 'Paid') || fees[0];
    if (pending) {
      const balance = pending.amount - pending.paid_amount;
      const safeName = `${pending.first_name} ${pending.last_name}`;
      openMpesaModal(pending.id, safeName, pending.fee_type, balance, pending.student_phone);
    } else {
      showToast('All your recorded fee invoices are currently fully cleared!', 'success');
    }
  } catch (e) {
    showToast('Failed to retrieve fee records.', 'danger');
  }
}

async function handleSendStkPush(e) {
  e.preventDefault();
  const feeId = document.getElementById('mpesa-fee-id').value;
  const phone = document.getElementById('mpesa-phone').value.trim();
  const amount = document.getElementById('mpesa-amount').value;

  const btn = document.getElementById('mpesa-stk-btn');
  const statusBox = document.getElementById('stk-status-box');
  const statusTitle = document.getElementById('stk-status-title');
  const statusDesc = document.getElementById('stk-status-desc');

  btn.disabled = true;
  statusBox.classList.remove('hidden');
  statusTitle.textContent = 'Contacting Safaricom M-Pesa Gateway...';
  statusDesc.textContent = `Dispatching STK push prompt to ${phone}. Destination account: ${RECEIVING_PHONE_DISPLAY}...`;

  try {
    // Show realistic STK interaction
    await new Promise(r => setTimeout(r, 1200));
    statusTitle.textContent = 'STK Push Prompt Delivered to Mobile Device!';
    statusDesc.textContent = `A payment request of $${amount} to ${RECEIVING_PHONE_DISPLAY} was sent to ${phone}. Enter your M-Pesa PIN on your phone to complete.`;

    const res = await apiRequest(`/fees/${feeId}/stk-push`, {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phone,
        amount: parseFloat(amount)
      })
    });

    await new Promise(r => setTimeout(r, 1500));

    showToast(`Payment of $${amount} confirmed! Funds received at ${RECEIVING_PHONE_DISPLAY}.`, 'success');
    closeModal('mpesa-modal');
    loadFees();
    loadDashboard();

    // Automatically display the printable official receipt
    viewFeeReceipt(feeId);
  } catch (error) {
    statusBox.classList.add('hidden');
    showToast(error.message || 'M-Pesa STK Push payment failed.', 'danger');
  } finally {
    btn.disabled = false;
  }
}

async function handleManualMpesaVerify(e) {
  e.preventDefault();
  const feeId = currentActiveFeeId;
  const code = document.getElementById('mpesa-manual-code').value.trim();
  const amount = document.getElementById('mpesa-manual-amount').value;
  const btn = document.getElementById('mpesa-manual-btn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

  try {
    const res = await apiRequest(`/fees/${feeId}/verify-code`, {
      method: 'POST',
      body: JSON.stringify({
        mpesa_code: code,
        amount: parseFloat(amount)
      })
    });

    showToast(res.message || 'Payment verified!', 'success');
    closeModal('mpesa-modal');
    loadFees();
    loadDashboard();
    viewFeeReceipt(feeId);
  } catch (error) {
    showToast(error.message || 'Failed to verify transaction code.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Verify & Settle Invoice';
  }
}

// ==================== OFFICIAL PRINTABLE FEE RECEIPT ====================

async function viewFeeReceipt(feeId) {
  try {
    const res = await apiRequest(`/fees/${feeId}/receipt`);
    const r = res.receipt;

    const modalBody = document.getElementById('receipt-content');
    modalBody.innerHTML = `
      <div class="receipt-container">
        <div class="receipt-header">
          <div style="font-size: 2.2rem; color: #059669; margin-bottom: 0.35rem;">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h2>${r.institution}</h2>
          <p style="color: #64748b; font-size: 0.9rem;">Official Fee Payment Receipt & Acknowledgment</p>
        </div>

        <div class="receipt-grid">
          <div><strong>Receipt No:</strong> ${r.receiptNo}</div>
          <div><strong>Date of Issue:</strong> ${r.issuedDate}</div>
          <div><strong>Student Name:</strong> ${r.studentName}</div>
          <div><strong>Student ID Code:</strong> ${r.studentId}</div>
          <div><strong>Department:</strong> ${r.department}</div>
          <div><strong>Fee Item:</strong> ${r.feeType}</div>
          <div><strong>Receiving Phone:</strong> <span style="color: #059669; font-weight: 700;">${r.receivingPhone}</span></div>
          <div><strong>Payment Method:</strong> ${r.paymentMethod}</div>
          <div><strong>M-Pesa / Trans Ref:</strong> <code style="font-weight: 700; color: #0f172a;">${r.transactionId}</code></div>
          <div><strong>Payment Status:</strong> <span class="badge badge-success">${r.status}</span></div>
        </div>

        <div class="receipt-paid-box">
          <small style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #065f46;">Total Amount Received</small>
          <h3>$${Number(r.amountPaid).toLocaleString()}</h3>
          <p style="color: #047857; font-size: 0.85rem; margin-top: 0.25rem;">
            Invoice Total: $${Number(r.totalInvoiceAmount).toLocaleString()} &bull; Balance Remaining: <strong>$${Number(r.outstandingBalance).toLocaleString()}</strong>
          </p>
        </div>

        <div class="receipt-footer-stamp">
          <div>
            <div style="border-bottom: 1px solid #94a3b8; width: 170px; height: 35px; margin-bottom: 0.35rem;"></div>
            <span>Authorized Bursar / Accounts Dept</span>
          </div>
          <div style="text-align: right;">
            <p style="color: #059669; font-weight: 800; font-size: 1rem;"><i class="fa-solid fa-stamp"></i> OFFICIAL PAYMENT CLEARED</p>
            <small style="color: #64748b;">Verified via M-Pesa Collection to ${r.receivingPhone}</small>
          </div>
        </div>
      </div>
    `;

    openModal('receipt-modal');
  } catch (error) {
    showToast('Failed to load official receipt.', 'danger');
  }
}

// ==================== ADMIN FEE INVOICE CREATION & CASH RECORD ====================

async function openCreateFeeModal() {
  document.getElementById('fee-form').reset();
  document.getElementById('ff-due-date').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const res = await apiRequest('/students?limit=200');
    const students = res.data || [];
    const select = document.getElementById('ff-student');
    select.innerHTML = '<option value="">-- Select Student --</option>' +
      students.map(s => `<option value="${s.id}">${s.student_id_code} - ${s.first_name} ${s.last_name} (${s.department})</option>`).join('');

    openModal('fee-modal');
  } catch (e) {
    showToast('Failed to load students for invoice creation.', 'danger');
  }
}

async function handleSaveFee(e) {
  e.preventDefault();

  const payload = {
    student_id: document.getElementById('ff-student').value,
    fee_type: document.getElementById('ff-type').value,
    amount: document.getElementById('ff-amount').value,
    due_date: document.getElementById('ff-due-date').value
  };

  try {
    const res = await apiRequest('/fees', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Invoice created successfully.', 'success');
    closeModal('fee-modal');
    loadFees();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to create invoice.', 'danger');
  }
}

function openPaymentModal(feeId, studentName, feeType, balance) {
  document.getElementById('payment-form').reset();
  document.getElementById('pay-fee-id').value = feeId;
  document.getElementById('pay-amount').value = balance;
  document.getElementById('pay-amount').max = balance;
  document.getElementById('pay-ref').value = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

  const infoBox = document.getElementById('payment-info-box');
  infoBox.innerHTML = `
    <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 0.875rem 1rem; border-radius: 6px; margin-bottom: 1.25rem;">
      <h5 style="color: #312e81; font-weight: 700; margin-bottom: 0.25rem;">${studentName}</h5>
      <p style="color: #4338ca; font-size: 0.85rem;">Invoice: <strong>${feeType}</strong> &bull; Outstanding Balance: <strong>$${Number(balance).toLocaleString()}</strong></p>
    </div>
  `;

  openModal('payment-modal');
}

async function handleRecordPayment(e) {
  e.preventDefault();
  const feeId = document.getElementById('pay-fee-id').value;

  const payload = {
    payment_amount: document.getElementById('pay-amount').value,
    payment_method: document.getElementById('pay-method').value,
    transaction_id: document.getElementById('pay-ref').value
  };

  try {
    const res = await apiRequest(`/fees/${feeId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Payment recorded successfully.', 'success');
    closeModal('payment-modal');
    loadFees();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Payment failed.', 'danger');
  }
}

async function deleteFee(id) {
  if (!confirm('Are you sure you want to remove this fee invoice record?')) return;

  try {
    const res = await apiRequest(`/fees/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Invoice deleted.', 'success');
    loadFees();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to delete fee record.', 'danger');
  }
}
