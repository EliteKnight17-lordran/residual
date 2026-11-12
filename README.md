# Residual

A small web app for Filipino senior high and first-year college students. It asks
for your answer first, then draws what **your** answer would look like beside the
correct one, and names the mix-up in one short caption.

One story, a jeepney ride, across four topics:

1. **Slope**: fare against distance, `y = mx + b`
2. **Two lines meeting**: two fare schemes
3. **Slope of a curve**: distance against time, the slope is the speed
4. **Area under a curve**: speed against time, the area is the distance
5. **Connect**: the same trip on both graphs

All fares, speeds and distances are made-up examples, not real figures.

Residual only checks its own built-in questions on these four topics. It does not
understand other questions, and it names a mix-up only when an answer matches one
of the 18 entries in its list. Any other wrong answer gets a plain comparison.

## How to open it

**Easiest:** double-click `index.html`. It opens in your browser straight from
disk. No install, no internet.

**From a local server** (optional, same result):

```
cd "path/to/this/folder"
python -m http.server 8000
```

then open `http://localhost:8000/`.

Works offline. Nothing is loaded from the internet at any point.

## How to use it

1. Pick a topic at the top. Move the sliders and watch the graph.
2. Read the question under "Predict first" and type a number or pick an option.
3. Press **Check my answer**. Your picture and the correct one appear, with a
   caption.
4. Press **Play steps** to replay the correct method step by step. Back, Next,
   Pause and Speed are beside it.
5. **Taglish / English** button is at the top right.

Keyboard: Tab moves between controls, arrow keys move a slider, Enter checks an
answer, N / B / P are next / back / play-pause.

## The test page

Open `index.html?test=1`. Everything runs by itself when the page loads (about a
minute) and the page shows pass or fail per group, with the seed.

- From disk, add `?test=1` to the address in the browser's address bar.
- To repeat a run exactly, add the seed: `index.html?test=1&seed=3593203976`.

Groups: A math, B mistake catalog, C input abuse, D interface stress, E offline.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `css/style.css` | Layout |
| `js/math.js` | All math, answer checking, the mistake catalog and the questions. No DOM code. |
| `js/draw.js` | Draws graphs on a canvas |
| `js/app.js` | Sliders, questions, replay, language |
| `js/tests.js` | The `?test=1` page |
| `tools/` | Optional dev scripts (Node 22+, Edge or Chrome): read the test page headlessly, take screenshots |
| `PLAN.md`, `DECISIONS.md`, `WALKTHROUGH.md` | Plan, choices made, and what was built and tested |

To change a caption, a question or a mistake, edit `CATALOG` or `QUESTIONS` in
`js/math.js`. Nothing else needs to change.

### Optional dev scripts

```
node tools/run-tests.js file      # open ?test=1 from disk and print the results
node tools/run-tests.js http      # same, served from a local server
node tools/run-tests.js offline   # same, with the browser's network switched off
node tools/shots.js               # screenshots at 320, 375, 768 and 1280
```
