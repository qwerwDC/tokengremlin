// Уровни. Пол — на высоте GY. Всё собирается из «кусков» конструктора.
export const GY = 470;

export const THEMES = {
  timeline: { bg: "bg_timeline", sky: "#8fd3ff", ground: "#f4f8ff", top: "#7cc4ff", plat: "post", dirt: "#d6e6fb", music: "run", veil: "rgba(255,255,255,0.28)" },
  waitlist: { bg: "bg_waitlist", sky: "#c9cad3", ground: "#b6b9c4", top: "#ffd23c", plat: "office", dirt: "#9a9dab", music: "run", veil: "rgba(255,255,255,0.22)" },
  gpu: { bg: "bg_gpu", sky: "#ff8a3a", ground: "#3b3a46", top: "#ff7a2a", plat: "server", dirt: "#2b2a33", music: "run", veil: "rgba(20,10,10,0.3)" },
  halluc: { bg: "bg_halluc", sky: "#b04ae0", ground: "#7a3fd1", top: "#ff5ad8", plat: "glitch", dirt: "#5a2aa8", music: "run", veil: "rgba(20,0,40,0.25)" },
  arena: { bg: "bg_arena", sky: "#5ab4ff", ground: "#d8433a", top: "#ffffff", plat: "podium", dirt: "#b2342c", music: "run", veil: "rgba(255,255,255,0.2)" },
};

export const LEAKS = [
  "LEAK: the next model will say 'great question!' 40% faster.",
  "LEAK: AGI has been moved to next quarter. Again.",
  "LEAK: 'reasoning mode' just means the model sighs first.",
  "LEAK: the waitlist is a GIF of a spinning wheel.",
  "LEAK: rate limits are set by one guy named Kevin.",
  "LEAK: 'coming in the next few weeks' = never.",
  "LEAK: the GPUs run on vibes and stolen gremlin tokens.",
  "LEAK: the new context window fits one (1) entire meme.",
  "LEAK: the launch demo was pre-recorded. Twice.",
  "LEAK: hallucinations are now a premium feature.",
  "LEAK: the model can finally count the r's in 'strawberry'. Mostly.",
  "LEAK: OMNI's real filename is final_final_v3_REAL.exe",
  "LEAK: the benchmark was in the training data. Oops.",
  "LEAK: 'SOTA' stands for 'Slightly Over The Average'.",
  "LEAK: Token Gremlin was right. Again.",
];

class LB {
  constructor(theme) { this.theme = theme; this.x = 0; this.solids = []; this.plats = []; this.ents = []; this.triggers = []; this.note = 0; }
  ground(w, up = 0, o = {}) { this.solids.push({ x: this.x, y: GY - up, w, h: 400 + up, ...o }); this.x += w; return this; }
  gap(w) { this.x += w; return this; }
  block(x, y, w, h, o = {}) { const s = { x, y, w, h, ...o }; this.solids.push(s); return s; }
  plat(x, y, w, o = {}) { const p = { x, y, w, h: 18, kind: o.kind || THEMES[this.theme].plat, ...o }; if (p.mv) { p.ox = x; p.oy = y; } this.plats.push(p); return p; }
  e(type, x, y, o = {}) { const e = { type, x, y, ...o }; this.ents.push(e); return e; }
  coins(x, y, n, sp = 46, arc = 0) { for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5; this.e("coin", x + i * sp, y - Math.sin(t * Math.PI) * arc); } return this; }
  col(x, y, n, sp = 46) { for (let i = 0; i < n; i++) this.e("coin", x, y - i * sp); return this; }
  sign(x, text) { return this.e("sign", x, GY, { text }); }
  leak(x, y, lvl) { return this.e("note", x, y, { id: lvl * 3 + this.note++ }); }
  trig(x, fn) { this.triggers.push({ x, fn, done: false }); }
  // шахта для отскока от стен
  chimney(lvl, withLeak) {
    const x = this.x; this.ground(640);
    this.block(x + 140, -60, 40, GY - 110 + 60, { noWallLeft: true });
    this.block(x + 290, GY - 300, 350, 300, { mesa: true });
    this.col(x + 235, GY - 130, 4, 52);
    if (withLeak) this.leak(x + 470, GY - 350, lvl);
    else this.coins(x + 360, GY - 340, 5);
    return x;
  }
  // низкий потолок — только подкатом
  tunnel(w = 300) {
    const x = this.x; this.ground(w + 180);
    this.block(x + 90, -400, w, GY - 52 + 400, { ceiling: true });
    this.coins(x + 120, GY - 22, Math.floor(w / 50), 50);
    return x;
  }
  done(name, sub, extra = {}) {
    return { theme: this.theme, name, sub, solids: this.solids, plats: this.plats, ents: this.ents, triggers: this.triggers, width: this.x, ...extra };
  }
}

// ======================================================================= 1. THE TIMELINE (обучение)
function L1() {
  const b = new LB("timeline"); let x;
  x = b.x; b.ground(820);
  b.sign(x + 130, "A D  or  ← →  to run");
  b.sign(x + 470, "SPACE = jump. Press it again in the air!");
  b.coins(x + 250, GY - 50, 5); b.coins(x + 600, GY - 150, 4, 46, 30);
  b.gap(150); x = b.x; b.ground(600);
  b.sign(x + 70, "J or Z = swing the giant cursor");
  b.e("bot", x + 380, GY, { minx: x + 220, maxx: x + 560 });
  b.coins(x + 220, GY - 140, 5, 46, 40);
  // лесенка из постов над ямой
  x = b.x; b.gap(620);
  b.plat(x + 50, GY - 80, 160); b.plat(x + 250, GY - 170, 160); b.plat(x + 450, GY - 80, 160);
  b.coins(x + 80, GY - 130, 3); b.leak(x + 330, GY - 270, 0); b.coins(x + 480, GY - 130, 3);
  x = b.x; b.ground(560, 60);
  b.e("reply", x + 420, GY - 60);
  b.e("bomb", x + 220, GY - 60);
  b.sign(x + 60, "Watch out for engagement bait!");
  b.gap(0); x = b.x; b.ground(160);
  b.sign(x + 80, "Wall slide + JUMP = wall jump ↑");
  b.chimney(0, false);
  x = b.x; b.ground(120);
  b.sign(x + 60, "Hold ↓ (S) while running = slide");
  b.tunnel(300);
  x = b.x; b.ground(260); b.e("checkpoint", x + 120, GY);
  // облако едет над ямой
  x = b.x; b.gap(640);
  b.plat(x + 70, GY - 50, 170, { kind: "cloud", mv: { dx: 330, dy: 0, per: 4.2 } });
  b.coins(x + 120, GY - 120, 9, 50);
  x = b.x; b.ground(700);
  b.e("bot", x + 250, GY, { minx: x + 120, maxx: x + 380 }); b.e("bot", x + 500, GY, { minx: x + 420, maxx: x + 660 });
  b.plat(x + 300, GY - 190, 150); b.leak(x + 375, GY - 240, 0);
  b.sign(x + 640, "SHIFT / X = dash across big gaps");
  x = b.x; b.gap(300); b.coins(x + 30, GY - 90, 6, 48, 50);
  x = b.x; b.ground(500);
  b.e("reply", x + 380, GY);
  b.plat(x + 120, GY - 110, 150); b.plat(x + 300, GY - 220, 150);
  b.leak(x + 375, GY - 270, 0);
  b.e("heart", x + 200, GY - 160);
  x = b.x; b.ground(700);
  b.e("goal", x + 520, GY);
  b.coins(x + 80, GY - 50, 8);
  b.trig(300, (s) => s.flyby());
  b.trig(1500, (s) => s.say("g", "g_scream", "HELP!! They stuffed me in a CAGE! Follow the tokens I dropped!"));
  b.trig(3900, (s) => s.say("g", "g_whisper", "psst... I hid my leaked announcements along the way. Grab them!"));
  b.trig(6400, (s) => s.say("g", "g_angry", "Reply bots everywhere. Just bonk them with the cursor."));
  return b.done("THE TIMELINE", "LEVEL 1");
}

// ======================================================================= 2. THE WAITLIST
function L2() {
  const b = new LB("waitlist"); let x;
  x = b.x; b.ground(900);
  b.sign(x + 160, "429 lasers blink. Wait for the gap!");
  b.e("laser", x + 460, GY, { on: 1.3, off: 1.2, ph: 0 });
  b.coins(x + 520, GY - 50, 5);
  b.e("crate", x + 760, GY); b.e("crate", x + 760, GY - 70);
  x = b.x; b.gap(170); x = b.x; b.ground(700, 70);
  b.e("laser", x + 200, GY - 70, { on: 1.1, off: 1.1, ph: 0.4 });
  b.e("laser", x + 420, GY - 70, { on: 1.1, off: 1.1, ph: 1.4 });
  b.e("bot", x + 580, GY - 70, { minx: x + 470, maxx: x + 680 });
  b.leak(x + 320, GY - 230, 1); b.plat(x + 250, GY - 180, 140);
  x = b.x; b.ground(140); b.sign(x + 70, "VIP lane →  (slide!)");
  b.tunnel(380);
  x = b.x; b.ground(300); b.e("checkpoint", x + 150, GY);
  x = b.x; b.gap(560);
  b.plat(x + 40, GY - 70, 140); b.plat(x + 220, GY - 140, 140); b.plat(x + 400, GY - 70, 140);
  b.e("bot", x + 290, GY - 140, { minx: x + 225, maxx: x + 355 });
  b.coins(x + 70, GY - 120, 3); b.coins(x + 430, GY - 120, 3);
  x = b.x; b.ground(160);
  b.chimney(1, true);
  x = b.x; b.ground(1100);
  [0, 1, 2].forEach((i) => b.e("laser", x + 200 + i * 260, GY, { on: 1.0, off: 1.0, ph: i * 0.6 }));
  b.e("reply", x + 1000, GY);
  b.coins(x + 120, GY - 50, 18, 50);
  b.e("spring", x + 1040, GY);
  x = b.x; b.gap(200);
  b.plat(x - 60, GY - 330, 180); b.leak(x + 30, GY - 380, 1);
  x = b.x; b.ground(600);
  b.e("crate", x + 200, GY); b.e("crate", x + 270, GY); b.e("crate", x + 235, GY - 70);
  b.e("bot", x + 450, GY, { minx: x + 330, maxx: x + 580 });
  b.e("heart", x + 235, GY - 170);
  x = b.x; b.gap(220); b.coins(x + 20, GY - 100, 5, 46, 40);
  x = b.x; b.ground(800);
  b.e("laser", x + 220, GY, { on: 0.8, off: 1.3, ph: 0.2 });
  b.plat(x + 420, GY - 120, 150); b.plat(x + 600, GY - 230, 150); b.e("heart", x + 675, GY - 280);
  b.e("bomb", x + 520, GY);
  x = b.x; b.ground(600); b.e("goal", x + 420, GY);
  b.trig(200, (s) => s.flyby());
  b.trig(500, (s) => s.say("g", "g_whisper", "This line NEVER moves. Nobody gets in. Just run past everyone!"));
  b.trig(3600, (s) => s.say("g", "g_angry", "They keep refreshing the queue just to watch it spin. MONSTERS."));
  return b.done("THE WAITLIST", "LEVEL 2", { queue: true });
}

// ======================================================================= 3. THE GPU FARM
function L3() {
  const b = new LB("gpu"); let x;
  x = b.x; b.ground(600);
  b.sign(x + 150, "Glowing grates = HOT. Cross when they cool!");
  x = b.x; b.ground(420, 0, { hot: true, ph: 0 });
  b.coins(x + 40, GY - 160, 8, 48, 20); b.plat(x + 140, GY - 120, 150);
  x = b.x; b.ground(300);
  b.e("bot", x + 160, GY, { minx: x + 30, maxx: x + 270 });
  x = b.x; b.gap(440);
  b.sign(x - 80, "JUMP into the fan wind. It blows UP!");
  b.e("fan", x + 170, GY + 70, { top: GY - 330 });
  b.coins(x + 170, GY - 120, 1); b.col(x + 170, GY - 180, 3); b.leak(x + 170, GY - 360, 2);
  x = b.x; b.ground(520, 40);
  b.e("spikes", x + 160, GY - 40, { w: 130 }); b.e("spikes", x + 360, GY - 40, { w: 100 });
  b.coins(x + 140, GY - 160, 4, 46, 30);
  x = b.x; b.ground(200); b.e("checkpoint", x + 100, GY);
  x = b.x; b.ground(500, 0, { hot: true, ph: 1.3 });
  b.plat(x + 60, GY - 110, 140); b.plat(x + 280, GY - 160, 140); b.e("reply", x + 350, GY - 160);
  b.coins(x + 90, GY - 160, 3);
  x = b.x; b.ground(160);
  b.chimney(2, true);
  x = b.x; b.gap(560);
  b.e("fan", x + 140, GY + 70, { top: GY - 280 }); b.e("fan", x + 420, GY + 70, { top: GY - 280 });
  b.plat(x + 230, GY - 220, 100);
  b.coins(x + 150, GY - 200, 1); b.coins(x + 410, GY - 200, 1); b.e("heart", x + 280, GY - 260);
  x = b.x; b.ground(240);
  b.tunnel(260);
  x = b.x; b.ground(700);
  b.e("bot", x + 200, GY, { minx: x + 60, maxx: x + 330 }); b.e("bot", x + 480, GY, { minx: x + 360, maxx: x + 660 });
  b.e("spikes", x + 340, GY, { w: 90 });
  b.e("chip", x + 120, GY - 140);
  x = b.x; b.ground(460, 0, { hot: true, ph: 0.5 });
  b.plat(x + 160, GY - 140, 150); b.leak(x + 235, GY - 200, 2);
  x = b.x; b.ground(600); b.e("goal", x + 420, GY);
  b.coins(x + 60, GY - 50, 6);
  b.trig(200, (s) => s.flyby());
  b.trig(400, (s) => s.say("g", "g_angry", "They're burning MY tokens to heat these GPUs!! Unacceptable!"));
  b.trig(3700, (s) => s.say("g", "g_laugh", "Purple chip = OVERCLOCK. You'll be unstoppable for a bit!"));
  return b.done("THE GPU FARM", "LEVEL 3");
}

// ======================================================================= 4. THE HALLUCINATION ZONE
function L4() {
  const b = new LB("halluc"); let x;
  x = b.x; b.ground(700);
  b.sign(x + 140, "Ghosts flip your controls. Bonk them!");
  b.e("ghost", x + 560, GY - 150);
  b.e("fake", x + 420, GY);
  x = b.x; b.gap(600);
  b.plat(x + 40, GY - 80, 150, { blink: { on: 1.6, off: 0.9, ph: 0 } });
  b.plat(x + 230, GY - 150, 150, { blink: { on: 1.6, off: 0.9, ph: 0.8 } });
  b.plat(x + 420, GY - 80, 150, { blink: { on: 1.6, off: 0.9, ph: 1.6 } });
  b.coins(x + 260, GY - 200, 3); b.leak(x + 305, GY - 260, 3);
  x = b.x; b.ground(600, 50);
  b.e("fake", x + 200, GY - 50); b.e("ghost", x + 420, GY - 230);
  b.e("bot", x + 470, GY - 50, { minx: x + 330, maxx: x + 580 });
  x = b.x; b.ground(200); b.e("checkpoint", x + 100, GY);
  x = b.x; b.gap(700);
  b.plat(x + 60, GY - 70, 150, { mv: { dx: 0, dy: -140, per: 3 } });
  b.plat(x + 280, GY - 200, 150, { blink: { on: 1.3, off: 1.0, ph: 0.3 } });
  b.plat(x + 500, GY - 90, 150, { mv: { dx: 0, dy: -120, per: 3.4 } });
  b.coins(x + 300, GY - 260, 3);
  x = b.x; b.ground(160);
  b.chimney(3, true);
  x = b.x; b.ground(900);
  b.e("ghost", x + 300, GY - 180); b.e("ghost", x + 650, GY - 120);
  b.e("fake", x + 500, GY); b.e("bomb", x + 760, GY);
  b.coins(x + 100, GY - 50, 14, 50);
  x = b.x; b.ground(160); b.tunnel(300);
  x = b.x; b.ground(700);
  b.e("fakegoal", x + 380, GY);
  b.e("heart", x + 200, GY - 150);
  x = b.x; b.gap(500);
  b.plat(x + 60, GY - 100, 140, { blink: { on: 1.2, off: 0.8, ph: 0 } });
  b.plat(x + 300, GY - 150, 140, { blink: { on: 1.2, off: 0.8, ph: 0.6 } });
  b.leak(x + 370, GY - 220, 3);
  x = b.x; b.ground(700);
  b.e("ghost", x + 300, GY - 200);
  b.e("goal", x + 520, GY);
  b.trig(200, (s) => s.flyby());
  b.trig(450, (s) => s.say("g", "g_shock", "Everything here is a hallucination... except me. DON'T trust the shiny exit!"));
  b.trig(1700, (s) => s.say("g", "g_angry", "That's NOT me! My ears are WAY cooler than that."));
  return b.done("THE HALLUCINATION ZONE", "LEVEL 4", { halluc: true });
}

// ======================================================================= 5. THE BENCHMARK ARENA
function L5() {
  const b = new LB("arena"); let x;
  x = b.x; b.ground(700);
  b.sign(x + 160, "Beat the clock! ⚡ = +5 seconds");
  b.e("bolt", x + 520, GY - 60);
  x = b.x; b.gap(180); x = b.x; b.ground(500);
  b.e("spring", x + 360, GY);
  b.plat(x + 420, GY - 300, 160); b.leak(x + 500, GY - 350, 4);
  b.e("bot", x + 200, GY, { minx: x + 60, maxx: x + 320 });
  x = b.x; b.gap(560);
  b.plat(x + 40, GY - 90, 150, { mv: { dx: 200, dy: 0, per: 2.6 } });
  b.plat(x + 380, GY - 160, 140);
  b.e("bolt", x + 450, GY - 220);
  x = b.x; b.ground(600, 60);
  b.e("bot", x + 200, GY - 60, { minx: x + 60, maxx: x + 300 }); b.e("bot", x + 450, GY - 60, { minx: x + 330, maxx: x + 560 });
  b.coins(x + 100, GY - 110, 10, 50);
  x = b.x; b.ground(200); b.e("checkpoint", x + 100, GY);
  b.chimney(4, true);
  x = b.x; b.ground(700);
  b.e("spring", x + 140, GY); b.e("spring", x + 420, GY);
  b.plat(x + 240, GY - 280, 140); b.e("bolt", x + 310, GY - 330);
  b.e("reply", x + 620, GY);
  x = b.x; b.gap(620);
  b.plat(x + 30, GY - 80, 130); b.plat(x + 230, GY - 130, 130, { mv: { dx: 0, dy: -100, per: 2.4 } }); b.plat(x + 440, GY - 80, 130);
  b.leak(x + 295, GY - 330, 4);
  x = b.x; b.ground(160); b.tunnel(260);
  x = b.x; b.ground(900);
  b.e("bolt", x + 150, GY - 60);
  b.e("bot", x + 400, GY, { minx: x + 280, maxx: x + 520 }); b.e("bomb", x + 640, GY);
  b.coins(x + 250, GY - 140, 8, 46, 40);
  x = b.x; b.gap(280); b.coins(x + 20, GY - 90, 5, 55, 50);
  x = b.x; b.ground(800);
  b.plat(x + 160, GY - 120, 140); b.plat(x + 340, GY - 220, 140); b.coins(x + 370, GY - 270, 3);
  b.e("goal", x + 620, GY);
  b.trig(150, (s) => s.flyby());
  b.trig(350, (s) => s.say("g", "g_laugh", "BENCHMARK TIME! Too slow and they'll label you 'needs more training'!"));
  return b.done("THE BENCHMARK ARENA", "LEVEL 5", { timer: 70 });
}

export const LEVELS = [L1, L2, L3, L4, L5];
