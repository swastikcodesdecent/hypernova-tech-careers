/**
 * HyperNova Technology - UI Toasts & Simulated Email Dispatcher
 */

class NotificationService {
  constructor() {
    this.toastContainer = null;
    this.initContainer();
  }

  initContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
      this.toastContainer = container;
    } else {
      this.toastContainer = document.getElementById('toast-container');
    }
  }

  showToast(title, description = '', type = 'info', durationMs = 4000) {
    this.initContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let borderAccentClass = 'border-info';
    if (type === 'success') borderAccentClass = 'border-success';
    if (type === 'error') borderAccentClass = 'border-danger';
    if (type === 'warning') borderAccentClass = 'border-warning';

    toast.innerHTML = `
      <div style="flex-grow: 1;">
        <div class="toast-title">${this.escapeHtml(title)}</div>
        ${description ? `<div class="toast-desc">${this.escapeHtml(description)}</div>` : ''}
      </div>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="this.parentElement.remove();">&times;</button>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, durationMs);
  }

  async sendEmailNotification(toEmail, recipientRole, subject, bodyText, actionUrl = '#') {
    const notificationDoc = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      toEmail: toEmail,
      recipientRole: recipientRole,
      subject: subject,
      body: bodyText,
      actionUrl: actionUrl,
      sentAt: new Date().toISOString(),
      read: false
    };

    await window.HyperNovaStore.setDoc('notifications', notificationDoc.id, notificationDoc);
    
    // Log to console & show notification banner preview for user experience
    console.log(`[SIMULATED EMAIL DISPATCH] To: ${toEmail} | Subject: ${subject}`);
    this.showToast(`Email Notification Sent`, `Recipient: ${toEmail} - "${subject}"`, 'info', 5000);
  }

  async broadcastNotificationToAllUsers(title, bodyText, category = 'CEO Broadcast') {
    const users = await window.HyperNovaStore.getCollection('users');
    const apps = await window.HyperNovaStore.getCollection('applications');

    const targetEmails = new Set();
    
    // Always include IT Admin & CEO
    targetEmails.add('admin@hypernovatech.in');
    targetEmails.add('swastikdevs.js@gmail.com');
    targetEmails.add('ceo@hypernovatech.in');

    // Include all registered users
    users.forEach(u => {
      if (u.email) targetEmails.add(u.email.toLowerCase());
    });

    // Include all applicants / collaborators
    apps.forEach(a => {
      if (a.applicantEmail) targetEmails.add(a.applicantEmail.toLowerCase());
    });

    // Batch dispatch notification documents
    for (const email of targetEmails) {
      const notifId = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const notifDoc = {
        id: notifId,
        toEmail: email,
        recipientEmail: email,
        recipientRole: 'member',
        title: `📢 CEO Announcement: ${title}`,
        subject: `📢 CEO Announcement: ${title}`,
        message: bodyText,
        body: bodyText,
        category: category,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        read: false
      };
      await window.HyperNovaStore.setDoc('notifications', notifDoc.id, notifDoc);
    }

    this.showToast("Broadcast Dispatched", `Notification sent to all ${targetEmails.size} registered members & IT Admin.`, "success");
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
}

window.HyperNovaNotify = new NotificationService();
