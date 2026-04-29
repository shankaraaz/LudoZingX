// ===================== Ludo ZingX — COMPLETE GAME =====================
"use strict";

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

const COLORS = ["#2ECC71", "#3498DB", "#E74C3C", "#F1C40F"]; // Green, Blue, Red, Yellow
const COLOR_LIGHT = ["#a8e6c0", "#aac8f0", "#ffb3ae", "#fff0a0"];
const COLOR_NAMES = ["Green", "Blue", "Red", "Yellow"];
const COLOR_EMOJI = ["🟢", "🔵", "🔴", "🟡"];
const PLAYER_DARK = ["#1b5e20", "#0d47a1", "#b71c1c", "#f9a825"];

// ============================================================
// CORRECT STANDARD 52-CELL CLOCKWISE LUDO PATH [row, col]
// Players: 0=Green(TL) 1=Blue(TR) 2=Red(BR) 3=Yellow(BL)
// Entry: Green=0  Blue=13  Red=26  Yellow=39
// ============================================================
const LUDO_PATH = [
  // Green entry → RIGHT along row 6 (left arm, top lane)
  [6,1],[6,2],[6,3],[6,4],[6,5],        // 0-4
  // Turn UP along col 6 (top arm, left lane)
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],  // 5-10
  // Turn RIGHT along row 0 (top edge)
  [0,7],[0,8],                           // 11-12
  // Blue entry → DOWN along col 8 (top arm, right lane)
  [1,8],[2,8],[3,8],[4,8],[5,8],        // 13-17
  // Turn RIGHT along row 6 (right arm, top lane)
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18-23
  // Turn DOWN along col 14 (right edge)
  [7,14],[8,14],                         // 24-25
  // Red entry → LEFT along row 8 (right arm, bottom lane)
  [8,13],[8,12],[8,11],[8,10],[8,9],    // 26-30
  // Turn DOWN along col 8 (bottom arm, right lane)
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31-36
  // Turn LEFT along row 14 (bottom edge)
  [14,7],[14,6],                         // 37-38
  // Yellow entry → UP along col 6 (bottom arm, left lane)
  [13,6],[12,6],[11,6],[10,6],[9,6],    // 39-43
  // Turn LEFT along row 8 (left arm, bottom lane)
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],  // 44-49
  // Turn UP along col 0 (left edge)
  [7,0],[6,0],                           // 50-51
];

// ============================================================
// HOME STRETCH — 6 cells per player leading to centre [7,7]
// ============================================================
const HOME_STRETCH = [
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],         // Green: row=7, cols 1→6
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],         // Blue:  col=7, rows 1→6
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],     // Red:   row=7, cols 13→8
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],     // Yellow:col=7, rows 13→8
];

// Home-base token positions (4 per player)
const HOME_BASE = [
  [
    [2, 2],
    [2, 4],
    [4, 2],
    [4, 4],
  ],
  [
    [2, 10],
    [2, 12],
    [4, 10],
    [4, 12],
  ],
  [
    [10, 10],
    [10, 12],
    [12, 10],
    [12, 12],
  ],
  [
    [10, 2],
    [10, 4],
    [12, 2],
    [12, 4],
  ],
];

const ENTRY_IDX = [0, 13, 26, 39];
// Safe spots at path indices (non-entry mid-side stars + entries)
const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Pre-build O(1) lookup maps
const SAFE_CELLS = new Set();
SAFE_SPOTS.forEach((i) => {
  const [r, c] = LUDO_PATH[i];
  SAFE_CELLS.add(r + "," + c);
});

const ENTRY_CELLS = new Map();
ENTRY_IDX.forEach((pi, p) => {
  const [r, c] = LUDO_PATH[pi];
  ENTRY_CELLS.set(r + "," + c, p);
});

// Stretch cell set (for drawing coloured lanes)
const STRETCH_CELLS = new Map(); // "r,c" → player
HOME_STRETCH.forEach((cells, p) =>
  cells.forEach(([r, c]) => STRETCH_CELLS.set(r + "," + c, p)),
);

// Dice skin definitions
const SKIN_DEFS = [
  {
    face: "#e53935",
    dot: "#fff",
    border: "#b71c1c",
    top: "#ef9a9a",
    side: "#c62828",
  },
  {
    face: "#2e7d32",
    dot: "#ffd700",
    border: "#1b5e20",
    top: "#a5d6a7",
    side: "#1b5e20",
  },
  {
    face: "#1565c0",
    dot: "#e0e0e0",
    border: "#0d47a1",
    top: "#90caf9",
    side: "#0d47a1",
  },
  {
    face: "#e65100",
    dot: "#fff",
    border: "#bf360c",
    top: "#ffcc80",
    side: "#bf360c",
  },
];

const DOT_POS = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.28, 0.28],
    [0.5, 0.5],
    [0.72, 0.72],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.5, 0.5],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  6: [
    [0.28, 0.22],
    [0.72, 0.22],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.78],
    [0.72, 0.78],
  ],
};

// ---- GAME STATE ----
let activePlayers = [0, 1, 2, 3],
  currentPlayer = 0,
  tokens = [],
  diceValue = 0;
let rolling = false,
  waitingForMove = false,
  movableTokens = [],
  gameOver = false;
let selectedSkin = 2,
  unlockedSkins = [0, 2],
  currentMode = 4;
let rollAnimInterval = null;

// ---- POWERUPS ----
let hasShield = [false, false, false, false];
let shieldUsed = [false, false, false, false];

const PLAYER_SKIN_MAP = [1, 2, 0, 3]; // Green->1, Blue->2, Red->0, Yellow->3

function buyShield() {
  const p = currentPlayer;
  if (!activePlayers.includes(p)) return;
  if (shieldUsed[p]) {
    alert("Shield can only be used once per match!");
    return;
  }
  if (hasShield[p]) {
    alert("Shield is already active!");
    return;
  }
  const coins = getCoins();
  if (coins < 50) {
    alert("Not enough coins! You need 50 coins.");
    openModal("storeModal");
    return;
  }
  setCoins(coins - 50);
  hasShield[p] = true;
  shieldUsed[p] = true;
  setStatus(`Shield Activated for ${COLOR_NAMES[p]}!`);
  drawBoard();
  
  // Update button state visually
  const btn = document.getElementById("shieldBtn");
  if (btn) btn.classList.add("active-shield");
}

// ---- COINS ----
function getCoins() {
  return parseInt(localStorage.getItem("ludoCoins") || "0");
}
function setCoins(n) {
  localStorage.setItem("ludoCoins", n);
  document
    .querySelectorAll("#topCoins,#menuCoins,#storeCoins")
    .forEach((el) => {
      if (el) el.textContent = n;
    });
}
function addCoins(n) {
  setCoins(getCoins() + n);
}
function loadUnlockedSkins() {
  try {
    unlockedSkins = JSON.parse(localStorage.getItem("unlockedSkins") || "[0]");
  } catch (e) {
    unlockedSkins = [0];
  }
}
function saveUnlockedSkins() {
  localStorage.setItem("unlockedSkins", JSON.stringify(unlockedSkins));
}

// ---- SOUNDS ----
const sndShake = new Audio("sound/Picking_up_and_shaking.mp3");
const sndReveal = new Audio("sound/dice_revealing number,_.mp3");
const sndKill = new Audio("sound/cut the plyar goti.mp3");
sndShake.preload = "auto";
sndReveal.preload = "auto";
sndKill.preload = "auto";
function playShake() {
  try {
    sndShake.currentTime = 0;
    sndShake.play().catch(() => {});
  } catch (e) {}
}
function playReveal() {
  try {
    sndReveal.currentTime = 0;
    sndReveal.play().catch(() => {});
  } catch (e) {}
}
function playKill() {
  try {
    sndKill.currentTime = 0;
    sndKill.play().catch(() => {});
  } catch (e) {}
}

// ---- CANVAS ----
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const diceCanvas = document.getElementById("diceCanvas");
const dctx = diceCanvas.getContext("2d");

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const sz = Math.min(
    wrap.clientWidth,
    Math.floor(window.innerHeight * 0.56),
    500,
  );
  canvas.width = sz;
  canvas.height = sz;
  drawBoard();
}
window.addEventListener("resize", resizeCanvas);

function cs() {
  return canvas.width / 15;
}
// Pixel-perfect cell origin (snapped to nearest pixel)
function cellX(c) { return Math.round(c * cs()); }
function cellY(r) { return Math.round(r * cs()); }
function cellW() { return cellX(1); } // width = snapped 1-cell
function cellCenter(r, c) {
  const w = cellW();
  return { x: cellX(c) + w / 2, y: cellY(r) + w / 2 };
}

// ---- BOARD DRAWING ----
function drawBoard() {
  const s = cs(),
    W = canvas.width;
  ctx.clearRect(0, 0, W, W);

  // Board background (tan/wood color like real Ludo)
  ctx.fillStyle = "#F5E6C8";
  ctx.fillRect(0, 0, W, W);

  // Outer border
  ctx.strokeStyle = "#2C2C2C";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, W - 3);

  // Draw all 15x15 cell FILLS (no borders yet)
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) drawCell(r, c, s);

  // Home stretch lane FILLS
  drawStretches(s);

  // Single-pass uniform grid lines (eliminates double-stroke at shared edges)
  drawGrid(s);

  // Center star
  drawCenterStar(s);

  // Corner houses
  drawHouse(0, 0, 0, s);   // Green (TL)
  drawHouse(0, 9, 1, s);   // Blue (TR)
  drawHouse(9, 9, 2, s);   // Red (BR)
  drawHouse(9, 0, 3, s);   // Yellow (BL)

  // Markings (Arrows, Start text)
  drawMarkings(s);

  // Tokens — only draw for active players
  for (let p of activePlayers) {
    for (let t = 0; t < 4; t++) {
      drawToken(p, t, s);
    }
  }
  // Highlight movable tokens (selection-ready affordance)
  if (waitingForMove) {
    const hw = cellW();
    movableTokens.forEach(({ p, t }) => {
      const pos = getTokenPos(p, t);
      if (!pos) return;
      // Glow fill behind ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, hw * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,215,0,0.15)";
      ctx.fill();
      // Gold selection ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, hw * 0.44, 0, Math.PI * 2);
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = hw * 0.08;
      ctx.stroke();
      // Outer pulsing ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, hw * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,215,0,0.35)";
      ctx.lineWidth = hw * 0.04;
      ctx.stroke();
    });
  }
}

function drawCell(r, c, s) {
  const x = cellX(c),
    y = cellY(r),
    w = cellW();
  const cx = x + w / 2,
    cy = y + w / 2;

  // Track cell — light beige background (FILL ONLY, no border)
  ctx.fillStyle = "#F5E6C8";
  ctx.fillRect(x, y, w, w);

  // Safe spots (stars)
  const cellKey = r + "," + c;
  const isSafe = SAFE_CELLS.has(cellKey);
  const entryP = ENTRY_CELLS.has(cellKey) ? ENTRY_CELLS.get(cellKey) : -1;

  if (isSafe && entryP < 0) {
    // Glow halo behind the star
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,215,0,0.18)";
    ctx.fill();
    // Star
    drawStarShape(ctx, cx, cy, w * 0.44, 5, "#FFD700", 1);
    ctx.strokeStyle = "#5C4A00";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Entry cells — colored with white star (FILL ONLY)
  if (entryP >= 0) {
    ctx.fillStyle = COLORS[entryP];
    ctx.fillRect(x, y, w, w);
    drawStarShape(ctx, cx, cy, w * 0.44, 5, "#fff", 1);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // NO per-cell strokeRect — grid drawn in single pass by drawGrid()
}

// Single-pass grid: draws 16 horizontal + 16 vertical lines across the board
// This guarantees every shared edge is only stroked ONCE (no doubling)
function drawGrid(s) {
  const W = canvas.width;
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 15; i++) {
    const pos = cellX(i); // same as cellY(i) since square
    // Horizontal line
    ctx.moveTo(0, pos + 0.5);
    ctx.lineTo(W, pos + 0.5);
    // Vertical line
    ctx.moveTo(pos + 0.5, 0);
    ctx.lineTo(pos + 0.5, W);
  }
  ctx.stroke();
}

function drawStretches(s) {
  const w = cellW();
  // FILL ONLY — no per-cell borders (grid drawn by drawGrid)
  // Green: row=7, cols 1-6
  for (let c = 1; c <= 6; c++) {
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(cellX(c), cellY(7), w, w);
  }
  // Blue: col=7, rows 1-6
  for (let r = 1; r <= 6; r++) {
    ctx.fillStyle = COLORS[1];
    ctx.fillRect(cellX(7), cellY(r), w, w);
  }
  // Red: row=7, cols 8-13
  for (let c = 8; c <= 13; c++) {
    ctx.fillStyle = COLORS[2];
    ctx.fillRect(cellX(c), cellY(7), w, w);
  }
  // Yellow: col=7, rows 8-13
  for (let r = 8; r <= 13; r++) {
    ctx.fillStyle = COLORS[3];
    ctx.fillRect(cellX(7), cellY(r), w, w);
  }
}

function drawHouse(r, c, p, s) {
  const x = cellX(c), y = cellY(r);
  const sz = cellX(c + 6) - x; // exact 6-cell width
  const hcx = x + sz / 2, hcy = y + sz / 2;

  // Beige background for house area (always opaque to hide grid lines)
  ctx.fillStyle = "#F5E6C8";
  ctx.fillRect(x, y, sz, sz);

  const isActive = activePlayers.includes(p);

  if (!isActive) {
    ctx.save();
    ctx.globalAlpha = 0.4;
  }

  // Large player-color circle
  ctx.beginPath();
  ctx.arc(hcx, hcy, sz * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = COLORS[p];
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner ring — adds structural polish
  ctx.beginPath();
  ctx.arc(hcx, hcy, sz * 0.38, 0, Math.PI * 2);
  ctx.strokeStyle = PLAYER_DARK[p];
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4 token slots — tighter towards center
  const slotR = sz * 0.115;
  const SLOT_OFFSETS = [
    [0.35, 0.35], [0.65, 0.35],
    [0.35, 0.65], [0.65, 0.65]
  ];
  SLOT_OFFSETS.forEach(off => {
    const scx = x + sz * off[0];
    const scy = y + sz * off[1];

    // Shadow ring (recessed look)
    ctx.beginPath();
    ctx.arc(scx, scy, slotR + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill();

    // Slot fill
    const slotGrad = ctx.createRadialGradient(
      scx - slotR * 0.2, scy - slotR * 0.2, slotR * 0.1,
      scx, scy, slotR
    );
    slotGrad.addColorStop(0, "#FFF8EC");
    slotGrad.addColorStop(1, "#E0CDA8");
    ctx.beginPath();
    ctx.arc(scx, scy, slotR, 0, Math.PI * 2);
    ctx.fillStyle = slotGrad;
    ctx.fill();
    ctx.strokeStyle = "#5C4A32";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  if (!isActive) {
    ctx.restore();
    
    // Grey overlay to mute colors further
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x, y, sz, sz);
    
    // Lock icon in the center to clearly indicate "Not Active"
    ctx.font = `${sz * 0.3}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Drop shadow for the lock to make it pop over the house
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText("🔒", hcx, hcy);
    ctx.shadowColor = "transparent"; // reset shadow
  }

  // House outline (always opaque)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
}

function drawMarkings(s) {
  // Intentionally empty — clean board without START/arrow clutter
}

function drawCenterStar(s) {
  // Use integer grid coordinates for perfect alignment
  const ox = cellX(6),  oy = cellY(6);
  const w3 = cellX(9) - ox;            // exact 3-cell width
  const cx = ox + w3 / 2,  cy = oy + w3 / 2;

  // 4 triangles converging at center
  // Top (Blue)
  ctx.fillStyle = COLORS[1];
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + w3, oy); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  // Right (Red)
  ctx.fillStyle = COLORS[2];
  ctx.beginPath(); ctx.moveTo(ox + w3, oy); ctx.lineTo(ox + w3, oy + w3); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  // Bottom (Yellow)
  ctx.fillStyle = COLORS[3];
  ctx.beginPath(); ctx.moveTo(ox + w3, oy + w3); ctx.lineTo(ox, oy + w3); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  // Left (Green)
  ctx.fillStyle = COLORS[0];
  ctx.beginPath(); ctx.moveTo(ox, oy + w3); ctx.lineTo(ox, oy); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();

  // Crisp boundary lines
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + w3, oy + w3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + w3, oy); ctx.lineTo(ox, oy + w3); ctx.stroke();
  ctx.strokeRect(ox + 0.5, oy + 0.5, w3 - 1, w3 - 1);

  // Inner HOME circle — perfectly centered
  const circR = Math.round(cellW() * 0.62);
  ctx.beginPath();
  ctx.arc(cx, cy, circR, 0, Math.PI * 2);
  ctx.fillStyle = "#F5E6C8";
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.font = `bold ${Math.round(cellW() * 0.36)}px "Inter","Roboto",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HOME", cx, cy);
}

function drawStarShape(context, cx, cy, radius, points, color, alpha) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const a = (i * Math.PI) / points - Math.PI / 2;
    i === 0
      ? context.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      : context.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  context.closePath();
  context.fill();
  context.restore();
}

// ---- TOKEN POSITION ----
// Slot offsets must match drawHouse SLOT_OFFSETS exactly
const _SLOT_OFFS = [
  [0.35, 0.35], [0.65, 0.35],
  [0.35, 0.65], [0.65, 0.65]
];
// House origins [row, col] for each player
const _HOUSE_ORIGIN = [[0,0],[0,9],[9,9],[9,0]];

function getTokenPos(p, t) {
  const tok = tokens[p][t];
  if (tok.phase === "home") {
    // Compute pixel position matching the white slot center
    const [hr, hc] = _HOUSE_ORIGIN[p];
    const hx = cellX(hc), hy = cellY(hr);
    const sz = cellX(hc + 6) - hx;
    const off = _SLOT_OFFS[t];
    return { x: hx + sz * off[0], y: hy + sz * off[1] };
  }
  if (tok.phase === "track") {
    const abs = (ENTRY_IDX[p] + tok.idx) % 52;
    const [r, c] = LUDO_PATH[abs];
    return cellCenter(r, c);
  }
  if (tok.phase === "stretch") {
    if (tok.idx > 5) return null;
    const [r, c] = HOME_STRETCH[p][tok.idx];
    return cellCenter(r, c);
  }
  return null; // done
}

// ---- FLAT GLOSSY 2D PAWN DRAWING ----
let hoveredToken = null;

function drawToken(p, t, s) {
  const tok = tokens[p][t];
  if (tok.phase === "done") return;
  const pos = getTokenPos(p, t);
  if (!pos) return;
  const { x, y } = pos;
  const w = cellW();
  
  // Use size: 48px - 64px approx by scaling based on cell size
  const sc = tok.phase === "home" ? w * 0.85 : w * 1.15;
  
  // Proportions
  const baseRimW = sc * 0.45;
  const baseRimH = sc * 0.16;
  const baseBot = y + sc * 0.25;
  const baseTop = baseBot - sc * 0.45;
  const baseW = sc * 0.35;
  const headR = sc * 0.28;
  const headCy = baseTop;

  // Hover effect
  const isHovered = (hoveredToken && hoveredToken.p === p && hoveredToken.t === t);
  const isMovable = waitingForMove && movableTokens.some(mt => mt.p === p && mt.t === t);

  ctx.save();
  ctx.translate(x, y);
  if (isHovered && isMovable) {
    ctx.scale(1.15, 1.15); // Small hover scale effect
  }
  ctx.translate(-x, -y);

  const mainCol = COLORS[p];
  const darkCol = PLAYER_DARK[p];

  // 1. BASE SHADOW (Soft flat oval underneath)
  ctx.beginPath();
  ctx.ellipse(x, baseBot + sc * 0.06, baseRimW * 1.1, baseRimH * 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fill();

  // 2. FLAT BASE RIM (Darker oval)
  ctx.beginPath();
  ctx.ellipse(x, baseBot, baseRimW, baseRimH, 0, 0, Math.PI * 2);
  ctx.fillStyle = darkCol;
  ctx.fill();

  // 3. CONE BODY
  ctx.beginPath();
  ctx.moveTo(x - sc * 0.07, baseTop); 
  ctx.lineTo(x + sc * 0.07, baseTop); 
  ctx.lineTo(x + baseW, baseBot);     
  ctx.quadraticCurveTo(x, baseBot + baseRimH * 0.6, x - baseW, baseBot); 
  ctx.closePath();
  ctx.fillStyle = mainCol;
  ctx.fill();

  // 3a. Cone Body Shadow (Left half vector style)
  ctx.beginPath();
  ctx.moveTo(x - sc * 0.07, baseTop);
  ctx.lineTo(x, baseTop);
  ctx.lineTo(x, baseBot + baseRimH * 0.6); // Center line down
  ctx.quadraticCurveTo(x - baseW * 0.5, baseBot + baseRimH * 0.5, x - baseW, baseBot);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // 4. BODY HIGHLIGHT (Top-Right shine on cone)
  ctx.beginPath();
  ctx.moveTo(x, baseTop);
  ctx.lineTo(x + sc * 0.07, baseTop);
  ctx.lineTo(x + baseW * 0.7, baseBot - sc * 0.05);
  ctx.quadraticCurveTo(x + baseW * 0.35, baseBot + baseRimH * 0.2, x, baseBot - sc * 0.15);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();

  // 5. ROUND HEAD
  ctx.beginPath();
  ctx.arc(x, headCy, headR, 0, Math.PI * 2);
  ctx.fillStyle = mainCol;
  ctx.fill();

  // 5a. Head Shadow (Left side semi-circle)
  ctx.beginPath();
  ctx.arc(x, headCy, headR, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // 6. HEAD HIGHLIGHT (Top-Right glossy curve)
  ctx.beginPath();
  ctx.arc(x, headCy, headR * 0.75, Math.PI * 1.55, Math.PI * 1.95);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = sc * 0.09;
  ctx.lineCap = "round";
  ctx.stroke();
  
  // Extra glossy dot top-right
  ctx.beginPath();
  ctx.arc(x + headR * 0.45, headCy - headR * 0.55, sc * 0.035, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  // 7. SHIELD AURA
  if (hasShield[p] && tok.phase !== "done") {
    ctx.beginPath();
    ctx.ellipse(x, headCy + headR * 0.5, sc * 0.7, sc * 0.85, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#5DADE2";
    ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.stroke();
    ctx.fillStyle = "rgba(93, 173, 226, 0.25)";
    ctx.fill();
  }

  ctx.restore();
}

// ---- DICE DRAWING ----
function drawDice(value, skin) {
  const s = SKIN_DEFS[skin] || SKIN_DEFS[0];
  const W = diceCanvas.width; // uses actual canvas size
  dctx.clearRect(0, 0, W, W);

  // Scale proportionally to canvas size
  const scale = W / 90;
  const faceSize = Math.round(56 * scale),
    ox = Math.round(8 * scale),
    oy = Math.round(18 * scale),
    depth = Math.round(18 * scale);

  // Right side
  dctx.beginPath();
  dctx.moveTo(ox + faceSize, oy);
  dctx.lineTo(ox + faceSize + depth, oy - depth * 0.55);
  dctx.lineTo(ox + faceSize + depth, oy + faceSize - depth * 0.55);
  dctx.lineTo(ox + faceSize, oy + faceSize);
  dctx.closePath();
  dctx.fillStyle = s.side;
  dctx.fill();
  dctx.strokeStyle = s.border;
  dctx.lineWidth = 1.5 * scale;
  dctx.stroke();

  // Top face
  dctx.beginPath();
  dctx.moveTo(ox, oy);
  dctx.lineTo(ox + faceSize, oy);
  dctx.lineTo(ox + faceSize + depth, oy - depth * 0.55);
  dctx.lineTo(ox + depth, oy - depth * 0.55);
  dctx.closePath();
  dctx.fillStyle = s.top;
  dctx.fill();
  dctx.strokeStyle = s.border;
  dctx.lineWidth = 1.5 * scale;
  dctx.stroke();

  // Front face
  dctx.beginPath();
  dctx.roundRect(ox, oy, faceSize, faceSize, 8 * scale);
  dctx.fillStyle = s.face;
  dctx.fill();
  dctx.strokeStyle = s.border;
  dctx.lineWidth = 2 * scale;
  dctx.stroke();

  // Dots
  const dots = DOT_POS[value] || DOT_POS[1];
  const dotR = 4.5 * scale;
  dots.forEach(([dx, dy]) => {
    const px = ox + dx * faceSize,
      py = oy + dy * faceSize;
    dctx.beginPath();
    dctx.arc(px + scale, py + scale, dotR, 0, Math.PI * 2);
    dctx.fillStyle = "rgba(0,0,0,0.3)";
    dctx.fill();
    dctx.beginPath();
    dctx.arc(px, py, dotR, 0, Math.PI * 2);
    dctx.fillStyle = s.dot;
    dctx.fill();
    dctx.beginPath();
    dctx.arc(px - 1.2 * scale, py - 1.2 * scale, dotR * 0.38, 0, Math.PI * 2);
    dctx.fillStyle = "rgba(255,255,255,0.55)";
    dctx.fill();
  });
}

// ---- GAME INIT ----
function startGame(n) {
  currentMode = n;
  if (n === 1 || n === 2) {
    activePlayers = [0, 2];
  } else if (n === 3) {
    activePlayers = [0, 1, 2];
  } else {
    activePlayers = [0, 1, 2, 3];
  }
  currentPlayer = activePlayers[0];
  gameOver = false;
  rolling = false;
  waitingForMove = false;
  movableTokens = [];
  diceValue = 0;

  tokens = [];
  finishOrder = [];
  hasShield = [false, false, false, false];
  shieldUsed = [false, false, false, false];
  
  const shieldBtn = document.getElementById("shieldBtn");
  if (shieldBtn) shieldBtn.classList.remove("active-shield");

  for (let p = 0; p < 4; p++) {
    tokens.push([
      { phase: "home", idx: 0 },
      { phase: "home", idx: 0 },
      { phase: "home", idx: 0 },
      { phase: "home", idx: 0 },
    ]);
  }

  closeModal("modeModal");
  document.getElementById("gameHub").style.display = "flex";
  buildPlayerTabs();
  resizeCanvas();
  setCoins(getCoins()); // refresh display
  setStatus("Roll the dice!");
  enableRoll(true);
  drawDice(1, PLAYER_SKIN_MAP[currentPlayer]);

  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
}

// Track finish order
let finishOrder = [];

function buildPlayerTabs() {
  const tabs = document.getElementById("playerTabs");
  // Wipe completely and rebuild - ONLY active players
  while (tabs.firstChild) tabs.removeChild(tabs.firstChild);

  // Adjust grid to show only active players
  tabs.style.gridTemplateColumns = `repeat(${activePlayers.length}, 1fr)`;

  for (let p of activePlayers) {
    const div = document.createElement("div");
    div.className = "pcard" + (p === currentPlayer ? " active" : "");
    div.id = "ptab" + p;
    div.style.background = COLORS[p] + "22";
    div.style.opacity = p === currentPlayer ? "1" : "0.65";
    div.innerHTML =
      `<div class="pcard-badge" style="background:${COLORS[p]}"></div>` +
      `<div class="pcard-info">` +
        `<span class="pcard-name">${COLOR_NAMES[p]}</span>` +
        `<span class="pcard-turn">Your Turn</span>` +
      `</div>` +
      `<span class="pcard-score" id="pscore${p}">0/4</span>`;
    tabs.appendChild(div);
  }
}

function updatePlayerTabs() {
  for (let p of activePlayers) {
    const tab = document.getElementById("ptab" + p);
    if (!tab) continue;
    const rank = finishOrder.indexOf(p);
    const rankBadge = rank >= 0 ? ["🥇", "🥈", "🥉", "4️⃣"][rank] : "";
    const isCurrent = p === currentPlayer;
    tab.className = "pcard" + (isCurrent ? " active" : "");
    tab.style.opacity = isCurrent ? "1" : "0.65";
    tab.style.borderColor = isCurrent ? "#E8C96B" : "transparent";
    const done = tokens[p].filter((t) => t.phase === "done").length;
    const sc = document.getElementById("pscore" + p);
    if (sc) sc.textContent = rankBadge || done + "/4";
  }
}

function setStatus(msg) {
  const el = document.getElementById("statusMsg");
  if (el) el.textContent = msg;
}

function enableRoll(on) {
  const btn = document.getElementById("rollBtn");
  if (btn) {
    btn.disabled = !on;
  }
}

// ---- DICE ROLL ----
function onRollClick() {
  if (rolling || waitingForMove || gameOver) return;
  rolling = true;
  enableRoll(false);
  playShake();

  const wrap = document.getElementById("diceWrap");
  wrap.classList.add("dice-rolling");

  rollAnimInterval = setInterval(() => {
    drawDice(Math.ceil(Math.random() * 6), PLAYER_SKIN_MAP[currentPlayer]);
  }, 55);

  setTimeout(() => {
    clearInterval(rollAnimInterval);
    wrap.classList.remove("dice-rolling");
    diceValue = Math.ceil(Math.random() * 6);
    drawDice(diceValue, PLAYER_SKIN_MAP[currentPlayer]);
    playReveal();
    rolling = false;
    handleDiceResult(diceValue);
  }, 600);
}

function handleDiceResult(val) {
  setStatus(`${COLOR_NAMES[currentPlayer]} rolled ${val}`);
  movableTokens = getMovableTokens(currentPlayer, val);

  if (movableTokens.length === 0) {
    setStatus(`${COLOR_NAMES[currentPlayer]} rolled ${val} — no moves!`);
    setTimeout(() => nextTurn(val === 6), 900);
    return;
  }

  if (movableTokens.length === 1) {
    setTimeout(() => moveToken(currentPlayer, movableTokens[0].t, val), 350);
    return;
  }

  // AI or human
  if (currentMode === 1 && currentPlayer !== 0) {
    setTimeout(() => aiMove(val), 650);
  } else {
    waitingForMove = true;
    setStatus(`${COLOR_NAMES[currentPlayer]}: tap a token!`);
    drawBoard();
  }
}

// ---- MOVABLE TOKENS ----
function getMovableTokens(p, val) {
  const result = [];
  for (let t = 0; t < 4; t++) {
    const tok = tokens[p][t];
    if (tok.phase === "done") continue;
    if (tok.phase === "home") {
      if (val === 6) result.push({ p, t });
      continue;
    }
    if (tok.phase === "track") {
      const ni = tok.idx + val;
      if (ni < 52) result.push({ p, t });
      else if (ni - 52 <= 5) result.push({ p, t });
      continue;
    }
    if (tok.phase === "stretch") {
      if (tok.idx < 5) result.push({ p, t });
    }
  }
  return result;
}

// ---- MOVE TOKEN ----
function moveToken(p, t, val) {
  waitingForMove = false;
  const tok = tokens[p][t];

  if (tok.phase === "home") {
    tok.phase = "track";
    tok.idx = 0;
  } else if (tok.phase === "track") {
    const ni = tok.idx + val;
    if (ni >= 52) {
      const si = ni - 52;
      tok.phase = "stretch";
      tok.idx = si;
      if (si > 5) {
        tok.phase = "done";
        tok.idx = 5;
      }
    } else {
      tok.idx = ni;
      checkKill(p, t);
    }
  } else if (tok.phase === "stretch") {
    tok.idx += val;
    if (tok.idx > 5) {
      tok.phase = "done";
      tok.idx = 5;
    }
  }

  drawBoard();
  updatePlayerTabs();

  if (checkFinish(p)) return;
  setTimeout(() => nextTurn(val === 6), 300);
}

function checkKill(p, t) {
  const tok = tokens[p][t];
  if (tok.phase !== "track") return;
  const abs = (ENTRY_IDX[p] + tok.idx) % 52;
  if (SAFE_SPOTS.has(abs)) return;
  for (let op of activePlayers) {
    if (op === p) continue;
    for (let ot = 0; ot < 4; ot++) {
      const otok = tokens[op][ot];
      if (otok.phase !== "track") continue;
      if ((ENTRY_IDX[op] + otok.idx) % 52 === abs) {
        if (hasShield[op]) {
          // Shield absorbs the kill!
          hasShield[op] = false;
          setStatus(`${COLOR_EMOJI[op]} Shield Blocked the Kill!`);
          
          if (op === 0) {
            const btn = document.getElementById("shieldBtn");
            if (btn) btn.classList.remove("active-shield");
          }
          return; // The kill is completely neutralized
        }
        
        otok.phase = "home";
        otok.idx = 0;
        playKill();
        setStatus(`${COLOR_EMOJI[p]} killed ${COLOR_EMOJI[op]}!`);
      }
    }
  }
}

// ---- TURN MANAGEMENT ----
function nextTurn(extraRoll) {
  if (gameOver) return;
  if (extraRoll) {
    setStatus(`${COLOR_NAMES[currentPlayer]} gets another roll!`);
    enableRoll(true);
    drawBoard();
    return;
  }
  let idx = activePlayers.indexOf(currentPlayer);
  let next = activePlayers[(idx + 1) % activePlayers.length];
  let tries = 0;
  while (
    tokens[next].every((tk) => tk.phase === "done") &&
    tries < activePlayers.length
  ) {
    idx = (idx + 1) % activePlayers.length;
    next = activePlayers[idx];
    tries++;
  }
  currentPlayer = next;
  updatePlayerTabs();
  setStatus(`${COLOR_NAMES[currentPlayer]}'s turn — Roll!`);
  enableRoll(true);
  drawBoard();
  drawDice(diceValue || 1, PLAYER_SKIN_MAP[currentPlayer]);

  if (currentMode === 1 && currentPlayer !== activePlayers[0]) {
    enableRoll(false);
    setTimeout(() => aiRoll(), 900);
  }
}

// ---- AI ----
function aiRoll() {
  if (gameOver) return;
  rolling = true;
  playShake();
  const wrap = document.getElementById("diceWrap");
  wrap.classList.add("dice-rolling");
  rollAnimInterval = setInterval(
    () => drawDice(Math.ceil(Math.random() * 6), PLAYER_SKIN_MAP[currentPlayer]),
    55,
  );
  setTimeout(() => {
    clearInterval(rollAnimInterval);
    wrap.classList.remove("dice-rolling");
    diceValue = Math.ceil(Math.random() * 6);
    drawDice(diceValue, PLAYER_SKIN_MAP[currentPlayer]);
    playReveal();
    rolling = false;
    setStatus(`${COLOR_NAMES[currentPlayer]} (AI) rolled ${diceValue}`);
    const movable = getMovableTokens(currentPlayer, diceValue);
    if (movable.length === 0) {
      setTimeout(() => nextTurn(diceValue === 6), 800);
    } else {
      setTimeout(() => aiMove(diceValue), 650);
    }
  }, 600);
}

function aiMove(val) {
  const p = currentPlayer;
  const movable = getMovableTokens(p, val);
  if (!movable.length) {
    nextTurn(val === 6);
    return;
  }

  let chosen = movable[0];

  // Priority 1: kill
  outer: for (const { p: pp, t } of movable) {
    const tok = tokens[pp][t];
    if (tok.phase !== "track") continue;
    const newAbs = (ENTRY_IDX[pp] + tok.idx + val) % 52;
    if (SAFE_SPOTS.has(newAbs)) continue;
    for (let op of activePlayers) {
      if (op === pp) continue;
      for (let ot = 0; ot < 4; ot++) {
        const otok = tokens[op][ot];
        if (
          otok.phase === "track" &&
          (ENTRY_IDX[op] + otok.idx) % 52 === newAbs
        ) {
          chosen = { p: pp, t };
          break outer;
        }
      }
    }
  }

  // Priority 2: advance furthest token
  let maxP = -1;
  for (const { p: pp, t } of movable) {
    const tok = tokens[pp][t];
    const prog = tok.phase === "stretch" ? 52 + tok.idx : tok.idx;
    if (prog > maxP) {
      maxP = prog;
      chosen = { p: pp, t };
    }
  }

  // Priority 3: bring out on 6
  if (val === 6 && maxP < 8) {
    const h = movable.find(({ p: pp, t }) => tokens[pp][t].phase === "home");
    if (h) chosen = h;
  }

  moveToken(chosen.p, chosen.t, val);
}

// ---- CANVAS CLICK ----
function handleCanvasInput(mx, my) {
  if (!waitingForMove) return;
  const s = cellW();
  for (const { p, t } of movableTokens) {
    const pos = getTokenPos(p, t);
    if (!pos) continue;
    if (Math.hypot(mx - pos.x, my - pos.y) < s * 0.5) {
      moveToken(p, t, diceValue);
      return;
    }
  }
}

canvas.addEventListener("mousemove", (e) => {
  if (!waitingForMove) {
    if (hoveredToken) {
      hoveredToken = null;
      canvas.style.cursor = "default";
      drawBoard();
    }
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top) * sy;
  const s = cellW();
  
  let found = null;
  for (const { p, t } of movableTokens) {
    const pos = getTokenPos(p, t);
    if (!pos) continue;
    if (Math.hypot(mx - pos.x, my - pos.y) < s * 0.6) {
      found = { p, t };
      break;
    }
  }
  
  if (hoveredToken?.p !== found?.p || hoveredToken?.t !== found?.t) {
    hoveredToken = found;
    canvas.style.cursor = found ? "pointer" : "default";
    drawBoard();
  }
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width,
    sy = canvas.height / rect.height;
  handleCanvasInput((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width,
      sy = canvas.height / rect.height;
    const touch = e.touches[0];
    handleCanvasInput(
      (touch.clientX - rect.left) * sx,
      (touch.clientY - rect.top) * sy,
    );
  },
  { passive: false },
);

// ---- WIN / FINISH ORDER ----
function checkFinish(p) {
  if (
    tokens[p].every((tk) => tk.phase === "done") &&
    !finishOrder.includes(p)
  ) {
    finishOrder.push(p);
    updatePlayerTabs();
    // All active players finished?
    if (finishOrder.length >= activePlayers.length - 1) {
      setTimeout(() => showWin(), 400);
      return true;
    }
    // First place — show mini toast
    if (finishOrder.length === 1) {
      setStatus(`🏆 ${COLOR_EMOJI[p]} ${COLOR_NAMES[p]} finished 1st!`);
    }
  }
  return false;
}

function showWin() {
  gameOver = true;
  enableRoll(false);
  addCoins(50);
  setCoins(getCoins());
  // Build ranked result
  const ranks = ["🥇", "🥈", "🥉", "4️⃣"];
  let html = "";
  finishOrder.forEach((p, i) => {
    html += `<div class="rank-row" style="color:${COLORS[p]}">${ranks[i]} ${COLOR_EMOJI[p]} ${COLOR_NAMES[p]}</div>`;
  });
  document.getElementById("winTitle").innerHTML =
    html ||
    `${COLOR_EMOJI[finishOrder[0]]} ${COLOR_NAMES[finishOrder[0]]} Wins!`;
  openModal("winModal");
  try {
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "none";
    ad.setAttribute("data-ad-client", "ca-pub-3940256099942544");
    ad.setAttribute("data-ad-slot", "1033173712");
    ad.setAttribute("data-ad-format", "interstitial");
    document.body.appendChild(ad);
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
}

// ---- NAVIGATION ----
function backToMenu() {
  closeModal("winModal");
  document.getElementById("gameHub").style.display = "none";
  openModal("modeModal");
  setCoins(getCoins());
}

function restartSameMode() {
  closeModal("winModal");
  startGame(currentMode);
}

// ---- MODALS ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  if (id === "storeModal") {
    setCoins(getCoins());
    renderDiceSkins();
  }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

// ---- COIN STORE ----
function watchAd() {
  addCoins(10);
  setCoins(getCoins());
  alert("Ad watched! +10 coins added 🪙");
  try {
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "none";
    ad.setAttribute("data-ad-client", "ca-pub-3940256099942544");
    ad.setAttribute("data-ad-slot", "1033173712");
    ad.setAttribute("data-ad-format", "interstitial");
    document.body.appendChild(ad);
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
}

function buyCoins500() {
  alert("In-app purchase — coming soon! 💰");
}

function buyDiceSkin(skinIdx) {
  if (skinIdx === undefined) {
    openModal("storeModal");
    return;
  }
  if (unlockedSkins.includes(skinIdx)) {
    selectedSkin = skinIdx;
    saveUnlockedSkins();
    renderDiceSkins();
    drawDice(diceValue || 1, selectedSkin);
    return;
  }
  if (getCoins() < 50) {
    alert("Not enough coins! Watch ads to earn more.");
    return;
  }
  addCoins(-50);
  setCoins(getCoins());
  unlockedSkins.push(skinIdx);
  saveUnlockedSkins();
  selectedSkin = skinIdx;
  renderDiceSkins();
  drawDice(diceValue || 1, selectedSkin);
  alert("Dice skin unlocked! 🎲");
}

function renderDiceSkins() {
  const row = document.getElementById("diceSkinRow");
  if (!row) return;
  row.innerHTML = "";
  ["Classic", "Forest", "Ocean", "Ember"].forEach((name, i) => {
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 48;
    c.style.cssText = `border-radius:10px;cursor:pointer;border:2px solid ${i === selectedSkin ? "#ffd700" : "#555"};box-shadow:${i === selectedSkin ? "0 0 8px #ffd700" : "none"};`;
    c.title = name + (unlockedSkins.includes(i) ? "" : " (50🪙)");
    const cx = c.getContext("2d");
    const sk = SKIN_DEFS[i];
    cx.fillStyle = sk.face;
    cx.beginPath();
    cx.roundRect(3, 3, 42, 42, 7);
    cx.fill();
    cx.strokeStyle = sk.border;
    cx.lineWidth = 2;
    cx.stroke();
    [
      [0.28, 0.28],
      [0.5, 0.5],
      [0.72, 0.72],
    ].forEach(([dx, dy]) => {
      cx.beginPath();
      cx.arc(3 + dx * 42, 3 + dy * 42, 4, 0, Math.PI * 2);
      cx.fillStyle = sk.dot;
      cx.fill();
    });
    if (!unlockedSkins.includes(i)) {
      cx.fillStyle = "rgba(0,0,0,.55)";
      cx.beginPath();
      cx.roundRect(3, 3, 42, 42, 7);
      cx.fill();
      cx.fillStyle = "#ffd700";
      cx.font = "bold 10px sans-serif";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText("50🪙", 24, 24);
    }
    c.addEventListener("click", () => buyDiceSkin(i));
    row.appendChild(c);
  });
}

// ---- FIRST LAUNCH REWARD ----
function startWelcomeVideo() {
  const btn = document.getElementById("welcomeClaimBtn");
  const container = document.getElementById("welcomeVideoContainer");
  const progress = document.getElementById("welcomeVideoProgress");
  if (!btn || !container || !progress) return;

  btn.style.display = "none";
  container.style.display = "flex";
  
  let p = 0;
  const interval = setInterval(() => {
    p += 2;
    progress.style.width = p + "%";
    if (p >= 100) {
      clearInterval(interval);
      addCoins(10);
      localStorage.setItem("welcomeClaimed", "true");
      alert("Welcome Bonus! 10 coins added 🪙");
      closeModal("welcomeRewardModal");
      openModal("modeModal");
    }
  }, 50);
}

// ---- INIT ----
window.addEventListener("DOMContentLoaded", () => {
  loadUnlockedSkins();
  setCoins(getCoins());
  drawDice(1, selectedSkin);
  
  if (!localStorage.getItem("welcomeClaimed")) {
    openModal("welcomeRewardModal");
  } else {
    openModal("modeModal");
  }
  
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
});

// Expose globals
window.startGame = startGame;
window.onRollClick = onRollClick;
window.watchAd = watchAd;
window.buyCoins500 = buyCoins500;
window.buyDiceSkin = buyDiceSkin;
window.openModal = openModal;
window.closeModal = closeModal;
window.backToMenu = backToMenu;
window.restartSameMode = restartSameMode;
window.buyShield = buyShield;
window.openCoinStore = () => openModal("storeModal");
window.startWelcomeVideo = startWelcomeVideo;
