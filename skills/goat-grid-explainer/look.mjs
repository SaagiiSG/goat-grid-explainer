// 11 Grid Explainer: a talking head on off-white grid paper. After a full-screen open the face shrinks into a
// white-framed card in the lower half; a blue rail and pill tag each section, a bold Inter headline marks one keyword
// in blue PT Serif italic inside a dashed selection box, and a white app card acts the point out (a message typing
// itself, switches turning on, a big blue value, a bar chart). Before, between and after the sections and in "full"
// spans the face grows back to full screen.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { missing } from "./scripts/fonts.mjs";

export const NAME = "grid-explainer";
export const TALKS = true;

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const INTER = ["Inter", join(SKILL_DIR, "fonts", "Inter[opsz,wght].ttf")];
const SERIF = ["PT Serif italic", join(SKILL_DIR, "fonts", "PT_Serif-Web-Italic.ttf")];

// Row limits, from HarfBuzz advances of the bundled fonts at the sizes look.js draws them (Inter's opsz follows the
// size), so a row of the widest Mongolian letters (Ю Ж Щ Ш, about 1.01 em in Inter 600-800) still fits its width:
// headline 22 x 1.027 em (the keyword's PT Serif at 62/58 of the size) x 34 px + 25 px of box = 793 of 798 px at the
// floor look.js shrinks to (ordinary words, about 0.52 em, stay at the full 58 px); tag 27 x 28.5 px = 770 of 796
// (Inter 600 28 px, fixed); a card title or name 22 x 32.6 = 717 of 744 (Inter 700 32 px, fixed, beside a 56 px
// icon); sub 28 x 26.1 = 731 of 744 (Inter 400 26 px); message 30 x 25.5 = 765 of 766 at its 25 px floor (32 px
// most of the time); a switch's label 25 x 28.3 = 708 of 722 (Inter 500 28 px); the big value 12 x 64.6 = 775 of
// 818 at its 64 px floor (128 px for "14:00"); a chart label 13 / 9 / 6 x 28.7 px (Inter 700 28 px) in a slot
// 818/n - 12 px wide: 373 of 397, 258 of 261, 172 of 192 for 2, 3, 4 bars.
// Rarer symbols wider than Ю (№ @ %) can still run past by a few px.
const ROW = { headline: 22, tag: 27, name: 22, title: 22, sub: 28, text: 30, item: 25, value: 12 };
const LABEL = { 2: 13, 3: 9, 4: 6 };

// Seconds, from a section's start: the pill, headline and card rise in layered (0, 0.05, 0.1 s, 0.35 s each), the
// keyword's box lands at 0.6 s; a message types from 0.6 s (the preview's 0.56) at 16 letters a second, switches turn on from 0.75 s every
// 0.5 s, the big value lands at 0.6 s, bars rise from 0.6 s (the last 0.3 s after the others). Everything fades out
// over the section's last 0.25 s. The face moves between its card and full screen in 0.4 s.
export const T = { move: 0.4, head: 0.05, card: 0.1, rise: 0.35, key: 0.6, keyDur: 0.3, exit: 0.25, type: 0.6, cps: 16,
  toggle: 0.75, toggleGap: 0.5, toggleDur: 0.22, big: 0.6, bigDur: 0.35, bar: 0.6, barGap: 0.15, barLast: 0.3, barDur: 0.5 };
const ENTER = Math.max(T.card + T.rise, T.key + T.keyDur); // the section's words are in place 0.9 s after it starts
const MIN_SECTION = 2, READ = 1, MIN_FULL = 1, MIN_CARD = 1, EPS = 1e-6;

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const frame = (t) => (t === Infinity ? t : Math.round(t * 30) / 30); // the frame look.js shows it on
const s2 = (t) => t.toFixed(2);
const shown = (t) => String(t).trim().replace(/\s*\n\s*/g, " / ");

function draws(text, [name, file], what) {
  const bad = missing(text, file);
  if (bad.length) throw new Error(`${what} "${shown(text)}" uses ${bad.join(" ")}, which ${name} can't draw` +
    (name === INTER[0] ? "" : ": put a price in a big card"));
}

// One row of card or tag words (a number is fine for a value or a label).
function one(v, max, what) {
  if (v === undefined) throw new Error(`${what} is missing`);
  if (!(isNum(v) || (typeof v === "string" && v.trim()))) throw new Error(`${what} is empty`);
  const t = String(v).trim();
  if (t.includes("\n")) throw new Error(`${what} "${shown(t)}" must be one row: remove the \\n`);
  if ([...t].length > max) throw new Error(`${what} "${t}" is too long (${max} characters at most): shorten it`);
  draws(t, INTER, what);
}

// "Онлайн *захиалга*\nнээх" -> rows of plain (Inter) and keyword (PT Serif italic, in the box) pieces.
export function headline(text, where = "") {
  const at = where ? `${where}: ` : "";
  if (typeof text !== "string" || !text.trim()) throw new Error(`${at}the headline is empty`);
  const rows = text.split("\n").map((r) => r.trim());
  if (rows.some((r) => !r)) throw new Error(`${at}the headline "${shown(text)}" has an empty row: remove the extra \\n`);
  if (rows.length > 2) throw new Error(`${at}the headline "${shown(text)}" has ${rows.length} rows: a headline takes 2 rows at most`);
  if ((text.match(/\*/g) ?? []).length !== 2)
    throw new Error(`${at}mark one keyword with two stars, like "Цаг *14:00*" (the headline "${shown(text)}")`);
  if (!rows.some((r) => (r.match(/\*/g) ?? []).length === 2))
    throw new Error(`${at}keep the keyword in one row: put both stars of "${shown(text)}" in the same row`);
  return rows.map((r) => {
    if ([...r.replace(/\*/g, "")].length > ROW.headline)
      throw new Error(`${at}the headline row "${r}" is too long (${ROW.headline} characters at most): shorten it, ` +
        "or split the headline into 2 rows with \\n");
    const m = r.match(/^([^*]*)\*([^*]*)\*([^*]*)$/);
    if (!m) { draws(r, INTER, `${at}the headline`); return [{ text: r, key: false }]; }
    const key = m[2].trim();
    if (!key) throw new Error(`${at}the keyword between the stars is empty in "${shown(text)}"`);
    draws(m[1] + m[3], INTER, `${at}the headline`);
    draws(key, SERIF, `${at}the keyword`);
    return [{ text: m[1], key: false }, { text: key, key: true }, { text: m[3], key: false }].filter((p) => p.text);
  });
}

const CARDS = ["message", "toggles", "big", "chart"];
function checkCard(c, at) {
  if (!c || typeof c !== "object" || !CARDS.includes(c.type)) throw new Error(`${at}: card type must be one of ${CARDS.join(", ")}`);
  const w = `${at}: the ${c.type} card's`;
  const opt = (v, max, what) => v !== undefined && one(v, max, what);
  if (c.type === "message") {
    one(c.name, ROW.name, `${w} "name"`);
    opt(c.sub, ROW.sub, `${w} "sub"`);
    one(c.text, ROW.text, `${w} "text"`);
  } else if (c.type === "toggles") {
    one(c.title, ROW.title, `${w} "title"`);
    if (!Array.isArray(c.items) || c.items.length < 1 || c.items.length > 3) throw new Error(`${at}: a toggles card takes 1 to 3 "items"`);
    for (const x of c.items) one(x, ROW.item, `${w} item`);
  } else if (c.type === "big") {
    opt(c.title, ROW.title, `${w} "title"`);
    opt(c.sub, ROW.sub, `${w} "sub"`);
    one(c.value, ROW.value, `${w} "value"`);
  } else {
    opt(c.title, ROW.title, `${w} "title"`);
    const bars = c.bars;
    if (!Array.isArray(bars) || bars.length < 2 || bars.length > 4 ||
        !bars.every((b) => Array.isArray(b) && b.length === 2 && isNum(b[1]) && b[1] >= 0))
      throw new Error(`${at}: chart "bars" takes 2 to 4 pairs like ["Instagram", 40]`);
    if (!bars.some((b) => b[1] > 0)) throw new Error(`${at}: chart "bars" needs at least one bar above 0`);
    for (const [label] of bars) one(label, LABEL[bars.length], `${w} label`);
  }
}

// The accent is the rail, pills, keyword and charts; the pill's words are white on it (3:1 contrast at least).
const HEX = /^#[0-9a-f]{6}$/i;
function accent(c = "#3B5BDB") {
  if (typeof c !== "string" || !HEX.test(c)) throw new Error('look accent must be a colour like "#3B5BDB"');
  const lin = (i) => { const v = parseInt(c.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
  if (1.05 / (L + 0.05) < 3) throw new Error(`look accent ${c.toUpperCase()} is too light for the pill's white words: pick a darker colour`);
  return c.toUpperCase();
}

// The face card (preview .face: 97,970 to 983,1814, an 8 px white border, radius 34). Inside it the whole frame is
// scaled to the card's inner width; face_y picks which band of it shows, 0 the top, 1 the bottom.
export function faceCard(faceY = 0.4) {
  if (!(isNum(faceY) && faceY >= 0 && faceY <= 1)) throw new Error("look face_y must be a number from 0 (top) to 1 (bottom)");
  const box = [97, 970, 983, 1814], border = 8, iw = box[2] - box[0] - 2 * border, ih = box[3] - box[1] - 2 * border;
  const scale = iw / 1080;
  return { box, border, radius: 34, scale, x: box[0] + border, y: box[1] + border - faceY * (1920 * scale - ih) };
}

export function validate(plan) {
  const lk = plan.look ?? {};
  accent(lk.accent);
  faceCard(lk.face_y);
  if (plan.captions !== undefined && typeof plan.captions !== "boolean") throw new Error('"captions" must be true or false');
  (Array.isArray(plan.sections) ? plan.sections : []).forEach((s, i) => {
    const at = `section ${i + 1}`;
    if (!s || typeof s !== "object") throw new Error(`${at} must be {"start": …, "end": …, "tag": …, "headline": …, "card": …}`);
    if (s.tag !== undefined) one(s.tag, ROW.tag, `${at}: the tag`);
    if (s.headline !== undefined) headline(s.headline, at);
    if (s.card !== undefined) checkCard(s.card, at);
  });
  schedule(plan, Infinity);
}

// How long a card acts after its section starts.
export function acts(card) {
  if (!card) return 0;
  if (card.type === "message") return T.type + [...String(card.text).trim()].length / T.cps;
  if (card.type === "toggles") return T.toggle + (card.items.length - 1) * T.toggleGap + T.toggleDur;
  if (card.type === "big") return T.big + T.bigDur;
  if (card.type === "chart") return T.bar + (card.bars.length - 1) * T.barGap + T.barLast + T.barDur;
  throw new Error(`card type must be one of ${CARDS.join(", ")}`);
}
const FEWER = { message: ", or shorten the message", toggles: ", or use fewer items", chart: ", or use fewer bars" };

// The sections on the frame grid look.js shows them on, the full-screen spans (before the first section, between
// sections, after the last, and "full"), merged, and the face's moves. Throws on any timing that would overlap two
// moves, flash the face card for under 1 s, cut a card short, or change a section's words while the face moves.
// dur is Infinity before prep (validate).
export function schedule(plan, dur = Infinity) {
  if (!(dur === Infinity || (isNum(dur) && dur > 0))) throw new Error("the video's length must be seconds");
  const D = frame(dur), list = plan.sections;
  if (!Array.isArray(list) || !list.length)
    throw new Error('the plan needs "sections": one per point, each with start, end, tag, headline and card');
  const secs = list.map((s, i) => {
    const at = `section ${i + 1}`;
    if (!s || typeof s !== "object") throw new Error(`${at} must be {"start": …, "end": …, "tag": …, "headline": …, "card": …}`);
    if (!(isNum(s.start) && s.start >= 0)) throw new Error(`${at}: "start" must be seconds, 0 or more`);
    if (!(isNum(s.end) && s.end > s.start)) throw new Error(`${at}: "end" must be seconds, after its start`);
    const start = frame(s.start), end = frame(Math.min(s.end, D));
    if (start >= D) throw new Error(`${at} starts at ${s2(start)} s, after the video ends (${s2(D)} s)`);
    return { ...s, at, start, end };
  });
  secs.forEach((s, i) => {
    const prev = secs[i - 1];
    if (prev && s.start < prev.end - EPS)
      throw new Error(`${s.at} starts at ${s2(s.start)} s, before ${prev.at} ends (${s2(prev.end)} s): sections go in time order and don't overlap`);
    const a = acts(s.card), need = Math.max(MIN_SECTION, a + READ);
    if (s.end - s.start < need - EPS)
      throw new Error(`${s.at} lasts ${s2(s.end - s.start)} s but needs ${s2(need)} s` +
        (a + READ > MIN_SECTION ? ` (its card acts for ${s2(a)} s, then 1 s to read it)` : "") +
        `: make it longer${FEWER[s.card?.type] ?? ""}`);
  });

  const full = plan.full ?? [];
  if (!Array.isArray(full) || !full.every((f) => Array.isArray(f) && f.length === 2 && isNum(f[0]) && isNum(f[1]) && f[0] >= 0 && f[1] > f[0]))
    throw new Error('"full" takes [start, end] pairs in seconds, like [[12.0, 14.5]]');
  const spans = [];
  const add = (a, b) => b > a + EPS && spans.push([a, b]);
  add(0, secs[0].start);
  secs.forEach((s, i) => add(s.end, secs[i + 1]?.start ?? D));
  for (const [a0, b0] of full) {
    const a = frame(a0), b = frame(Math.min(b0, D));
    if (a >= D) throw new Error(`a "full" span starts at ${s2(a)} s, after the video ends (${s2(D)} s)`);
    if (b - a < MIN_FULL - EPS) throw new Error(`a "full" span needs 1 s or more: [${a0}, ${b0}] shows for ${s2(b - a)} s`);
    add(a, b);
  }
  spans.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const [a, b] of spans) {
    const m = merged.at(-1);
    if (m && a <= m[1] + EPS) m[1] = Math.max(m[1], b);
    else merged.push([a, b]);
  }
  for (const [a, b] of merged) {
    if (b - a >= MIN_FULL - EPS) continue;
    const only = `the face is full screen for only ${s2(b - a)} s`;
    if (a < EPS) throw new Error(`${only} before section 1: start section 1 at 0 (the face starts in its card) or 1 s or more in`);
    if (b > D - EPS) throw new Error(`${only} after the last section: end it at the video's end (${s2(D)} s) or 1 s or more before it`);
    throw new Error(`${only} (${s2(a)}–${s2(b)} s) between two sections: make the sections touch (one's "end" = the next ` +
      `one's "start") or leave 1 s or more between them`);
  }
  // the face card between full-screen moments (and before the first, after the last), each 1 s at least
  const ends = [0, ...merged.flat(), D];
  for (let i = 0; i < ends.length; i += 2) {
    const [a, b] = [ends[i], ends[i + 1]];
    if (b - a > EPS && b - a < MIN_CARD - EPS)
      throw new Error(`the face shows in its card for only ${s2(b - a)} s (${s2(a)}–${s2(b)} s): leave it there 1 s or more, ` +
        'or join the full-screen moments around it into one "full" span');
  }

  const moves = [];
  for (const [a, b] of merged) {
    if (a > EPS) moves.push({ at: a, up: true });
    if (b < D - EPS) moves.push({ at: frame(b - T.move), up: false });
  }
  for (const s of secs) {
    if (s.tag === undefined && s.headline === undefined && s.card === undefined) continue;
    const changes = [["comes in", s.start, s.start + ENTER]];
    if (s.end < D - EPS) changes.push(["goes out", s.end - T.exit, s.end]);
    for (const [what, a, b] of changes)
      for (const { at } of moves)
        if (Math.max(a, at) < Math.min(b, at + T.move) - EPS)
          throw new Error(`${s.at} ${what} at ${s2(a)}–${s2(b)} s while the face moves (${s2(at)}–${s2(at + T.move)} s): ` +
            'keep a "full" span\'s start and end 1.3 s or more from any section\'s start or end');
  }
  return {
    sections: secs.map(({ at, ...s }) => ({ ...s, stays: s.end >= D - EPS })),
    spans: merged, moves, full0: merged[0]?.[0] < EPS,
  };
}

export async function prepare(ctx) {
  const { plan, dur } = ctx;
  const s = schedule(plan, dur);
  return {
    ...s,
    sections: s.sections.map((x) => ({ ...x, rows: x.headline === undefined ? null : headline(x.headline) })),
    face: faceCard(plan.look?.face_y), accent: plan.look?.accent === undefined ? null : accent(plan.look.accent),
    captions: plan.captions === true ? ctx.captions : [], T,
  };
}

// v1's events at about 30% of its levels (Saagii, 15 Nov); members raise them with "sfx": {"volume": …}. A click as
// each card comes in (not one up from frame 0), one typing sound as long as a message types, a tick as each switch turns on, a whoosh as the
// face grows to full screen. None starts within 0.5 s of the last one, or while the typing sound plays.
const r3 = (n) => Math.round(n * 1000) / 1000;
const AT0 = 1 / 60; // a section from frame 0 is up at once (look.js): its card doesn't come in, so no click
export function sfx(plan, ctx) {
  const { sections, moves } = schedule(plan, ctx.dur);
  const ev = [];
  for (const { start: s, card: c } of sections) {
    if (!c) continue;
    if (s >= AT0) ev.push({ sound: "click", at: r3(s + T.card), volume: 0.3 });
    if (c.type === "message") ev.push({ sound: "type", at: r3(s + T.type), dur: [...String(c.text).trim()].length / T.cps, volume: 0.3 });
    if (c.type === "toggles") c.items.forEach((_, j) => ev.push({ sound: "tick", at: r3(s + T.toggle + j * T.toggleGap), volume: 0.3 }));
  }
  for (const m of moves) if (m.up) ev.push({ sound: "whoosh", at: r3(m.at), volume: 0.21 });
  const out = [];
  for (const e of ev.sort((a, b) => a.at - b.at)) {
    const p = out.at(-1);
    if (!p || e.at >= p.at + Math.max(0.5, p.dur ?? 0) - 1e-9) out.push(e);
  }
  return out;
}
