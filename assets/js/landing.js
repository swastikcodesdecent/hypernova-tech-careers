/**
 * HyperNova Technology - Landing Portal Controller
 */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Switch Gateway Mode (SIGN UP vs SIGN IN)
function switchGatewayMode(mode) {
  const isMaint = window.HyperNovaMaintenance && window.HyperNovaMaintenance.isMaintenanceActive() && !window.HyperNovaMaintenance.isExecutiveUser();

  if (isMaint && mode === 'signup') {
    if (window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast("Maintenance Mode Active", "Collaborator account creation is locked while maintenance is in progress.", "warning");
    }
    return;
  }

  const btnSignUp = document.getElementById('tab-btn-signup');
  const btnSignIn = document.getElementById('tab-btn-signin');
  const viewSignUp = document.getElementById('view-gateway-signup');
  const viewSignIn = document.getElementById('view-gateway-signin');

  btnSignUp?.classList.remove('active');
  btnSignIn?.classList.remove('active');

  if (mode === 'signup') {
    btnSignUp?.classList.add('active');
    if (viewSignUp) viewSignUp.style.display = 'block';
    if (viewSignIn) viewSignIn.style.display = 'none';
  } else if (mode === 'signin') {
    btnSignIn?.classList.add('active');
    if (viewSignUp) viewSignUp.style.display = 'none';
    if (viewSignIn) viewSignIn.style.display = 'block';
  }

  if (window.HyperNovaMaintenance) {
    window.HyperNovaMaintenance.applyGuard();
  }
}

// Switch Sign In Sub Tab (COLLABORATOR SIGN IN vs EXECUTIVE ACCESS)
function switchSignInSubTab(sub) {
  const isMaint = window.HyperNovaMaintenance && window.HyperNovaMaintenance.isMaintenanceActive() && !window.HyperNovaMaintenance.isExecutiveUser();

  if (isMaint && sub === 'collab') {
    if (window.HyperNovaNotify) {
      window.HyperNovaNotify.showToast("Maintenance Mode Active", "Collaborator sign-in is locked while maintenance is in progress. Only Executive Access is enabled.", "warning");
    }
    return;
  }

  const btnCollab = document.getElementById('tab-sub-collab-login');
  const btnExec = document.getElementById('tab-sub-exec-login');
  const viewCollab = document.getElementById('sub-view-collab-login');
  const formExec = document.getElementById('form-exec-login');

  btnCollab?.classList.remove('active');
  btnExec?.classList.remove('active');

  if (sub === 'collab') {
    btnCollab?.classList.add('active');
    if (viewCollab) viewCollab.style.display = 'block';
    if (formExec) formExec.style.display = 'none';
  } else if (sub === 'exec') {
    btnExec?.classList.add('active');
    if (viewCollab) viewCollab.style.display = 'none';
    if (formExec) formExec.style.display = 'block';
  }

  if (window.HyperNovaMaintenance) {
    window.HyperNovaMaintenance.applyGuard();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Check for URL parameters (mode=signup, mode=signin, type=exec, reregister=1)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reregister') === '1' || urlParams.get('mode') === 'signup') {
    switchGatewayMode('signup');
    setTimeout(() => {
      window.HyperNovaNotify.showToast("Re-Registration Gateway", "Select your collaborator role to re-register and submit a new application.", "info");
    }, 400);
  } else if (urlParams.get('mode') === 'signin' || urlParams.get('type') === 'exec') {
    switchGatewayMode('signin');
    if (urlParams.get('type') === 'exec') {
      switchSignInSubTab('exec');
    }
  }

  // Password Recovery Link Click
  document.getElementById('link-recover-cipher')?.addEventListener('click', () => {
    openModal('modal-cyber-recovery');
  });

  // SIGN UP: Register as External Collaborator (Google)
  document.getElementById('btn-google-reg-external')?.addEventListener('click', async () => {
    try {
      window.HyperNovaNotify.showToast("Google Authentication", "Initiating External Collaborator Registration...", "info");
      const user = await window.HyperNovaAuth.loginOrRegisterWithGoogle('collaborator');
      window.HyperNovaNotify.showToast("Registration Success", `Welcome ${user.fullName || user.email}`, "success");
      setTimeout(async () => {
        await window.HyperNovaAuth.redirectUserToRolePortal(user.role);
      }, 800);
    } catch (err) {
      window.HyperNovaNotify.showToast("Registration Error", err.message, "error");
    }
  });

  // SIGN UP: Register as Volunteer Collaborator (Google)
  document.getElementById('btn-google-reg-volunteer')?.addEventListener('click', async () => {
    try {
      window.HyperNovaNotify.showToast("Google Authentication", "Initiating Volunteer Collaborator Registration...", "info");
      const user = await window.HyperNovaAuth.loginOrRegisterWithGoogle('volunteer_collaborator');
      window.HyperNovaNotify.showToast("Registration Success", `Welcome ${user.fullName || user.email}`, "success");
      setTimeout(async () => {
        await window.HyperNovaAuth.redirectUserToRolePortal(user.role);
      }, 800);
    } catch (err) {
      window.HyperNovaNotify.showToast("Registration Error", err.message, "error");
    }
  });

  // SIGN IN: Collaborator Google Sign-In (Auto-Detect Role)
  document.getElementById('btn-google-signin-collab')?.addEventListener('click', async () => {
    try {
      window.HyperNovaNotify.showToast("Google Sign-In", "Authenticating & detecting collaborator profile...", "info");
      const user = await window.HyperNovaAuth.loginOrRegisterWithGoogle('collaborator');
      window.HyperNovaNotify.showToast("Authentication Success", `Welcome back ${user.fullName || user.email}`, "success");
      setTimeout(async () => {
        await window.HyperNovaAuth.redirectUserToRolePortal(user.role);
      }, 800);
    } catch (err) {
      window.HyperNovaNotify.showToast("Sign-In Error", err.message, "error");
    }
  });

  // SIGN IN: Executive Login Form (CEO & Admin IT Head)
  document.getElementById('form-exec-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-cipher').value;

    try {
      let expectedRole = null;
      if (email.toLowerCase().includes('ceo')) expectedRole = 'ceo';
      if (email.toLowerCase().includes('admin')) expectedRole = 'it_head';

      const user = await window.HyperNovaAuth.login(email, password, expectedRole);
      window.HyperNovaNotify.showToast("Executive Authenticated", `Authenticated as ${user.fullName}`, "success");
      setTimeout(() => {
        window.HyperNovaAuth.redirectUserToRolePortal(user.role);
      }, 800);
    } catch (err) {
      window.HyperNovaNotify.showToast("Executive Login Error", err.message, "error");
    }
  });

  // Recovery Form Submit
  document.getElementById('form-cyber-recovery')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('rec-email').value;
    try {
      await window.HyperNovaAuth.initiatePasswordRecovery(email);
      window.HyperNovaNotify.showToast("Reset Link Sent", `Secure recovery instructions sent to ${email}`, "success");
      closeModal('modal-cyber-recovery');
    } catch (err) {
      window.HyperNovaNotify.showToast("Recovery Error", err.message, "error");
    }
  });

  // IT Head Support Request Button in Recovery Modal
  document.getElementById('btn-request-it-recovery')?.addEventListener('click', async () => {
    const email = document.getElementById('rec-email').value;
    if (!email) {
      window.HyperNovaNotify.showToast("Email Required", "Please enter your security email address first.", "warning");
      return;
    }
    const details = prompt("Describe the account issue for IT Admin assistance:", "Unable to access password reset link.");
    if (details === null) return;

    try {
      await window.HyperNovaAuth.requestITHeadRecoveryAssistance(email, details);
      window.HyperNovaNotify.showToast("Request Sent", "IT Admin notified. Support ticket created.", "success");
      closeModal('modal-cyber-recovery');
    } catch (err) {
      window.HyperNovaNotify.showToast("Request Error", err.message, "error");
    }
  });
});
