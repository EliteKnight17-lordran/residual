# Demo notes

Things that looked wrong, broken or confusing while recording. Reported only.
Nothing in the app was changed: the files outside `demo/` were fingerprinted
before and after recording and are byte-for-byte identical.

## How the footage was made (read this before using it)

- **Format:** MPEG-4 video (mp4v codec) in `.mp4`, 30 frames per second, no
  audio, real time. End screenshots are `.png`.
- **The browser was headless Microsoft Edge driven by a script** (`record.js`),
  not a person at a visible window. The clicks, typing, key presses and slider
  drags are real input events, and the pacing is real time.
- **The mouse pointer is drawn on by the recorder.** A headless browser shows no
  pointer, so an arrow (a grey dot in the phone clip) is overlaid on the page
  while recording. It is not part of the app. Clip 09 has no pointer.
- **Scrolling is scripted smooth scrolling**, not a mouse wheel.
- **No browser frame, address bar or tabs appear.** Only the page is in shot. In
  clip 09 you therefore cannot see `?test=1` being typed into an address bar; the
  page itself prints "Page opened from disk (file://)" and the seed.
- **The phone clip is 374x812, not a high-resolution phone capture.** It is a
  375-wide window recorded at one screen pixel per page pixel, with one pixel
  column dropped because the encoder needs an even width. It will look soft if
  scaled up.
- **These recordings show the finished app being used.** They do not show any
  prompt being typed into a tool, or the app being built.

## What looked wrong or confusing in the app

1. **Clip 03: the crossing point's marker and numbers are not visible while a
   slider is dragged.** On the two-lines topic, three of the four questions hide
   the crossing dot, its coordinates and the "same cost at..." line until an
   answer is checked, and moving any slider clears the checked answer. The fourth
   question needs parallel lines. So there is no state in which the labelled
   crossing point can be watched moving. In the clip you see the two lines cross
   at a different place as the slider moves, with "Hidden until you check an
   answer." under the graph.

2. **Clips 02 and 03: the comparison disappears the instant a slider moves.** The
   caption and both pictures vanish on the first pixel of the drag, with no
   message. On camera it looks abrupt.

3. **Clip 04: the tangent's slope is never shown as a number while h shrinks.**
   The two-point slope is shown (it ends at 28.92 km/h for h = 0.01), but the
   value it is closing in on reads "Hidden until you check an answer." on all
   three curve questions. A viewer cannot see the two numbers meet.

4. **Clip 04: the graph and its t slider do not fit on a 1280x720 screen
   together.** With the slider in view the top of the graph is cut off. To keep
   the graph in shot, the clip moves t a second time with the arrow keys, and
   starts the "Shrink the gap h" animation with Tab and Space instead of a click.

5. **Clip 05: the graph and the rectangle-count buttons do not fit on screen
   together either.** While 4, 8, 16, 100 are clicked by hand only the lower part
   of the graph is visible. The animation was started from the keyboard for the
   same reason as in clip 04.

6. **Clip 05: the exact area is hidden on three of the four area questions.** To
   show the total approaching the exact value, the clip first switches to
   Question 4, which is the only one that leaves it visible. That switch is on
   camera and has nothing to do with the rectangles.

7. **Clip 05: "100 rectangles: total 20.00 km" equals "Exact area: 20.00 km" and
   "Exact minus rectangles: 0.00 km".** The real difference is about 0.002 km and
   rounds away. It reads as if 100 rectangles are exact, which is the very
   mix-up the app warns about elsewhere.

8. **Clip 05: the automatic rectangle steps are quick.** Each count (4, 8, 16,
   100) is on screen for 1.3 seconds, which is short for reading the total. The
   hand-clicked pass afterwards holds each for about 2.5 seconds.

9. **Clip 06: the animation ends on a flat moment.** "Move t along the trip"
   stops at the end of the trip, where the summary reads "0.00 km/h = 0.00 km/h".
   True, but a weak last frame for the closing step. The end screenshot shows
   this. Stronger frames are during the drag, from about 0:10 to 0:37 in the clip.

10. **Clip 06: the graphs and the t slider do not fit on screen together**, so the
    graph tops are cut off during the drag. They are fully in shot during the
    animation.

11. **Clip 09: groups A and B do not appear one by one.** The page is busy
    computing and cannot repaint, so by the first visible frame groups A and B
    are already listed. Groups C, D and E do arrive over time (D takes most of
    the 63 seconds, during which little changes on screen).

12. **Clip 09: the pass/fail column is too narrow.** The word "pass" wraps onto
    two lines ("pas" / "s") in every row.

13. **Clip 09: the app is visible under the results table** and can be seen
    flickering through topics while group D runs, if that part is in frame.

14. **Clip 07: only the first few seconds show the caption changing.** The
    language button and the caption are both in view without scrolling, which is
    good, but the two pictures are mostly below the fold until the final scroll.

15. **Clip 08: the keyboard hint is still shown on the phone layout** ("Keys: N
    next, B back..."). The app hides it only on real touch devices, and this was
    an emulated phone, so a real phone may not show it.

16. **Clips 02, 07, 08: graph labels crowd each other.** In the small "Your
    answer" picture, "run 4.00", "(0.00, 2.00)", "(4.00, 10.00)" and "rise 8.00"
    sit very close together near the bottom-left corner.

17. **All clips: every number has two decimals, including axis ticks** ("0.00,
    2.00, 4.00..."). This was a rule in the brief. On video it makes the axes
    look busy.

## Not recorded

- Clip 08 repeats the question, caption, pictures and replay from clip 02. It
  does not repeat the slider drags.
- No clip shows a correct answer, the plain-graph toggle, or the neutral
  comparison for an unlisted wrong answer. None was asked for.
