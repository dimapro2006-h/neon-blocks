// Звуки створюємо прямо в коді через Web Audio API — без жодних звукових файлів.
// Кожен звук — це одна або кілька коротких нот (осциляторів) із плавним затуханням.

// Ноти пентатоніки: будь-які з них звучать гарно разом, тож мелодії не "фальшивлять"
const PENTATONIC = [0, 2, 4, 7, 9];

// Номер ноти → кількість півтонів від До (C5)
function scaleStep(i) {
  return Math.floor(i / PENTATONIC.length) * 12 + PENTATONIC[i % PENTATONIC.length];
}

// Півтони → частота в герцах
function noteFreq(semitones) {
  return 523.25 * Math.pow(2, semitones / 12);
}

const sound = {
  ctx: null,
  master: null,
  muted: loadSetting('muted', false),
  volume: loadSetting('volume', 0.7),   // від 0 до 1

  // Браузери дозволяють звук лише після дотику користувача,
  // тому аудіо вмикаємо при першому натисканні на екран
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  // Загальна гучність: усі ноти проходять через master, тож міняємо лише його
  applyVolume() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  },

  setMuted(muted) {
    this.muted = muted;
    saveSetting('muted', muted);
    this.applyVolume();
  },

  setVolume(volume) {
    this.volume = volume;
    saveSetting('volume', volume);
    this.applyVolume();
  },

  // Одна нота: частота, коли почати (сек від "зараз"), тривалість, тип хвилі, гучність
  tone(freq, start, duration, { type = 'sine', volume = 0.2, slideTo = null } = {}) {
    if (!this.ctx || this.muted || this.volume <= 0) return;
    const t = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    // Швидкий наростання й плавне затухання — щоб не було клацань
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  },

  // Взяли фігуру
  pickup() {
    this.tone(880, 0, 0.05, { type: 'triangle', volume: 0.08 });
  },

  // Поставили фігуру — м'який "тук"
  place() {
    this.tone(260, 0, 0.12, { type: 'triangle', volume: 0.3, slideTo: 150 });
    this.tone(1200, 0, 0.03, { type: 'square', volume: 0.025 });
  },

  // Очистили лінії. Більше ліній — довша мелодія.
  // Кожне комбо поспіль піднімає мелодію на ступінь вище — серія "росте".
  clear(lines, combo) {
    const base = Math.min(combo - 1, 8);
    const notes = Math.min(2 + lines, 6);
    const step = 0.055;
    for (let i = 0; i < notes; i++) {
      this.tone(noteFreq(scaleStep(base + i)), i * step, 0.28, { type: 'triangle', volume: 0.2 });
    }
    // Дзвіночок наприкінці
    this.tone(noteFreq(scaleStep(base + notes) + 12), notes * step, 0.4, { volume: 0.1 });

    // Серія: акорд, який стає гучнішим і яскравішим із кожним комбо
    if (combo >= 2) {
      const t = notes * step + 0.04;
      const root = scaleStep(base) + 12;
      const power = Math.min(combo, 6);
      [0, 4, 7, 12].forEach(interval => {
        this.tone(noteFreq(root + interval), t, 0.45 + power * 0.05, { volume: 0.05 + power * 0.012 });
        this.tone(noteFreq(root + interval), t, 0.3, { type: 'square', volume: 0.012 + power * 0.004 });
      });
    }
  },

  // Повністю очищене поле — швидкий підйом на дві октави
  perfect() {
    for (let i = 0; i < 10; i++) {
      this.tone(noteFreq(scaleStep(i)), 0.35 + i * 0.045, 0.3, { type: 'triangle', volume: 0.15 });
    }
  },

  // Кінець гри — мелодія вниз
  gameOver() {
    [7, 4, 0, -5].forEach((s, i) => {
      this.tone(noteFreq(s - 12), i * 0.16, 0.35, { type: 'triangle', volume: 0.22 });
    });
  },
};
