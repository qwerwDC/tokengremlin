// Сцена уровня-платформера
import { ctx, V, I, A, spr, txt, wobRect, wobLine, clamp, lerp, easeOut, frameSize, drawPad, wob } from "./core.js";
import { audio } from "./audio.js";
import { Player, overlap } from "./player.js";
import { LEVELS, THEMES, GY, LEAKS } from "./levels.js";
import { dialog, popups, titleCard } from "./ui.js";

const sh = (atlas, name, h) => h / (frameSize(atlas, name)[1] || 1); // масштаб под нужную высоту
const SHOUTS = ["ratio", "source?", "L + ratio", "um, actually", "first!", "this.", "skill issue", "cope"];

// ------------------------------------------------------------------ общие эффекты (используются и в боссе)
export const fx = {
  list: [],
  add(frames, x, y, o = {}) { this.list.push({ frames, x, y, t: 0, fps: o.fps || 14, scale: o.scale || 0.6, atlas: o.atlas || "items", vy: o.vy || 0, rot: o.rot || 0 }); },
  update(dt) { for (const f of this.list) { f.t += dt; f.y += f.vy * dt; } this.list = this.list.filter((f) => f.t * f.fps < f.frames.length); },
  draw(cx, cy) { for (const f of this.list) { const i = Math.min(f.frames.length - 1, Math.floor(f.t * f.fps)); spr(f.atlas, f.frames[i], f.x - cx, f.y - cy, { anchor: "center", scale: f.scale, rot: f.rot }); } },
  smoke(x, y, s = 0.6) { this.add(["smoke0", "smoke1", "smoke2"], x, y, { scale: s, fps: 10 }); },
  puff(x, y, s = 0.5) { this.add(["puff0", "puff1", "puff2"], x, y, { scale: s, fps: 14 }); },
  hit(x, y) { this.add(["impact", "impact"], x, y, { scale: 0.5, fps: 12 }); },
  shine(x, y) { this.add(["shine", "spark1", "spark0"], x, y, { scale: 0.35, fps: 16 }); },
};

// параллакс-фон с зеркальными повторами (без швов)
export function drawParallax(img, cx, cy, f = 0.3, H = 600, yoff = 0) {
  if (!img) return;
  const w = img.width * (H / img.height);
  const off = cx * f;
  const i0 = Math.floor(off / w);
  const y = (V.H - H) / 2 - cy * 0.12 + yoff;
  for (let i = i0; i <= i0 + Math.ceil(V.W / w) + 1; i++) {
    const x = i * w - off;
    if (i % 2 === 0) ctx.drawImage(img, x, y, w, H);
    else { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, H); ctx.restore(); }
  }
}

export function drawHUD(g, p, o = {}) {
  // жизни
  for (let i = 0; i < p.maxHp; i++) spr("ui", i < p.hp ? "heart" : "heart0", 34 + i * 46, 32, { anchor: "center", scale: i < p.hp ? 0.3 : 0.38 });
  // токены
  wobRect(16, 56, 132, 40, "#fffdf3", { seed: 3, line: 3 });
  spr("items", "coin" + (Math.floor(V.T * 8) % 4), 38, 76, { anchor: "center", scale: 0.27 });
  txt(String(g.tokens), 62, 77, { size: 26, color: "#111", stroke: 0, align: "left", font: "Bang" });
  if (o.leaks !== undefined) {
    wobRect(16, 102, 132, 36, "#fff2c2", { seed: 4, line: 3 });
    spr("items", "note", 36, 120, { anchor: "center", scale: 0.2 });
    txt(`${o.leaks}/3 leaks`, 56, 121, { size: 20, color: "#111", stroke: 0, align: "left" });
  }
}

// ======================================================================= уровень
export class LevelScene {
  constructor(game, idx) { this.g = game; this.idx = idx; }

  enter() {
    const L = (this.L = LEVELS[this.idx]());
    this.th = THEMES[L.theme];
    this.solids = L.solids.map((s) => ({ ...s }));
    this.solids.push({ x: -80, y: -2000, w: 80, h: 4000, edge: true }, { x: L.width, y: -2000, w: 80, h: 4000, edge: true });
    this.plats = L.plats.map((p) => ({ ...p }));
    this.ents = [];
    for (const e of L.ents) {
      const n = { ...e, alive: true, t: Math.random() * 3 };
      if (e.type === "note" && this.g.leaks.has(e.id)) n.got = true;
      if (e.type === "crate") { n.solid = { x: e.x - 35, y: e.y - 70, w: 70, h: 70, crate: n }; this.solids.push(n.solid); }
      if (e.type === "bot") n.dir = -1;
      if (e.type === "reply") n.cd = 1.5 + Math.random();
      this.ents.push(n);
    }
    this.triggers = L.triggers.map((t) => ({ ...t }));
    this.check = { x: 90, y: GY };
    this.spawn();
    this.cx = 0; this.cy = 0; this.t = 0; this.shake = 0; this.state = "play"; this.winT = 0;
    this.leaksHere = this.ents.filter((e) => e.type === "note" && e.got).length;
    this.timer = L.timer || 0;
    this.drone = null; this.toast = null;
    fx.list = []; popups.list = []; dialog.clear();
    I.padOn = true; dialog.top = true;
    audio.music(this.th.music, true);
    this.g.saveProgress(this.idx);
  }
  exit() { I.padOn = false; dialog.top = false; }

  spawn() {
    const hp = this.p ? (this.p.hp > 0 ? this.p.hp : 3) : 3;
    this.p = new Player(this.check.x, this.check.y);
    this.p.hp = hp; this.p.inv = 1;
  }
  say(who, face, text, o) { dialog.say(who, face, text, o); }
  flyby() { this.drone = { t: 0, dur: 8 }; audio.play("engine"); }

  world() { return { solids: this.solids, plats: this.plats, onLand: (p) => fx.puff(p.cx, p.bottom - 6, 0.45) }; }

  update(dt) {
    const p = this.p, g = this.g;
    this.t += dt;
    if (I.pressed("pause")) return g.pause(this);
    dialog.update(dt); popups.update(dt); fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.toast) { this.toast.t += dt; if (this.toast.t > 4) this.toast = null; }
    if (this.drone) { this.drone.t += dt; if (this.drone.t > this.drone.dur) this.drone = null; }
    g.time += dt;

    // платформы двигаются / мигают
    for (const pl of this.plats) {
      if (pl.mv) {
        const k = (Math.sin((this.t / pl.mv.per) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        const nx = pl.ox + pl.mv.dx * k, ny = pl.oy + pl.mv.dy * k;
        pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
      }
      if (pl.blink) { const per = pl.blink.on + pl.blink.off; const ph = (this.t + pl.blink.ph) % per; pl.off = ph > pl.blink.on; pl.warn = !pl.off && ph > pl.blink.on - 0.45; }
    }
    for (const s of this.solids) if (s.hot) { const ph = (this.t + s.ph) % 4.2; s.heat = ph < 2 ? 0 : ph < 2.9 ? (ph - 2) / 0.9 : 1; }

    if (this.state === "win") {
      this.winT += dt; p.frozen = true; p.vx *= 0.9; p.update(dt, this.world());
      if (this.winT > 2.6) g.nextLevel(this.idx);
      this.camera(dt);
      return;
    }
    if (this.state === "timeout") {
      this.winT += dt; if (this.winT > 2.5) g.startLevel(this.idx);
      return;
    }
    p.frozen = dialog.blocking;
    p.update(dt, this.world());

    // таймер арены
    if (this.L.timer) {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = 0; this.state = "timeout"; this.winT = 0; audio.play("lose"); popups.add("NEEDS MORE TRAINING", V.W / 2, V.H / 2, { screen: true, dur: 2.5, size: 50, col: "#ff5a5a", vy: 0 }); return; }
    }
    // горячие решётки
    if (p.ground && p.groundRef && p.groundRef.hot && p.groundRef.heat >= 1) { if (p.damage(0)) { p.vy = -600; fx.smoke(p.cx, p.bottom, 0.5); popups.add("HOT!", p.cx, p.y - 10, { col: "#ff7a2a" }); } }

    // триггеры
    for (const t of this.triggers) if (!t.done && p.x > t.x) { t.done = true; t.fn(this); }

    // сущности
    const atk = p.attackBox();
    for (const e of this.ents) if (e.alive) this.updEnt(e, dt, p, atk);
    this.ents = this.ents.filter((e) => e.alive || e.keep);

    // смерть
    if (p.y > GY + 280 && !p.dead) {
      p.hp -= 1; audio.play("lose");
      popups.add("CONNECTION LOST", V.W / 2, V.H / 2 - 40, { screen: true, dur: 1.4, size: 40, col: "#ff5a5a", vy: 0 });
      if (p.hp <= 0) { this.g.deaths++; p.hp = 3; }
      this.spawn();
    }
    if (p.dead && p.dead < 0.01) { this.g.deaths++; p.hp = 3; this.spawn(); popups.add("RESPAWNED", V.W / 2, V.H / 2 - 40, { screen: true, dur: 1.2, size: 36, vy: 0 }); }
    this.camera(dt);
  }

  camera(dt) {
    const p = this.p;
    const tx = clamp(p.cx - V.W * 0.4 + p.face * 60, 0, Math.max(0, this.L.width - V.W));
    const ty = Math.min(0, p.y - 230);
    this.cx = lerp(this.cx, tx, Math.min(1, dt * 5));
    this.cy = lerp(this.cy, ty, Math.min(1, dt * 4));
  }

  kill(e, p, how = "BONK!") {
    e.alive = false; audio.play("punch"); fx.smoke(e.x, e.y - 40, 0.6); fx.hit(e.x, e.y - 40);
    popups.add(how, e.x, e.y - 90, { col: "#fff" });
    this.shake = 0.4; this.g.kills++;
    this.addCoin(e.x - 15, e.y - 50); this.addCoin(e.x + 15, e.y - 60);
  }
  addCoin(x, y) { this.ents.push({ type: "coin", x, y, alive: true, t: 0, vy: -380, vx: (Math.random() - 0.5) * 200, loose: true }); }

  updEnt(e, dt, p, atk) {
    e.t += dt;
    const near = Math.abs(e.x - p.cx) < V.W;
    const hitAtk = (box) => atk && overlap(atk, box) && !p.hitList.has(e) && (p.hitList.add(e), true);
    const stomp = (box) => p.vy > 50 && p.bottom - p.vy * dt <= box.y + 14 && overlap(p, box);
    switch (e.type) {
      case "coin": {
        if (e.loose) { e.vy += 1400 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.y > GY - 14 && e.vy > 0) { e.y = GY - 14; e.vy *= -0.4; e.vx *= 0.6; } if (e.t > 6) e.alive = false; }
        const d = Math.hypot(e.x - p.cx, e.y - (p.y + p.h / 2));
        if (d < 34 && e.t > 0.25) { e.alive = false; this.g.tokens++; audio.play("coin"); fx.shine(e.x, e.y); }
        else if (d < 90 && p.boost > 0) { e.x = lerp(e.x, p.cx, dt * 8); e.y = lerp(e.y, p.y + 40, dt * 8); }
        break;
      }
      case "note": {
        if (e.got) { e.alive = false; break; }
        if (Math.hypot(e.x - p.cx, e.y - (p.y + 40)) < 44) {
          e.alive = false; this.g.leaks.add(e.id); this.leaksHere++; audio.play("gem"); fx.shine(e.x, e.y);
          popups.add(`LEAK FOUND! ${this.g.leaks.size}/15`, e.x, e.y - 40, { col: "#ffe14a", size: 28, dur: 1.4 });
          this.toast = { text: LEAKS[e.id], t: 0 };
          this.g.saveProgress(this.idx);
        }
        break;
      }
      case "heart": case "bolt": case "chip": {
        if (Math.hypot(e.x - p.cx, e.y - (p.y + 40)) < 40) {
          e.alive = false; fx.shine(e.x, e.y);
          if (e.type === "heart") { p.hp = Math.min(p.maxHp, p.hp + 1); audio.play("item"); popups.add("+1 ❤", e.x, e.y - 30, { col: "#ff5a6a" }); }
          if (e.type === "bolt") { if (this.L.timer) { this.timer += 5; popups.add("+5 SEC", e.x, e.y - 30, { col: "#ffe14a", size: 30 }); } else { p.boost = 2.5; } audio.play("boost"); }
          if (e.type === "chip") { p.boost = 6; audio.play("transform"); popups.add("OVERCLOCKED!", e.x, e.y - 30, { col: "#7dff6a", size: 32 }); }
        }
        break;
      }
      case "bot": {
        if (!near) break;
        e.x += e.dir * 75 * dt;
        if (e.x < e.minx) { e.x = e.minx; e.dir = 1; } if (e.x > e.maxx) { e.x = e.maxx; e.dir = -1; }
        const box = { x: e.x - 26, y: e.y - 70, w: 52, h: 70 };
        if (hitAtk(box) || (p.boost > 0 && overlap(p, box))) { this.kill(e, p); break; }
        if (stomp(box)) { this.kill(e, p, "STOMP!"); p.vy = -620; p.jumps = 1; break; }
        if (overlap(p, box)) p.damage(Math.sign(p.cx - e.x) || 1);
        break;
      }
      case "reply": {
        if (!near) break;
        const box = { x: e.x - 30, y: e.y - 76, w: 60, h: 76 };
        e.dir = p.cx < e.x ? -1 : 1;
        if (hitAtk(box) || (p.boost > 0 && overlap(p, box))) { this.kill(e, p, "MUTED!"); break; }
        if (stomp(box)) { this.kill(e, p, "BLOCKED!"); p.vy = -620; break; }
        if (overlap(p, box)) p.damage(Math.sign(p.cx - e.x) || 1);
        e.cd -= dt; e.shoutT = Math.max(0, (e.shoutT || 0) - dt);
        if (e.cd <= 0 && Math.abs(p.cx - e.x) < 650) {
          e.cd = 2.6; e.shoutT = 0.4; audio.play("horn");
          this.ents.push({ type: "shout", x: e.x + e.dir * 50, y: e.y - 52, vx: e.dir * 250, text: SHOUTS[Math.floor(Math.random() * SHOUTS.length)], alive: true, t: 0 });
        }
        break;
      }
      case "shout": {
        e.x += e.vx * dt; if (e.t > 3.5) e.alive = false;
        const box = { x: e.x - 40, y: e.y - 16, w: 80, h: 32 };
        if (hitAtk(box)) { e.alive = false; fx.puff(e.x, e.y, 0.4); popups.add("blocked", e.x, e.y - 20, { col: "#9ef" }); break; }
        for (const s of this.solids) if (overlap(box, s)) e.alive = false;
        if (overlap(p, box)) { p.damage(Math.sign(e.vx)); e.alive = false; }
        break;
      }
      case "ghost": {
        if (!near) break;
        const dx = p.cx - e.x, dy = p.y + 30 - e.y, d = Math.hypot(dx, dy);
        if (d < 520) { e.x += (dx / d) * 70 * dt; e.y += (dy / d) * 50 * dt; }
        e.y += Math.sin(e.t * 3) * 20 * dt;
        const box = { x: e.x - 34, y: e.y - 34, w: 68, h: 68 };
        if (hitAtk(box) || (p.boost > 0 && overlap(p, box))) { e.alive = false; fx.puff(e.x, e.y, 0.7); audio.play("pop"); popups.add("DEBUNKED!", e.x, e.y - 40, { col: "#fff" }); break; }
        if (overlap(p, box)) {
          e.alive = false; p.reversed = 4.5; audio.play("slip"); fx.puff(e.x, e.y, 0.8);
          popups.add("CONTROLS HALLUCINATED!", V.W / 2, 150, { screen: true, col: "#ff5ad8", size: 34, dur: 1.8, vy: 0 });
        }
        break;
      }
      case "fake": {
        const box = { x: e.x - 30, y: e.y - 80, w: 60, h: 80 };
        if (overlap(p, box) || hitAtk(box)) {
          e.alive = false; audio.play("pop"); fx.puff(e.x, e.y - 40, 0.9);
          popups.add("HALLUCINATION!", e.x, e.y - 100, { col: "#ff5ad8", size: 28 });
          this.ents.push({ type: "ghost", x: e.x, y: e.y - 120, alive: true, t: 0 });
        }
        break;
      }
      case "bomb": {
        const box = { x: e.x - 30, y: e.y - 60, w: 60, h: 60 };
        const d = Math.hypot(p.cx - e.x, p.y + 40 - (e.y - 30));
        if (e.fuse === undefined && (d < 130 || hitAtk(box))) { e.fuse = d < 130 ? 0.9 : 0.35; audio.play("tick"); }
        if (e.fuse !== undefined) {
          e.fuse -= dt;
          if (e.fuse <= 0) {
            e.alive = false; audio.play("boom"); this.shake = 1;
            fx.add(["smoke0", "smoke1", "smoke2"], e.x, e.y - 40, { scale: 1.3, fps: 8 });
            popups.add("BAIT EXPLODED", e.x, e.y - 110, { col: "#ff5a5a" });
            if (Math.hypot(p.cx - e.x, p.y + 40 - (e.y - 30)) < 130) p.damage(Math.sign(p.cx - e.x) || 1);
          }
        }
        break;
      }
      case "spring": {
        const box = { x: e.x - 32, y: e.y - 34, w: 64, h: 34 };
        e.sq = Math.max(0, (e.sq || 0) - dt * 4);
        if (p.vy > 0 && overlap(p, box) && p.bottom - p.vy * dt <= box.y + 16) { p.vy = -1300; p.jumps = 1; p.canDash = true; e.sq = 1; audio.play("spring"); p.spinT = 0.4; }
        break;
      }
      case "fan": {
        const col = { x: e.x - 100, y: e.top, w: 200, h: e.y + 190 - e.top };
        if (overlap(p, col)) { p.vy -= 5200 * dt; p.vy = Math.max(p.vy, -620); p.jumps = 1; p.canDash = true; }
        if (Math.random() < dt * 8 && near) fx.add(["speed"], e.x + (Math.random() - 0.5) * 70, e.y - 40, { scale: 0.25, fps: 3, vy: -260, rot: -Math.PI / 2 });
        break;
      }
      case "laser": {
        const per = e.on + e.off, ph = (this.t + e.ph) % per;
        e.isOn = ph < e.on; e.warn = !e.isOn && ph > per - 0.35;
        const box = { x: e.x - 50, y: e.y - 190, w: 100, h: 190 };
        if (e.isOn && overlap(p, box)) p.damage(p.vx > 0 ? -1 : 1);
        break;
      }
      case "spikes": {
        const box = { x: e.x - e.w / 2, y: e.y - 26, w: e.w, h: 26 };
        if (overlap(p, box)) { if (p.damage(p.vx > 0 ? -1 : 1)) p.vy = -650; }
        break;
      }
      case "crate": {
        if (hitAtk(e.solid) || (p.dashT > 0 && overlap({ x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, e.solid))) {
          e.alive = false; this.solids.splice(this.solids.indexOf(e.solid), 1);
          audio.play("crumble"); fx.smoke(e.x, e.y - 35, 0.7); this.addCoin(e.x, e.y - 40); this.addCoin(e.x + 10, e.y - 50); this.addCoin(e.x - 10, e.y - 45);
        }
        break;
      }
      case "checkpoint": {
        if (!e.hit && p.cx > e.x - 20) { e.hit = true; this.check = { x: e.x, y: e.y }; audio.play("flag"); popups.add("CHECKPOINT SAVED", e.x, e.y - 160, { col: "#7dff6a", size: 26 }); }
        e.keep = true;
        break;
      }
      case "goal": {
        if (this.state === "play" && Math.abs(p.cx - e.x) < 40 && p.bottom > e.y - 160) this.win(e);
        break;
      }
      case "fakegoal": {
        if (Math.abs(p.cx - e.x) < 40 && p.bottom > e.y - 160) {
          e.alive = false; audio.play("pop"); fx.puff(e.x, e.y - 80, 1.1);
          popups.add("HALLUCINATED EXIT!", V.W / 2, 160, { screen: true, col: "#ff5ad8", size: 40, dur: 2, vy: 0 });
          this.ents.push({ type: "ghost", x: e.x - 120, y: e.y - 200, alive: true, t: 0 }, { type: "ghost", x: e.x + 140, y: e.y - 160, alive: true, t: 0 });
          this.say("g", "g_laugh", "TOLD YOU. Too shiny. The real exit is further!");
        }
        break;
      }
    }
  }

  win(e) {
    this.state = "win"; this.winT = 0;
    audio.play("finish"); audio.stopMusic();
    setTimeout(() => audio.play("win"), 400);
    for (let i = 0; i < 8; i++) fx.shine(e.x + (Math.random() - 0.5) * 200, e.y - 100 - Math.random() * 150);
    let msg = "CLEARED!";
    if (this.L.timer) msg = `NEW SOTA! ${this.timer.toFixed(1)}s to spare`;
    popups.add(msg, V.W / 2, V.H / 2 - 60, { screen: true, size: 54, dur: 2.6, vy: 0 });
    this.p.vx = 0;
  }

  // ---------------------------------------------------------------- рисование
  draw() {
    const cx = Math.round(this.cx + (Math.random() - 0.5) * this.shake * 14), cy = Math.round(this.cy + (Math.random() - 0.5) * this.shake * 10);
    const th = this.th;
    ctx.fillStyle = th.sky; ctx.fillRect(0, 0, V.W, V.H);
    drawParallax(A.img[th.bg], cx, cy, 0.28, 570);
    ctx.fillStyle = th.veil; ctx.fillRect(0, 0, V.W, V.H);
    if (this.L.halluc) { ctx.fillStyle = `rgba(255,90,216,${0.06 + Math.sin(this.t * 1.7) * 0.05})`; ctx.fillRect(0, 0, V.W, V.H); }
    this.drawDrone(cx);

    // платформы
    for (const s of this.solids) {
      if (s.crate || s.edge || s.x > cx + V.W + 20 || s.x + s.w < cx - 20) continue;
      this.drawSolid(s, cx, cy);
    }
    for (const pl of this.plats) {
      if (pl.x > cx + V.W || pl.x + pl.w < cx) continue;
      const [tw, tH] = frameSize("tiles", pl.kind);
      const sc = pl.w / tw;
      let a = pl.off ? 0.18 : pl.warn && Math.floor(this.t * 12) % 2 ? 0.5 : 1;
      spr("tiles", pl.kind, pl.x + pl.w / 2 - cx, pl.y - 8 - cy, { anchor: "top", sw: sc, sh: Math.min(sc, 70 / tH), alpha: a });
    }
    // сущности
    for (const e of this.ents) if (e.alive || e.keep) this.drawEnt(e, cx, cy);
    this.p.draw(cx, cy);
    if (this.p.atkT > 0.04) this.drawSwoosh(cx, cy);
    fx.draw(cx, cy);
    popups.draw(cx, cy, false);

    // HUD
    drawHUD(this.g, this.p, { leaks: this.leaksHere });
    txt(`${this.L.sub} · ${this.L.name}`, V.W / 2, 22, { size: 20, color: "#fff", font: "Bang", stroke: 4 });
    const prog = clamp(this.p.cx / this.L.width, 0, 1);
    wobRect(V.W / 2 - 120, 38, 240, 12, "#fff", { seed: 8, line: 3, jit: 1 });
    ctx.fillStyle = "#ffd23c"; ctx.fillRect(V.W / 2 - 118, 40, 236 * prog, 8);
    spr("items", "cage", V.W / 2 + 128, 44, { anchor: "center", scale: 0.14 });
    if (this.L.queue) txt(prog > 0.98 ? "It's your turn! (just kidding)" : `You are #${Math.max(1, Math.round(9999 * (1 - prog)))} in line`, V.W - 20, 70, { size: 22, color: "#ffe14a", align: "right" });
    if (this.L.timer) {
      const t = this.timer;
      txt(`⏱ ${t.toFixed(1)}`, V.W - 24, 34, { size: 38, color: t < 10 ? (Math.floor(this.t * 6) % 2 ? "#ff5a5a" : "#fff") : "#fff", align: "right", font: "Bang" });
    }
    if (this.p.reversed > 0) txt(`🌀 CONTROLS FLIPPED ${this.p.reversed.toFixed(1)}`, V.W / 2, 70, { size: 22, color: "#ff5ad8" });
    if (this.p.boost > 1.2 && this.p.boost < 6.1) txt(`⚡ OVERCLOCK ${this.p.boost.toFixed(1)}`, V.W / 2, 70, { size: 22, color: "#7dff6a" });
    if (this.toast) this.drawToast();
    popups.draw(0, 0, true);
    if (this.state === "play" && this.t < 3.2) titleCard(this.t, this.L.name, this.L.sub);
    dialog.draw();
    drawPad();
  }

  drawToast() {
    const t = this.toast.t, a = clamp(Math.min(t / 0.25, (4 - t) / 0.4), 0, 1);
    const w = Math.min(560, V.W - 300), x = V.W - w - 18, y = 96 + (1 - easeOut(clamp(t / 0.3, 0, 1))) * -60;
    ctx.globalAlpha = a;
    wobRect(x, y, w, 74, "#fff6d6", { seed: 21, boil: true, shadow: true });
    spr("items", "note", x + 36, y + 37, { anchor: "center", scale: 0.36 });
    txt(this.toast.text, x + 70, y + 14, { size: 19, color: "#222", stroke: 0, align: "left", maxW: w - 86, base: "top", lh: 1.05 });
    ctx.globalAlpha = 1;
  }

  hatch(x, y, w, h, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, w - 8, h - 8); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = -h; k < w; k += 34) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h * 0.6, y); }
    ctx.globalAlpha = 0.45; ctx.stroke(); ctx.restore();
  }
  drawSolid(s, cx, cy) {
    const th = this.th;
    const x = s.x - cx, y = s.y - cy;
    const h = Math.min(s.h, V.H - y + 40);
    if (s.ceiling || s.mesa || s.w < 60) {
      wobRect(x, y, s.w, h, th.dirt, { seed: s.x, line: 4 });
      this.hatch(x, y, s.w, h, th.ground);
      if (s.ceiling) wobRect(x - 4, y + h - 18, s.w + 8, 18, th.top, { seed: s.x + 1, line: 3 });
      else wobRect(x - 2, y - 2, s.w + 4, 18, th.top, { seed: s.x + 3, line: 3 });
      return;
    }
    wobRect(x, y, s.w, h, th.ground, { seed: s.x + s.y, line: 4 });
    // штрихи-грязь
    ctx.strokeStyle = th.dirt; ctx.lineWidth = 3;
    for (let i = 0; i < s.w / 70; i++) {
      const px = x + 30 + i * 70 + wob(s.x, i) * 30, py = y + 40 + (wob(s.y, i) + 0.5) * Math.min(120, h - 50);
      if (py > y + h - 10) continue;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 16, py + 4); ctx.stroke();
    }
    let top = th.top;
    if (s.hot) {
      const k = s.heat;
      top = k >= 1 ? (Math.floor(this.t * 10) % 2 ? "#ff3a1a" : "#ffb02a") : k > 0 ? `rgb(${120 + 135 * k},${80 + 40 * k},40)` : "#5a5a66";
      for (let i = 0; i < s.w / 26; i++) { ctx.fillStyle = k >= 1 ? "#ffd23c" : "#22222a"; ctx.fillRect(x + 8 + i * 26, y + 4, 10, 10); }
    }
    wobRect(x - 2, y - 2, s.w + 4, 18, top, { seed: s.x + 3, line: 3 });
    if (s.hot && s.heat >= 1 && Math.random() < 0.3) fx.add(["smoke0"], s.x + Math.random() * s.w, s.y - 10, { scale: 0.3, fps: 4, vy: -60 });
  }

  drawSwoosh(cx, cy) {
    const p = this.p, k = 1 - this.p.atkT / 0.26;
    ctx.save();
    ctx.translate(p.cx - cx, p.y + 36 - cy); ctx.scale(p.face, 1);
    ctx.globalAlpha = 0.7 * (1 - k);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(10, 0, 70, -1.3 + k * 0.4, 0.9 + k * 0.6); ctx.stroke();
    ctx.restore();
  }

  drawDrone(cx) {
    if (!this.drone) return;
    const k = this.drone.t / this.drone.dur;
    const x = lerp(-180, V.W + 180, k), y = 110 + Math.sin(this.drone.t * 2) * 14;
    // дрон (только верх, без пустой клетки) + гремлин в клетке
    const [dw, dh] = frameSize("enemy", "drone0");
    spr("enemy", "drone" + (Math.floor(this.drone.t * 10) % 2), x, y - 20, { anchor: "top", scale: 0.55, cutH: dh * 0.48 });
    spr("grem", "cage" + (1 + (Math.floor(this.drone.t * 3) % 2)), x, y + 90, { scale: 0.48, rot: Math.sin(this.drone.t * 3) * 0.12 });
    if (this.drone.t > 1 && this.drone.t < 6) txt("HELP!!", x + 50, y - 10 + Math.sin(this.t * 12) * 2, { size: 22, color: "#fff", font: "Bang" });
  }

  drawEnt(e, cx, cy) {
    const x = e.x - cx, y = e.y - cy;
    if (x < -200 || x > V.W + 200) return;
    switch (e.type) {
      case "coin": spr("items", "coin" + (Math.floor(e.t * 8 + e.x) % 4), x, y + Math.sin(e.t * 4 + e.x) * 3, { anchor: "center", scale: 0.32 }); break;
      case "note": spr("items", "note", x, y + Math.sin(e.t * 3) * 6, { anchor: "center", scale: 0.34, rot: Math.sin(e.t * 2) * 0.15 }); if (Math.floor(e.t * 3) % 2) spr("items", "spark0", x + 26, y - 30, { anchor: "center", scale: 0.35 }); break;
      case "heart": spr("items", "heart", x, y + Math.sin(e.t * 4) * 5, { anchor: "center", scale: 0.3 }); break;
      case "bolt": spr("items", "bolt", x, y + Math.sin(e.t * 4) * 5, { anchor: "center", scale: 0.36 }); break;
      case "chip": spr("items", "chip", x, y + Math.sin(e.t * 4) * 5, { anchor: "center", scale: 0.36, rot: Math.sin(e.t * 2) * 0.2 }); break;
      case "sign": {
        ctx.font = "19px Hand";
        const w = Math.min(300, ctx.measureText(e.text).width + 30);
        wobLine(x, y, x, y - 70, "#6b3f1d", 7, e.x);
        wobRect(x - w / 2, y - 130, w, 64, "#fff3d0", { seed: e.x, line: 3 });
        txt(e.text, x, y - 98, { size: 19, color: "#222", stroke: 0, maxW: w - 16, vcenter: true, lh: 1 });
        break;
      }
      case "bot": spr("enemy", e.dir < 0 ? "bot" + (Math.floor(e.t * 6) % 2) : "bot" + (Math.floor(e.t * 6) % 2), x, y, { scale: sh("enemy", "bot0", 78), flip: e.dir < 0 }); break;
      case "reply": spr("enemy", e.shoutT > 0 ? "reply1" : "reply0", x, y, { scale: sh("enemy", "reply0", 80), flip: e.dir < 0 }); break;
      case "shout": {
        spr("ui", "shout", x, y, { anchor: "center", scale: 0.5, flip: e.vx < 0 });
        txt(e.text, x, y + 1, { size: 18, color: "#d11", stroke: 0, font: "Bang" });
        break;
      }
      case "ghost": spr("enemy", "ghost" + (Math.floor(e.t * 5) % 2), x, y, { anchor: "center", scale: 0.55, flip: e.x > this.p.cx, alpha: 0.85 }); break;
      case "fake": spr("enemy", "fake", x, y, { scale: sh("enemy", "fake", 82), rot: Math.sin(e.t * 2) * 0.05 }); break;
      case "bomb": {
        const fl = e.fuse !== undefined && Math.floor(e.t * 14) % 2;
        spr("enemy", "bomb", x, y, { scale: sh("enemy", "bomb", 66) * (fl ? 1.12 : 1) });
        if (e.fuse === undefined) txt("Like if you agree!", x, y - 80, { size: 15, color: "#fff" });
        break;
      }
      case "spring": spr("tiles", "spring", x, y, { anchor: "foot", scale: 0.42, sh: 1 - (e.sq || 0) * 0.35 }); break;
      case "fan": {
        spr("items", "fan", x, y - 40, { anchor: "center", scale: 0.6, rot: e.t * 18 });
        ctx.globalAlpha = 0.25; ctx.fillStyle = "#cfefff"; ctx.fillRect(x - 96, e.top - cy, 192, e.y - 80 - e.top); ctx.globalAlpha = 1;
        break;
      }
      case "laser": {
        const a = e.isOn ? 1 : e.warn ? (Math.floor(this.t * 14) % 2 ? 0.7 : 0.25) : 0.22;
        spr("items", "laser", x, y, { scale: 1.1, sw: 0.6, alpha: a });
        wobRect(x - 34, y - 232, 68, 34, e.isOn ? "#ff3a3a" : "#555", { seed: e.x, boil: e.isOn, line: 3 });
        txt("429", x, y - 214, { size: 22, color: "#fff", font: "Bang", stroke: 0 });
        break;
      }
      case "spikes": {
        const n = Math.max(1, Math.round(e.w / 70));
        for (let i = 0; i < n; i++) spr("tiles", "spikes", x - e.w / 2 + (i + 0.5) * (e.w / n), y + 4, { scale: (e.w / n) / 188 * 1.05 });
        break;
      }
      case "crate": spr("tiles", "crate", x, y + 4, { scale: 74 / 114 }); break;
      case "checkpoint": {
        const up = e.hit ? 1 : 0.5;
        spr("items", "flag", x, y + 4, { scale: 0.75 * (e.hit ? 1 : 0.85), alpha: e.hit ? 1 : 0.6 });
        break;
      }
      case "goal": case "fakegoal": {
        if (e.type === "fakegoal") { ctx.save(); ctx.shadowColor = "#ffe14a"; ctx.shadowBlur = 30 + Math.sin(e.t * 6) * 10; }
        spr("items", "flag", x, y + 4, { scale: 1.1 });
        if (e.type === "fakegoal") { ctx.restore(); for (let i = 0; i < 3; i++) spr("items", "spark1", x + Math.sin(e.t * 2 + i * 2) * 70, y - 120 + Math.cos(e.t * 3 + i) * 50, { anchor: "center", scale: 0.3 }); }
        txt(e.type === "fakegoal" ? "EXIT ✨✨" : "EXIT", x, y - 210, { size: 28, color: "#ffe14a", font: "Bang" });
        break;
      }
    }
  }
}
