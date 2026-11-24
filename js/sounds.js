// ============ Sounds Module (Duolingo-Style) ============
const sounds = {
  ctx: null,
  enabled: true,

  init() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }

    // ✅ فك الحظر عن الصوت مع أول كليك في أي مكان في الصفحة
    document.addEventListener('click', () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }, { once: true });

    const settings = this.getSettings();
    this.enabled = settings.sound !== false;
  },

  getSettings() {
    try { return JSON.parse(localStorage.getItem('pylingo_settings') || '{}'); }
    catch { return {}; }
  },

  setEnabled(val) {
    this.enabled = val;
    const settings = this.getSettings();
    settings.sound = val;
    localStorage.setItem('pylingo_settings', JSON.stringify(settings));
    if (val && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playNote(frequency, duration = 0.15, volume = 0.25, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    
    // ✅ نتأكد إن الصوت شغال قبل ما ننفذ النغمة
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine'; 
      osc.frequency.value = frequency;
      
      const now = this.ctx.currentTime + delay;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Sound error:', e);
    }
  },

  playCorrect() {
    this.playNote(659.25, 0.12, 0.2, 0);
    this.playNote(783.99, 0.12, 0.2, 0.08);
    this.playNote(1046.50, 0.25, 0.25, 0.16);
  },

  playWrong() {
    this.playNote(493.88, 0.1, 0.2, 0);
    this.playNote(329.63, 0.2, 0.2, 0.1);
  },

  playComplete() {
    const notes = [
      [523.25, 0.15, 0],
      [659.25, 0.15, 0.12],
      [783.99, 0.35, 0.24],
    ];
    notes.forEach(([freq, dur, delay]) => this.playNote(freq, dur, 0.25, delay));
  },

  playClick() { this.playNote(1000, 0.03, 0.1, 0); },
  playSelect() { this.playNote(800, 0.04, 0.15, 0); },

  playLevelUp() {
    const notes = [
      [523.25, 0.1, 0],
      [659.25, 0.1, 0.08],
      [783.99, 0.1, 0.16],
      [1046.50, 0.4, 0.24],
    ];
    notes.forEach(([freq, dur, delay]) => this.playNote(freq, dur, 0.25, delay));
  },

  playError() {
    this.playNote(400, 0.15, 0.2, 0);
    this.playNote(300, 0.3, 0.2, 0.12);
  },

  playHeartLost() {
    this.playNote(523.25, 0.1, 0.2, 0);
    this.playNote(440, 0.1, 0.2, 0.08);
    this.playNote(349.23, 0.2, 0.2, 0.16);
  }
};

sounds.init();