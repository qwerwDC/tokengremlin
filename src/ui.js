// Интерфейс: диалоги с портретами, лента постов, всплывашки
import { ctx, V, I, spr, txt, wobRect, wrap, clamp, easeOut, A } from "./core.js";
import { audio } from "./audio.js";

// ---------------------------------------------------------------- диалоги
const WHO = {
  g: { name: "Token Gremlin", tag: "@TokenGremlin", col: "#8a3fd1" },
  h: { name: "You", tag: "@CacheCrow", col: "#d92a2a" },
  o: { name: "OMNI", tag: "@OMNI_official", col: "#222" },
  s: { name: "", tag: "", col: "#444" },
};
export const dialog = {
  q: [], cur: null, t: 0, shown: 0, top: false,
  say(who, face, text, o = {}) { this.q.push({ who, face, text, dur: o.dur ?? 1.6 + text.length * 0.045, block: !!o.block }); return this; },
  clear() { this.q = []; this.cur = null; },
  get busy() { return !!this.cur || this.q.length > 0; },
  get blocking() { return this.cur && this.cur.block; },
  update(dt) {
    if (!this.cur && this.q.length) { this.cur = this.q.shift(); this.t = 0; this.shown = 0; }
    const c = this.cur;
    if (!c) return;
    this.t += dt;
    const before = Math.floor(this.shown);
    this.shown = Math.min(c.text.length, this.shown + dt * 48);
    if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0 && c.text[Math.floor(this.shown)] !== " ") audio.blip(c.who);
    const done = this.shown >= c.text.length;
    if (c.block) {
      if (I.pressed("confirm") || I.tap) { if (!done) this.shown = c.text.length; else this.cur = null; }
    } else if (done && this.t > c.dur) this.cur = null;
  },
  draw() {
    const c = this.cur;
    if (!c) return;
    const w = this.top ? Math.min(V.W - 200, 680) : Math.min(V.W - 40, 760), h = 112;
    const x = this.top ? V.W - w - 16 : (V.W - w) / 2, y = this.top ? 92 : V.H - h - 16;
    const pop = easeOut(clamp(this.t / 0.18, 0, 1));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop); ctx.translate(-x - w / 2, -y - h / 2);
    ctx.globalAlpha = pop;
    wobRect(x, y, w, h, "#fffdf3", { seed: 5, boil: true, shadow: true });
    const W = WHO[c.who];
    let tx = x + 22;
    if (c.face) {
      wobRect(x + 12, y + 10, 92, 92, c.who === "o" ? "#3a1010" : "#e9e3ff", { seed: 9, boil: true, line: 3 });
      ctx.save(); ctx.beginPath(); ctx.rect(x + 14, y + 12, 88, 88); ctx.clip();
      if (c.who === "o") spr("boss", c.face, x + 58, y + 58, { anchor: "center", scale: 0.42 });
      else spr("faces", c.face, x + 58, y + 58, { anchor: "center", scale: 0.47 });
      ctx.restore();
      tx = x + 120;
    }
    if (W.name) {
      txt(W.name, tx, y + 22, { size: 22, font: "Bang", color: W.col, stroke: 0, align: "left" });
      ctx.font = "22px Bang"; const nw = ctx.measureText(W.name).width;
      txt(W.tag, tx + nw + 10, y + 23, { size: 17, color: "#777", stroke: 0, align: "left" });
    }
    txt(c.text.slice(0, Math.floor(this.shown)), tx, y + (W.name ? 50 : 34), { size: 22, color: "#151515", stroke: 0, align: "left", maxW: x + w - tx - 18, lh: 1.05, base: "top" });
    if (c.block && this.shown >= c.text.length) txt("▶", x + w - 24, y + h - 20 + Math.sin(V.T * 8) * 3, { size: 20, color: "#d92a2a", stroke: 0 });
    ctx.restore();
  },
};

// ---------------------------------------------------------------- лента в стиле соцсети (своя иконка, без чужих логотипов)
export const PEOPLE = {
  gremlin: { name: "Token Gremlin", handle: "@TokenGremlin", face: "g_happy", badge: true },
  gremlinScared: { name: "Token Gremlin", handle: "@TokenGremlin", face: "g_scream", badge: true },
  gremlinHappy: { name: "Token Gremlin", handle: "@TokenGremlin", face: "g_laugh", badge: true },
  me: { name: "Cache", handle: "@CacheCrow", face: "h_neutral", badge: true },
  meShock: { name: "Cache", handle: "@CacheCrow", face: "h_shock", badge: true },
  bot: { name: "Growth Hacker 🚀", handle: "@bot_48213", face: null, badge: false },
  reply: { name: "reply guy", handle: "@ackshually", face: null, badge: false },
  omni: { name: "OMNI", handle: "@OMNI_official", face: "boss:idle0", badge: true },
};
function avatar(face, x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#ddd"; ctx.fill(); ctx.clip();
  if (!face) { ctx.fillStyle = "#9aa"; ctx.fillRect(x - r, y - r, r * 2, r * 2); txt("🤖", x, y + 1, { size: r * 1.1, stroke: 0 }); }
  else if (face.startsWith("boss:")) spr("boss", face.slice(5), x, y, { anchor: "center", scale: (r * 2.4) / 210 });
  else spr("faces", face, x, y + r * 0.15, { anchor: "center", scale: (r * 2.5) / 200 });
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = "#111"; ctx.stroke();
}
function icon(kind, x, y, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === "reply") { ctx.roundRect(x - 8, y - 6, 16, 11, 5); ctx.moveTo(x - 4, y + 5); ctx.lineTo(x - 6, y + 9); ctx.lineTo(x, y + 5); ctx.stroke(); }
  if (kind === "rt") { ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 8, y - 4); ctx.lineTo(x + 4, y - 4); ctx.moveTo(x + 1, y - 7); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + 1, y - 1); ctx.moveTo(x + 8, y - 2); ctx.lineTo(x + 8, y + 4); ctx.lineTo(x - 4, y + 4); ctx.moveTo(x - 1, y + 1); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x - 1, y + 7); ctx.stroke(); }
  if (kind === "like") { ctx.moveTo(x, y + 7); ctx.bezierCurveTo(x - 12, y - 1, x - 6, y - 10, x, y - 3); ctx.bezierCurveTo(x + 6, y - 10, x + 12, y - 1, x, y + 7); col === "#f91880" ? ctx.fill() : ctx.stroke(); }
  if (kind === "views") { ctx.fillRect(x - 7, y, 3, 6); ctx.fillRect(x - 2, y - 5, 3, 11); ctx.fillRect(x + 3, y - 2, 3, 8); }
}
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)));

// posts: [{who, text, time, likes, rts, replies, views, at (секунда появления), liked}]
export function drawFeed(x, y, w, h, posts, t, o = {}) {
  ctx.save();
  wobRect(x, y, w, h, "#0d0f14", { seed: 31, boil: true, shadow: true, line: 5 });
  ctx.beginPath(); ctx.rect(x + 3, y + 3, w - 6, h - 6); ctx.clip();
  // шапка
  ctx.fillStyle = "#0d0f14"; ctx.fillRect(x, y, w, 64);
  spr("items", "coin0", x + w / 2, y + 22, { anchor: "center", scale: 0.24 });
  txt(o.title || "Home", x + 16, y + 22, { size: 18, color: "#fff", stroke: 0, align: "left", font: "Bang" });
  txt("For you", x + w * 0.27, y + 50, { size: 16, color: "#fff", stroke: 0 });
  txt("Following", x + w * 0.73, y + 50, { size: 16, color: "#71767b", stroke: 0 });
  ctx.fillStyle = "#1d9bf0"; ctx.fillRect(x + w * 0.27 - 26, y + 61, 52, 3);
  ctx.fillStyle = "#2f3336"; ctx.fillRect(x, y + 64, w, 1);
  let yy = y + 66;
  const vis = posts.filter((p) => t >= (p.at || 0)).reverse(); // новые сверху
  for (const p of vis) {
    const P = PEOPLE[p.who];
    const age = t - (p.at || 0);
    const slide = easeOut(clamp(age / 0.35, 0, 1));
    ctx.font = "19px Hand";
    const lines = wrap(p.text, w - 88);
    const ph = 56 + lines.length * 21 + 26;
    ctx.save();
    ctx.globalAlpha = slide;
    if (age < 1.2) { ctx.fillStyle = `rgba(29,155,240,${0.18 * (1 - age / 1.2)})`; ctx.fillRect(x, yy, w, ph); }
    avatar(P.face, x + 34, yy + 30, 20);
    txt(P.name, x + 64, yy + 20, { size: 18, color: "#e7e9ea", stroke: 0, align: "left", font: "Bang" });
    ctx.font = "18px Bang"; let nx = x + 64 + ctx.measureText(P.name).width + 6;
    if (P.badge) { spr("items", "coin0", nx + 8, yy + 19, { anchor: "center", scale: 0.12 }); nx += 20; }
    txt(`${P.handle} · ${age < 60 && p.time === "now" ? "now" : p.time || "1h"}`, nx + 2, yy + 21, { size: 16, color: "#71767b", stroke: 0, align: "left" });
    lines.forEach((l, i) => txt(l, x + 64, yy + 44 + i * 21, { size: 19, color: "#e7e9ea", stroke: 0, align: "left" }));
    // счётчики растут
    const grow = (n) => n * clamp(age / 6, 0.05, 1);
    const ay = yy + ph - 18, colw = (w - 80) / 4;
    const items = [["reply", p.replies || 0, "#71767b"], ["rt", p.rts || 0, "#71767b"], ["like", p.likes || 0, p.liked ? "#f91880" : "#71767b"], ["views", p.views || 0, "#71767b"]];
    items.forEach(([k, n, col], i) => { icon(k, x + 70 + i * colw, ay, col); txt(fmt(grow(n)), x + 84 + i * colw, ay + 1, { size: 15, color: col, stroke: 0, align: "left" }); });
    ctx.restore();
    ctx.fillStyle = "#2f3336"; ctx.fillRect(x, yy + ph, w, 1);
    yy += ph + 1;
    if (yy > y + h) break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- всплывающие надписи в мире / на экране
export const popups = {
  list: [],
  add(text, x, y, o = {}) { this.list.push({ text, x, y, t: 0, dur: o.dur || 1, col: o.col || "#ffe14a", size: o.size || 22, screen: !!o.screen, vy: o.vy ?? -40 }); },
  update(dt) { for (const p of this.list) { p.t += dt; p.y += p.vy * dt; } this.list = this.list.filter((p) => p.t < p.dur); },
  draw(cx, cy, screen) {
    for (const p of this.list) {
      if (p.screen !== screen) continue;
      const a = clamp((p.dur - p.t) / 0.3, 0, 1), s = 0.6 + 0.4 * easeOut(clamp(p.t / 0.15, 0, 1));
      ctx.globalAlpha = a;
      txt(p.text, p.x - cx, p.y - cy, { size: p.size * s, color: p.col, font: "Bang" });
      ctx.globalAlpha = 1;
    }
  },
};

// большие титры уровня
export function titleCard(t, big, small, col = "#ffe14a") {
  if (t > 2.6) return;
  const a = clamp(Math.min(t / 0.3, (2.6 - t) / 0.5), 0, 1);
  ctx.globalAlpha = a;
  const sx = (1 - easeOut(clamp(t / 0.4, 0, 1))) * -200;
  ctx.save(); ctx.translate(sx, 0);
  const y = V.H * 0.3;
  wobRect(V.W / 2 - 250, y - 56, 500, 100, "#111", { seed: 77, boil: true, shadow: true, stroke: col, line: 5 });
  txt(small, V.W / 2, y - 30, { size: 19, color: "#fff", stroke: 0 });
  txt(big, V.W / 2, y + 8, { size: 44, color: col, font: "Bang", stroke: 6 });
  ctx.restore();
  ctx.globalAlpha = 1;
}

// кнопка в «пэинт»-стиле; возвращает true при нажатии (мышь/тап)
export function button(label, x, y, w, h, o = {}) {
  const hov = I.mouse && I.mouse.x > x && I.mouse.x < x + w && I.mouse.y > y && I.mouse.y < y + h;
  const sel = o.selected || hov;
  wobRect(x, y + (sel ? -2 : 0), w, h, o.color || (sel ? "#ffe14a" : "#fff"), { seed: o.seed || x + y, boil: sel, shadow: true });
  txt(label, x + w / 2, y + h / 2 + (sel ? -2 : 0), { size: o.size || 26, color: "#111", stroke: 0, font: "Bang" });
  return I.tap && I.tap.x > x && I.tap.x < x + w && I.tap.y > y && I.tap.y < y + h;
}
