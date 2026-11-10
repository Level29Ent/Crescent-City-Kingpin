import { DISTRICTS, GOAL, LAND_Z, MAX_LEVEL, SHOP, STREETS, STREET_HALF, WEAPONS, WORLD_X, WORLD_Z_MAX, WORLD_Z_MIN } from "./game.ts";
import type { HudActions, HudModel } from "./game.ts";

export type Hud = { update(m: HudModel): void; feed(text: string, tone: number): void; hit(kind: number): void; dispose(): void };

const CSS = `
.ck{position:absolute;inset:0;pointer-events:none;font-family:"Trebuchet MS",system-ui,sans-serif;color:#f4efe6;user-select:none;overflow:hidden}
.ck *{box-sizing:border-box}
.ck .pn{background:rgba(14,8,24,.68);border:1px solid rgba(231,184,74,.35);border-radius:12px;box-shadow:0 0 14px rgba(120,60,200,.25)}
.ck .tl{position:absolute;left:16px;top:14px;width:290px;padding:10px 12px}
.ck .cash{font-size:34px;font-weight:900;color:#ffd56a;text-shadow:0 0 12px rgba(255,190,60,.6);letter-spacing:1px}
.ck .inc{font-size:13px;color:#6fe3d0;font-weight:700;margin-left:8px}
.ck .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:4px}
.ck .bar>i{display:block;height:100%;width:0;border-radius:5px}
.ck .gl{font-size:11px;color:#c9b8e8;margin-top:6px;display:flex;justify-content:space-between}
.ck .badge{display:none;margin-top:6px;padding:3px 10px;border-radius:8px;background:linear-gradient(90deg,#ffd56a,#c95fd0);color:#1a0b2a;font-weight:900;letter-spacing:3px;text-align:center}
.ck .dn{font-size:13px;font-weight:800;color:#6fe3d0;margin-top:8px;text-transform:uppercase;letter-spacing:1px}
.ck .dl{margin-top:4px;font-size:12px}
.ck .dr{display:flex;align-items:center;gap:6px;padding:1px 0;opacity:.9}
.ck .dd{width:9px;height:9px;border-radius:50%;flex:none}
.ck .dr b{margin-left:auto;font-weight:700;color:#c9b8e8}
.ck .dr em{font-style:normal;background:#d22;color:#fff;border-radius:4px;padding:0 5px;font-size:10px;font-weight:900;animation:ckp .7s infinite alternate}
.ck .obj{margin-top:8px;padding:6px 8px;border-radius:8px;background:rgba(201,95,208,.25);border-left:3px solid #ffd56a;font-size:13px;font-weight:700}
.ck .mm{position:absolute;left:16px;bottom:16px;width:188px;height:188px;border-radius:50%;padding:4px;border:2px solid rgba(231,184,74,.6);background:rgba(10,6,20,.8);box-shadow:0 0 16px rgba(120,60,200,.5)}
.ck .mm canvas{width:178px;height:178px;border-radius:50%;display:block}
.ck .bc{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:300px;padding:8px 12px;text-align:center}
.ck .hb{height:14px;border-radius:7px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:4px}
.ck .hb>i{display:block;height:100%;width:100%}
.ck .wn{font-size:15px;font-weight:900;margin:4px 0;letter-spacing:1px;color:#ffd56a}
.ck .ws{display:flex;gap:6px;justify-content:center}
.ck .sl{pointer-events:auto;cursor:pointer;min-width:64px;padding:3px 6px;border-radius:7px;border:1px solid rgba(255,255,255,.2);font-size:11px;font-weight:700;opacity:.35;background:rgba(0,0,0,.4)}
.ck .sl.o{opacity:.8}.ck .sl.a{opacity:1;border-color:#ffd56a;background:rgba(255,213,106,.2);color:#ffd56a}
.ck .tr{position:absolute;right:16px;top:14px;width:230px;text-align:right}
.ck .stars{font-size:30px;letter-spacing:4px;padding:4px 10px;display:inline-block;color:rgba(255,255,255,.2)}
.ck .stars span.on{color:#ffd56a;text-shadow:0 0 8px #f90}
.ck .stars.fl span.on{animation:ckf .5s infinite alternate}
.ck .job{display:none;margin-top:8px;padding:8px 12px;text-align:left}
.ck .job h4{margin:0;font-size:11px;color:#6fe3d0;letter-spacing:2px}
.ck .job .jl{font-weight:800;font-size:14px;margin:2px 0}
.ck .job .jt{font-size:24px;font-weight:900;color:#ffd56a}
.ck .jp{font-size:13px;color:#7dff9a;font-weight:800}
.ck .xh{position:absolute;left:50%;top:50%;width:0;height:0}
.ck .xh i{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;border:2px solid #ffd56a;box-shadow:0 0 6px #000}
.ck .xh u{position:absolute;left:-2px;top:-2px;width:4px;height:4px;border-radius:50%;background:#ffd56a;box-shadow:0 0 3px #000}
.ck .hm{position:absolute;left:-14px;top:-14px;width:28px;height:28px;opacity:0}
.ck .hm:before,.ck .hm:after{content:"";position:absolute;left:13px;top:-3px;width:2px;height:34px;background:#fff;transform:rotate(45deg)}
.ck .hm:after{transform:rotate(-45deg)}
.ck .hm.go{animation:ckh .35s ease-out}
.ck .hm.hs:before,.ck .hm.hs:after{background:#f33;box-shadow:0 0 6px #f00}
.ck .vg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(200,0,0,0) 40%,rgba(200,0,0,.85) 100%);opacity:0}
.ck .pr{position:absolute;left:50%;top:66%;transform:translateX(-50%);padding:8px 18px;font-size:17px;font-weight:800;display:none;white-space:nowrap}
.ck .kc{display:inline-block;min-width:26px;padding:1px 8px;margin-right:6px;background:#ffd56a;color:#1a0b2a;border-radius:6px;box-shadow:0 3px 0 #a37a1f;text-align:center;font-weight:900}
.ck .sp{position:absolute;right:20px;bottom:20px;padding:8px 18px;text-align:center;display:none}
.ck .sp b{font-size:44px;font-weight:900;color:#ffd56a;line-height:1}
.ck .sp small{display:block;font-size:12px;letter-spacing:3px;color:#6fe3d0}
.ck .cs{position:absolute;right:16px;bottom:100px;padding:8px 12px;font-size:11px;line-height:1.55;opacity:.8;animation:ckc 1s 12s forwards}
.ck .cs b{color:#ffd56a}
.ck .fd{position:absolute;left:16px;top:42%;width:300px;display:flex;flex-direction:column;gap:4px}
.ck .fd div{padding:5px 10px;border-radius:8px;font-size:13px;font-weight:700;background:rgba(14,8,24,.7);border-left:4px solid #fff;animation:ckfd 5s forwards}
.ck .fd .t1{border-color:#4fe07a;color:#aaffc0}.ck .fd .t2{border-color:#f44;color:#ffb0b0}.ck .fd .t3{border-color:#48f;color:#cfe0ff;animation:ckfd 5s forwards,ckb .4s 6 alternate}
.ck .wa{position:absolute;inset:0;background:rgba(0,0,0,.72);display:none;flex-direction:column;align-items:center;justify-content:center}
.ck .wa h1{font-size:90px;margin:0;color:#e22;letter-spacing:12px;text-shadow:0 0 24px #900}
.ck .wa p{font-size:22px;margin:6px}
.ck .shop{position:absolute;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;pointer-events:auto}
.ck .sh{width:min(760px,92%);max-height:92%;overflow:auto;padding:18px 22px;background:rgba(20,10,34,.96);border:2px solid #ffd56a;border-radius:16px;box-shadow:0 0 40px rgba(150,70,230,.6)}
.ck .sh h2{margin:0;font-size:28px;color:#ffd56a;letter-spacing:2px}
.ck .sh .fl{font-size:13px;color:#c9b8e8;margin:4px 0 10px;font-style:italic}
.ck .sh .sc{font-weight:900;color:#6fe3d0;margin-bottom:8px}
.ck .gr{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ck .cd{padding:10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(201,95,208,.5);display:flex;flex-direction:column;gap:3px}
.ck .cd h3{margin:0;font-size:16px}.ck .cd p{margin:0;font-size:12px;color:#c9b8e8;flex:1}
.ck .cd .pc{font-weight:900;color:#ffd56a}
.ck button{font-family:inherit;cursor:pointer;font-weight:900;border:0;border-radius:8px;padding:7px 14px;color:#1a0b2a;background:#ffd56a;font-size:14px}
.ck button:hover:not(:disabled){filter:brightness(1.15)}
.ck button:disabled{background:#555;color:#999;cursor:not-allowed}
.ck button.go{background:linear-gradient(90deg,#6fe3d0,#ffd56a);font-size:17px;padding:11px;width:100%;margin-top:12px}
.ck button.cl{background:#c95fd0;margin-top:8px;width:100%}
@keyframes ckp{to{opacity:.5}}@keyframes ckf{to{color:#48f;text-shadow:0 0 10px #48f}}
@keyframes ckh{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(1.3)}}
@keyframes ckc{to{opacity:.25}}@keyframes ckb{to{filter:hue-rotate(160deg)}}
@keyframes ckfd{0%{opacity:0;transform:translateX(-20px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
@media (max-width:1100px){.ck .tl{width:240px}.ck .cs{display:none}.ck .cash{font-size:28px}.ck .dl{display:none}}
`;

const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
const fmt = (n: number) => "$" + Math.floor(n).toLocaleString("en-US");
const el = <K extends keyof HTMLElementTagNameMap>(p: HTMLElement, tag: K, cls = "", html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  p.appendChild(e);
  return e;
};

export function createHud(parent: HTMLElement, signal: AbortSignal, actions: HudActions): Hud {
  const style = document.createElement("style");
  style.textContent = CSS;
  const root = document.createElement("div");
  root.className = "ck";
  parent.append(style, root);

  // top-left
  const tl = el(root, "div", "tl pn");
  const cashRow = el(tl, "div");
  const cash = el(cashRow, "span", "cash");
  const inc = el(cashRow, "span", "inc");
  const bar = el(tl, "div", "bar");
  const barFill = el(bar, "i");
  barFill.style.background = "linear-gradient(90deg,#c95fd0,#ffd56a)";
  const gl = el(tl, "div", "gl");
  const glA = el(gl, "span", "", "Empire");
  const glB = el(gl, "span");
  const badge = el(tl, "div", "badge", "KINGPIN");
  const dn = el(tl, "div", "dn");
  const dl = el(tl, "div", "dl");
  const obj = el(tl, "div", "obj");
  glA.textContent = "Empire to " + fmt(GOAL) + " Kingpin";

  // minimap
  const mm = el(root, "div", "mm");
  const cv = el(mm, "canvas");
  cv.width = 178;
  cv.height = 178;
  const g = cv.getContext("2d")!;

  // bottom center
  const bc = el(root, "div", "bc pn");
  const hpB = el(bc, "div", "hb");
  const hpF = el(hpB, "i");
  hpF.style.background = "linear-gradient(90deg,#a00,#f44)";
  const arB = el(bc, "div", "hb");
  const arF = el(arB, "i");
  arF.style.background = "linear-gradient(90deg,#26a,#5af)";
  const wn = el(bc, "div", "wn");
  const ws = el(bc, "div", "ws");
  const slots = WEAPONS.map((w, i) => {
    const s = el(ws, "div", "sl", `${i + 1} ${w.name}`);
    s.addEventListener("click", () => actions.selectWeapon(i), { signal });
    return s;
  });

  // top-right
  const tr = el(root, "div", "tr");
  const stars = el(tr, "div", "stars pn");
  const starEls = [0, 1, 2, 3, 4].map(() => el(stars, "span", "", "★"));
  const job = el(tr, "div", "job pn");
  el(job, "h4", "", "IMPORT RUN");
  const jl = el(job, "div", "jl");
  const jt = el(job, "div", "jt");
  const jp = el(job, "div", "jp");

  // crosshair
  const xh = el(root, "div", "xh");
  el(xh, "i");
  el(xh, "u");
  const hm = el(xh, "div", "hm");
  const vg = el(root, "div", "vg");
  const pr = el(root, "div", "pr pn");
  const sp = el(root, "div", "sp pn");
  const spN = el(sp, "b");
  el(sp, "small", "", "KM/H");
  el(root, "div", "cs pn",
    "<b>WASD</b> move · <b>Mouse</b> look<br><b>Click</b> fire · <b>1/2/3</b> weapons<br><b>Shift</b> run / handbrake · <b>E</b> use / enter car<br>Car: <b>W/S</b> throttle/brake, <b>A/D</b> steer<br><b>Esc</b> release mouse");
  const fd = el(root, "div", "fd");
  const wa = el(root, "div", "wa");
  el(wa, "h1", "", "WASTED");
  const waP = el(wa, "p");

  // shop
  const shop = el(root, "div", "shop");
  const sh = el(shop, "div", "sh");
  shop.addEventListener("pointerdown", (e) => { if (e.target === shop) actions.closeShop(); }, { signal });
  el(sh, "h2", "", "Mama Nola's Back Room");
  el(sh, "div", "fl", "Import business: crates of rum, cigars and hot sauce — move them across town and the money rolls in.");
  const shCash = el(sh, "div", "sc");
  const grid = el(sh, "div", "gr");
  const cards = SHOP.map((it) => {
    const c = el(grid, "div", "cd");
    el(c, "h3", "", it.name);
    const d = el(c, "p", "", it.desc);
    const pc = el(c, "div", "pc");
    const b = el(c, "button");
    b.addEventListener("click", () => actions.buy(it.id), { signal });
    return { it, d, pc, b };
  });
  const goBtn = el(sh, "button", "go");
  goBtn.addEventListener("click", () => (jobActive ? actions.cancelJob() : actions.startJob()), { signal });
  const clBtn = el(sh, "button", "cl", "Close");
  clBtn.addEventListener("click", () => actions.closeShop(), { signal });

  // caches
  let jobActive = false;
  const c: Record<string, unknown> = {};
  const set = (k: string, v: unknown, f: () => void) => { if (c[k] !== v) { c[k] = v; f(); } };

  const MM = 89, R = 90;
  const drawMap = (m: HudModel) => {
    const cos = Math.cos(m.yaw), sin = Math.sin(m.yaw);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 178, 178);
    g.fillStyle = "#17102a";
    g.fillRect(0, 0, 178, 178);
    g.save();
    g.setTransform(-cos, -sin, sin, -cos, MM, MM);
    g.translate(-m.me.x, -m.me.z);
    for (const d of DISTRICTS) {
      g.fillStyle = hex(d.color) + "22";
      g.beginPath();
      g.arc(d.x, d.z, 70, 0, 7);
      g.fill();
    }
    g.fillStyle = "#0e3a66";
    g.fillRect(-WORLD_X - 100, LAND_Z, WORLD_X * 2 + 200, WORLD_Z_MAX - LAND_Z + 200);
    g.fillStyle = "#3b3550";
    const W = WORLD_X + 40;
    for (const s of STREETS) {
      g.fillRect(s - STREET_HALF, WORLD_Z_MIN, STREET_HALF * 2, LAND_Z - WORLD_Z_MIN);
      g.fillRect(-W, s - STREET_HALF, W * 2, STREET_HALF * 2);
    }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    // markers
    const sx = (x: number, z: number) => {
      const dx = x - m.me.x, dz = z - m.me.z;
      return [MM + -cos * dx + sin * dz, MM + -sin * dx - cos * dz] as [number, number];
    };
    const far = new Set(["job", "biz", "hq"]);
    const t = Math.floor(performance.now() / 250) % 2;
    for (const k of ["civ", "car", "biz", "hq", "gang", "player", "cop", "job", "boss"] as const) {
      for (const mk of m.markers) {
        if (mk.kind !== k) continue;
        let [px, pz] = sx(mk.x, mk.z);
        let ox = px - MM, oy = pz - MM;
        const dist = Math.hypot(ox, oy);
        let edge = false;
        if (dist > MM - 7) {
          if (!far.has(k)) continue;
          edge = true;
          px = MM + (ox / dist) * (MM - 8);
          pz = MM + (oy / dist) * (MM - 8);
        }
        g.save();
        g.translate(px, pz);
        if (edge) {
          g.rotate(Math.atan2(oy, ox) + Math.PI / 2);
          g.fillStyle = k === "job" ? "#ffd56a" : k === "hq" ? "#ffb020" : "#c95fd0";
          g.beginPath(); g.moveTo(0, -6); g.lineTo(5, 4); g.lineTo(-5, 4); g.closePath(); g.fill();
        } else {
          switch (k) {
            case "gang": g.fillStyle = "#f33"; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill(); break;
            case "boss": g.fillStyle = "#e11"; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(7, 0); g.lineTo(0, 8); g.lineTo(-7, 0); g.closePath(); g.fill(); g.stroke(); break;
            case "cop": g.fillStyle = t ? "#48f" : "#f33"; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); break;
            case "civ": g.fillStyle = "#999"; g.fillRect(-1, -1, 2, 2); break;
            case "player": g.fillStyle = "#4fe07a"; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); break;
            case "job": g.fillStyle = "#ffd56a"; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, a = (i * Math.PI) / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); break;
            case "biz": g.fillStyle = "#c95fd0"; g.fillRect(-4, -4, 8, 8); break;
            case "hq": g.fillStyle = "#ffd56a"; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -7); g.lineTo(6, 0); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); break;
            case "car": g.fillStyle = "#fff"; g.fillRect(-2, -3, 4, 6); break;
          }
        }
        g.restore();
      }
    }
    // player arrow: heading relative to camera
    g.save();
    g.translate(MM, MM);
    g.rotate(m.yaw - m.me.heading);
    g.fillStyle = "#ffd56a"; g.strokeStyle = "#000"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(0, 4); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    void R;
  };

  return {
    update(m) {
      set("cash", Math.floor(m.cash), () => (cash.textContent = fmt(m.cash)));
      set("inc", Math.round(m.income * 60), () => (inc.textContent = "+" + fmt(m.income * 60) + "/min"));
      const pct = Math.max(0, Math.min(1, m.earned / (m.goal || GOAL)));
      set("pct", Math.round(pct * 500), () => (barFill.style.width = pct * 100 + "%"));
      set("glb", Math.floor(m.earned) + "|" + m.goal, () => (glB.textContent = fmt(m.earned) + " earned / " + fmt(m.goal)));
      set("won", m.won, () => (badge.style.display = m.won ? "block" : "none"));
      set("dn", m.districtName, () => (dn.textContent = "📍 " + m.districtName));
      set("dl", m.districts.map((d) => `${d.id}${d.owned}${d.kills}${d.boss}`).join(), () => {
        dl.innerHTML = m.districts.map((d) => {
          const col = hex(DISTRICTS[d.id]?.color ?? 0xffffff);
          const st = d.owned ? "✔" : d.boss === 1 ? "<em>BOSS!</em>" : d.need ? `${d.kills}/${d.need}` : "";
          return `<div class="dr"><span class="dd" style="background:${col}"></span>${d.name}<b>${d.owned ? "✔" : d.boss === 1 ? "" : st}</b>${!d.owned && d.boss === 1 ? st : ""}</div>`;
        }).join("");
      });
      set("obj", m.objective, () => { obj.textContent = m.objective; obj.style.display = m.objective ? "block" : "none"; });

      drawMap(m);

      set("hp", Math.round(m.hp), () => (hpF.style.width = Math.max(0, Math.min(100, m.hp)) + "%"));
      set("ar", Math.round(m.armor), () => { arF.style.width = Math.max(0, Math.min(100, m.armor)) + "%"; arB.style.display = m.armor > 0 ? "block" : "none"; });
      set("wn", m.weapon + "|" + m.inCar, () => { wn.textContent = m.inCar ? "🚗 Driving" : (WEAPONS[m.weapon]?.name ?? "").toUpperCase(); ws.style.display = m.inCar ? "none" : "flex"; });
      slots.forEach((s, i) => set("s" + i, (i === m.weapon ? 2 : 0) + (i === 0 || m.owned & (1 << i) ? 1 : 0), () => {
        s.className = "sl" + (i === m.weapon ? " a" : i === 0 || m.owned & (1 << i) ? " o" : "");
      }));
      set("heat", m.heat, () => {
        starEls.forEach((s, i) => (s.className = i < m.heat ? "on" : ""));
        stars.className = "stars pn" + (m.heat > 0 ? " fl" : "");
      });
      set("job", `${m.job.active}${Math.ceil(m.job.timeLeft)}${m.job.label}${m.job.pay}`, () => {
        jobActive = m.job.active;
        job.style.display = m.job.active ? "block" : "none";
        jl.textContent = m.job.label || "Deliver the goods";
        const t = Math.max(0, Math.ceil(m.job.timeLeft));
        jt.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
        jp.textContent = "Payout " + fmt(m.job.pay);
      });
      set("xh", m.alive && !m.inCar && !m.shopOpen, () => (xh.style.display = m.alive && !m.inCar && !m.shopOpen ? "block" : "none"));
      set("hurt", Math.round(m.hurt * 50), () => (vg.style.opacity = String(Math.max(0, Math.min(1, m.hurt)))));
      set("pr", m.prompt + m.alive, () => {
        const mt = /^(?:Press |\[)?([A-Z0-9]|Space)\]?\s+(.*)$/.exec(m.prompt);
        pr.innerHTML = "";
        if (mt && /^Press /.test(m.prompt)) { el(pr, "span", "kc", mt[1] ?? ""); pr.append(mt[2] ?? ""); }
        else pr.textContent = m.prompt;
        pr.style.display = m.prompt && m.alive ? "block" : "none";
      });
      set("sp", m.inCar && m.alive, () => (sp.style.display = m.inCar && m.alive ? "block" : "none"));
      set("spn", Math.round(Math.abs(m.speed)), () => (spN.textContent = String(Math.round(Math.abs(m.speed)))));
      set("wa", m.alive + "|" + Math.ceil(m.respawn), () => {
        wa.style.display = m.alive ? "none" : "flex";
        waP.textContent = `Back on your feet in ${Math.max(0, Math.ceil(m.respawn))}…`;
      });
      set("shop", m.shopOpen, () => (shop.style.display = m.shopOpen ? "flex" : "none"));
      if (m.shopOpen) {
        set("shc", Math.floor(m.cash) + "|" + m.level + "|" + m.owned + "|" + m.job.active, () => {
          shCash.textContent = `Cash ${fmt(m.cash)} · Empire level ${m.level}/${MAX_LEVEL}`;
          cards.forEach(({ it, d, pc, b }) => {
            const owned = (it.id === 0 && !!(m.owned & 2)) || (it.id === 1 && !!(m.owned & 4));
            const maxed = it.id === 4 && m.level >= MAX_LEVEL;
            pc.textContent = fmt(it.price);
            d.textContent = it.desc + (it.id === 4 ? ` (Level ${m.level}/${MAX_LEVEL})` : "");
            b.disabled = owned || maxed || m.cash < it.price;
            b.textContent = owned ? "OWNED" : maxed ? "MAX" : "BUY";
          });
          goBtn.textContent = m.job.active ? "Cancel run" : "Start import run";
        });
      }
    },
    feed(text, tone) {
      const d = el(fd, "div", "t" + tone);
      d.textContent = text;
      d.addEventListener("animationend", (e) => { if ((e as AnimationEvent).animationName === "ckfd") d.remove(); }, { signal });
      while (fd.children.length > 7) fd.firstChild?.remove();
    },
    hit(kind) {
      hm.className = "hm";
      void hm.offsetWidth;
      hm.className = "hm go" + (kind === 2 ? " hs" : "");
    },
    dispose() {
      root.remove();
      style.remove();
    },
  };
}
