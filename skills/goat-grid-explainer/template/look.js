// 11 Grid Explainer. Reads window.PLAN (goat.mjs writes it; look.mjs works out every section's frame-grid times,
// the face's moves and the face card) and builds one paused GSAP timeline.
const P = window.PLAN, T = P.T, F = P.face;
const $ = (s) => document.querySelector(s);
const el = (tag, cls, parent, text) => {
  const e = parent.appendChild(document.createElement(tag));
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text).trim();
  return e;
};
const tl = gsap.timeline({ paused: true });
const FIRST = 1 / 60; // a section or caption from frame 0 is there on frame 0, without coming in

if (P.accent) { // the preview's keyword, box and avatar colours, mixed from the member's accent
  const r = document.documentElement.style;
  r.setProperty("--accent", P.accent);
  r.setProperty("--deep", `color-mix(in srgb, ${P.accent} 88%, #000)`);
  r.setProperty("--light", `color-mix(in srgb, ${P.accent} 70%, #fff)`);
  r.setProperty("--tint", `color-mix(in srgb, ${P.accent} 13%, #fff)`);
}

// The face: the whole frame plays full screen; clip-paths cut the white-framed card out of it and #zoom scales the
// footage into the card. A move eases every part between the two states together over 0.4 s; look.mjs keeps moves apart.
const [X0, Y0, X1, Y1] = F.box, B = F.border, R = F.radius;
const inset = (b, r) => `inset(${Y0 + b}px ${1080 - X1 + b}px ${1920 - Y1 + b}px ${X0 + b}px round ${r}px)`;
const ZERO = "inset(0px 0px 0px 0px round 0px)";
const CARD = [["#frame", { clipPath: inset(0, R) }], ["#face", { clipPath: inset(B, R - B) }],
  ["#zoom", { x: F.x, y: F.y, scale: F.scale }], ["#shadow", { opacity: 1 }]];
const FULL = [["#frame", { clipPath: ZERO }], ["#face", { clipPath: ZERO }], ["#zoom", { x: 0, y: 0, scale: 1 }], ["#shadow", { opacity: 0 }]];
for (const [sel, v] of P.full0 ? FULL : CARD) gsap.set(sel, { ...v, force3D: false });
for (const m of P.moves) {
  const [a, b] = m.up ? [CARD, FULL] : [FULL, CARD];
  a.forEach(([sel, from], i) => tl.fromTo(sel, from,
    { ...b[i][1], duration: T.move, ease: "power2.inOut", force3D: false, immediateRender: false }, m.at));
}

// The app cards (preview .card): a header row of an icon, a bold title and a grey sub line, then what acts.
const heads = [], bubbles = [], bigs = [];
function header(card, icon, title, sub) {
  const r = el("div", "row", card);
  el("span", icon, r);
  const t = el("span", "", r);
  if (title !== undefined) el("span", "t1", t, title);
  if (sub !== undefined) el("span", "t2", t, sub);
}
function card(c, s, parent) {
  const e = el("div", `card ${c.type}`, parent);
  if (c.type === "message") { // the bubble types itself, 16 letters a second (spaces too)
    header(e, "av", c.name, c.sub);
    const b = el("div", "bubble", e);
    [...String(c.text).trim()].forEach((ch, i) => {
      const letter = el("span", "", b);
      letter.textContent = ch; // not el()'s text: that trims, and a space must stay a space
      tl.set(letter, { opacity: 1 }, s + T.type + i / T.cps);
    });
    bubbles.push(b);
  } else if (c.type === "toggles") { // each switch turns blue and its knob slides over, 0.5 s apart
    const r = el("div", "row", e);
    el("span", "dot", r);
    el("span", "t1", r, c.title);
    c.items.forEach((x, j) => {
      const it = el("div", "item", e);
      el("span", "", it, x);
      const sw = el("span", "sw", it), at = s + T.toggle + j * T.toggleGap;
      tl.fromTo(el("span", "on", sw), { opacity: 0 }, { opacity: 1, duration: T.toggleDur, ease: "power2.inOut", immediateRender: false }, at);
      tl.fromTo(el("span", "knob", sw), { x: 0 }, { x: 32, duration: T.toggleDur, ease: "power2.inOut", immediateRender: false }, at);
    });
  } else if (c.type === "big") { // one huge value in the accent lands
    const head = c.title !== undefined || c.sub !== undefined;
    if (head) header(e, "cal", c.title, c.sub);
    const v = el("div", head ? "value" : "value alone", e, c.value);
    tl.fromTo(v, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: T.bigDur, ease: "power3.out", immediateRender: false }, s + T.big);
    bigs.push(v);
  } else { // chart: bars rise from a line one after another, the last (the accent) 0.3 s later
    if (c.title !== undefined) el("div", "t1", e, c.title);
    const n = c.bars.length, slot = 818 / n, bw = Math.min(130, slot * 0.55);
    const top = c.title !== undefined ? 88 : 30, base = 252, hi = Math.max(...c.bars.map((b) => b[1]));
    el("div", "axis", e);
    c.bars.forEach(([label, v], j) => {
      const last = j === n - 1, x = 34 + slot * j, h = ((base - top) * v) / hi;
      const col = el("div", "col", e);
      Object.assign(col.style, { left: `${x + (slot - bw) / 2}px`, top: `${top}px`, width: `${bw}px`, height: `${base - top}px` });
      if (h >= 2) {
        const bar = el("div", last ? "bar last" : "bar", col);
        bar.style.height = `${h}px`;
        gsap.set(bar, { yPercent: 100 });
        tl.fromTo(bar, { yPercent: 100 }, { yPercent: 0, duration: T.barDur, ease: "power2.out", immediateRender: false },
          s + T.bar + j * T.barGap + (last ? T.barLast : 0));
      }
      const lb = el("div", last ? "lbl last" : "lbl", e, label);
      Object.assign(lb.style, { left: `${x + 6}px`, width: `${slot - 12}px`, top: "266px" }); // 23 px clear of the card's bottom
    });
  }
  return e;
}

// Each section: the pill, headline and card rise in layered, the keyword's dashed box lands, then all fade out over
// the last 0.25 s (look.mjs keeps both clear of the face's moves). A section that runs to the end stays.
for (const s of P.sections) {
  const g = el("div", "", $("#sections")), parts = [];
  let key = null;
  if (s.tag !== undefined) parts.push([el("div", "pill", g, s.tag), 0]);
  if (s.rows) {
    const h = el("div", "head", g);
    for (const row of s.rows) {
      const r = el("div", "", h);
      for (const p of row) {
        if (p.key) key = el("span", "sel", r, p.text);
        else r.appendChild(document.createTextNode(p.text));
      }
    }
    heads.push(h);
    parts.push([h, T.head]);
  }
  if (s.card) parts.push([card(s.card, s.start, g), T.card]);
  const at0 = s.start < FIRST;
  for (const [e, off] of parts) {
    if (at0) gsap.set(e, { opacity: 1 });
    else tl.fromTo(e, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: T.rise, ease: "power3.out", immediateRender: false }, s.start + off);
    if (!s.stays) tl.fromTo(e, { opacity: 1 }, { opacity: 0, duration: T.exit, ease: "power1.in", immediateRender: false }, s.end - T.exit);
  }
  if (key && at0) gsap.set(key, { opacity: 1 });
  else if (key) tl.fromTo(key, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: T.keyDur, ease: "back.out(1.4)", immediateRender: false }, s.start + T.key);
}

// Captions ("captions": true): plain white, a hard swap, no animation
const CAP_Y = 1700;
const caps = P.captions.map((c) => {
  const e = el("div", "cap", $("#caps"));
  el("span", "", e, c.text);
  if (c.start < FIRST) gsap.set(e, { opacity: 1 });
  else tl.set(e, { opacity: 1 }, c.start);
  tl.set(e, { opacity: 0 }, c.end);
  return e;
});

tl.set({}, {}, P.dur);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;

// Sizes need the real fonts; the renderer waits for document.fonts.ready before the first frame. Each shrinks to its
// width down to the floor look.mjs's row limits are measured at: headline 798 px (x 162-960) from 58 to 34 px,
// message 818 px with its bubble from 32 to 25, big value 818 from 128 to 64, captions 800 from 48 to 34.
function layout() {
  heads.forEach((h) => GOAT.fit(h, 798, 58, 34));
  bubbles.forEach((b) => GOAT.fit(b, 818, 32, 25));
  bigs.forEach((v) => GOAT.fit(v, 818, 128, 64));
  caps.forEach((e) => {
    GOAT.fit(e.firstChild, 800, 48, 34);
    e.style.top = `${CAP_Y - e.offsetHeight / 2}px`;
  });
}
layout();
document.fonts.ready.then(layout);
