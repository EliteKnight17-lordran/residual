/* Residual test page. Runs only when the address ends with ?test=1
 * (optionally &seed=12345 to repeat a run). Everything runs by script on load.
 * Groups: A math, B mistake catalog, C input abuse, D interface stress, E offline.
 */
(function (root) {
  'use strict';
  var search = root.location.search || '';
  if (!/[?&]test=1(&|$)/.test(search)) { return; }

  var M = root.ResidualMath, D = root.ResidualDraw, doc = root.document;
  function $(id) { return doc.getElementById(id); }

  /* ---- record any network use, from the moment this file loads ---- */
  var netCalls = [];
  (function hookNetwork() {
    function wrap(obj, name, label) {
      var orig = obj && obj[name];
      if (typeof orig !== 'function') { return; }
      obj[name] = function () { netCalls.push(label + ' ' + String(arguments[0] === undefined ? '' : arguments[label === 'xhr' ? 1 : 0])); return orig.apply(this, arguments); };
    }
    wrap(root, 'fetch', 'fetch');
    if (root.XMLHttpRequest) { wrap(root.XMLHttpRequest.prototype, 'open', 'xhr'); }
    if (root.navigator) { wrap(root.navigator, 'sendBeacon', 'beacon'); }
    ['WebSocket', 'EventSource'].forEach(function (name) {
      var Orig = root[name];
      if (typeof Orig !== 'function') { return; }
      root[name] = function (url, a) { netCalls.push(name + ' ' + url); return new Orig(url, a); };
      root[name].prototype = Orig.prototype;
    });
  })();

  /* ---- seeded random numbers (mulberry32) ---- */
  var seedMatch = /[?&]seed=(\d+)/.exec(search);
  var SEED = seedMatch ? Number(seedMatch[1]) >>> 0 : ((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
  var rngState = SEED;
  function rnd() {
    rngState = (rngState + 0x6D2B79F5) >>> 0;
    var t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function uni(lo, hi) { return lo + (hi - lo) * rnd(); }
  function int(lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
  function choice(arr) { return arr[int(0, arr.length - 1)]; }
  function snap(v) { return Math.round(v * 1e6) / 1e6; }
  function onStep(range) { return snap(range[0] + int(0, Math.round((range[1] - range[0]) / range[2])) * range[2]); }

  // Small tolerance, never exact equality.
  function close(a, b, rel) {
    rel = rel || 1e-9;
    return Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));
  }

  /* ---- slider-like random parameters ---- */
  var R = M.RANGES;
  var gen = {
    slope: function (plain) {
      if (plain === undefined) { plain = rnd() < 0.3; }
      var r = plain ? R.slope.plain : R.slope.story;
      return { m: onStep(r.m), b: onStep(r.b), x: onStep(R.slope.x), plain: plain };
    },
    lines: function () { return { m1: onStep(R.lines.m), b1: onStep(R.lines.b), m2: onStep(R.lines.m), b2: onStep(R.lines.b) }; },
    trip: function () { return { a: onStep(R.trip.a), T: onStep(R.trip.T) }; },
    curve: function () { var p = gen.trip(); p.t0 = onStep([0, p.T, R.tStep]); p.h = onStep(R.h); return p; },
    area: function () { var p = gen.trip(); p.t1 = onStep([0, p.T, R.tStep]); p.n = choice(M.RECT_COUNTS); return p; }
  };
  // Random sliders that satisfy what the question needs.
  function genFor(q) {
    for (var i = 0; i < 500; i++) {
      var p;
      if (q.id === 's4') { p = gen.slope(true); }
      else if (q.id === 'l4') { p = gen.lines(); p.m2 = p.m1; }
      else { p = gen[q.topic](); }
      if (!q.need || !q.need(p)) { return p; }
    }
    return JSON.parse(JSON.stringify(q.preset));
  }

  /* ---- result bookkeeping ---- */
  var groups = [];
  function group(name) { var g = { name: name, checks: [] }; groups.push(g); return g; }
  function record(g, name, fails, info) {
    g.checks.push({ name: name, pass: fails.length === 0, info: info || '', fails: fails.slice(0, 5), failCount: fails.length });
    render(false);
  }
  function runCases(n, fn) {
    var fails = [];
    for (var i = 0; i < n; i++) {
      var msg;
      try { msg = fn(i); } catch (e) { msg = 'threw: ' + (e && e.message); }
      if (msg) { fails.push('case ' + i + ': ' + msg); }
    }
    return fails;
  }

  var BAD_TEXT = /NaN|Infinity|undefined|—/;

  // Walk a scene / comparison object: every number finite, every string clean.
  function dirty(obj, path) {
    path = path || '';
    if (obj === null || obj === undefined) { return null; }
    if (typeof obj === 'number') { return isFinite(obj) ? null : path + ' = ' + obj; }
    if (typeof obj === 'string') { return BAD_TEXT.test(obj) ? path + ' = "' + obj + '"' : null; }
    if (typeof obj !== 'object') { return null; }
    for (var k in obj) {
      var d = dirty(obj[k], path + '.' + k);
      if (d) { return d; }
    }
    return null;
  }

  function pageProblem() {
    var R0 = root.Residual;
    if (R0.errors.length) { return 'error caught: ' + R0.errors[0]; }
    if (D.bad.length) { return 'bad canvas text: ' + D.bad[0]; }
    var t = $('app').textContent;
    var m = BAD_TEXT.exec(t);
    if (m) { return 'bad page text "' + t.substr(Math.max(0, m.index - 40), 90) + '"'; }
    var inputs = $('app').querySelectorAll('input[type="range"]');
    for (var i = 0; i < inputs.length; i++) {
      if (BAD_TEXT.test(inputs[i].value) || !isFinite(Number(inputs[i].value))) { return 'bad slider value ' + inputs[i].id; }
    }
    return null;
  }

  /* ================= A. math ================= */
  function groupA() {
    var g = group('A. Math (10,000 random cases per check)'), N = 10000;

    record(g, 'line values, slope and triangle sides match an independent calculation', runCases(N, function () {
      var m = uni(-50, 50), b = uni(-50, 50), x0 = uni(-50, 50), run = uni(0.01, 20) * (rnd() < 0.5 ? -1 : 1);
      var x1 = x0 + run;
      var y0 = (m * 1000 * x0 + b * 1000) / 1000, y1 = (m * 1000 * x1 + b * 1000) / 1000; // independent
      if (!close(M.line(m, b, x0), y0)) { return 'line value'; }
      var sl = M.slopeBetween(x0, M.line(m, b, x0), x1, M.line(m, b, x1));
      if (!close(sl, m, 1e-6)) { return 'slope ' + sl + ' vs ' + m; }
      var t = M.triangle(m, b, x0, run);
      if (!close(t.run, x1 - x0) || !close(t.rise, y1 - y0, 1e-7) || !close(t.y0, y0) || !close(t.y1, y1) || !close(t.x1, x1)) { return 'triangle sides'; }
      if (!close(t.rise / t.run, m, 1e-6)) { return 'rise/run'; }
      return null;
    }), N + ' cases');

    record(g, 'the crossing point lies on both lines', runCases(N, function () {
      var m1 = uni(-20, 20), m2 = uni(-20, 20), b1 = uni(-100, 100), b2 = uni(-100, 100);
      if (Math.abs(m1 - m2) < 1e-3) { m2 = m1 + 1; }
      var c = M.crossing(m1, b1, m2, b2);
      if (!c) { return 'no crossing reported'; }
      var ya = b1 + c.x * m1, yb = b2 + c.x * m2; // independent
      var scale = 1e-7 * Math.max(1, Math.abs(c.x) * 20, Math.abs(c.y));
      if (Math.abs(ya - c.y) > scale || Math.abs(yb - c.y) > scale || Math.abs(ya - yb) > scale) { return 'point off a line by ' + Math.abs(ya - yb); }
      if (M.relation(m1, b1, m2, b2) !== 'cross') { return 'relation'; }
      return null;
    }), N + ' cases');

    record(g, 'parallel lines report no crossing', runCases(N, function (i) {
      var m = uni(-20, 20), b1 = uni(-100, 100), b2 = i % 10 === 0 ? b1 : b1 + uni(0.01, 50);
      if (M.crossing(m, b1, m, b2) !== null) { return 'crossing reported'; }
      var want = b1 === b2 ? 'same' : 'parallel';
      if (M.relation(m, b1, m, b2) !== want) { return 'relation not ' + want; }
      return null;
    }), N + ' cases, every 10th with identical lines');

    record(g, 'the slope between two points on s(t) approaches v(t) as h shrinks', runCases(N, function () {
      var a = uni(40, 160), T = uni(0.5, 1.5), t = uni(0, T);
      var vInd = a * (T * t - t * t); // independent
      if (!close(M.v(a, T, t), vInd)) { return 'v'; }
      var sInd = a * t * t * (T / 2 - t / 3);
      if (!close(M.s(a, T, t), sInd)) { return 's'; }
      // The gap to v(t) is exactly a * (h * (T/2 - t) - h^2 / 3). Near mid-trip the two
      // parts can cancel at one h, so the gap itself is not always smaller at the next h;
      // what must shrink with h is its ceiling, and the gap must match the formula.
      var hs = [0.1, 0.01, 0.001, 0.0001], prev = Infinity, prevBound = Infinity;
      for (var k = 0; k < hs.length; k++) {
        var h = hs[k], diff = M.secant(a, T, t, h) - vInd, err = Math.abs(diff);
        var bound = a * h * (Math.abs(T / 2 - t) + h / 3) * 1.001 + 1e-6;
        if (err > bound) { return 'h=' + h + ' error ' + err + ' above bound ' + bound; }
        if (!(bound < prevBound)) { return 'the ceiling did not shrink at h=' + h; }
        if (Math.abs(diff - a * (h * (T / 2 - t) - h * h / 3)) > 1e-6) { return 'h=' + h + ' gap does not match the exact formula'; }
        prev = err; prevBound = bound;
      }
      if (prev > a * 1e-4 * 1.6) { return 'not close at the smallest h'; }
      if (M.secant(a, T, t, 0) !== null) { return 'h = 0 should give no slope'; }
      if (!close(M.slopeNumeric(a, T, t), vInd, 1e-6)) { return 'slopeNumeric'; }
      return null;
    }), N + ' cases, h = 0.1, 0.01, 0.001, 0.0001');

    record(g, 'rectangle sums for random n from 1 to 1,000 match an independent loop', runCases(N, function () {
      var a = uni(40, 160), T = uni(0.5, 1.5), n = int(1, 1000), upTo = rnd() < 0.5 ? T : uni(0, T);
      var dt = upTo / n, sum = 0;
      for (var i = 0; i < n; i++) { var t = i * dt; sum += a * (T * t - t * t); } // independent
      sum *= dt;
      var got = upTo === T && rnd() < 0.5 ? M.rectSum(a, T, n) : M.rectSum(a, T, n, upTo);
      return close(got, sum, 1e-9) ? null : 'n=' + n + ' ' + got + ' vs ' + sum;
    }), N + ' cases');

    record(g, 'the error against the exact area a * T^3 / 6 shrinks as n grows', runCases(N, function () {
      var a = uni(40, 160), T = uni(0.5, 1.5), n1 = int(1, 500), n2 = int(n1 + 1, 1000);
      var exact = a * T * T * T / 6;
      if (!close(M.exactArea(a, T), exact) || !close(M.s(a, T, T), exact)) { return 'exact area'; }
      var e1 = Math.abs(exact - M.rectSum(a, T, n1)), e2 = Math.abs(exact - M.rectSum(a, T, n2));
      if (!(e2 < e1)) { return 'whole trip: error ' + e2 + ' at n=' + n2 + ' not below ' + e1 + ' at n=' + n1; }
      if (!close(e1 * n1 * n1, exact, 1e-6)) { return 'whole trip: error is not exact / n^2'; }
      var t = uni(0.05, T), ex = a * t * t * (T / 2 - t / 3);
      var p1 = Math.abs(ex - M.rectSum(a, T, n1, t)), p2 = Math.abs(ex - M.rectSum(a, T, n2, t));
      if (!(p2 < p1)) { return 'part trip: error did not shrink'; }
      return null;
    }), N + ' cases, n1 < n2 up to 1,000');

    record(g, 'the area under v from 0 to t equals s(t)', runCases(N, function () {
      var a = uni(40, 160), T = uni(0.5, 1.5), t = uni(0, T);
      function vi(u) { return a * (T * u - u * u); }
      var simpson = t / 6 * (vi(0) + 4 * vi(t / 2) + vi(t)); // independent, exact for this curve
      if (!close(simpson, M.s(a, T, t), 1e-9)) { return 'Simpson ' + simpson + ' vs s ' + M.s(a, T, t); }
      if (!close(M.areaNumeric(a, T, t), M.s(a, T, t), 1e-9)) { return 'areaNumeric'; }
      var n = 1000, bound = a * T * t * t / (2 * n) + 1e-9;
      if (Math.abs(M.rectSum(a, T, n, t) - M.s(a, T, t)) > bound) { return '1,000 rectangles too far from s(t)'; }
      return null;
    }), N + ' cases');

    record(g, 'numbers are always printed with 2 decimal places', runCases(N, function (i) {
      var x = i % 4 === 0 ? onStep([-5, 5, 0.005]) : uni(-1e6, 1e6);
      var out = M.fmt(x);
      if (!/^−?\d+\.\d\d$/.test(out)) { return 'fmt(' + x + ') = ' + out; }
      if (out === '−0.00') { return 'minus zero'; }
      var back = Number(out.replace('−', '-'));
      if (Math.abs(back - x) > 0.005 + 1e-6) { return 'fmt(' + x + ') = ' + out + ' is off'; }
      return null;
    }).concat(
      M.fmt(22.525) === '22.53' && M.fmt(-0.001) === '0.00' && M.fmt(0.005) === '0.01' && M.fmt(NaN) === '—' ? [] : ['fixed cases']
    ), N + ' cases');
  }

  /* ================= B. mistake catalog ================= */
  function groupB() {
    var g = group('B. Mistake catalog (1,000 random cases per numeric entry, every option of every choice question)');
    var N = 1000;

    M.CATALOG.filter(function (e) { return e.kind === 'numeric'; }).forEach(function (e) {
      e.questions.forEach(function (qid) {
        var q = M.question(qid), skipped = 0, tested = 0;
        var fails = runCases(N, function () {
          var p = genFor(q), w = e.value(p), correct = q.correct(p);
          if (w === null || !isFinite(w)) { skipped++; return null; }
          var forms = [String(w), w.toFixed(2)];
          for (var f = 0; f < forms.length; f++) {
            var typed = Number(forms[f]), clash = M.near(typed, correct);
            q.entries.forEach(function (other) {
              if (other === e.id) { return; }
              var ow = M.entry(other).value(p);
              if (ow !== null && isFinite(ow) && M.near(typed, ow)) { clash = true; }
            });
            if (clash) { skipped++; continue; }
            tested++;
            var res = M.evaluate(qid, p, forms[f]);
            if (res.status !== 'mistake' || res.entry !== e.id) { return JSON.stringify(p) + ' typed ' + forms[f] + ' got ' + res.status + ' ' + (res.entry || ''); }
            var cmp = M.compare(qid, p, res), d = dirty(cmp, 'compare');
            if (d) { return 'unclean picture: ' + d; }
            if (cmp.steps.length < 2) { return 'no replay steps'; }
          }
          return null;
        });
        if (tested < N / 2) { fails.push('only ' + tested + ' usable cases'); }
        record(g, e.id + ' on ' + qid + ': a wrong answer built from this mistake is detected as it',
          fails, tested + ' answers tested, ' + skipped + ' skipped (equal to the correct answer or to another entry)');
      });
    });

    var choiceFails = [], optionCount = 0;
    M.QUESTIONS.filter(function (q) { return q.type === 'choice'; }).forEach(function (q) {
      var corrects = 0;
      q.options.forEach(function (o) {
        optionCount++;
        if (o.correct) { corrects++; }
        else {
          var e = M.entry(o.entry);
          if (!e || e.kind !== 'choice' || e.questions.indexOf(q.id) < 0) { choiceFails.push(q.id + '/' + o.id + ' does not map to one choice entry'); return; }
        }
        for (var i = 0; i < 50; i++) {
          var p = genFor(q), res = M.evaluate(q.id, p, o.id);
          var want = o.correct ? 'correct' : 'mistake';
          if (res.status !== want || (!o.correct && res.entry !== o.entry)) { choiceFails.push(q.id + '/' + o.id + ' gave ' + res.status); break; }
          var d = dirty(M.compare(q.id, p, res), 'compare');
          if (d) { choiceFails.push(q.id + '/' + o.id + ' unclean picture: ' + d); break; }
        }
      });
      if (corrects !== 1) { choiceFails.push(q.id + ' has ' + corrects + ' correct options'); }
      if (M.evaluate(q.id, genFor(q), 'nonsense').status !== 'invalid') { choiceFails.push(q.id + ' accepted an unknown option'); }
    });
    record(g, 'every option of every multiple-choice question maps to correct or to exactly one entry', choiceFails, optionCount + ' options, 50 random slider settings each');

    var used = {}, structure = [];
    M.QUESTIONS.forEach(function (q) {
      (q.entries || []).forEach(function (id) { used[id] = true; if (!M.entry(id) || M.entry(id).kind !== 'numeric') { structure.push(q.id + ' lists ' + id); } });
      (q.options || []).forEach(function (o) { if (o.entry) { used[o.entry] = (used[o.entry] || 0) + 1; } });
    });
    M.CATALOG.forEach(function (e) {
      if (!used[e.id]) { structure.push(e.id + ' is never reachable'); }
      if (!e.detect || !e.draw || !e.caption) { structure.push(e.id + ' is missing detect, draw or caption'); }
    });
    ['slope', 'lines', 'curve', 'area'].forEach(function (t) {
      var n = M.QUESTIONS.filter(function (q) { return q.topic === t; }).length;
      if (n < 3) { structure.push(t + ' has only ' + n + ' questions'); }
    });
    if (M.CATALOG.length !== 18) { structure.push('catalog has ' + M.CATALOG.length + ' entries, expected 18'); }
    record(g, 'catalog structure: 18 entries, all reachable, each with detect, draw and caption; 3+ questions per topic', structure, M.CATALOG.length + ' entries, ' + M.QUESTIONS.length + ' questions');

    M.QUESTIONS.filter(function (q) { return q.type === 'numeric'; }).forEach(function (q) {
      record(g, q.id + ': a correct answer is never flagged, and answers within rounding distance count as correct', runCases(N, function () {
        var p = genFor(q), c = q.correct(p);
        var tries = [String(c), c.toFixed(2), String(c + 0.0049), String(c - 0.0049), M.fmt(c)];
        for (var i = 0; i < tries.length; i++) {
          var res = M.evaluate(q.id, p, tries[i]);
          if (res.status !== 'correct') { return JSON.stringify(p) + ' typed ' + tries[i] + ' got ' + res.status + ' ' + (res.entry || ''); }
        }
        var far = M.evaluate(q.id, p, String(c + 0.02));
        if (far.status === 'correct') { return 'an answer 0.02 away was called correct'; }
        var junk = uni(-200, 200), r2 = M.evaluate(q.id, p, String(junk));
        if (r2.status === 'invalid') { return 'a plain number was rejected'; }
        var d = dirty(M.compare(q.id, p, r2), 'compare');
        if (d) { return 'unclean picture for ' + junk + ': ' + d; }
        return null;
      }), N + ' cases, 5 ways of typing the correct answer, plus a random other number');
    });

    record(g, 'a number matching two entries at once gets the neutral comparison', runCases(N, function () {
      // s1 with 1/m equal to b; a1 with t1 = 1 so height equals height times width
      var k = choice([2, 4]), p = { m: 1 / k, b: k, x: 4, plain: true };
      var r = M.evaluate('s1', p, String(k));
      if (r.status !== 'neutral' || !r.ambiguous) { return 's1 gave ' + r.status; }
      var a = gen.area(); a.T = choice([1.2, 1.4, 1.5]); a.t1 = 1;
      var w = M.v(a.a, a.T, 1);
      if (M.near(w, M.s(a.a, a.T, 1))) { return null; }
      var r2 = M.evaluate('a1', a, String(w));
      if (r2.status !== 'neutral' || !r2.ambiguous) { return 'a1 gave ' + r2.status; }
      var cap = M.compare('a1', a, r2).caption.en;
      if (cap !== M.neutralCaption(r2).en) { return 'caption is not the neutral one'; }
      return null;
    }), N + ' cases');

    var capFails = [], capCount = 0;
    function capCheck(label, cap) {
      ['en', 'tl'].forEach(function (lang) {
        capCount++;
        var n = M.wordCount(cap[lang]);
        if (!(n > 0 && n < 20)) { capFails.push(label + ' ' + lang + ' has ' + n + ' words: ' + cap[lang]); }
      });
    }
    M.CATALOG.forEach(function (e) {
      capCheck(e.id, e.caption(gen.slope(false)));
      capCheck(e.id + ' (plain)', e.caption(gen.slope(true)));
    });
    capCheck('correct', M.CORRECT_CAPTION);
    for (var i = 0; i < 200; i++) { capCheck('neutral', M.neutralCaption({ value: uni(-1e9, 1e9), correct: uni(-100, 100) })); }
    record(g, 'every caption is under 20 words, in English and in Taglish', capFails, capCount + ' captions counted');
  }

  /* ================= C. input abuse ================= */
  var ABUSE = [
    ['', 'invalid'], ['   ', 'invalid'], ['\t\n', 'invalid'], ['abc', 'invalid'], ['three', 'invalid'],
    ['3/1', 3], ['1/3', 1 / 3], ['-0', 0], ['3/0', 'invalid'], ['1/2/3', 'invalid'], ['/', 'invalid'],
    ['1,000', 1000], ['12,345.5', 12345.5], ['3,5', 'invalid'], [',', 'invalid'], ['1,,2', 'invalid'],
    ['999999999999999999999999999999', 'invalid'], [new Array(400).join('9'), 'invalid'], ['1e999', 'invalid'], ['-1e999', 'invalid'],
    ['1e5', 'invalid'], ['0x10', 'invalid'], ['NaN', 'invalid'], ['Infinity', 'invalid'], ['-Infinity', 'invalid'], ['undefined', 'invalid'], ['null', 'invalid'],
    ['ang slope ay 3 po', 'invalid'], ['Hindi ko po alam, siguro 2?', 'invalid'], ['tatlo', 'invalid'],
    ['😀', 'invalid'], ['3🚀', 'invalid'], ['👍🏽 5', 'invalid'],
    ['<b>3</b>', 'invalid'], ['<script>alert(1)</script>', 'invalid'], ['<img src=x onerror=alert(1)>', 'invalid'], ['"><svg onload=alert(1)>', 'invalid'],
    ['3.', 3], ['.5', 0.5], ['+4', 4], ['−2', -2], ['₱12', 12], ['  7  ', 7], ['-', 'invalid'], ['.', 'invalid'], ['--3', 'invalid'], ['3 4', 'invalid'],
    ['5 km', 5], ['22.5 km/h', 22.5], ['30kph', 30], ['0.5 h', 0.5], ['25 pesos', 25], ['P25', 25], ['Php 25.50', 25.5], ['km', 'invalid'], ['5 km 3', 'invalid'], ['5 meters', 'invalid'], ['h5', 'invalid'],
    ['0', 0], ['-0.0', 0], ['1000000000', 1e9], ['1000000001', 'invalid'], ['١٢٣', 'invalid'], ['３', 'invalid']
  ];

  function typeAnswer(str) {
    var inp = $('answer');
    if (!inp) { return false; }
    inp.value = str;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  function pressCheck() { $('check').click(); }
  function clickTopic(t) { doc.querySelector('button[data-topic="' + t + '"]').click(); }
  function qTabs() { return Array.prototype.slice.call(doc.querySelectorAll('#qtabs button')); }

  function groupC() {
    var g = group('C. Input abuse');
    var parseFails = [];
    ABUSE.forEach(function (pair) {
      var r;
      try { r = M.parseAnswer(pair[0]); } catch (e) { parseFails.push(JSON.stringify(pair[0]).slice(0, 40) + ' threw'); return; }
      if (pair[1] === 'invalid') { if (r.ok) { parseFails.push(JSON.stringify(pair[0]).slice(0, 40) + ' was accepted as ' + r.value); } }
      else if (!r.ok || !close(r.value, pair[1]) || (r.value === 0 && 1 / r.value < 0)) { parseFails.push(JSON.stringify(pair[0]) + ' gave ' + JSON.stringify(r)); }
    });
    [null, undefined, 5, {}, [], true].forEach(function (odd) {
      try { var r = M.parseAnswer(odd); if (r.ok && !isFinite(r.value)) { parseFails.push('odd value gave a non-finite number'); } }
      catch (e) { parseFails.push('odd value threw'); }
    });
    record(g, 'the answer reader accepts numbers and simple fractions and refuses everything else, without throwing', parseFails, ABUSE.length + ' strings');

    var evalFails = [];
    M.QUESTIONS.forEach(function (q) {
      ABUSE.forEach(function (pair) {
        try {
          var p = genFor(q), res = M.evaluate(q.id, p, pair[0]);
          if (res.status !== 'invalid') {
            var d = dirty(M.compare(q.id, p, res), 'compare');
            if (d) { evalFails.push(q.id + ' ' + JSON.stringify(pair[0]).slice(0, 30) + ': ' + d); }
          }
        } catch (e) { evalFails.push(q.id + ' ' + JSON.stringify(pair[0]).slice(0, 30) + ' threw ' + e.message); }
      });
    });
    record(g, 'every question survives every abuse string (pure check)', evalFails, M.QUESTIONS.length + ' questions x ' + ABUSE.length + ' strings');

    var uiFails = [], typed = 0, tagsBefore = $('app').querySelectorAll('script, img, svg, b, iframe').length;
    ['slope', 'lines', 'curve', 'area'].forEach(function (t) {
      clickTopic(t);
      qTabs().forEach(function (tab, qi) {
        tab.click();
        if (!$('answer')) { return; }
        ABUSE.forEach(function (pair) {
          typeAnswer(pair[0]); pressCheck(); typed++;
          var prob = pageProblem();
          if (prob) { uiFails.push(t + ' Q' + (qi + 1) + ' ' + JSON.stringify(pair[0]).slice(0, 30) + ': ' + prob); }
          var shown = !$('compare').hidden;
          if (pair[1] === 'invalid' && shown) { uiFails.push(t + ' Q' + (qi + 1) + ' drew a comparison for ' + JSON.stringify(pair[0]).slice(0, 30)); }
          if (pair[1] === 'invalid' && !$('msg').textContent) { uiFails.push(t + ' Q' + (qi + 1) + ' gave no message for ' + JSON.stringify(pair[0]).slice(0, 30)); }
          if (pair[1] !== 'invalid' && !shown) { uiFails.push(t + ' Q' + (qi + 1) + ' drew nothing for ' + JSON.stringify(pair[0])); }
        });
      });
    });
    if ($('app').querySelectorAll('script, img, svg, b, iframe').length !== tagsBefore) { uiFails.push('typed HTML ended up in the page'); }
    record(g, 'typed into the real answer box and checked: no crash, no NaN, Infinity or undefined, no HTML injected', uiFails, typed + ' submissions through the real controls');
  }

  /* ================= D. interface stress ================= */
  function frame() { return new Promise(function (ok) { root.requestAnimationFrame(function () { ok(); }); }); }
  function pause() { return new Promise(function (ok) { root.setTimeout(ok, 0); }); }

  function setSlider(input, v) {
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // An answer worth drawing: the correct one, one built from a mistake, or another number.
  function someAnswer() {
    var st = root.Residual.state, t = st.topic;
    if (t === 'link') { return null; }
    var q = M.question(st.q[t]), p = root.Residual.P(t);
    if (q.need && q.need(p)) { return null; }
    if (q.type === 'choice') { return { option: choice(q.options).id }; }
    var pool = [String(q.correct(p)), String(uni(-50, 50)), '7', choice(ABUSE)[0]];
    q.entries.forEach(function (id) { var w = M.entry(id).value(p); if (w !== null && isFinite(w)) { pool.push(w.toFixed(2)); } });
    return { text: choice(pool) };
  }
  function answerAndCheck() {
    var a = someAnswer();
    if (!a) { return false; }
    if (a.option) {
      var radio = doc.querySelector('#answer-area input[value="' + a.option + '"]');
      if (radio) { radio.click(); }
    } else { typeAnswer(a.text); }
    pressCheck();
    return true;
  }

  async function sweepSliders(topic, label, fails, counts) {
    var ids = Array.prototype.map.call(doc.querySelectorAll('#sliders input[type="range"]'), function (i) { return i.id; });
    for (var s = 0; s < ids.length; s++) {
      for (var sweep = 0; sweep < 200; sweep++) {
        var input = $(ids[s]);
        if (!input) { fails.push(label + ': slider ' + ids[s] + ' vanished'); break; }
        var lo = Number(input.min), hi = Number(input.max), step = Number(input.step) || 1;
        var steps = Math.round((hi - lo) / step);
        var stops = [];
        if (sweep === 0) { for (var k = 0; k <= steps; k++) { stops.push(lo + k * step); } }
        else { for (var j = 0; j <= 6; j++) { stops.push(lo + Math.round(steps * j / 6) * step); } }
        if (sweep % 2) { stops.reverse(); }
        var checkAt = sweep % 20 === 5 ? int(0, stops.length - 1) : -1;
        for (var i = 0; i < stops.length; i++) {
          setSlider(input, snap(stops[i]));
          counts.moves++;
          if (i === checkAt && answerAndCheck()) { counts.checks++; }
        }
        var prob = pageProblem();
        if (prob) { fails.push(label + ' slider ' + ids[s] + ' sweep ' + sweep + ': ' + prob); return; }
        if (sweep % 25 === 24) { await frame(); }
      }
      counts.sweeps += 200;
    }
  }

  async function randomPresses(topic, fails, counts) {
    clickTopic(topic);
    var core = ['next', 'back', 'play', 'pause', 'topic', 'lang'];
    var extra = ['question', 'check', 'speed', 'demo', 'stepBtn', 'rectBtn', 'plain', 'reset', 'key'];
    for (var i = 0; i < 500; i++) {
      var act = rnd() < 0.75 ? choice(core) : choice(extra);
      var replay = act === 'next' || act === 'back' || act === 'play' || act === 'pause';
      if (replay && $('compare').hidden && rnd() < 0.8) { answerAndCheck(); }
      var b;
      if (replay) { $(act).click(); }
      else if (act === 'topic') { clickTopic(rnd() < 0.5 ? topic : choice(root.Residual.TOPICS)); }
      else if (act === 'lang') { $('lang').click(); }
      else if (act === 'question') { b = qTabs(); if (b.length) { choice(b).click(); } }
      else if (act === 'check') { answerAndCheck(); }
      else if (act === 'speed') { $('speed').value = choice(['0.5', '1', '2']); $('speed').dispatchEvent(new Event('change', { bubbles: true })); }
      else if (act === 'demo') { if ($('demo')) { $('demo').click(); } }
      else if (act === 'stepBtn') { b = doc.querySelectorAll('#sliders button'); if (b.length) { b[int(0, b.length - 1)].click(); } }
      else if (act === 'rectBtn') { b = doc.querySelectorAll('#extras .rect-n'); if (b.length) { b[int(0, b.length - 1)].click(); } }
      else if (act === 'plain') { if ($('plain')) { $('plain').click(); } }
      else if (act === 'reset') { $('reset').click(); }
      else if (act === 'key') { doc.body.dispatchEvent(new KeyboardEvent('keydown', { key: choice(['n', 'b', 'p', 'N', 'x', 'ArrowRight']), bubbles: true })); }
      counts.presses++;
      counts.byAct[act] = (counts.byAct[act] || 0) + 1;
      if (running()) { counts.duringAnim++; }
      var prob = pageProblem();
      if (prob) { fails.push(topic + ' press ' + i + ' (' + act + '): ' + prob); return; }
      if (i % 3 === 2) { await frame(); }
      if (i % 50 === 49) { await pause(); }
    }
  }
  function running() {
    var st = root.Residual.state;
    return !!(st.demo || (st.result && st.result.anim));
  }

  async function groupD() {
    var g = group('D. Interface stress (events sent to the real controls, every topic)');
    var topics = root.Residual.TOPICS;
    for (var t = 0; t < topics.length; t++) {
      var topic = topics[t], fails = [], counts = { sweeps: 0, moves: 0, checks: 0 };
      clickTopic(topic);
      $('reset').click();
      await sweepSliders(topic, topic, fails, counts);
      if (topic === 'slope' && !fails.length) {
        $('plain').click();
        await sweepSliders(topic, 'slope (plain graph)', fails, counts);
        $('plain').click();
      }
      record(g, topic + ': every slider swept end to end 200 times', fails, counts.sweeps + ' sweeps, ' + counts.moves + ' slider moves, ' + counts.checks + ' answers checked mid-sweep, 0 errors, no NaN');
      await pause();
    }
    for (var u = 0; u < topics.length; u++) {
      var fails2 = [], c2 = { presses: 0, duringAnim: 0, byAct: {} };
      await randomPresses(topics[u], fails2, c2);
      if (!fails2.length && c2.presses !== 500) { fails2.push('only ' + c2.presses + ' presses ran'); }
      record(g, topics[u] + ': 500 random presses of next, back, play, pause, topic switch, language and the other controls', fails2,
        c2.presses + ' presses, ' + c2.duringAnim + ' while an animation was running. next ' + (c2.byAct.next || 0) + ', back ' + (c2.byAct.back || 0) + ', play ' + (c2.byAct.play || 0) + ', pause ' + (c2.byAct.pause || 0) + ', topic ' + (c2.byAct.topic || 0) + ', language ' + (c2.byAct.lang || 0));
    }
    // let any running animation finish, then look once more
    for (var w = 0; w < 30; w++) { await frame(); }
    var endProb = pageProblem();
    record(g, 'after everything: zero errors caught and no NaN anywhere in the page or canvas text', endProb ? [endProb] : [], root.Residual.errors.length + ' errors, ' + D.bad.length + ' bad canvas strings');
  }

  /* ================= E. offline ================= */
  function groupE() {
    var g = group('E. Offline (nothing requested from an outside host)');
    var here = root.location.protocol === 'file:' ? 'file:' : root.location.origin;
    function outside(url) {
      if (!url) { return false; }
      var a = doc.createElement('a'); a.href = url;
      if (a.protocol === 'data:' || a.protocol === 'blob:' || a.protocol === 'about:' || a.protocol === 'javascript:') { return false; }
      if (root.location.protocol === 'file:') { return a.protocol !== 'file:'; }
      return a.origin !== root.location.origin;
    }
    var fails = [];
    var entries = (root.performance && root.performance.getEntriesByType) ? root.performance.getEntriesByType('resource') : [];
    entries.forEach(function (e) { if (outside(e.name)) { fails.push('requested ' + e.name); } });
    record(g, 'no resource was loaded from an outside host', fails, entries.length + ' resources loaded, all from ' + here);

    var domFails = [], nodes = doc.querySelectorAll('[src], [href], [action], [data], [poster], [srcset]');
    Array.prototype.forEach.call(nodes, function (n) {
      ['src', 'href', 'action', 'data', 'poster'].forEach(function (attr) {
        var v = n.getAttribute(attr);
        if (v && n.id !== 'rerun' && outside(n[attr] || v)) { domFails.push(n.tagName + ' ' + attr + '=' + v); }
      });
    });
    var cssNote = 'style rules read';
    try {
      Array.prototype.forEach.call(doc.styleSheets, function (sheet) {
        Array.prototype.forEach.call(sheet.cssRules, function (rule) {
          if (/url\(|@import/i.test(rule.cssText)) { domFails.push('css: ' + rule.cssText.slice(0, 80)); }
        });
      });
    } catch (e) { cssNote = 'style rules not readable on this kind of page (the resource list above still covers them)'; }
    record(g, 'no element or style rule points at an outside host', domFails, nodes.length + ' elements with links looked at; ' + cssNote);

    record(g, 'the page made no fetch, XHR, beacon, WebSocket or EventSource call', netCalls.slice(), netCalls.length + ' calls during the whole run');
  }

  /* ================= output ================= */
  var started = Date.now(), finished = false;

  function render(done) {
    var panel = $('test-panel');
    panel.hidden = false;
    panel.textContent = '';
    var allPass = groups.every(function (g) { return g.checks.every(function (c) { return c.pass; }); });
    var h = doc.createElement('h2');
    h.textContent = done ? (allPass ? 'Residual tests: ALL GROUPS PASS' : 'Residual tests: FAILED') : 'Residual tests: running…';
    h.className = done ? (allPass ? 'pass' : 'fail') : '';
    panel.appendChild(h);
    var p = doc.createElement('p');
    p.textContent = 'Seed ' + SEED + '. To repeat this exact run, add &seed=' + SEED + ' to the address. ' + (done ? 'Took ' + ((Date.now() - started) / 1000).toFixed(1) + ' s. ' : '') + 'Page opened from ' + (root.location.protocol === 'file:' ? 'disk (file://)' : root.location.origin) + '.';
    panel.appendChild(p);
    var table = doc.createElement('table');
    groups.forEach(function (g) {
      var ok = g.checks.every(function (c) { return c.pass; });
      var tr = doc.createElement('tr'), th = doc.createElement('th');
      th.colSpan = 3; th.textContent = (ok ? 'PASS  ' : 'FAIL  ') + g.name; th.className = ok ? 'pass' : 'fail';
      tr.appendChild(th); table.appendChild(tr);
      g.checks.forEach(function (c) {
        var r = doc.createElement('tr');
        var a = doc.createElement('td'); a.textContent = c.pass ? 'pass' : 'FAIL'; a.className = c.pass ? 'pass' : 'fail';
        var b = doc.createElement('td'); b.textContent = c.name;
        var d = doc.createElement('td'); var pre = doc.createElement('pre');
        pre.textContent = c.info + (c.pass ? '' : '\n' + c.failCount + ' failure(s):\n' + c.fails.join('\n'));
        d.appendChild(pre);
        r.appendChild(a); r.appendChild(b); r.appendChild(d); table.appendChild(r);
      });
    });
    panel.appendChild(table);
    if (done) { doc.title = 'Residual tests: ' + (allPass ? 'PASS' : 'FAIL'); }
    return allPass;
  }

  async function runAll() {
    var crash = null;
    try {
      render(false);
      await pause(); groupA();
      await pause(); groupB();
      await pause(); groupC();
      await pause(); await groupD();
      await pause(); groupE();
    } catch (e) {
      crash = e;
      var g = group('Test runner');
      g.checks.push({ name: 'the test script itself ran to the end', pass: false, info: '', fails: [String(e && e.stack || e)], failCount: 1 });
    }
    finished = true;
    var ok = render(true);
    root.__residualTestDone = { ok: ok && !crash, seed: SEED, seconds: (Date.now() - started) / 1000, groups: groups, where: root.location.protocol };
  }

  if (doc.readyState === 'complete') { root.setTimeout(runAll, 50); }
  else { root.addEventListener('load', function () { root.setTimeout(runAll, 50); }); }
})(window);
