// Головний файл гри: стан, керування пальцем, очки, малювання кадру.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  hud: document.querySelector('.hud'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  combo: document.getElementById('combo'),
  overlay: document.getElementById('gameover'),
  finalScore: document.getElementById('final-score'),
  newBest: document.getElementById('new-best'),
  stats: document.getElementById('stats'),
  restart: document.getElementById('restart'),
  settingsBtn: document.getElementById('settings-btn'),
  settings: document.getElementById('settings'),
  settingsClose: document.getElementById('settings-close'),
  soundOn: document.getElementById('sound-on'),
  volume: document.getElementById('volume'),
  volumeValue: document.getElementById('volume-value'),
};

// Розміри та положення всього на canvas (перераховуються при зміні розміру вікна)
const layout = { width: 0, height: 0, pad: 0, cell: 0, trayY: 0, trayH: 0, trayCell: 0 };

const state = {
  board: null,
  tray: [],            // три фігури внизу; null — фігуру вже поставили
  score: 0,
  combo: 0,            // скільки ходів поспіль ми очищали лінії
  movesSinceClear: 0,  // комбо згорає після 3 ходів без очищення
  linesCleared: 0,
  bestCombo: 0,
  drag: null,          // фігура, яку зараз тягнемо
  over: false,
};

let stats = loadStats();

// ---------- Розміри ----------

function resize() {
  const availW = Math.min(window.innerWidth - 24, 480);
  const availH = window.innerHeight - ui.hud.offsetHeight - 36;
  const width = Math.floor(Math.min(availW, availH / 1.45));
  const height = Math.floor(width * 1.45);

  // devicePixelRatio робить картинку чіткою на екранах з високою щільністю пікселів
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ui.hud.style.width = width + 'px';

  layout.width = width;
  layout.height = height;
  layout.pad = width * 0.025;
  layout.cell = (width - layout.pad * 2) / SIZE;
  layout.trayY = width + width * 0.04;
  layout.trayH = height - layout.trayY;
  layout.trayCell = layout.cell * 0.5;
  state.drag = null;
}

// Координати клітинки поля на canvas
const cellX = col => layout.pad + col * layout.cell;
const cellY = row => layout.pad + row * layout.cell;

// ---------- Нова гра ----------

function newGame() {
  state.board = createBoard();
  state.score = 0;
  state.combo = 0;
  state.movesSinceClear = 0;
  state.linesCleared = 0;
  state.bestCombo = 0;
  state.drag = null;
  state.over = false;
  refillTray();
  ui.overlay.classList.add('hidden');
  updateHud();
}

// Видає три нові фігури. Пробуємо кілька разів, щоб хоча б одна влазила.
function refillTray() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const tray = [randomPiece(), randomPiece(), randomPiece()];
    if (tray.some(p => fitsAnywhere(state.board, p))) {
      state.tray = tray;
      return;
    }
  }
  state.tray = [makePiece(SHAPES[0]), randomPiece(), randomPiece()];
}

// ---------- Керування пальцем / мишкою ----------

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// Де зараз верхній лівий кут фігури, яку тягнемо
function dragOrigin(drag) {
  const w = drag.piece.cols * layout.cell;
  const h = drag.piece.rows * layout.cell;
  return { x: drag.x - w / 2, y: drag.y - h / 2 - drag.lift };
}

// Визначаємо, на яку клітинку поля "ляже" фігура
function updateDragTarget() {
  const drag = state.drag;
  const o = dragOrigin(drag);
  const col = Math.round((o.x - layout.pad) / layout.cell);
  const row = Math.round((o.y - layout.pad) / layout.cell);
  if (canPlace(state.board, drag.piece, row, col)) {
    drag.target = { row, col, clears: previewClears(state.board, drag.piece, row, col) };
  } else {
    drag.target = null;
  }
}

canvas.addEventListener('pointerdown', e => {
  sound.unlock();
  if (state.over) return;
  const p = pointerPos(e);
  if (p.y < layout.trayY) return;
  const slot = Math.min(2, Math.floor(p.x / (layout.width / 3)));
  const piece = state.tray[slot];
  if (!piece) return;

  canvas.setPointerCapture(e.pointerId);
  state.drag = {
    slot,
    piece,
    x: p.x,
    y: p.y,
    // На телефоні піднімаємо фігуру над пальцем, щоб її було видно
    lift: e.pointerType === 'mouse' ? 0 : layout.cell * 1.6,
    target: null,
  };
  sound.pickup();
  updateDragTarget();
});

canvas.addEventListener('pointermove', e => {
  if (!state.drag) return;
  const p = pointerPos(e);
  state.drag.x = p.x;
  state.drag.y = p.y;
  updateDragTarget();
});

function endDrag() {
  const drag = state.drag;
  state.drag = null;
  if (drag && drag.target) placeFromTray(drag.slot, drag.target.row, drag.target.col);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => { state.drag = null; });

// ---------- Хід: ставимо фігуру ----------

function placeFromTray(slot, row, col) {
  const piece = state.tray[slot];
  placePiece(state.board, piece, row, col);
  state.tray[slot] = null;

  let gained = piece.cells.length; // 1 очко за кожну клітинку
  sound.place();
  const lines = findFullLines(state.board);
  const count = lines.rows.length + lines.cols.length;

  if (count > 0) {
    state.combo++;
    state.movesSinceClear = 0;
    state.linesCleared += count;
    state.bestCombo = Math.max(state.bestCombo, state.combo);

    // 1 лінія = 10, 2 лінії = 40, 3 лінії = 90 ... і все це × комбо
    const lineScore = count * count * 10 * state.combo;
    gained += lineScore;

    const cleared = clearLines(state.board, lines);
    sound.clear(count, state.combo);
    effects.clearCells(cleared.map(c => ({ x: cellX(c.col), y: cellY(c.row), color: c.color })), layout.cell);

    // Напис з'являється в центрі очищених клітинок
    const cx = cleared.reduce((s, c) => s + cellX(c.col), 0) / cleared.length + layout.cell / 2;
    const cy = cleared.reduce((s, c) => s + cellY(c.row), 0) / cleared.length + layout.cell / 2;
    const tx = Math.min(Math.max(cx, layout.cell * 2), layout.width - layout.cell * 2);
    effects.text('+' + lineScore, tx, cy, '#ffffff', layout.cell * 0.7);
    if (state.combo > 1) {
      effects.text('Комбо x' + state.combo, tx, cy - layout.cell * 0.9, '#ffd166', layout.cell * 0.6);
    }

    if (isBoardEmpty(state.board)) {
      gained += 300;
      sound.perfect();
      effects.text('Чисте поле! +300', layout.width / 2, layout.width / 2, '#06d6a0', layout.cell * 0.65);
    }

    effects.shake(Math.min(4 + count * 2 + state.combo, 14));
    vibrate(count > 1 ? [30, 40, 30] : 25);
  } else {
    state.movesSinceClear++;
    if (state.movesSinceClear >= 3) state.combo = 0;
    vibrate(10);
  }

  state.score += gained;
  if (state.tray.every(p => !p)) refillTray();
  updateHud();

  // Якщо жодна з фігур, що лишилися, не влазить — кінець гри
  if (!state.tray.some(p => p && fitsAnywhere(state.board, p))) {
    state.over = true;
    setTimeout(endGame, 700);
  }
}

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* не підтримується */ }
}

// ---------- Інтерфейс ----------

let lastShownScore = 0;
function updateHud() {
  ui.score.textContent = state.score;
  ui.best.textContent = Math.max(stats.bestScore, state.score);
  ui.combo.textContent = state.combo > 1 ? 'x' + state.combo : '—';
  if (state.score !== lastShownScore) {
    // Перезапускаємо CSS-анімацію "підстрибування" числа
    ui.score.classList.remove('bump');
    void ui.score.offsetWidth;
    ui.score.classList.add('bump');
    lastShownScore = state.score;
  }
}

function endGame() {
  const isBest = state.score > stats.bestScore;
  stats.gamesPlayed++;
  stats.totalLines += state.linesCleared;
  stats.bestCombo = Math.max(stats.bestCombo, state.bestCombo);
  if (isBest) stats.bestScore = state.score;
  saveStats(stats);
  sound.gameOver();

  ui.finalScore.textContent = state.score;
  ui.newBest.classList.toggle('hidden', !isBest);
  ui.stats.innerHTML = [
    ['Рекорд', stats.bestScore],
    ['Ігор зіграно', stats.gamesPlayed],
    ['Ліній за гру', state.linesCleared],
    ['Найкраще комбо', 'x' + stats.bestCombo],
  ].map(([name, value]) => `<div class="stat"><b>${value}</b><span>${name}</span></div>`).join('');
  ui.overlay.classList.remove('hidden');
}

ui.restart.addEventListener('click', () => {
  sound.unlock();
  newGame();
});

// ---------- Налаштування ----------

// Показує в панелі поточні значення звуку
function updateSettingsUi() {
  const percent = Math.round(sound.volume * 100);
  ui.soundOn.checked = !sound.muted;
  ui.volume.value = percent;
  ui.volume.disabled = sound.muted;
  ui.volume.style.setProperty('--fill', percent + '%');
  ui.volumeValue.textContent = sound.muted ? 'вимк.' : percent + '%';
}

ui.settingsBtn.addEventListener('click', () => {
  sound.unlock();
  state.drag = null;
  updateSettingsUi();
  ui.settings.classList.remove('hidden');
});

ui.settingsClose.addEventListener('click', () => ui.settings.classList.add('hidden'));
// Натискання на темний фон поза панеллю теж закриває налаштування
ui.settings.addEventListener('click', e => {
  if (e.target === ui.settings) ui.settings.classList.add('hidden');
});

ui.soundOn.addEventListener('change', () => {
  sound.setMuted(!ui.soundOn.checked);
  updateSettingsUi();
  sound.place();
});

// 'input' спрацьовує під час руху повзунка, 'change' — коли відпустили
ui.volume.addEventListener('input', () => {
  sound.setVolume(ui.volume.value / 100);
  updateSettingsUi();
});
ui.volume.addEventListener('change', () => sound.clear(1, 1)); // зразок звуку для перевірки

// ---------- Малювання ----------

function drawPiece(piece, x, y, size, alpha) {
  for (const [r, c] of piece.cells) {
    drawBlock(ctx, x + c * size, y + r * size, size, piece.color, alpha);
  }
}

function draw() {
  const { width, height, pad, cell } = layout;
  const drag = state.drag;
  ctx.clearRect(0, 0, width, height);

  const shake = effects.shakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  // Фон поля
  const bg = ctx.createLinearGradient(0, 0, 0, width);
  bg.addColorStop(0, '#1a1f48');
  bg.addColorStop(1, '#11142f');
  roundRectPath(ctx, 0, 0, width, width, cell * 0.35);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(124, 92, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Клітинки. Ті, що зникнуть після ходу, підсвічуємо кольором фігури.
  const clears = drag && drag.target ? drag.target.clears : null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const color = state.board[r][c];
      if (color) {
        const highlighted = clears && clears.has(r * SIZE + c);
        drawBlock(ctx, cellX(c), cellY(r), cell, highlighted ? drag.piece.color : color);
      } else {
        roundRectPath(ctx, cellX(c) + cell * 0.06, cellY(r) + cell * 0.06, cell * 0.88, cell * 0.88, cell * 0.16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
        ctx.fill();
      }
    }
  }

  // "Тінь" — куди ляже фігура
  if (drag && drag.target) {
    drawPiece(drag.piece, cellX(drag.target.col), cellY(drag.target.row), cell, 0.35);
  }

  effects.drawPops(ctx);
  ctx.restore();

  // Три фігури внизу. Ті, що нікуди не влазять, напівпрозорі.
  const tc = layout.trayCell;
  state.tray.forEach((piece, i) => {
    if (!piece || (drag && drag.slot === i)) return;
    const cx = (width / 3) * (i + 0.5);
    const cy = layout.trayY + layout.trayH / 2;
    const alpha = fitsAnywhere(state.board, piece) ? 1 : 0.3;
    drawPiece(piece, cx - (piece.cols * tc) / 2, cy - (piece.rows * tc) / 2, tc, alpha);
  });

  // Фігура, яку тягнемо, — повного розміру
  if (drag) {
    const o = dragOrigin(drag);
    drawPiece(drag.piece, o.x, o.y, cell, 1);
  }

  effects.drawOverlay(ctx);
}

// ---------- Ігровий цикл ----------

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  effects.update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
newGame();
requestAnimationFrame(frame);
