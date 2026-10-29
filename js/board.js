// Поле — це двовимірний масив 8×8.
// null означає порожню клітинку, а рядок з кольором — зайняту.
const SIZE = 8;

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

// Чи можна поставити фігуру так, щоб її верхній лівий кут був у (row, col)?
function canPlace(board, piece, row, col) {
  for (const [r, c] of piece.cells) {
    const rr = row + r;
    const cc = col + c;
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return false; // виходить за поле
    if (board[rr][cc]) return false;                                 // клітинка зайнята
  }
  return true;
}

function placePiece(board, piece, row, col) {
  for (const [r, c] of piece.cells) {
    board[row + r][col + c] = piece.color;
  }
}

// Шукає повністю заповнені рядки та стовпці
function findFullLines(board) {
  const rows = [];
  const cols = [];
  for (let i = 0; i < SIZE; i++) {
    if (board[i].every(cell => cell)) rows.push(i);
    if (board.every(row => row[i])) cols.push(i);
  }
  return { rows, cols };
}

// Очищує лінії й повертає список очищених клітинок (для анімації).
// Клітинка на перетині рядка й стовпця потрапляє в список лише раз.
function clearLines(board, lines) {
  const cleared = [];
  const seen = new Set();
  const take = (r, c) => {
    const key = r * SIZE + c;
    if (seen.has(key)) return;
    seen.add(key);
    cleared.push({ row: r, col: c, color: board[r][c] });
  };
  lines.rows.forEach(r => { for (let c = 0; c < SIZE; c++) take(r, c); });
  lines.cols.forEach(c => { for (let r = 0; r < SIZE; r++) take(r, c); });
  cleared.forEach(({ row, col }) => { board[row][col] = null; });
  return cleared;
}

// Чи влазить фігура хоч кудись на поле?
function fitsAnywhere(board, piece) {
  for (let row = 0; row <= SIZE - piece.rows; row++) {
    for (let col = 0; col <= SIZE - piece.cols; col++) {
      if (canPlace(board, piece, row, col)) return true;
    }
  }
  return false;
}

// Які клітинки зникнуть, якщо поставити фігуру сюди? (для підсвітки)
// Повертає Set з номерами клітинок: row * SIZE + col.
function previewClears(board, piece, row, col) {
  const copy = board.map(r => r.slice());
  placePiece(copy, piece, row, col);
  const lines = findFullLines(copy);
  const result = new Set();
  lines.rows.forEach(r => { for (let c = 0; c < SIZE; c++) result.add(r * SIZE + c); });
  lines.cols.forEach(c => { for (let r = 0; r < SIZE; r++) result.add(r * SIZE + c); });
  return result;
}

function isBoardEmpty(board) {
  return board.every(row => row.every(cell => !cell));
}
