/**
 * HyperNova Technology - Authentication & Role-Based Access Control Manager
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.initSession();
  }

  initSession() {
    const raw = localStorage.getItem('hypernova_active_session');
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
        // Sanitize legacy seed names
        if (this.currentUser.email && this.currentUser.email.toLowerCase().includes('ceo')) {
          this.currentUser.fullName = 'Ishan Pandit';
        }
        if (this.currentUser.email && (this.currentUser.email.toLowerCase().includes('admin') || this.currentUser.email.toLowerCase().includes('it-head'))) {
          this.currentUser.fullName = 'Swastik Paul';
        }
        localStorage.setItem('hypernova_active_session', JSON.stringify(this.currentUser));
      } catch (e) {
        this.currentUser = null;
      }
    }

    // Bind real-time Firebase Auth state change listener
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      window.HyperNovaFB.auth.onAuthStateChanged(async (fbUser) => {
        if (!fbUser && this.currentUser && this.currentUser.role !== 'ceo' && this.currentUser.role !== 'it_head') {
          console.warn("Firebase Auth user was deleted or logged out.");
          const userEmail = this.currentUser.email;
          this.currentUser = null;
          localStorage.removeItem('hypernova_active_session');
          
          if (userEmail) {
            const apps = await window.HyperNovaStore.getCollection('applications');
            const targetApp = apps.find(a => (a.applicantEmail || '').toLowerCase() === userEmail.toLowerCase());
            if (targetApp) await window.HyperNovaStore.deleteDoc('applications', targetApp.id);
          }

          alert("Your account has been deleted from Firebase Authentication.");
          window.location.href = 'index.html';
        }
      });
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Admin / Executive Password Login (CEO & Admin)
  async login(email, password, expectedRole = null) {
    const isMaint = (localStorage.getItem('hypernova_maintenance_mode') === 'true');
    if (isMaint) {
      const emailLower = email.toLowerCase();
      const isExec = emailLower.includes('ceo') || emailLower.includes('admin') || emailLower === 'ceo@hypernovatech.in' || emailLower === 'admin@hypernovatech.in';
      if (!isExec) {
        throw new Error("System Maintenance Active: Collaborator login is locked by IT Operations. Only authorized executives can sign in.");
      }
    }

    let userDoc = null;

    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      try {
        const cred = await window.HyperNovaFB.auth.signInWithEmailAndPassword(email, password);
        userDoc = await window.HyperNovaStore.getDoc('users', cred.user.uid);
      } catch (err) {
        console.warn("Live Firebase auth login failed/fallback:", err);
      }
    }

    if (!userDoc) {
      // Local fallback lookup
      const users = await window.HyperNovaStore.getCollection('users');
      userDoc = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      // Seed credentials check fallback
      if (!userDoc) {
        if (email.toLowerCase() === 'ceo@hypernovatech.in' && password === 'ceo1234') {
          userDoc = { id: 'user-ceo-01', email: 'ceo@hypernovatech.in', fullName: 'Ishan Pandit (CEO)', role: 'ceo' };
        } else if (email.toLowerCase() === 'admin@hypernovatech.in' && password === 'admin1234') {
          userDoc = { id: 'user-admin-01', email: 'admin@hypernovatech.in', fullName: 'Swastik Paul (IT Head)', role: 'it_head' };
        }
      } else {
        // Validate password for fallback (check customPassword if updated)
        const expectedPwd = userDoc.customPassword || (userDoc.email.toLowerCase().includes('ceo') ? 'ceo1234' : 'admin1234');
        if (password !== expectedPwd) {
          throw new Error("Invalid access cipher password.");
        }
      }
    }

    if (!userDoc) {
      throw new Error("Invalid credentials or access cipher. User account does not exist.");
    }

    if (expectedRole && userDoc.role !== expectedRole) {
      throw new Error(`Unauthorized role access. Account role is '${userDoc.role}', but expected '${expectedRole}'.`);
    }

    this.currentUser = userDoc;
    localStorage.setItem('hypernova_active_session', JSON.stringify(userDoc));

    await window.HyperNovaAudit.log('USER_LOGIN', userDoc.email, userDoc.role, userDoc.id);
    return userDoc;
  }

  // Direct Google Sign-In for all Collaborators (External & Volunteer)
  async loginOrRegisterWithGoogle(requestedRole = 'collaborator') {
    const isMaint = (localStorage.getItem('hypernova_maintenance_mode') === 'true');
    if (isMaint) {
      throw new Error("System Maintenance Active: Collaborator sign-in and registration are locked by IT Operations. Only executive access is enabled.");
    }
    let googleEmail = '';
    let googleName = '';

    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await window.HyperNovaFB.auth.signInWithPopup(provider);
        googleEmail = result.user.email;
        googleName = result.user.displayName || googleEmail.split('@')[0];
      } catch (e) {
        console.warn("Google popup authentication fallback used:", e);
      }
    }

    // Interactive fallback if live Google popup is unconfigured or in local demo mode
    if (!googleEmail) {
      googleEmail = prompt("Google OAuth Gateway - Enter your Google Email:", "collaborator@gmail.com");
      if (!googleEmail) throw new Error("Google Sign-In canceled.");
      googleName = prompt("Enter your Full Name:", "Alex Vance");
      if (!googleName) googleName = "Collaborator Member";
    }

    const users = await window.HyperNovaStore.getCollection('users');
    let userDoc = users.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());

    if (!userDoc) {
      const userId = 'user-collab-' + Date.now();
      userDoc = {
        id: userId,
        email: googleEmail,
        fullName: googleName,
        role: requestedRole, // collaborator or volunteer_collaborator
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };
      await window.HyperNovaStore.setDoc('users', userDoc.id, userDoc);
      await window.HyperNovaAudit.log('ACCOUNT_CREATED', userDoc.email, userDoc.role, userDoc.id, { type: requestedRole, provider: 'Google' });
      
      await window.HyperNovaNotify.sendEmailNotification(
        userDoc.email,
        userDoc.role,
        'Welcome to HyperNova Technology',
        `Google authentication verified for ${userDoc.fullName}. Complete your onboarding application.`
      );
    }

    this.currentUser = userDoc;
    localStorage.setItem('hypernova_active_session', JSON.stringify(userDoc));

    return userDoc;
  }

  async initiatePasswordRecovery(email) {
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      try {
        await window.HyperNovaFB.auth.sendPasswordResetEmail(email);
      } catch (e) {
        console.warn("Live password reset error:", e);
      }
    }

    await window.HyperNovaNotify.sendEmailNotification(
      email,
      'applicant',
      'Password Reset Link - HyperNova Technology',
      `Use this secure link to reset your access cipher: https://hypernova-careers.web.app/auth/reset?email=${encodeURIComponent(email)}`
    );

    await window.HyperNovaAudit.log('PASSWORD_RECOVERY_INITIATED', email, 'user', email);
    return true;
  }

  async requestITHeadRecoveryAssistance(userEmail, issueDetails) {
    const ticketId = 'ticket-' + Date.now();
    const ticket = {
      id: ticketId,
      applicantEmail: userEmail,
      category: 'Password / Account Recovery',
      subject: `Account Recovery Assistance Request for ${userEmail}`,
      description: issueDetails,
      priority: 'Urgent',
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    await window.HyperNovaStore.setDoc('supportTickets', ticketId, ticket);
    await window.HyperNovaAudit.log('IT_HEAD_ASSISTANCE_REQUESTED', userEmail, 'user', ticketId);

    // Notify IT Admin
    await window.HyperNovaNotify.sendEmailNotification(
      'admin@hypernovatech.in',
      'it_head',
      'Urgent Support Ticket: Account Recovery Assistance',
      `User ${userEmail} requested account recovery assistance. Ticket ID: ${ticketId}`
    );

    return ticket;
  }

  async updateUserProfile(updates) {
    if (!this.currentUser) throw new Error("No active session.");

    this.currentUser = {
      ...this.currentUser,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('hypernova_active_session', JSON.stringify(this.currentUser));
    await window.HyperNovaStore.setDoc('users', this.currentUser.id, this.currentUser);
    await window.HyperNovaAudit.log('USER_PROFILE_UPDATED', this.currentUser.email, this.currentUser.role, this.currentUser.id, updates);
    
    return this.currentUser;
  }

  async changeUserPassword(currentPassword, newPassword) {
    if (!this.currentUser) throw new Error("No active session.");

    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth && window.HyperNovaFB.auth.currentUser) {
      try {
        await window.HyperNovaFB.auth.currentUser.updatePassword(newPassword);
      } catch (err) {
        console.warn("Live Firebase password update warning:", err);
      }
    }

    // Save custom password in local user doc for fallback auth
    this.currentUser.customPassword = newPassword;
    localStorage.setItem('hypernova_active_session', JSON.stringify(this.currentUser));
    await window.HyperNovaStore.setDoc('users', this.currentUser.id, this.currentUser);
    await window.HyperNovaAudit.log('PASSWORD_CHANGED', this.currentUser.email, this.currentUser.role, this.currentUser.id);
    
    return true;
  }

  logout() {
    if (this.currentUser) {
      window.HyperNovaAudit.log('USER_LOGOUT', this.currentUser.email, this.currentUser.role, this.currentUser.id);
    }
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      window.HyperNovaFB.auth.signOut().catch(() => {});
    }
    this.currentUser = null;
    localStorage.removeItem('hypernova_active_session');
    window.location.href = 'index.html';
  }

  async validateActiveSession() {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'ceo' || this.currentUser.role === 'it_head') return true;

    // 1. Live Firebase Auth User Verification
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.auth) {
      const fbUser = window.HyperNovaFB.auth.currentUser;
      if (fbUser) {
        try {
          await fbUser.reload();
        } catch (err) {
          console.warn("Firebase Auth user reload failed — account deleted from console:", err);
          const email = this.currentUser.email;
          this.currentUser = null;
          localStorage.removeItem('hypernova_active_session');
          
          if (email) {
            const apps = await window.HyperNovaStore.getCollection('applications');
            const targetApp = apps.find(a => (a.applicantEmail || '').toLowerCase() === email.toLowerCase());
            if (targetApp) await window.HyperNovaStore.deleteDoc('applications', targetApp.id);
          }

          alert("Your previous account was removed. Please re-register your collaboration account to begin a fresh application.");
          window.location.href = 'index.html?reregister=1';
          return false;
        }
      }
    }

    // 2. Database /users collection verification
    const users = await window.HyperNovaStore.getCollection('users');
    const existsUser = users.some(u => (u.email || '').toLowerCase() === this.currentUser.email.toLowerCase());

    if (!existsUser) {
      console.warn("Active session user account was deleted from /users collection.");
      const email = this.currentUser.email;
      this.currentUser = null;
      localStorage.removeItem('hypernova_active_session');

      if (email) {
        const apps = await window.HyperNovaStore.getCollection('applications');
        const targetApp = apps.find(a => (a.applicantEmail || '').toLowerCase() === email.toLowerCase());
        if (targetApp) await window.HyperNovaStore.deleteDoc('applications', targetApp.id);
      }

      alert("Your previous account was removed by IT Operations/CEO. Please re-register your collaboration account to begin a fresh application.");
      window.location.href = 'index.html?reregister=1';
      return false;
    }

    return true;
  }

  enforceRole(allowedRoles = []) {
    if (!this.currentUser) {
      window.location.href = 'index.html';
      return false;
    }
    this.validateActiveSession();
    if (allowedRoles.length > 0 && !allowedRoles.includes(this.currentUser.role)) {
      alert(`Access Restricted. Your current role (${this.currentUser.role}) does not have permission to access this portal.`);
      this.redirectUserToRolePortal(this.currentUser.role);
      return false;
    }
    return true;
  }

  async redirectUserToRolePortal(role) {
    if (role === 'ceo') {
      window.location.href = 'ceo.html';
    } else if (role === 'it_head') {
      window.location.href = 'it-head.html';
    } else {
      if (this.currentUser && this.currentUser.email) {
        try {
          const apps = await window.HyperNovaStore.getCollection('applications');
          const userApp = apps.find(a => (a.applicantEmail || '').toLowerCase() === this.currentUser.email.toLowerCase());
          if (userApp && userApp.status === 'approved') {
            window.location.href = 'coming-soon.html';
            return;
          }
        } catch (e) {
          console.warn("Error checking application status on redirect:", e);
        }
      }
      window.location.href = 'applicant.html';
    }
  }
}

window.HyperNovaAuth = new AuthManager();
