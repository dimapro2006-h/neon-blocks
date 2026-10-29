// Допоміжні функції малювання на canvas

// Прямокутник із закругленими кутами
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Робить колір світлішим (amount > 0) або темнішим (amount < 0).
// Результати кешуються, щоб не рахувати те саме щокадру.
const shadeCache = new Map();
function shade(hex, amount) {
  const key = hex + amount;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = v => Math.round(v + (target - v) * p);
  const result = `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
  shadeCache.set(key, result);
  return result;
}

// Один "кристалічний" блок розміром size×size
function drawBlock(ctx, x, y, size, color, alpha = 1) {
  const gap = Math.max(1, size * 0.05);
  const s = size - gap * 2;
  const r = size * 0.18;
  x += gap;
  y += gap;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Основа з градієнтом зверху вниз
  const grad = ctx.createLinearGradient(x, y, x, y + s);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(1, shade(color, -0.25));
  roundRectPath(ctx, x, y, s, s, r);
  ctx.fillStyle = grad;
  ctx.fill();

  // Світла рамка
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeStyle = shade(color, 0.55);
  ctx.stroke();

  // Відблиск у верхній частині — як грань кристала
  roundRectPath(ctx, x + s * 0.14, y + s * 0.1, s * 0.72, s * 0.3, r * 0.6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fill();

  ctx.restore();
}
