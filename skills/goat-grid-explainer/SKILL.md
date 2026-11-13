---
name: goat-grid-explainer
description: Grid Explainer · Торон дэвтэр. Turns one talking-head clip into a light, step-by-step app demo on off-white grid paper. The speaker opens full screen, then shrinks into a white-framed card in the lower half; a blue rail tags each chapter, a bold headline marks one keyword in blue serif italic inside a dashed selection box, and a small white app card acts out each point (a message that types itself, toggles switching on, a big blue number or time, a bar chart). The face zooms back to full screen for emphasis. Renders a 1080x1920 MP4 for Reels/TikTok. Best for coaches, health, real estate and ecommerce owners explaining steps, a booking flow or "how it works". Use whenever the user wants an explainer, a tutorial reel, a "how to book" video, or Odko's grid-paper app style, or types /goat-grid-explainer, /торон-дэвтэр, or says "алхам алхмаар тайлбарласан видео хий", "Одког шиг тайлбар видео", "make an explainer reel", even if they don't name the skill.
---

# Grid Explainer · Торон дэвтэр

A talking head on off-white grid paper. After a full-screen open, the face sits in a rounded card with a thick white frame and a soft shadow in the lower half of the screen. A thin blue rail at the left ends in a ring node with a blue chapter tag that changes per section. Above it, a bold black headline with one keyword in blue serif italic inside a dashed design-tool selection box with corner handles. Between the headline and the face, a small white app card acts out the point. Between sections and in "full" moments the face zooms back to full screen. It is the only GOAT look that turns a talk into a light app demo.

**Good for:** coaches, health, real estate, ecommerce, services with a booking flow: anyone explaining steps, "how to book", "what you get", a result in numbers.
**Not for:** barbers and nails where the finished work is the proof (try Proof Frame or Cinema Strip), footage with no one talking to camera, very fast hype edits. If the user's footage is one of these, say so and suggest another GOAT look.

Talk to the user in the language they write in (usually Mongolian). Keep messages short and plain; many users are not technical. `SKILL_DIR` means this skill's base directory (shown when the skill loads). Run commands from the user's project folder with absolute paths into `SKILL_DIR`.

## 1. Setup check (first time on a machine)

Run `ffmpeg -version` and `uv --version`. If either is missing, show the install command and ask before installing (it is their computer):
- Mac: `brew install ffmpeg uv`
- Windows: `winget install Gyan.FFmpeg` and `winget install astral-sh.uv`, then close and reopen the terminal.

The first render downloads a small Python package (Pillow) once. After that it is instant.

## 2. Collect the clip and words

Make `raw/` and `output/` in the current folder. Ask for:
1. **The talking-head clip.** One selfie video of them talking to camera, phone upright, face in the upper middle of the frame. Drag it into the chat or copy it into `raw/`. 20–60 s works best. Several clips also work; they play one after another.
2. **The points.** What they say, in 2–6 short steps. For each step you need a chapter tag (one or two words), a headline (3–6 words with one keyword), and what the app card should show. Never invent prices, times, phone numbers or results. Ask.

If this folder was already edited with `goat-video-editor`, use `output/cut.mp4` as the clip and `transcript/cut_words.json` for word times.

Then run: `uv run SKILL_DIR/scripts/goatcut.py probe raw/*`
It prints the length, whether there is sound, whether it is HDR, and `speech` spans (when someone is talking). Use the spans to time each section to the sentence it illustrates.

## 3. Write plan.json

Write `plan.json` in the project folder. Paths are relative to it.

```json
{
  "output": "output/grid-explainer.mp4",
  "clips": [{"src": "raw/IMG_0412.MOV", "in": 0.4, "out": 38.0}],
  "sections": [
    {"start": 1.5, "end": 7.0, "tag": "Асуулт", "headline": "Үйлчлүүлэгч *асууна*",
     "card": {"type": "message", "name": "Шинэ үйлчлүүлэгч", "sub": "Мессеж", "text": "Маргааш цаг байна уу?"}},
    {"start": 7.0, "end": 13.0, "tag": "Тохиргоо", "headline": "Онлайн *захиалга* нээх",
     "card": {"type": "toggles", "title": "Instagram тохиргоо", "items": ["Цаг захиалга", "Сануулга", "Урьдчилгаа"]}},
    {"start": 13.0, "end": 20.0, "tag": "Хариу", "headline": "Цаг *14:00*",
     "card": {"type": "big", "title": "Маргааш", "sub": "Захиалга баталгаажлаа", "value": "14:00"}},
    {"start": 20.0, "end": 27.0, "tag": "Үр дүн", "headline": "Захиалга *гурав дахин* өслөө",
     "card": {"type": "chart", "title": "Сарын захиалга", "bars": [["9 сар", 30], ["10 сар", 52], ["11 сар", 95]]}}
  ],
  "full": [[16.0, 17.5]],
  "look": {"accent": "#3B5BDB", "face_y": 0.4}
}
```

**clips** play in order. `in`/`out` trim a video (seconds). `cx`/`cy` (0–1) only matter if the clip is not 9:16. Add `"sound": false` to mute one clip.

**sections** are the points, in time order. Each has `start` and `end` (seconds in the finished video) and any of:
- `tag`: the blue chapter pill on the rail. One or two words.
- `headline`: bold black words. Put **one** keyword between two stars: `"Цаг *14:00*"`. It shows in blue serif italic inside the dashed selection box and lands half a second after the rest. Long headlines wrap to two lines and shrink to fit. The keyword font has no ₮ sign; put prices in a `big` card.
- `card`: the white app card. Four types:
  - `message`: a chat. `name` (sender, required), `sub` (small grey line, optional), `text` (required): the bubble types itself letter by letter. Keep it under about 35 letters.
  - `toggles`: a settings list. `title` (required), `items` (1–3 short labels, required). The switches turn blue one by one.
  - `big`: one huge blue value. `value` (required: a time, price or number like "14:00", "45 000₮", "+120"), `title` and `sub` (optional header with a calendar icon).
  - `chart`: a bar chart. `bars` (2–4 pairs of label and number, required), `title` (optional). The **last** bar is the blue one and rises last, so put the result last.

**Full screen:** the face is full screen before the first section, in any gap between sections, after the last section, and during each `full` range (`[start, end]` pairs). Use `full` for the punchline or an emotional sentence; 1.5–3 s each. Make sections touch (one's `end` = the next one's `start`) unless you want the face full screen in between. Each zoom takes 0.4 s.

**Auto sound effects:** a click as each card appears, typing while a message bubble types itself, a tick as each switch turns on, a whoosh each time the face zooms back to full screen.

**look** options:
- `accent`: the blue of the rail, pills, keyword and charts. Default `#3B5BDB`. Use the brand colour if the user has one, but keep it dark enough for white text.
- `face_y`: which part of the frame the face card shows, 0 (top) to 1 (bottom). Default `0.4`. Raise it if the head is cut off at the bottom of the card, lower it if there is too much ceiling.

**Timing:** start the first section 1–2 s in, after the hello. Give each section 4–7 s, starting when the speaker starts that point. The headline fades in at once, the card 0.25 s later, then the card acts (typing, switches, bars).

Before rendering, tell the user the plan in plain words (each section: tag, headline, what the card shows) and ask "OK?". This is the only approval needed.

<!-- audio: this section is copied from core/skill-audio.md by build.py; edit it there -->
## Sound effects, voice-over and music

**Sound effects are on by default.** The look adds its own (see "Auto sound effects" above). They are made in code, so there's nothing to license, and they sit quietly under the voice.
- Turn them off: `"sfx": false`. Make them quieter or louder: `"sfx": {"volume": 0.6}`.
- Add one: `"sfx": {"add": [{"sound": "ding", "at": 4.2}]}`. Sounds: whoosh, swish, pop, click, type, shutter, boom, thud, hit, riser, ding, notify, shimmer, paper, tape, marker, projector, tick. `type`, `marker`, `projector` and `riser` also take `"dur"` in seconds; a riser should end on the moment it builds to.
- Let the user hear one render before adding more. Too many sounds feel cheap.

**Voice-over.** If the user wants to talk over the video, ask them to record it on their phone (a voice memo is fine: m4a, mp3 or wav) and copy it into `raw/`. Then add `"voiceover": {"src": "raw/vo.m4a", "at": 0.5}` (`at` = when it starts; optional `"volume"`). While the voice plays, the clips' own sound and the music dip automatically. Run `goatcut.py probe raw/vo.m4a` to get its `speech` spans and time the words on screen to them. The clips must add up to at least the voice-over's length (the render warns if not). Recording tips for the user: a small quiet room (a parked car or a wardrobe works), phone about 20 cm from the mouth, read the script out loud once before recording.

**Music.** `"music": {"src": "raw/song.mp3", "volume": 0.25}`. Only use music the user has the rights to. Music added inside the Instagram/TikTok app is the safe choice, so suggest that first.
<!-- /audio -->

## 4. Render and check

`uv run SKILL_DIR/scripts/render.py plan.json`

A 30 s video takes about 50 s. Then look at three frames, each in the middle of a section, before saying it is done:
`ffmpeg -y -loglevel error -ss 4 -i output/grid-explainer.mp4 -frames:v 1 output/check-1.jpg` (and two more times). Read them. Check that headlines are not cut off, the face sits well in its card (fix with `face_y`), and each card shows what the speaker is saying at that moment.

If a render fails twice, stop and explain the error in plain words. Don't loop.

## 5. Hand over

Tell the user where the file is (`output/grid-explainer.mp4`) and that it is ready to post. Music can be added in the Instagram/TikTok app.

## Rules

- Headlines and cards sit inside the area no app buttons cover. The face card's bottom edge goes under the caption area on purpose; keep anything the viewer must read in a headline or card, never as speech only.
- Use only the fonts bundled in `SKILL_DIR/fonts` (Inter and PT Serif Italic; they have Ө ө Ү ү). Don't swap in other fonts.
- One keyword per headline. The selection box only works when it marks the one word that matters.
- Cards show real numbers and real messages from the user. Never make up a customer message, a result or a chart value.
- The output is 1080x1920, 30 fps, H.264, sound normalised to -14 LUFS (Instagram/TikTok level).
