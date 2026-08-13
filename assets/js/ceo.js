/**
 * HyperNova Technology - CEO Portal Controller
 */

let selectedApplicationForInspector = null;
let allApplications = [];
let allDepartments = [];
let allTasks = [];
let ceoSigPad = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce role authorization (ceo)
  const isAuth = window.HyperNovaAuth.enforceRole(['ceo']);
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

  // Populate Sidebar Avatar & Name
  renderUserSidebarAvatar(user);

  // Profile Edit Form Submit Handler
  document.getElementById('form-ceo-profile-edit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('ceo-edit-name').value;
    const avatarUrl = document.getElementById('ceo-edit-avatar-url').value;

    try {
      const updatedUser = await window.HyperNovaAuth.updateUserProfile({
        fullName: newName,
        profilePicUrl: avatarUrl
      });
      renderUserSidebarAvatar(updatedUser);
      window.HyperNovaNotify.showToast("Profile Updated", "CEO profile picture and name updated successfully.", "success");
    } catch (err) {
      window.HyperNovaNotify.showToast("Update Failed", err.message, "error");
    }
  });

  // Password Change Form Submit Handler
  document.getElementById('form-ceo-password-change')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById('ceo-pw-current').value;
    const newPw = document.getElementById('ceo-pw-new').value;
    const confirmPw = document.getElementById('ceo-pw-confirm').value;

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
      window.HyperNovaNotify.showToast("Password Updated", "CEO access cipher password updated successfully.", "success");
      document.getElementById('form-ceo-password-change').reset();
    } catch (err) {
      window.HyperNovaNotify.showToast("Password Update Error", err.message, "error");
    }
  });

  // Navigation Tabs
  initTabNavigation();

  // Load Data
  await refreshCEOData();

  // Filter & Search listeners
  document.getElementById('search-apps')?.addEventListener('input', () => renderApplicationsTable());
  document.getElementById('filter-type')?.addEventListener('change', () => renderApplicationsTable());
  document.getElementById('filter-status')?.addEventListener('change', () => renderApplicationsTable());

  // Task Desk Listeners
  document.getElementById('search-tasks')?.addEventListener('input', () => renderTasksTable());
  document.getElementById('filter-task-status')?.addEventListener('change', () => renderTasksTable());
  document.getElementById('filter-task-priority')?.addEventListener('change', () => renderTasksTable());
  document.getElementById('btn-open-create-task')?.addEventListener('click', () => openCreateTaskModal());
  document.getElementById('form-task-editor')?.addEventListener('submit', (e) => handleSaveTask(e, user));

  // Department Modal, Import & Head Assignment Listeners
  document.getElementById('btn-open-create-dept')?.addEventListener('click', () => openCreateDeptModal());
  document.getElementById('form-dept-editor')?.addEventListener('submit', (e) => handleSaveDepartment(e, user));
  document.getElementById('form-dept-head-editor')?.addEventListener('submit', (e) => handleSaveDeptHead(e, user));
  
  // Excel / CSV Import & Template Download Listeners
  document.getElementById('btn-import-excel-depts')?.addEventListener('click', () => {
    document.getElementById('input-excel-import')?.click();
  });
  document.getElementById('input-excel-import')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleExcelImport(file, user);
    e.target.value = "";
  });
  document.getElementById('btn-download-excel-template')?.addEventListener('click', () => downloadExcelTemplate());

  // Announcement Modal & Submit Listeners
  document.getElementById('btn-open-announcement-modal')?.addEventListener('click', () => openModal('modal-ceo-announcement'));
  document.getElementById('form-publish-announcement')?.addEventListener('submit', (e) => handlePublishAnnouncement(e, user));
  document.getElementById('form-ceo-issue-notice')?.addEventListener('submit', (e) => handleIssueCEONotice(e, user));

  // Inspector Action Buttons
  document.getElementById('btn-insp-approve')?.addEventListener('click', () => handleCEOAction('approve', user));
  document.getElementById('btn-insp-reject')?.addEventListener('click', () => handleCEOAction('reject', user));
  document.getElementById('btn-insp-request-info')?.addEventListener('click', () => handleCEOAction('request_info', user));
  document.getElementById('btn-insp-reset-pending')?.addEventListener('click', () => handleCEOAction('reset_pending', user));
  document.getElementById('btn-insp-delete')?.addEventListener('click', () => handleCEOAction('delete', user));

  // Initialize CEO E-Signature Pad Canvas
  if (document.getElementById('canvas-ceo-signature') && window.HyperNovaSignaturePad) {
    ceoSigPad = new window.HyperNovaSignaturePad('canvas-ceo-signature', { color: '#22c55e' });
  }

  document.getElementById('btn-clear-ceo-sig')?.addEventListener('click', () => {
    if (ceoSigPad) ceoSigPad.clear();
  });

  // Directory Sub-tabs
  document.getElementById('btn-dir-volunteers')?.addEventListener('click', (e) => {
    document.getElementById('btn-dir-volunteers').classList.add('active');
    document.getElementById('btn-dir-external').classList.remove('active');
    renderDirectoryTable('volunteer_collaborator');
  });
  document.getElementById('btn-dir-external')?.addEventListener('click', (e) => {
    document.getElementById('btn-dir-external').classList.add('active');
    document.getElementById('btn-dir-volunteers').classList.remove('active');
    renderDirectoryTable('collaborator');
  });

  // Logout Button
  document.getElementById('btn-ceo-logout')?.addEventListener('click', () => {
    window.HyperNovaAuth.logout();
  });
});

async function refreshCEOData() {
  try {
    allApplications = await window.HyperNovaStore.getCollection('applications');
    allDepartments = await window.HyperNovaStore.getCollection('departments');
    allTasks = await window.HyperNovaStore.getCollection('tasks');

    renderMetrics();
    renderApplicationsTable();
    renderDepartmentsGrid();
    renderDirectoryTable('volunteer_collaborator');
    renderTasksTable();
    renderCEONoticesTable();
  } catch (err) {
    console.error("Error refreshing CEO Data:", err);
  }
}

function renderMetrics() {
  const mTotal = document.getElementById('m-total-apps');
  const mPending = document.getElementById('m-pending-apps');
  const mApproved = document.getElementById('m-approved-apps');
  const mActiveDepts = document.getElementById('m-active-depts');

  if (mTotal) mTotal.innerText = allApplications.length;
  if (mPending) mPending.innerText = allApplications.filter(a => a.status === 'pending_ceo_review' || a.status === 'Pending').length;
  if (mApproved) mApproved.innerText = allApplications.filter(a => a.status === 'approved' || a.status === 'Approved').length;
  if (mActiveDepts) mActiveDepts.innerText = allDepartments.filter(d => d.status === 'active' || !d.status).length;
}

function renderApplicationsTable() {
  const tbody = document.getElementById('ceo-apps-tbody');
  if (!tbody) return;

  const searchText = (document.getElementById('search-apps').value || '').toLowerCase();
  const typeFilter = document.getElementById('filter-type').value;
  const statusFilter = document.getElementById('filter-status').value;

  let filtered = allApplications.filter(a => {
    const matchSearch = (a.fullName || '').toLowerCase().includes(searchText) ||
                        (a.applicantEmail || '').toLowerCase().includes(searchText) ||
                        (a.appId || '').toLowerCase().includes(searchText);
    const matchType = typeFilter === 'all' || a.applicantType === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:2rem;">No matching applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    let badgeClass = 'badge-draft';
    if (a.status === 'pending_ceo_review') badgeClass = 'badge-pending';
    if (a.status === 'needs_information') badgeClass = 'badge-needs-info';
    if (a.status === 'approved') badgeClass = 'badge-approved';
    if (a.status === 'rejected') badgeClass = 'badge-rejected';

    return `
      <tr>
        <td><strong>${a.appId}</strong></td>
        <td>${a.fullName || a.applicantEmail} ${a.isDepartmentHead ? `<span class="badge badge-approved" style="margin-left:5px;">Head: ${a.headDepartmentName}</span>` : ''}</td>
        <td><span class="badge badge-role">${a.applicantType === 'volunteer_collaborator' ? 'Volunteer' : 'Collaborator'}</span></td>
        <td>${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'N/A'}</td>
        <td><span class="badge ${badgeClass}">${a.status.replace('_', ' ')}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openAppInspector('${a.id}')">Inspect & Review</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAppInspector = async function(appIdDoc) {
  const app = allApplications.find(a => a.id === appIdDoc);
  if (!app) return;

  selectedApplicationForInspector = app;

  document.getElementById('inspector-app-title').innerText = `Review Application: ${app.appId}`;
  document.getElementById('insp-name').innerText = app.fullName || 'N/A';
  document.getElementById('insp-email').innerText = app.applicantEmail;
  document.getElementById('insp-phone').innerText = app.phone || 'N/A';
  
  const ghLink = document.getElementById('insp-github-link');
  ghLink.href = app.github || '#';
  ghLink.innerText = app.github ? 'Open GitHub Profile' : 'N/A';

  const liLink = document.getElementById('insp-linkedin-link');
  if (liLink) {
    liLink.href = app.linkedin || '#';
    liLink.innerText = app.linkedin ? 'Open LinkedIn Profile' : 'N/A';
  }

  const resLink = document.getElementById('insp-resume-link');
  resLink.href = app.resume || '#';
  resLink.innerText = app.resume ? 'Open Resume Document' : 'N/A';

  document.getElementById('insp-skills').innerText = app.skills || (app.selectedTechStack ? app.selectedTechStack.join(', ') : 'N/A');
  if (document.getElementById('insp-dept-reason')) {
    document.getElementById('insp-dept-reason').innerText = app.departmentReason || 'N/A';
  }
  document.getElementById('insp-ceo-note').value = app.ceoNote || '';

  // Populate Department Assignment Select
  const deptSelect = document.getElementById('insp-dept-select');
  deptSelect.innerHTML = `<option value="">-- No Department Assignment --</option>` +
    allDepartments.filter(d => d.status === 'active').map(d => `<option value="${d.id}" ${app.assignedDepartmentId === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

  // Show/Hide Dept Select based on Volunteer Collaborator role
  document.getElementById('insp-dept-assign-group').style.display = app.applicantType === 'volunteer_collaborator' ? 'block' : 'none';

  // Load/Reset CEO E-Signature Pad
  if (!ceoSigPad && document.getElementById('canvas-ceo-signature') && window.HyperNovaSignaturePad) {
    ceoSigPad = new window.HyperNovaSignaturePad('canvas-ceo-signature', { color: '#22c55e' });
  }
  if (ceoSigPad) {
    setTimeout(() => {
      ceoSigPad.resizeCanvas(true);
      ceoSigPad.clear();
      if (app.ceoSignatureDataUrl) {
        ceoSigPad.loadSignatureDataUrl(app.ceoSignatureDataUrl);
      }
    }, 150);
  }

  let pdfBlobUrl = null;
  try {
    const pdfResult = await window.HyperNovaPDF.generatePDF(app);
    pdfBlobUrl = pdfResult.blobUrl;
    document.getElementById('insp-pdf-iframe').src = pdfBlobUrl;
  } catch (err) {
    console.warn("PDF render error:", err);
  }

  // Open PDF External Button
  const btnOpenPdf = document.getElementById('btn-open-pdf-external');
  if (btnOpenPdf) {
    btnOpenPdf.onclick = () => {
      if (pdfBlobUrl) {
        window.open(pdfBlobUrl, '_blank');
      } else {
        window.HyperNovaPDF.generatePDF(app).then(res => window.open(res.blobUrl, '_blank'));
      }
    };
  }

  openModal('modal-app-inspector');
};

async function handleCEOAction(actionType, ceoUser) {
  if (!selectedApplicationForInspector) return;

  const app = selectedApplicationForInspector;
  const ceoNote = document.getElementById('insp-ceo-note').value;
  const assignedDeptId = document.getElementById('insp-dept-select').value;
  const assignedDeptObj = allDepartments.find(d => d.id === assignedDeptId);

  if (actionType === 'approve') {
    const ceoSigUrl = ceoSigPad ? ceoSigPad.getSignatureDataUrl() : null;
    if (!ceoSigUrl && !app.ceoSignatureDataUrl) {
      if (window.HyperNovaNotify) {
        window.HyperNovaNotify.showToast("Signature Required", "Please draw your CEO Executive E-Signature to approve the application.", "warning");
      }
      return;
    }

    app.status = 'approved';
    app.ceoNote = ceoNote;
    app.ceoSignatureDataUrl = ceoSigUrl || app.ceoSignatureDataUrl;
    app.ceoApprovedAt = app.ceoApprovedAt || new Date().toISOString();
    app.ceoName = 'Ishan Pandit';

    if (app.applicantType === 'volunteer_collaborator' && assignedDeptObj) {
      app.assignedDepartmentId = assignedDeptObj.id;
      app.assignedDepartmentName = assignedDeptObj.name;
    }
    await window.HyperNovaStore.setDoc('applications', app.id, app);
    await window.HyperNovaAudit.log('APPLICATION_APPROVED', ceoUser.email, ceoUser.role, app.id, { appId: app.appId });

    // Refresh PDF Preview in Modal
    try {
      const pdfResult = await window.HyperNovaPDF.generatePDF(app);
      if (document.getElementById('insp-pdf-iframe')) {
        document.getElementById('insp-pdf-iframe').src = pdfResult.blobUrl;
      }
    } catch (err) {
      console.warn("PDF render error:", err);
    }

    await window.HyperNovaNotify.sendEmailNotification(
      app.applicantEmail,
      app.applicantType,
      `Application Approved: ${app.appId}`,
      `Congratulations ${app.fullName}! Your application (${app.appId}) has been APPROVED by CEO Ishan Pandit.${app.assignedDepartmentName ? ` You have been assigned to: ${app.assignedDepartmentName}` : ''}`
    );
    window.HyperNovaNotify.showToast("Application Approved", `Candidate ${app.fullName} status updated to APPROVED.`, "success");

  } else if (actionType === 'reject') {
    app.status = 'rejected';
    app.ceoNote = ceoNote;
    await window.HyperNovaStore.setDoc('applications', app.id, app);

    await window.HyperNovaNotify.sendEmailNotification(
      app.applicantEmail,
      app.applicantType,
      `Application Decision: ${app.appId}`,
      `Dear ${app.fullName}, your application (${app.appId}) was reviewed by CEO Ishan Pandit. Decision: Rejected. Note: ${ceoNote || 'No additional note.'}`
    );
    window.HyperNovaNotify.showToast("Application Rejected", `Candidate ${app.fullName} status updated to REJECTED.`, "warning");

  } else if (actionType === 'request_info') {
    if (!ceoNote) {
      window.HyperNovaNotify.showToast("Note Required", "Please specify what additional information is required.", "warning");
      return;
    }
    app.status = 'needs_information';
    app.ceoNote = ceoNote;
    await window.HyperNovaStore.setDoc('applications', app.id, app);

    await window.HyperNovaNotify.sendEmailNotification(
      app.applicantEmail,
      app.applicantType,
      `Information Requested: ${app.appId}`,
      `Dear ${app.fullName}, additional information was requested by CEO Ishan Pandit regarding application ${app.appId}: ${ceoNote}`
    );
    window.HyperNovaNotify.showToast("Info Requested", "Applicant has been requested to provide additional info.", "info");

  } else if (actionType === 'reset_pending') {
    app.status = 'pending_ceo_review';
    app.ceoNote = ceoNote;
    await window.HyperNovaStore.setDoc('applications', app.id, app);
    window.HyperNovaNotify.showToast("Decision Reset", `Application ${app.appId} status reset to Pending Review.`, "info");
  } else if (actionType === 'delete') {
    if (confirm(`PERMANENTLY PURGE application record (${app.appId}) for ${app.fullName || app.applicantEmail}?\n\nThis will remove the candidate from all application desks, directory tables, and task assignments.`)) {
      await window.HyperNovaStore.deleteDoc('applications', app.id);

      // Clear associated tasks
      const tasks = await window.HyperNovaStore.getCollection('tasks');
      const userTasks = tasks.filter(t => (t.assignedToEmail || '').toLowerCase() === app.applicantEmail.toLowerCase());
      for (const t of userTasks) {
        await window.HyperNovaStore.deleteDoc('tasks', t.id);
      }

      await window.HyperNovaAudit.log('APPLICATION_PURGED', ceoUser.email, ceoUser.role, app.id, { email: app.applicantEmail, appId: app.appId });
      window.HyperNovaNotify.showToast("Application Purged", `Application ${app.appId} and associated records purged.`, "warning");
    } else {
      return;
    }
  }

  closeModal('modal-app-inspector');
  refreshCEOData();
}

function renderDepartmentsGrid() {
  const container = document.getElementById('ceo-depts-container');
  if (!container) return;

  if (allDepartments.length === 0) {
    container.innerHTML = `<div style="grid-column: span 2; text-align:center; color:var(--text-dim); padding:2rem;">No departments created yet. Click "+ Create Department" or import via Excel.</div>`;
    return;
  }

  container.innerHTML = allDepartments.map(d => {
    return `
      <div class="dept-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h4 style="color:var(--accent-cyan);">${d.name}</h4>
          <span class="badge ${d.status === 'active' ? 'badge-approved' : 'badge-draft'}">${d.status}</span>
        </div>
        <p style="font-size:0.85rem; margin-top:0.25rem;">${d.description}</p>

        <div style="margin-top:0.75rem; padding:0.5rem; background:rgba(15,23,42,0.6); border-radius:var(--radius-sm); font-size:0.8rem;">
          <strong style="color:var(--accent-purple);">Department Head:</strong> 
          <span>${d.headName ? `${d.headName} (${d.headEmail})` : '<em style="color:var(--text-dim);">Unassigned</em>'}</span>
        </div>

        <div class="flex justify-between items-center" style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-muted);">
          <button class="btn btn-primary btn-sm" onclick="openAppointDeptHeadModal('${d.id}')">Appoint / Change Head</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditDeptModal('${d.id}')">Edit Dept</button>
        </div>
      </div>
    `;
  }).join('');
}

window.openCreateDeptModal = function() {
  document.getElementById('dept-modal-title').innerText = "Create New Department";
  document.getElementById('dept-edit-id').value = "";
  document.getElementById('dept-input-name').value = "";
  document.getElementById('dept-input-desc').value = "";
  openModal('modal-dept-editor');
}

window.openEditDeptModal = function(deptId) {
  const d = allDepartments.find(item => item.id === deptId);
  if (!d) return;

  document.getElementById('dept-modal-title').innerText = "Edit Department";
  document.getElementById('dept-edit-id').value = d.id;
  document.getElementById('dept-input-name').value = d.name;
  document.getElementById('dept-input-desc').value = d.description;
  openModal('modal-dept-editor');
};

async function handleSaveDepartment(e, ceoUser) {
  e.preventDefault();
  const deptId = document.getElementById('dept-edit-id').value;
  const name = document.getElementById('dept-input-name').value;
  const desc = document.getElementById('dept-input-desc').value;

  const id = deptId || ('dept-' + Date.now());
  const deptRecord = {
    id: id,
    name: name,
    description: desc,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  await window.HyperNovaStore.setDoc('departments', id, deptRecord);
  await window.HyperNovaAudit.log('DEPARTMENT_SAVED', ceoUser.email, ceoUser.role, id, { name });

  window.HyperNovaNotify.showToast("Department Saved", `Department "${name}" saved.`, "success");
  closeModal('modal-dept-editor');
  refreshCEOData();
}

window.openAppointDeptHeadModal = function(deptId) {
  const dept = allDepartments.find(d => d.id === deptId);
  if (!dept) return;

  document.getElementById('dept-head-target-id').value = dept.id;
  document.getElementById('dept-head-target-name').value = dept.name;

  const select = document.getElementById('dept-head-select-collaborator');
  const approvedApps = allApplications.filter(a => a.status === 'approved' || a.status === 'pending_ceo_review');

  let optionsHtml = `<option value="">-- Select Collaborator for Department Head --</option>`;

  // Executive IT Head Option
  optionsHtml += `<option value="EXEC_SWASTIK_PAUL" ${dept.headEmail === 'admin@hypernovatech.in' || dept.headEmail === 'swastikdevs.js@gmail.com' ? 'selected' : ''}>Swastik Paul (admin@hypernovatech.in) — IT Head / Executive</option>`;

  if (approvedApps.length > 0) {
    optionsHtml += approvedApps.map(a => `<option value="${a.id}" ${dept.headEmail === a.applicantEmail ? 'selected' : ''}>${a.fullName || a.applicantEmail} (${a.applicantEmail}) - ${a.applicantType}</option>`).join('');
  }

  select.innerHTML = optionsHtml;
  openModal('modal-dept-head-assign');
};

async function handleSaveDeptHead(e, ceoUser) {
  e.preventDefault();
  const deptId = document.getElementById('dept-head-target-id').value;
  const appIdDoc = document.getElementById('dept-head-select-collaborator').value;

  if (!appIdDoc) {
    window.HyperNovaNotify.showToast("Selection Error", "Please select a collaborator to appoint as Department Head.", "warning");
    return;
  }

  const dept = allDepartments.find(d => d.id === deptId);
  if (!dept) return;

  // Clear previous head flag if necessary
  allApplications.forEach(a => {
    if (a.headDepartmentId === dept.id) {
      a.isDepartmentHead = false;
      a.headDepartmentId = null;
      a.headDepartmentName = null;
      window.HyperNovaStore.setDoc('applications', a.id, a);
    }
  });

  let headEmail = '';
  let headName = '';

  if (appIdDoc === 'EXEC_SWASTIK_PAUL') {
    headEmail = 'admin@hypernovatech.in';
    headName = 'Swastik Paul';

    const users = await window.HyperNovaStore.getCollection('users');
    let swastikUser = users.find(u => (u.email || '').toLowerCase() === 'admin@hypernovatech.in');
    if (swastikUser) {
      swastikUser.isDepartmentHead = true;
      swastikUser.headDepartmentId = dept.id;
      swastikUser.headDepartmentName = dept.name;
      await window.HyperNovaStore.setDoc('users', swastikUser.id, swastikUser);
    }
  } else {
    const app = allApplications.find(a => a.id === appIdDoc);
    if (!app) return;
    headEmail = app.applicantEmail;
    headName = app.fullName || app.applicantEmail;

    app.isDepartmentHead = true;
    app.headDepartmentId = dept.id;
    app.headDepartmentName = dept.name;
    await window.HyperNovaStore.setDoc('applications', app.id, app);
  }

  dept.headEmail = headEmail;
  dept.headName = headName;
  dept.headAssignedAt = new Date().toISOString();

  await window.HyperNovaStore.setDoc('departments', dept.id, dept);
  await window.HyperNovaAudit.log('DEPARTMENT_HEAD_APPOINTED', ceoUser.email, ceoUser.role, dept.id, { headEmail, deptName: dept.name });

  await window.HyperNovaNotify.sendEmailNotification(
    headEmail,
    'executive',
    `Appointed Department Head: ${dept.name}`,
    `Congratulations ${headName}! You have been appointed by CEO Ishan Pandit as the Department Head of ${dept.name}. Your portal is now updated with your leadership office.`
  );

  window.HyperNovaNotify.showToast("Head Appointed", `${headName} appointed as Head of ${dept.name}.`, "success");
  closeModal('modal-dept-head-assign');
  refreshCEOData();
}

async function handleExcelImport(file, ceoUser) {
  try {
    window.HyperNovaNotify.showToast("Importing File", `Parsing ${file.name}...`, "info");
    
    let rows = [];

    if (typeof XLSX !== 'undefined') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    } else {
      // CSV Fallback parser
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj = {};
          headers.forEach((h, idx) => { rowObj[h] = values[idx] || ""; });
          rows.push(rowObj);
        }
      }
    }

    if (rows.length === 0) {
      window.HyperNovaNotify.showToast("Import Error", "No data rows found in spreadsheet.", "warning");
      return;
    }

    let count = 0;
    const existingDepts = await window.HyperNovaStore.getCollection('departments');

    for (const row of rows) {
      // Flexible column key matching
      const deptName = (
        row['Department Name'] || row['department name'] ||
        row['Department'] || row['department'] ||
        row['Name'] || row['name'] || row['Title'] || row['Dept Name'] || ""
      ).toString().trim();

      const deptDesc = (
        row['Description'] || row['description'] ||
        row['Desc'] || row['desc'] ||
        row['Details'] || row['Scope'] || row['Summary'] || ""
      ).toString().trim();

      if (!deptName) continue;

      // Check if department already exists by name
      let deptRecord = existingDepts.find(d => (d.name || '').toLowerCase() === deptName.toLowerCase());

      if (deptRecord) {
        deptRecord.description = deptDesc || deptRecord.description;
      } else {
        const id = 'dept-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        deptRecord = {
          id: id,
          name: deptName,
          description: deptDesc || 'Department description scope.',
          status: 'active',
          createdAt: new Date().toISOString()
        };
      }

      await window.HyperNovaStore.setDoc('departments', deptRecord.id, deptRecord);
      count++;
    }

    await window.HyperNovaAudit.log('EXCEL_DEPARTMENTS_IMPORTED', ceoUser.email, ceoUser.role, file.name, { count });
    window.HyperNovaNotify.showToast("Import Complete", `Successfully imported ${count} departments from ${file.name}.`, "success");
    refreshCEOData();
  } catch (err) {
    console.error("Excel Import Error:", err);
    window.HyperNovaNotify.showToast("Import Failed", "Failed to parse file: " + err.message, "error");
  }
}

function downloadExcelTemplate() {
  const csvContent = `Department Name,Description
Quantum Algorithms & Cryptography,"Quantum error correction, post-quantum encryption, and circuit synthesis."
Embedded AI & Neuromorphic Hardware,"Ultra-low power edge AI hardware, neuromorphic chip design, and microcontrollers."
Cyber Security & Zero Trust Systems,"Enterprise zero-trust architecture, identity federation, and automated cloud compliance."
Autonomous Systems & Robotics,"Robotics perception, sensor fusion algorithms, and real-time control software."`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'department_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  window.HyperNovaNotify.showToast("Template Downloaded", "Downloaded sample CSV department import template.", "info");
}

async function handlePublishAnnouncement(e, ceoUser) {
  e.preventDefault();
  const title = document.getElementById('anc-title').value;
  const category = document.getElementById('anc-category').value;
  const priority = document.getElementById('anc-priority').value;
  const content = document.getElementById('anc-content').value;

  const ancId = 'anc-' + Date.now();
  const ancRecord = {
    id: ancId,
    title: title,
    author: ceoUser.fullName || 'CEO Ishan Pandit',
    authorEmail: ceoUser.email,
    category: category,
    priority: priority,
    content: content,
    createdAt: new Date().toISOString()
  };

  await window.HyperNovaStore.setDoc('announcements', ancId, ancRecord);
  await window.HyperNovaAudit.log('CEO_ANNOUNCEMENT_PUBLISHED', ceoUser.email, ceoUser.role, ancId, { title, priority });

  // Broadcast real-time notifications to all registered members & IT Admin
  if (window.HyperNovaNotify && window.HyperNovaNotify.broadcastNotificationToAllUsers) {
    await window.HyperNovaNotify.broadcastNotificationToAllUsers(title, content, category);
  }

  window.HyperNovaNotify.showToast("Announcement Published", `Broadcast "${title}" published and notified to all registered members & IT Admin.`, "success");
  closeModal('modal-ceo-announcement');
  document.getElementById('form-publish-announcement').reset();
  await refreshCEOData();
}

async function handleIssueCEONotice(e, ceoUser) {
  e.preventDefault();
  const title = document.getElementById('ceo-notice-title').value;
  const category = document.getElementById('ceo-notice-category').value;
  const priority = document.getElementById('ceo-notice-priority').value;
  const content = document.getElementById('ceo-notice-content').value;

  const ancId = 'notice-' + Date.now();
  const ancRecord = {
    id: ancId,
    title: title,
    author: ceoUser.fullName || 'CEO Ishan Pandit',
    authorEmail: ceoUser.email,
    authorRole: 'ceo',
    category: category,
    priority: priority,
    content: content,
    createdAt: new Date().toISOString()
  };

  await window.HyperNovaStore.setDoc('officialNotices', ancId, ancRecord);
  await window.HyperNovaAudit.log('CEO_NOTICE_ISSUED', ceoUser.email, ceoUser.role, ancId, { title, category, priority });

  // Broadcast real-time notifications to all registered members & IT Admin
  if (window.HyperNovaNotify && window.HyperNovaNotify.broadcastNotificationToAllUsers) {
    await window.HyperNovaNotify.broadcastNotificationToAllUsers(title, content, category);
  }

  window.HyperNovaNotify.showToast("Official Notice Published", `Executive Notice "${title}" published and notified to all members & IT Admin.`, "success");
  document.getElementById('form-ceo-issue-notice').reset();
  await refreshCEOData();
}

async function renderCEONoticesTable() {
  const tbody = document.getElementById('ceo-notices-tbody');
  if (!tbody) return;

  const allNotices = await window.HyperNovaStore.getCollection('officialNotices');
  const sorted = allNotices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:2rem;">No official executive notices issued yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(n => `
    <tr>
      <td><strong>${n.id}</strong></td>
      <td>${new Date(n.createdAt).toLocaleDateString()}</td>
      <td><strong>${n.title}</strong></td>
      <td>${n.category || 'Executive Notice'}</td>
      <td><span class="badge ${n.priority === 'Urgent' || n.priority === 'Urgent Broadcast' ? 'badge-rejected' : 'badge-pending'}">${n.priority || 'Normal'}</span></td>
      <td>${n.author || 'CEO Ishan Pandit'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="retractCEONotice('${n.id}')">Retract Notice</button>
      </td>
    </tr>
  `).join('');
}

window.retractCEONotice = async function(noticeId) {
  if (!confirm("Are you sure you want to retract and delete this official notice broadcast?")) return;

  try {
    await window.HyperNovaStore.deleteDoc('officialNotices', noticeId);
    const user = window.HyperNovaAuth.getCurrentUser();
    if (user) {
      await window.HyperNovaAudit.log('CEO_NOTICE_RETRACTED', user.email, user.role, noticeId);
    }
    window.HyperNovaNotify.showToast("Notice Retracted", `Official notice ${noticeId} has been retracted.`, "info");
    await refreshCEOData();
  } catch (err) {
    window.HyperNovaNotify.showToast("Retract Failed", err.message, "error");
  }
};

// ====================================================
// TASK & WORK ASSIGNMENT DESK LOGIC
// ====================================================

function renderTasksTable() {
  const tbody = document.getElementById('ceo-tasks-tbody');
  if (!tbody) return;

  const searchText = (document.getElementById('search-tasks').value || '').toLowerCase();
  const statusFilter = document.getElementById('filter-task-status').value;
  const priorityFilter = document.getElementById('filter-task-priority').value;

  let filtered = allTasks.filter(t => {
    const matchSearch = (t.title || '').toLowerCase().includes(searchText) ||
                        (t.assignedToName || '').toLowerCase().includes(searchText) ||
                        (t.assignedToEmail || '').toLowerCase().includes(searchText) ||
                        (t.taskId || '').toLowerCase().includes(searchText);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:2rem;">No work tasks created yet. Click "+ Assign Work Task" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    let priorityBadge = 'badge-draft';
    if (t.priority === 'High') priorityBadge = 'badge-pending';
    if (t.priority === 'Urgent') priorityBadge = 'badge-rejected';
    if (t.priority === 'Medium') priorityBadge = 'badge-needs-info';

    let statusBadge = 'badge-draft';
    if (t.status === 'In Progress') statusBadge = 'badge-pending';
    if (t.status === 'Completed') statusBadge = 'badge-approved';
    if (t.status === 'Under Review') statusBadge = 'badge-needs-info';

    return `
      <tr>
        <td><strong>${t.taskId}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--text-main);">${t.title}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); max-width:280px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${t.description}</div>
        </td>
        <td>
          <div>${t.assignedToName}</div>
          <div style="font-size:0.75rem; color:var(--text-dim);">${t.assignedToEmail}</div>
        </td>
        <td><span class="badge ${priorityBadge}">${t.priority}</span></td>
        <td>${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A'}</td>
        <td><span class="badge ${statusBadge}">${t.status}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" onclick="openEditTaskModal('${t.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateTaskModal() {
  document.getElementById('task-modal-title').innerText = "Assign New Work Task";
  document.getElementById('task-edit-id').value = "";
  document.getElementById('task-input-title').value = "";
  document.getElementById('task-input-priority').value = "Medium";
  document.getElementById('task-input-deadline').value = "";
  document.getElementById('task-input-desc').value = "";

  const select = document.getElementById('task-input-assignee');
  const approvedApps = allApplications.filter(a => a.status === 'approved' || a.status === 'pending_ceo_review');

  if (approvedApps.length === 0) {
    select.innerHTML = `<option value="">No active collaborators found</option>`;
  } else {
    select.innerHTML = `<option value="">-- Select Assignee --</option>` +
      approvedApps.map(a => `<option value="${a.applicantEmail}" data-name="${a.fullName || a.applicantEmail}">${a.fullName || a.applicantEmail} (${a.applicantEmail}) ${a.isDepartmentHead ? `[Head: ${a.headDepartmentName}]` : ''}</option>`).join('');
  }

  openModal('modal-task-editor');
}

window.openEditTaskModal = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('task-modal-title').innerText = "Edit Work Task";
  document.getElementById('task-edit-id').value = task.id;
  document.getElementById('task-input-title').value = task.title;
  document.getElementById('task-input-priority').value = task.priority || 'Medium';
  document.getElementById('task-input-deadline').value = task.deadline || '';
  document.getElementById('task-input-desc').value = task.description || '';

  const select = document.getElementById('task-input-assignee');
  const approvedApps = allApplications.filter(a => a.status === 'approved' || a.status === 'pending_ceo_review');

  select.innerHTML = `<option value="">-- Select Assignee --</option>` +
    approvedApps.map(a => `<option value="${a.applicantEmail}" data-name="${a.fullName || a.applicantEmail}" ${a.applicantEmail === task.assignedToEmail ? 'selected' : ''}>${a.fullName || a.applicantEmail} (${a.applicantEmail})</option>`).join('');

  openModal('modal-task-editor');
};

async function handleSaveTask(e, ceoUser) {
  e.preventDefault();
  const taskId = document.getElementById('task-edit-id').value || window.HyperNovaStore.generateTaskId();
  const title = document.getElementById('task-input-title').value;
  const selectAssignee = document.getElementById('task-input-assignee');
  const assignedToEmail = selectAssignee.value;
  const selectedOption = selectAssignee.options[selectAssignee.selectedIndex];
  const assignedToName = selectedOption ? selectedOption.getAttribute('data-name') : assignedToEmail;
  const priority = document.getElementById('task-input-priority').value;
  const deadline = document.getElementById('task-input-deadline').value;
  const description = document.getElementById('task-input-desc').value;

  if (!assignedToEmail) {
    window.HyperNovaNotify.showToast("Assignee Required", "Please select a collaborator or department head.", "warning");
    return;
  }

  const taskRecord = {
    id: taskId,
    taskId: taskId,
    title: title,
    assignedToEmail: assignedToEmail,
    assignedToName: assignedToName,
    priority: priority,
    deadline: deadline,
    description: description,
    status: 'Assigned',
    createdBy: ceoUser.email,
    createdAt: new Date().toISOString()
  };

  await window.HyperNovaStore.setDoc('tasks', taskId, taskRecord);
  await window.HyperNovaAudit.log('WORK_TASK_ASSIGNED', ceoUser.email, ceoUser.role, taskId, { title, assignedToEmail });

  await window.HyperNovaNotify.sendEmailNotification(
    assignedToEmail,
    'collaborator',
    `New CEO Task Assigned: ${title}`,
    `CEO Ishan Pandit has assigned you a new task: "${title}". Priority: ${priority}. Deadline: ${deadline}. View instructions in your portal.`
  );

  window.HyperNovaNotify.showToast("Task Assigned", `Work task "${title}" assigned to ${assignedToName}.`, "success");
  closeModal('modal-task-editor');
  refreshCEOData();
}

window.deleteTask = async function(taskId) {
  if (confirm("Are you sure you want to delete this work task assignment?")) {
    await window.HyperNovaStore.deleteDoc('tasks', taskId);
    window.HyperNovaNotify.showToast("Task Deleted", "Work task assignment removed.", "info");
    refreshCEOData();
  }
};

function renderDirectoryTable(roleType) {
  const tbody = document.getElementById('ceo-directory-tbody');
  if (!tbody) return;

  let list = allApplications.filter(a => a.applicantType === roleType && a.status === 'approved');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:2rem;">No approved candidates in this role yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    return `
      <tr>
        <td><strong>${a.fullName || a.applicantEmail}</strong> ${a.isDepartmentHead ? `<span class="badge badge-approved" style="margin-left:5px;">Head: ${a.headDepartmentName}</span>` : ''}</td>
        <td>${a.applicantEmail}</td>
        <td>${a.isDepartmentHead ? `Department Head (${a.headDepartmentName})` : (a.assignedDepartmentName || 'General Collaborator')}</td>
        <td><a href="${a.github}" target="_blank" style="color:var(--accent-cyan);">${a.github ? 'GitHub Profile' : 'N/A'}</a></td>
        <td><span class="badge badge-approved">Active Candidate</span></td>
      </tr>
    `;
  }).join('');
}

async function renderAuditLogsTable() {
  const tbody = document.getElementById('ceo-audit-tbody');
  if (!tbody) return;

  const logs = await window.HyperNovaAudit.getLogs();
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:2rem;">No audit entries logged yet.</td></tr>`;
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

function renderUserSidebarAvatar(user) {
  const avatarBox = document.querySelector('.sidebar-user .user-avatar');
  const nameEl = document.querySelector('.sidebar-user .user-name');
  
  let cleanName = (user.fullName || 'Ishan Pandit').replace(/\(CEO\)/g, '').trim();
  if (!cleanName || cleanName.toLowerCase().includes('elena')) cleanName = 'Ishan Pandit';

  if (nameEl) nameEl.innerText = cleanName;
  
  if (avatarBox) {
    if (user.profilePicUrl) {
      avatarBox.innerHTML = `<img src="${user.profilePicUrl}" alt="Profile Picture" class="user-avatar-img" onerror="this.onerror=null; this.parentElement.innerText='IP';">`;
    } else {
      avatarBox.innerText = 'IP';
    }
  }

  const inputName = document.getElementById('ceo-edit-name');
  const inputUrl = document.getElementById('ceo-edit-avatar-url');
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
    'tab-ceo-apps': { title: 'Applications Desk', sub: 'Review incoming applicant submissions, download PDFs, and render executive decisions.' },
    'tab-ceo-depts': { title: 'Organizational Departments', sub: 'Create, edit, activate departments, and appoint Department Heads.' },
    'tab-ceo-directory': { title: 'Collaborator Directory', sub: 'View approved volunteer collaborators and external research partners.' },
    'tab-ceo-tasks': { title: 'Executive Task & Work Desk', sub: 'Assign tasks, project milestones, and technical deliverables to collaborators.' },
    'tab-ceo-notice': { title: 'External Issue Notice Portal', sub: 'Redirecting to external issue notice desk...' },
    'tab-ceo-profile': { title: 'Account & Security Settings', sub: 'Update profile picture link, full name, and change access cipher password.' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const tabId = item.getAttribute('data-tab');

      if (tabId === 'tab-ceo-notice') {
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
