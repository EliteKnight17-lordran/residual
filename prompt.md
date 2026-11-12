Build "Residual": a web app that helps Filipino senior high and first-year
college students see the gap between their answer and the right one.

WORK MODE: ONE RUN, NO QUESTIONS
Finish everything below in this single run. Do not stop to ask me anything
and do not wait for plan approval. When something is unclear, pick the
simplest option, write it in DECISIONS.md, and continue.

THE IDEA
Graphing tools show the right picture. Residual asks the student for their
answer first, then draws what THEIR answer would look like beside the correct
one, and names the exact mix-up in one short caption.

ONE STORY, FOUR TOPICS: A JEEPNEY RIDE
1. Slope (y = mx + b). Fare vs distance: b is the base fare, m is the added
   fare per km. Sliders for m and b. Show the rise-and-run triangle.
   The story uses m >= 0; a "plain graph" toggle allows negatives and fractions.
2. Two lines meeting. Two fare schemes, each with its own m and b. Show the
   crossing point: the distance where both cost the same, and which is
   cheaper before and after it. Handle parallel lines (never equal).
3. Slope of a curve. Distance vs time with s(t) = a * (T * t^2 / 2 - t^3 / 3).
   A point moves along the curve with its tangent line. A second point
   closes in as the gap h shrinks, and the line between them becomes the
   tangent. The slope at that moment is the speed.
4. Area under a curve. Speed vs time with v(t) = a * t * (T - t), the same
   trip as topic 3. Sliders for a and T. A slice sweeps left to right as the
   area fills. Then rectangles go 4, 8, 16, 100 and the total closes in on
   the exact value. The area is the distance travelled.
Closing step: show that the slope of the topic 3 curve at any time equals the
height of the topic 4 curve, and the area under topic 4 up to that time
equals the height of topic 3.
Label all fare, speed, and distance values as examples, not real figures.

THE FLOW FOR EVERY QUESTION
Ask -> student predicts -> draw their answer and the correct one side by side
-> caption names the mix-up -> step-by-step replay with next, back, play,
pause, and speed.

QUESTION TYPES
Each topic has at least three questions. A question is either:
- Numeric: the student types a number (for example "what is the slope?").
- Multiple choice: used for mistakes that are ideas, not numbers. Each wrong
  option maps to exactly one catalog entry.

MISTAKE CATALOG (store as data, not scattered in code)
Slope: gives b as the slope (numeric); thinks a bigger b makes the line
steeper (choice); flips rise and run, 1/3 instead of 3 (numeric); divides y
by x at one point when b is not 0 (numeric); says a negative slope goes up
(choice).
Two lines: says the higher base fare is always more expensive (choice); gives
only the distance and not the cost (numeric); says parallel lines cross
(choice); subtracts the wrong way and gets a negative distance (numeric).
Slope of a curve: gives the average speed of the whole trip (numeric); says
the slope is the same everywhere (choice); gives the height (distance)
instead of the slope (numeric); says there is no answer because h = 0 gives
0 / 0 (choice).
Area: multiplies final height by width (numeric); gives a height instead of
the area (numeric); thinks more rectangles keeps growing the total (choice);
treats the 4-rectangle estimate as exact (numeric); forgets that km/h times h
gives km (choice).
Each entry has: how to detect it from the student's answer, what to draw,
and the caption. Answers matching no entry get a neutral comparison, never a
guessed diagnosis. If a numeric answer matches two entries at once, show the
neutral comparison.

HARD RULES
- One static web app. No backend, no API keys, works offline: no CDN at
  runtime, keep any library inside the project.
- It must work both when index.html is opened directly from disk and when
  served from a local server. Avoid anything that breaks on file:// pages.
- Keep all math and mistake detection in one file with no DOM code, so it
  can be tested on its own.
- Every number on screen is computed from the current slider values.
  Never hard-code a displayed value. Show numbers to 2 decimal places.
- Captions under 20 words, with an English / Taglish toggle.
- Works at phone width. Large text, color-blind-safe colors, keyboard controls.
- Do not claim it understands any question. It covers these four topics.

BUILD ORDER
1. Write an implementation plan and task list. Name the riskiest part.
2. Build the math file, then the test page, then the interface.
3. Finish and test topics 1 and 4 fully before starting 2 and 3.

TEST PAGE AT ?test=1
It runs everything by script when the page loads and shows pass or fail per
group. Do not perform these by hand in the browser; open the page and read
the results. Use a seeded random generator and print the seed so failures
can be repeated. Compare numbers with a small tolerance, not exact equality.
A. Math, 10,000 random cases per check:
   - line values, slope, and triangle sides match an independent calculation
   - the crossing point lies on both lines; parallel lines report no crossing
   - the slope between two points on s(t) approaches v(t) as h shrinks
   - rectangle sums for random n from 1 to 1,000 match an independent loop
   - the error against the exact area a * T^3 / 6 shrinks as n grows
   - the area under v from 0 to t equals s(t)
B. Mistake catalog, 1,000 random cases per numeric entry, and every option of
   every multiple-choice question:
   - a wrong answer built from that mistake is detected as that entry
   - skip random cases where the wrong answer happens to equal the correct
     answer or another entry's answer, and count how many were skipped
   - a correct answer is never flagged as a mistake
   - answers within rounding distance of correct count as correct
C. Input abuse: empty, spaces, letters, "3/1", "1/3", "-0", commas, huge
   numbers, Taglish sentences, emoji, HTML tags. The app must never crash and
   never show NaN, Infinity, or undefined.
D. Interface stress, scripted by sending events to the real controls, on
   every topic:
   - sweep every slider end to end 200 times
   - 500 random presses of next, back, play, pause, topic switch, and the
     language toggle, including during animations
   - after each: zero errors caught and no NaN anywhere in the page text
E. Offline: confirm the page requests nothing from an outside host.

LAYOUT CHECK (this one is done in the browser, not by script)
View every topic at widths 320, 375, 768, and 1280. Fix any overflow,
overlapping text, or controls that are too small to tap. Take a screenshot
of each topic at 375 and 1280.

FIX LOOP
Open ?test=1 in the browser. Fix every failure and rerun the whole page.
Repeat until it is fully green twice in a row. Never weaken or delete a test
to make it pass. If something still fails after 5 rounds, stop and report it
honestly instead of hiding it.

ROLE-PLAY PASS
Go through all four topics three times in the browser as: a Grade 11 student
weak in algebra, the same student on a small phone, and a math teacher
hunting for errors. Fix what confuses or misleads them, then rerun ?test=1.

FINISH
Write a walkthrough with screenshots, the final test results and seed, what
the role-play changed, anything still failing, and a note that role-play is
not testing with real students. Add a README with how to open the app.

DONE MEANS
Test page green twice in a row, no console errors, loads with the network
off, and a student who answers "the slope of y = 3x + 2 is 2" sees why in
under 30 seconds.
