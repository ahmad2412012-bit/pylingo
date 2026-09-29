// ============ Particles Background ============
// نقط صغيرة بتطفو في الخلفية

const particles = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  colors: [],

  init() {
    this.canvas = document.getElementById('particles-canvas');
    if (!this.canvas) {
      console.warn('⚠️ Particles canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    this.animate();

    // Update على الـ resize
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });

    // تحديث الألوان عند تغيير الـ theme
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-option') || e.target.closest('#dark-mode-toggle')) {
        setTimeout(() => this.updateColors(), 100);
      }
    });

    console.log('✨ Particles started');
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  updateColors() {
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary').trim() || '#58CC02';
    const secondary = styles.getPropertyValue('--secondary').trim() || '#1CB0F6';
    const purple = styles.getPropertyValue('--purple').trim() || '#CE82FF';
    
    this.colors = [primary, secondary, purple];
    
    // حدّث ألوان الـ particles الموجودة
    this.particles.forEach(p => {
      p.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    });
  },

  createParticles() {
    this.updateColors();
    
    // عدد النقط حسب حجم الشاشة
    const count = Math.min(60, Math.floor(window.innerWidth / 25));
    
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02
      });
    }
  },

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;

      // Pulse effect
      p.pulse += p.pulseSpeed;
      const pulseFactor = 1 + Math.sin(p.pulse) * 0.3;

      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * pulseFactor, 0, Math.PI * 2);
      this.ctx.fillStyle = this.hexToRgba(p.color, p.opacity);
      this.ctx.fill();
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  },

  hexToRgba(hex, alpha) {
    // لو اللون مش hex كامل
    if (!hex.startsWith('#')) return `rgba(88, 204, 2, ${alpha})`;
    
    // دعم #RGB و #RRGGBB
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
};

// ✅ Auto init
window.addEventListener('DOMContentLoaded', () => {
  particles.init();
});