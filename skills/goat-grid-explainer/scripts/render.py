# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["pillow>=10.4", "numpy>=1.26"]
# ///
"""Grid Explainer · Торон дэвтэр.

A talking head on off-white grid paper. After a full-screen open the face sits in a white-framed card
in the lower half; a blue rail tags each chapter, a bold headline marks one keyword in a dashed
selection box, and a small white app card acts out each point. The face zooms back to full screen
between sections and in the plan's "full" moments.
Usage: uv run render.py plan.json
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import goatcut as g  # noqa: E402
from PIL import Image, ImageColor, ImageDraw, ImageFilter  # noqa: E402

NAME = "grid-explainer"
GRADE = ""  # natural colour: the paper and cards carry the look
INTER, SERIF = "Inter[opsz,wght].ttf", "PT_Serif-Web-Italic.ttf"
PAPER, GRID, INK, GREY = (243, 242, 238), (227, 225, 218), (17, 17, 17), (138, 138, 144)
RAIL_X, NODE_Y = 71, 512             # rail centre line, chapter node centre
PILL_X = 122                         # chapter tag left edge
HX, HY, HW = 162, 290, 798           # headline left, top, max width (stays inside the safe box)
CX, CY, CW, CH, P = 97, 586, 886, 320, 44   # app card box, P = shadow margin around its sprite
FACE = (97, 970, 983, 1814)          # face card at rest
BORDER, RADIUS = 10, 34
ZOOM = 0.4                           # seconds for the face to grow to full screen or shrink back
CARDS = {"message": ("name", "text"), "toggles": ("title", "items"), "big": ("value",), "chart": ("bars",)}


def mix(a, b, k):
    return tuple(round(x + (y - x) * k) for x, y in zip(a, b))


def inter(ctx, size, wght=700):
    return ctx.font(INTER, size, {"wght": wght, "opsz": 32 if size >= 48 else 14})


def rrect(size, radius, fill, outline=None, width=0, s=3):
    """Anti-aliased rounded rectangle sprite (Pillow draws hard edges, so draw 3x and shrink)."""
    w, h = size
    im = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, w * s - 1, h * s - 1), radius * s, fill=fill,
                                         outline=outline, width=width * s)
    return im.resize((w, h), Image.LANCZOS)


def shadow(size, radius, blur, alpha, pad):
    """Soft drop shadow sprite, pad px bigger than size on each side."""
    w, h = size
    a = Image.new("L", (w + 2 * pad, h + 2 * pad), 0)
    ImageDraw.Draw(a).rounded_rectangle((pad, pad, pad + w, pad + h), radius, fill=int(255 * alpha))
    im = Image.new("RGBA", a.size, (20, 20, 40, 0))
    im.putalpha(a.filter(ImageFilter.GaussianBlur(blur)))
    return im


# ---------------------------------------------------------------- plan

def setup(ctx):
    try:
        ctx.accent = ImageColor.getrgb(str(ctx.opt("accent", "#3B5BDB")))[:3]
    except ValueError:
        g.die('look.accent must be a colour like "#3B5BDB"')
    ctx.face_y = ctx.opt("face_y", 0.4)
    if not isinstance(ctx.face_y, (int, float)) or not 0 <= ctx.face_y <= 1:
        g.die("look.face_y must be a number from 0 (top) to 1 (bottom)")
    ctx.light, ctx.deep = mix(ctx.accent, (255, 255, 255), 0.3), mix(ctx.accent, (0, 0, 0), 0.12)

    secs = ctx.plan.get("sections")
    if not secs:
        g.die('the plan needs "sections": one per point, each with start, end, tag, headline and card')
    for i, s in enumerate(secs, 1):
        if not (isinstance(s.get("start"), (int, float)) and isinstance(s.get("end"), (int, float))
                and s["start"] < s["end"]):
            g.die(f"section {i}: start and end must be numbers, start before end")
        if s.get("headline", "").count("*") not in (0, 2):
            g.die(f'section {i}: mark one keyword with two stars, like "Цаг *14:00*"')
        if re.search(r"\*[^*]*₮[^*]*\*", s.get("headline", "")):
            g.die(f"section {i}: the keyword font has no ₮ sign; put the price in a big card instead")
        c = s.get("card")
        if c is not None:
            if c.get("type") not in CARDS:
                g.die(f'section {i}: card type must be one of {", ".join(CARDS)}')
            for k in CARDS[c["type"]]:
                if not c.get(k):
                    g.die(f'section {i}: a {c["type"]} card needs "{k}"')
            if c["type"] == "toggles" and not 1 <= len(c["items"]) <= 3:
                g.die(f"section {i}: a toggles card takes 1 to 3 items")
            if c["type"] == "chart" and not (2 <= len(c["bars"]) <= 4 and all(
                    isinstance(b, list) and len(b) == 2 and isinstance(b[1], (int, float)) and b[1] >= 0
                    for b in c["bars"])):
                g.die(f'section {i}: chart "bars" takes 2 to 4 pairs like ["Instagram", 40]')
    ctx.secs = secs

    # Full-screen face: before the first section, in gaps between sections, after the last, and "full".
    spans, cur = [], 0.0
    for s in sorted(secs, key=lambda s: s["start"]):
        if s["start"] > cur + 1e-3:
            spans.append([cur, s["start"]])
        cur = max(cur, s["end"])
    if cur < ctx.dur:
        spans.append([cur, ctx.dur])
    for f in ctx.plan.get("full", []):
        if not (isinstance(f, list) and len(f) == 2 and f[0] < f[1]):
            g.die('"full" takes [start, end] pairs, like [[12.0, 14.5]]')
        spans.append(list(f))
    spans.sort()
    ctx.full = []
    for a, b in spans:  # merge, so touching spans don't dip back to the card
        if ctx.full and a <= ctx.full[-1][1] + 1e-3:
            ctx.full[-1][1] = max(ctx.full[-1][1], b)
        else:
            ctx.full.append([a, b])

    bg = Image.new("RGBA", (1080, 1920), PAPER + (255,))
    d = ImageDraw.Draw(bg)
    for x in range(0, 1080, 54):
        d.line((x, 0, x, 1920), fill=GRID)
    for y in range(0, 1920, 54):
        d.line((0, y, 1080, y), fill=GRID)
    d.rectangle((RAIL_X - 2, NODE_Y, RAIL_X + 1, 1920), fill=mix(ctx.accent, PAPER, 0.8))
    d.rectangle((RAIL_X - 2, 0, RAIL_X + 2, NODE_Y), fill=ctx.accent)
    g.paste(bg, rrect((32, 32), 16, ctx.accent + (255,)), RAIL_X, NODE_Y, anchor="mm")
    g.paste(bg, rrect((18, 18), 9, (255, 255, 255, 255)), RAIL_X, NODE_Y, anchor="mm")
    ctx.bg = bg
    w, h = FACE[2] - FACE[0], FACE[3] - FACE[1]
    ctx.face_shadow = shadow((w, h), RADIUS, 20, 0.2, 60)
    ctx.face_frame = rrect((w, h), RADIUS, (255, 255, 255, 255))
    ctx.face_mask = rrect((w - 2 * BORDER, h - 2 * BORDER), RADIUS - BORDER, (255, 255, 255, 255)).getchannel("A")


def SFX(ctx):
    # a click as each card appears, typing while a message types, a tick per switch,
    # a whoosh each time the face zooms back to full screen
    ev = []
    for s in ctx.secs:
        c, t0 = s.get("card"), s["start"] + 0.25
        if not c:
            continue
        ev.append({"sound": "click", "at": t0})
        if c["type"] == "message":
            ev.append({"sound": "type", "at": t0 + 0.5, "dur": len(c["text"]) / 16})
        elif c["type"] == "toggles":
            ev += [{"sound": "tick", "at": t0 + 0.7 + j * 0.45} for j in range(len(c["items"]))]
    ev += [{"sound": "whoosh", "at": a, "volume": 0.7} for a, _ in ctx.full if a > 1e-3]
    return ev


def zoom(t, ctx):
    """0 = face in its card, 1 = full screen."""
    p = 0.0
    for a, b in ctx.full:
        up = 1 if a <= 1e-3 else (t - a) / ZOOM
        down = 1 if b >= ctx.dur - 1e-3 else (b - t) / ZOOM
        p = max(p, g.clamp(min(up, down)))
    return g.ease_in_out(p)


# ---------------------------------------------------------------- sprites

def pill(ctx, text):
    f = inter(ctx, 28, 600)
    text = g.drawable(text, f)
    w = int(f.getlength(text)) + 44
    s = rrect((w, 54), 27, ctx.accent + (255,))
    ImageDraw.Draw(s).text((w / 2, 27), text, font=f, fill="white", anchor="mm")
    return s


def headline(ctx, text):
    """Plain words and the starred keyword (serif italic in a dashed selection box), up to two lines.
    Returns (plain layer, keyword sprite or None, keyword centre), positions relative to (HX, HY)."""
    m = re.fullmatch(r"([^*]*)\*([^*]+)\*([^*]*)", text)
    if m:
        words = [(w, False) for w in m[1].split()] + [(m[2].strip(), True)] + [(w, False) for w in m[3].split()]
    else:
        words = [(w, False) for w in text.split()]
    f, k = inter(ctx, 64), ctx.font(SERIF, 64)
    words = [(g.drawable(w, k if key else f), key) for w, key in words]
    size = 64
    while True:
        f, k = inter(ctx, size), ctx.font(SERIF, round(size * 1.07))
        sp, kp = f.getlength(" "), round(size * 0.18)
        lines, cur, x = [], [], 0.0
        for w, key in words:
            wd = k.getlength(w) + 2 * kp if key else f.getlength(w)
            if cur and x + sp + wd > HW:
                lines.append(cur)
                cur, x = [], 0.0
            gap = sp if cur else 0
            cur.append((w, key, x + gap, wd))
            x += gap + wd
        lines.append(cur)
        if (len(lines) <= 2 and max(it[2] + it[3] for ln in lines for it in ln) <= HW) or size <= 30:
            break
        size = int(size * 0.94)
    lh, pad = round(size * 1.3), 20
    plain = Image.new("RGBA", (HW + 2 * pad, lh * len(lines) + 2 * pad), (0, 0, 0, 0))
    keyl = plain.copy()
    dp, dk = ImageDraw.Draw(plain), ImageDraw.Draw(keyl)
    kbox = None
    for i, ln in enumerate(lines):
        base = pad + round(size * 1.0) + i * lh
        for w, key, x, wd in ln:
            if not key:
                dp.text((pad + x, base), w, font=f, fill=INK, anchor="ls")
                continue
            dk.text((pad + x + kp, base), w, font=k, fill=ctx.deep, anchor="ls")
            kbox = (round(pad + x), base - round(size * 0.98), round(pad + x + wd), base + round(size * 0.3))
            dashed(dk, kbox, ctx.light)
            for cx_, cy_ in ((kbox[0], kbox[1]), (kbox[2], kbox[1]), (kbox[0], kbox[3]), (kbox[2], kbox[3])):
                dk.rectangle((cx_ - 5, cy_ - 5, cx_ + 5, cy_ + 5), fill=ctx.light)
    if kbox is None:
        return plain, None, None
    b = (kbox[0] - 8, kbox[1] - 8, kbox[2] + 8, kbox[3] + 8)
    return plain, keyl.crop(b), ((b[0] + b[2]) / 2 - pad, (b[1] + b[3]) / 2 - pad)


def dashed(d, box, col, w=3, dash=8, gap=6):
    x0, y0, x1, y1 = box
    for a, b, c, horiz in ((x0, x1, y0, 1), (x0, x1, y1, 1), (y0, y1, x0, 0), (y0, y1, x1, 0)):
        p = a
        while p < b:
            q = min(p + dash, b)
            d.line((p, c, q, c) if horiz else (c, p, c, q), fill=col, width=w)
            p += dash + gap


def card_base(ctx):
    s = shadow((CW, CH), 26, 16, 0.12, P)
    s = s.crop((0, -10, s.width, s.height))  # shadow sits 10 px lower than the card
    s.alpha_composite(rrect((CW, CH), 26, (255, 255, 255, 255), (0, 0, 0, 12), 1), (P, P))
    return s


def header(ctx, s, d, icon, title, sub):
    """Icon + bold title + grey sub line at the top of a card (the app-card header in the reel)."""
    if icon == "person":
        g.paste(s, rrect((56, 56), 28, mix(ctx.accent, (255, 255, 255), 0.85) + (255,)), P + 34, P + 30)
        g.paste(s, rrect((20, 20), 10, ctx.light + (255,)), P + 62, P + 51, anchor="mm")
        g.paste(s, rrect((32, 18), 9, ctx.light + (255,)), P + 62, P + 72, anchor="mm")
    else:  # calendar
        g.paste(s, rrect((56, 56), 12, (255, 255, 255, 255), (227, 227, 232, 255), 3), P + 34, P + 30)
        g.paste(s, rrect((56, 16), 6, (229, 72, 77, 255)), P + 34, P + 30)
    ft, fs = inter(ctx, 32), inter(ctx, 23, 400)
    if sub:
        d.text((P + 108, P + 57), g.drawable(title or "", ft), font=ft, fill=INK, anchor="ls")
        d.text((P + 108, P + 88), g.drawable(sub, fs), font=fs, fill=GREY, anchor="ls")
    else:
        d.text((P + 108, P + 58), g.drawable(title or "", ft), font=ft, fill=INK, anchor="lm")


def card_sprite(ctx, i, c, u):
    """The app card for section i, u seconds after the card appeared."""
    s = ctx.cache(("base", i), lambda: static_card(ctx, c)).copy()
    d = ImageDraw.Draw(s)
    if c["type"] == "message":
        f = ctx.cache(("msgf", i), lambda: ctx.fit(c["text"], INTER, CW - 68 - 70, 32, 20, {"wght": 600}))
        full = ctx.cache(("msgt", i), lambda: g.drawable(c["text"], f))
        n = int(g.clamp((u - 0.5) * 16, 0, len(full)))
        txt = full[:n]
        w = int(f.getlength(txt)) + 66
        g.paste(s, rrect((w, 70), 20, (241, 241, 244, 255)), P + 34, P + 124)
        d.text((P + 60, P + 159), txt, font=f, fill=INK, anchor="lm")
        if n < len(full) or int(u * 2.5) % 2 == 0:  # caret blinks once typing stops
            x = P + 60 + f.getlength(txt) + 4
            d.rectangle((x, P + 141, x + 3, P + 177), fill=ctx.accent)
    elif c["type"] == "toggles":
        n = len(c["items"])
        for j in range(n):
            on = g.ease_in_out((u - 0.7 - j * 0.45) / 0.22)
            y = P + 120 + j * 66
            x0 = P + CW - 34 - 72
            g.paste(s, rrect((72, 40), 20, mix((227, 227, 232), ctx.accent, on) + (255,)), x0, y - 20)
            g.paste(s, rrect((32, 32), 16, (255, 255, 255, 255)), x0 + 20 + 32 * on, y, anchor="mm")
    elif c["type"] == "big":
        v = ctx.cache(("big", i), lambda: g.text_sprite(
            c["value"], ctx.fit(c["value"], INTER, CW - 68, 150, 40, {"wght": 800, "opsz": 32}),
            fill=ctx.accent + (255,)))
        a = g.ease_out((u - 0.6) / 0.3)
        if a > 0:
            vv = v.resize((max(1, round(v.width * (0.9 + 0.1 * a))), max(1, round(v.height * (0.9 + 0.1 * a)))),
                          Image.BICUBIC)
            cy = P + (CH + 100) / 2 if (c.get("title") or c.get("sub")) else P + CH / 2
            g.paste(s, vv, P + 34 + v.width / 2, cy, a, anchor="mm")
    else:  # chart
        bars = c["bars"]
        n, top = len(bars), (90 if c.get("title") else 34)
        slot = (CW - 68) / n
        bw = min(130, slot * 0.55)
        hi = max(b[1] for b in bars) or 1
        for j, (label, val) in enumerate(bars):
            last = j == n - 1
            grow = g.ease_out((u - 0.6 - j * 0.15 - (0.3 if last else 0)) / 0.5)
            h = round((CH - 62 - top) * val / hi * grow)
            x = P + 34 + slot * j + (slot - bw) / 2
            if h > 2:
                g.paste(s, rrect((round(bw), h), min(12, h // 2), (ctx.accent if last else (233, 233, 238)) + (255,)),
                        x, P + CH - 62 - h)
    return s


def static_card(ctx, c):
    s = card_base(ctx)
    d = ImageDraw.Draw(s)
    if c["type"] == "message":
        header(ctx, s, d, "person", c["name"], c.get("sub"))
    elif c["type"] == "big":
        if c.get("title") or c.get("sub"):
            header(ctx, s, d, "calendar", c.get("title"), c.get("sub"))
    elif c["type"] == "toggles":
        g.paste(s, rrect((22, 22), 11, ctx.accent + (255,)), P + 34, P + 45)
        g.paste(s, rrect((10, 10), 5, (255, 255, 255, 255)), P + 45, P + 56, anchor="mm")
        d.text((P + 68, P + 56), g.drawable(c["title"], inter(ctx, 30)), font=inter(ctx, 30), fill=INK, anchor="lm")
        for j, item in enumerate(c["items"]):
            f = ctx.fit(item, INTER, CW - 68 - 100, 27, 18, {"wght": 500})
            d.text((P + 34, P + 120 + j * 66), g.drawable(item, f), font=f, fill=(42, 42, 46), anchor="lm")
    else:  # chart
        if c.get("title"):
            d.text((P + 34, P + 56), g.drawable(c["title"], inter(ctx, 30)), font=inter(ctx, 30), fill=INK, anchor="lm")
        n = len(c["bars"])
        slot = (CW - 68) / n
        for j, (label, _) in enumerate(c["bars"]):
            last = j == n - 1
            f = ctx.fit(str(label), INTER, slot - 10, 23, 14, {"wght": 700 if last else 500})
            d.text((P + 34 + slot * (j + 0.5), P + CH - 30), g.drawable(str(label), f), font=f,
                   fill=ctx.accent if last else GREY, anchor="mm")
    return s


# ---------------------------------------------------------------- frame

def face_card(canvas, img, e, ctx):
    """Paste the talking head as a white-framed card, e of the way (0..1) to full screen."""
    x0, y0, x1, y1 = (a + (b - a) * e for a, b in zip(FACE, (0, 0, 1080, 1920)))
    x0, y0, w, h = round(x0), round(y0), round(x1 - x0), round(y1 - y0)
    bw, r = round(BORDER * (1 - e)), round(RADIUS * (1 - e))
    iw, ih = w - 2 * bw, h - 2 * bw
    sh = min(img.height, img.width * ih / iw)  # source box keeps the card's shape, full width
    sy = (img.height - sh) * ctx.face_y
    inner = img.resize((iw, ih), Image.BILINEAR, box=(0, sy, img.width, sy + sh))
    if e == 0:
        g.paste(canvas, ctx.face_shadow, x0 - 60, y0 - 60 + 14)
        g.paste(canvas, ctx.face_frame, x0, y0)
        canvas.paste(inner, (x0 + bw, y0 + bw), ctx.face_mask)
    else:
        g.paste(canvas, ctx.face_shadow.resize((w + 120, h + 120)), x0 - 60, y0 - 60 + 14, 1 - e)
        canvas.paste((255, 255, 255), (x0, y0, x0 + w, y0 + h), g.rounded_mask((w, h), r))
        canvas.paste(inner, (x0 + bw, y0 + bw), g.rounded_mask((iw, ih), max(0, r - bw)))


def frame(img, t, ctx):
    e = zoom(t, ctx)
    if e >= 0.999:
        return img
    canvas = ctx.bg.copy()
    for i, s in enumerate(ctx.secs):
        if not s["start"] <= t < s["end"]:
            continue
        u = t - s["start"]
        if s.get("tag"):
            a = g.fade(t, s, 0.25, 0.2)
            sp = ctx.cache(("pill", i), lambda: pill(ctx, s["tag"]))
            g.paste(canvas, sp, PILL_X, NODE_Y - sp.height / 2 + 10 * (1 - g.ease_out(u / 0.25)), a)
        if s.get("headline"):
            plain, key, kc = ctx.cache(("head", i), lambda: headline(ctx, s["headline"]))
            a = g.fade(t, {"start": s["start"] + 0.1, "end": s["end"]}, 0.3, 0.2)
            dy = 16 * (1 - g.ease_out((u - 0.1) / 0.3))
            g.paste(canvas, plain, HX - 20, HY - 20 + dy, a)
            if key is not None:
                k = g.ease_out((u - 0.6) / 0.25)
                if k > 0:
                    ks = key.resize((max(1, round(key.width * (0.9 + 0.1 * k))),
                                     max(1, round(key.height * (0.9 + 0.1 * k)))), Image.BICUBIC)
                    g.paste(canvas, ks, HX + kc[0], HY + kc[1] + dy, min(a, k), anchor="mm")
        if s.get("card"):
            a = g.fade(t, {"start": s["start"] + 0.25, "end": s["end"]}, 0.3, 0.2)
            if a > 0:
                dy = 24 * (1 - g.ease_out((u - 0.25) / 0.3))
                g.paste(canvas, card_sprite(ctx, i, s["card"], u - 0.25), CX - P, CY - P + dy, a)
    face_card(canvas, img, e, ctx)
    return canvas


if __name__ == "__main__":
    g.run(sys.modules[__name__])
