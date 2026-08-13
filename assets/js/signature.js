/**
 * HyperNova Technology - Canvas E-Signature Controller
 */

class SignaturePad {
  constructor(canvasElement, options = {}) {
    if (typeof canvasElement === 'string') {
      canvasElement = document.getElementById(canvasElement);
    }
    this.canvas = canvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.options = options;
    this.isDrawing = false;
    this.hasSignature = false;
    
    // Canvas sizing setup
    this.resizeCanvas();
    this.initEvents();
  }

  applyStyles() {
    this.ctx.strokeStyle = this.options.color || '#38bdf8';
    this.ctx.lineWidth = this.options.lineWidth || 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  resizeCanvas(preserveContent = true) {
    let savedData = null;
    if (preserveContent && this.hasSignature) {
      savedData = this.canvas.toDataURL('image/png');
    }

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 500;
    const height = rect.height || 180;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.applyStyles();

    if (savedData) {
      this.loadSignatureDataUrl(savedData);
    }
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
      const scaleX = rect.width ? (this.canvas.width / rect.width) : 1;
      const scaleY = rect.height ? (this.canvas.height / rect.height) : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.applyStyles();
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.hasSignature = true;
    };

    const endDraw = (e) => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.ctx.closePath();
      }
    };

    // Mouse Events
    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', endDraw);
    this.canvas.addEventListener('mouseleave', endDraw);

    // Touch Events
    this.canvas.addEventListener('touchstart', startDraw, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    this.canvas.addEventListener('touchend', endDraw, { passive: false });
  }

  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.hasSignature = false;
  }

  isEmpty() {
    return !this.hasSignature;
  }

  toDataURL() {
    return (this.canvas && this.hasSignature) ? this.canvas.toDataURL('image/png') : null;
  }

  getSignatureDataUrl() {
    if (!this.hasSignature) return null;
    return this.canvas.toDataURL('image/png');
  }

  loadTypedSignature(text) {
    this.clear();
    if (!text || !text.trim()) return;
    this.ctx.font = '32px "Caveat", "Dancing Script", cursive, sans-serif';
    this.ctx.fillStyle = this.options.color || '#38bdf8';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text.trim(), this.canvas.width / 2, this.canvas.height / 2);
    this.hasSignature = true;
  }

  loadSignatureDataUrl(dataUrl) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      this.clear();
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.hasSignature = true;
    };
    img.src = dataUrl;
  }
}

window.HyperNovaSignaturePad = SignaturePad;
