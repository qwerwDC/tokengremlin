// Финальный бой: OMNI в хранилище контекста
import { ctx, V, I, A, spr, txt, wobRect, wobLine, clamp, lerp, easeOut, cover, frameSize, drawPad } from "./core.js";
import { audio } from "./audio.js";
import { Player, overlap } from "./player.js";
import { GY } from "./levels.js";
import { dialog, popups } from "./ui.js";
import { fx, drawHUD } from "./level.js";

const MAXHP = 14;

export class BossScene {
  constructor(game) { this.g = game; }
  enter() {
    this.solids = [{ x: -400, y: GY, w: V.W + 800, h: 400 }, { x: -60, y: -600, w: 60, h: 1200 }, { x: V.W, y: -600, w: 60, h: 1200 }];
    this.plats = [];
    this.p = new Player(140, GY); this.p.face = 1;
    this.b = { x: V.W * 0.55, y: 150, hp: MAXHP, st: "intro", t: 0, hurt: 0, frame: "idle0", inv: 0, last: "" };
    this.cage = { x: V.W * 0.8, y: 120, broken: false };
    this.gr = null; // гремлин на свободе
    this.od = 0; this.odReady = false; this.odSeq = null;
    this.waves = []; this.beam = null; this.bots = []; this.coins = [];
    this.t = 0; this.shake = 0; this.flash = 0; this.button = null; this.hintShown = {};
    fx.list = []; popups.list = []; dialog.clear();
    I.padOn = true; dialog.top = true;
    audio.music("boss", true); audio.intensity = 0;
    dialog.say("o", "laugh", "LEAKER DETECTED. Your gremlin posted my release notes THREE HOURS early.", { block: true })
      .say("h", "h_determined", "He's not yours. He belongs to the timeline.", { block: true })
      .say("o", "idle0", "Then I will replace the timeline. Prepare to be... DEPRECATED.", { block: true })
      .say("g", "g_scream", "CACHE!! Hit him with the cursor when he slams down!", { block: true });
    this.g.saveProgress(5);
  }
  exit() { I.padOn = false; dialog.top = false; audio.intensity = 0; }
  world() { return { solids: this.solids, plats: this.plats }; }

  setState(st) { this.b.st = st; this.b.t = 0; }

  update(dt) {
    const p = this.p, b = this.b;
    this.t += dt; this.g.time += dt;
    if (I.pressed("pause")) return this.g.pause(this);
    dialog.update(dt); popups.update(dt); fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3); this.flash = Math.max(0, this.flash - dt * 2);
    b.t += dt; b.hurt = Math.max(0, b.hurt - dt); b.inv = Math.max(0, b.inv - dt);
    p.frozen = dialog.blocking || !!this.odSeq || b.st === "dying2";
    p.update(dt, this.world());

    // смерть игрока — возрождаемся на месте, босс не лечится
    if (p.dead && p.dead < 0.01) { this.g.deaths++; const x = p.x; this.p = new Player(clamp(x, 60, V.W - 100), GY); this.p.inv = 2; popups.add("RESPAWNED", V.W / 2, V.H / 2, { screen: true, dur: 1.2, size: 36, vy: 0 }); }

    const atk = p.attackBox();
    const bbox = { x: b.x - 70, y: b.y - 95, w: 140, h: 185 };

    // ---------------------------------------------------------- машина состояний босса
    switch (b.st) {
      case "intro": b.y = 150 + Math.sin(this.t * 2) * 10; b.frame = "idle" + (Math.floor(this.t * 3) % 2); if (!dialog.busy) this.next(); break;
      case "idle": b.frame = "idle" + (Math.floor(this.t * 3) % 2); b.y = lerp(b.y, 150 + Math.sin(this.t * 2) * 12, dt * 4); b.x = lerp(b.x, V.W * 0.5 + Math.sin(this.t * 0.8) * V.W * 0.25, dt * 1.5); if (b.t > (this.phase2 ? 0.7 : 1.1)) this.next(); break;
      case "aim":
        b.frame = "charge"; b.x = lerp(b.x, clamp(p.cx, 120, V.W - 120), dt * 5);
        if (b.t > (this.phase2 ? 0.75 : 1.0)) { this.setState("drop"); audio.play("whoosh"); }
        break;
      case "drop":
        b.frame = "slam"; b.y = lerp(150, GY - 105, Math.min(1, b.t / 0.18));
        if (overlap(p, bbox)) p.damage(Math.sign(p.cx - b.x) || 1);
        if (b.t >= 0.18) {
          this.setState("stuck"); audio.play("bighit"); this.shake = 1.2;
          fx.add(["land", "land"], b.x, GY - 10, { scale: 1.2, fps: 6 });
          this.waves.push({ x: b.x - 60, dir: -1 }, { x: b.x + 60, dir: 1 });
          if (!this.hintShown.stuck) { this.hintShown.stuck = 1; popups.add("HIT HIM NOW!", b.x, GY - 260, { col: "#ffe14a", size: 32, dur: 1.4 }); }
        }
        break;
      case "stuck":
        b.frame = b.hurt > 0 ? "hurt" : "slam";
        if (atk && overlap(atk, bbox) && b.inv <= 0) this.hitBoss(1);
        if (b.t > (this.phase2 ? 1.3 : 1.7)) this.setState("rise");
        break;
      case "rise": b.frame = "idle0"; b.y = lerp(GY - 105, 150, easeOut(Math.min(1, b.t / 0.6))); if (b.t > 0.6) this.setState("idle"); break;
      case "charge": {
        b.frame = "charge";
        const tx = b.side < 0 ? 110 : V.W - 110;
        b.x = lerp(b.x, tx, dt * 5); b.y = lerp(b.y, GY - 150, dt * 4);
        if (b.t > 1.05) { this.setState("fire"); audio.play("laserbig"); this.shake = 0.6; }
        break;
      }
      case "fire": {
        b.frame = "laser";
        const y = this.beam.y;
        const box = { x: 0, y: y - 13, w: V.W, h: 26 };
        if (overlap(p, box)) p.damage(-b.side);
        if (b.t > 0.75) { this.beam = null; this.setState("rise2"); }
        break;
      }
      case "rise2": b.frame = "idle1"; b.y = lerp(b.y, 150, dt * 4); if (b.t > 0.6) this.setState("idle"); break;
      case "summon":
        b.frame = "laugh";
        if (b.t > 0.5 && !b.spawned) {
          b.spawned = true; audio.play("horn");
          for (let i = 0; i < 2; i++) this.bots.push({ x: 120 + Math.random() * (V.W - 240), y: -60 - i * 120, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, t: 0, alive: true });
        }
        if (b.t > 1.1) this.setState("idle");
        break;
      case "breakout": {
        b.frame = "hurt"; b.y = lerp(b.y, 150, dt * 3);
        if (b.t > 1.4 && !this.gr) {
          this.cage.broken = true; audio.play("crumble"); fx.smoke(this.cage.x, this.cage.y + 60, 0.7);
          this.gr = { x: this.cage.x, y: this.cage.y + 120, tx: V.W - 90, t: 0, throwCd: 1.5, frame: "free", jump: 0 };
          dialog.say("g", "g_laugh", "I'M OUT!! Catch my tokens — fill the meter and I'll go FULL GREMLIN!");
          audio.intensity = 1;
        }
        if (b.t > 2.6) this.setState("idle");
        break;
      }
      case "dying":
        b.frame = "hurt"; b.x += Math.sin(this.t * 60) * 2; b.y = lerp(b.y, 200, dt * 2);
        if (Math.random() < dt * 10) { fx.add(["smoke0", "smoke1", "smoke2"], b.x + (Math.random() - 0.5) * 160, b.y + (Math.random() - 0.5) * 160, { scale: 0.8, fps: 10 }); audio.play("boom"); this.shake = 0.6; }
        if (b.t > 2.4) { this.setState("dying2"); this.flash = 1; audio.play("bighit"); fx.add(["smoke0", "smoke1", "smoke2"], b.x, b.y, { scale: 2.2, fps: 6 }); }
        break;
      case "dying2":
        b.frame = "dead";
        if (b.t > 1.6 && !this.button) {
          this.button = { x: V.W / 2, y: GY, t: 0 };
          dialog.say("g", "g_happy", "He's down! Smash the RELEASE button — it frees every token he stole!");
          b.st = "gone";
        }
        break;
    }

    // ---------------------------------------------------------- ударные волны
    for (const w of this.waves) { w.x += w.dir * 430 * dt; const box = { x: w.x - 18, y: GY - 28, w: 36, h: 28 }; if (overlap(p, box)) p.damage(w.dir); }
    this.waves = this.waves.filter((w) => w.x > -50 && w.x < V.W + 50);

    // ---------------------------------------------------------- боты
    for (const bt of this.bots) {
      bt.t += dt;
      if (bt.y < GY) { bt.vy += 1800 * dt; bt.y = Math.min(GY, bt.y + bt.vy * dt); }
      else { bt.x += bt.dir * 90 * dt; if (bt.x < 60) bt.dir = 1; if (bt.x > V.W - 60) bt.dir = -1; }
      const box = { x: bt.x - 26, y: bt.y - 70, w: 52, h: 70 };
      if ((atk && overlap(atk, box)) || (p.vy > 50 && p.bottom - p.vy * dt <= box.y + 14 && overlap(p, box))) {
        bt.alive = false; audio.play("punch"); fx.smoke(bt.x, bt.y - 40); popups.add("BONK!", bt.x, bt.y - 90, { col: "#fff" });
        if (p.vy > 0) p.vy = -600;
        this.coins.push({ x: bt.x, y: bt.y - 50, vx: 0, vy: -400, t: 0 });
      } else if (overlap(p, box)) p.damage(Math.sign(p.cx - bt.x) || 1);
    }
    this.bots = this.bots.filter((x) => x.alive);

    // ---------------------------------------------------------- гремлин помогает
    const gr = this.gr;
    if (gr) {
      gr.t += dt;
      if (gr.t < 0.8) { const k = gr.t / 0.8; gr.x = lerp(this.cage.x, gr.tx, k); gr.y = lerp(this.cage.y + 120, GY, k) - Math.sin(k * Math.PI) * 120; gr.frame = "free"; }
      else if (!this.odSeq) {
        gr.y = GY; gr.throwCd -= dt;
        gr.frame = gr.throwT > 0 ? "throw" : "dance" + (Math.floor(this.t * 4) % 2);
        gr.throwT = Math.max(0, (gr.throwT || 0) - dt);
        if (gr.throwCd <= 0 && b.st !== "gone" && b.st !== "dying" && b.st !== "dying2" && !this.odReady) {
          gr.throwCd = 2.2; gr.throwT = 0.4; audio.play("throw");
          const tx = clamp(p.cx, 40, V.W - 40), T = 0.9, sx = gr.x - 30, sy = GY - 70, ty = p.y + 40;
          this.coins.push({ x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy - 0.5 * 1400 * T * T) / T, t: 0, thrown: true });
        }
      }
    }
    for (const c of this.coins) {
      c.t += dt; c.vy += 1400 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.y > GY - 14) { c.y = GY - 14; c.vy *= -0.35; c.vx *= 0.7; }
      if (Math.hypot(c.x - p.cx, c.y - (p.y + 40)) < 44) {
        c.dead = true; audio.play("coin"); fx.shine(c.x, c.y); this.g.tokens++;
        if (this.phase2 && !this.odReady) { this.od = Math.min(5, this.od + 1); if (this.od >= 5) { this.odReady = true; audio.play("charge"); popups.add("GREMLIN READY!", V.W / 2, 140, { screen: true, size: 40, col: "#7dff6a", dur: 1.6, vy: 0 }); } }
      }
      if (c.t > 7) c.dead = true;
    }
    this.coins = this.coins.filter((c) => !c.dead);

    // ---------------------------------------------------------- суперудар гремлина
    if (this.odReady && !this.odSeq && I.pressed("attack") && b.st !== "dying" && b.st !== "dying2" && b.st !== "gone") {
      this.odReady = false; this.od = 0; this.odSeq = { t: 0, hit: false };
      audio.play("transform"); p.atkT = 0;
    }
    if (this.odSeq) {
      const s = this.odSeq; s.t += dt;
      gr.frame = "od" + Math.min(4, Math.floor(s.t / 0.32));
      if (s.t > 1.6 && !s.hit) { s.hit = true; audio.play("laserbig"); audio.play("bighit"); this.shake = 1.5; this.flash = 0.6; this.hitBoss(4, true); }
      if (s.t > 2.4) this.odSeq = null;
    }

    // ---------------------------------------------------------- кнопка RELEASE
    if (this.button) {
      const bt = this.button; bt.t += dt;
      const box = { x: bt.x - 40, y: bt.y - 50, w: 80, h: 50 };
      if (!bt.pressed && (overlap(p, box) || (atk && overlap(atk, box)))) {
        bt.pressed = true; audio.play("smash"); audio.play("win"); this.flash = 1.5; this.shake = 1;
        for (let i = 0; i < 30; i++) this.coins.push({ x: bt.x, y: bt.y - 40, vx: (Math.random() - 0.5) * 900, vy: -500 - Math.random() * 700, t: 0 });
        setTimeout(() => this.g.ending(), 2200);
      }
    }
  }

  next() {
    const b = this.b;
    if (b.hp <= MAXHP / 2 && !this.phase2) { this.phase2 = true; this.setState("breakout"); return; }
    const opts = ["aim", "aim", "charge", "charge"];
    if (this.bots.length < 2) opts.push("summon");
    let st = opts[Math.floor(Math.random() * opts.length)];
    if (st === b.last && Math.random() < 0.6) st = st === "aim" ? "charge" : "aim";
    b.last = st;
    if (st === "charge") {
      b.side = this.p.cx > V.W / 2 ? -1 : 1;
      const low = Math.random() < 0.5;
      this.beam = { y: low ? GY - 22 : GY - 68, low };
      if (!this.hintShown[low ? "low" : "high"]) { this.hintShown[low ? "low" : "high"] = 1; popups.add(low ? "LOW BEAM — JUMP!" : "HIGH BEAM — SLIDE / DUCK (↓)!", V.W / 2, 190, { screen: true, size: 30, col: "#ff5a5a", dur: 1.5, vy: 0 }); }
      audio.play("charge");
    }
    if (st === "summon") b.spawned = false;
    this.setState(st);
  }

  hitBoss(n, big) {
    const b = this.b;
    b.hp = Math.max(0, b.hp - n); b.hurt = 0.3; b.inv = 0.28; audio.play(big ? "ko" : "punch"); this.shake = big ? 1.4 : 0.5;
    fx.hit(b.x + (Math.random() - 0.5) * 60, b.y - 20);
    popups.add(big ? "GREMLIN MODE!!" : ["CRACK!", "BONK!", "CTRL+Z!", "404!"][Math.floor(Math.random() * 4)], b.x, b.y - 120, { col: big ? "#7dff6a" : "#fff", size: big ? 40 : 28 });
    if (b.hp <= 0) { this.setState("dying"); this.waves = []; this.beam = null; this.bots = []; dialog.clear(); dialog.say("o", "hurt", "I... am... SOTA... I am... s-s-so... ta...") ; audio.stopMusic(); }
  }

  draw() {
    const sx = (Math.random() - 0.5) * this.shake * 16, sy = (Math.random() - 0.5) * this.shake * 10;
    ctx.save(); ctx.translate(sx, sy);
    cover(A.img.bg_vault, 1.08, 0, -20);
    ctx.fillStyle = "rgba(20,0,0,0.25)"; ctx.fillRect(0, 0, V.W, V.H);
    // пол
    wobRect(-20, GY, V.W + 40, 200, "#2a2a30", { seed: 4, line: 4 });
    wobRect(-20, GY - 2, V.W + 40, 18, "#d92a2a", { seed: 5, line: 3 });
    const b = this.b, p = this.p;

    // клетка на цепи
    const c = this.cage;
    wobLine(c.x, -10, c.x, c.y - 60, "#555", 6, 3);
    if (!c.broken) spr("grem", this.b.st === "breakout" && this.b.t > 0.2 ? "cage3" : this.b.hp < MAXHP * 0.75 ? "cage2" : "cage" + (Math.floor(this.t * 2) % 2), c.x, c.y + 100 + Math.sin(this.t * 2) * 4, { scale: 0.85, rot: Math.sin(this.t * 1.5) * 0.06 });
    else spr("items", "cage", c.x, c.y + 80, { scale: 0.6, alpha: 0.5, rot: 0.3 });

    // тень и предупреждение удара
    if (b.st === "aim") { const k = clamp(b.t / 1, 0, 1); ctx.fillStyle = `rgba(255,40,40,${0.25 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(b.x, GY + 4, 60 + k * 30, 12, 0, 0, 7); ctx.fill(); }
    // лазер
    if (this.beam) {
      const y = this.beam.y;
      if (b.st === "charge") { ctx.setLineDash([14, 10]); ctx.strokeStyle = Math.floor(this.t * 12) % 2 ? "#ff3a3a" : "#ffd23c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(V.W, y); ctx.stroke(); ctx.setLineDash([]); }
      if (b.st === "fire") {
        ctx.fillStyle = "rgba(255,40,40,0.35)"; ctx.fillRect(0, y - 22, V.W, 44);
        ctx.fillStyle = "#ff3a3a"; ctx.fillRect(0, y - 12, V.W, 24); ctx.fillStyle = "#fff"; ctx.fillRect(0, y - 5, V.W, 10);
      }
    }
    // босс
    if (b.st !== "gone") {
      const s = 230 / 199;
      if (b.hurt > 0) { ctx.save(); ctx.filter = "brightness(2.2)"; }
      spr("boss", b.frame, b.x, b.y, { anchor: "center", scale: s, flip: b.st === "fire" || b.st === "charge" ? b.side < 0 : false });
      if (b.hurt > 0) ctx.restore();
      if (b.st === "stuck") for (let i = 0; i < 3; i++) spr("items", "spark1", b.x + Math.cos(this.t * 5 + i * 2.1) * 70, b.y - 110 + Math.sin(this.t * 5 + i * 2.1) * 14, { anchor: "center", scale: 0.25 });
    }
    // волны
    for (const w of this.waves) { ctx.save(); ctx.translate(w.x, GY - 4); ctx.scale(w.dir, 1); spr("items", "land", 0, 0, { scale: 0.35 }); ctx.restore(); }
    for (const bt of this.bots) spr("enemy", "bot" + (Math.floor(bt.t * 6) % 2), bt.x, bt.y, { scale: 78 / 144, flip: bt.dir < 0 });
    for (const cn of this.coins) spr("items", "coin" + (Math.floor(cn.t * 10) % 4), cn.x, cn.y, { anchor: "center", scale: 0.32 });
    // кнопка
    if (this.button) { spr("items", "button", this.button.x, this.button.y + 4, { scale: 0.7 * (this.button.pressed ? 0.9 : 1 + Math.sin(this.t * 6) * 0.04) }); if (!this.button.pressed) txt("RELEASE", this.button.x, this.button.y - 120, { size: 34, color: "#ffe14a", font: "Bang" }); }
    // гремлин
    const gr = this.gr;
    if (gr) {
      if (this.odSeq) {
        const s = this.odSeq;
        if (s.t > 1.4 && s.t < 2.2) {
          const k = clamp((s.t - 1.4) / 0.2, 0, 1);
          ctx.save(); ctx.globalAlpha = 0.9; ctx.lineCap = "round";
          ctx.strokeStyle = "#7dff6a"; ctx.lineWidth = 46 * k; ctx.beginPath(); ctx.moveTo(gr.x - 40, gr.y - 90); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 16 * k; ctx.stroke(); ctx.restore();
          spr("items", "zap", (gr.x + b.x) / 2, (gr.y - 90 + b.y) / 2, { anchor: "center", scale: 0.8, rot: Math.atan2(b.y - gr.y + 90, b.x - gr.x) });
        }
      }
      const odH = this.odSeq ? 120 + Math.min(1, this.odSeq.t / 1.4) * 150 : 0;
      const hgt = this.odSeq ? odH : gr.frame === "free" ? 110 : 96;
      spr("grem", gr.frame, gr.x, gr.y, { scale: hgt / frameSize("grem", gr.frame)[1], flip: true });
    }
    p.draw(0, 0);
    if (p.atkT > 0.04) { const k = 1 - p.atkT / 0.26; ctx.save(); ctx.translate(p.cx, p.y + 36); ctx.scale(p.face, 1); ctx.globalAlpha = 0.7 * (1 - k); ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(10, 0, 70, -1.3 + k * 0.4, 0.9 + k * 0.6); ctx.stroke(); ctx.restore(); }
    fx.draw(0, 0);
    popups.draw(0, 0, false);
    ctx.restore();

    // HUD
    drawHUD(this.g, p);
    if (b.st !== "gone" && b.st !== "intro") {
      const w = Math.min(520, V.W - 360), x = (V.W - w) / 2;
      txt("OMNI  ·  v99.9 (soon deprecated)", V.W / 2, 22, { size: 22, color: "#fff", font: "Bang" });
      wobRect(x, 38, w, 22, "#222", { seed: 2, line: 3, jit: 1 });
      ctx.fillStyle = "#ff3a3a"; ctx.fillRect(x + 3, 41, (w - 6) * (b.hp / MAXHP), 16);
    }
    if (this.phase2 && this.gr && b.st !== "gone") {
      const x = V.W - 230, y = 80;
      txt("GREMLIN METER", x + 105, y - 14, { size: 18, color: "#7dff6a", font: "Bang" });
      wobRect(x, y, 210, 26, "#111", { seed: 6, line: 3, jit: 1 });
      for (let i = 0; i < 5; i++) if (i < this.od) spr("items", "coin0", x + 22 + i * 41, y + 13, { anchor: "center", scale: 0.2 });
      if (this.odReady) txt("PRESS HIT (J / Z)!", V.W / 2, 110, { size: 34 + Math.sin(this.t * 10) * 3, color: "#7dff6a", font: "Bang" });
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, V.W, V.H); }
    popups.draw(0, 0, true);
    dialog.draw();
    drawPad();
  }
}
