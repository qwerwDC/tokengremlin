// Герой: бег, прыжки, двойной прыжок, стены, рывок, подкат, удар курсором
import { I, spr, clamp, ctx } from "./core.js";
import { audio } from "./audio.js";

export const PH = {
  grav: 2300, maxFall: 1150, run: 330, acc: 3000, airAcc: 1900, fric: 2600,
  jump: 830, djump: 720, wallSlide: 170, wallJumpX: 430, wallJumpY: 800,
  dash: 760, dashT: 0.17, slideT: 0.5, slideV: 560, crawl: 170,
};
const STAND_H = 80, CROUCH_H = 40, PW = 34;
export const HERO_SCALE = 0.62;

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y - STAND_H; this.w = PW; this.h = STAND_H;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.ground = false; this.coyote = 0; this.jbuf = 0; this.jumps = 1;
    this.wall = 0; this.wallLock = 0; this.dashT = 0; this.dashCd = 0; this.canDash = true;
    this.slideT = 0; this.crouch = false; this.atkT = 0; this.atkCd = 0; this.hitList = new Set();
    this.hp = 3; this.maxHp = 3; this.inv = 0; this.hurtT = 0; this.dead = 0;
    this.spinT = 0; this.landT = 0; this.wjT = 0; this.t = 0; this.airT = 0;
    this.reversed = 0; this.boost = 0; this.frozen = false; this.onPlat = null;
  }
  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }

  damage(dir = 0, amount = 1) {
    if (this.inv > 0 || this.dead || this.boost > 0) return false;
    this.hp -= amount; this.inv = 1.3; this.hurtT = 0.35;
    this.vx = (dir || -this.face) * 360; this.vy = -420; this.dashT = 0; this.atkT = 0;
    audio.play("hit");
    if (this.hp <= 0) { this.hp = 0; this.dead = 1.4; audio.play("ko"); }
    return true;
  }

  // world: { solids:[{x,y,w,h}], plats:[{x,y,w,top-only}] }
  update(dt, world) {
    this.t += dt;
    if (this.dead) { this.dead = Math.max(0.0001, this.dead - dt); this.vy = Math.min(this.vy + PH.grav * dt, PH.maxFall); this.y += this.vy * dt * 0.4; return; }
    this.inv = Math.max(0, this.inv - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.reversed = Math.max(0, this.reversed - dt); this.boost = Math.max(0, this.boost - dt);
    this.dashCd -= dt; this.atkCd -= dt; this.wallLock -= dt; this.spinT -= dt; this.landT -= dt; this.wjT -= dt;
    const ctl = !this.frozen && this.hurtT <= 0;
    let L = ctl && I.down("left"), R = ctl && I.down("right");
    if (this.reversed > 0) [L, R] = [R, L];
    const dir = (R ? 1 : 0) - (L ? 1 : 0);
    if (I.pressed("jump") && ctl) this.jbuf = 0.13; else this.jbuf -= dt;
    const speed = PH.run * (this.boost > 0 ? 1.35 : 1);

    // подкат / присед
    const wantDown = ctl && I.down("down");
    if (ctl && I.pressed("down") && this.ground && Math.abs(this.vx) > 120 && this.slideT <= 0) {
      this.slideT = PH.slideT; this.vx = Math.sign(this.vx) * PH.slideV; audio.play("slide");
    }
    this.slideT -= dt;
    const needLow = this.slideT > 0 || (wantDown && this.ground);
    this.setCrouch(needLow || (this.crouch && !this.headroom(world)));

    // рывок
    if (ctl && I.pressed("dash") && this.dashCd <= 0 && this.canDash) {
      this.dashT = PH.dashT; this.dashCd = 0.45; this.vy = 0; this.vx = (dir || this.face) * PH.dash;
      if (!this.ground) this.canDash = false; this.face = Math.sign(this.vx); audio.play("dash");
    }
    // удар курсором
    if (ctl && I.pressed("attack") && this.atkCd <= 0 && !this.crouch) {
      this.atkT = 0.26; this.atkCd = 0.34; this.hitList.clear(); audio.play("swing");
    }
    this.atkT = Math.max(0, this.atkT - dt);

    if (this.dashT > 0) {
      this.dashT -= dt;
      if (this.dashT <= 0) this.vx *= 0.5;
    } else {
      // горизонталь
      if (this.slideT > 0) this.vx -= Math.sign(this.vx) * 500 * dt;
      else if (this.wallLock <= 0) {
        const max = this.crouch ? PH.crawl : speed;
        const acc = this.ground ? PH.acc : PH.airAcc;
        if (dir) { this.vx += dir * acc * dt; this.vx = clamp(this.vx, -max, max); this.face = dir; }
        else if (this.ground) { const f = PH.fric * dt; this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f; }
        else this.vx *= 1 - 1.5 * dt;
        if (Math.abs(this.vx) > max) this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx) - max, 1400 * dt);
      }
      // гравитация
      this.vy += PH.grav * dt;
      if (this.wall && !this.ground && this.vy > 0 && ((this.wall > 0 && R) || (this.wall < 0 && L))) this.vy = Math.min(this.vy, PH.wallSlide);
      this.vy = Math.min(this.vy, PH.maxFall);
      // прыжки
      if (this.jbuf > 0) {
        if ((this.ground || this.coyote > 0) && !this.crouch) { this.vy = -PH.jump; this.jbuf = 0; this.coyote = 0; this.ground = false; audio.play("jump"); this.jumpT = 0.1; }
        else if (this.wall && !this.ground) { this.vy = -PH.wallJumpY; this.vx = -this.wall * PH.wallJumpX; this.face = -this.wall; this.wallLock = 0.16; this.jbuf = 0; this.jumps = 1; this.wjT = 0.22; this.canDash = true; audio.play("jump"); }
        else if (this.jumps > 0 && !this.ground) { this.vy = -PH.djump; this.jumps--; this.jbuf = 0; this.spinT = 0.35; audio.play("djump"); }
      }
      if (!I.down("jump") && this.vy < -300 && this.wjT <= 0) this.vy += PH.grav * dt * 1.4; // короткий прыжок
    }

    // движение по платформе
    if (this.onPlat && this.onPlat.dx !== undefined) { this.x += this.onPlat.dx; this.y += Math.min(0, this.onPlat.dy); }
    const wasGround = this.ground;
    this.move(dt, world);
    if (this.ground) { this.coyote = 0.1; this.jumps = 1; this.canDash = true; if (!wasGround && this.airT > 0.25) { this.landT = 0.1; audio.play("land"); world.onLand && world.onLand(this); } this.airT = 0; }
    else { this.coyote -= dt; this.airT += dt; }
  }

  setCrouch(on) {
    if (on === this.crouch) return;
    this.crouch = on;
    const nh = on ? CROUCH_H : STAND_H;
    this.y += this.h - nh; this.h = nh;
  }
  headroom(world) {
    const top = this.y + this.h - STAND_H;
    for (const s of world.solids) if (!s.off && this.x + this.w > s.x && this.x < s.x + s.w && top < s.y + s.h && this.y > s.y) return false;
    return true;
  }

  move(dt, world) {
    // X
    this.x += this.vx * dt;
    this.wall = 0;
    for (const s of world.solids) {
      if (s.off || !overlap(this, s)) continue;
      if (this.vx > 0 || (this.vx === 0 && this.cx < s.x + s.w / 2)) { this.x = s.x - this.w; }
      else { this.x = s.x + s.w; }
      if (this.dashT > 0) this.dashT = 0;
      this.vx = 0;
    }
    // проверка стены рядом (для скольжения)
    for (const s of world.solids) {
      if (s.off || s.noWall) continue;
      if (this.y + this.h > s.y + 6 && this.y < s.y + s.h - 6) {
        if (Math.abs(this.x + this.w - s.x) < 2) this.wall = 1;
        if (Math.abs(this.x - (s.x + s.w)) < 2) this.wall = -1;
      }
    }
    // Y
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.ground = false; this.onPlat = null;
    for (const s of world.solids) {
      if (s.off || !overlap(this, s)) continue;
      if (this.vy > 0 || prevBottom <= s.y + 2) { this.y = s.y - this.h; this.vy = 0; this.ground = true; this.onPlat = s.mv ? s : null; this.groundRef = s; }
      else { this.y = s.y + s.h; this.vy = Math.max(0, this.vy); }
    }
    if (this.vy >= 0 && !(I.down("down") && !this.ground && this.dropT > 0)) {
      for (const p of world.plats) {
        if (p.off) continue;
        if (this.x + this.w > p.x + 4 && this.x < p.x + p.w - 4 && prevBottom <= p.y + 4 + (p.dy > 0 ? p.dy : 0) && this.y + this.h >= p.y) {
          this.y = p.y - this.h; this.vy = 0; this.ground = true; this.onPlat = p; this.groundRef = p;
        }
      }
    }
  }

  attackBox() {
    if (this.atkT <= 0 || this.atkT > 0.22) return null;
    return { x: this.face > 0 ? this.x + this.w - 6 : this.x - 86, y: this.y - 16, w: 92, h: this.h + 22 };
  }

  frame() {
    const t = this.t;
    if (this.dead) return "ko";
    if (this.hurtT > 0) return "hurt";
    if (this.dashT > 0) return "dash";
    if (this.crouch) return "slide";
    if (this.atkT > 0) return this.atkT > 0.2 ? "atk0" : this.atkT > 0.12 ? "atk1" : "atk2";
    if (!this.ground) {
      if (this.wall && this.vy > 0) return "wall";
      if (this.wjT > 0) return "walljump";
      if (this.spinT > 0) return "spin";
      if (this.vy < -450) return "jump1";
      if (this.vy < 0) return "jump2";
      if (this.vy < 250) return "jump3";
      return "fall";
    }
    if (this.landT > 0) return "land";
    if (Math.abs(this.vx) > 40) return "run" + (Math.floor(t * (8 + Math.abs(this.vx) / 50)) % 6);
    return "idle" + (Math.floor(t * 2) % 2);
  }

  draw(cx, cy) {
    if (this.inv > 0 && !this.dead && Math.floor(this.t * 16) % 2) return;
    const f = this.frame();
    let flip = this.face < 0;
    if (f === "wall") flip = this.wall < 0;
    const x = this.cx - cx, y = this.y + this.h - cy;
    if (this.boost > 0) { ctx.save(); ctx.shadowColor = "#7dff6a"; ctx.shadowBlur = 18; }
    const sc = HERO_SCALE * (f === "slide" ? 0.95 : 1);
    spr("hero", f, x + (f === "wall" ? (this.wall > 0 ? 6 : -6) : 0), y + (f === "slide" ? 4 : 2), { scale: sc, flip });
    if (this.boost > 0) ctx.restore();
  }
}

export function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
