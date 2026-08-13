/**
 * HyperNova Technology — 15th August Independence Day Theme & Remote IT Admin Engine
 * Features: Silk-waving Tricolor Flag animation, Floating Particles, Rotating Ashoka Chakra
 * (Cleaned: Music/Audio completely removed as requested)
 */

class IndependenceThemeEngine {
  constructor() {
    this.currentMode = 'independence_day';
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.wavePhase = 0;

    this.init();
  }

  async init() {
    let savedMode = localStorage.getItem('hypernova_theme_mode');
    
    if (!savedMode && window.HyperNovaStore) {
      try {
        const config = await window.HyperNovaStore.getDoc('settings', 'theme_config');
        if (config && config.mode) {
          savedMode = config.mode;
        }
      } catch (e) {
        console.warn('Could not read theme settings from store:', e);
      }
    }

    if (savedMode) {
      this.currentMode = savedMode;
    } else {
      this.currentMode = 'independence_day';
      localStorage.setItem('hypernova_theme_mode', 'independence_day');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.applyTheme());
    } else {
      this.applyTheme();
    }

    // Cross-tab and IT Admin real-time synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'hypernova_theme_mode' && e.newValue) {
        this.currentMode = e.newValue;
        this.applyTheme();
      }
    });

    window.addEventListener('hypernovaThemeChanged', (e) => {
      if (e.detail && e.detail.mode) {
        this.currentMode = e.detail.mode;
        this.applyTheme();
      }
    });

    // Cloud Firestore Realtime Sync Listener
    if (window.HyperNovaFB && window.HyperNovaFB.isLive && window.HyperNovaFB.db) {
      try {
        window.HyperNovaFB.db.collection('settings').doc('theme_config')
          .onSnapshot((doc) => {
            if (doc.exists && doc.data() && doc.data().mode) {
              const remoteMode = doc.data().mode;
              if (remoteMode !== this.currentMode) {
                this.currentMode = remoteMode;
                localStorage.setItem('hypernova_theme_mode', remoteMode);
                this.applyTheme();
              }
            }
          });
      } catch (e) {
        console.warn('Realtime theme Firestore listener warning:', e);
      }
    }
  }

  getMode() {
    return this.currentMode;
  }

  async setThemeMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('hypernova_theme_mode', mode);

    if (window.HyperNovaStore) {
      try {
        await window.HyperNovaStore.setDoc('settings', 'theme_config', {
          mode: mode,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to update theme_config doc in store:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('hypernovaThemeChanged', { detail: { mode } }));
    this.applyTheme();
  }

  applyTheme() {
    if (this.currentMode === 'independence_day') {
      document.body.classList.add('theme-independence-day');
      this.renderHeaderBanner();
      this.startFlagAnimation();
    } else {
      document.body.classList.remove('theme-independence-day');
      this.removeHeaderBanner();
      this.stopFlagAnimation();
    }
  }

  renderHeaderBanner() {
    if (document.getElementById('id-header-banner')) return;

    const bannerHtml = `
      <div id="id-header-banner" class="id-header-banner">
        <svg class="id-chakra-icon" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#0047AB" stroke-width="4"/>
          <circle cx="50" cy="50" r="8" fill="#0047AB"/>
          ${Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const rad = (angle * Math.PI) / 180;
            const x2 = 50 + 44 * Math.cos(rad);
            const y2 = 50 + 44 * Math.sin(rad);
            return `<line x1="50" y1="50" x2="${x2}" y2="${y2}" stroke="#0047AB" stroke-width="2"/>`;
          }).join('')}
        </svg>
        <span class="id-badge-tag">🇮🇳 15th August</span>
        <span>Celebrating <span class="id-tricolor-text">Happy 79th Independence Day</span> &bull; HyperNova Technology Gateway</span>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', bannerHtml);
  }

  removeHeaderBanner() {
    const el = document.getElementById('id-header-banner');
    if (el) el.remove();
  }

  startFlagAnimation() {
    let overlay = document.getElementById('id-flag-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'id-flag-overlay';
      overlay.className = 'id-flag-bg-overlay';

      overlay.innerHTML = `
        <canvas id="id-flag-canvas" class="id-flag-canvas"></canvas>
        <svg class="id-bg-chakra-wheel" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#0284c7" stroke-width="1.5" opacity="0.6"/>
          <circle cx="100" cy="100" r="85" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="100" cy="100" r="14" fill="none" stroke="#38bdf8" stroke-width="2"/>
          <circle cx="100" cy="100" r="4" fill="#38bdf8"/>
          ${Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const rad = (angle * Math.PI) / 180;
            const x2 = 100 + 85 * Math.cos(rad);
            const y2 = 100 + 85 * Math.sin(rad);
            return `<line x1="100" y1="100" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1" opacity="0.75"/>`;
          }).join('')}
        </svg>
      `;

      document.body.appendChild(overlay);
    }

    this.canvas = document.getElementById('id-flag-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', this.onResize = () => this.resizeCanvas());
      this.animateFlag();
    }
  }

  stopFlagAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    const overlay = document.getElementById('id-flag-overlay');
    if (overlay) overlay.remove();
    this.canvas = null;
    this.ctx = null;
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animateFlag() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);
    this.wavePhase += 0.022;

    const waveAmp = 38;
    const waveFreq = 0.0032;

    // 1. Indian Saffron Ribbon Wave
    this.ctx.fillStyle = 'rgba(255, 153, 51, 0.24)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    for (let x = 0; x <= w; x += 15) {
      const y = (h * 0.28) + Math.sin(x * waveFreq + this.wavePhase) * waveAmp;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(w, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // 2. Crisp White Ribbon Wave
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, (h * 0.28) + Math.sin(this.wavePhase) * waveAmp);
    for (let x = 0; x <= w; x += 15) {
      const y1 = (h * 0.28) + Math.sin(x * waveFreq + this.wavePhase) * waveAmp;
      this.ctx.lineTo(x, y1);
    }
    for (let x = w; x >= 0; x -= 15) {
      const y2 = (h * 0.65) + Math.sin(x * waveFreq + this.wavePhase + 0.6) * waveAmp;
      this.ctx.lineTo(x, y2);
    }
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Indian Emerald Green Ribbon Wave
    this.ctx.fillStyle = 'rgba(19, 136, 8, 0.24)';
    this.ctx.beginPath();
    for (let x = 0; x <= w; x += 15) {
      const y = (h * 0.65) + Math.sin(x * waveFreq + this.wavePhase + 0.6) * waveAmp;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(w, h);
    this.ctx.lineTo(0, h);
    this.ctx.closePath();
    this.ctx.fill();

    // Ambient Floating Tricolor Sparkles
    const particleColors = ['#FF9933', '#FFFFFF', '#138808', '#38BDF8'];
    for (let i = 0; i < 30; i++) {
      const px = (Math.sin(i * 77 + this.wavePhase * 0.4) * 0.5 + 0.5) * w;
      const py = (Math.cos(i * 44 + this.wavePhase * 0.3) * 0.5 + 0.5) * h;
      const pSize = (i % 3) + 1.8;

      this.ctx.fillStyle = particleColors[i % particleColors.length];
      this.ctx.globalAlpha = 0.6;
      this.ctx.beginPath();
      this.ctx.arc(px, py, pSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    this.animFrameId = requestAnimationFrame(() => this.animateFlag());
  }
}

// Global Singleton Instance
window.HyperNovaTheme = new IndependenceThemeEngine();
