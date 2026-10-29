// Рекорд і статистика зберігаються в localStorage — пам'яті браузера на телефоні.
// try/catch потрібен, бо в приватному режимі сховище може бути недоступне.
const STATS_KEY = 'neonBlocks.stats';
const DEFAULT_STATS = { bestScore: 0, gamesPlayed: 0, totalLines: 0, bestCombo: 0 };

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return Object.assign({}, DEFAULT_STATS, JSON.parse(raw));
  } catch (e) { /* сховище недоступне — починаємо з нуля */ }
  return Object.assign({}, DEFAULT_STATS);
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) { /* не вдалося зберегти — гра однаково працює */ }
}

// Окремі налаштування (наприклад, чи вимкнено звук)
function loadSetting(name, fallback) {
  try {
    const raw = localStorage.getItem('neonBlocks.' + name);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) { /* сховище недоступне */ }
  return fallback;
}

function saveSetting(name, value) {
  try {
    localStorage.setItem('neonBlocks.' + name, JSON.stringify(value));
  } catch (e) { /* не вдалося зберегти */ }
}
