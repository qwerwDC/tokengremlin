// Точка входа: менеджер сцен, пауза, сохранения, главный цикл
import { ctx, V, I, resize, loadAssets, txt, wobRect, save, clamp, drawPad } from "./core.js";
import { audio } from "./audio.js";
import { dialog, button } from "./ui.js";
import { LevelScene } from "./level.js";
import { BossScene } from "./boss.js";
import { TitleScene, IntroScene, KidnapScene, HeroScene, VortexScene, EndingScene, StatsScene } from "./story.js";

class Game {
  constructor() {
    this.scene = null; this.next = null; this.fade = 0; this.paused = null;
    this.reset();
  }
  reset() { this.tokens = 0; this.leaks = new Set(); this.deaths = 0; this.kills = 0; this.time = 0; }

  go(name, arg) {
    const make = {
      title: () => new TitleScene(this), intro: () => new IntroScene(this), kidnap: () => new KidnapScene(this),
      hero: () => new HeroScene(this), vortex: () => new VortexScene(this), level: () => new LevelScene(this, arg),
      boss: () => new BossScene(this), ending: () => new EndingScene(this), stats: () => new StatsScene(this),
    }[name];
    this.next = make; this.fadeDir = 1;
  }
  swap() {
    if (this.scene && this.scene.exit) this.scene.exit();
    dialog.clear();
    this.scene = this.next(); this.next = null;
    this.scene.enter();
    I.endFrame();
  }
  newGame() { this.reset(); save.set("run", null); this.go("intro"); }
  afterIntro() { this.go("kidnap"); }
  continueGame(run) {
    this.tokens = run.tokens || 0; this.leaks = new Set(run.leaks || []); this.deaths = run.deaths || 0; this.kills = run.kills || 0; this.time = run.time || 0;
    if (run.lvl >= 5) this.go("boss"); else this.startLevel(run.lvl);
  }
  startLevel(i) { this.go("level", i); }
  nextLevel(i) { if (this.next) return; if (i >= 4) { this.saveProgress(5); this.go("boss"); } else { this.saveProgress(i + 1); this.startLevel(i + 1); } }
  ending() { this.go("ending"); }
  finished() { save.set("run", null); const best = save.get("best", null); if (!best || this.time < best) save.set("best", this.time); }
  saveProgress(lvl) { save.set("run", { lvl, tokens: this.tokens, leaks: [...this.leaks], deaths: this.deaths, kills: this.kills, time: this.time }); }
  pause(scene) { this.paused = scene; this.psel = 0; audio.play("tick"); }

  update(dt) {
    V.T += dt;
    if (this.next || this.fade > 0) {
      if (this.next) { this.fade = Math.min(1, this.fade + dt * 3.2); if (this.fade >= 1) this.swap(); }
      else this.fade = Math.max(0, this.fade - dt * 2.6);
    }
    if (I.pressed("mute")) { audio.musicOn = !audio.musicOn; save.set("music", audio.musicOn); audio.musicOn ? audio.music(audio.lastStyle || "run", true) : audio.stopMusic(); }
    if (this.paused) { this.updatePause(); return; }
    if (this.scene && !this.next) this.scene.update(dt);
  }
  updatePause() {
    const opts = this.pauseOpts();
    if (I.pressed("down")) this.psel = (this.psel + 1) % opts.length;
    if (I.pressed("up")) this.psel = (this.psel + opts.length - 1) % opts.length;
    if (I.pressed("pause")) { this.paused = null; return; }
    if (I.pressed("confirm")) opts[this.psel][1]();
  }
  pauseOpts() {
    const s = this.paused;
    return [
      ["RESUME", () => (this.paused = null)],
      ["RESTART LEVEL", () => { this.paused = null; s instanceof BossScene ? this.go("boss") : this.startLevel(s.idx); }],
      [audio.musicOn ? "MUSIC: ON" : "MUSIC: OFF", () => { audio.musicOn = !audio.musicOn; save.set("music", audio.musicOn); audio.musicOn ? audio.music(s instanceof BossScene ? "boss" : "run", true) : audio.stopMusic(); }],
      ["QUIT TO TITLE", () => { this.paused = null; this.go("title"); }],
    ];
  }

  draw() {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, V.W, V.H);
    if (this.scene) this.scene.draw();
    if (this.paused) this.drawPause();
    else if (this.scene && I.padOn && I.showPad) {
      // кнопка паузы для телефона
      wobRect(V.W - 62, 64, 46, 40, "#fff", { seed: 2, line: 3 });
      txt("II", V.W - 39, 85, { size: 24, color: "#111", stroke: 0, font: "Bang" });
      if (I.tap && I.tap.x > V.W - 70 && I.tap.y > 56 && I.tap.y < 110) this.pause(this.scene);
    }
    if (this.fade > 0) { ctx.fillStyle = `rgba(10,5,20,${this.fade})`; ctx.fillRect(0, 0, V.W, V.H); }
  }
  drawPause() {
    ctx.fillStyle = "rgba(10,5,25,0.7)"; ctx.fillRect(0, 0, V.W, V.H);
    txt("PAUSED", V.W / 2, 110, { size: 64, font: "Bang", color: "#ffe14a", stroke: 8 });
    this.pauseOpts().forEach(([label, fn], i) => {
      if (button(label, V.W / 2 - 160, 170 + i * 66, 320, 54, { selected: i === this.psel, seed: 60 + i })) fn();
    });
    txt("Move: A/D or ←→ · Jump: SPACE · Hit: J/Z · Dash: SHIFT/X · Slide: S/↓ · Mute: M", V.W / 2, V.H - 30, { size: 19, color: "#ddd", stroke: 0 });
  }
}

// ---------------------------------------------------------------- старт
const game = (window.__tg = new Game());
audio.musicOn = save.get("music", true); audio.sfxOn = audio.musicOn;
const unlock = () => audio.init();
addEventListener("pointerdown", unlock); addEventListener("keydown", unlock);
addEventListener("resize", resize);
resize();

let loadK = 0, loaded = false;
loadAssets((k) => (loadK = k)).then(() => { loaded = true; game.go("title"); game.fade = 1; });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (loaded) { game.update(dt); game.draw(); }
  else {
    ctx.fillStyle = "#15121f"; ctx.fillRect(0, 0, V.W, V.H);
    ctx.fillStyle = "#fff"; ctx.font = "28px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Loading the timeline...", V.W / 2, V.H / 2 - 30);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeRect(V.W / 2 - 150, V.H / 2, 300, 22);
    ctx.fillStyle = "#ffe14a"; ctx.fillRect(V.W / 2 - 147, V.H / 2 + 3, 294 * loadK, 16);
  }
  I.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
