// ============ Sounds Module (Duolingo-Style) ============
// أصوات نظيفة و ناعمة تحاكي أسلوب Duolingo

const sounds = {
  ctx: null,
  enabled: true,

  init() {
    document.addEventListener('click', () => {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          console.log('🔊 Duolingo-style audio ready');
        } catch (e) {
          console.warn('⚠️ Audio not supported:', e);
        }
      }
    }, { once: true });

    const settings = this.getSettings();
    this.enabled = settings.sound !== false;
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('pylingo_settings') || '{}');
    } catch {
      return {};
    }
  },

  setEnabled(val) {
    this.enabled = val;
    const settings = this.getSettings();
    settings.sound = val;
    localStorage.setItem('pylingo_settings', JSON.stringify(settings));
  },

  // ============ Helper: Play Note (Sine wave = Duolingo) ============
  playNote(frequency, duration = 0.15, volume = 0.25, delay = 0) {
    if (!this.enabled || !this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';  // Sine = ناعم زي Duolingo
      osc.frequency.value = frequency;
      
      const now = this.ctx.currentTime + delay;
      
      // Fade in/out ناعم
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

  // ============ Correct: لحن صاعد ناعم ============
  playCorrect() {
    // E5 → G5 → C6 (زي "Tada!" خفيفة)
    this.playNote(659.25, 0.12, 0.2, 0);
    this.playNote(783.99, 0.12, 0.2, 0.08);
    this.playNote(1046.50, 0.25, 0.25, 0.16);
  },

  // ============ Wrong: نغمة هابطة قصيرة و ناعمة ============
  playWrong() {
    // B4 → E4 (خفيفة، مش مزعجة)
    this.playNote(493.88, 0.1, 0.2, 0);
    this.playNote(329.63, 0.2, 0.2, 0.1);
  },

  // ============ Complete: لحن احتفالي نظيف ============
  playComplete() {
    const notes = [
      [523.25, 0.15, 0],    // C5
      [659.25, 0.15, 0.12], // E5
      [783.99, 0.35, 0.24], // G5 (طويلة)
    ];
    notes.forEach(([freq, dur, delay]) => {
      this.playNote(freq, dur, 0.25, delay);
    });
  },

  // ============ Click: نقرة خفيفة جداً ============
  playClick() {
    this.playNote(1000, 0.03, 0.1, 0);
  },

  // ============ Select: نقرة إلكترونية خفيفة ============
  playSelect() {
    this.playNote(800, 0.04, 0.15, 0);
  },

  // ============ Level Up: لحن أطول ============
  playLevelUp() {
    const notes = [
      [523.25, 0.1, 0],
      [659.25, 0.1, 0.08],
      [783.99, 0.1, 0.16],
      [1046.50, 0.4, 0.24],  // C6 طويلة
    ];
    notes.forEach(([freq, dur, delay]) => {
      this.playNote(freq, dur, 0.25, delay);
    });
  },

  // ============ Error: نغمة هابطة أوضح ============
  playError() {
    this.playNote(400, 0.15, 0.2, 0);
    this.playNote(300, 0.3, 0.2, 0.12);
  },

  // ============ Heart Lost: تنازلي ناعم ============
  playHeartLost() {
    this.playNote(523.25, 0.1, 0.2, 0);
    this.playNote(440, 0.1, 0.2, 0.08);
    this.playNote(349.23, 0.2, 0.2, 0.16);
  }
};

sounds.init();