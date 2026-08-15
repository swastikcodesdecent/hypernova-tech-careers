/**
 * HyperNova Technology - IT Head Portal Controller
 */

let allTickets = [];
let selectedTicketForModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce role authorization (it_head)
  const isAuth = window.HyperNovaAuth.enforceRole(['it_head']);
  if (!isAuth) return;

  // Modal Utility Helpers
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  const user = window.HyperNovaAuth.getCurrentUser();

  // Render Sidebar Profile Picture & Name
  renderITHeadSidebarAvatar(user);

  // Profile Edit Form Submit Handler
  document.getElementById('form-it-profile-edit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('it-edit-name').value;
    const avatarUrl = document.getElementById('it-edit-avatar-url').value;

    try {
      const updatedUser = await window.HyperNovaAuth.updateUserProfile({
        fullName: newName,
        profilePicUrl: avatarUrl
      });
      renderITHeadSidebarAvatar(updatedUser);
      window.HyperNovaNotify.showToast("Profile Updated", "IT Head profile picture and name updated successfully.", "success");
    } catch (err) {
      window.HyperNovaNotify.showToast("Update Failed", err.message, "error");
    }
  });

  // Password Change Form Submit Handler
  document.getElementById('form-it-password-change')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById('it-pw-current').value;
    const newPw = document.getElementById('it-pw-new').value;
    const confirmPw = document.getElementById('it-pw-confirm').value;

    if (newPw !== confirmPw) {
      window.HyperNovaNotify.showToast("Validation Error", "New passwords do not match.", "warning");
      return;
    }

    if (newPw.length < 6) {
      window.HyperNovaNotify.showToast("Validation Error", "Password must be at least 6 characters long.", "warning");
      return;
    }

    try {
      await window.HyperNovaAuth.changeUserPassword(currentPw, newPw);
      window.HyperNovaNotify.showToast("Password Updated", "Admin access cipher password updated successfully.", "success");
      document.getElementById('form-it-password-change').reset();
    } catch (err) {
      window.HyperNovaNotify.showToast("Password Update Error", err.message, "error");
    }
  });

  // Theme Control Desk Handler
  function initThemeControlUI() {
    const currentTheme = window.HyperNovaTheme ? window.HyperNovaTheme.getMode() : (localStorage.getItem('hypernova_theme_mode') || 'independence_day');
    
    const radioId = document.getElementById('radio-theme-id');
    const radioNormal = document.getElementById('radio-theme-normal');
    const badge = document.getElementById('theme-status-badge');

    if (currentTheme === 'independence_day') {
      if (radioId) radioId.checked = true;
      if (badge) {
        badge.innerText = 'Independence Day Theme Active';
        badge.style.background = 'rgba(255, 153, 51, 0.2)';
        badge.style.color = '#FF9933';
        badge.style.borderColor = 'rgba(255, 153, 51, 0.4)';
      }
    } else {
      if (radioNormal) radioNormal.checked = true;
      if (badge) {
        badge.innerText = 'Normal Futuristic Theme Active';
        badge.style.background = 'rgba(56, 189, 248, 0.2)';
        badge.style.color = '#38BDF8';
        badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      }
    }
  }

  initThemeControlUI();

  document.getElementById('form-it-theme-control')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedMode = document.querySelector('input[name="it_theme_choice"]:checked')?.value || 'independence_day';
    
    if (window.HyperNovaTheme) {
      await window.HyperNovaTheme.setThemeMode(selectedMode);
    } else {
      localStorage.setItem('hypernova_theme_mode', selectedMode);
    }

    initThemeControlUI();

    const modeText = selectedMode === 'independence_day' ? 'Independence Day Theme Mode' : 'Normal Futuristic Theme Mode';
    window.HyperNovaNotify.showToast("Theme Settings Updated", `Successfully switched portal theme to: ${modeText}`, "success");
    if (window.HyperNovaAudit) {
      await window.HyperNovaAudit.log('IT_HEAD_UPDATED_THEME', user.email, 'it_head', selectedMode);
    }
  });

  // Innovation Portal Control Desk Handler
  function initInnovationControlUI() {
    const isEnabled = localStorage.getItem('hypernova_innovation_portal_enabled') === 'true';
    const radioCs = document.getElementById('radio-inn-cs');
    const radioEn = document.getElementById('radio-inn-enabled');
    const badge = document.getElementById('innovation-status-badge');

    if (isEnabled) {
      if (radioEn) radioEn.checked = true;
      if (badge) {
        badge.innerText = 'Live Innovation Hub Unlocked';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#10B981';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
    } else {
      if (radioCs) radioCs.checked = true;
      if (badge) {
        badge.innerText = 'Coming Soon (Locked)';
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#F59E0B';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
    }
  }

  initInnovationControlUI();

  document.getElementById('form-it-innovation-control')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedValue = document.querySelector('input[name="it_innovation_choice"]:checked')?.value || 'coming_soon';
    const isEnabled = selectedValue === 'enabled';

    localStorage.setItem('hypernova_innovation_portal_enabled', isEnabled ? 'true' : 'false');
    if (window.HyperNovaStore) {
      await window.HyperNovaStore.setDoc('settings', 'innovation_config', {
        enabled: isEnabled,
        updatedAt: new Date().toISOString()
      });
    }

    initInnovationControlUI();

    const statusText = isEnabled ? 'Unlocked (Live Access Enabled)' : 'Locked (Coming Soon Mode)';
    window.HyperNovaNotify.showToast("Innovation Portal Setting Saved", `Weekly Innovation Portal status set to: ${statusText}`, "status");
    if (window.HyperNovaAudit) {
      await window.HyperNovaAudit.log('IT_HEAD_UPDATED_INNOVATION_PORTAL_STATUS', user.email, 'it_head', selectedValue);
    }
  });

  // Maintenance Mode Guard Control Desk Handler
  function initMaintenanceControlUI() {
    const isMaintActive = window.HyperNovaMaintenance ? window.HyperNovaMaintenance.isMaintenanceActive() : (localStorage.getItem('hypernova_maintenance_mode') === 'true');
    const radioOff = document.getElementById('radio-maint-off');
    const radioOn = document.getElementById('radio-maint-on');
    const badge = document.getElementById('maint-status-badge');
    const timerSettings = document.getElementById('maint-timer-settings');

    if (isMaintActive) {
      if (radioOn) radioOn.checked = true;
      if (timerSettings) timerSettings.style.display = 'block';
      if (badge) {
        badge.innerText = '🔴 Maintenance Mode Active (Locked)';
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#EF4444';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }
    } else {
      if (radioOff) radioOff.checked = true;
      if (timerSettings) timerSettings.style.display = 'none';
      if (badge) {
        badge.innerText = '🟢 System Operational';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#10B981';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
    }
  }

  // Toggle timer settings visibility on radio select
  document.querySelectorAll('input[name="it_maint_choice"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const timerSettings = document.getElementById('maint-timer-settings');
      if (timerSettings) {
        timerSettings.style.display = e.target.value === 'true' ? 'block' : 'none';
      }
    });
  });

  // Toggle custom datetime input
  document.getElementById('select-maint-duration')?.addEventListener('change', (e) => {
    const wrapperCustom = document.getElementById('wrapper-custom-maint-time');
    if (wrapperCustom) {
      wrapperCustom.style.display = e.target.value === 'custom' ? 'block' : 'none';
    }
  });

  initMaintenanceControlUI();

  document.getElementById('form-it-maint-control')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedVal = document.querySelector('input[name="it_maint_choice"]:checked')?.value === 'true';

    let expectedEndTimeIso = null;
    if (selectedVal) {
      const durationChoice = document.getElementById('select-maint-duration')?.value;
      if (durationChoice === 'custom') {
        const customInput = document.getElementById('input-custom-maint-datetime')?.value;
        if (customInput) {
          expectedEndTimeIso = new Date(customInput).toISOString();
        } else {
          // Default to 1 hour from now if custom date empty
          expectedEndTimeIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }
      } else {
        const minutes = parseInt(durationChoice, 10) || 30;
        expectedEndTimeIso = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      }
    }

    if (window.HyperNovaMaintenance) {
      await window.HyperNovaMaintenance.setMaintenanceMode(selectedVal, expectedEndTimeIso);
    } else {
      localStorage.setItem('hypernova_maintenance_mode', selectedVal ? 'true' : 'false');
      if (expectedEndTimeIso) {
        localStorage.setItem('hypernova_maintenance_end_time', expectedEndTimeIso);
      } else {
        localStorage.removeItem('hypernova_maintenance_end_time');
      }
    }

    initMaintenanceControlUI();

    const modeText = selectedVal ? 'Maintenance Mode ACTIVE (Non-Executive Access Locked)' : 'System Operational (Normal Access Restored)';
    window.HyperNovaNotify.showToast("Maintenance Guard Saved", `System status updated: ${modeText}`, selectedVal ? "warning" : "success");
    if (window.HyperNovaAudit) {
      await window.HyperNovaAudit.log('IT_HEAD_UPDATED_MAINTENANCE_MODE', user.email, 'it_head', selectedVal ? 'active' : 'disabled');
    }
  });

  // Navigation Tabs
  initTabNavigation();

  // Load Data
  await refreshITHeadData();

  // Status Filter Listener
  document.getElementById('filter-ticket-status')?.addEventListener('change', () => renderTicketsTable());

  // Ticket Form Update
  document.getElementById('form-update-ticket')?.addEventListener('submit', (e) => handleUpdateTicket(e, user));

  // Recovery Reset Dispatch Form
  document.getElementById('form-it-dispatch-reset')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('it-reset-email').value;
    try {
      await window.HyperNovaAuth.initiatePasswordRecovery(email);
      await window.HyperNovaAudit.log('IT_HEAD_DISPATCHED_PASSWORD_RESET', user.email, 'it_head', email);
      window.HyperNovaNotify.showToast("Reset Link Dispatched", `Secure password recovery link sent to ${email}`, "success");
      document.getElementById('it-reset-email').value = "";
    } catch (err) {
      window.HyperNovaNotify.showToast("Dispatch Error", err.message, "error");
    }
  });

  // Issue Notice Form Submit Handler
  document.getElementById('form-it-issue-notice')?.addEventListener('submit', (e) => handleIssueITNotice(e, user));

  // Applications Desk Filter Listeners
  document.getElementById('it-search-apps')?.addEventListener('input', () => renderITApplicationsTable());
  document.getElementById('it-filter-app-role')?.addEventListener('change', () => renderITApplicationsTable());
  document.getElementById('it-filter-app-status')?.addEventListener('change', () => renderITApplicationsTable());

  // Download Inspector PDF Button
  document.getElementById('btn-it-insp-download-pdf')?.addEventListener('click', () => {
    if (selectedApplicationForITInspector && window.HyperNovaPDF) {
      window.HyperNovaPDF.downloadPDF(selectedApplicationForITInspector);
      if (window.HyperNovaNotify) {
        window.HyperNovaNotify.showToast("PDF Downloaded", `Downloaded PDF for ${selectedApplicationForITInspector.fullName || selectedApplicationForITInspector.appId}`, "success");
      }
    }
  });

  // Logout Button
  document.getElementById('btn-it-logout')?.addEventListener('click', () => {
    window.HyperNovaAuth.logout();
  });
});

let allApplications = [];
let selectedApplicationForITInspector = null;

async function refreshITHeadData() {
  allTickets = await window.HyperNovaSupport.getAllTickets();
  renderTicketsTable();
  renderRecoveryRequestsTable();
  renderAccountsPurgeTable();
  renderITNoticesTable();
  renderITBroadcastNotifications();
  await loadITApplications();
}

async function loadITApplications() {
  allApplications = await window.HyperNovaStore.getCollection('applications');
  renderITApplicationsCounters();
  renderITApplicationsTable();
}

function renderITApplicationsCounters() {
  const totalEl = document.getElementById('it-count-total-apps');
  const pendingEl = document.getElementById('it-count-pending-apps');
  const approvedEl = document.getElementById('it-count-approved-apps');
  const volunteerEl = document.getElementById('it-count-volunteer-apps');

  if (totalEl) totalEl.innerText = allApplications.length;
  if (pendingEl) pendingEl.innerText = allApplications.filter(a => a.status === 'pending_ceo_review').length;
  if (approvedEl) approvedEl.innerText = allApplications.filter(a => a.status === 'approved').length;
  if (volunteerEl) volunteerEl.innerText = allApplications.filter(a => a.applicantType === 'volunteer_collaborator').length;
}

function renderITApplicationsTable() {
  const tbody = document.getElementById('it-applications-tbody');
  if (!tbody) return;

  const searchText = (document.getElementById('it-search-apps')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('it-filter-app-role')?.value || 'all';
  const statusFilter = document.getElementById('it-filter-app-status')?.value || 'all';

  let filtered = allApplications.filter(a => {
    const matchSearch = !searchText ||
                        (a.fullName || '').toLowerCase().includes(searchText) ||
                        (a.applicantEmail || '').toLowerCase().includes(searchText) ||
                        (a.appId || '').toLowerCase().includes(searchText);
    const matchRole = roleFilter === 'all' || a.applicantType === roleFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:2rem;">No matching candidate applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    let badgeClass = 'badge-draft';
    if (a.status === 'pending_ceo_review') badgeClass = 'badge-pending';
    if (a.status === 'approved') badgeClass = 'badge-approved';
    if (a.status === 'rejected') badgeClass = 'badge-rejected';

    return `
      <tr>
        <td><strong>${a.appId || 'HN-2026-XXXX'}</strong></td>
        <td>
          <div style="font-weight:600; color:#fff;">${a.fullName || a.applicantEmail}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${a.applicantEmail || a.email}</div>
        </td>
        <td><span class="badge badge-role">${a.applicantType === 'volunteer_collaborator' ? 'Volunteer' : 'Collaborator'}</span></td>
        <td>${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'Draft / Unsubmitted'}</td>
        <td><span class="badge ${badgeClass}">${(a.status || 'draft').replace('_', ' ')}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openITAppInspector('${a.id}')">Inspect & PDF</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openITAppInspector = async function(docId) {
  const app = allApplications.find(a => a.id === docId);
  if (!app) return;

  selectedApplicationForITInspector = app;

  document.getElementById('it-insp-app-title').innerText = `Inspect Application: ${app.appId || 'HN-2026-XXXX'}`;
  document.getElementById('it-insp-name').innerText = app.fullName || 'N/A';
  document.getElementById('it-insp-email').innerText = app.applicantEmail || app.email || 'N/A';
  document.getElementById('it-insp-phone').innerText = app.phone || 'N/A';
  document.getElementById('it-insp-location').innerText = app.location || 'N/A';

  const ghLink = document.getElementById('it-insp-github');
  if (ghLink) { ghLink.href = app.github || '#'; ghLink.innerText = app.github || 'N/A'; }

  const liLink = document.getElementById('it-insp-linkedin');
  if (liLink) { liLink.href = app.linkedin || '#'; liLink.innerText = app.linkedin || 'N/A'; }

  const resLink = document.getElementById('it-insp-resume');
  if (resLink) { resLink.href = app.resume || '#'; resLink.innerText = app.resume || 'N/A'; }

  document.getElementById('it-insp-techstack').innerText = (app.selectedTechStack || []).join(', ') || app.skills || 'None Selected';
  document.getElementById('it-insp-projects').innerText = app.projects || 'N/A';

  const deptSec = document.getElementById('it-insp-dept-sec');
  if (app.applicantType === 'volunteer_collaborator') {
    if (deptSec) deptSec.style.display = 'block';
    document.getElementById('it-insp-primary-dept').innerText = app.primaryDepartmentName || 'N/A';
    document.getElementById('it-insp-dept-reason').innerText = app.departmentReason || 'N/A';
  } else if (deptSec) {
    deptSec.style.display = 'none';
  }

  // Generate & render PDF Preview inside iframe
  try {
    const pdfRes = await window.HyperNovaPDF.generatePDF(app);
    const iframe = document.getElementById('it-insp-pdf-iframe');
    if (iframe && pdfRes) {
      if (pdfRes.dataUrl) {
        iframe.src = pdfRes.dataUrl;
      } else if (pdfRes.blobUrl) {
        iframe.src = pdfRes.blobUrl;
      }
    }
  } catch (err) {
    console.warn("IT Inspector PDF generation error:", err);
  }

  window.openModal('modal-it-app-inspector');
};

function renderTicketsTable() {
  const tbody = document.getElementById('it-tickets-tbody');
  if (!tbody) return;

  // Update Metric Stat Counters
  const statTotal = document.getElementById('stat-tickets-total');
  const statOpen = document.getElementById('stat-tickets-open');
  const statProgress = document.getElementById('stat-tickets-progress');
  const statResolved = document.getElementById('stat-tickets-resolved');

  if (statTotal) statTotal.innerText = allTickets.length;
  if (statOpen) statOpen.innerText = allTickets.filter(t => t.status === 'Open').length;
  if (statProgress) statProgress.innerText = allTickets.filter(t => t.status === 'In Progress').length;
  if (statResolved) statResolved.innerText = allTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const statusFilter = document.getElementById('filter-ticket-status')?.value || 'all';
  const query = (document.getElementById('search-ticket-query')?.value || '').toLowerCase().trim();

  let filtered = allTickets.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesQuery = !query ||
      (t.applicantEmail && t.applicantEmail.toLowerCase().includes(query)) ||
      (t.subject && t.subject.toLowerCase().includes(query)) ||
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.id && t.id.toLowerCase().includes(query));

    return matchesStatus && matchesQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:2rem;">No member support tickets match the selected criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    let badgeClass = 'badge-pending';
    if (t.status === 'Resolved') badgeClass = 'badge-approved';
    if (t.status === 'Closed') badgeClass = 'badge-draft';

    return `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${t.applicantEmail}</td>
        <td>${t.category}</td>
        <td>${t.subject}</td>
        <td><span class="badge ${t.priority === 'Urgent' || t.priority === 'High' ? 'badge-rejected' : 'badge-role'}">${t.priority}</span></td>
        <td><span class="badge ${badgeClass}">${t.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openTicketInspector('${t.id}')">Inspect & Resolve</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openTicketInspector = function(ticketId) {
  const t = allTickets.find(item => item.id === ticketId);
  if (!t) return;

  selectedTicketForModal = t;

  document.getElementById('ticket-modal-title').innerText = `Manage Support Ticket: ${t.id}`;
  document.getElementById('insp-ticket-id').innerText = t.id;
  document.getElementById('insp-ticket-email').innerText = t.applicantEmail;
  document.getElementById('insp-ticket-cat').innerText = t.category;
  document.getElementById('insp-ticket-subject').innerText = t.subject;
  document.getElementById('insp-ticket-desc').innerText = t.description;

  document.getElementById('insp-ticket-status-select').value = t.status;
  document.getElementById('insp-ticket-response-note').value = "";

  openModal('modal-ticket-inspector');
};

async function handleUpdateTicket(e, itUser) {
  e.preventDefault();
  if (!selectedTicketForModal) return;

  const newStatus = document.getElementById('insp-ticket-status-select').value;
  const note = document.getElementById('insp-ticket-response-note').value;

  try {
    await window.HyperNovaSupport.updateTicketStatus(selectedTicketForModal.id, newStatus, itUser.email, 'it_head', note);
    window.HyperNovaNotify.showToast("Ticket Updated", `Ticket ${selectedTicketForModal.id} status set to ${newStatus}`, "success");
    closeModal('modal-ticket-inspector');
    await refreshITHeadData();
  } catch (err) {
    window.HyperNovaNotify.showToast("Update Failed", err.message, "error");
  }
}

function renderRecoveryRequestsTable() {
  const tbody = document.getElementById('it-recovery-tbody');
  if (!tbody) return;

  const recoveryTickets = allTickets.filter(t => t.category.toLowerCase().includes('password') || t.category.toLowerCase().includes('recovery'));

  if (recoveryTickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:2rem;">No pending account recovery requests.</td></tr>`;
    return;
  }

  tbody.innerHTML = recoveryTickets.map(t => `
    <tr>
      <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(t.createdAt).toLocaleDateString()}</td>
      <td><strong>${t.applicantEmail}</strong></td>
      <td>${t.description}</td>
      <td><span class="badge ${t.status === 'Resolved' ? 'badge-approved' : 'badge-pending'}">${t.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="quickDispatchReset('${t.applicantEmail}', '${t.id}')">Send Reset Link</button>
      </td>
    </tr>
  `).join('');
}

window.quickDispatchReset = async function(email, ticketId) {
  try {
    const user = window.HyperNovaAuth.getCurrentUser();
    await window.HyperNovaAuth.initiatePasswordRecovery(email);
    await window.HyperNovaSupport.updateTicketStatus(ticketId, 'Resolved', user.email, 'it_head', 'Dispatched password reset link via Firebase Email Service.');
    window.HyperNovaNotify.showToast("Reset Link Sent", `Sent reset link to ${email} and resolved ticket.`, "success");
    await refreshITHeadData();
  } catch (err) {
    window.HyperNovaNotify.showToast("Reset Error", err.message, "error");
  }
};

async function renderTechnicalLogsTable() {
  const tbody = document.getElementById('it-logs-tbody');
  if (!tbody) return;

  const logs = await window.HyperNovaAudit.getLogs();
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:2rem;">No technical logs recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
      <td><strong style="color:var(--accent-cyan); font-size:0.85rem;">${l.action}</strong></td>
      <td>${l.actorEmail}</td>
      <td><span class="badge badge-role">${l.actorRole}</span></td>
      <td style="font-size:0.8rem;">${l.targetId || 'N/A'}</td>
    </tr>
  `).join('');
}

function renderITHeadSidebarAvatar(user) {
  const avatarBox = document.querySelector('.sidebar-user .user-avatar');
  const nameEl = document.querySelector('.sidebar-user .user-name');
  
  let cleanName = (user.fullName || 'Swastik Paul').replace(/\(IT Head\)|\(IT Admin Head\)/gi, '').trim();
  if (!cleanName || cleanName.toLowerCase().includes('marcus')) cleanName = 'Swastik Paul';

  if (nameEl) nameEl.innerText = cleanName;
  
  if (avatarBox) {
    if (user.profilePicUrl) {
      avatarBox.innerHTML = `<img src="${user.profilePicUrl}" alt="Profile Picture" class="user-avatar-img" onerror="this.onerror=null; this.parentElement.innerText='SP';">`;
    } else {
      avatarBox.innerText = 'SP';
    }
  }

  const inputName = document.getElementById('it-edit-name');
  const inputUrl = document.getElementById('it-edit-avatar-url');
  if (inputName) inputName.value = cleanName;
  if (inputUrl) inputUrl.value = user.profilePicUrl || '';
}

// Configurable External Redirect URL for Issue Notice (Update this URL anytime)
window.ISSUE_NOTICE_EXTERNAL_URL = window.ISSUE_NOTICE_EXTERNAL_URL || 'https://notice.hypernovatech.in';

function initTabNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.querySelector('.top-bar h2');
  const pageSubtitle = document.querySelector('.top-bar p');

  const titles = {
    'tab-it-assistance-2': { title: 'IT Assistance 2 — Member Support Tickets Desk', sub: 'All support tickets generated by respective members are displayed and managed here.' },
    'tab-it-assistance-1': { title: 'IT Assistance 1 — Account & Security Recovery', sub: 'Dispatch secure Firebase password recovery links and manage user account recovery requests.' },
    'tab-it-access': { title: 'Access Control & System Operations Guard', sub: 'Locks all collaborator pages into Maintenance Mode while preserving Executive Access for CEO & IT Operations.' },
    'tab-it-applications': { title: 'Candidate Applications & Submissions Desk', sub: 'Inspect, filter, and review submitted collaborator & volunteer application records and generated PDFs.' },
    'tab-it-appearances': { title: 'Portal Appearance & Theme Control', sub: 'Control Independence Day theme animation & aesthetics across all portals.' },
    'tab-it-notice': { title: 'External Issue Notice Portal', sub: 'Redirecting to external issue notice desk...' },
    'tab-it-account': { title: 'IT Head Account & Security Settings', sub: 'Update profile picture link, full name, and change access cipher password.' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const tabId = item.getAttribute('data-tab');

      if (tabId === 'tab-it-notice') {
        const targetUrl = window.ISSUE_NOTICE_EXTERNAL_URL;
        if (targetUrl && targetUrl !== '#') {
          window.open(targetUrl, '_blank');
          return;
        }
      }

      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.classList.add('active');
      }

      if (titles[tabId]) {
        if (pageTitle) pageTitle.innerText = titles[tabId].title;
        if (pageSubtitle) pageSubtitle.innerText = titles[tabId].sub;
      }
    });
  });
}

async function renderAccountsPurgeTable() {
  const tbody = document.getElementById('it-accounts-purge-tbody');
  if (!tbody) return;

  const users = await window.HyperNovaStore.getCollection('users');
  const apps = await window.HyperNovaStore.getCollection('applications');

  const accountMap = new Map();

  users.forEach(u => {
    if (u.role !== 'ceo' && u.role !== 'it_head') {
      accountMap.set(u.email.toLowerCase(), { userId: u.id, email: u.email, name: u.fullName || u.email, role: u.role, appId: null, status: 'Registered' });
    }
  });

  apps.forEach(a => {
    const key = a.applicantEmail.toLowerCase();
    const existing = accountMap.get(key);
    if (existing) {
      existing.appId = a.id;
      existing.status = a.status;
      existing.name = a.fullName || existing.name;
    } else {
      accountMap.set(key, { userId: null, email: a.applicantEmail, name: a.fullName || a.applicantEmail, role: a.applicantType, appId: a.id, status: a.status });
    }
  });

  const list = Array.from(accountMap.values());

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:2rem;">No registered candidate accounts or applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.email}</td>
      <td><span class="badge badge-role">${item.role}</span></td>
      <td><span class="badge ${item.status === 'approved' ? 'badge-approved' : 'badge-draft'}">${item.status}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="purgeUserAccountAndAppData('${item.email}', '${item.appId || ''}', '${item.userId || ''}')">Purge Account & App Data</button>
      </td>
    </tr>
  `).join('');
}

window.purgeUserAccountAndAppData = async function(email, appId, userId) {
  if (confirm(`PERMANENTLY PURGE user document in /users and all application data for ${email}?\n\nDeleting the user from /users will cascade-delete their application document and assigned tasks.`)) {
    const itUser = window.HyperNovaAuth.getCurrentUser();

    if (userId) {
      await window.HyperNovaStore.deleteDoc('users', userId);
    } else {
      const users = await window.HyperNovaStore.getCollection('users');
      const targetUser = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (targetUser) {
        await window.HyperNovaStore.deleteDoc('users', targetUser.id);
      } else {
        if (appId) await window.HyperNovaStore.deleteDoc('applications', appId);
      }
    }

    await window.HyperNovaAudit.log('IT_HEAD_PURGED_USER_DATA', itUser.email, 'it_head', email);
    window.HyperNovaNotify.showToast("Account Purged", `User document in /users and app data for ${email} permanently purged.`, "warning");
    await refreshITHeadData();
  }
};

async function handleIssueITNotice(e, itUser) {
  e.preventDefault();
  const title = document.getElementById('it-notice-title').value;
  const category = document.getElementById('it-notice-category').value;
  const priority = document.getElementById('it-notice-priority').value;
  const content = document.getElementById('it-notice-content').value;

  const ancId = 'it-notice-' + Date.now();
  const ancRecord = {
    id: ancId,
    title: title,
    author: itUser.fullName || 'Swastik Paul (IT Head)',
    authorEmail: itUser.email,
    authorRole: 'it_head',
    category: category,
    priority: priority,
    content: content,
    createdAt: new Date().toISOString()
  };

  await window.HyperNovaStore.setDoc('officialNotices', ancId, ancRecord);
  await window.HyperNovaAudit.log('IT_NOTICE_ISSUED', itUser.email, 'it_head', ancId, { title, category, priority });

  window.HyperNovaNotify.showToast("IT System Notice Published", `Technical Notice "${title}" broadcasted successfully.`, "success");
  document.getElementById('form-it-issue-notice').reset();
  await refreshITHeadData();
}

async function renderITNoticesTable() {
  const tbody = document.getElementById('it-notices-tbody');
  if (!tbody) return;

  const allNotices = await window.HyperNovaStore.getCollection('officialNotices');
  const sorted = allNotices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:2rem;">No technical system notices issued yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(n => `
    <tr>
      <td><strong>${n.id}</strong></td>
      <td>${new Date(n.createdAt).toLocaleDateString()}</td>
      <td><strong>${n.title}</strong></td>
      <td>${n.category || 'Technical Notice'}</td>
      <td><span class="badge ${n.priority === 'Urgent' || n.priority === 'Urgent Advisory' ? 'badge-rejected' : 'badge-pending'}">${n.priority || 'Normal'}</span></td>
      <td>${n.author || 'IT Head Swastik Paul'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="retractITNotice('${n.id}')">Retract Notice</button>
      </td>
    </tr>
  `).join('');
}

window.retractITNotice = async function(noticeId) {
  if (!confirm("Are you sure you want to retract and delete this technical system notice?")) return;

  try {
    await window.HyperNovaStore.deleteDoc('officialNotices', noticeId);
    const user = window.HyperNovaAuth.getCurrentUser();
    if (user) {
      await window.HyperNovaAudit.log('IT_NOTICE_RETRACTED', user.email, 'it_head', noticeId);
    }
    window.HyperNovaNotify.showToast("Notice Retracted", `Technical notice ${noticeId} has been retracted.`, "info");
    await refreshITHeadData();
  } catch (err) {
    window.HyperNovaNotify.showToast("Retract Failed", err.message, "error");
  }
};

async function renderITBroadcastNotifications() {
  const container = document.getElementById('it-broadcast-notifications-container');
  if (!container) return;

  const notifs = await window.HyperNovaStore.getCollection('notifications');
  const user = window.HyperNovaAuth.getCurrentUser();
  const userEmail = (user ? user.email : 'admin@hypernovatech.in').toLowerCase();

  const itNotifs = notifs.filter(n => 
    (n.recipientEmail || n.toEmail || '').toLowerCase() === userEmail ||
    (n.recipientEmail || n.toEmail || '').toLowerCase() === 'admin@hypernovatech.in' ||
    (n.recipientEmail || n.toEmail || '').toLowerCase() === 'swastikdevs.js@gmail.com'
  ).sort((a, b) => new Date(b.createdAt || b.sentAt) - new Date(a.createdAt || a.sentAt));

  if (itNotifs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:1.5rem;">No broadcast notifications received yet.</div>`;
    return;
  }

  container.innerHTML = itNotifs.map(n => `
    <div style="background: rgba(15, 23, 42, 0.75); padding: 1rem; border-radius: var(--radius-md); border: 1px solid rgba(168, 85, 247, 0.3);">
      <div class="flex justify-between items-center" style="margin-bottom:0.35rem;">
        <span style="font-weight:700; color:#ffffff; font-size:0.9rem;">${n.title || n.subject || 'CEO Broadcast Notification'}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(n.createdAt || n.sentAt).toLocaleDateString()}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0; line-height:1.4;">${n.message || n.body || n.content}</p>
    </div>
  `).join('');
}
