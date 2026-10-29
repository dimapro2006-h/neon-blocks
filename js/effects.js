// Візуальні ефекти: "лопання" блоків, іскри, спливаючий текст, тряска екрана.
const POP_TIME = 0.35;   // скільки секунд зникає блок
const TEXT_TIME = 1.1;   // скільки секунд висить напис
const SHAKE_TIME = 0.25;

const effects = {
  pops: [],
  particles: [],
  texts: [],
  shakeT: 0,
  shakePower: 0,

  // cells: [{ x, y, color }] — координати верхнього лівого кута клітинки на canvas
  clearCells(cells, cellSize) {
    cells.forEach((c, i) => {
      // Невелика затримка для кожного наступного блока — виходить "хвиля"
      this.pops.push({ x: c.x, y: c.y, color: c.color, size: cellSize, t: -i * 0.012 });
      for (let k = 0; k < 3; k++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = cellSize * (2 + Math.random() * 4);
        this.particles.push({
          x: c.x + cellSize / 2,
          y: c.y + cellSize / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - cellSize * 2,
          gravity: cellSize * 14,
          life: 0.6 + Math.random() * 0.4,
          t: 0,
          color: c.color,
          size: cellSize * (0.12 + Math.random() * 0.15),
        });
      }
    });
  },

  text(str, x, y, color, size) {
    this.texts.push({ str, x, y, color, size, t: 0 });
  },

  shake(power) {
    this.shakePower = power;
    this.shakeT = SHAKE_TIME;
  },

  // dt — скільки секунд минуло з попереднього кадру
  update(dt) {
    this.pops.forEach(p => { p.t += dt; });
    this.pops = this.pops.filter(p => p.t < POP_TIME);

    this.particles.forEach(p => {
      p.t += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    this.particles = this.particles.filter(p => p.t < p.life);

    this.texts.forEach(t => { t.t += dt; });
    this.texts = this.texts.filter(t => t.t < TEXT_TIME);

    this.shakeT = Math.max(0, this.shakeT - dt);
  },

  shakeOffset() {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const p = this.shakePower * (this.shakeT / SHAKE_TIME);
    return { x: (Math.random() - 0.5) * p, y: (Math.random() - 0.5) * p };
  },

  // Блоки, що зникають: спершу спалах білим, потім зменшуються й тануть
  drawPops(ctx) {
    for (const p of this.pops) {
      if (p.t < 0) {
        drawBlock(ctx, p.x, p.y, p.size, p.color);
        continue;
      }
      const k = p.t / POP_TIME;
      const s = p.size * (1 - k * 0.7);
      const offset = (p.size - s) / 2;
      drawBlock(ctx, p.x + offset, p.y + offset, s, k < 0.3 ? '#ffffff' : p.color, 1 - k);
    }
  },

  // Іскри та написи малюємо поверх усього
  drawOverlay(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      const k = t.t / TEXT_TIME;
      const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.translate(t.x, t.y - k * t.size * 1.5);
      ctx.scale(scale, scale);
      ctx.font = `800 ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = t.size * 0.15;
      ctx.strokeStyle = 'rgba(10, 10, 30, 0.85)';
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  },
};
