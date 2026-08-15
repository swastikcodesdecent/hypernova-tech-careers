/**
 * HyperNova Technology — Official Member Portal Controller
 * Strictly enforces CEO Approval Access Guard and manages all 8 Member Modules:
 * 1. Personal Profile (Google Avatar & Application Details)
 * 2. Assigned Departments
 * 3. Membership Status & Clearance Certificate PDF
 * 4. Company Announcements (CEO Broadcasts)
 * 5. Project Updates
 * 6. Weekly Innovation Portal (Toggleable by IT Admin)
 * 7. Idea Status & Submission Desk
 * 8. Notifications Inbox
 */

let currentApplication = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Enforce Role Authorization
  const isAuth = await window.HyperNovaAuth.enforceRole(['collaborator', 'volunteer_collaborator']);
  if (!isAuth) return;

  currentUser = window.HyperNovaAuth.getCurrentUser();
  if (!currentUser) return;

  // 2. Strict Access Control Guard: Must be approved by CEO Ishan Pandit
  const apps = await window.HyperNovaStore.getCollection('applications');
  currentApplication = apps.find(a => (a.applicantEmail || '').toLowerCase() === currentUser.email.toLowerCase());

  if (!currentApplication || currentApplication.status !== 'approved') {
    if (window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast(
        "Access Restricted",
        "Your application must be APPROVED by CEO Ishan Pandit before accessing the Member Portal.",
        "warning"
      );
    }
    setTimeout(() => {
      window.location.href = 'applicant.html';
    }, 1500);
    return;
  }

  // 3. Initialize Navigation & Render Member Data
  initTabNavigation();
  renderSidebarProfile(currentUser, currentApplication);
  await loadAllMemberModules(currentUser, currentApplication);
  initFormHandlers();

  // Logout Button
  document.getElementById('btn-member-logout')?.addEventListener('click', () => {
    window.HyperNovaAuth.logout();
  });
});

function initTabNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTabId = item.getAttribute('data-tab');
      if (!targetTabId) return;

      navItems.forEach(i => i.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      item.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

function renderSidebarProfile(user, app) {
  const nameEl = document.getElementById('sidebar-member-name');
  const roleEl = document.getElementById('sidebar-member-role');
  const imgEl = document.getElementById('sidebar-member-avatar-img');
  const initialsEl = document.getElementById('sidebar-member-avatar-initials');

  const cleanName = user.fullName || app.fullName || user.email.split('@')[0];
  const roleTitle = user.role === 'volunteer_collaborator' ? 'Volunteer Collaborator' : 'Approved Collaborator';

  if (nameEl) nameEl.innerText = cleanName;
  if (roleEl) roleEl.innerText = roleTitle;

  // Google Photo URL or fallback
  const photoUrl = user.photoURL || user.profilePicUrl || app.profilePicUrl || (window.firebase?.auth()?.currentUser?.photoURL);
  if (photoUrl && imgEl) {
    imgEl.src = photoUrl;
    imgEl.style.display = 'block';
    if (initialsEl) initialsEl.style.display = 'none';
  } else if (initialsEl) {
    const initials = cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    initialsEl.innerText = initials || 'HM';
  }
}

async function loadAllMemberModules(user, app) {
  // Feature 1: Personal Profile
  renderPersonalProfile(user, app);

  // Feature 2: Assigned Departments
  await renderAssignedDepartments(app);

  // Feature 3: Membership Status
  renderMembershipStatus(app);

  // Feature 4: Company Announcements
  await renderCompanyAnnouncements();

  // Feature 5: Project Updates
  await renderProjectUpdates();

  // Feature 7: Idea Status
  await renderSubmittedIdeas(user);

  // Feature 8: Notifications Inbox
  await renderNotificationsInbox(user);
}

// --------------------------------------------------------------------------
// Feature 1: Personal Profile & Google Avatar
// --------------------------------------------------------------------------
function renderPersonalProfile(user, app) {
  const fullNameEl = document.getElementById('profile-full-name');
  const roleBadgeEl = document.getElementById('profile-role-badge');
  const emailEl = document.getElementById('profile-email-display');
  const heroPhotoImg = document.getElementById('profile-google-photo');
  const heroInitials = document.getElementById('profile-initials-fallback');

  const cleanName = user.fullName || app.fullName || user.email.split('@')[0];
  if (fullNameEl) fullNameEl.innerText = cleanName;
  if (emailEl) emailEl.innerText = user.email;
  if (roleBadgeEl) roleBadgeEl.innerText = user.role === 'volunteer_collaborator' ? 'Volunteer Collaborator' : 'External Collaborator';

  const photoUrl = user.photoURL || user.profilePicUrl || app.profilePicUrl || (window.firebase?.auth()?.currentUser?.photoURL);
  if (photoUrl && heroPhotoImg) {
    heroPhotoImg.src = photoUrl;
    heroPhotoImg.style.display = 'block';
    if (heroInitials) heroInitials.style.display = 'none';
  } else if (heroInitials) {
    const initials = cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    heroInitials.innerText = initials || 'HM';
  }

  // Application Data Fields
  document.getElementById('p-app-id').innerText = app.appId || app.id;
  document.getElementById('p-phone').innerText = app.phone || 'N/A';
  
  const ghLink = document.getElementById('p-github-link');
  if (ghLink) {
    ghLink.href = app.github || '#';
    ghLink.innerText = app.github ? 'View GitHub Profile' : 'N/A';
  }

  const liLink = document.getElementById('p-linkedin-link');
  if (liLink) {
    liLink.href = app.linkedin || '#';
    liLink.innerText = app.linkedin ? 'View LinkedIn Profile' : 'N/A';
  }

  const resLink = document.getElementById('p-resume-link');
  if (resLink) {
    resLink.href = app.resume || '#';
    resLink.innerText = app.resume ? 'Open Resume Document' : 'N/A';
  }

  const approvalDate = app.ceoApprovedAt || app.updatedAt;
  document.getElementById('p-approval-date').innerText = approvalDate ? new Date(approvalDate).toLocaleDateString() : 'Verified';

  // Tech Stack Tags
  const techBox = document.getElementById('p-tech-tags');
  if (techBox) {
    const tags = app.selectedTechStack || (app.skills ? app.skills.split(',') : ['HTML', 'CSS', 'JavaScript']);
    techBox.innerHTML = tags.map(t => `<span class="badge badge-pending" style="font-size:0.75rem;">${t.trim()}</span>`).join('');
  }

  // Populate Edit Form
  document.getElementById('edit-member-name').value = cleanName;
  document.getElementById('edit-member-photo-url').value = photoUrl || '';
  document.getElementById('edit-member-phone').value = app.phone || '';
  document.getElementById('edit-member-github').value = app.github || '';
}

// --------------------------------------------------------------------------
// Feature 2: Assigned Departments
// --------------------------------------------------------------------------
async function renderAssignedDepartments(app) {
  const depts = await window.HyperNovaStore.getCollection('departments');
  
  let assignedDept = depts.find(d => d.id === app.assignedDepartmentId || d.id === 'dept-105');
  if (!assignedDept) assignedDept = depts[0] || { name: 'IT Systems & Infrastructure', description: 'Enterprise cloud infrastructure & security.', headName: 'Swastik Paul', headEmail: 'admin@hypernovatech.in', memberCount: 4 };

  document.getElementById('dept-hero-name').innerText = assignedDept.name;
  document.getElementById('dept-hero-desc').innerText = assignedDept.description || 'Core department assignment.';
  document.getElementById('dept-head-name').innerText = `${assignedDept.headName || 'Swastik Paul'} (IT Head)`;
  document.getElementById('dept-head-email').innerText = assignedDept.headEmail || 'admin@hypernovatech.in';
  document.getElementById('dept-member-count').innerText = `${assignedDept.memberCount || 4} Active Collaborators`;

  // All Departments Grid
  const container = document.getElementById('all-depts-container');
  if (container) {
    container.innerHTML = depts.map(d => `
      <div style="background: rgba(15, 23, 42, 0.7); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
        <div style="font-weight:700; color:#ffffff; font-size:0.95rem;">${d.name} ${d.id === assignedDept.id ? '<span class="badge badge-approved" style="font-size:0.7rem; margin-left:5px;">Assigned</span>' : ''}</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;">${d.description || 'R&D Division'}</div>
      </div>
    `).join('');
  }
}

// --------------------------------------------------------------------------
// Feature 3: Membership Status & Certificate PDF
// --------------------------------------------------------------------------
function renderMembershipStatus(app) {
  document.getElementById('status-collab-id').innerText = app.appId || app.id;
  document.getElementById('status-role-claim').innerText = app.applicantType === 'volunteer_collaborator' ? 'Volunteer Collaborator' : 'External Collaborator';
  document.getElementById('status-granted-date').innerText = app.ceoApprovedAt ? new Date(app.ceoApprovedAt).toLocaleDateString() : new Date().toLocaleDateString();
  
  if (app.ceoNote) {
    document.getElementById('ceo-approval-note').innerText = `"${app.ceoNote}"`;
  }

  // Render Approved PDF Document Preview
  try {
    const pdfRes = await window.HyperNovaPDF.generatePDF(app);
    const iframe = document.getElementById('member-pdf-viewer-iframe');
    if (iframe && pdfRes) {
      if (pdfRes.dataUrl) {
        iframe.src = pdfRes.dataUrl;
      } else if (pdfRes.blobUrl) {
        iframe.src = pdfRes.blobUrl;
      }
    }
  } catch (err) {
    console.warn("Error rendering approved member PDF:", err);
  }

  // Download PDF Certificate Buttons
  const handleDownloadPdf = async () => {
    try {
      const pdfRes = await window.HyperNovaPDF.generatePDF(app);
      if (pdfRes.blobUrl) {
        window.open(pdfRes.blobUrl, '_blank');
      } else if (typeof window.HyperNovaPDF.downloadPDF === 'function') {
        window.HyperNovaPDF.downloadPDF(app);
      }
      window.HyperNovaNotify.showToast("PDF Downloaded", "Official approved application & clearance PDF generated successfully.", "success");
    } catch (e) {
      window.HyperNovaNotify.showToast("PDF Error", e.message, "error");
    }
  };

  document.getElementById('btn-download-member-pdf')?.addEventListener('click', handleDownloadPdf);
  document.getElementById('btn-download-member-pdf-top')?.addEventListener('click', handleDownloadPdf);
}

// --------------------------------------------------------------------------
// Feature 4: Company Announcements (CEO Broadcasts)
// --------------------------------------------------------------------------
async function renderCompanyAnnouncements() {
  const announcements = await window.HyperNovaStore.getCollection('announcements');
  const officialNotices = await window.HyperNovaStore.getCollection('officialNotices');
  const combined = [...announcements, ...officialNotices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const container = document.getElementById('member-announcements-container');
  if (!container) return;

  if (combined.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:2rem;">No company announcements or official notices broadcasted yet.</div>`;
    return;
  }

  container.innerHTML = combined.map(a => `
    <div style="background: rgba(15, 23, 42, 0.75); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid ${a.authorRole === 'it_head' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}; margin-bottom: 1rem;">
      <div class="flex justify-between items-center" style="margin-bottom:0.5rem;">
        <span class="badge ${a.priority === 'High' || a.priority === 'Urgent' || a.priority === 'High Priority' ? 'badge-pending' : 'badge-role'}">${a.category || 'Official Broadcast'}</span>
        <span style="font-size:0.775rem; color:var(--text-muted);">${new Date(a.createdAt).toLocaleDateString()}</span>
      </div>
      <h4 style="margin:0 0 0.5rem 0; color:#ffffff; font-size:1.05rem;">${a.title}</h4>
      <p style="font-size:0.875rem; color:var(--text-muted); margin:0; line-height:1.5;">${a.content}</p>
      <div style="font-size:0.775rem; color:var(--accent-cyan); margin-top:0.75rem;">Issued by: ${a.author || 'HyperNova Technology Executive'}</div>
    </div>
  `).join('');
}

// --------------------------------------------------------------------------
// Feature 5: Project Updates
// --------------------------------------------------------------------------
async function renderProjectUpdates() {
  const updates = await window.HyperNovaStore.getCollection('projectUpdates');
  const container = document.getElementById('member-projects-container');
  if (!container) return;

  if (updates.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:2rem;">No project updates posted yet.</div>`;
    return;
  }

  container.innerHTML = updates.map(p => `
    <div style="background: rgba(15, 23, 42, 0.75); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid rgba(56, 189, 248, 0.25);">
      <div class="flex justify-between items-center" style="margin-bottom:0.5rem;">
        <span class="badge badge-approved">${p.departmentName || 'IT R&D Division'}</span>
        <span style="font-size:0.775rem; color:var(--text-muted);">${new Date(p.createdAt).toLocaleDateString()}</span>
      </div>
      <h4 style="margin:0 0 0.5rem 0; color:#ffffff; font-size:1.05rem;">${p.title}</h4>
      <p style="font-size:0.875rem; color:var(--text-muted); margin:0; line-height:1.5;">${p.content}</p>
    </div>
  `).join('');
}

// --------------------------------------------------------------------------
// Feature 6 & 7: Weekly Innovation Portal & Submitted Idea Tracker
// --------------------------------------------------------------------------
window.handleLaunchInnovationPortal = function() {
  const isInnovationEnabled = localStorage.getItem('hypernova_innovation_portal_enabled') === 'true';
  
  if (isInnovationEnabled) {
    window.HyperNovaNotify.showToast("Opening Innovation Hub", "Redirecting to active Weekly Innovation Hub...", "success");
    setTimeout(() => window.location.href = 'coming-soon.html', 1000);
  } else {
    window.HyperNovaNotify.showToast(
      "Portal Status: Coming Soon",
      "Weekly Innovation Portal is currently scheduled for upgrade. IT Admin can unlock access from the IT Head Control Desk.",
      "warning"
    );
    setTimeout(() => window.location.href = 'coming-soon.html', 1500);
  }
};

async function renderSubmittedIdeas(user) {
  const ideas = await window.HyperNovaStore.getCollection('ideas');
  const userIdeas = ideas.filter(i => (i.authorEmail || '').toLowerCase() === user.email.toLowerCase());

  const tbody = document.getElementById('member-ideas-tbody');
  if (!tbody) return;

  if (userIdeas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-dim); padding:1.5rem;">No innovation proposals submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = userIdeas.map(i => `
    <tr>
      <td><strong>${i.title}</strong></td>
      <td>${i.category}</td>
      <td><span class="badge badge-approved">${i.status || 'Submitted'}</span></td>
    </tr>
  `).join('');
}

// --------------------------------------------------------------------------
// Feature 8: Notifications Inbox
// --------------------------------------------------------------------------
async function renderNotificationsInbox(user) {
  const notifs = await window.HyperNovaStore.getCollection('notifications');
  const userNotifs = notifs.filter(n => (n.recipientEmail || '').toLowerCase() === user.email.toLowerCase());
  const container = document.getElementById('member-notifications-container');

  if (!container) return;

  if (userNotifs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:2rem;">Your notifications inbox is clear.</div>`;
    return;
  }

  container.innerHTML = userNotifs.map(n => `
    <div style="background: rgba(15, 23, 42, 0.75); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
      <div class="flex justify-between items-center" style="margin-bottom:0.35rem;">
        <span style="font-weight:700; color:#ffffff; font-size:0.9rem;">${n.title || 'Executive Notification'}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(n.createdAt).toLocaleDateString()}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">${n.message || n.content}</p>
    </div>
  `).join('');
}

// --------------------------------------------------------------------------
// Form Submit Handlers
// --------------------------------------------------------------------------
function initFormHandlers() {
  // Profile Update Form
  document.getElementById('form-update-member-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-member-name').value;
    const newPhotoUrl = document.getElementById('edit-member-photo-url').value;
    const newPhone = document.getElementById('edit-member-phone').value;
    const newGithub = document.getElementById('edit-member-github').value;

    try {
      currentUser.fullName = newName;
      currentUser.photoURL = newPhotoUrl;
      currentUser.profilePicUrl = newPhotoUrl;

      currentApplication.fullName = newName;
      currentApplication.photoURL = newPhotoUrl;
      currentApplication.profilePicUrl = newPhotoUrl;
      currentApplication.phone = newPhone;
      currentApplication.github = newGithub;

      await window.HyperNovaStore.setDoc('applications', currentApplication.id, currentApplication);
      await window.HyperNovaAuth.updateUserProfile({ fullName: newName, photoURL: newPhotoUrl });

      renderSidebarProfile(currentUser, currentApplication);
      renderPersonalProfile(currentUser, currentApplication);

      window.HyperNovaNotify.showToast("Profile Saved", "Member profile and avatar picture updated successfully.", "success");
    } catch (err) {
      window.HyperNovaNotify.showToast("Update Error", err.message, "error");
    }
  });

  // Submit Innovation Idea Form
  document.getElementById('form-submit-idea')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('idea-title').value;
    const category = document.getElementById('idea-category').value;
    const desc = document.getElementById('idea-desc').value;

    try {
      const newIdea = {
        id: 'idea-' + Date.now(),
        title: title,
        category: category,
        description: desc,
        authorEmail: currentUser.email,
        authorName: currentUser.fullName || currentUser.email,
        status: 'Submitted',
        createdAt: new Date().toISOString()
      };

      await window.HyperNovaStore.setDoc('ideas', newIdea.id, newIdea);
      await window.HyperNovaAudit.log('SUBMITTED_INNOVATION_IDEA', currentUser.email, currentUser.role, newIdea.id);
      
      document.getElementById('form-submit-idea').reset();
      await renderSubmittedIdeas(currentUser);

      window.HyperNovaNotify.showToast("Proposal Submitted", "Your innovation idea has been dispatched to the executive R&D board.", "success");
    } catch (err) {
      window.HyperNovaNotify.showToast("Submission Error", err.message, "error");
    }
  });
}
