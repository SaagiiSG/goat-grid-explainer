---
name: goat-grid-explainer
description: Grid Explainer · Торон дэвтэр. Turns a talking-head clip into a light, step-by-step app demo on off-white grid paper. The speaker opens full screen, then shrinks into a white-framed card in the lower half; a blue rail tags each chapter, a bold headline marks one keyword in blue serif italic inside a dashed selection box, and a small white app card acts out each point (a message that types itself, switches turning on, a big blue number or time, a bar chart). The face grows back to full screen between points and for emphasis. Cuts the pauses out; plain white captions if wanted. Built on HyperFrames. Renders a 1080x1920 MP4 for Reels/TikTok. Best for coaches, health, real estate and ecommerce owners explaining steps, a booking flow or "how it works". Use whenever the user wants an explainer, a tutorial reel, a "how to book" video, or Odko's grid-paper app style, or types /goat-grid-explainer, /торон-дэвтэр, or says "алхам алхмаар тайлбарласан видео хий", "Одког шиг тайлбар видео", "make an explainer reel", even if they don't name the skill.
---

# Grid Explainer · Торон дэвтэр

A talking head on off-white grid paper. After a full-screen open, the face shrinks into a rounded card with a white frame and a soft shadow in the lower half of the screen. A thin blue rail comes down the left into a ring, beside a blue chapter tag that changes with each point. Above it, a bold black headline with one keyword in blue serif italic inside a dashed design-tool selection box with corner handles. Between the headline and the face, a small white app card acts the point out. Between points and at the moments you choose, the face grows back to full screen. Pauses are cut out so it moves along. It is the only GOAT look that turns a talk into a light app demo.

**Good for:** coaches, health, real estate, ecommerce, services with a booking flow: anyone explaining steps, "how to book", "what you get", a result in numbers. One person talking to the phone.
**Not for:** barbers and nails where the finished work is the proof (try Proof Frame or Cinema Strip), footage with no one talking to camera, very fast hype edits. If the user's footage is one of these, say so and suggest another GOAT look.

Talk to the user in the language they write in (usually Mongolian). Keep messages short and plain; many users are not technical. `SKILL_DIR` means this skill's base directory (shown when the skill loads). Run commands from the user's project folder with absolute paths into `SKILL_DIR`. `goat` below means `node SKILL_DIR/scripts/goat.mjs`.

## 1. Setup check (first time on a machine)

**Every new video, first:** run `claude plugin marketplace update goat-grid-explainer`, then `claude plugin update goat-grid-explainer@goat-grid-explainer`. If it installs a new version, tell the user a new version was installed and ask them to type `/reload-plugins` before you go on. If either command fails (offline, or installed from a zip), carry on and don't mention it.

Run `node --version` (needs 22 or newer) and `ffmpeg -version`. If either is missing, show the install command and ask before installing (it is their computer):
- Mac: `brew install node ffmpeg whisper-cpp` (whisper-cpp finds where each point starts in the speech and cuts the pauses; Homebrew's build uses the Mac's graphics chip, so it is fast).
- Windows: `winget install OpenJS.NodeJS.LTS` and `winget install Gyan.FFmpeg`, then close and reopen the terminal. For the speech step, download `whisper-bin-x64.zip` from https://github.com/ggml-org/whisper.cpp/releases, unzip it, and set `HYPERFRAMES_WHISPER_PATH` to the `whisper-cli.exe` inside (`setx HYPERFRAMES_WHISPER_PATH "C:\path\to\whisper-cli.exe"`, then reopen the terminal). Without it the speech step tries to build Whisper and needs developer tools.

The first video downloads, once: the speech model (Whisper large-v3-turbo, about 1.6 GB) and a private copy of Chrome that draws the frames. Tell the user the first run takes a while; after that it starts at once. Nothing is uploaded: everything runs on their computer, with no account.

**Long steps:** the first `transcribe` (the 1.6 GB download) and every `render` can run longer than a normal command timeout. Run them in the background, or with a 600000 ms timeout, and wait for them to end. Never stop one and start it again: an interrupted download starts again from zero. Whisper needs about 2 GB of memory; on an 8 GB computer ask the user to close other heavy apps first.

**Windows has not been tested yet.** If a step fails there, show the error to the user in plain words.

## 2. Collect the clip and the points

Make `raw/` and `output/` in the current folder. Ask for:
1. **The talking-head clip.** One selfie video of them talking to camera, phone upright, filmed from the chest up with the face in the middle of the frame. Drag it into the chat or copy it into `raw/`. 20–60 s works best. Several clips also work; they play one after another.
2. **The points.** What they say, in 2–6 short steps. For each step you need a chapter tag (one or two words), a headline (3–6 words with one keyword) and what the app card should show. Never invent prices, times, phone numbers, customer messages or results. Ask.

Then run `goat probe raw/*`. It prints each file's size, length, whether it has sound, whether it is HDR, and `speech` spans (when someone is talking).

## 3. Prepare, transcribe, cut

Write `plan.json` in the project folder with just the output and the clips for now (paths are relative to it), e.g. `{"output": "output/grid-explainer.mp4", "clips": [{"src": "raw/IMG_0412.MOV"}]}`. `in`/`out` trim a video (seconds). Add `"sound": false` to mute one clip. `cx`/`cy` (0–1, default 0.5) choose which part of a wider frame is kept.

Then run these in order. Each one says what to run first if a step is missing.
1. `goat prep plan.json`: joins the clips into one upright 1080x1920 video.
2. `goat transcribe plan.json`: writes what the speaker says, word by word with times, to `.work-grid-explainer/transcript.json`, and prints it as lines.
3. **Fix the words.** Whisper gets many Mongolian words wrong. Fix obvious spelling yourself, then show the user the lines and ask them to correct anything wrong. Change only the `text` of each word in `transcript.json`; keep `start` and `end`. If two words came out as one, split the time between them; if one word came out as two, give the merged word the first one's `start` and the second one's `end`. If Whisper missed words the user did say, add them with times between their neighbours. Never add words they didn't say. If the transcript is junk (music, no speech), write `[]` into `transcript.json`: pause cutting (and captions) turn off.
4. `goat cut plan.json`: cuts the pauses down to a short breath and moves the word times to match. It prints the old and new length. It only cuts where it also hears quiet, never cuts photos or clips without sound, and stops with a message if it would cut more than 60% of the video. Add `"cut": false` to plan.json if the user doesn't want pauses cut. **If the words are fixed after this step, run `cut` again** (it is quick: the video is reused when the cuts don't change); `render` refuses to run on an old cut.

Then read `.work-grid-explainer/words.json` (the words with their times after the cut) and time each section to the sentence it illustrates.

## 4. Write the sections

Add `sections` (and, if wanted, `full`, `look`, `captions`) to plan.json. Take every tag, headline and card from what the speaker says (the words you fixed in step 3) or from what the user gave you, never from the example below. Times are in the cut video (from `words.json`):

```json
{
  "output": "output/grid-explainer.mp4",
  "clips": [{"src": "raw/IMG_0412.MOV"}],
  "sections": [
    {"start": 1.5, "end": 7.0, "tag": "Асуулт", "headline": "Үйлчлүүлэгч *асууна*",
     "card": {"type": "message", "name": "Шинэ үйлчлүүлэгч", "sub": "Мессеж", "text": "Маргааш цаг байна уу?"}},
    {"start": 7.0, "end": 13.0, "tag": "Тохиргоо", "headline": "Онлайн *захиалга* нээх",
     "card": {"type": "toggles", "title": "Instagram тохиргоо", "items": ["Цаг захиалга", "Сануулга", "Урьдчилгаа"]}},
    {"start": 13.0, "end": 20.0, "tag": "Хариу", "headline": "Маргааш *өглөө*",
     "card": {"type": "big", "title": "Маргааш", "sub": "Захиалга баталгаажлаа", "value": "Өглөө"}}
  ],
  "full": [[16.0, 17.5]],
  "look": {"accent": "#3B5BDB", "face_y": 0.4}
}
```

**sections** are the points, in time order, never overlapping. Each has `start` and `end` (seconds in the cut video) and any of:
- `tag`: the blue chapter pill beside the rail. One or two words, one row of **27 characters at most** (spaces count).
- `headline`: bold black words (Inter, up to 58 px). Put **exactly one** keyword between two stars: `"Маргааш *өглөө*"`. It shows in blue serif italic inside the dashed selection box, which lands 0.6 s after the rest. **At most 22 characters a row** (spaces count, the stars don't); split a longer headline into 2 rows yourself with `\n` (2 rows at most, the keyword's two stars in one row). A longer row is refused with a message. A 22-character row of ordinary words stays at the full 58 px; a row of the widest capitals (Ж Ю Щ Ш) shrinks to 34 px. The keyword's font has no ₮ sign (or emoji): put prices in a `big` card.
- `card`: the white app card. Four types, each word a single row:
  - `message`: a chat. `name` (sender, required, **22 characters** at most), `sub` (small grey line, optional, **28**), `text` (required, **30**): the bubble types itself at 16 letters a second. It is 32 px, shrinking to 25 px for a row of the widest capitals.
  - `toggles`: a settings list. `title` (required, **22**) and `items` (1–3 labels, **25** each). The switches turn blue one by one, 0.5 s apart.
  - `big`: one huge blue value. `value` (required, **12 characters**: a time, number, price or short word, exactly as the speaker or user gave it; 128 px, shrinking to fit), `title` (**22**) and `sub` (**28**) are an optional header with a calendar icon.
  - `chart`: a bar chart. `bars` (2–4 `[label, number]` pairs, the labels and numbers the speaker or user gave; each number 0 or more, at least one above 0), `title` (optional, **22**). Labels (28 px): **13** characters for 2 bars, **9** for 3, **6** for 4. The **last** bar is the blue one and rises last, so put the result last.

A longer word row is refused with a message saying which one: shorten it. Emoji can't be drawn.

**Full screen:** the face is full screen before the first section, in any gap between sections, after the last section, and during each `full` span (`[start, end]` pairs). Each move takes 0.4 s, eased. Use `full` for the punchline or an emotional sentence; 1.5–3 s each. Under a full-screen face the section's card goes on acting unseen.

**Timing rules** (render and validate refuse a plan that breaks one, saying which and how to fix it):
- Start the first section at `0` (the face starts in its card) or 1 s or more in (a full-screen open: best, the first frame is the Reels thumbnail). End the last section at the video's end (or later: it is cut at the end) or 1 s or more before it (a full-screen ending).
- Make sections touch (one's `end` = the next one's `start`) or leave 1 s or more between them. Full screen lasts 1 s at least, and so does the face card between two full-screen moments.
- A section lasts 2 s at least, and long enough for its card to act plus 1 s to read: a message types from 0.6 s in, at 16 letters a second, so it needs 0.6 s + its letters ÷ 16 + 1 s (21 letters: 2.92 s; give it 3 s), 3 switches need 3 s, a chart 2.6–2.9 s (2–4 bars), a big value 2 s.
- A section's words come in over its first 0.9 s and fade out over its last 0.25 s, never while the face moves. Keep each `full` span's start and end 1.3 s or more from any section's start or end (the gaps between sections take care of themselves).

**look** options:
- `accent`: the blue of the rail, pills, keyword and charts. Default `#3B5BDB` (the preview's). Use the brand colour if the user has one, as `"#RRGGBB"`; it must be dark enough for the pill's white words (a light colour is refused).
- `face_y`: which band of the frame the face card shows, 0 (top) to 1 (bottom). Default `0.4`. Raise it if the head sits low in the card (chin at the card's bottom edge), lower it if the top of the head is cut off. Full screen always shows the whole frame.

**captions:** off by default (the look's own text does the talking). `"captions": true` adds plain white captions from `words.json`, 2–4 words at a time, no highlight or pop, low on the face card (about y 1700) in both card and full-screen. That is below the area app buttons keep clear, so Reels/TikTok's own caption can cover part of them; set `face_y` so the chin sits above them.

**Auto sound effects** (soft, about a third of the old version's levels; raise them with `"sfx": {"volume": 1.5}`): a click as each card comes in, one typing sound while a message types, a tick as each switch turns on, a whoosh each time the face grows to full screen. Never two within 0.5 s, and nothing over the typing.

Before rendering, tell the user the plan in plain words (each section: tag, headline, what the card shows; where the face goes full screen) and ask "OK?". This is the only approval needed.

<!-- audio: this section is copied from core/skill-audio-node.md by build.py; edit it there -->
## Sound effects, voice-over and music

**Sound effects are on by default.** The look adds its own (see "Auto sound effects" above). They are made in code, so there's nothing to license, and they sit quietly under the voice.
- Turn them off: `"sfx": false`. Make them quieter or louder: `"sfx": {"volume": 0.6}`.
- Add one: `"sfx": {"add": [{"sound": "ding", "at": 4.2}]}`. Sounds: whoosh, swish, pop, click, type, shutter, boom, thud, hit, riser, ding, notify, shimmer, paper, tape, marker, projector, tick. `type`, `marker`, `projector` and `riser` also take `"dur"` in seconds; a riser should end on the moment it builds to.
- Let the user hear one render before adding more. Too many sounds feel cheap.

**Voice-over.** If the user wants to talk over the video, ask them to record it on their phone (a voice memo is fine: m4a, mp3 or wav) and copy it into `raw/`. Then add `"voiceover": {"src": "raw/vo.m4a", "at": 0.5}` (`at` = when it starts; optional `"volume"`). While the voice plays, the clips' own sound and the music dip automatically. Run `node SKILL_DIR/scripts/goat.mjs probe raw/vo.m4a` to get its `speech` spans and time the words on screen to them. The clips must add up to at least the voice-over's length (the render warns if not). Recording tips for the user: a small quiet room (a parked car or a wardrobe works), phone about 20 cm from the mouth, read the script out loud once before recording.

**Music.** `"music": {"src": "raw/song.mp3", "volume": 0.25}`. Only use music the user has the rights to. Music added inside the Instagram/TikTok app is the safe choice, so suggest that first.
<!-- /audio -->

## 5. Render and check

`goat render plan.json`

It draws the paper, the face card, the words and the cards, mixes the sound and writes the MP4 plus a contact sheet (one frame per second) at `.work-grid-explainer/sheet.jpg`. On our test Mac a 6 s video took 11–14 s to render (transcribe about 7 s, prep and cut a few seconds each), a 15 s one 22 s. Longer videos take longer, and more if the computer is busy. Run the next render only after the last one ends.

Read the contact sheet, the first frame and two full-size frames per section of 2 s or more: 1 s after it starts (everything in) and 0.3 s before it ends (the card done acting). Never pull a frame within 0.4 s of a full-screen span's start or end (the face is moving). For the example plan:
`ffmpeg -y -loglevel error -i output/grid-explainer.mp4 -frames:v 1 output/check-0.jpg`
`ffmpeg -y -loglevel error -ss 2.5 -i output/grid-explainer.mp4 -frames:v 1 output/check-2.5.jpg` (section 1 in)
`ffmpeg -y -loglevel error -ss 6.7 -i output/grid-explainer.mp4 -frames:v 1 output/check-6.7.jpg` (section 1 done; and the same for each later section)
Check that:
- every word is spelled right (Ө ө Ү ү!) and whole, and the keyword sits in its dashed box;
- each card shows what the speaker is saying at that moment;
- the face sits well in its card: the whole head inside, the chin not on the card's bottom edge (fix with `face_y`), and nothing covers the face.

If a render fails twice, stop and explain the error in plain words. Don't loop.

## 6. Hand over

Tell the user where the file is (`output/grid-explainer.mp4`) and that it is ready to post. Music can be added in the Instagram/TikTok app.

## Rules

- Every word and graphic on screen comes from what this video says or shows, or from what the user gave you. The examples in this file are only examples: never put them in a video. If the user hasn't given the words, ask.
- Headlines, tags and cards sit inside the area no app buttons cover (x 120–960, y 270–1248). The face card's bottom goes under the app's caption area on purpose; keep anything the viewer must read in a headline or card, never as speech or captions only.
- Use only the fonts bundled in `SKILL_DIR/fonts` (Inter and PT Serif Italic; they have Ө ө Ү ү, and Inter has ₮). Don't swap in other fonts.
- One keyword per headline. The selection box only works when it marks the one word that matters.
- Cards show real numbers and real messages from the user. Never make up a customer message, a price, a time, a phone number, a result or a chart value.
- Speech and frames are made on the user's computer. Nothing is uploaded.
- The output is 1080x1920, 30 fps, H.264, sound normalised to -14 LUFS (Instagram/TikTok level).
