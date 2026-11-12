/* Residual core.
 * All math, answer parsing, number formatting, the mistake catalog, the
 * questions and the "what to draw" scene data live here.
 * There is NO DOM code in this file. It also loads in Node (module.exports).
 */
(function (root, factory) {
  var M = factory();
  if (typeof module === 'object' && module.exports) { module.exports = M; }
  if (root) { root.ResidualMath = M; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ---------- numbers ---------- */

  // Numbers are shown to 2 decimal places, so an answer within half a
  // hundredth of a value counts as that value.
  var TOL = 0.005 + 1e-6;

  function near(a, b) { return Math.abs(a - b) <= TOL; }

  // 2 decimal places, round half away from zero, never "-0.00", never NaN.
  function fmt(x) {
    if (typeof x !== 'number' || !isFinite(x)) { return '—'; }
    var snapped = Math.round(x * 1e6) / 1e6;
    var r = Math.round(Math.abs(snapped) * 100 + 1e-7) / 100;
    var out = r.toFixed(2);
    return (snapped < 0 && r !== 0) ? '−' + out : out;
  }

  function pair(x, y) { return '(' + fmt(x) + ', ' + fmt(y) + ')'; }

  // "y = 3.00x + 2.00"
  function eq(m, b) {
    return 'y = ' + fmt(m) + 'x ' + (fmt(b).charAt(0) === '−' ? '− ' + fmt(-b) : '+ ' + fmt(b));
  }

  function parseNum(t) {
    t = t.trim();
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) { t = t.replace(/,/g, ''); }
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) {
      return { err: /^[+-]?[\d.,]+$/.test(t) && t.indexOf(',') >= 0 ? 'comma' : 'notNumber' };
    }
    return { v: Number(t) };
  }

  // Turns what the student typed into a number, or says why it cannot.
  // Accepts: 3, 3.5, .5, -2, 1,234.5 and a/b fractions, with a peso sign in
  // front or a unit behind (km, km/h, kph, h, pesos, php).
  function parseAnswer(raw) {
    function bad(reason) { return { ok: false, reason: reason }; }
    if (raw === null || raw === undefined) { return bad('empty'); }
    var s = String(raw).replace(/−/g, '-').trim();
    if (s === '') { return bad('empty'); }
    s = s.replace(/^(₱|php|p)\s*(?=[-+.\d])/i, '');
    s = s.replace(/(\d|\.)\s*(km\s*\/\s*h|kph|km|h|pesos?|php)\.?$/i, '$1');
    var parts = s.split('/');
    if (parts.length > 2) { return bad('notNumber'); }
    var nums = [];
    for (var i = 0; i < parts.length; i++) {
      var n = parseNum(parts[i]);
      if (n.err) { return bad(n.err); }
      nums.push(n.v);
    }
    var v = nums[0];
    if (nums.length === 2) {
      if (nums[1] === 0) { return bad('divZero'); }
      v = nums[0] / nums[1];
    }
    if (!isFinite(v) || Math.abs(v) > 1e9) { return bad('tooBig'); }
    if (v === 0) { v = 0; }
    return { ok: true, value: v };
  }

  function niceCeil(x) {
    if (!(x > 0) || !isFinite(x)) { return 1; }
    var k = Math.pow(10, Math.floor(Math.log(x) / Math.LN10));
    var steps = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * k >= x * (1 - 1e-9)) { return steps[i] * k; }
    }
    return 10 * k;
  }

  /* ---------- topic 1 and 2: lines ---------- */

  function line(m, b, x) { return m * x + b; }

  function slopeBetween(x1, y1, x2, y2) {
    return x2 === x1 ? null : (y2 - y1) / (x2 - x1);
  }

  // Rise-and-run triangle from (x0, y0) on the line, going right by `run`.
  function triangle(m, b, x0, run) {
    return { x0: x0, y0: m * x0 + b, x1: x0 + run, y1: m * (x0 + run) + b, run: run, rise: m * run };
  }

  // null when the lines are parallel (or identical).
  function crossing(m1, b1, m2, b2) {
    var d = m1 - m2;
    if (Math.abs(d) < 1e-12) { return null; }
    var x = (b2 - b1) / d;
    return { x: x, y: m1 * x + b1 };
  }

  function relation(m1, b1, m2, b2) {
    if (Math.abs(m1 - m2) < 1e-12) { return Math.abs(b1 - b2) < 1e-12 ? 'same' : 'parallel'; }
    return 'cross';
  }

  /* ---------- topic 3 and 4: one trip ---------- */

  // Distance (km) after t hours.
  function s(a, T, t) { return a * (T * t * t / 2 - t * t * t / 3); }
  // Speed (km/h) at t hours. This is the slope of s.
  function v(a, T, t) { return a * t * (T - t); }

  // Slope of the line between the points at t and t + h. null when h is 0.
  function secant(a, T, t, h) {
    if (h === 0) { return null; }
    return (s(a, T, t + h) - s(a, T, t)) / h;
  }

  // The gap actually used: stay inside the trip, step left if there is more room there.
  function gap(T, t0, h) {
    var right = T - t0, left = t0;
    if (right >= left) { return Math.min(h, right); }
    return -Math.min(h, left);
  }

  // Left-endpoint rectangles under v from 0 to upTo.
  function rectSum(a, T, n, upTo) {
    if (upTo === undefined) { upTo = T; }
    var dt = upTo / n, sum = 0;
    for (var i = 0; i < n; i++) { sum += v(a, T, i * dt) * dt; }
    return sum;
  }

  function exactArea(a, T) { return a * T * T * T / 6; }

  // Used by the closing step, to show (not assume) the two facts.
  function slopeNumeric(a, T, t) {
    var h = 1e-5;
    return (s(a, T, t + h) - s(a, T, t - h)) / (2 * h);
  }
  function areaNumeric(a, T, t) {
    var n = 200, dt = t / n, sum = v(a, T, 0) + v(a, T, t);
    for (var i = 1; i < n; i++) { sum += (i % 2 ? 4 : 2) * v(a, T, i * dt); }
    return sum * dt / 3;
  }

  /* ---------- slider ranges, defaults ---------- */

  var RECT_COUNTS = [4, 8, 16, 100];

  var RANGES = {
    slope: {
      story: { m: [0, 5, 0.5], b: [0, 20, 1] },
      plain: { m: [-5, 5, 0.25], b: [-10, 10, 0.5] },
      x: [1, 10, 1]
    },
    lines: { m: [0, 5, 0.5], b: [0, 30, 1] },
    trip: { a: [40, 160, 10], T: [0.5, 1.5, 0.1] },
    tStep: 0.05,
    h: [0.01, 0.5, 0.01]
  };

  var DEFAULTS = {
    slope: { m: 3, b: 2, x: 4, plain: false },
    lines: { m1: 2, b1: 15, m2: 4, b2: 5 },
    curve: { a: 120, T: 1, t0: 0.25, h: 0.5 },
    area: { a: 120, T: 1, t1: 0.5, n: 4 },
    link: { a: 120, T: 1, t: 0.5 }
  };

  /* ---------- scene helpers (plain data, drawn by draw.js) ---------- */

  function L(en, tl) { return { en: en, tl: tl }; }
  function same(str) { return { en: str, tl: str }; }

  var KM = L('distance (km)', 'layo (km)');
  var FARE = L('fare (₱)', 'pamasahe (₱)');
  var HOURS = L('time (h)', 'oras (h)');
  var SPEED = L('speed (km/h)', 'bilis (km/h)');

  function scene(view, items, notes) {
    return { xr: view.xr, yr: view.yr, xl: view.xl, yl: view.yl, xticks: view.xticks || null, items: items, notes: notes || [] };
  }

  function slopeView(p) {
    return p.plain ? { xr: [-10, 10], yr: [-10, 10], xl: same('x'), yl: same('y') }
                   : { xr: [0, 10], yr: [0, 60], xl: KM, yl: FARE };
  }

  // Use the slider distance for the triangle if its far corner is on the graph, else 1.
  function triRun(m, b, x, view) {
    var y = m * x + b;
    return (y <= view.yr[1] && y >= view.yr[0]) ? x : 1;
  }

  function lineTri(view, m, b, x, c, sLine, sTri) {
    var run = triRun(m, b, x, view), y = m * run + b;
    return [
      { t: 'line', m: m, b: b, c: c, s: sLine },
      { t: 'pt', x: 0, y: b, c: c, s: sLine, label: pair(0, b) },
      { t: 'tri', x1: 0, y1: b, x2: run, y2: y, c: c, s: sTri, run: 'run ' + fmt(run), rise: 'rise ' + fmt(m * run) },
      { t: 'pt', x: run, y: y, c: c, s: sTri, label: pair(run, y) }
    ];
  }

  function slopeNote(m, b, x, view, sStep, c) {
    var run = triRun(m, b, x, view);
    var str = 'rise ÷ run = ' + fmt(m * run) + ' ÷ ' + fmt(run) + ' = ' + fmt(m);
    return { s: sStep, c: c, text: same(str) };
  }

  function linesView(p, wantX, wantY) {
    var xmax = 10, xmin = 0;
    (wantX || []).forEach(function (x) {
      if (!isFinite(x) || Math.abs(x) > 500) { return; }
      if (x * 1.25 > xmax) { xmax = niceCeil(x * 1.25); }
      if (x < 0) { xmin = Math.min(xmin, -niceCeil(-x * 1.25)); }
    });
    var top = Math.max(p.b1, p.b2, p.m1 * xmax + p.b1, p.m2 * xmax + p.b2, 1);
    (wantY || []).forEach(function (y) { if (isFinite(y) && y > top && y <= 5000) { top = y * 1.1; } });
    var ymin = 0;
    if (xmin < 0) {
      var lo = Math.min(p.m1 * xmin + p.b1, p.m2 * xmin + p.b2, 0);
      if (lo < 0) { ymin = -niceCeil(-lo); }
    }
    return { xr: [xmin, xmax], yr: [ymin, niceCeil(top)], xl: KM, yl: FARE };
  }

  function twoLines(p, sStep) {
    return [
      { t: 'line', m: p.m1, b: p.b1, c: 'A', s: sStep, label: 'A' },
      { t: 'line', m: p.m2, b: p.b2, c: 'B', s: sStep, label: 'B' }
    ];
  }

  function curveView(p, wide) {
    return { xr: [0, wide ? RANGES.trip.T[1] : p.T], yr: [0, niceCeil(s(p.a, p.T, p.T))], xl: HOURS, yl: KM };
  }
  function speedView(p, wide) {
    return { xr: [0, wide ? RANGES.trip.T[1] : p.T], yr: [0, niceCeil(v(p.a, p.T, p.T / 2))], xl: HOURS, yl: SPEED };
  }

  function tangentItem(p, t, c, sStep, extra) {
    var sl = v(p.a, p.T, t), y = s(p.a, p.T, t), w = 0.3 * p.T;
    var it = { t: 'line', m: sl, b: y - sl * t, x0: t - w, x1: t + w, c: c, s: sStep, w: 3 };
    if (extra) { for (var k in extra) { it[k] = extra[k]; } }
    return it;
  }
  function secantItems(p, t, h, c, sStep, until) {
    var y0 = s(p.a, p.T, t), y1 = s(p.a, p.T, t + h), sl = (y1 - y0) / h;
    var lo = Math.min(t, t + h) - 0.1 * p.T, hi = Math.max(t, t + h) + 0.1 * p.T;
    return [
      { t: 'line', m: sl, b: y0 - sl * t, x0: lo, x1: hi, c: c, s: sStep, u: until, dash: true },
      { t: 'pt', x: t + h, y: y1, c: c, s: sStep, u: until }
    ];
  }

  function fnS(p, c, sStep) { return { t: 'fn', f: 's', a: p.a, T: p.T, from: 0, to: p.T, c: c, s: sStep }; }
  function fnV(p, c, sStep) { return { t: 'fn', f: 'v', a: p.a, T: p.T, from: 0, to: p.T, c: c, s: sStep }; }

  function sFormula(p) { return 's(t) = ' + fmt(p.a) + ' × (' + fmt(p.T) + ' × t² ÷ 2 − t³ ÷ 3)'; }
  function vFormula(p) { return 'v(t) = ' + fmt(p.a) + ' × t × (' + fmt(p.T) + ' − t)'; }

  /* ---------- mistake catalog ----------
   * Each entry: id, topic, kind, questions it applies to,
   *   detect : how it is recognised (plain words, for readers and the README)
   *   value  : numeric entries only: the number this mistake produces (null = not possible here)
   *   draw   : what the student's answer would look like (a scene)
   *   caption: one short sentence naming the mix-up, English and Taglish
   */
  var CATALOG = [
    /* --- slope --- */
    {
      id: 'slope_gives_b', topic: 'slope', kind: 'numeric', questions: ['s1'],
      detect: 'answer equals b',
      value: function (p) { return p.b; },
      draw: function (p) {
        var view = slopeView(p);
        return scene(view, lineTri(view, p.b, p.b, p.x, 'you', 0, 0),
          [{ c: 'you', text: L('Your slope ' + fmt(p.b) + ' gives ' + eq(p.b, p.b), 'Sa slope mong ' + fmt(p.b) + ': ' + eq(p.b, p.b)) }]);
      },
      caption: function (p) {
        return p.plain
          ? L('That is b = ' + fmt(p.b) + ', where the line starts. The slope is m = ' + fmt(p.m) + ', the number beside x.',
              'Iyan ang b = ' + fmt(p.b) + ', kung saan nagsisimula ang line. Ang slope ay m = ' + fmt(p.m) + ', ang katabi ng x.')
          : L('You gave b = ' + fmt(p.b) + ', the base fare. The slope is m = ' + fmt(p.m) + ', the fare added per km.',
              'Binigay mo ang b = ' + fmt(p.b) + ', ang base fare. Ang slope ay m = ' + fmt(p.m) + ', ang dagdag kada km.');
      }
    },
    {
      id: 'slope_bigger_b_steeper', topic: 'slope', kind: 'choice', questions: ['s3'],
      detect: 's3 option "steeper"',
      draw: function (p) {
        var view = slopeView(p), b2 = p.b + bShift(p);
        return scene(view, [
          { t: 'line', m: p.m, b: p.b, c: 'ref', label: 'A' },
          { t: 'pt', x: 0, y: p.b, c: 'ref' },
          { t: 'line', m: p.m + bShift(p), b: b2, c: 'you', label: 'B?' },
          { t: 'pt', x: 0, y: b2, c: 'you' }
        ], [{ c: 'you', text: L('Your picture: B starts at ' + fmt(b2) + ' and also climbs faster.', 'Larawan mo: nagsisimula ang B sa ' + fmt(b2) + ' at mas mabilis ding umakyat.') }]);
      },
      caption: function () {
        return L('A bigger b lifts the whole line. Steepness comes only from m.',
                 'Inaangat lang ng mas malaking b ang buong line. Sa m lang galing ang tarik.');
      }
    },
    {
      id: 'slope_flip', topic: 'slope', kind: 'numeric', questions: ['s1', 's2'],
      detect: 'answer equals 1 / m',
      value: function (p) { return p.m === 0 ? null : 1 / p.m; },
      draw: function (p) {
        var view = slopeView(p), m = 1 / p.m;
        var run = triRun(p.m, p.b, p.x, view);
        return scene(view, lineTri(view, m, p.b, p.x, 'you', 0, 0), [
          { c: 'you', text: same('run ÷ rise = ' + fmt(run) + ' ÷ ' + fmt(p.m * run) + ' = ' + fmt(m)) },
          { c: 'you', text: L('A line with that slope: ' + eq(m, p.b), 'Line na ganyan ang slope: ' + eq(m, p.b)) }
        ]);
      },
      caption: function () {
        return L('You flipped it: run ÷ rise. Slope is rise ÷ run.',
                 'Nabaligtad mo: run ÷ rise. Ang slope ay rise ÷ run.');
      }
    },
    {
      id: 'slope_y_over_x', topic: 'slope', kind: 'numeric', questions: ['s2'],
      detect: 'answer equals y / x at the marked point',
      value: function (p) { return p.x === 0 ? null : (p.m * p.x + p.b) / p.x; },
      draw: function (p) {
        var view = slopeView(p), y = p.m * p.x + p.b, m = y / p.x;
        return scene(view, [
          { t: 'line', m: p.m, b: p.b, c: 'ref' },
          { t: 'pt', x: 0, y: p.b, c: 'ref', label: pair(0, p.b) },
          { t: 'line', m: m, b: 0, c: 'you' },
          { t: 'pt', x: 0, y: 0, c: 'you', label: pair(0, 0) },
          { t: 'tri', x1: 0, y1: 0, x2: p.x, y2: y, c: 'you', run: 'x ' + fmt(p.x), rise: 'y ' + fmt(y) },
          { t: 'pt', x: p.x, y: y, c: 'you', label: pair(p.x, y) }
        ], [{ c: 'you', text: same('y ÷ x = ' + fmt(y) + ' ÷ ' + fmt(p.x) + ' = ' + fmt(m)) }]);
      },
      caption: function (p) {
        return p.plain
          ? L('y ÷ x is the slope from (0, 0). This line starts at b, so use rise ÷ run.',
              'Ang y ÷ x ay slope mula (0, 0). Sa b nagsisimula ang line, kaya rise ÷ run.')
          : L('y ÷ x measures from ₱0. The fare starts at b, so use rise ÷ run.',
              'Ang y ÷ x ay sukat mula ₱0. Sa b nagsisimula ang pamasahe, kaya rise ÷ run.');
      }
    },
    {
      id: 'slope_negative_up', topic: 'slope', kind: 'choice', questions: ['s4'],
      detect: 's4 option "up"',
      draw: function (p) {
        var view = slopeView(p), m = Math.abs(p.m), r = triRun(m, p.b, p.x, view);
        return scene(view, [
          { t: 'line', m: m, b: p.b, c: 'you' },
          { t: 'pt', x: 0, y: p.b, c: 'you', label: pair(0, p.b) },
          { t: 'tri', x1: 0, y1: p.b, x2: r, y2: p.b + m * r, c: 'you', run: 'run ' + fmt(r), rise: 'rise ' + fmt(m * r) }
        ], [{ c: 'you', text: L('A line going up has slope ' + fmt(m) + ', not ' + fmt(p.m), 'Ang line na pataas ay may slope na ' + fmt(m) + ', hindi ' + fmt(p.m)) }]);
      },
      caption: function () {
        return L('Negative slope means y drops as x moves right. This line goes down.',
                 'Kapag negative ang slope, bumababa ang y habang pakanan ang x. Pababa ang line.');
      }
    },

    /* --- two lines --- */
    {
      id: 'lines_higher_base_always', topic: 'lines', kind: 'choice', questions: ['l3'],
      detect: 'l3 option "yes"',
      draw: function (p) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c ? c.x : 0]);
        var hiIsA = p.b1 > p.b2;
        var lo = hiIsA ? { m: p.m2, b: p.b2, n: 'B' } : { m: p.m1, b: p.b1, n: 'A' };
        var hi = hiIsA ? { b: p.b1, n: 'A' } : { b: p.b2, n: 'B' };
        return scene(view, [
          { t: 'line', m: lo.m, b: lo.b, c: lo.n, label: lo.n },
          { t: 'line', m: lo.m, b: hi.b, c: 'you', label: hi.n + '?' }
        ], [{ c: 'you', text: L('Your picture: ' + hi.n + ' stays ' + fmt(hi.b - lo.b) + ' above ' + lo.n + ' forever.', 'Larawan mo: laging ' + fmt(hi.b - lo.b) + ' ang lamang ng ' + hi.n + ' sa ' + lo.n + '.') }]);
      },
      caption: function () {
        return L('Base fare only decides the start. The per-km rate decides who wins later.',
                 'Simula lang ang base fare. Ang dagdag kada km ang magpapasya sa dulo.');
      }
    },
    {
      id: 'lines_only_distance', topic: 'lines', kind: 'numeric', questions: ['l2'],
      detect: 'answer equals the crossing distance x',
      value: function (p) { var c = crossing(p.m1, p.b1, p.m2, p.b2); return c ? c.x : null; },
      draw: function (p) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c.x]);
        return scene(view, twoLines(p, 0).concat([
          { t: 'vline', x: c.x, c: 'you' },
          { t: 'pt', x: c.x, y: 0, c: 'you', label: fmt(c.x) + ' km' }
        ]), [{ c: 'you', text: L('Your ' + fmt(c.x) + ' is a spot on the distance axis.', 'Ang ' + fmt(c.x) + ' mo ay nasa distance axis.') }]);
      },
      caption: function () {
        return L('That is the distance where they meet. The question asks the fare: the height there.',
                 'Iyan ang layo kung saan sila nagtagpo. Pamasahe ang tanong: ang taas doon.');
      }
    },
    {
      id: 'lines_parallel_cross', topic: 'lines', kind: 'choice', questions: ['l4'],
      detect: 'l4 option "cross"',
      draw: function (p) {
        var view = linesView(p), xm = view.xr[1];
        var bend = (p.m1 * xm + p.b1 - p.b2) / xm;
        return scene(view, [
          { t: 'line', m: p.m1, b: p.b1, c: 'A', label: 'A' },
          { t: 'line', m: bend, b: p.b2, c: 'you', label: 'B?' }
        ], [{ c: 'you', text: L('To meet A, line B would need ' + fmt(bend) + ' per km, not ' + fmt(p.m2) + '.', 'Para magtagpo, kailangan ng B ng ' + fmt(bend) + ' kada km, hindi ' + fmt(p.m2) + '.') }]);
      },
      caption: function () {
        return L('Same per-km rate means the gap never changes. Parallel lines never meet.',
                 'Pareho ang dagdag kada km, kaya hindi nagbabago ang agwat. Hindi nagtatagpo ang parallel lines.');
      }
    },
    {
      id: 'lines_negative_distance', topic: 'lines', kind: 'numeric', questions: ['l1'],
      detect: 'answer equals minus the crossing distance',
      value: function (p) { var c = crossing(p.m1, p.b1, p.m2, p.b2); return c ? -c.x : null; },
      draw: function (p) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c.x, -c.x]);
        var sc = scene(view, twoLines(p, 0).concat([
          { t: 'vline', x: -c.x, c: 'you' },
          { t: 'pt', x: -c.x, y: 0, c: 'you', label: fmt(-c.x) + ' km' }
        ]), [{ c: 'you', text: L('At ' + fmt(-c.x) + ' km the fares are ' + fmt(line(p.m1, p.b1, -c.x)) + ' and ' + fmt(line(p.m2, p.b2, -c.x)) + ': not equal.', 'Sa ' + fmt(-c.x) + ' km, ' + fmt(line(p.m1, p.b1, -c.x)) + ' at ' + fmt(line(p.m2, p.b2, -c.x)) + ' ang pamasahe: hindi pantay.') }]);
        sc.share = true;
        return sc;
      },
      caption: function () {
        return L('You subtracted in the wrong order. A negative distance would be a ride backwards.',
                 'Baligtad ang pag-subtract mo. Ang negative na layo ay parang biyaheng paatras.');
      }
    },

    /* --- slope of a curve --- */
    {
      id: 'curve_average_speed', topic: 'curve', kind: 'numeric', questions: ['c1'],
      detect: 'answer equals s(T) / T',
      value: function (p) { return s(p.a, p.T, p.T) / p.T; },
      draw: function (p) {
        var end = s(p.a, p.T, p.T);
        return scene(curveView(p), [
          fnS(p, 'ref', 0),
          { t: 'seg', x1: 0, y1: 0, x2: p.T, y2: end, c: 'you' },
          { t: 'pt', x: 0, y: 0, c: 'you' },
          { t: 'pt', x: p.T, y: end, c: 'you', label: pair(p.T, end) }
        ], [{ c: 'you', text: L('Whole trip: ' + fmt(end) + ' km ÷ ' + fmt(p.T) + ' h = ' + fmt(end / p.T) + ' km/h', 'Buong biyahe: ' + fmt(end) + ' km ÷ ' + fmt(p.T) + ' h = ' + fmt(end / p.T) + ' km/h') }]);
      },
      caption: function () {
        return L('That is the average speed of the whole trip. Speed at one moment is the slope there.',
                 'Average speed iyan ng buong biyahe. Ang bilis sa isang sandali ay ang slope doon.');
      }
    },
    {
      id: 'curve_same_everywhere', topic: 'curve', kind: 'choice', questions: ['c2'],
      detect: 'c2 option "same"',
      draw: function (p) {
        var end = s(p.a, p.T, p.T);
        return scene(curveView(p), [
          { t: 'seg', x1: 0, y1: 0, x2: p.T, y2: end, c: 'you' },
          { t: 'pt', x: 0, y: 0, c: 'you' },
          { t: 'pt', x: p.T, y: end, c: 'you' }
        ], [{ c: 'you', text: L('One slope everywhere is a straight line: always ' + fmt(end / p.T) + ' km/h.', 'Iisang slope kahit saan ay straight line: laging ' + fmt(end / p.T) + ' km/h.') }]);
      },
      caption: function () {
        return L('One slope fits only a straight line. This curve changes steepness as the jeepney speeds up and slows.',
                 'Sa straight line lang iisa ang slope. Nagbabago ang tarik ng curve habang bumibilis at bumabagal ang jeep.');
      }
    },
    {
      id: 'curve_gives_height', topic: 'curve', kind: 'numeric', questions: ['c1'],
      detect: 'answer equals s(t0)',
      value: function (p) { return s(p.a, p.T, p.t0); },
      draw: function (p) {
        var y = s(p.a, p.T, p.t0);
        return scene(curveView(p), [
          fnS(p, 'ref', 0),
          { t: 'vbar', x: p.t0, y: y, c: 'you' },
          { t: 'pt', x: p.t0, y: y, c: 'you', label: fmt(y) + ' km' }
        ], [{ c: 'you', text: L('Height of the curve at t = ' + fmt(p.t0) + ': ' + fmt(y) + ' km', 'Taas ng curve sa t = ' + fmt(p.t0) + ': ' + fmt(y) + ' km') }]);
      },
      caption: function () {
        return L('That is the height: distance so far, in km. Speed is the steepness there.',
                 'Taas iyan: layo na natakbo, sa km. Ang bilis ay ang tarik doon.');
      }
    },
    {
      id: 'curve_zero_over_zero', topic: 'curve', kind: 'choice', questions: ['c3'],
      detect: 'c3 option "none"',
      draw: function (p) {
        var y = s(p.a, p.T, p.t0);
        return scene(curveView(p), [
          fnS(p, 'ref', 0),
          { t: 'pt', x: p.t0, y: y, c: 'you', label: '0 ÷ 0 ?' }
        ], [{ c: 'you', text: L('With h exactly 0 there is one point, so no line to measure.', 'Kapag eksaktong 0 ang h, iisang point lang, walang line na masusukat.') }]);
      },
      caption: function () {
        return L('We never divide by 0. We shrink h and watch the slopes close in on one value.',
                 'Hindi tayo nagdi-divide sa 0. Pinapaliit ang h at tinitingnan kung saan lumalapit ang slope.');
      }
    },

    /* --- area --- */
    {
      id: 'area_height_times_width', topic: 'area', kind: 'numeric', questions: ['a1'],
      detect: 'answer equals v(t1) * t1',
      value: function (p) { return v(p.a, p.T, p.t1) * p.t1; },
      draw: function (p) {
        var h = v(p.a, p.T, p.t1);
        return scene(speedView(p), [
          fnV(p, 'ref', 0),
          { t: 'rect', x: 0, w: p.t1, h: h, c: 'you' },
          { t: 'pt', x: p.t1, y: h, c: 'you' }
        ], [{ c: 'you', text: same(fmt(h) + ' km/h × ' + fmt(p.t1) + ' h = ' + fmt(h * p.t1) + ' km') }]);
      },
      caption: function () {
        return L('Height × width is a rectangle. The speed kept changing, so the real area is curved.',
                 'Rectangle ang height × width. Paiba-iba ang bilis, kaya kurbado ang totoong area.');
      }
    },
    {
      id: 'area_gives_height', topic: 'area', kind: 'numeric', questions: ['a1'],
      detect: 'answer equals v(t1)',
      value: function (p) { return v(p.a, p.T, p.t1); },
      draw: function (p) {
        var h = v(p.a, p.T, p.t1);
        return scene(speedView(p), [
          fnV(p, 'ref', 0),
          { t: 'vbar', x: p.t1, y: h, c: 'you' },
          { t: 'pt', x: p.t1, y: h, c: 'you', label: fmt(h) + ' km/h' }
        ], [{ c: 'you', text: L('Height of the curve at t = ' + fmt(p.t1) + ': ' + fmt(h) + ' km/h', 'Taas ng curve sa t = ' + fmt(p.t1) + ': ' + fmt(h) + ' km/h') }]);
      },
      caption: function () {
        return L('That is the speed at that moment: a height. Distance is the whole area under the curve.',
                 'Bilis iyan sa sandaling iyon: taas lang. Ang layo ay ang buong area sa ilalim ng curve.');
      }
    },
    {
      id: 'area_more_rects_grows', topic: 'area', kind: 'choice', questions: ['a3'],
      detect: 'a3 option "grows"',
      draw: function (p) {
        var b = barsData(p);
        var items = [];
        for (var i = 0; i < 3; i++) { items.push({ t: 'rect', x: i + 0.7, w: 0.6, h: b.totals[i], c: 'ref' }); }
        items.push({ t: 'seg', x1: 1, y1: b.totals[0], x2: 4.3, y2: b.totals[0] + 3.3 * b.grow, c: 'you' });
        items.push({ t: 'label', x: 4, y: b.totals[0] + 3 * b.grow, c: 'you', str: '?' });
        return scene(b.view, items, [{ c: 'you', text: L('Your picture: each step adds about ' + fmt(b.grow) + ' km more, forever.', 'Larawan mo: bawat hakbang, dagdag na mga ' + fmt(b.grow) + ' km, walang katapusan.') }]);
      },
      caption: function () {
        return L('More rectangles are thinner rectangles, not more area. The total closes in on the exact area.',
                 'Pumapayat lang ang mga rectangle, hindi dumadami ang area. Lumalapit ang total sa exact area.');
      }
    },
    {
      id: 'area_four_rect_exact', topic: 'area', kind: 'numeric', questions: ['a2'],
      detect: 'answer equals the 4-rectangle total',
      value: function (p) { return rectSum(p.a, p.T, 4, p.t1); },
      draw: function (p) {
        var r4 = rectSum(p.a, p.T, 4, p.t1);
        return scene(speedView(p), [
          { t: 'rects', a: p.a, T: p.T, n: 4, to: p.t1, c: 'you' },
          fnV(p, 'ref', 0)
        ], [{ c: 'you', text: same('4 rectangles: ' + fmt(r4) + ' km') }]);
      },
      caption: function () {
        return L('Four rectangles do not fit the curve exactly. More rectangles close in on the exact area.',
                 'Hindi eksaktong kasya sa curve ang apat na rectangle. Mas maraming rectangle, mas lapit sa exact area.');
      }
    },
    {
      id: 'area_units', topic: 'area', kind: 'choice', questions: ['a4'],
      detect: 'a4 option "kmh"',
      draw: function (p) {
        return scene(speedView(p), sliceItems(p, 'you', 0), [
          { c: 'you', text: L('Your units: km/h × h = km/h ?', 'Units mo: km/h × h = km/h ?') }
        ]);
      },
      caption: function () {
        return L('km/h × h: the hours cancel and km is left. Area under speed is distance.',
                 'km/h × h: nagka-cancel ang hours, km ang natira. Layo ang area sa ilalim ng bilis.');
      }
    }
  ];

  var CAT = {};
  CATALOG.forEach(function (e) { CAT[e.id] = e; });

  // How far b is raised in question s3: five slider steps.
  function bShift(p) { return 5 * (p.plain ? RANGES.slope.plain.b[2] : RANGES.slope.story.b[2]); }

  function barsData(p) {
    var totals = RECT_COUNTS.map(function (n) { return rectSum(p.a, p.T, n, p.t1); });
    var exact = s(p.a, p.T, p.t1);
    var grow = Math.max(Math.abs(totals[1] - totals[0]), exact * 0.1);
    var top = Math.max(exact * 1.2, totals[0] + 3.3 * grow, totals[0], totals[1], totals[2], totals[3]);
    var view = {
      xr: [0.4, 4.6], yr: [0, niceCeil(top)],
      xl: L('number of rectangles', 'bilang ng rectangle'), yl: L('total (km)', 'total (km)'),
      xticks: RECT_COUNTS.map(function (n, i) { return { x: i + 1, label: String(n) }; })
    };
    return { totals: totals, exact: exact, grow: grow, view: view };
  }

  // One thin slice at mid-trip, with its two sides named by unit.
  function sliceItems(p, c, sStep) {
    var mid = p.T / 2, w = p.T / 10, h = v(p.a, p.T, mid);
    return [
      fnV(p, 'ref', 0),
      { t: 'rect', x: mid - w / 2, w: w, h: h, c: c, s: sStep },
      { t: 'label', x: mid - w / 2, y: h / 2, c: c, s: sStep, str: fmt(h) + ' km/h', anchor: 'right' },
      { t: 'label', x: mid, y: 0, c: c, s: sStep, str: fmt(w) + ' h', anchor: 'above' }
    ];
  }

  /* ---------- questions ----------
   * need(p)   : null, or the name of the slider condition this question requires
   * correct(p): numeric questions: the right number
   * ok(p)     : { scene, steps } the correct picture, built up over the replay steps
   * neutral(p, value): numeric questions: the student's number drawn with no diagnosis
   */

  function needCross(p) {
    var c = crossing(p.m1, p.b1, p.m2, p.b2);
    return (c && c.x > TOL) ? null : 'needCross';
  }
  function needTime(p) { return p.t1 > 0 ? null : 'needTime'; }

  function slopeOk(p, stepsText) {
    var view = slopeView(p);
    var items = [{ t: 'line', m: p.m, b: p.b, c: 'ok', s: 0 }].concat(
      lineTri(view, p.m, p.b, p.x, 'ok', 1, 2).slice(1));
    return { scene: scene(view, items, [slopeNote(p.m, p.b, p.x, view, 3, 'ok')]), steps: stepsText };
  }

  function slopeNeutral(p, value) {
    var view = slopeView(p);
    return scene(view, lineTri(view, value, p.b, p.x, 'you', 0, 0),
      [{ c: 'you', text: L('A line with slope ' + fmt(value) + ': ' + eq(value, p.b), 'Line na may slope na ' + fmt(value) + ': ' + eq(value, p.b)) }]);
  }

  function crossOk(p, withCost, steps) {
    var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c.x]);
    var items = twoLines(p, 0).concat([
      { t: 'vline', x: c.x, c: 'ok', s: 2 },
      { t: 'pt', x: c.x, y: c.y, c: 'ok', s: 2, label: withCost ? '' : pair(c.x, c.y) }
    ]);
    if (withCost) {
      items.push({ t: 'seg', x1: 0, y1: c.y, x2: c.x, y2: c.y, c: 'ok', s: 3, dash: true });
      items.push({ t: 'pt', x: c.x, y: c.y, c: 'ok', s: 3, label: pair(c.x, c.y) });
    }
    return { scene: scene(view, items, []), steps: steps, c: c };
  }

  function curveOkTangent(p) {
    var y = s(p.a, p.T, p.t0);
    return [fnS(p, 'ok', 0), { t: 'pt', x: p.t0, y: y, c: 'ok', s: 1, label: 't = ' + fmt(p.t0), below: true }];
  }

  function areaNeutral(p, value) {
    var h = value / p.t1;
    return scene(speedView(p), [
      fnV(p, 'ref', 0),
      { t: 'rect', x: 0, w: p.t1, h: h, c: 'you' }
    ], [{ c: 'you', text: L('A rectangle with area ' + fmt(value) + ' km: ' + fmt(p.t1) + ' h wide, ' + fmt(h) + ' km/h tall', 'Rectangle na ' + fmt(value) + ' km ang area: ' + fmt(p.t1) + ' h ang lapad, ' + fmt(h) + ' km/h ang taas') }]);
  }

  function areaOk(p, steps) {
    var exact = s(p.a, p.T, p.t1);
    var items = [fnV(p, 'ok', 0)];
    var notes = [];
    RECT_COUNTS.forEach(function (n, i) {
      items.push({ t: 'rects', a: p.a, T: p.T, n: n, to: p.t1, c: 'alt', s: i + 1, u: i + 1 });
      notes.push({ s: i + 1, c: 'alt', text: same(n + ' rectangles: ' + fmt(rectSum(p.a, p.T, n, p.t1)) + ' km') });
    });
    items.push({ t: 'area', a: p.a, T: p.T, from: 0, to: p.t1, c: 'ok', s: 5 });
    notes.push({ s: 5, c: 'ok', text: L('Exact area from 0 to ' + fmt(p.t1) + ' h: ' + fmt(exact) + ' km', 'Exact area mula 0 hanggang ' + fmt(p.t1) + ' h: ' + fmt(exact) + ' km') });
    return { scene: scene(speedView(p), items, notes), steps: steps };
  }

  var AREA_STEPS = [
    L('Cut the time into 4 slices. Each rectangle is speed × time for its slice.', 'Hatiin ang oras sa 4 na hiwa. Bawat rectangle ay bilis × oras ng hiwa nito.'),
    L('8 thinner rectangles follow the curve more closely.', 'Mas sunod sa curve ang 8 mas payat na rectangles.'),
    L('16 rectangles follow it more closely still. The total changes less.', 'Mas sunod pa ang 16 rectangles. Mas maliit na ang pagbabago ng total.'),
    L('100 rectangles almost trace the curve.', 'Halos kasunod na ng curve ang 100 rectangles.'),
    L('The value the totals close in on is the exact area: the distance travelled.', 'Ang nilalapitan ng mga total ang exact area: ang layong nilakbay.')
  ];

  var QUESTIONS = [
    /* --- slope --- */
    {
      id: 's1', topic: 'slope', type: 'numeric', entries: ['slope_gives_b', 'slope_flip'],
      preset: { m: 3, b: 2, x: 4, plain: false },
      prompt: function (p) {
        return p.plain
          ? L('What is the slope of the line ' + eq(p.m, p.b) + '?', 'Ano ang slope ng line na ' + eq(p.m, p.b) + '?')
          : L('A jeepney fare follows ' + eq(p.m, p.b) + ', where y is the fare in ₱ and x is the distance in km. What is the slope of this line?',
              'Ang pamasahe sa jeep ay ' + eq(p.m, p.b) + ', kung saan y ang pamasahe sa ₱ at x ang layo sa km. Ano ang slope ng line na ito?');
      },
      correct: function (p) { return p.m; },
      ok: function (p) {
        return slopeOk(p, [
          L('The line starts at ' + pair(0, p.b) + '. That start is b.', 'Nagsisimula ang line sa ' + pair(0, p.b) + '. Iyan ang b.'),
          L('Go right (run) and see how far the line climbs (rise).', 'Pumunta pakanan (run) at tingnan kung gaano umakyat ang line (rise).'),
          L('Slope = rise ÷ run = ' + fmt(p.m) + '. It is the number beside x.', 'Slope = rise ÷ run = ' + fmt(p.m) + '. Ito ang numerong katabi ng x.')
        ]);
      },
      neutral: slopeNeutral
    },
    {
      id: 's2', topic: 'slope', type: 'numeric', entries: ['slope_y_over_x', 'slope_flip'],
      preset: { m: 3, b: 2, x: 4, plain: false },
      prompt: function (p) {
        var y = p.m * p.x + p.b;
        return p.plain
          ? L('A line passes through ' + pair(0, p.b) + ' and ' + pair(p.x, y) + '. What is its slope?', 'Dumadaan ang line sa ' + pair(0, p.b) + ' at ' + pair(p.x, y) + '. Ano ang slope nito?')
          : L('The base fare is ₱' + fmt(p.b) + '. A ' + fmt(p.x) + ' km ride costs ₱' + fmt(y) + '. How much fare is added per km (the slope)?',
              '₱' + fmt(p.b) + ' ang base fare. ₱' + fmt(y) + ' ang bayad sa ' + fmt(p.x) + ' km. Magkano ang dagdag kada km (ang slope)?');
      },
      correct: function (p) { return p.m; },
      ok: function (p) {
        var view = slopeView(p), run = triRun(p.m, p.b, p.x, view);
        return slopeOk(p, [
          L('Mark the start ' + pair(0, p.b) + ' on the line.', 'Markahan ang simula ' + pair(0, p.b) + ' sa line.'),
          L('Run = ' + fmt(run) + '. Rise = ' + fmt(p.m * run + p.b) + ' − ' + fmt(p.b) + ' = ' + fmt(p.m * run) + '.', 'Run = ' + fmt(run) + '. Rise = ' + fmt(p.m * run + p.b) + ' − ' + fmt(p.b) + ' = ' + fmt(p.m * run) + '.'),
          L('Slope = rise ÷ run = ' + fmt(p.m) + '. Take away b before dividing.', 'Slope = rise ÷ run = ' + fmt(p.m) + '. Ibawas muna ang b bago mag-divide.')
        ]);
      },
      neutral: slopeNeutral
    },
    {
      id: 's3', topic: 'slope', type: 'choice',
      preset: { m: 3, b: 2, x: 4, plain: false },
      prompt: function (p) {
        var b2 = p.b + bShift(p);
        return p.plain
          ? L('Line A is ' + eq(p.m, p.b) + '. Line B is ' + eq(p.m, b2) + '. Is B steeper than A?', 'Ang Line A ay ' + eq(p.m, p.b) + '. Ang Line B ay ' + eq(p.m, b2) + '. Mas matarik ba ang B kaysa A?')
          : L('Scheme A starts at ₱' + fmt(p.b) + '. Scheme B starts at ₱' + fmt(b2) + '. Both add ₱' + fmt(p.m) + ' per km. Is B’s line steeper than A’s?',
              'Nagsisimula ang Scheme A sa ₱' + fmt(p.b) + ', ang Scheme B sa ₱' + fmt(b2) + '. Pareho silang dagdag na ₱' + fmt(p.m) + ' kada km. Mas matarik ba ang line ng B?');
      },
      options: [
        { id: 'same', correct: true, text: L('No. Same steepness. B only starts higher.', 'Hindi. Pareho ang tarik. Mas mataas lang ang simula ng B.') },
        { id: 'steeper', entry: 'slope_bigger_b_steeper', text: L('Yes. A bigger b makes the line steeper.', 'Oo. Mas malaking b, mas matarik ang line.') }
      ],
      ok: function (p) {
        var view = slopeView(p), b2 = p.b + bShift(p);
        var r = (triRun(p.m, p.b, p.x, view) === p.x && triRun(p.m, b2, p.x, view) === p.x) ? p.x : 1;
        var items = [
          { t: 'line', m: p.m, b: p.b, c: 'ref', s: 0, label: 'A' },
          { t: 'tri', x1: 0, y1: p.b, x2: r, y2: p.b + p.m * r, c: 'ref', s: 1, run: 'run ' + fmt(r), rise: 'rise ' + fmt(p.m * r) },
          { t: 'line', m: p.m, b: b2, c: 'ok', s: 2, label: 'B' },
          { t: 'pt', x: 0, y: b2, c: 'ok', s: 2, label: pair(0, b2) },
          { t: 'tri', x1: 0, y1: b2, x2: r, y2: b2 + p.m * r, c: 'ok', s: 3, run: 'run ' + fmt(r), rise: 'rise ' + fmt(p.m * r) }
        ];
        return {
          scene: scene(view, items, [{ s: 3, c: 'ok', text: L('Over a run of ' + fmt(r) + ', A and B both rise ' + fmt(p.m * r) + ': same slope, ' + fmt(p.m) + '.', 'Sa run na ' + fmt(r) + ', parehong ' + fmt(p.m * r) + ' ang rise ng A at B: iisang slope, ' + fmt(p.m) + '.') }]),
          steps: [
            L('Line A starts at ' + fmt(p.b) + ' and rises ' + fmt(p.m) + ' for each step right.', 'Nagsisimula ang A sa ' + fmt(p.b) + ' at umaakyat ng ' + fmt(p.m) + ' kada hakbang pakanan.'),
            L('Line B starts higher, at ' + fmt(b2) + '.', 'Mas mataas ang simula ng B, sa ' + fmt(b2) + '.'),
            L('B also rises ' + fmt(p.m) + ' per step. Same m, so the lines are parallel.', 'Umaakyat din ang B ng ' + fmt(p.m) + ' kada hakbang. Parehong m, kaya parallel ang mga line.')
          ]
        };
      }
    },
    {
      id: 's4', topic: 'slope', type: 'choice',
      preset: { m: -2, b: 4, x: 3, plain: true },
      need: function (p) { return (p.plain && p.m < 0) ? null : 'needNegative'; },
      prompt: function (p) {
        return L('On the plain graph, the line ' + eq(p.m, p.b) + ' has slope ' + fmt(p.m) + '. Reading left to right, does it go up or down?',
                 'Sa plain graph, ' + fmt(p.m) + ' ang slope ng line na ' + eq(p.m, p.b) + '. Mula kaliwa pakanan, pataas ba o pababa?');
      },
      options: [
        { id: 'down', correct: true, text: L('It goes down.', 'Pababa.') },
        { id: 'up', entry: 'slope_negative_up', text: L('It goes up.', 'Pataas.') }
      ],
      ok: function (p) {
        var view = slopeView(p), r = triRun(p.m, p.b, p.x, view);
        var items = [
          { t: 'line', m: p.m, b: p.b, c: 'ok', s: 0 },
          { t: 'pt', x: 0, y: p.b, c: 'ok', s: 1, label: pair(0, p.b) },
          { t: 'tri', x1: 0, y1: p.b, x2: r, y2: p.b + p.m * r, c: 'ok', s: 2, run: 'run ' + fmt(r), rise: 'rise ' + fmt(p.m * r) },
          { t: 'pt', x: r, y: p.b + p.m * r, c: 'ok', s: 3, label: pair(r, p.b + p.m * r) }
        ];
        return {
          scene: scene(view, items, [{ s: 3, c: 'ok', text: same('rise ÷ run = ' + fmt(p.m * r) + ' ÷ ' + fmt(r) + ' = ' + fmt(p.m)) }]),
          steps: [
            L('Start where the line meets the y-axis: ' + pair(0, p.b) + '.', 'Magsimula kung saan tumatama ang line sa y-axis: ' + pair(0, p.b) + '.'),
            L('Move right by ' + fmt(r) + '. The rise is ' + fmt(p.m * r) + ': a drop.', 'Pumunta pakanan ng ' + fmt(r) + '. Ang rise ay ' + fmt(p.m * r) + ': bumaba.'),
            L('You land at ' + pair(r, p.b + p.m * r) + ', lower than the start. The line goes down.', 'Napunta ka sa ' + pair(r, p.b + p.m * r) + ', mas mababa sa simula. Pababa ang line.')
          ]
        };
      }
    },

    /* --- two lines --- */
    {
      id: 'l1', topic: 'lines', type: 'numeric', entries: ['lines_negative_distance'],
      preset: { m1: 2, b1: 15, m2: 4, b2: 5 }, need: needCross, hides: ['cross'],
      prompt: function (p) {
        return L('Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. At what distance (km) do both cost the same?',
                 'Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Sa anong layo (km) pareho ang bayad?');
      },
      correct: function (p) { return crossing(p.m1, p.b1, p.m2, p.b2).x; },
      ok: function (p) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2);
        var r = crossOk(p, true, [
          L('Same cost means the two rules give the same y.', 'Pareho ang bayad kapag pareho ang y ng dalawang rule.'),
          L('Solve ' + fmt(p.m1) + 'x + ' + fmt(p.b1) + ' = ' + fmt(p.m2) + 'x + ' + fmt(p.b2) + ': x = ' + fmt(c.x) + ' km.', 'I-solve ang ' + fmt(p.m1) + 'x + ' + fmt(p.b1) + ' = ' + fmt(p.m2) + 'x + ' + fmt(p.b2) + ': x = ' + fmt(c.x) + ' km.'),
          L('Check: at ' + fmt(c.x) + ' km both rules give ₱' + fmt(c.y) + '.', 'Check: sa ' + fmt(c.x) + ' km, parehong ₱' + fmt(c.y) + ' ang dalawang rule.')
        ]);
        r.scene.notes = [
          { s: 2, c: 'ok', text: same('x = (' + fmt(p.b2) + ' − ' + fmt(p.b1) + ') ÷ (' + fmt(p.m1) + ' − ' + fmt(p.m2) + ') = ' + fmt(c.x)) }
        ];
        return r;
      },
      neutral: function (p, value) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c.x, value]);
        var inView = value >= view.xr[0] && value <= view.xr[1];
        var items = twoLines(p, 0);
        if (inView) {
          items.push({ t: 'vline', x: value, c: 'you' });
          items.push({ t: 'pt', x: value, y: line(p.m1, p.b1, value), c: 'A' });
          items.push({ t: 'pt', x: value, y: line(p.m2, p.b2, value), c: 'B' });
        }
        var sc = scene(view, items, [{ c: 'you', text: L('At ' + fmt(value) + ' km: A costs ' + fmt(line(p.m1, p.b1, value)) + ', B costs ' + fmt(line(p.m2, p.b2, value)) + '.', 'Sa ' + fmt(value) + ' km: ' + fmt(line(p.m1, p.b1, value)) + ' ang A, ' + fmt(line(p.m2, p.b2, value)) + ' ang B.') }]);
        sc.share = true;
        return sc;
      }
    },
    {
      id: 'l2', topic: 'lines', type: 'numeric', entries: ['lines_only_distance'],
      preset: { m1: 2, b1: 15, m2: 4, b2: 5 }, need: needCross, hides: ['cross'],
      prompt: function (p) {
        return L('Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. What is the fare (₱) at the distance where both cost the same?',
                 'Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Magkano ang pamasahe (₱) sa layong pareho ang bayad?');
      },
      correct: function (p) { return crossing(p.m1, p.b1, p.m2, p.b2).y; },
      ok: function (p) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2);
        var r = crossOk(p, true, [
          L('The lines meet where both rules give the same fare.', 'Nagtatagpo ang mga line kung saan pareho ang pamasahe.'),
          L('They meet at x = ' + fmt(c.x) + ' km. That is the distance, not yet the fare.', 'Nagtagpo sila sa x = ' + fmt(c.x) + ' km. Layo iyan, hindi pa pamasahe.'),
          L('Put x into either rule: the fare is ₱' + fmt(c.y) + '.', 'Ilagay ang x sa alinmang rule: ₱' + fmt(c.y) + ' ang pamasahe.')
        ]);
        r.scene.notes = [
          { s: 3, c: 'ok', text: same('y = ' + fmt(p.m1) + ' × ' + fmt(c.x) + ' + ' + fmt(p.b1) + ' = ' + fmt(c.y)) }
        ];
        return r;
      },
      neutral: function (p, value) {
        var c = crossing(p.m1, p.b1, p.m2, p.b2), view = linesView(p, [c.x], [value]);
        var items = twoLines(p, 0);
        if (value >= view.yr[0] && value <= view.yr[1]) { items.push({ t: 'hline', y: value, c: 'you' }); }
        var sc = scene(view, items, [{ c: 'you', text: L('Your fare, ₱' + fmt(value) + ', drawn as a height.', 'Ang pamasahe mo, ₱' + fmt(value) + ', bilang taas.') }]);
        sc.share = true;
        return sc;
      }
    },
    {
      id: 'l3', topic: 'lines', type: 'choice',
      preset: { m1: 2, b1: 15, m2: 4, b2: 5 }, need: needCross, hides: ['cross'],
      prompt: function (p) {
        var hi = p.b1 > p.b2 ? 'A' : 'B';
        return L('Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Scheme ' + hi + ' has the higher base fare. Is ' + hi + ' always the more expensive ride?',
                 'Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Mas mataas ang base fare ng Scheme ' + hi + '. Lagi bang mas mahal ang ' + hi + '?');
      },
      options: [
        { id: 'no', correct: true, text: L('No. On a long enough ride it becomes the cheaper one.', 'Hindi. Kapag sapat ang layo, ito na ang mas mura.') },
        { id: 'yes', entry: 'lines_higher_base_always', text: L('Yes. A higher base fare always costs more.', 'Oo. Laging mas mahal kapag mas mataas ang base fare.') }
      ],
      ok: function (p) {
        var hi = p.b1 > p.b2 ? 'A' : 'B', lo = hi === 'A' ? 'B' : 'A';
        var c = crossing(p.m1, p.b1, p.m2, p.b2);
        var r = crossOk(p, false, [
          L('At 0 km, ' + hi + ' costs more: it starts higher.', 'Sa 0 km, mas mahal ang ' + hi + ': mas mataas ang simula.'),
          L(hi + ' adds less per km, so the gap shrinks until they meet at ' + fmt(c.x) + ' km.', 'Mas maliit ang dagdag ng ' + hi + ' kada km, kaya lumiliit ang agwat hanggang magtagpo sa ' + fmt(c.x) + ' km.'),
          L('Past ' + fmt(c.x) + ' km, ' + hi + ' is the cheaper ride.', 'Lampas ' + fmt(c.x) + ' km, ' + hi + ' na ang mas mura.')
        ]);
        r.scene.notes = [
          { s: 2, c: 'ok', text: L('Before ' + fmt(c.x) + ' km: ' + lo + ' is cheaper.', 'Bago ' + fmt(c.x) + ' km: mas mura ang ' + lo + '.') },
          { s: 3, c: 'ok', text: L('After ' + fmt(c.x) + ' km: ' + hi + ' is cheaper.', 'Lampas ' + fmt(c.x) + ' km: mas mura ang ' + hi + '.') }
        ];
        return r;
      }
    },
    {
      id: 'l4', topic: 'lines', type: 'choice',
      preset: { m1: 3, b1: 15, m2: 3, b2: 5 },
      need: function (p) { return relation(p.m1, p.b1, p.m2, p.b2) === 'parallel' ? null : 'needParallel'; },
      prompt: function (p) {
        return L('Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Both add the same fare per km. Is there a distance where they cost the same?',
                 'Scheme A: ' + eq(p.m1, p.b1) + '. Scheme B: ' + eq(p.m2, p.b2) + '. Pareho ang dagdag nila kada km. May layo bang pareho ang bayad?');
      },
      options: [
        { id: 'never', correct: true, text: L('No. They never cost the same.', 'Wala. Hindi kailanman magpapareho ang bayad.') },
        { id: 'cross', entry: 'lines_parallel_cross', text: L('Yes. They meet somewhere far along the ride.', 'Oo. Magtatagpo sila sa malayong bahagi ng biyahe.') }
      ],
      ok: function (p) {
        var view = linesView(p), x1 = view.xr[1] * 0.2, x2 = view.xr[1] * 0.8, g = Math.abs(p.b1 - p.b2);
        var items = twoLines(p, 0).concat([
          { t: 'seg', x1: x1, y1: line(p.m1, p.b1, x1), x2: x1, y2: line(p.m2, p.b2, x1), c: 'ok', s: 2 },
          { t: 'label', x: x1, y: (line(p.m1, p.b1, x1) + line(p.m2, p.b2, x1)) / 2, c: 'ok', s: 2, str: fmt(g), anchor: 'left' },
          { t: 'seg', x1: x2, y1: line(p.m1, p.b1, x2), x2: x2, y2: line(p.m2, p.b2, x2), c: 'ok', s: 3 },
          { t: 'label', x: x2, y: (line(p.m1, p.b1, x2) + line(p.m2, p.b2, x2)) / 2, c: 'ok', s: 3, str: fmt(g), anchor: 'left' }
        ]);
        return {
          scene: scene(view, items, [{ s: 3, c: 'ok', text: L('The gap is ₱' + fmt(g) + ' at every distance.', '₱' + fmt(g) + ' ang agwat sa lahat ng layo.') }]),
          steps: [
            L('Both lines rise ' + fmt(p.m1) + ' for each km.', 'Parehong umaakyat ng ' + fmt(p.m1) + ' kada km ang dalawang line.'),
            L('At ' + fmt(x1) + ' km the gap between them is ₱' + fmt(g) + '.', 'Sa ' + fmt(x1) + ' km, ₱' + fmt(g) + ' ang agwat nila.'),
            L('At ' + fmt(x2) + ' km it is still ₱' + fmt(g) + '. It never closes, so they never meet.', 'Sa ' + fmt(x2) + ' km, ₱' + fmt(g) + ' pa rin. Hindi ito nagsasara, kaya hindi sila nagtatagpo.')
          ]
        };
      }
    },

    /* --- slope of a curve --- */
    {
      id: 'c1', topic: 'curve', type: 'numeric', entries: ['curve_average_speed', 'curve_gives_height'],
      preset: DEFAULTS.curve, hides: ['tangent'],
      prompt: function (p) {
        return L('The curve shows the distance travelled (km) after t hours. How fast (km/h) is the jeepney going at t = ' + fmt(p.t0) + ' h?',
                 'Ipinapakita ng curve ang layong nilakbay (km) pagkatapos ng t oras. Gaano kabilis (km/h) ang jeep sa t = ' + fmt(p.t0) + ' h?');
      },
      correct: function (p) { return v(p.a, p.T, p.t0); },
      ok: function (p) {
        var h1 = gap(p.T, p.t0, p.h), h2 = h1 / 4, sp = v(p.a, p.T, p.t0);
        var items = curveOkTangent(p)
          .concat(secantItems(p, p.t0, h1, 'alt', 2, 2))
          .concat(secantItems(p, p.t0, h2, 'alt', 3, 3))
          .concat([tangentItem(p, p.t0, 'ok', 4)]);
        return {
          scene: scene(curveView(p), items, [
            { s: 2, c: 'alt', text: L('Gap ' + fmt(h1) + ' h: slope ' + fmt(secant(p.a, p.T, p.t0, h1)) + ' km/h', 'Gap na ' + fmt(h1) + ' h: slope ' + fmt(secant(p.a, p.T, p.t0, h1)) + ' km/h') },
            { s: 3, c: 'alt', text: L('Gap ' + fmt(h2) + ' h: slope ' + fmt(secant(p.a, p.T, p.t0, h2)) + ' km/h', 'Gap na ' + fmt(h2) + ' h: slope ' + fmt(secant(p.a, p.T, p.t0, h2)) + ' km/h') },
            { s: 4, c: 'ok', text: L('Tangent slope at t = ' + fmt(p.t0) + ': ' + fmt(sp) + ' km/h', 'Slope ng tangent sa t = ' + fmt(p.t0) + ': ' + fmt(sp) + ' km/h') }
          ]),
          steps: [
            L('Mark the moment t = ' + fmt(p.t0) + ' h on the curve.', 'Markahan ang sandaling t = ' + fmt(p.t0) + ' h sa curve.'),
            L('Take a second point ' + fmt(Math.abs(h1)) + ' h away. The line between them has a slope.', 'Kumuha ng pangalawang point na ' + fmt(Math.abs(h1)) + ' h ang layo. May slope ang line sa pagitan nila.'),
            L('Shrink the gap to ' + fmt(Math.abs(h2)) + ' h. The slope changes.', 'Paliitin ang gap sa ' + fmt(Math.abs(h2)) + ' h. Nagbabago ang slope.'),
            L('Keep shrinking: the line becomes the tangent. Its slope, ' + fmt(sp) + ' km/h, is the speed.', 'Paliitin pa: nagiging tangent ang line. Ang slope nito, ' + fmt(sp) + ' km/h, ang bilis.')
          ]
        };
      },
      neutral: function (p, value) {
        var y = s(p.a, p.T, p.t0), w = 0.3 * p.T;
        return scene(curveView(p), [
          fnS(p, 'ref', 0),
          { t: 'line', m: value, b: y - value * p.t0, x0: p.t0 - w, x1: p.t0 + w, c: 'you' },
          { t: 'pt', x: p.t0, y: y, c: 'you' }
        ], [{ c: 'you', text: L('A line with slope ' + fmt(value) + ' km/h through the point', 'Line na may slope na ' + fmt(value) + ' km/h sa point') }]);
      }
    },
    {
      id: 'c2', topic: 'curve', type: 'choice', preset: DEFAULTS.curve, hides: ['tangent'],
      prompt: function () {
        return L('Is the slope of this distance curve the same at every moment of the trip?',
                 'Pareho ba ang slope ng distance curve na ito sa bawat sandali ng biyahe?');
      },
      options: [
        { id: 'changes', correct: true, text: L('No. It starts flat, is steepest mid-trip, then flattens again.', 'Hindi. Patag sa simula, pinakamatarik sa gitna, tapos patag ulit.') },
        { id: 'same', entry: 'curve_same_everywhere', text: L('Yes. One curve has one slope.', 'Oo. Iisa ang slope ng isang curve.') }
      ],
      ok: function (p) {
        var ts = [p.T / 10, p.T / 2, 9 * p.T / 10], items = [fnS(p, 'ok', 0)], notes = [], names = [
          L('Early', 'Sa simula'), L('Mid-trip', 'Sa gitna'), L('Late', 'Sa dulo')];
        ts.forEach(function (t, i) {
          var it = tangentItem(p, t, 'alt', i + 1);
          it.x0 = t - 0.15 * p.T; it.x1 = t + 0.15 * p.T;
          items.push(it);
          items.push({ t: 'pt', x: t, y: s(p.a, p.T, t), c: 'alt', s: i + 1 });
          notes.push({ s: i + 1, c: 'alt', text: L(names[i].en + ' (t = ' + fmt(t) + '): slope ' + fmt(v(p.a, p.T, t)) + ' km/h', names[i].tl + ' (t = ' + fmt(t) + '): slope ' + fmt(v(p.a, p.T, t)) + ' km/h') });
        });
        return {
          scene: scene(curveView(p), items, notes),
          steps: [
            L('Early in the trip the curve is still shallow: the jeepney is only picking up speed.', 'Sa simula, mababaw pa ang curve: bumubuwelo pa lang ang jeep.'),
            L('Mid-trip the curve is steepest: top speed.', 'Sa gitna, pinakamatarik ang curve: pinakamabilis.'),
            L('Near the end it is shallow again: the jeepney is slowing to a stop.', 'Malapit sa dulo, mababaw ulit: bumabagal na ang jeep para huminto.')
          ]
        };
      }
    },
    {
      id: 'c3', topic: 'curve', type: 'choice', preset: DEFAULTS.curve, hides: ['tangent'],
      prompt: function (p) {
        return L('With a gap of h = 0, the slope formula becomes 0 ÷ 0. So does the jeepney have a speed at t = ' + fmt(p.t0) + ' h?',
                 'Kapag h = 0 ang gap, nagiging 0 ÷ 0 ang slope formula. May bilis ba ang jeep sa t = ' + fmt(p.t0) + ' h?');
      },
      options: [
        { id: 'limit', correct: true, text: L('Yes. As h shrinks, the slopes close in on one value.', 'Oo. Habang lumiliit ang h, lumalapit ang mga slope sa iisang value.') },
        { id: 'none', entry: 'curve_zero_over_zero', text: L('No. 0 ÷ 0 has no answer, so there is no speed.', 'Wala. Walang sagot ang 0 ÷ 0, kaya walang bilis.') }
      ],
      ok: function (p) {
        var h1 = gap(p.T, p.t0, p.h), hs = [h1, h1 / 4, h1 / 16], sp = v(p.a, p.T, p.t0);
        var items = curveOkTangent(p), notes = [];
        items[1].s = 0;
        hs.forEach(function (h, i) {
          items = items.concat(secantItems(p, p.t0, h, 'alt', i + 1, i + 1));
          notes.push({ s: i + 1, c: 'alt', text: same('h = ' + fmt(h) + ': slope ' + fmt(secant(p.a, p.T, p.t0, h)) + ' km/h') });
        });
        items.push(tangentItem(p, p.t0, 'ok', 4));
        notes.push({ s: 4, c: 'ok', text: L('The slopes close in on ' + fmt(sp) + ' km/h.', 'Lumalapit ang mga slope sa ' + fmt(sp) + ' km/h.') });
        return {
          scene: scene(curveView(p), items, notes),
          steps: [
            L('Start with a gap of ' + fmt(Math.abs(hs[0])) + ' h. Two points, one line, one slope.', 'Magsimula sa gap na ' + fmt(Math.abs(hs[0])) + ' h. Dalawang point, isang line, isang slope.'),
            L('Make the gap 4 times smaller. We divide by ' + fmt(Math.abs(hs[1])) + ', not by 0.', 'Gawing 4 na beses na mas maliit ang gap. Sa ' + fmt(Math.abs(hs[1])) + ' tayo nagdi-divide, hindi sa 0.'),
            L('Smaller again: ' + fmt(Math.abs(hs[2])) + ' h. Still not 0, and the slope is settling.', 'Mas maliit pa: ' + fmt(Math.abs(hs[2])) + ' h. Hindi pa rin 0, at pumipirmi na ang slope.'),
            L('The slopes head for one value. That value is the speed at this moment.', 'Papunta ang mga slope sa iisang value. Iyon ang bilis sa sandaling ito.')
          ]
        };
      }
    },

    /* --- area --- */
    {
      id: 'a1', topic: 'area', type: 'numeric', entries: ['area_height_times_width', 'area_gives_height'],
      preset: { a: 120, T: 1, t1: 0.5, n: 4 }, need: needTime, hides: ['exact'],
      prompt: function (p) {
        return L('The curve shows the speed (km/h) at each time t. How far (km) does the jeepney travel from t = ' + fmt(0) + ' to t = ' + fmt(p.t1) + ' h?',
                 'Ipinapakita ng curve ang bilis (km/h) sa bawat oras t. Gaano kalayo (km) ang nilakbay ng jeep mula t = ' + fmt(0) + ' hanggang t = ' + fmt(p.t1) + ' h?');
      },
      correct: function (p) { return s(p.a, p.T, p.t1); },
      ok: function (p) { return areaOk(p, AREA_STEPS); },
      neutral: areaNeutral
    },
    {
      id: 'a2', topic: 'area', type: 'numeric', entries: ['area_four_rect_exact'],
      preset: { a: 120, T: 1, t1: 1, n: 4 }, need: needTime, hides: ['exact'],
      prompt: function (p) {
        return L('Four rectangles from t = ' + fmt(0) + ' to ' + fmt(p.t1) + ' h add up to ' + fmt(rectSum(p.a, p.T, 4, p.t1)) + ' km. What is the exact distance (km)?',
                 'Ang apat na rectangle mula t = ' + fmt(0) + ' hanggang ' + fmt(p.t1) + ' h ay may total na ' + fmt(rectSum(p.a, p.T, 4, p.t1)) + ' km. Ano ang exact na layo (km)?');
      },
      correct: function (p) { return s(p.a, p.T, p.t1); },
      ok: function (p) { return areaOk(p, AREA_STEPS); },
      neutral: areaNeutral
    },
    {
      id: 'a3', topic: 'area', type: 'choice', preset: { a: 120, T: 1, t1: 0.5, n: 4 }, need: needTime, hides: ['exact'],
      prompt: function () {
        return L('We use 4, then 8, then 16, then 100 rectangles under the same curve. What happens to the total?',
                 'Gumamit tayo ng 4, tapos 8, tapos 16, tapos 100 rectangle sa ilalim ng parehong curve. Ano ang nangyayari sa total?');
      },
      options: [
        { id: 'settles', correct: true, text: L('It closes in on one value: the exact area.', 'Lumalapit ito sa iisang value: ang exact area.') },
        { id: 'grows', entry: 'area_more_rects_grows', text: L('It keeps growing without limit as rectangles are added.', 'Patuloy itong lumalaki nang walang hangganan habang dinadagdagan ang rectangle.') }
      ],
      ok: function (p) {
        var b = barsData(p), items = [], notes = [];
        b.totals.forEach(function (tot, i) {
          items.push({ t: 'rect', x: i + 0.7, w: 0.6, h: tot, c: 'alt', s: i < 2 ? 1 : i });
        });
        items.push({ t: 'hline', y: b.exact, c: 'ok', s: 4 });
        notes.push({ s: 1, c: 'alt', text: same('4 rectangles: ' + fmt(b.totals[0]) + ' km. 8 rectangles: ' + fmt(b.totals[1]) + ' km') });
        notes.push({ s: 2, c: 'alt', text: same('16 rectangles: ' + fmt(b.totals[2]) + ' km') });
        notes.push({ s: 3, c: 'alt', text: same('100 rectangles: ' + fmt(b.totals[3]) + ' km') });
        notes.push({ s: 4, c: 'ok', text: L('Exact area: ' + fmt(b.exact) + ' km', 'Exact area: ' + fmt(b.exact) + ' km') });
        return {
          scene: scene(b.view, items, notes),
          steps: [
            L('Each bar is one total. From 4 to 8 rectangles the total changes by ' + fmt(Math.abs(b.totals[1] - b.totals[0])) + ' km.', 'Bawat bar ay isang total. Mula 4 hanggang 8 rectangle, ' + fmt(Math.abs(b.totals[1] - b.totals[0])) + ' km ang pagbabago.'),
            L('From 8 to 16 it changes by only ' + fmt(Math.abs(b.totals[2] - b.totals[1])) + ' km.', 'Mula 8 hanggang 16, ' + fmt(Math.abs(b.totals[2] - b.totals[1])) + ' km na lang.'),
            L('84 more rectangles change it by just ' + fmt(Math.abs(b.totals[3] - b.totals[2])) + ' km.', 'Sa 84 pang rectangle, ' + fmt(Math.abs(b.totals[3] - b.totals[2])) + ' km lang ang pagbabago.'),
            L('The totals level off at the exact area. More rectangles only close the last small gap.', 'Pumapantay ang mga total sa exact area. Maliit na puwang na lang ang isinasara ng dagdag na rectangle.')
          ]
        };
      }
    },
    {
      id: 'a4', topic: 'area', type: 'choice', preset: { a: 120, T: 1, t1: 0.5, n: 4 }, need: needTime, hides: [],
      prompt: function () {
        return L('Speed is in km/h and time is in h. In what unit is the area under the speed curve?',
                 'Nasa km/h ang bilis at nasa h ang oras. Anong unit ang area sa ilalim ng speed curve?');
      },
      options: [
        { id: 'km', correct: true, text: L('km. It is a distance.', 'km. Layo ito.') },
        { id: 'kmh', entry: 'area_units', text: L('km/h. It is still a speed.', 'km/h. Bilis pa rin ito.') }
      ],
      ok: function (p) {
        var mid = p.T / 2, w = p.T / 10, h = v(p.a, p.T, mid);
        var items = sliceItems(p, 'ok', 1);
        items[0] = fnV(p, 'ok', 0);
        items.push({ t: 'area', a: p.a, T: p.T, from: 0, to: p.t1, c: 'ok', s: 3 });
        return {
          scene: scene(speedView(p), items, [
            { s: 2, c: 'ok', text: same(fmt(h) + ' km/h × ' + fmt(w) + ' h = ' + fmt(h * w) + ' km') },
            { s: 3, c: 'ok', text: L('Area from 0 to ' + fmt(p.t1) + ' h: ' + fmt(s(p.a, p.T, p.t1)) + ' km', 'Area mula 0 hanggang ' + fmt(p.t1) + ' h: ' + fmt(s(p.a, p.T, p.t1)) + ' km') }
          ]),
          steps: [
            L('Take one thin slice. Its height is a speed (km/h). Its width is a time (h).', 'Kumuha ng isang manipis na hiwa. Bilis (km/h) ang taas nito. Oras (h) ang lapad.'),
            L('Multiply: km/h × h. The hours cancel. What is left is km.', 'I-multiply: km/h × h. Nagka-cancel ang hours. km ang natira.'),
            L('Every slice is a small distance. Added together they are the distance travelled.', 'Bawat hiwa ay maliit na layo. Kapag pinagsama, iyon ang layong nilakbay.')
          ]
        };
      }
    }
  ];

  var QBY = {};
  QUESTIONS.forEach(function (q) { QBY[q.id] = q; });

  function finiteParams(p) {
    if (!p) { return false; }
    for (var k in p) { if (typeof p[k] === 'number' && !isFinite(p[k])) { return false; } }
    return true;
  }

  /* ---------- checking an answer ----------
   * status: 'invalid' | 'correct' | 'mistake' | 'neutral'
   * Correct is checked first, so a right answer is never called a mistake.
   * A number matching two entries, or none, is 'neutral': no diagnosis.
   */
  function evaluate(qid, p, raw) {
    var q = QBY[qid];
    if (!q || !finiteParams(p)) { return { status: 'invalid', reason: 'noQuestion' }; }
    var need = q.need ? q.need(p) : null;
    if (need) { return { status: 'invalid', reason: need }; }
    if (q.type === 'choice') {
      var opt = null;
      q.options.forEach(function (o) { if (o.id === raw) { opt = o; } });
      if (!opt) { return { status: 'invalid', reason: 'pick' }; }
      if (opt.correct) { return { status: 'correct', value: opt.id }; }
      return { status: 'mistake', entry: opt.entry, value: opt.id };
    }
    var parsed = parseAnswer(raw);
    if (!parsed.ok) { return { status: 'invalid', reason: parsed.reason }; }
    var correct = q.correct(p);
    if (typeof correct !== 'number' || !isFinite(correct)) { return { status: 'invalid', reason: 'noQuestion' }; }
    if (near(parsed.value, correct)) { return { status: 'correct', value: parsed.value, correct: correct }; }
    var hits = [];
    q.entries.forEach(function (id) {
      var w = CAT[id].value(p);
      if (w !== null && isFinite(w) && near(parsed.value, w)) { hits.push(id); }
    });
    if (hits.length === 1) { return { status: 'mistake', entry: hits[0], value: parsed.value, correct: correct }; }
    return { status: 'neutral', value: parsed.value, correct: correct, ambiguous: hits.length > 1 };
  }

  var CORRECT_CAPTION = L('Correct. Your picture and the right one match.', 'Tama. Tugma ang larawan mo sa tamang sagot.');

  function neutralCaption(res) {
    return L('Your answer: ' + fmt(res.value) + '. Correct answer: ' + fmt(res.correct) + '. Compare the two pictures.',
             'Sagot mo: ' + fmt(res.value) + '. Tamang sagot: ' + fmt(res.correct) + '. Ikumpara ang dalawang larawan.');
  }

  // Everything the comparison view needs: both pictures, the caption, the replay steps.
  function compare(qid, p, res) {
    var q = QBY[qid];
    if (!q || !res || res.status === 'invalid') { return null; }
    var okPart = q.ok(p), you, caption;
    if (res.status === 'correct') {
      you = q.ok(p).scene; caption = CORRECT_CAPTION;
    } else if (res.status === 'mistake') {
      you = CAT[res.entry].draw(p); caption = CAT[res.entry].caption(p);
    } else {
      you = q.neutral(p, res.value); caption = neutralCaption(res);
    }
    if (you.share) { okPart.scene.xr = you.xr; okPart.scene.yr = you.yr; }
    return { status: res.status, caption: caption, you: you, ok: okPart.scene, steps: [caption].concat(okPart.steps) };
  }

  /* ---------- the "try it" graphs above each question ---------- */

  function explore(topic, p) {
    var items, notes, view, y, c, rel;
    if (topic === 'slope') {
      view = slopeView(p); y = p.m * p.x + p.b;
      items = lineTri(view, p.m, p.b, p.x, 'ok', 0, 0);
      var run = triRun(p.m, p.b, p.x, view);
      if (run !== p.x) { items.push({ t: 'pt', x: p.x, y: y, c: 'ok' }); }
      notes = [
        { c: 'ok', text: same(eq(p.m, p.b)) },
        { text: p.plain ? L('At x = ' + fmt(p.x) + ', y = ' + fmt(y), 'Sa x = ' + fmt(p.x) + ', y = ' + fmt(y))
                        : L('A ' + fmt(p.x) + ' km ride costs ₱' + fmt(y), '₱' + fmt(y) + ' ang bayad sa ' + fmt(p.x) + ' km') },
        { text: L('Triangle: run ' + fmt(run) + ', rise ' + fmt(p.m * run), 'Triangle: run ' + fmt(run) + ', rise ' + fmt(p.m * run)) }
      ];
      return scene(view, items, notes);
    }
    if (topic === 'lines') {
      view = { xr: [0, 10], yr: [0, 80], xl: KM, yl: FARE };
      items = twoLines(p, 0);
      notes = [
        { c: 'A', text: same('A: ' + eq(p.m1, p.b1)) },
        { c: 'B', text: same('B: ' + eq(p.m2, p.b2)) }
      ];
      rel = relation(p.m1, p.b1, p.m2, p.b2);
      c = crossing(p.m1, p.b1, p.m2, p.b2);
      var loB = p.b1 < p.b2 ? 'A' : 'B', loM = p.m1 < p.m2 ? 'A' : 'B';
      if (rel === 'same') {
        notes.push({ key: 'cross', text: L('The two schemes are the same line: equal at every distance.', 'Iisang line ang dalawang scheme: pantay sa lahat ng layo.') });
      } else if (rel === 'parallel') {
        notes.push({ key: 'cross', text: L('Parallel lines: never equal. ' + loB + ' is always ₱' + fmt(Math.abs(p.b1 - p.b2)) + ' cheaper.', 'Parallel ang mga line: hindi kailanman pantay. Laging ₱' + fmt(Math.abs(p.b1 - p.b2)) + ' na mas mura ang ' + loB + '.') });
      } else if (c.x > TOL) {
        items.push({ t: 'vline', x: c.x, c: 'ok', key: 'cross' });
        items.push({ t: 'pt', x: c.x, y: c.y, c: 'ok', label: pair(c.x, c.y), key: 'cross' });
        notes.push({ key: 'cross', c: 'ok', text: L('Same cost at ' + fmt(c.x) + ' km: ₱' + fmt(c.y) + '.', 'Pareho ang bayad sa ' + fmt(c.x) + ' km: ₱' + fmt(c.y) + '.') });
        notes.push({ key: 'cross', text: L('Before that ' + loB + ' is cheaper. After it ' + loM + ' is cheaper.', 'Bago iyon, mas mura ang ' + loB + '. Pagkatapos, mas mura ang ' + loM + '.') });
      } else if (Math.abs(c.x) <= TOL) {
        items.push({ t: 'pt', x: 0, y: p.b1, c: 'ok', key: 'cross' });
        notes.push({ key: 'cross', text: L('Same cost only at the start (' + fmt(0) + ' km). After that ' + loM + ' is cheaper.', 'Pareho lang sa simula (' + fmt(0) + ' km). Pagkatapos, mas mura ang ' + loM + '.') });
      } else {
        notes.push({ key: 'cross', text: L('The lines would meet at ' + fmt(c.x) + ' km, which is not a real ride. ' + loM + ' is always cheaper.', 'Magtatagpo sana ang mga line sa ' + fmt(c.x) + ' km, na hindi totoong biyahe. Laging mas mura ang ' + loM + '.') });
      }
      return scene(view, items, notes);
    }
    if (topic === 'curve') {
      view = curveView(p, true); y = s(p.a, p.T, p.t0);
      var h = gap(p.T, p.t0, p.h), sec = secant(p.a, p.T, p.t0, h);
      items = [fnS(p, 'ok', 0)]
        .concat(secantItems(p, p.t0, h, 'alt', 0))
        .concat([tangentItem(p, p.t0, 'ok', 0, { w: 2 }), { t: 'pt', x: p.t0, y: y, c: 'ok', label: 't = ' + fmt(p.t0), below: true }]);
      notes = [
        { c: 'ok', text: same(sFormula(p)) },
        { text: L('At t = ' + fmt(p.t0) + ' h the jeepney has gone ' + fmt(y) + ' km', 'Sa t = ' + fmt(p.t0) + ' h, ' + fmt(y) + ' km na ang nilakbay ng jeep') },
        { c: 'alt', text: L('Gap h = ' + fmt(h) + ' h: slope between the two points = ' + fmt(sec) + ' km/h', 'Gap h = ' + fmt(h) + ' h: slope sa pagitan ng dalawang point = ' + fmt(sec) + ' km/h') },
        { key: 'tangent', c: 'ok', text: L('Slope of the tangent (the speed) = ' + fmt(v(p.a, p.T, p.t0)) + ' km/h', 'Slope ng tangent (ang bilis) = ' + fmt(v(p.a, p.T, p.t0)) + ' km/h') }
      ];
      return scene(view, items, notes);
    }
    if (topic === 'area') {
      view = speedView(p, true);
      var total = rectSum(p.a, p.T, p.n, p.t1), exact = s(p.a, p.T, p.t1);
      items = [
        { t: 'area', a: p.a, T: p.T, from: 0, to: p.t1, c: 'ok' },
        { t: 'rects', a: p.a, T: p.T, n: p.n, to: p.t1, c: 'alt' },
        fnV(p, 'ok', 0),
        { t: 'vline', x: p.t1, c: 'ok' }
      ];
      notes = [
        { c: 'ok', text: same(vFormula(p)) },
        { c: 'alt', text: L(p.n + ' rectangles from 0 to ' + fmt(p.t1) + ' h: total ' + fmt(total) + ' km', p.n + ' rectangles mula 0 hanggang ' + fmt(p.t1) + ' h: total ' + fmt(total) + ' km') },
        { key: 'exact', c: 'ok', text: L('Exact area (distance travelled): ' + fmt(exact) + ' km', 'Exact area (layong nilakbay): ' + fmt(exact) + ' km') },
        { key: 'exact', text: L('Exact minus rectangles: ' + fmt(exact - total) + ' km', 'Exact bawas rectangle: ' + fmt(exact - total) + ' km') }
      ];
      return scene(view, items, notes);
    }
    return null;
  }

  // The closing step: two graphs, one moment t.
  function link(p) {
    var y = s(p.a, p.T, p.t), sp = v(p.a, p.T, p.t);
    var top = scene(curveView(p, true), [
      fnS(p, 'ok', 0),
      { t: 'vbar', x: p.t, y: y, c: 'alt' },
      tangentItem(p, p.t, 'you', 0, { w: 3, dash: false }),
      { t: 'pt', x: p.t, y: y, c: 'ok' }
    ], [
      { c: 'you', text: L('Slope of the distance curve at t = ' + fmt(p.t) + ' (measured with a tiny gap): ' + fmt(slopeNumeric(p.a, p.T, p.t)) + ' km/h', 'Slope ng distance curve sa t = ' + fmt(p.t) + ' (sinukat gamit ang napakaliit na gap): ' + fmt(slopeNumeric(p.a, p.T, p.t)) + ' km/h') },
      { c: 'alt', text: L('Height of the distance curve: ' + fmt(y) + ' km', 'Taas ng distance curve: ' + fmt(y) + ' km') }
    ]);
    var bottom = scene(speedView(p, true), [
      { t: 'area', a: p.a, T: p.T, from: 0, to: p.t, c: 'alt' },
      fnV(p, 'ok', 0),
      { t: 'vbar', x: p.t, y: sp, c: 'you' },
      { t: 'pt', x: p.t, y: sp, c: 'ok' }
    ], [
      { c: 'you', text: L('Height of the speed curve: ' + fmt(sp) + ' km/h', 'Taas ng speed curve: ' + fmt(sp) + ' km/h') },
      { c: 'alt', text: L('Area under the speed curve from 0 to ' + fmt(p.t) + ' (added up from thin slices): ' + fmt(areaNumeric(p.a, p.T, p.t)) + ' km', 'Area sa ilalim ng speed curve mula 0 hanggang ' + fmt(p.t) + ' (pinagsamang maninipis na hiwa): ' + fmt(areaNumeric(p.a, p.T, p.t)) + ' km') }
    ]);
    return { top: top, bottom: bottom };
  }

  function wordCount(str) {
    return String(str).split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }).length;
  }

  return {
    TOL: TOL, near: near, fmt: fmt, pair: pair, eq: eq, parseAnswer: parseAnswer, niceCeil: niceCeil,
    line: line, slopeBetween: slopeBetween, triangle: triangle, crossing: crossing, relation: relation,
    s: s, v: v, secant: secant, gap: gap, rectSum: rectSum, exactArea: exactArea,
    slopeNumeric: slopeNumeric, areaNumeric: areaNumeric,
    RECT_COUNTS: RECT_COUNTS, RANGES: RANGES, DEFAULTS: DEFAULTS,
    CATALOG: CATALOG, QUESTIONS: QUESTIONS, entry: function (id) { return CAT[id]; }, question: function (id) { return QBY[id]; },
    evaluate: evaluate, compare: compare, explore: explore, link: link,
    CORRECT_CAPTION: CORRECT_CAPTION, neutralCaption: neutralCaption, wordCount: wordCount, bShift: bShift
  };
});
