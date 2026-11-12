# Shot list

All clips: MPEG-4 video (mp4v codec) in `.mp4` files, 30 frames per second, no audio, real time (nothing sped up).
Desktop clips are 1280x720. The phone clip is 374x812 (a 375-wide window; the encoder needs an even width, so one pixel column is dropped).
Each clip has an end screenshot with the same name plus `-end.png`.

| File | Length | What appears on screen |
| --- | --- | --- |
| `01-intro.mp4` | 0:29.3 (29.3 s) | Title, tagline and the five topic tabs; pointer passes over each tab; slow scroll down the slope page and back up. |
| `02-slope.mp4` | 1:04.5 (64.5 s) | Types 2 for the slope of y = 3.00x + 2.00; caption names the mix-up; "Your answer" and "Correct" side by side; replay plays once; m then b sliders dragged. |
| `03-two-lines.mp4` | 0:55.0 (55.0 s) | Two lines topic, Question 3; wrong option picked; caption and side-by-side correction; replay once; m (A) slider dragged so the lines cross at a different place. |
| `04-curve-slope.mp4` | 0:51.0 (51.0 s) | Distance curve with point and tangent; t moved (mouse, then arrow keys) so the point rides the curve; "Shrink the gap h" animation runs. |
| `05-area.mp4` | 0:55.9 (55.9 s) | Speed curve; slice sweeps left to right; rectangle count steps 4, 8, 16, 100; then each count clicked by hand with total and exact area shown. |
| `06-closing.mp4` | 0:50.7 (50.7 s) | Connect tab: distance and speed graphs side by side with the summary box; t dragged; "Move t along the trip" animation. |
| `07-taglish.mp4` | 0:33.8 (33.8 s) | Slope answer 2 checked; language button clicked English to Taglish to English to Taglish while the caption is on screen; scroll through the Taglish page. |
| `08-phone.mp4` | 0:45.4 (45.4 s) | 375-wide phone layout: scroll to the question, type 2, check, caption, stacked pictures, replay once. |
| `09-tests.mp4` | 1:47.8 (107.8 s) | index.html?test=1 runs to the end; groups A to E all PASS; seed shown; slow scroll through every check; final heading held 5 s. |

## Timecodes inside each clip

Times are minutes:seconds from the start of the clip, taken from the recorder's log (accurate to about half a second).

### 01-intro.mp4 (0:29.3, end screenshot `01-intro-end.png`)

- 0:00.3  Title "Residual", tagline, language button, the five topic tabs; slope topic open
- 0:12.6  Pointer has passed over each topic tab (no clicks)
- 0:15.6  Slow scroll down the slope page: graph, notes, sliders, question card
- 0:21.5  Bottom of page: plain-graph checkbox and the scope note
- 0:27.2  Back at the top

### 02-slope.mp4 (1:04.5, end screenshot `02-slope-end.png`)

- 0:00.3  Slope topic. Question 1: "What is the slope of y = 3.00x + 2.00?"
- 0:04.5  Typed 2 in the answer box
- 0:07.7  Checked. Caption: You gave b = 2.00, the base fare. The slope is m = 3.00, the fare added per km.
- 0:11.4  Side by side: "Your answer" (dashed, slope 2) and "Correct" (slope 3), replay at step 4 of 4
- 0:16.6  Pressed Play steps: replay restarts at step 1 and walks to step 4
- 0:27.2  Replay finished on: Slope = rise ÷ run = 3.00. It is the number beside x.
- 0:30.6  Scrolled up to the main graph and sliders
- 0:45.9  Dragged m 3 -> 5 -> 1 -> 3: the line tilts. The comparison card disappears as soon as a slider moves
- 1:02.0  Dragged b 2 -> 14 -> 0 -> 2: the line lifts and drops without tilting

### 03-two-lines.mp4 (0:55.0, end screenshot `03-two-lines-end.png`)

- 0:03.3  Two lines topic: schemes A and B on one graph
- 0:08.0  Question 3: Scheme A: y = 2.00x + 15.00. Scheme B: y = 4.00x + 5.00. Scheme A has the higher base fare. Is A always the more expensive ride?
- 0:12.0  Picked the wrong option: "Yes. A higher base fare always costs more."
- 0:15.4  Checked. Caption: Base fare only decides the start. The per-km rate decides who wins later.
- 0:19.5  Side by side: "Your answer" (A drawn parallel above B) and "Correct" (lines crossing at 5 km)
- 0:24.7  Pressed Play steps
- 0:35.1  Replay finished on: Past 5.00 km, A is the cheaper ride.
- 0:39.1  Scrolled up to the main graph and sliders
- 0:52.4  Dragged m (A) 2 -> 3.5 -> 0.5 -> 2: where the two lines cross slides along the graph

### 04-curve-slope.mp4 (0:51.0, end screenshot `04-curve-slope-end.png`)

- 0:03.0  Curve slope topic: distance curve, point at t = 0.25, solid tangent, dashed line to a second point
- 0:20.3  Dragged t 0.25 -> 0.6 -> 0.15 -> 0.25 with the mouse (graph is partly off screen: it and the slider do not fit in 720 px)
- 0:34.7  Same slider moved with the arrow keys, graph in full view: t 0.25 -> 0.70 -> 0.40, the point rides the curve and the tangent tilts with it
- 0:38.8  Tabbed to the "Shrink the gap h" button (focus ring on it)
- 0:43.3  Pressed Space: h shrinks from 0.50 to 0.01, the second point closes in and the dashed line swings onto the tangent
- 0:47.4  Animation done. Notes: s(t) = 120.00 × (1.00 × t² ÷ 2 − t³ ÷ 3) At t = 0.40 h the jeepney has gone 7.04 km Gap h = 0.01 h: slope between the two points = 28.92 km/h Hidden until you check an answer.

### 05-area.mp4 (0:55.9, end screenshot `05-area-end.png`)

- 0:02.7  Area topic: speed curve, shaded area to t = 0.50, 4 rectangles
- 0:07.5  Opened Question 4 (the only area question that leaves the exact area visible under the graph)
- 0:17.4  Tabbed to the "Sweep, then add rectangles" button
- 0:22.8  Pressed Space: the slice sweeps left to right for 3 s, then the rectangle count steps 4, 8, 16, 100 (1.3 s each)
- 0:31.1  Animation done. Notes: v(t) = 120.00 × t × (1.00 − t) 100 rectangles from 0 to 1.00 h: total 20.00 km Exact area (distance travelled): 20.00 km Exact minus rectangles: 0.00 km
- 0:38.5  Clicked 4 rectangles. = 120.00 × t × (1.00 − t) 4 rectangles from 0 to 1.00 h: total 18.75 km Exact area (distance travelled): 20.00 km Exact minus rectangles: 1.25 km
- 0:42.2  Clicked 8 rectangles. = 120.00 × t × (1.00 − t) 8 rectangles from 0 to 1.00 h: total 19.69 km Exact area (distance travelled): 20.00 km Exact minus rectangles: 0.31 km
- 0:45.9  Clicked 16 rectangles. = 120.00 × t × (1.00 − t) 16 rectangles from 0 to 1.00 h: total 19.92 km Exact area (distance travelled): 20.00 km Exact minus rectangles: 0.08 km
- 0:49.5  Clicked 100 rectangles. = 120.00 × t × (1.00 − t) 100 rectangles from 0 to 1.00 h: total 20.00 km Exact area (distance travelled): 20.00 km Exact minus rectangles: 0.00 km
- 0:52.8  Scrolled up: 100 rectangles under the whole curve

### 06-closing.mp4 (0:50.7, end screenshot `06-closing-end.png`)

- 0:02.7  Connect tab: distance graph (left) with tangent, speed graph (right) with shaded area, yellow summary box
- 0:37.3  Dragged t 0.5 -> 0.9 -> 0.2 -> 0.5: slope on the left equals height on the right; area on the right equals height on the left
- 0:43.9  Pressed "Move t along the trip": t runs from 0 to the end of the trip
- 0:46.6  Animation done. Summary: Slope of the distance curve = height of the speed curve: 0.00 km/h = 0.00 km/h. Area under the speed curve = height of the distance curve: 20.00 km = 20.00 km. So speed is the slope of distance, and distance is the area under speed.

### 07-taglish.mp4 (0:33.8, end screenshot `07-taglish-end.png`)

- 0:00.3  Slope topic, English
- 0:06.5  Checked 2. English caption: You gave b = 2.00, the base fare. The slope is m = 3.00, the fare added per km.
- 0:12.0  Clicked the language button. Taglish caption: Binigay mo ang b = 2.00, ang base fare. Ang slope ay m = 3.00, ang dagdag kada km.
- 0:17.9  Clicked again: back to English
- 0:22.3  Clicked again: Taglish, whole page
- 0:30.3  Scrolled down in Taglish: both pictures, notes, step text and replay buttons

### 08-phone.mp4 (0:45.4, end screenshot `08-phone-end.png`)

- 0:00.3  Phone width 375: title, topic tabs, start of the slope page
- 0:10.2  Scrolled down past graph and sliders to the question
- 0:14.8  Typed 2
- 0:18.1  Checked: page jumps to the caption. You gave b = 2.00, the base fare. The slope is m = 3.00, the fare added per km.
- 0:26.5  Scrolled through "Your answer" then "Correct" (stacked, not side by side, at this width)
- 0:30.3  Pressed Play steps
- 0:30.9  Scrolled to the "Correct" picture while the steps play
- 0:42.3  Replay finished on: Slope = rise ÷ run = 3.00. It is the number beside x.

### 09-tests.mp4 (1:47.8, end screenshot `09-tests-end.png`)

- 0:00.5  index.html?test=1 opened; heading "running", seed line, group A filling in
- 0:01.2  Group header appears: PASS  A.
- 0:01.2  Group header appears: PASS  B.
- 0:01.2  Group header appears: PASS  C.
- 0:42.9  Group header appears: PASS  D.
- 1:03.0  Group header appears: PASS  E.
- 1:03.8  Run finished: {"ok":true,"seed":3935769823,"seconds":63.013}
- 1:09.0  Top of the page: final heading and seed. Residual tests: ALL GROUPS PASS / Seed 3935769823. To repeat this exact run, add &seed=3935769823 to the address. Took 63.0 s. Page opened from disk (file://).
- 1:14.1  Slow scroll through every group (A to E) and every check
- 1:35.8  End of the table: group E
- 1:42.5  Final screen held 5 s: heading with the result and the seed
