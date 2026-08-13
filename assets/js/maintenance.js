/**
 * HyperNova Technology — System Maintenance Guard Engine
 * Controls system-wide maintenance mode. Locks portals for non-executives while allowing executive bypass.
 * Includes real-time IT Admin maintenance countdown timer & collaborator access warning notices.
 */

class SystemMaintenanceEngine {
  constructor() {
    this.isActive = false;
    this.expectedEndTime = null;
    this.overlayEl = null;
    this.timerInterval = null;

    this.init();
  }

  async init() {
    let savedState = localStorage.getItem('hypernova_maintenance_mode');
    let savedEndTime = localStorage.getItem('hypernova_maintenance_end_time');

    if ((savedState === null || !savedEndTime) && window.HyperNovaStore) {
      try {
        const config = await window.HyperNovaStore.getDoc('settings', 'maintenance_config');
        if (config) {
          if (savedState === null && typeof config.enabled === 'boolean') {
            savedState = config.enabled ? 'true' : 'false';
          }
          if (!savedEndTime && config.expectedEndTime) {
            savedEndTime = config.expectedEndTime;
          }
        }
      } catch (e) {
        console.warn('Could not read maintenance config from store:', e);
      }
    }

    this.isActive = savedState === 'true';
    this.expectedEndTime = savedEndTime || null;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.applyGuard());
    } else {
      this.applyGuard();
    }

    this.startTimerTicker();

    // Cross-tab and real-time maintenance event listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'hypernova_maintenance_mode') {
        this.isActive = e.newValue === 'true';
        this.applyGuard();
      }
      if (e.key === 'hypernova_maintenance_end_time') {
        this.expectedEndTime = e.newValue;
        this.startTimerTicker();
      }
    });

    window.addEventListener('hypernovaMaintenanceChanged', (e) => {
      if (e.detail) {
        if (typeof e.detail.active === 'boolean') {
          this.isActive = e.detail.active;
        }
        if (e.detail.expectedEndTime !== undefined) {
          this.expectedEndTime = e.detail.expectedEndTime;
        }
        this.applyGuard();
        this.startTimerTicker();
      }
    });
  }

  isMaintenanceActive() {
    return this.isActive;
  }

  getExpectedEndTime() {
    return this.expectedEndTime;
  }

  async setMaintenanceMode(active, expectedEndTime = null) {
    this.isActive = active;
    this.expectedEndTime = expectedEndTime;

    localStorage.setItem('hypernova_maintenance_mode', active ? 'true' : 'false');
    if (expectedEndTime) {
      localStorage.setItem('hypernova_maintenance_end_time', expectedEndTime);
    } else {
      localStorage.removeItem('hypernova_maintenance_end_time');
    }

    if (window.HyperNovaStore) {
      try {
        await window.HyperNovaStore.setDoc('settings', 'maintenance_config', {
          enabled: active,
          expectedEndTime: expectedEndTime || null,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to update maintenance_config in store:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('hypernovaMaintenanceChanged', { detail: { active, expectedEndTime } }));
    this.applyGuard();
    this.startTimerTicker();
  }

  startTimerTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateDisplays = () => {
      const remainingStr = this.getFormattedRemainingTime();

      const overlayTimerEl = document.getElementById('maint-overlay-countdown-text');
      if (overlayTimerEl) {
        overlayTimerEl.innerText = remainingStr;
      }

      const bannerTimerEl = document.getElementById('maint-banner-countdown-text');
      if (bannerTimerEl) {
        bannerTimerEl.innerText = remainingStr;
      }

      const deskTimerEl = document.getElementById('maint-desk-countdown-text');
      if (deskTimerEl) {
        deskTimerEl.innerText = remainingStr;
      }
    };

    updateDisplays();
    this.timerInterval = setInterval(updateDisplays, 1000);
  }

  getFormattedRemainingTime() {
    if (!this.expectedEndTime) {
      return this.isActive ? '⏱️ Maintenance Window: Active (In Progress)' : '⏱️ Maintenance Mode: Disabled';
    }

    const target = new Date(this.expectedEndTime).getTime();
    const now = Date.now();
    const diff = target - now;

    if (isNaN(diff) || diff <= 0) {
      return '⏱️ Maintenance Window Finishing... (Completing soon)';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => n.toString().padStart(2, '0');
    return `⏱️ Estimated Time Remaining: ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  isExecutiveUser() {
    const user = window.HyperNovaAuth ? window.HyperNovaAuth.getCurrentUser() : null;
    if (!user) return false;

    const role = (user.role || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    return role === 'ceo' ||
           role === 'it_head' ||
           email === 'ceo@hypernovatech.in' ||
           email === 'admin@hypernovatech.in' ||
           email.includes('ceo') ||
           email.includes('admin');
  }

  isExecutiveLoginView() {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const typeParam = urlParams.get('type');

    if (typeParam === 'exec' || (modeParam === 'signin' && typeParam === 'exec')) {
      return true;
    }

    const formExec = document.getElementById('form-exec-login');
    const viewSignIn = document.getElementById('view-gateway-signin');
    if (formExec && viewSignIn) {
      const isSignInVisible = viewSignIn.style.display !== 'none' && getComputedStyle(viewSignIn).display !== 'none';
      const isExecFormVisible = formExec.style.display !== 'none' && getComputedStyle(formExec).display !== 'none';
      if (isSignInVisible && isExecFormVisible) {
        return true;
      }
    }

    return false;
  }

  applyGuard() {
    const isExec = this.isExecutiveUser();
    const isExecLogin = this.isExecutiveLoginView();

    // If maintenance is active AND user is not an executive AND not viewing executive login form
    if (this.isActive && !isExec && !isExecLogin) {
      this.showMaintenanceOverlay();
      this.lockCollaboratorUI(false);
    } else if (this.isActive && !isExec && isExecLogin) {
      this.removeMaintenanceOverlay();
      this.lockCollaboratorUI(true);
    } else {
      this.removeMaintenanceOverlay();
      this.lockCollaboratorUI(false);
    }
  }

  lockCollaboratorUI(locked) {
    const btnSignUp = document.getElementById('tab-btn-signup');
    const btnCollab = document.getElementById('tab-sub-collab-login');
    const viewSignUp = document.getElementById('view-gateway-signup');
    const subViewCollab = document.getElementById('sub-view-collab-login');
    const formExec = document.getElementById('form-exec-login');
    const viewSignIn = document.getElementById('view-gateway-signin');

    if (locked) {
      if (btnSignUp) btnSignUp.style.display = 'none';
      if (btnCollab) btnCollab.style.display = 'none';
      if (viewSignUp) viewSignUp.style.display = 'none';
      if (subViewCollab) subViewCollab.style.display = 'none';
      if (viewSignIn) viewSignIn.style.display = 'block';
      if (formExec) formExec.style.display = 'block';

      document.getElementById('tab-btn-signin')?.classList.add('active');
      document.getElementById('tab-sub-exec-login')?.classList.add('active');

      let banner = document.getElementById('exec-maint-notice-banner');
      if (!banner && formExec) {
        banner = document.createElement('div');
        banner.id = 'exec-maint-notice-banner';
        banner.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.85rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; font-size: 0.8rem; color: #ef4444; text-align: center;';
        banner.innerHTML = `
          <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.25rem;">🛠️ SYSTEM MAINTENANCE ACTIVE — COLLABORATOR ACCESS LOCKED</div>
          <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.5rem;">⚠️ Collaborators & external members cannot sign in or enter during maintenance mode. Authorized Executive accounts only.</div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #a78bfa; font-family: monospace; background: rgba(15, 23, 42, 0.6); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid rgba(139, 92, 246, 0.3);" id="maint-banner-countdown-text">${this.getFormattedRemainingTime()}</div>
        `;
        formExec.insertBefore(banner, formExec.firstChild);
      }
    } else {
      if (btnSignUp) btnSignUp.style.display = '';
      if (btnCollab) btnCollab.style.display = '';

      const banner = document.getElementById('exec-maint-notice-banner');
      if (banner) banner.remove();
    }
  }

  showMaintenanceOverlay() {
    if (document.getElementById('id-maintenance-overlay')) return;

    const remainingStr = this.getFormattedRemainingTime();
    const isIdTheme = document.body.classList.contains('theme-independence-day') || (localStorage.getItem('hypernova_theme_mode') === 'independence_day');

    if (isIdTheme) {
      document.body.classList.add('theme-independence-day');
      if (window.HyperNovaTheme) window.HyperNovaTheme.applyTheme();
    }

    const overlayHtml = `
      <div id="id-maintenance-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: ${isIdTheme ? 'rgba(6, 9, 19, 0.78)' : 'rgba(6, 9, 19, 0.94)'};
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: #ffffff;
        font-family: var(--font-heading);
        text-align: center;
      ">
        <div class="glass-card animate-fade-in" style="
          max-width: 600px;
          border: ${isIdTheme ? '1.5px solid rgba(255, 153, 51, 0.45)' : '2px solid rgba(239, 68, 68, 0.5)'};
          background: rgba(15, 23, 42, 0.92);
          box-shadow: ${isIdTheme ? '0 20px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(255, 153, 51, 0.25)' : '0 0 60px rgba(239, 68, 68, 0.3)'};
          padding: 2.5rem 2rem;
          border-radius: var(--radius-xl);
          position: relative;
          overflow: hidden;
        ">
          <div style="
            width: 72px;
            height: 72px;
            margin: 0 auto 1.25rem auto;
            border-radius: 50%;
            background: ${isIdTheme ? 'rgba(255, 153, 51, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
            border: 2px solid ${isIdTheme ? 'rgba(255, 153, 51, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.2rem;
          ">🛠️</div>

          <span class="badge" style="
            background: ${isIdTheme ? 'rgba(255, 153, 51, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            color: ${isIdTheme ? '#FF9933' : '#ef4444'};
            border: 1px solid ${isIdTheme ? 'rgba(255, 153, 51, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
            font-size: 0.825rem;
            padding: 0.4rem 1rem;
            margin-bottom: 1rem;
            display: inline-block;
            letter-spacing: 0.05em;
          ">${isIdTheme ? '🇮🇳 15TH AUGUST INDEPENDENCE DAY &bull; MAINTENANCE MODE' : 'SYSTEM MAINTENANCE & UPGRADE IN PROGRESS'}</span>

          <h2 style="margin: 0 0 0.75rem 0; font-size: 1.75rem; color: #ffffff;">SYSTEM UPGRADE IN PROGRESS</h2>
          
          <!-- Explicit Collaborator Warning Box -->
          <div style="
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: var(--radius-md);
            padding: 0.9rem 1.1rem;
            margin-bottom: 1.25rem;
            text-align: left;
          ">
            <div style="color: #ef4444; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.25rem;">
              ⚠️ COLLABORATOR ACCESS RESTRICTED
            </div>
            <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.5;">
              Collaborators, applicants, and external members cannot sign in or enter any portals while System Maintenance Mode is active. Portal access is strictly locked for IT upgrades.
            </div>
          </div>

          <!-- Real-Time Countdown Timer Box -->
          <div style="
            background: rgba(30, 41, 59, 0.8);
            padding: 1rem 1.25rem;
            border-radius: var(--radius-md);
            border: 1px solid ${isIdTheme ? 'rgba(255, 153, 51, 0.4)' : 'rgba(139, 92, 246, 0.4)'};
            margin-bottom: 1.75rem;
            font-size: 0.9rem;
            color: ${isIdTheme ? '#FF9933' : '#a78bfa'};
            font-weight: 600;
            font-family: monospace;
          ">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.35rem;">LIVE IT OPERATIONS MAINTENANCE TIMER</div>
            <span id="maint-overlay-countdown-text">${remainingStr}</span>
          </div>

          <div class="flex justify-center gap-3" style="flex-wrap: wrap;">
            <a href="index.html?mode=signin&type=exec" onclick="if(window.location.pathname.endsWith('index.html')||window.location.pathname==='/'||window.location.pathname.endsWith('/')){if(window.switchGatewayMode)window.switchGatewayMode('signin');if(window.switchSignInSubTab)window.switchSignInSubTab('exec');}" class="btn btn-primary" style="${isIdTheme ? 'background: linear-gradient(135deg, #FF9933 0%, #E67E22 50%, #138808 100%); box-shadow: 0 4px 20px rgba(255, 153, 51, 0.4);' : 'background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 100%);'}">
              <span>Executive Access Sign-In &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
  }

  removeMaintenanceOverlay() {
    const el = document.getElementById('id-maintenance-overlay');
    if (el) el.remove();
  }
}

// Global Singleton Instance
window.HyperNovaMaintenance = new SystemMaintenanceEngine();
