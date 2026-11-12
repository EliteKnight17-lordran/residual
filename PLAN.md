# Residual: implementation plan

## What gets built

A static web app, no build step, no dependencies, plain `<script>` tags (ES modules
break on `file://`, so none are used).

| File | Job |
| --- | --- |
| `index.html` | Page shell. Loads the four scripts in order. |
| `css/style.css` | Layout, phone-first. No `url()` and no web fonts. |
| `js/math.js` | All math, answer parsing, number formatting, the mistake catalog, the questions, and the "what to draw" scene data. No DOM. Loads in Node too. |
| `js/draw.js` | Draws a scene (plain data) on a canvas. |
| `js/app.js` | Sliders, questions, comparison, replay, language toggle, keyboard. |
| `js/tests.js` | The `?test=1` page: groups A to E, seeded. |
| `tools/` | Dev-only scripts that open the page in headless Edge to read results and take screenshots. Not needed to run the app. |

## Task list

1. `js/math.js`: line, crossing, s(t), v(t), secant, rectangle sums, exact area,
   `parseAnswer`, `fmt`, catalog (18 entries), questions (15), `evaluate`, `compare`.
2. `js/tests.js` groups A, B, C (pure parts) and a Node runner to iterate fast.
3. `js/draw.js`, `index.html`, `css/style.css`, `js/app.js` for topics 1 and 4.
4. Test groups C (through the real input), D, E. Get topics 1 and 4 green.
5. Topics 2 and 3, then the closing "Connect" step.
6. Layout check at 320, 375, 768, 1280. Screenshots at 375 and 1280.
7. Fix loop until `?test=1` is green twice in a row.
8. Role-play pass (three personas), fixes, rerun tests.
9. `WALKTHROUGH.md`, `README.md`, `DECISIONS.md`.

## Riskiest part

**Mistake detection that never guesses.** A numeric answer has to be matched to
exactly one catalog entry, and several entries can produce the same number for
some slider settings (for example the flipped slope 1/m equals b when m = 0.5 and
b = 2, or "height" equals "height times width" when the time is exactly 1 hour).
Naming the wrong mix-up is worse than naming none. So:

- correct is checked first, with a rounding tolerance, so a right answer is never flagged;
- an answer matching two entries, or none, gets the neutral comparison;
- test group B builds each mistake from random sliders 1,000 times, checks it is
  detected as that entry, and counts the collisions it skipped.

Second risk: the interface stress test (group D) only reads DOM text, and canvas
text is not DOM text. Every string drawn on a canvas therefore goes through one
function that records any `NaN`, `Infinity` or `undefined`, and group D reads
that record.
