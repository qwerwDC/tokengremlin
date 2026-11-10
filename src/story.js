// Титульный экран, философское вступление, кат-сцены, финал
import { ctx, V, I, A, spr, txt, wobRect, clamp, lerp, ease, easeOut, cover, frameSize, save } from "./core.js";
import { audio } from "./audio.js";
import { dialog, popups, drawFeed, button } from "./ui.js";
import { fx } from "./level.js";

// ================================================================== Титул
export class TitleScene {
  constructor(g) { this.g = g; }
  enter() { this.t = 0; this.sel = 0; audio.music("chill", true); I.padOn = false; }
  items() {
    const run = save.get("run", null);
    const out = [{ label: "▶  NEW GAME", fn: () => this.g.newGame() }];
    if (run && run.lvl !== undefined) out.push({ label: run.lvl >= 5 ? "CONTINUE · BOSS" : `CONTINUE · LEVEL ${run.lvl + 1}`, fn: () => this.g.continueGame(run) });
    out.push({ label: audio.musicOn ? "♪  MUSIC: ON" : "♪  MUSIC: OFF", fn: () => { audio.musicOn = !audio.musicOn; audio.sfxOn = audio.musicOn; save.set("music", audio.musicOn); audio.musicOn ? audio.music("chill", true) : audio.stopMusic(); } });
    return out;
  }
  update(dt) {
    this.t += dt;
    const it = this.items();
    if (I.pressed("down")) { this.sel = (this.sel + 1) % it.length; audio.play("tick"); }
    if (I.pressed("up")) { this.sel = (this.sel + it.length - 1) % it.length; audio.play("tick"); }
    if (I.pressed("confirm")) { audio.play("box"); it[this.sel].fn(); }
    this.clicked = it;
  }
  draw() {
    const g = ctx.createLinearGradient(0, 0, 0, V.H);
    g.addColorStop(0, "#5a2aa8"); g.addColorStop(1, "#ff5ad8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
    cover(A.img.cover, 1.02 + Math.sin(this.t * 0.4) * 0.01, 0, 10);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(0, 0, V.W, V.H);
    const bob = Math.sin(this.t * 2) * 4;
    ctx.save(); ctx.translate(V.W / 2, 70 + bob); ctx.rotate(-0.03);
    txt("TOKEN GREMLIN", 0, 0, { size: 86, font: "Bang", color: "#ffe14a", stroke: 10 });
    ctx.restore();
    txt("THE RESCUE RUN", V.W / 2, 132 + bob, { size: 34, font: "Bang", color: "#fff", stroke: 6 });
    const it = this.items();
    it.forEach((o, i) => {
      const w = 300, x = V.W / 2 - w / 2, y = V.H - 70 - (it.length - i) * 62;
      if (button(o.label, x, y, w, 54, { selected: i === this.sel, size: 26, seed: 40 + i })) { this.sel = i; audio.play("box"); o.fn(); }
    });
    txt("a fan game made by @CacheCrow for @TokenGremlin", V.W / 2, V.H - 22, { size: 20, color: "#fff" });
  }
}

// ================================================================== Вступление про авторские права
const SLIDES = [
  { text: "Before we start — a small confession.", faces: ["h_tired"] },
  { text: "Somewhere on X lives @TokenGremlin. He reads every AI announcement before breakfast.", faces: ["g_happy"] },
  { text: "His avatar is borrowed from an old movie. Mine is borrowed from a famous space saga.", faces: ["g_wink", "h_smug"], q: true },
  { text: "But a game isn't a profile picture. If I put those characters in here, their owners could take it down... and repeat copyright strikes can cost me my account.", stamp: true },
  { text: "Copyright protects how a character LOOKS — the drawing, the design. Not the idea of a chaotic little guy who eats tokens.", faces: ["g_shock"] },
  { text: "So I redrew us. Same chaos. Same posts. New lines.", faces: ["g_laugh", "h_laugh"], big: true },
  { text: "Because what makes him Token Gremlin isn't his face. It's the tokens he eats and the news he shares.", faces: ["g_happy"] },
  { text: "Made by @CacheCrow, for @TokenGremlin. Thanks for the repost.", faces: ["h_happycry", "g_happy"], last: true },
];
export class IntroScene {
  constructor(g) { this.g = g; }
  enter() { this.i = 0; this.t = 0; this.shown = 0; audio.music("chill"); }
  update(dt) {
    this.t += dt;
    const s = SLIDES[this.i];
    const prev = Math.floor(this.shown);
    this.shown = Math.min(s.text.length, this.shown + dt * 40);
    if (Math.floor(this.shown) !== prev && prev % 3 === 0) audio.blip("s");
    const done = this.shown >= s.text.length;
    const auto = done && this.t > 1.6 + s.text.length * 0.045;
    if (I.pressed("pause")) return this.g.afterIntro();
    if (I.pressed("confirm") || I.tap || auto) {
      if (I.tap && I.tap.x > V.W - 150 && I.tap.y < 60) return this.g.afterIntro();
      if (!done) this.shown = s.text.length;
      else if (this.i < SLIDES.length - 1) { this.i++; this.t = 0; this.shown = 0; audio.play("tick"); }
      else this.g.afterIntro();
    }
  }
  draw() {
    ctx.fillStyle = "#15121f"; ctx.fillRect(0, 0, V.W, V.H);
    // «тетрадные» линии
    ctx.strokeStyle = "rgba(120,160,255,0.08)"; ctx.lineWidth = 2;
    for (let y = 40; y < V.H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y + Math.sin(V.T * 2 + y) * 0.8); ctx.lineTo(V.W, y); ctx.stroke(); }
    const s = SLIDES[this.i];
    const pop = easeOut(clamp(this.t / 0.4, 0, 1));
    // картинки
    const cy = 175;
    if (s.faces) {
      const n = s.faces.length, sz = s.big ? 0.95 : 0.75;
      s.faces.forEach((f, k) => {
        const x = V.W / 2 + (k - (n - 1) / 2) * (s.big ? 230 : 200);
        ctx.save(); ctx.translate(x, cy + (1 - pop) * 40); ctx.rotate(Math.sin(V.T * 2 + k) * 0.04);
        ctx.globalAlpha = pop;
        wobRect(-95 * sz, -95 * sz, 190 * sz, 190 * sz, k % 2 ? "#ffe9e9" : "#ece6ff", { seed: 10 + k, boil: true, shadow: true });
        ctx.save(); ctx.beginPath(); ctx.rect(-92 * sz, -92 * sz, 184 * sz, 184 * sz); ctx.clip();
        spr("faces", f, 0, 6, { anchor: "center", scale: sz * 0.95 });
        ctx.restore();
        if (s.q) txt("?", 70 * sz, -80 * sz, { size: 54, font: "Bang", color: "#ffe14a" });
        ctx.restore();
      });
      if (s.big) for (let k = 0; k < 4; k++) spr("items", "spark1", V.W / 2 + Math.cos(V.T * 2 + k * 1.6) * 260, cy + Math.sin(V.T * 3 + k) * 90, { anchor: "center", scale: 0.3 });
    }
    if (s.stamp) {
      ctx.save(); ctx.translate(V.W / 2, cy); ctx.rotate(-0.12); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      ctx.strokeStyle = "#ff3a3a"; ctx.lineWidth = 8; ctx.strokeRect(-210, -60, 420, 120);
      txt("© TAKEDOWN", 0, -8, { size: 66, font: "Bang", color: "#ff3a3a", stroke: 0 });
      txt("strike 1 of 3", 0, 40, { size: 24, color: "#ff3a3a", stroke: 0 });
      ctx.restore();
    }
    ctx.font = "30px Hand";
    txt(s.text.slice(0, Math.floor(this.shown)), V.W / 2, 330, { size: 30, color: "#fff", maxW: Math.min(780, V.W - 80), stroke: 0, base: "top", lh: 1.15 });
    // точки-прогресс
    SLIDES.forEach((_, k) => { ctx.fillStyle = k === this.i ? "#ffe14a" : "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(V.W / 2 + (k - 3.5) * 22, V.H - 28, 6, 0, 7); ctx.fill(); });
    txt("SKIP ▶▶", V.W - 70, 30, { size: 22, color: "rgba(255,255,255,0.7)", stroke: 0, font: "Bang" });
    if (this.shown >= s.text.length) txt(s.last ? "press SPACE / tap to begin" : "▶", V.W / 2, V.H - 62, { size: 22, color: "#ffe14a", stroke: 0 });
  }
}

// ================================================================== База для кат-сцен
class Cut {
  constructor(g) { this.g = g; }
  base() {
    this.t = 0; this.ev = []; this.ei = 0; this.actors = {}; this.posts = []; this.feed = { on: false, k: 0 }; this.caption = null; this.flash = 0; this.shake = 0;
    dialog.clear(); popups.list = []; fx.list = [];
  }
  at(t, fn) { this.ev.push([t, fn]); }
  actor(id, o) { this.actors[id] = { fps: 6, h: 200, alpha: 1, ...o, t: 0 }; return this.actors[id]; }
  move(id, x, y, dur, o = {}) { const a = this.actors[id]; a.tw = { fx: a.x, fy: a.y, x, y, dur, t: 0, arc: o.arc || 0, scaleTo: o.scaleTo, h0: a.h }; }
  post(who, text, extra = {}) { this.posts.push({ who, text, at: this.t, time: "now", ...extra }); audio.play("pop"); }
  update(dt) {
    this.t += dt;
    dialog.update(dt); popups.update(dt); fx.update(dt);
    this.flash = Math.max(0, this.flash - dt * 1.5); this.shake = Math.max(0, this.shake - dt * 2);
    this.feed.k = clamp(this.feed.k + (this.feed.on ? dt : -dt) * 3, 0, 1);
    while (this.ei < this.ev.length && this.ev[this.ei][0] <= this.t) this.ev[this.ei++][1]();
    for (const a of Object.values(this.actors)) {
      a.t += dt;
      if (a.tw) {
        const w = a.tw; w.t += dt; const k = ease(clamp(w.t / w.dur, 0, 1));
        a.x = lerp(w.fx, w.x, k); a.y = lerp(w.fy, w.y, k) - Math.sin(k * Math.PI) * w.arc;
        if (w.scaleTo !== undefined) a.h = lerp(w.h0, w.scaleTo, k);
        if (w.t >= w.dur) a.tw = null;
      }
    }
    if (I.pressed("pause") || (I.tap && I.tap.x > V.W - 150 && I.tap.y < 60)) this.done();
  }
  drawStage(img) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake * 18, (Math.random() - 0.5) * this.shake * 12);
    const c = cover(img);
    this.c = c;
    for (const a of Object.values(this.actors)) {
      if (a.hide) continue;
      const f = a.frames[Math.floor(a.t * a.fps) % a.frames.length];
      const [, fh] = frameSize(a.atlas, f);
      spr(a.atlas, f, c.x + a.x * c.s * (1280 / img.width), c.y + a.y * c.s * (720 / img.height), { scale: (a.h * c.s) / fh * (1280 / img.width), flip: a.flip, alpha: a.alpha, rot: a.rot || 0, anchor: a.anchor });
    }
    fx.draw(0, 0);
    popups.draw(0, 0, false);
    ctx.restore();
  }
  toScreen(x, y) { const c = this.c; return [c.x + x * c.s, c.y + y * c.s]; }
  drawOverlay(feedX = 18) {
    if (this.feed.k > 0) {
      const w = Math.min(380, V.W * 0.4), h = V.H - 70;
      const x = lerp(feedX < V.W / 2 ? -w - 30 : V.W + 30, feedX, easeOut(this.feed.k));
      drawFeed(x, 30, w, h, this.posts, this.t);
    }
    if (this.caption) {
      const a = clamp(Math.min((this.t - this.caption.t) / 0.4, (this.caption.t + this.caption.dur - this.t) / 0.4), 0, 1);
      if (a > 0) { ctx.globalAlpha = a; wobRect(V.W / 2 - 280, 14, 560, 46, "#111", { seed: 70, line: 3 }); txt(this.caption.text, V.W / 2, 38, { size: 24, color: "#fff", stroke: 0 }); ctx.globalAlpha = 1; }
    }
    popups.draw(0, 0, true);
    dialog.draw();
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, V.W, V.H); }
    txt("SKIP ▶▶", V.W - 70, 30, { size: 22, color: "rgba(255,255,255,0.8)", font: "Bang" });
  }
  cap(text, dur = 3) { this.caption = { text, t: this.t, dur }; }
}

// ================================================================== Похищение
export class KidnapScene extends Cut {
  enter() {
    this.base();
    audio.music("chill", true);
    const G = this.actor("grem", { atlas: "grem", frames: ["type0", "type1"], x: 700, y: 690, h: 200, fps: 5 });
    this.at(0.1, () => this.cap("Somewhere on the internet · 3:14 AM", 4));
    this.at(0.8, () => { this.feed.on = true; this.post("gremlin", "BREAKING: a new model just dropped and it's already arguing with me 👀", { likes: 1840, rts: 312, replies: 96, views: 88000, time: "2h" }); });
    this.at(2.6, () => this.post("gremlin", "Training robots takes more than collecting hours of video. You need to make sense of what's happening in it.", { likes: 920, rts: 140, replies: 41, views: 31000, time: "30m" }));
    this.at(4.4, () => this.post("gremlin", "Big leak tomorrow. You didn't hear it from me 🤫", { likes: 2600, rts: 480, replies: 210, views: 120000 }));
    this.at(6.6, () => { this.feed.on = false; G.frames = ["eat0", "eat1"]; G.fps = 4; G.h = 230; });
    this.at(7.0, () => { dialog.say("g", "g_laugh", "Mmm... fresh tokens. Extra crunchy."); });
    [7.1, 7.6, 8.1, 8.6].forEach((t) => this.at(t, () => audio.play("crumble")));
    this.at(10.0, () => { this.shake = 0.5; audio.play("block"); popups.add("KNOCK", V.W * 0.82, V.H * 0.45, { screen: true, size: 46, dur: 0.8, vy: 0 }); });
    this.at(10.5, () => { this.shake = 0.5; audio.play("block"); popups.add("KNOCK", V.W * 0.86, V.H * 0.35, { screen: true, size: 46, dur: 0.8, vy: 0 }); G.frames = ["scared"]; G.h = 230; });
    this.at(11.2, () => dialog.say("g", "g_shock", "...who orders delivery at 3 AM?"));
    this.at(13.6, () => { this.shake = 1.5; audio.play("boom"); this.actor("kick", { atlas: "enemy", frames: ["kickdoor"], x: 1110, y: 700, h: 300, flip: true }); });
    this.at(14.3, () => { delete this.actors.kick; this.actor("door", { atlas: "enemy", frames: ["brokendoor"], x: 1040, y: 715, h: 130 }); });
    this.at(14.4, () => { G.frames = ["grabbed", "kick"]; G.fps = 6; dialog.clear(); dialog.say("g", "g_scream", "HEY!! PUT ME DOWN!! I HAVE RIGHTS! I HAVE FOLLOWERS!"); this.actor("bot", { atlas: "enemy", frames: ["botgrab"], x: 880, y: 700, h: 220, flip: true }); });
    this.at(16.0, () => {
      delete this.actors.grem; delete this.actors.bot; audio.play("whoosh");
      this.actor("sack", { atlas: "enemy", frames: ["sack0", "sack1"], x: 760, y: 700, h: 250, fps: 8 });
      this.move("sack", 1500, 700, 2.2);
      this.actor("laptop", { atlas: "enemy", frames: ["laptopfall"], x: 640, y: 600, h: 150 });
      this.move("laptop", 640, 715, 0.4);
    });
    this.at(16.5, () => { this.actors.laptop.frames = ["laptopcrash"]; this.actors.laptop.h = 110; audio.play("smash"); this.shake = 0.6; });
    this.at(18.6, () => { this.feed.on = true; });
    this.at(19.0, () => this.post("gremlinScared", "they're coming for me... 🧵 1/", { likes: 12, rts: 3, replies: 40, views: 900 }));
    this.at(22.0, () => this.cap("1/ ... the thread never continued.", 3.2));
    this.at(25.4, () => this.done());
  }
  done() { if (this.ended) return; this.ended = true; this.g.go("hero"); }
  draw() { this.drawStage(A.img.room_gremlin); this.drawOverlay(18); }
}

// ================================================================== Герой видит пост
export class HeroScene extends Cut {
  enter() {
    this.base();
    const H = this.actor("hero", { atlas: "herocut", frames: ["bed0", "bed1"], x: 330, y: 505, h: 165, fps: 1.5 });
    this.at(0.1, () => this.cap("Meanwhile · 3:17 AM", 3));
    this.at(0.6, () => { this.feed.on = true; this.posts.push({ who: "bot", text: "10 AI tools that will replace your job by Friday 🚀🧵", at: 0, likes: 4, rts: 1, replies: 0, views: 300, time: "5m" }); });
    this.at(1.8, () => this.post("gremlinScared", "they're coming for me... 🧵 1/", { likes: 412, rts: 96, replies: 380, views: 41000, time: "3m" }));
    this.at(3.2, () => this.post("reply", "ratio + you're probably just doing a bit", { likes: 2, replies: 0, views: 90 }));
    this.at(4.3, () => this.post("bot", "Great insight! 🚀 Follow for more AI tips", { likes: 0, views: 12 }));
    this.at(5.6, () => { H.frames = ["bedshock"]; H.h = 190; audio.play("beep"); popups.add("!", V.W * 0.32, V.H * 0.42, { screen: true, size: 80, dur: 1, vy: -20 }); });
    this.at(6.0, () => this.post("meShock", "wait... is he ok?? he reposted me YESTERDAY", { likes: 3, views: 40 }));
    this.at(7.2, () => dialog.say("h", "h_shock", "Bots don't post at 3 AM like that. He's actually in trouble."));
    this.at(10.6, () => { this.feed.on = false; dialog.say("h", "h_determined", "Hold on, gremlin. I'm coming."); });
    this.at(13.2, () => { H.frames = ["panicrun"]; H.h = 200; H.y = 640; H.x = 420; H.fps = 8; this.move("hero", 820, 640, 1.1); audio.play("dash"); });
    this.at(13.5, () => { this.glow = this.t; audio.play("charge"); });
    this.at(14.4, () => { H.frames = ["sucked"]; H.h = 130; H.y = 470; H.rot = -0.5; this.move("hero", 1040, 230, 1.0, { scaleTo: 10 }); audio.play("transform"); });
    this.at(15.4, () => { this.flash = 1.4; H.hide = true; audio.play("whoosh"); });
    this.at(16.2, () => this.done());
  }
  done() { if (this.ended) return; this.ended = true; this.g.go("vortex"); }
  draw() {
    this.drawStage(A.img.room_hero);
    if (this.glow) {
      const k = clamp((this.t - this.glow) / 2, 0, 1);
      const [x, y] = this.toScreen(1040, 210);
      const r = ctx.createRadialGradient(x, y, 10, x, y, 80 + 500 * k);
      r.addColorStop(0, `rgba(180,255,170,${0.9 * k})`); r.addColorStop(0.5, `rgba(176,74,224,${0.5 * k})`); r.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = r; ctx.fillRect(0, 0, V.W, V.H);
    }
    this.drawOverlay(V.W - Math.min(380, V.W * 0.4) - 18);
  }
}

// ================================================================== Затягивает в компьютер
export class VortexScene {
  constructor(g) { this.g = g; }
  enter() { this.t = 0; audio.play("whoosh"); audio.play("transform"); }
  update(dt) { this.t += dt; if (this.t > 3.6 || I.pressed("pause") || (I.tap && this.t > 0.8)) this.g.startLevel(0); }
  draw() {
    ctx.fillStyle = "#1a0b2e"; ctx.fillRect(0, 0, V.W, V.H);
    ctx.save(); ctx.translate(V.W / 2, V.H / 2); ctx.rotate(this.t * 1.4); ctx.scale(1.3 + this.t * 0.25, 1.3 + this.t * 0.25);
    const im = A.img.vortex; if (im) ctx.drawImage(im, -im.width * 0.45, -im.height * 0.45, im.width * 0.9, im.height * 0.9);
    ctx.restore();
    const k = clamp(this.t / 3.2, 0, 1);
    const ang = this.t * 5, r = 260 * (1 - k);
    spr("herocut", "tinyspin", V.W / 2 + Math.cos(ang) * r, V.H / 2 + Math.sin(ang) * r * 0.6, { anchor: "center", scale: 1.3 * (1 - k * 0.85), rot: this.t * 6 });
    txt("ENTERING THE TIMELINE...", V.W / 2, V.H - 60, { size: 40, font: "Bang", color: "#7dff6a" });
    if (this.t < 0.6) { ctx.fillStyle = `rgba(255,255,255,${1 - this.t / 0.6})`; ctx.fillRect(0, 0, V.W, V.H); }
  }
}

// ================================================================== Финал
export class EndingScene extends Cut {
  enter() {
    this.base();
    this.flash = 1.5;
    audio.music("ending", true);
    const g = this.g;
    const H = this.actor("hero", { atlas: "hero", frames: ["win"], x: 470, y: 695, h: 230 });
    const G = this.actor("grem", { atlas: "grem", frames: ["cheer"], x: 720, y: 695, h: 170, flip: true });
    this.actor("door", { atlas: "enemy", frames: ["brokendoor"], x: 1040, y: 715, h: 130 });
    this.confetti = true;
    this.at(0.5, () => this.cap("Back home · 4:02 AM", 3));
    this.at(0.9, () => dialog.say("g", "g_happy", "You... you actually came for me??"));
    this.at(4.0, () => dialog.say("h", "h_smug", "You reposted me. That's what friends do."));
    this.at(7.0, () => dialog.say("g", "g_laugh", "Then hold my tokens. I've got a thread to post."));
    this.at(9.6, () => { G.frames = ["hifive"]; H.frames = ["dance0", "dance1"]; H.fps = 4; this.move("grem", 640, 695, 0.3); audio.play("punch"); popups.add("HIGH FIVE!", V.W / 2, V.H * 0.35, { screen: true, size: 56, vy: -10, dur: 1.4 }); for (let i = 0; i < 6; i++) fx.shine(V.W / 2 + (Math.random() - 0.5) * 200, V.H * 0.45 + (Math.random() - 0.5) * 120); });
    this.at(10.6, () => { G.frames = ["dance0", "dance1"]; G.fps = 4; });
    this.at(11.2, () => { this.feed.on = true; this.post("gremlinHappy", "I'm FREE!! Thanks @CacheCrow 🙏 OMNI has been deprecated. Leaks thread below 🧵", { likes: 48000, rts: 9100, replies: 2200, views: 2400000, liked: true }); });
    this.at(12.8, () => this.post("me", "anytime 🫡", { likes: 3100, replies: 140, views: 90000, liked: true }));
    this.at(14.2, () => g.leaks.size >= 15
      ? this.post("gremlin", "2/ All 15 leaks recovered. Every. Single. One. OMNI is in shambles.", { likes: 21000, rts: 5000, views: 900000 })
      : this.post("gremlin", `2/ We recovered ${g.leaks.size}/15 leaks. The rest are still out there... 👀`, { likes: 9000, rts: 1200, views: 400000 }));
    this.at(15.4, () => this.post("omni", "service temporarily unavailable", { likes: 1, replies: 9000, views: 3000000 }));
    this.at(19.5, () => this.done());
  }
  update(dt) {
    super.update(dt);
    if (this.confetti && Math.random() < dt * 14) fx.add(["spark0", "spark1"], Math.random() * V.W, -10, { scale: 0.22 + Math.random() * 0.15, fps: 1.2, vy: 120 + Math.random() * 100, rot: Math.random() * 6 });
  }
  done() { if (this.ended) return; this.ended = true; this.g.go("stats"); }
  draw() { this.drawStage(A.img.room_gremlin); this.drawOverlay(V.W - Math.min(380, V.W * 0.4) - 18); }
}

// ================================================================== Итоги + поделиться
export class StatsScene {
  constructor(g) { this.g = g; }
  enter() { this.t = 0; I.padOn = false; this.g.finished(); }
  update(dt) {
    this.t += dt;
    if (Math.random() < dt * 10) fx.add(["spark0", "spark1"], Math.random() * V.W, -10, { scale: 0.25, fps: 1.2, vy: 140, rot: Math.random() * 6 });
    fx.update(dt);
    if (I.pressed("confirm") && this.t > 1) this.share();
    if (I.pressed("pause")) this.g.go("title");
  }
  shareText() {
    const g = this.g;
    return `I rescued @TokenGremlin from OMNI in ${fmtTime(g.time)} 🪙 ${g.tokens} tokens · ${g.leaks.size}/15 leaks found. Game by @CacheCrow — can you beat it?`;
  }
  share() {
    const url = location.href.split("?")[0].split("#")[0];
    window.open("https://x.com/intent/tweet?text=" + encodeURIComponent(this.shareText()) + "&url=" + encodeURIComponent(url), "_blank");
  }
  draw() {
    const g = this.g;
    cover(A.img.ending, 1.1);
    ctx.fillStyle = "rgba(10,5,25,0.62)"; ctx.fillRect(0, 0, V.W, V.H);
    const w = 420, x = V.W - w - 26, y = 24;
    // «полароид» с финальной картинкой
    const im = A.img.ending;
    if (im) {
      const pw = Math.min(x - 50, 620), ph = pw * 9 / 16, px = (x - pw) / 2, py = (V.H - ph) / 2 - 20;
      ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate(-0.035 + Math.sin(this.t) * 0.005);
      wobRect(-pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 70, "#fffdf6", { seed: 33, shadow: true });
      ctx.drawImage(im, -pw / 2, -ph / 2, pw, ph);
      txt("4:02 AM · back online 🪙", 0, ph / 2 + 28, { size: 26, color: "#333", stroke: 0 });
      ctx.restore();
    }
    fx.draw(0, 0);
    wobRect(x, y, w, V.H - 48, "rgba(255,253,243,0.97)", { seed: 90, boil: true, shadow: true });
    txt("GREMLIN RESCUED!", x + w / 2, y + 40, { size: 40, font: "Bang", color: "#ffd23c", stroke: 6 });
    const rank = g.deaths === 0 ? "Zero-Shot Legend" : g.deaths < 4 ? "Certified Gremlin Saver" : g.deaths < 10 ? "Fine-Tuned Hero" : "Needs More Training (but did it!)";
    const rows = [["Time", fmtTime(g.time)], ["Tokens", g.tokens], ["Leaks found", `${g.leaks.size} / 15`], ["Bots bonked", g.kills], ["Respawns", g.deaths]];
    rows.forEach(([k, v], i) => { txt(k, x + 36, y + 88 + i * 32, { size: 24, color: "#444", stroke: 0, align: "left" }); txt(String(v), x + w - 36, y + 88 + i * 32, { size: 26, color: "#111", stroke: 0, align: "right", font: "Bang" }); });
    txt(rank, x + w / 2, y + 250, { size: 26, color: "#8a3fd1", stroke: 0, font: "Bang" });
    if (button("SHARE ON X", x + 30, y + 274, w - 60, 50, { color: "#1d9bf0", size: 28, seed: 7 })) this.share();
    if (button("PLAY AGAIN", x + 30, y + 334, w - 60, 42, { size: 24, seed: 8 })) this.g.go("title");
    // карточки авторов
    const card = (cx, face, label, handle) => {
      wobRect(cx - 88, V.H - 120, 176, 76, "#fff", { seed: cx, line: 3 });
      ctx.save(); ctx.beginPath(); ctx.arc(cx - 54, V.H - 82, 26, 0, 7); ctx.fillStyle = "#e9e3ff"; ctx.fill(); ctx.clip();
      spr("faces", face, cx - 54, V.H - 76, { anchor: "center", scale: 0.27 }); ctx.restore();
      txt(label, cx + 18, V.H - 100, { size: 15, color: "#777", stroke: 0 });
      txt(handle, cx + 18, V.H - 76, { size: 19, color: "#1d9bf0", stroke: 0, font: "Bang" });
      if (I.tap && Math.abs(I.tap.x - cx) < 88 && I.tap.y > V.H - 120 && I.tap.y < V.H - 44) window.open("https://x.com/" + handle.slice(1), "_blank");
    };
    card(x + w / 2 - 98, "h_smug", "made by", "@CacheCrow");
    card(x + w / 2 + 98, "g_happy", "made for", "@TokenGremlin");
  }
}

export function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, "0")}`; }
