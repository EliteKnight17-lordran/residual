# Decisions made without asking

Where the brief was unclear, the simplest option was picked. Each one is listed
here so it can be overruled.

## Scope and structure

- **Five tabs, not four.** Topics 1 to 4, plus tab 5 "Connect" for the closing step.
  Tab 5 has sliders and an animation but no questions.
- **No ES modules, no libraries.** Plain `<script>` tags so the page works from
  `file://`. Nothing is loaded from a CDN, and there is no library folder because
  no library was needed.
- **`js/math.js` holds more than math.** It also holds the mistake catalog, the
  questions, the captions and the "what to draw" data for each picture (as plain
  objects). None of it touches the DOM, and the file loads in Node.
- **`tools/` is dev-only.** It opens the page in headless Edge to read the test
  page and take screenshots. The app does not use it.

## Questions

- **15 questions**: slope 4, two lines 4, curve 3, area 4.
- **Multiple-choice questions have two options.** The brief says each wrong option
  must map to exactly one catalog entry, and the catalog has one idea-mistake per
  such question. Adding a third option would have meant inventing a mistake that
  is not in the catalog. The cost is a 50% chance of guessing right.
- **Some questions need certain slider settings** (lines that cross after 0 km,
  parallel lines, a negative slope, a sweep time above 0). If the sliders do not
  fit when the question is opened, its preset is applied. If the student then
  moves the sliders out of range, the question is replaced by a short message and
  a reset button. Numbers on screen are always the slider values, never adjusted
  behind the scenes.
- **Moving a slider clears the comparison.** The pictures were drawn for the old
  values, so they are removed rather than left stale.
- **Answer-revealing lines under the graph are hidden until an answer is
  checked** (crossing point, tangent slope, exact area). On topic 1 the `m`
  slider still shows its value, since a student who knows the slope is `m` already
  knows the answer.
- **Question s3 raises b by five slider steps** (5.00 in the story, 2.50 on the
  plain graph) to make "Scheme B".

## Checking answers

- **Tolerance is 0.005** (plus a hair for floating point). That is the "rounding
  distance" for numbers shown to 2 decimal places. So 0.33 counts as 1/3, and 0.3
  does not.
- **Order of checks:** correct first, then catalog entries. Exactly one matching
  entry names the mix-up. Zero or two or more matches give the neutral
  comparison.
- **Accepted input:** `3`, `3.5`, `.5`, `-2`, `1/3`, `1,234.5`, a peso sign or
  `P`/`Php` in front, and a unit behind (`km`, `km/h`, `kph`, `h`, `pesos`,
  `php`). The unit is ignored, not checked. `3,5` is refused with "use a dot".
  Anything above 1,000,000,000 is refused. Scientific notation is refused.
- **Common mistakes that are not in the brief's catalog get the neutral
  comparison.** Example: on topic 3, "distance so far divided by time so far".
  The app does not guess.

## Math choices

- **Rectangles use left endpoints**, from 0 up to the sweep time `t` (not always
  the whole trip). For this curve the left-endpoint total is always below the
  exact area and rises toward it.
- **Time is in hours, speed in km/h, distance in km.** Slider ranges: `a` 40 to
  160, `T` 0.5 to 1.5 h, so top speed stays between 2.5 and 90 km/h.
- **`a` and `T` are shared** by topics 3, 4 and 5 ("the same trip").
- **If the second point `t + h` would fall outside the trip, it is placed on the
  other side** (`t - h`), or the gap is shortened. The gap shown is the one used.
- **Closing step measures, it does not assume.** The slope is taken with a tiny
  gap (central difference, h = 0.00001) and the area with a fine numerical sum
  (Simpson, 200 slices), then shown next to the curve heights.

## Display

- **Every measured number has 2 decimal places, including axis ticks.** Counts
  stay whole: number of rectangles (4, 8, 16, 100), "Step 2 of 4", "Question 1".
- **Rounding is half away from zero**, after snapping off floating-point dust, so
  22.525 shows as 22.53 everywhere.
- **Side by side becomes stacked under 640px.** Two graphs next to each other at
  320px would be about 140px wide each and unreadable.
- **Graph axes:** topics 1 and 2 have fixed axes so the line visibly tilts and
  lifts. Topics 3 and 4 rescale the vertical axis in steps, because distance
  ranges from under 1 km to 90 km.
- **Colours** are from the Okabe-Ito colour-blind-safe set. The student's line is
  also dashed and the correct one solid, so nothing depends on colour alone.
- **Words on graphs** ("rise", "run") are the same in both languages. Captions,
  questions, steps and notes are translated.
- **Play and Pause are two buttons**, with the one that does not apply disabled.
- **After Check, the replay sits at its last step** (both pictures complete).
  Play restarts from step 1.
- **Keyboard:** every control is a native button, slider, radio or text box. Extra
  keys: N next, B back, P play or pause. Enter in the answer box checks.
- **A blank `data:` favicon** is declared so browsers do not ask a local server
  for `favicon.ico`.

## Tests

- **The seed is random per run and printed.** Add `&seed=N` to repeat a run.
- **A slider "sweep"** visits every step on the first pass, then 7 evenly spaced
  stops (both ends included) on the other 199, alternating direction.
- **Random presses** are 75% next/back/play/pause/topic/language and 25% the other
  controls (question tabs, check, speed, animate, plus/minus, rectangle count,
  plain graph, reset, keys). A topic-switch press returns to the topic under test
  half the time.
- **Canvas text is checked too.** Every string drawn on a canvas is recorded if it
  contains NaN, Infinity, undefined or null, and group D reads that record. An
  em dash in page text also fails, because that is what a non-finite number
  prints as.
- **Group B also checks** catalog structure, the two-entries-at-once rule and the
  20-word caption limit.
