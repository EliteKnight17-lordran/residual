# Edit notes (version 2)

`out/final_v2.mp4`: 1920x1080, 30 fps, H.264, 118.0 seconds, 73 MB, no audio
track. `out/final.mp4` (version 1, 78 s) is left as it was.

## Still true from version 1

- **The footage shows Claude Code, not Antigravity's own agent.** The prompt is
  pasted into the Claude Code extension panel (model picker: Fable 5.2) inside
  the Antigravity IDE window, and a second message, "resume where you left off",
  follows a usage limit. The title card, captions and end card say so. Whether
  that qualifies for the Gemini Prompt Maxxing challenge is for you and the
  organisers; the video does not hide it.
- **No ffmpeg or ffprobe on this machine** and nothing was installed. Frames are
  read with OpenCV and written through Windows' built-in H.264 encoder. Figures
  here come from OpenCV.
- **The prompt is on screen for about 1.5 seconds** before it is sent, and only
  its last dozen lines are visible. Put the full prompt in the description.

## Choices made in this version

| Choice | Why |
| --- | --- |
| End card name is **Julian Miguel Vibar** | The brief said to use `<YOUR NAME>`, which is an unfilled placeholder. This is the name shown in your own recording (the Windows path in the chat). If you want a different name or a handle, change `NAME` near the top of `out/make_edit_v2.py` and run it again. |
| The label "App demo recorded by the agent after the build" stays on screen for the **whole** demo, not only at its start | So no demo frame can be mistaken for your recording, even if the video is clipped. |
| Demo clips were **not all re-recorded** | Seven of the ten were already recorded by the agent from the finished app earlier in this session (`demo/01` to `09`). The app's files were fingerprinted and are byte-for-byte the same now as then, so those recordings still show the app exactly as it is. Three new clips were recorded for this version: `10-correct`, `11-parallel`, `12-plain-graph`. |
| Each demo clip is **one unbroken excerpt** of 4 to 7 seconds | Simplest way to stay under 2 minutes with ten items. It means some asked-for moments are not in the cut. They are listed below and are in the full clips in `demo/`. |
| Demo footage is 1280x720 scaled up to 1600x900 | To match the frame of the rest of the video. It is slightly softer than your 1080p recording. |
| Part 1 is rendered again from your original file | Same cut list as version 1 (imported from `make_edit.py`), so it is your footage, not a copy of a copy. |

## Sections of final_v2.mp4

### Part 1: your recording (unchanged from version 1)

Source: `demo/2026-11-12 19-11-53.mkv`. Not modified (fingerprint identical
before and after).

| Video time | Recording time | Speed | Label on screen | What it shows |
| --- | --- | --- | --- | --- |
| 0:00 to 0:03 | title card | | | Title |
| 0:03 to 0:10 | 0:00 to 0:07 | 1x | | Prompt pasted and sent |
| 0:10 to 0:12 | 0:07 to 0:23 | 8x | 8x | Agent starts |
| 0:12 to 0:18 | 9:16.5 to 9:22.5 | 1x | time skipped: 9 min | Plan written |
| 0:18 to 0:26 | 13:00 to 14:04 | 8x | time skipped: 4 min, 8x | Maths file written, smoke test |
| 0:26 to 0:34 | 22:05 to 23:09 | 8x | time skipped: 8 min, 8x | Test page written, first run has a failed check |
| 0:34 to 0:38 | 35:10 to 35:14 | 1x | time skipped: 12 min | Usage limit stops the run |
| 0:38 to 0:46 | 37:47 to 37:55 | 1x | time skipped + recording paused | "resume where you left off" |
| 0:46 to 0:54 | 42:00 to 43:04 | 8x | time skipped: 4 min, 8x | Agent reviews screenshots, patches |
| 0:54 to 1:00 | 48:51 to 48:57 | 1x | time skipped: 6 min | Test run text: ALL GROUPS PASS |

**Prompt-entry check:** nine frames across this part were compared pixel by pixel
between version 1 and version 2. Mean difference: 0.00. The prompt entry is one
output frame for every two source frames (60 fps to 30 fps), which is normal
speed, with no cut inside it.

### Part 2: app demo recorded by the agent (new)

Your own 15-second demo (recording 61:21 to 61:36, typing 42) is no longer used.

| Video time | Clip | Excerpt | What it shows |
| --- | --- | --- | --- |
| 1:00 to 1:07 | `demo/02-slope.mp4` | 0:16 to 0:23 | 1. Answer 2 on "slope of y = 3.00x + 2.00". Caption "You gave b = 2.00, the base fare...". Both pictures side by side. Replay playing, steps 1 to 3. |
| 1:07 to 1:11 | `demo/10-correct.mp4` | 0:08.8 to 0:12.8 | 2. Answer 3 on the same question. Blue caption "Correct. Your picture and the right one match." |
| 1:11 to 1:16 | `demo/03-two-lines.mp4` | 0:19.5 to 0:24.5 | 3. Wrong option "Yes. A higher base fare always costs more." Caption and both pictures; correct picture crosses at 5 km. |
| 1:16 to 1:20 | `demo/11-parallel.mp4` | 0:22.5 to 0:26.5 | 3. Parallel case: both schemes add 3.00 per km. Wrong option picked; caption "Parallel lines never meet"; note "Parallel lines: never equal". |
| 1:20 to 1:25 | `demo/04-curve-slope.mp4` | 0:42.5 to 0:47.5 | 4. Point and tangent on the distance curve; h shrinks from 0.50 to 0.01 and the dashed line closes onto the tangent. |
| 1:25 to 1:32 | `demo/05-area.mp4` | 0:24.3 to 0:31.3 | 5. Second half of the sweep, then 4, 8, 16, 100 rectangles with total and exact area under the graph. |
| 1:32 to 1:37 | `demo/06-closing.mp4` | 0:43.5 to 0:48.5 | 6. Connect tab: t runs along the trip on both graphs; summary box shows slope = height and area = height. |
| 1:37 to 1:42 | `demo/07-taglish.mp4` | 0:09.5 to 0:14.5 | 7. English caption, language button clicked, whole page and caption switch to Taglish. |
| 1:42 to 1:46 | `demo/12-plain-graph.mp4` | 0:13.5 to 0:17.5 | 8. Plain graph on; m dragged from positive to negative; line tips to go down. |
| 1:46 to 1:50 | `demo/08-phone.mp4` | 0:16.5 to 0:20.5 | 9. 375-wide layout: 2 typed, checked, caption and stacked pictures. |
| 1:50 to 1:55 | `demo/09-tests.mp4` | 1:42.6 to 1:47.6 | 10. Test page after its run: "ALL GROUPS PASS", seed 3935769823, group A and start of B. |

### Part 3

| Video time | What |
| --- | --- |
| 1:55 to 1:58 | End card: "Residual. One prompt, four topics." / "One build prompt, plus one 'resume' message after a usage limit." / Julian Miguel Vibar |

## How the demo clips were made (same as before)

- Headless Microsoft Edge driven by `demo/record.js` with real mouse, keyboard
  and slider-drag events at real speed, 1280x720 (phone clip 375 wide).
- **The mouse pointer is drawn on by the recorder** (arrow, or a grey dot on the
  phone clip). A headless browser shows no pointer. It is not part of the app.
  The test-page clip has no pointer.
- No browser frame or address bar is in shot.
- Nothing in the app was changed, mocked or faked. Every demo frame is the real
  app running in the browser.

## Asked for but not in the cut

All of these exist in the app and are in the full clips in `demo/`. They were
left out only to keep each clip to one 4 to 8 second excerpt and the video under
2 minutes.

| Item | Where it is |
| --- | --- |
| Clip 1: dragging the m and b sliders | `demo/02-slope.mp4` from 0:31 |
| Clip 1: the last replay step | `demo/02-slope.mp4` at 0:23 to 0:27 |
| Clip 3: dragging a slider so the crossing moves | `demo/03-two-lines.mp4` from 0:39 |
| Clip 4: the point moving along the curve | `demo/04-curve-slope.mp4` at 0:22 to 0:34 |
| Clip 5: the first half of the sweep | `demo/05-area.mp4` at 0:22.8 |
| Clip 10: the test page *running* | `demo/09-tests.mp4`, first 64 seconds. The cut shows only the 5-second final hold. |

## Features skipped because they do not exist

None. Every item in the list exists in the app.

## Things that looked broken or confusing (recorded as they are, not fixed)

The full list is in `demo/DEMO_NOTES.md`. The ones visible in this cut:

1. **Clip 3:** on the two-lines topic the crossing point's dot and numbers are
   hidden whenever a slider is moved, so a labelled crossing point can never be
   watched moving. (This is why the slider drag adds little and was the first
   thing cut.)
2. **Clip 4:** the tangent's slope is never shown as a number while h shrinks.
   The line under the graph reads "Hidden until you check an answer."
3. **Clip 5:** "100 rectangles: total 20.00 km" equals "Exact area: 20.00 km"
   after rounding, which reads as if 100 rectangles are exact.
4. **Clip 5:** each rectangle count is on screen for only 1.3 seconds.
5. **Clip 6:** the excerpt ends at the end of the trip, where the summary reads
   "0.00 km/h = 0.00 km/h". True, but a flat last frame.
6. **Clip 9:** the phone clip is a 375-wide window recorded at one screen pixel
   per page pixel, so it is small and soft. The keyboard hint ("Keys: N next...")
   shows on this emulated phone.
7. **Clip 10:** the word "pass" wraps onto two lines in every row of the table.
8. **Clips 1, 2, 9:** graph labels crowd each other in the small pictures.
9. New in this version, **clip 8:** on the plain graph the triangle labels
   ("run 4.00", "(0.00, 2.00)") overlap near the y-axis.

## Still missing

- **Audio:** left empty as asked. No voiceover, no music, no audio track.
  `out/voiceover_script.txt` was written for version 1 and its demo lines no
  longer match; lines up to 0:54 still do.
- The test page is shown only as agent-recorded demo and as text in your
  recording. Your own recording never shows it open.

## Final check

- Read back with OpenCV: 1920x1080, 30 fps, 118.0 s, H.264, no audio track.
- One frame from every demo clip and the end card was extracted and looked at:
  correct topic in each, captions readable and inside the band, demo label
  present, nothing cut off.
- Prompt entry confirmed identical to version 1 (see above) and at normal speed.

## Files

- `out/final_v2.mp4`, `out/captions_v2.srt`
- `out/make_edit_v2.py`, `out/timeline_v2.json` (how it was built)
- `demo/10-correct.mp4`, `demo/11-parallel.mp4`, `demo/12-plain-graph.mp4` and
  their `-end.png` screenshots (new full clips)

## YouTube description line

> Minutes 0:00 to 1:00 are my own continuous screen recording of the build,
> edited only with the speed-ups (marked "8x") and cuts (marked "time skipped")
> shown on screen; the recording was paused once while a usage limit reset, and
> that is captioned. From 1:00 the app demo was recorded by the agent after the
> build and is labelled on screen. The app was built by Claude Code (Fable 5.2)
> running inside the Antigravity IDE.
