/**
 * HyperNova Technology - Applicant Portal Controller (v4.0)
 * Strictly implements the 20-Point Applicant Portal Architecture Specification.
 * Controls Dashboard & Tracker, Locked Sequential Flow (Panes 1-7), Tech Stack Tag Selector,
 * Dynamic Department Preferences (Volunteer Only), PDF Generation, Support Desk, Notifications, and Settings.
 */

let currentApplication = null;
let currentUser = null;
let sigPad = null;
let currentFlowPane = 1;

const PREDEFINED_TECH_TAGS = [
  'HTML', 'CSS', 'JavaScript', 'Python', 'Java', 'C', 'C++', 'PHP',
  'Node.js', 'Firebase', 'SQL', 'MongoDB', 'Git', 'GitHub', 'AI/ML', 'Cybersecurity'
];

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce role authorization (collaborator, volunteer_collaborator)
  const isAuth = await window.HyperNovaAuth.enforceRole(['collaborator', 'volunteer_collaborator']);
  if (!isAuth) return;

  currentUser = window.HyperNovaAuth.getCurrentUser();
  if (!currentUser) return;

  // Render Sidebar & Header User Profile
  renderUserProfile(currentUser);

  // Initialize Signature Pad safely
  const canvasEl = document.getElementById('canvas-signature');
  if (canvasEl) {
    sigPad = new SignaturePad(canvasEl);
  }

  // Populate Terms & Conditions text box
  populateTermsAndConditions();

  // Render Tech Stack Tag Selector
  renderTechStackTagPicker();

  // Initialize Tab Navigation
  initTabNavigation();

  // Load Application & Portal Data
  await loadApplicantData(currentUser);

  // Form & Button Event Handlers
  initApplicantFormHandlers();

  // Logout Button Listener
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.HyperNovaAuth.logout();
  });
});

function renderUserProfile(user) {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarBox = document.getElementById('sidebar-user-avatar');

  const dashName = document.getElementById('dash-user-name');
  const dashEmail = document.getElementById('dash-user-email');
  const dashRole = document.getElementById('dash-applicant-type');
  const dashAvatar = document.getElementById('dash-user-avatar');

  const setCardName = document.getElementById('settings-card-name');
  const setCardRole = document.getElementById('settings-card-role');
  const setCardAvatar = document.getElementById('settings-user-avatar');

  const cleanName = user.fullName || user.email.split('@')[0];
  const roleTitle = user.role === 'volunteer_collaborator' ? 'Volunteer Collaborator' : 'External Collaborator';

  if (nameEl) nameEl.innerText = cleanName;
  if (roleEl) roleEl.innerText = roleTitle;

  if (dashName) dashName.innerText = `Welcome Back, ${cleanName}`;
  if (dashEmail) dashEmail.innerText = user.email;
  if (dashRole) dashRole.innerText = roleTitle;

  if (setCardName) setCardName.innerText = cleanName;
  if (setCardRole) setCardRole.innerText = roleTitle;

  const initials = cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'HM';
  if (avatarBox) avatarBox.innerText = initials;
  if (dashAvatar) dashAvatar.innerText = initials;
  if (setCardAvatar) setCardAvatar.innerText = initials;

  // Personal Profile Email Preset
  if (document.getElementById('prof-email')) document.getElementById('prof-email').value = user.email;

  // Account Settings Fields
  if (document.getElementById('set-name')) document.getElementById('set-name').value = cleanName;
  if (document.getElementById('set-email')) document.getElementById('set-email').value = user.email;
  if (document.getElementById('set-role')) document.getElementById('set-role').value = roleTitle;
}

function populateTermsAndConditions() {
  const tncBox = document.getElementById('tnc-text-box');
  if (tncBox && typeof HYPERNOVA_TNC_TEXT !== 'undefined') {
    tncBox.innerText = HYPERNOVA_TNC_TEXT;
  }
}

function renderTechStackTagPicker() {
  const container = document.getElementById('tech-tag-picker');
  if (!container) return;

  const selectedTags = currentApplication?.selectedTechStack || [];

  container.innerHTML = PREDEFINED_TECH_TAGS.map(tag => {
    const isSel = selectedTags.includes(tag);
    return `<div class="tech-tag ${isSel ? 'selected' : ''}" onclick="toggleTechTag('${tag}')">${tag}</div>`;
  }).join('');
}

window.toggleTechTag = function(tagName) {
  if (!currentApplication) return;
  if (!currentApplication.selectedTechStack) currentApplication.selectedTechStack = [];

  const idx = currentApplication.selectedTechStack.indexOf(tagName);
  if (idx > -1) {
    currentApplication.selectedTechStack.splice(idx, 1);
  } else {
    currentApplication.selectedTechStack.push(tagName);
  }

  renderTechStackTagPicker();
};

async function loadApplicantData(user) {
  // Ensure user record in /users collection
  const users = await window.HyperNovaStore.getCollection('users');
  let userRecord = users.find(u => (u.email || '').toLowerCase() === user.email.toLowerCase());
  if (!userRecord) {
    userRecord = {
      id: user.id || ('user-collab-' + Date.now()),
      email: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      role: user.role,
      createdAt: new Date().toISOString()
    };
    await window.HyperNovaStore.setDoc('users', userRecord.id, userRecord);
  }

  // Get application record
  const apps = await window.HyperNovaStore.getCollection('applications');
  let app = apps.find(a => (a.applicantEmail || '').toLowerCase() === user.email.toLowerCase());

  if (!app) {
    // Create draft application
    const appId = window.HyperNovaStore.generateApplicationId();
    app = {
      id: appId,
      appId: appId,
      applicantEmail: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      phone: '',
      location: '',
      bio: '',
      github: '',
      resume: '',
      skills: '',
      projects: '',
      selectedTechStack: ['HTML', 'CSS', 'JavaScript'],
      applicantType: user.role,
      primaryDepartmentId: '',
      primaryDepartmentName: '',
      secondaryDepartmentIds: [],
      termsAccepted: false,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    await window.HyperNovaStore.setDoc('applications', app.id, app);
  }

  currentApplication = app;

  // Role Scoping for Volunteer Collaborators (Section 7)
  const isVolunteer = (user.role === 'volunteer_collaborator');
  const deptRow = document.getElementById('row-chk-dept');
  const deptFlowNode = document.getElementById('fnode-5');
  const revDeptCard = document.getElementById('rev-dept-card');

  if (deptRow) deptRow.style.display = isVolunteer ? 'table-row' : 'none';
  if (deptFlowNode) deptFlowNode.style.display = isVolunteer ? 'inline-flex' : 'none';
  if (revDeptCard) revDeptCard.style.display = isVolunteer ? 'block' : 'none';

  if (isVolunteer) {
    await populateDepartmentPreferencesUI(app);
  }

  // Populate Form Fields
  if (document.getElementById('prof-name')) document.getElementById('prof-name').value = app.fullName || '';
  if (document.getElementById('prof-phone')) document.getElementById('prof-phone').value = app.phone || '';
  if (document.getElementById('prof-location')) document.getElementById('prof-location').value = app.location || '';
  if (document.getElementById('prof-bio')) document.getElementById('prof-bio').value = app.bio || '';

  if (document.getElementById('tech-github')) document.getElementById('tech-github').value = app.github || '';
  if (document.getElementById('tech-linkedin')) document.getElementById('tech-linkedin').value = app.linkedin || '';
  if (document.getElementById('tech-resume')) document.getElementById('tech-resume').value = app.resume || '';
  if (document.getElementById('tech-projects')) document.getElementById('tech-projects').value = app.projects || '';
  if (document.getElementById('dept-reason')) document.getElementById('dept-reason').value = app.departmentReason || '';

  renderTechStackTagPicker();

  // Populate Terms Checkbox
  if (app.termsAccepted && document.getElementById('chk-accept-terms')) {
    document.getElementById('chk-accept-terms').checked = true;
  }

  // Update Visual Checklist & Completion Percentage
  updateProgressChecklistAndCompletion(app);

  // Render Status Card
  renderStatusCard(app);

  // Render Dedicated PDF Access Tab Info
  renderDedicatedPDFTab(app);

  // Determine starting flow pane
  if (app.status === 'approved') {
    // Restricted to application until approved; once approved, redirect to Members Portal
    window.location.href = 'member.html';
    return;
    // Once accepted by CEO, hide onboarding stepper and application PDF links/views
    const navOnboarding = document.getElementById('nav-onboarding-link');
    if (navOnboarding) navOnboarding.style.display = 'none';

    const navPdf = document.getElementById('nav-pdf-link');
    if (navPdf) navPdf.style.display = 'none';

    const btnStepper = document.getElementById('btn-dash-continue-stepper');
    if (btnStepper) btnStepper.style.display = 'none';

    const btnPdf = document.getElementById('btn-dash-view-pdf');
    if (btnPdf) btnPdf.style.display = 'none';

    const rowPdfCheck = document.getElementById('row-chk-pdf');
    if (rowPdfCheck) rowPdfCheck.style.display = 'none';

    const tabOnboarding = document.getElementById('tab-onboarding');
    if (tabOnboarding) tabOnboarding.style.display = 'none';

    const tabPdf = document.getElementById('tab-pdf-viewer');
    if (tabPdf) tabPdf.style.display = 'none';

    renderApprovedMemberSection(user, app);

    // Switch to Dashboard Tab
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="tab-dashboard"]')?.classList.add('active');
    document.getElementById('tab-dashboard')?.classList.add('active');
  } else if (app.status === 'pending_ceo_review') {
    jumpToFlowPane(6);
  } else {
    jumpToFlowPane(1);
  }
}

async function populateDepartmentPreferencesUI(app) {
  const depts = await window.HyperNovaStore.getCollection('departments');
  const selectPrimary = document.getElementById('dept-select-primary');
  const containerChecks = document.getElementById('dept-checkboxes-container');

  if (!depts || depts.length === 0) return;

  if (selectPrimary) {
    selectPrimary.innerHTML = depts.map(d => `
      <option value="${d.id}" ${d.id === app.primaryDepartmentId ? 'selected' : ''}>${d.name}</option>
    `).join('');
    if (!app.primaryDepartmentId) {
      app.primaryDepartmentId = depts[0].id;
      app.primaryDepartmentName = depts[0].name;
    }
  }

  if (containerChecks) {
    const secIds = app.secondaryDepartmentIds || [];
    containerChecks.innerHTML = depts.map(d => `
      <div class="checkbox-inline-group" style="margin:0;">
        <input type="checkbox" value="${d.id}" class="chk-sec-dept" id="chk-dept-${d.id}" ${secIds.includes(d.id) ? 'checked' : ''}>
        <label for="chk-dept-${d.id}">${d.name}</label>
      </div>
    `).join('');
  }
}

function updateProgressChecklistAndCompletion(app) {
  let completedCount = 1; // Account registration is completed
  const totalCount = (app.applicantType === 'volunteer_collaborator') ? 7 : 6;

  // 1. Terms
  const elTerms = document.getElementById('chk-status-terms');
  if (elTerms) {
    if (app.termsAccepted) {
      elTerms.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
      completedCount++;
    } else {
      elTerms.innerText = 'Pending';
      elTerms.style.color = 'var(--text-dim)';
    }
  }

  // 2. E-Signature
  const elSig = document.getElementById('chk-status-signature');
  if (elSig) {
    if (app.signatureDataUrl) {
      elSig.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
      completedCount++;
    } else {
      elSig.innerText = 'Pending';
      elSig.style.color = 'var(--text-dim)';
    }
  }

  // 3. Personal Profile
  const elProf = document.getElementById('chk-status-profile');
  if (elProf) {
    if (app.fullName && app.phone && app.location) {
      elProf.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
      completedCount++;
    } else {
      elProf.innerText = 'Pending';
      elProf.style.color = 'var(--text-dim)';
    }
  }

  // 4. Tech Profile
  const elTech = document.getElementById('chk-status-tech');
  if (elTech) {
    if (app.github && app.linkedin && app.resume) {
      elTech.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
      completedCount++;
    } else {
      elTech.innerText = 'Pending';
      elTech.style.color = 'var(--text-dim)';
    }
  }

  // 5. Dept Preferences (Volunteer Only)
  if (app.applicantType === 'volunteer_collaborator') {
    const elDept = document.getElementById('chk-status-dept');
    if (elDept) {
      if (app.primaryDepartmentId) {
        elDept.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
        completedCount++;
      } else {
        elDept.innerText = 'Pending';
        elDept.style.color = 'var(--text-dim)';
      }
    }
  }

  // 6. PDF Preview
  const elPdf = document.getElementById('chk-status-pdf');
  if (elPdf) {
    if (app.status !== 'draft' || app.signatureDataUrl) {
      elPdf.innerHTML = '<span style="color:#22c55e;">✓ Completed</span>';
      completedCount++;
    } else {
      elPdf.innerText = 'Pending';
      elPdf.style.color = 'var(--text-dim)';
    }
  }

  // 7. CEO Review Status
  const elRev = document.getElementById('chk-status-review');
  if (elRev) {
    if (app.status === 'approved') {
      elRev.innerHTML = '<span style="color:#22c55e;">✓ Approved</span>';
    } else if (app.status === 'pending_ceo_review') {
      elRev.innerHTML = '<span style="color:var(--warning);">Pending Review</span>';
    } else {
      elRev.innerHTML = '<span style="color:var(--accent-cyan);">Draft</span>';
    }
  }

  // Completion Percentage Bar
  const pct = Math.round((completedCount / totalCount) * 100);
  const bar = document.getElementById('completion-bar');
  const pctText = document.getElementById('completion-percentage');
  if (bar) bar.style.width = `${pct}%`;
  if (pctText) pctText.innerText = `${pct}%`;
}

function renderStatusCard(app) {
  const title = document.getElementById('status-card-title');
  const desc = document.getElementById('status-card-desc');
  const badge = document.getElementById('header-status-badge');

  if (app.status === 'approved') {
    if (title) { title.innerText = 'Active Approved Member'; title.style.color = '#22c55e'; }
    if (desc) {
      desc.innerHTML = `
        Congratulations! Your collaborator application has been <strong>APPROVED</strong> by CEO Ishan Pandit.<br>
        <a href="member.html" class="btn btn-primary btn-sm" style="margin-top: 0.75rem; display: inline-flex; align-items: center; gap: 0.5rem;">
          <span>Enter Member Portal Workspace &rarr;</span>
        </a>
      `;
    }
    if (badge) {
      badge.innerHTML = '<a href="member.html" style="color:inherit; text-decoration:none;">✓ Member Portal Unlocked &rarr;</a>';
      badge.className = 'badge badge-approved';
      badge.style.cursor = 'pointer';
      badge.onclick = () => window.location.href = 'member.html';
    }
  } else if (app.status === 'pending_ceo_review') {
    if (title) { title.innerText = 'Pending CEO Review'; title.style.color = 'var(--warning)'; }
    if (desc) desc.innerText = 'Your application has been submitted successfully and is currently awaiting review by CEO Ishan Pandit. Member Portal access will unlock automatically upon approval.';
    if (badge) { badge.innerText = 'Pending CEO Review'; badge.className = 'badge badge-pending'; }
  } else {
    if (title) { title.innerText = 'Draft Onboarding Application'; title.style.color = 'var(--accent-cyan)'; }
    if (desc) desc.innerText = 'Complete all onboarding steps sequentially to submit your application for executive review.';
    if (badge) { badge.innerText = 'Draft Application'; badge.className = 'badge badge-draft'; }
  }
}

function renderApprovedMemberSection(user, app) {
  const sec = document.getElementById('dash-approved-member-section');
  if (sec) sec.style.display = 'block';

  if (document.getElementById('dash-dept-name')) document.getElementById('dash-dept-name').innerText = app.headDepartmentName || app.primaryDepartmentName || 'IT Systems & Infrastructure';
  if (document.getElementById('dash-head-name')) document.getElementById('dash-head-name').innerText = app.headName || 'Swastik Paul (admin@hypernovatech.in)';
}

window.jumpToFlowPane = function(paneNum) {
  if (!currentApplication || currentApplication.status === 'approved') return;

  // Enforce Stepper Locking (Section 2 & 16)
  if (paneNum > 1 && !currentApplication.termsAccepted && !document.getElementById('chk-accept-terms').checked) {
    window.HyperNovaNotify.showToast("Step Locked", "Please read and accept the Terms & Conditions in Step 1 first.", "warning");
    paneNum = 1;
  } else if (paneNum > 2 && (!sigPad || sigPad.isEmpty()) && !currentApplication.signatureDataUrl) {
    window.HyperNovaNotify.showToast("Step Locked", "Please draw your E-Signature in Step 2 first.", "warning");
    paneNum = 2;
  }

  currentFlowPane = paneNum;

  const panes = document.querySelectorAll('.flow-pane');
  panes.forEach(p => p.classList.remove('active'));

  const target = document.getElementById(`fpane-${paneNum}`);
  if (target) target.classList.add('active');

  // Update Flow Nodes Bar
  for (let i = 1; i <= 7; i++) {
    const node = document.getElementById(`fnode-${i}`);
    if (node) {
      node.classList.remove('active', 'completed');
      if (i < paneNum) node.classList.add('completed');
      if (i === paneNum) node.classList.add('active');
    }
  }

  if (paneNum === 2 && sigPad) {
    setTimeout(() => {
      sigPad.resizeCanvas(true);
      if (currentApplication && currentApplication.signatureDataUrl) {
        sigPad.fromDataURL(currentApplication.signatureDataUrl);
      }
    }, 150);
  }

  if (paneNum === 6) {
    renderReviewSummary(currentApplication);
    renderPDFPreview(currentApplication, 'pdf-viewer-iframe-review');
  }
};

function renderReviewSummary(app) {
  if (document.getElementById('rev-name')) document.getElementById('rev-name').innerText = app.fullName || 'N/A';
  if (document.getElementById('rev-email')) document.getElementById('rev-email').innerText = app.applicantEmail || 'N/A';
  if (document.getElementById('rev-phone')) document.getElementById('rev-phone').innerText = app.phone || 'N/A';
  if (document.getElementById('rev-location')) document.getElementById('rev-location').innerText = app.location || 'N/A';

  if (document.getElementById('rev-github')) document.getElementById('rev-github').innerText = app.github || 'N/A';
  if (document.getElementById('rev-linkedin')) document.getElementById('rev-linkedin').innerText = app.linkedin || 'N/A';
  if (document.getElementById('rev-resume')) document.getElementById('rev-resume').innerText = app.resume || 'N/A';
  if (document.getElementById('rev-techstack')) document.getElementById('rev-techstack').innerText = (app.selectedTechStack || []).join(', ') || 'None Selected';

  if (app.applicantType === 'volunteer_collaborator') {
    if (document.getElementById('rev-primary-dept')) document.getElementById('rev-primary-dept').innerText = app.primaryDepartmentName || 'N/A';
    if (document.getElementById('rev-additional-depts')) document.getElementById('rev-additional-depts').innerText = (app.secondaryDepartmentNames || []).join(', ') || 'None';
    if (document.getElementById('rev-dept-reason')) document.getElementById('rev-dept-reason').innerText = app.departmentReason || 'N/A';
  }
}

function renderPDFPreview(app, iframeId) {
  const iframe = document.getElementById(iframeId);
  const pdfGen = window.HyperNovaPDFGen || window.HyperNovaPDF;
  if (!iframe || !pdfGen) return;

  try {
    const pdfRes = pdfGen.generatePDF(app);
    if (pdfRes) {
      if (pdfRes.dataUrl) {
        iframe.src = pdfRes.dataUrl;
      } else if (pdfRes.blobUrl) {
        iframe.src = pdfRes.blobUrl;
      }
    }
  } catch (err) {
    console.error("PDF Preview Error:", err);
  }
}

function downloadApplicationPDF(app) {
  if (!app) {
    if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("PDF Error", "No active application record found.", "error");
    return;
  }

  const pdfGen = window.HyperNovaPDFGen || window.HyperNovaPDF;
  if (pdfGen) {
    let success = false;
    if (typeof pdfGen.downloadPDF === 'function') {
      success = pdfGen.downloadPDF(app);
    } else {
      const pdfRes = pdfGen.generatePDF(app);
      if (pdfRes) {
        const url = pdfRes.dataUrl || pdfRes.blobUrl;
        const a = document.createElement('a');
        a.href = url;
        a.download = `HyperNova_Application_${app.appId || 'HN-2026-0001'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        success = true;
      }
    }

    if (success && window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast("PDF Downloaded", "Official application PDF saved to downloads.", "success");
    }
  } else {
    if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("PDF Error", "PDF Generator component not initialized.", "error");
  }
}

function initTabNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');

      if (currentApplication && currentApplication.status === 'approved') {
        if (tabId === 'tab-onboarding' || tabId === 'tab-pdf-viewer') {
          return;
        }
      }

      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');

      if (tabId === 'tab-pdf-viewer' && currentApplication) {
        renderDedicatedPDFTab(currentApplication);
      }
      if (tabId === 'tab-notifications' && currentUser) {
        renderApplicantNotifications(currentUser.email);
      }
      if (tabId === 'tab-support' && currentUser) {
        renderApplicantTickets(currentUser.email);
      }
    });
  });
}

async function renderApplicantNotifications(email) {
  const container = document.getElementById('applicant-notifications-container');
  if (!container) return;

  const notifs = await window.HyperNovaNotifications.getNotificationsForUser(email);
  if (notifs.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:2rem 0;">No notifications yet.</p>`;
    return;
  }

  container.innerHTML = notifs.map(n => `
    <div style="background:rgba(15,23,42,0.6); border:1px solid var(--border-glass); border-radius:var(--radius-md); padding:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <strong style="color:var(--text-main); font-size:0.9rem;">${n.title}</strong>
        <span style="font-size:0.75rem; color:var(--text-dim);">${new Date(n.createdAt).toLocaleTimeString()}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">${n.message}</p>
    </div>
  `).join('');
}

async function renderApplicantTickets(email) {
  const listContainer = document.getElementById('applicant-tickets-list');
  if (!listContainer) return;

  const tickets = await window.HyperNovaSupport.getTicketsForUser(email);
  if (tickets.length === 0) {
    listContainer.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:2rem 0;">No support tickets created yet.</p>`;
    return;
  }

  listContainer.innerHTML = tickets.map(t => `
    <div style="background:rgba(15,23,42,0.6); border:1px solid var(--border-glass); border-radius:var(--radius-md); padding:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <strong style="color:var(--text-main); font-size:0.9rem;">${t.subject}</strong>
        <span class="badge ${t.status === 'Resolved' ? 'badge-approved' : 'badge-pending'}">${t.status}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 0.5rem 0;">${t.description}</p>
      <div style="font-size:0.75rem; color:var(--text-dim);">
        Ticket ID: <code>${t.id}</code> &bull; Category: ${t.category}
      </div>
    </div>
  `).join('');
}

function renderDedicatedPDFTab(app) {
  if (!app) return;
  if (document.getElementById('tab-pdf-appid')) document.getElementById('tab-pdf-appid').innerText = app.appId || 'HN-2026-XXXX';
  if (document.getElementById('tab-pdf-date')) document.getElementById('tab-pdf-date').innerText = app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Not Submitted';
  
  const statusBadge = document.getElementById('tab-pdf-status');
  if (statusBadge) {
    statusBadge.innerText = app.status ? app.status.toUpperCase() : 'DRAFT';
    statusBadge.className = app.status === 'approved' ? 'badge badge-approved' : (app.status === 'pending_ceo_review' ? 'badge badge-pending' : 'badge badge-draft');
  }

  renderPDFPreview(app, 'pdf-viewer-iframe-dedicated');
}

function initApplicantFormHandlers() {
  // Clear Signature Pad
  document.getElementById('btn-clear-sig')?.addEventListener('click', () => {
    if (sigPad) sigPad.clear();
  });

  // Flow Step 1: Accept Terms & Continue
  document.getElementById('btn-flow-1-next')?.addEventListener('click', (e) => {
    e.preventDefault();
    const chk = document.getElementById('chk-accept-terms');
    if (!chk || !chk.checked) {
      if (window.HyperNovaNotify) {
        window.HyperNovaNotify.showToast("Mandatory Action", "Please check the box confirming you read all 172 lines of Terms.", "warning");
      }
      return;
    }
    currentApplication.termsAccepted = true;
    currentApplication.termsAcceptedAt = new Date().toISOString();
    updateProgressChecklistAndCompletion(currentApplication);
    jumpToFlowPane(2);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
  });

  // Flow Step 2: Save Signature & Continue
  document.getElementById('btn-flow-2-next')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!sigPad || sigPad.isEmpty()) {
      if (window.HyperNovaNotify) {
        window.HyperNovaNotify.showToast("Signature Required", "Please draw your E-Signature on the canvas pad.", "warning");
      }
      return;
    }
    const sigData = sigPad.toDataURL();
    currentApplication.signatureDataUrl = sigData;
    updateProgressChecklistAndCompletion(currentApplication);
    jumpToFlowPane(3);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
  });

  // Flow Step 3: Personal Profile Form
  document.getElementById('form-personal-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    savePersonalProfileFields();
    updateProgressChecklistAndCompletion(currentApplication);
    jumpToFlowPane(4);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
  });

  document.getElementById('btn-save-draft-profile')?.addEventListener('click', () => {
    savePersonalProfileFields();
    updateProgressChecklistAndCompletion(currentApplication);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
    if (window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast("Draft Saved", "Personal Profile draft saved to database.", "success");
    }
  });

  // Flow Step 4: Technical Profile Form
  document.getElementById('form-tech-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTechProfileFields();
    updateProgressChecklistAndCompletion(currentApplication);
    if (currentApplication.applicantType === 'volunteer_collaborator') {
      jumpToFlowPane(5);
    } else {
      jumpToFlowPane(6);
    }
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
  });

  document.getElementById('btn-save-draft-tech')?.addEventListener('click', () => {
    saveTechProfileFields();
    updateProgressChecklistAndCompletion(currentApplication);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
    if (window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast("Draft Saved", "Technical Profile draft saved to database.", "success");
    }
  });

  // Add Custom Tech Tag Button
  document.getElementById('btn-add-custom-tag')?.addEventListener('click', () => {
    const input = document.getElementById('input-custom-tag');
    if (!input || !input.value.trim()) return;
    const tag = input.value.trim();
    if (!currentApplication.selectedTechStack) currentApplication.selectedTechStack = [];
    if (!currentApplication.selectedTechStack.includes(tag)) {
      currentApplication.selectedTechStack.push(tag);
      PREDEFINED_TECH_TAGS.push(tag);
      renderTechStackTagPicker();
    }
    input.value = '';
  });

  // Flow Step 5: Department Selection Form (Volunteer Only)
  document.getElementById('form-dept-selection')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectPrimary = document.getElementById('dept-select-primary');
    if (selectPrimary) {
      currentApplication.primaryDepartmentId = selectPrimary.value;
      currentApplication.primaryDepartmentName = selectPrimary.options[selectPrimary.selectedIndex].text;
    }

    const checkSecs = document.querySelectorAll('.chk-sec-dept:checked');
    currentApplication.secondaryDepartmentIds = Array.from(checkSecs).map(c => c.value);
    currentApplication.secondaryDepartmentNames = Array.from(checkSecs).map(c => c.nextElementSibling ? c.nextElementSibling.innerText : '');

    const deptReasonEl = document.getElementById('dept-reason');
    if (deptReasonEl) {
      currentApplication.departmentReason = deptReasonEl.value;
    }

    updateProgressChecklistAndCompletion(currentApplication);
    jumpToFlowPane(6);
    window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication).catch(err => console.warn("Store save notice:", err));
  });

  // Flow Step 6: Regenerate & Download PDF Buttons
  document.getElementById('btn-rev-gen-pdf')?.addEventListener('click', () => {
    renderPDFPreview(currentApplication, 'pdf-viewer-iframe-review');
    if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("PDF Regenerated", "Application PDF regenerated with latest details.", "info");
  });

  document.getElementById('btn-rev-download-pdf')?.addEventListener('click', () => {
    downloadApplicationPDF(currentApplication);
  });

  document.getElementById('btn-viewer-download-tab')?.addEventListener('click', () => {
    downloadApplicationPDF(currentApplication);
  });

  // Flow Step 7: Final Confirmation & Lock Submit (Section 10)
  document.getElementById('btn-confirm-final-submit')?.addEventListener('click', async () => {
    if (!currentApplication) return;

    currentApplication.status = 'pending_ceo_review';
    currentApplication.submittedAt = new Date().toISOString();
    
    if (!currentApplication.appId || currentApplication.appId.includes('XXXX')) {
      currentApplication.appId = window.HyperNovaStore.generateApplicationId();
    }

    // Lock editing
    await window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication);
    if (window.HyperNovaAudit) await window.HyperNovaAudit.log('APPLICATION_FINAL_SUBMITTED', currentUser.email, currentUser.role, currentApplication.appId);
    if (window.HyperNovaNotifications) await window.HyperNovaNotifications.createNotification(currentUser.email, "Application Submitted", `Application ${currentApplication.appId} submitted for CEO review.`);

    if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("Application Submitted!", `Official Application ID: ${currentApplication.appId}`, "success");

    renderStatusCard(currentApplication);
    updateProgressChecklistAndCompletion(currentApplication);
    renderDedicatedPDFTab(currentApplication);

    // Switch to Dashboard Tab
    document.querySelector('[data-tab="tab-dashboard"]')?.click();
  });

  // Support Ticket Form
  document.getElementById('form-create-support-ticket')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('ticket-category-select').value;
    const subject = document.getElementById('ticket-subject-input').value;
    const priority = document.getElementById('ticket-priority-select').value;
    const description = document.getElementById('ticket-desc-input').value;

    try {
      const ticket = await window.HyperNovaSupport.createTicket(currentUser.email, category, subject, description, priority);
      if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("Support Ticket Created", `Ticket ID: ${ticket.id}`, "success");
      document.getElementById('form-create-support-ticket').reset();
      renderApplicantTickets(currentUser.email);
    } catch (err) {
      if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("Ticket Error", err.message, "error");
    }
  });

  // Password Reset Button
  document.getElementById('btn-settings-reset-pw')?.addEventListener('click', async () => {
    try {
      await window.HyperNovaAuth.sendPasswordResetEmail(currentUser.email);
      if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("Reset Email Sent", `Password reset link dispatched to ${currentUser.email}.`, "success");
    } catch (err) {
      if (window.HyperNovaNotify) window.HyperNovaNotify.showToast("Reset Error", err.message, "error");
    }
  });

  // Settings Logout Button
  document.getElementById('btn-settings-logout')?.addEventListener('click', () => {
    window.HyperNovaAuth.logout();
  });

  // Clear Notifications
  document.getElementById('btn-clear-applicant-notifs')?.addEventListener('click', () => {
    const box = document.getElementById('applicant-notifications-container');
    if (box) box.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:2rem 0;">No active notifications.</p>`;
  });

  document.getElementById('btn-dash-continue-stepper')?.addEventListener('click', () => {
    if (currentApplication && currentApplication.status === 'approved') return;
    document.querySelector('[data-tab="tab-onboarding"]')?.click();
  });
}

function savePersonalProfileFields() {
  currentApplication.fullName = document.getElementById('prof-name').value;
  currentApplication.phone = document.getElementById('prof-phone').value;
  currentApplication.location = document.getElementById('prof-location').value;
  currentApplication.bio = document.getElementById('prof-bio').value;
}

function saveTechProfileFields() {
  currentApplication.github = document.getElementById('tech-github')?.value || '';
  currentApplication.linkedin = document.getElementById('tech-linkedin')?.value || '';
  currentApplication.resume = document.getElementById('tech-resume')?.value || '';
  currentApplication.projects = document.getElementById('tech-projects')?.value || '';
}
