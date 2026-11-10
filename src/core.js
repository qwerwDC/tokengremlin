// Ядро: холст, ввод, ассеты, рисование в «пэинт»-стиле
export const canvas = document.getElementById("c");
export const ctx = canvas.getContext("2d");
export const V = { W: 960, H: 540, k: 1, T: 0 };
export const TOUCH = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function resize() {
  const r = innerWidth / innerHeight;
  V.H = 540;
  V.W = Math.round(clamp(540 * r, 760, 1200));
  const scale = Math.min(innerWidth / V.W, innerHeight / V.H);
  const k = Math.min(2.2, scale * (devicePixelRatio || 1));
  V.k = k;
  canvas.width = Math.round(V.W * k);
  canvas.height = Math.round(V.H * k);
  canvas.style.width = Math.round(V.W * scale) + "px";
  canvas.style.height = Math.round(V.H * scale) + "px";
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

// ---------------------------------------------------------------- ассеты
export const A = { img: {}, atlas: {} };
const IMGS = ["hero", "herocut", "grem", "enemy", "boss", "tiles", "items", "ui", "faces",
  "room_gremlin", "room_hero", "vortex", "bg_timeline", "bg_waitlist", "bg_gpu", "bg_halluc", "bg_arena", "bg_vault", "ending", "cover"];
export async function loadAssets(onProgress) {
  const fonts = [new FontFace("Hand", "url(assets/fonts/hand.woff2)"), new FontFace("Bang", "url(assets/fonts/bangers.woff2)")];
  let done = 0;
  const total = IMGS.length + 3;
  const tick = () => onProgress && onProgress(++done / total);
  const p = [
    fetch("assets/atlas.json").then((r) => r.json()).then((j) => { A.atlas = j; tick(); }),
    ...fonts.map((f) => f.load().then((ff) => { document.fonts.add(ff); tick(); }).catch(tick)),
    ...IMGS.map((n) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { A.img[n] = im; tick(); res(); };
      im.onerror = () => { tick(); res(); };
      im.src = "assets/" + n + ".webp";
    })),
  ];
  await Promise.all(p);
}

// Спрайт из атласа. anchor: "foot" (низ, центр головы) | "center"
export function spr(atlas, name, x, y, o = {}) {
  const f = A.atlas[atlas] && A.atlas[atlas][name];
  const im = A.img[atlas];
  if (!f || !im) return;
  const s = o.scale ?? 1;
  const [sx, sy, w, h, ax] = f;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip) ctx.scale(-1, 1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const sw = o.sw ?? 1, sh = o.sh ?? 1;
  let dx, dy;
  if (o.anchor === "center") { dx = -w / 2; dy = -h / 2; }
  else if (o.anchor === "top") { dx = -w / 2; dy = 0; }
  else { dx = -ax; dy = -h; }
  ctx.scale(s * sw, s * sh);
  const cut = o.cutH ? Math.min(h, o.cutH) : h;
  ctx.drawImage(im, sx, sy, w, cut, dx, dy, w, cut);
  ctx.restore();
}
export const frameSize = (atlas, name) => { const f = A.atlas[atlas] && A.atlas[atlas][name]; return f ? [f[2], f[3]] : [0, 0]; };

// Картинка на весь экран «cover»
export function cover(img, zoom = 1, ox = 0, oy = 0, alpha = 1) {
  if (!img) return { s: 1, x: 0, y: 0 };
  const s = Math.max(V.W / img.width, V.H / img.height) * zoom;
  const w = img.width * s, h = img.height * s;
  const x = (V.W - w) / 2 + ox, y = (V.H - h) / 2 + oy;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, w, h);
  ctx.globalAlpha = 1;
  return { s, x, y, w, h };
}

// ---------------------------------------------------------------- текст
export function txt(str, x, y, o = {}) {
  const size = o.size || 22;
  ctx.font = `${size}px ${o.font || "Hand"}, "Comic Sans MS", cursive`;
  ctx.textAlign = o.align || "center";
  ctx.textBaseline = o.base || "middle";
  const lines = o.maxW ? wrap(String(str), o.maxW) : String(str).split("\n");
  const lh = size * (o.lh || 1.15);
  let yy = y - (o.vcenter ? ((lines.length - 1) * lh) / 2 : 0);
  for (const l of lines) {
    if (o.stroke !== 0) {
      ctx.lineJoin = "round";
      ctx.lineWidth = o.stroke ?? Math.max(3, size / 6);
      ctx.strokeStyle = o.strokeColor || "#000";
      ctx.strokeText(l, x, yy);
    }
    ctx.fillStyle = o.color || "#fff";
    ctx.fillText(l, x, yy);
    yy += lh;
  }
  return lines.length * lh;
}
export function wrap(str, maxW) {
  const out = [];
  for (const para of str.split("\n")) {
    let line = "";
    for (const w of para.split(" ")) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
      else line = t;
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------- «дрожащие» линии как в пэинте
export function wob(seed, i) { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v) - 0.5; }
export function wobRect(x, y, w, h, fill, o = {}) {
  const seed = (o.seed ?? 1) + (o.boil ? Math.floor(V.T * 7) : 0);
  const j = o.jit ?? 2.5;
  const pts = [];
  const seg = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + wob(seed, pts.length) * j, lerp(y0, y1, t) + wob(seed + 7, pts.length) * j]); } };
  const nx = Math.max(2, Math.round(w / 40)), ny = Math.max(2, Math.round(h / 40));
  seg(x, y, x + w, y, nx); seg(x + w, y, x + w, y + h, ny); seg(x + w, y + h, x, y + h, nx); seg(x, y + h, x, y, ny);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  if (o.shadow) { ctx.save(); ctx.translate(5, 6); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(); ctx.restore(); }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (o.line !== 0) { ctx.lineWidth = o.line || 4; ctx.strokeStyle = o.stroke || "#111"; ctx.lineJoin = "round"; ctx.stroke(); }
}
export function wobLine(x0, y0, x1, y1, color = "#111", w = 4, seed = 1) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 30));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n; const px = lerp(x0, x1, t) + wob(seed, i) * 2.5, py = lerp(y0, y1, t) + wob(seed + 3, i) * 2.5; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.stroke();
}

// ---------------------------------------------------------------- ввод
const KEYMAP = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Space: "jump", KeyZ: "attack", KeyJ: "attack", KeyX: "dash", KeyK: "dash", ShiftLeft: "dash", ShiftRight: "dash",
  Enter: "confirm", Escape: "pause", KeyP: "pause", KeyM: "mute",
};
const held = new Set(), pressedNow = new Set();
export const I = {
  down: (a) => held.has(a) || touchHeld.has(a),
  pressed: (a) => pressedNow.has(a),
  any: () => pressedNow.size > 0,
  tap: null, // последний тап по экрану {x,y}
  endFrame() { pressedNow.clear(); I.tap = null; },
  reset() { held.clear(); touchHeld.clear(); pressedNow.clear(); },
  showPad: TOUCH,
};
addEventListener("keydown", (e) => {
  const a = KEYMAP[e.code];
  if (!a) return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (!held.has(a)) pressedNow.add(a);
  held.add(a);
  if (a === "jump" || a === "attack") pressedNow.add("confirm");
});
addEventListener("keyup", (e) => { const a = KEYMAP[e.code]; if (a) held.delete(a); });
addEventListener("blur", () => I.reset());

// Сенсорные кнопки
const touchHeld = new Set();
const pointers = new Map();
export const PAD = () => {
  const r = 46, by = V.H - 66;
  return [
    { a: "left", x: 70, y: by, r, label: "◀" },
    { a: "right", x: 175, y: by, r, label: "▶" },
    { a: "jump", x: V.W - 75, y: by - 6, r: 54, label: "JUMP" },
    { a: "attack", x: V.W - 185, y: by + 8, r: 42, label: "HIT" },
    { a: "dash", x: V.W - 110, y: by - 118, r: 38, label: "DASH" },
    { a: "down", x: V.W - 220, y: by - 88, r: 34, label: "▼" },
  ];
};
export function toV(e) { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * V.W, ((e.clientY - r.top) / r.height) * V.H]; }
function padHit(x, y) { if (!I.padOn) return null; for (const b of PAD()) if (Math.hypot(x - b.x, y - b.y) < b.r + 14) return b.a; return null; }
function refreshTouch() { touchHeld.clear(); for (const a of pointers.values()) if (a) touchHeld.add(a); }
canvas.addEventListener("pointerdown", (e) => {
  const [x, y] = toV(e);
  const a = padHit(x, y);
  pointers.set(e.pointerId, a);
  if (a) { pressedNow.add(a); if (a === "jump") pressedNow.add("confirm"); }
  else I.tap = { x, y };
  refreshTouch();
  if (e.pointerType === "touch") I.showPad = true;
});
canvas.addEventListener("pointermove", (e) => {
  const [mx, my] = toV(e); I.mouse = { x: mx, y: my };
  if (!pointers.has(e.pointerId) || !pointers.get(e.pointerId)) return;
  const [x, y] = toV(e);
  const a = padHit(x, y);
  if (a && a !== pointers.get(e.pointerId)) { pointers.set(e.pointerId, a); pressedNow.add(a); refreshTouch(); }
});
const up = (e) => { pointers.delete(e.pointerId); refreshTouch(); };
canvas.addEventListener("pointerup", up);
canvas.addEventListener("pointercancel", up);

export function drawPad() {
  if (!I.padOn || !I.showPad) return;
  for (const b of PAD()) {
    const on = touchHeld.has(b.a);
    ctx.globalAlpha = on ? 0.75 : 0.42;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7);
    ctx.fillStyle = on ? "#ffe14a" : "#fff"; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#111"; ctx.stroke();
    ctx.globalAlpha = on ? 1 : 0.8;
    txt(b.label, b.x, b.y + 1, { size: b.label.length > 2 ? 17 : 26, color: "#111", stroke: 0, font: "Bang" });
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- сохранение
export const save = {
  get(k, d) { try { const v = localStorage.getItem("tg." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tg." + k, JSON.stringify(v)); } catch {} },
};
