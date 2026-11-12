/* Residual interface: sliders, questions, comparison, replay, language, keyboard.
 * All numbers come from js/math.js, computed from the current slider values.
 */
(function (root) {
  'use strict';
  var M = root.ResidualMath, D = root.ResidualDraw;
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }
  function L(en, tl) { return { en: en, tl: tl }; }

  var errors = [];
  root.addEventListener('error', function (e) { errors.push(String(e.message || e.error || 'error')); });
  root.addEventListener('unhandledrejection', function (e) { errors.push('rejection: ' + String(e.reason)); });

  var TOPICS = ['slope', 'lines', 'curve', 'area', 'link'];

  var UI = {
    tagline: L('See the gap between your answer and the right one.', 'Tingnan ang agwat ng sagot mo sa tamang sagot.'),
    lang: L('Taglish', 'English'),
    langLabel: L('Switch language to Taglish', 'Palitan ang wika sa English'),
    tab: {
      slope: L('1 Slope', '1 Slope'), lines: L('2 Two lines', '2 Dalawang line'),
      curve: L('3 Curve slope', '3 Slope ng curve'), area: L('4 Area', '4 Area'), link: L('5 Connect', '5 Pagdugtungin')
    },
    title: {
      slope: L('1. Slope: the fare added per km', '1. Slope: dagdag na pamasahe kada km'),
      lines: L('2. Two lines meeting: two fare schemes', '2. Dalawang line na nagtatagpo: dalawang fare scheme'),
      curve: L('3. Slope of a curve: speed', '3. Slope ng curve: bilis'),
      area: L('4. Area under a curve: distance', '4. Area sa ilalim ng curve: layo'),
      link: L('5. Connect: one trip, two graphs', '5. Pagdugtungin: isang biyahe, dalawang graph')
    },
    story: {
      slope: L('A jeepney fare starts at a base fare b, then adds m for every km: y = mx + b. Move the sliders and watch the line, then predict the answer to the question below.',
               'Nagsisimula ang pamasahe sa jeep sa base fare na b, tapos dagdag na m kada km: y = mx + b. Galawin ang mga slider at panoorin ang line, tapos hulaan ang sagot sa tanong sa ibaba.'),
      slopePlain: L('Plain graph: the same line y = mx + b with no story. Here m can be negative or a fraction.',
                    'Plain graph: ang parehong line na y = mx + b, walang kuwento. Dito, puwedeng negative o fraction ang m.'),
      lines: L('Two fare schemes, A and B, each with its own base fare and its own added fare per km. Where do they cost the same?',
               'Dalawang fare scheme, A at B, may kanya-kanyang base fare at dagdag kada km. Saan pareho ang bayad?'),
      curve: L('One jeepney trip from one stop to the next. The curve is the distance travelled as time passes. How steep it is at a moment is the speed at that moment.',
               'Isang biyahe ng jeep mula isang hintuan hanggang sa susunod. Ang curve ay ang layong nilakbay habang lumilipas ang oras. Ang tarik nito sa isang sandali ang bilis sa sandaling iyon.'),
      area: L('The same trip as topic 3, now drawn as speed against time. The area under the curve is the distance travelled.',
              'Ang parehong biyahe sa topic 3, pero bilis laban sa oras. Ang area sa ilalim ng curve ang layong nilakbay.'),
      link: L('The same trip on both graphs, at the same moment t. Slide t and compare the numbers.',
              'Ang parehong biyahe sa dalawang graph, sa parehong sandali na t. I-slide ang t at ikumpara ang mga numero.')
    },
    example: L('All fares, speeds and distances here are made-up examples, not real figures.',
               'Lahat ng pamasahe, bilis at layo rito ay gawa-gawang halimbawa, hindi totoong datos.'),
    scope: L('Residual only checks the built-in questions on these four topics. It does not understand other questions, and it only names a mix-up when your answer matches one from its list.',
             'Ang Residual ay para lang sa mga nakahandang tanong sa apat na topic na ito. Hindi nito naiintindihan ang ibang tanong, at tinutukoy lang nito ang pagkakamali kapag tugma ang sagot mo sa isa sa listahan nito.'),
    askTitle: L('Predict first', 'Hulaan muna'),
    q: L('Question', 'Tanong'),
    answer: L('Your answer (a number)', 'Sagot mo (numero)'),
    check: L('Check my answer', 'I-check ang sagot ko'),
    reset: L('Reset sliders for this question', 'I-reset ang mga slider para sa tanong na ito'),
    you: L('Your answer', 'Sagot mo'),
    ok: L('Correct', 'Tama'),
    back: L('◀ Back', '◀ Balik'), next: L('Next ▶', 'Sunod ▶'),
    play: L('▶ Play steps', '▶ I-play'), pause: L('❚❚ Pause', '❚❚ Pause'),
    speed: L('Speed', 'Bilis'),
    speedOpt: { '0.5': L('Slow', 'Mabagal'), '1': L('Normal', 'Normal'), '2': L('Fast', 'Mabilis') },
    step: L('Step', 'Hakbang'), of: L('of', 'sa'),
    keys: L('Keys: N next, B back, P play or pause. Arrow keys move a slider.', 'Keys: N sunod, B balik, P play o pause. Arrow keys para sa slider.'),
    hidden: L('Hidden until you check an answer.', 'Nakatago hanggang mag-check ka ng sagot.'),
    plain: L('Plain graph (m can be negative or a fraction)', 'Plain graph (puwedeng negative o fraction ang m)'),
    rects: L('Number of rectangles', 'Bilang ng rectangle'),
    demo: {
      curve: L('▶ Shrink the gap h', '▶ Paliitin ang gap h'),
      area: L('▶ Sweep, then add rectangles', '▶ I-sweep, tapos dagdagan ang rectangle'),
      link: L('▶ Move t along the trip', '▶ Igalaw ang t sa biyahe')
    },
    stop: L('❚❚ Stop', '❚❚ Itigil'),
    hint: {
      m: L('fare added per km (₱)', 'dagdag kada km (₱)'), b: L('base fare (₱)', 'base fare (₱)'),
      x: L('ride distance (km)', 'layo ng biyahe (km)'),
      mPlain: L('number beside x', 'numerong katabi ng x'), bPlain: L('number added at the end', 'numerong idinadagdag sa dulo'), xPlain: L('point on the line', 'point sa line'),
      m1: L('Scheme A: added per km', 'Scheme A: dagdag kada km'), b1: L('Scheme A: base fare', 'Scheme A: base fare'),
      m2: L('Scheme B: added per km', 'Scheme B: dagdag kada km'), b2: L('Scheme B: base fare', 'Scheme B: base fare'),
      a: L('how hard the jeepney speeds up', 'lakas ng arangkada ng jeep'), T: L('length of the trip (h)', 'tagal ng biyahe (h)'),
      t0: L('the moment we look at (h)', 'ang sandaling tinitingnan (h)'), h: L('gap to the second point (h)', 'gap papunta sa pangalawang point (h)'),
      t1: L('sweep up to this time (h)', 'i-sweep hanggang sa oras na ito (h)'), t: L('the moment (h)', 'ang sandali (h)')
    },
    need: {
      needCross: L('This question needs two lines that cross after 0 km. Move the sliders, or press the reset button.', 'Kailangan sa tanong na ito ng dalawang line na nagtatagpo lampas 0 km. Galawin ang mga slider, o pindutin ang reset.'),
      needParallel: L('This question needs the same m on both lines and different b. Move the sliders, or press the reset button.', 'Kailangan sa tanong na ito ng parehong m sa dalawang line at magkaibang b. Galawin ang mga slider, o pindutin ang reset.'),
      needNegative: L('This question needs the plain graph with m below 0. Move the sliders, or press the reset button.', 'Kailangan sa tanong na ito ng plain graph na may m na mas mababa sa 0. Galawin ang mga slider, o pindutin ang reset.'),
      needTime: L('This question needs a sweep time above 0. Move the slider, or press the reset button.', 'Kailangan sa tanong na ito ng sweep time na higit sa 0. Galawin ang slider, o pindutin ang reset.'),
      noQuestion: L('This question cannot be checked with these slider values. Press the reset button.', 'Hindi ma-check ang tanong na ito sa mga slider value na ito. Pindutin ang reset.')
    },
    bad: {
      empty: L('Type a number first.', 'Mag-type muna ng numero.'),
      notNumber: L('Please type one number, like 3 or 2.5 or 1/3.', 'Isang numero lang ang i-type, tulad ng 3 o 2.5 o 1/3.'),
      comma: L('Use a dot for decimals, like 2.5.', 'Gumamit ng tuldok sa decimal, tulad ng 2.5.'),
      divZero: L('A fraction cannot have 0 at the bottom.', 'Hindi puwedeng 0 ang nasa ilalim ng fraction.'),
      tooBig: L('That number is too large for this graph.', 'Masyadong malaki ang numerong iyan para sa graph na ito.'),
      pick: L('Choose one option first.', 'Pumili muna ng isang sagot.')
    },
    linkSlope: L('Slope of the distance curve = height of the speed curve', 'Slope ng distance curve = taas ng speed curve'),
    linkArea: L('Area under the speed curve = height of the distance curve', 'Area sa ilalim ng speed curve = taas ng distance curve'),
    linkEnd: L('So speed is the slope of distance, and distance is the area under speed.', 'Kaya ang bilis ay slope ng layo, at ang layo ay area sa ilalim ng bilis.'),
    graphAlt: L('Graph. The numbers are listed below it.', 'Graph. Nakalista sa ibaba ang mga numero.')
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = {
    lang: 'en',
    topic: 'slope',
    p: {
      slope: clone(M.DEFAULTS.slope),
      lines: clone(M.DEFAULTS.lines),
      trip: { a: M.DEFAULTS.curve.a, T: M.DEFAULTS.curve.T },
      curve: { t0: M.DEFAULTS.curve.t0, h: M.DEFAULTS.curve.h },
      area: { t1: M.DEFAULTS.area.t1, n: M.DEFAULTS.area.n },
      link: { t: M.DEFAULTS.link.t }
    },
    q: { slope: 's1', lines: 'l1', curve: 'c1', area: 'a1' },
    ans: {},
    result: null,     // { qid, res, cmp, k, prog, playing, anim, hold }
    speed: 1,
    demo: null,       // { topic, phase, clock }
    msg: null
  };

  function tx(t) { return D.pick(t, state.lang); }
  function snap(v) { return Math.round(v * 1e6) / 1e6; }

  function P(topic) {
    var s = state.p;
    if (topic === 'slope') { return s.slope; }
    if (topic === 'lines') { return s.lines; }
    if (topic === 'curve') { return { a: s.trip.a, T: s.trip.T, t0: s.curve.t0, h: s.curve.h }; }
    if (topic === 'area') { return { a: s.trip.a, T: s.trip.T, t1: s.area.t1, n: s.area.n }; }
    return { a: s.trip.a, T: s.trip.T, t: s.link.t };
  }

  function applyPreset(topic, pre) {
    var s = state.p;
    if (topic === 'slope') { s.slope = clone(pre); }
    else if (topic === 'lines') { s.lines = clone(pre); }
    else {
      s.trip.a = pre.a; s.trip.T = pre.T;
      if (topic === 'curve') { s.curve.t0 = pre.t0; s.curve.h = pre.h; }
      if (topic === 'area') { s.area.t1 = pre.t1; s.area.n = pre.n; }
      if (topic === 'link') { s.link.t = pre.t; }
    }
    clampTimes();
  }

  function clampTimes() {
    var s = state.p, T = s.trip.T;
    s.curve.t0 = Math.max(0, Math.min(s.curve.t0, T));
    s.area.t1 = Math.max(0, Math.min(s.area.t1, T));
    s.link.t = Math.max(0, Math.min(s.link.t, T));
  }

  function clampSlope() {
    var s = state.p.slope, r = s.plain ? M.RANGES.slope.plain : M.RANGES.slope.story;
    ['m', 'b'].forEach(function (k) {
      var lo = r[k][0], hi = r[k][1], st = r[k][2];
      s[k] = snap(Math.max(lo, Math.min(hi, Math.round(s[k] / st) * st)));
    });
  }

  /* ---------- sliders ---------- */

  function sliderDefs(topic) {
    var R = M.RANGES, s = state.p, T = s.trip.T, ts = R.tStep;
    if (topic === 'slope') {
      var r = s.slope.plain ? R.slope.plain : R.slope.story, pl = s.slope.plain;
      return [
        { obj: 'slope', key: 'm', name: 'm', hint: pl ? UI.hint.mPlain : UI.hint.m, range: r.m },
        { obj: 'slope', key: 'b', name: 'b', hint: pl ? UI.hint.bPlain : UI.hint.b, range: r.b },
        { obj: 'slope', key: 'x', name: 'x', hint: pl ? UI.hint.xPlain : UI.hint.x, range: R.slope.x }
      ];
    }
    if (topic === 'lines') {
      return [
        { obj: 'lines', key: 'm1', name: 'm (A)', hint: UI.hint.m1, range: R.lines.m },
        { obj: 'lines', key: 'b1', name: 'b (A)', hint: UI.hint.b1, range: R.lines.b },
        { obj: 'lines', key: 'm2', name: 'm (B)', hint: UI.hint.m2, range: R.lines.m },
        { obj: 'lines', key: 'b2', name: 'b (B)', hint: UI.hint.b2, range: R.lines.b }
      ];
    }
    var trip = [
      { obj: 'trip', key: 'a', name: 'a', hint: UI.hint.a, range: R.trip.a },
      { obj: 'trip', key: 'T', name: 'T', hint: UI.hint.T, range: R.trip.T }
    ];
    if (topic === 'curve') {
      return trip.concat([
        { obj: 'curve', key: 't0', name: 't', hint: UI.hint.t0, range: [0, T, ts] },
        { obj: 'curve', key: 'h', name: 'h', hint: UI.hint.h, range: R.h }
      ]);
    }
    if (topic === 'area') {
      return trip.concat([{ obj: 'area', key: 't1', name: 't', hint: UI.hint.t1, range: [0, T, ts] }]);
    }
    return trip.concat([{ obj: 'link', key: 't', name: 't', hint: UI.hint.t, range: [0, T, ts] }]);
  }

  var sliderEls = [];

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  function buildSliders() {
    var box = $('sliders');
    box.textContent = '';
    sliderEls = [];
    sliderDefs(state.topic).forEach(function (d) {
      var wrap = el('div', 'slider');
      var id = 'sl-' + d.key;
      var label = el('label'); label.htmlFor = id;
      var name = el('span', 'sl-name'), val = el('span', 'sl-val'), hint = el('span', 'sl-hint');
      label.appendChild(name); label.appendChild(doc.createTextNode(' = ')); label.appendChild(val);
      label.appendChild(doc.createTextNode('  ')); label.appendChild(hint);
      var row = el('div', 'sl-row');
      var minus = el('button', 'btn step', '−'); minus.type = 'button';
      var input = el('input'); input.type = 'range'; input.id = id;
      var plus = el('button', 'btn step', '+'); plus.type = 'button';
      row.appendChild(minus); row.appendChild(input); row.appendChild(plus);
      wrap.appendChild(label); wrap.appendChild(row);
      box.appendChild(wrap);
      var rec = { key: d.key, obj: d.obj, input: input, name: name, val: val, hint: hint, minus: minus, plus: plus };
      sliderEls.push(rec);
      input.addEventListener('input', function () { setParam(rec.obj, rec.key, Number(input.value)); });
      minus.addEventListener('click', function () { nudge(rec, -1); });
      plus.addEventListener('click', function () { nudge(rec, 1); });
    });
  }

  function defFor(rec) {
    var defs = sliderDefs(state.topic);
    for (var i = 0; i < defs.length; i++) { if (defs[i].key === rec.key) { return defs[i]; } }
    return null;
  }

  function nudge(rec, dir) {
    var d = defFor(rec);
    if (!d) { return; }
    var cur = state.p[rec.obj][rec.key];
    var v = Math.max(d.range[0], Math.min(d.range[1], cur + dir * d.range[2]));
    setParam(rec.obj, rec.key, v);
  }

  function setParam(obj, key, value) {
    if (typeof value !== 'number' || !isFinite(value)) { return; }
    stopDemo();
    state.p[obj][key] = snap(value);
    if (obj === 'trip') { clampTimes(); }
    paramsChanged();
  }

  function paramsChanged() {
    state.result = null;
    state.msg = null;
    update();
  }

  /* ---------- questions ---------- */

  function topicQuestions(topic) {
    return M.QUESTIONS.filter(function (q) { return q.topic === topic; });
  }
  function currentQ() {
    return state.topic === 'link' ? null : M.question(state.q[state.topic]);
  }

  var qButtons = [], optionEls = [], answerInput = null, extraEls = {};

  function buildTopic() {
    buildSliders();
    var tabs = $('qtabs');
    tabs.textContent = '';
    qButtons = [];
    topicQuestions(state.topic).forEach(function (q, i) {
      var b = el('button', 'btn qtab'); b.type = 'button';
      b.addEventListener('click', function () { selectQuestion(q.id); });
      tabs.appendChild(b);
      qButtons.push({ id: q.id, el: b, n: i + 1 });
    });

    var ex = $('extras');
    ex.textContent = '';
    extraEls = {};
    if (state.topic === 'slope') {
      var lab = el('label', 'check');
      var cb = el('input'); cb.type = 'checkbox'; cb.id = 'plain';
      var sp = el('span');
      lab.appendChild(cb); lab.appendChild(sp); ex.appendChild(lab);
      extraEls.plain = cb; extraEls.plainText = sp;
      cb.addEventListener('change', function () {
        state.p.slope.plain = cb.checked;
        clampSlope();
        paramsChanged();
      });
    }
    if (state.topic === 'area') {
      var gl = el('p', 'group-label'); ex.appendChild(gl);
      extraEls.rectLabel = gl; extraEls.rects = [];
      M.RECT_COUNTS.forEach(function (n) {
        var b = el('button', 'btn rect-n', String(n)); b.type = 'button';
        b.addEventListener('click', function () { stopDemo(); state.p.area.n = n; paramsChanged(); });
        ex.appendChild(b);
        extraEls.rects.push({ n: n, el: b });
      });
    }
    if (state.topic === 'curve' || state.topic === 'area' || state.topic === 'link') {
      var db = el('button', 'btn demo'); db.type = 'button'; db.id = 'demo';
      db.addEventListener('click', toggleDemo);
      ex.appendChild(db);
      extraEls.demo = db;
    }
    buildQuestion();
  }

  function buildQuestion() {
    var area = $('answer-area');
    area.textContent = '';
    optionEls = []; answerInput = null;
    var q = currentQ();
    if (!q) { return; }
    if (q.type === 'numeric') {
      var lab = el('label', 'num'); lab.htmlFor = 'answer';
      var span = el('span');
      var inp = el('input'); inp.type = 'text'; inp.id = 'answer'; inp.autocomplete = 'off';
      inp.setAttribute('inputmode', 'text'); inp.setAttribute('autocapitalize', 'off'); inp.spellcheck = false;
      inp.value = state.ans[q.id] || '';
      inp.addEventListener('input', function () { state.ans[q.id] = inp.value; });
      lab.appendChild(span); lab.appendChild(inp); area.appendChild(lab);
      answerInput = { input: inp, label: span };
    } else {
      q.options.forEach(function (o) {
        var lab = el('label', 'opt');
        var r = el('input'); r.type = 'radio'; r.name = 'opt'; r.value = o.id;
        r.checked = state.ans[q.id] === o.id;
        r.addEventListener('change', function () { if (r.checked) { state.ans[q.id] = o.id; } });
        var span = el('span');
        lab.appendChild(r); lab.appendChild(span); area.appendChild(lab);
        optionEls.push({ opt: o, input: r, text: span });
      });
    }
  }

  function selectQuestion(id) {
    var q = M.question(id);
    if (!q || q.topic !== state.topic) { return; }
    stopDemo();
    state.q[state.topic] = id;
    state.result = null; state.msg = null;
    if (q.need && q.need(P(state.topic))) { applyPreset(state.topic, q.preset); }
    buildQuestion();
    update();
  }

  function resetSliders() {
    var q = currentQ();
    stopDemo();
    if (q) { applyPreset(state.topic, q.preset); }
    else { applyPreset('link', M.DEFAULTS.link); }
    paramsChanged();
  }

  function setTopic(topic) {
    if (TOPICS.indexOf(topic) < 0) { return; }
    stopDemo();
    state.topic = topic;
    state.result = null; state.msg = null;
    buildTopic();
    update();
    // redraw when a canvas changes width for any other reason (scrollbar, rotation)
    if (root.ResizeObserver) {
      var widths = {}, pending = false;
      var ro = new root.ResizeObserver(function () {
        var changed = false;
        ['cv-main', 'cv-second', 'cv-you', 'cv-ok'].forEach(function (id) {
          var w = $(id).clientWidth;
          if (w && widths[id] !== w) { widths[id] = w; changed = true; }
        });
        if (changed && !pending) {
          pending = true;
          root.requestAnimationFrame(function () { pending = false; update(); });
        }
      });
      ['cv-main', 'cv-second', 'cv-you', 'cv-ok'].forEach(function (id) { ro.observe($(id)); });
    }
  }

  function check() {
    var q = currentQ();
    if (!q) { return; }
    stopDemo();
    var raw = state.ans[q.id];
    if (q.type === 'numeric' && answerInput) { raw = answerInput.input.value; state.ans[q.id] = raw; }
    var p = clone(P(state.topic));
    var res = M.evaluate(q.id, p, raw === undefined ? '' : raw);
    if (res.status === 'invalid') {
      state.result = null;
      state.msg = UI.bad[res.reason] || UI.need[res.reason] || UI.bad.notNumber;
      update();
      return;
    }
    var cmp = M.compare(q.id, p, res);
    state.msg = null;
    state.result = { qid: q.id, res: res, cmp: cmp, k: cmp.steps.length - 1, prog: 1, playing: false, anim: false, hold: 0 };
    update();
    var cap = $('caption');
    try { cap.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    if (cap.scrollIntoView && root.innerWidth < 1000) { cap.scrollIntoView({ block: 'start' }); }
  }

  /* ---------- replay ---------- */

  function lastStep() { return state.result ? state.result.cmp.steps.length - 1 : 0; }

  function replayNext() {
    var r = state.result; if (!r) { return; }
    r.playing = false;
    if (r.k < lastStep()) { r.k += 1; r.prog = 0; r.anim = true; kick(); }
    else { r.prog = 1; r.anim = false; }
    update();
  }
  function replayBack() {
    var r = state.result; if (!r) { return; }
    r.playing = false; r.anim = false;
    if (r.k > 0) { r.k -= 1; }
    r.prog = 1;
    update();
  }
  function replayPlay() {
    var r = state.result; if (!r) { return; }
    if (r.k >= lastStep() && r.prog >= 1) { r.k = 0; r.prog = 0; }
    r.playing = true; r.anim = true; r.hold = 0;
    kick();
    update();
  }
  function replayPause() {
    var r = state.result; if (!r) { return; }
    r.playing = false; r.anim = false;
    update();
  }

  /* ---------- the animated demos on the graphs ---------- */

  function stopDemo() { state.demo = null; }

  function toggleDemo() {
    if (state.demo) { state.demo = null; update(); return; }
    state.result = null; state.msg = null;
    state.demo = { topic: state.topic, phase: 0, clock: 0 };
    kick();
    update();
  }

  function demoFrame(dt) {
    var d = state.demo, s = state.p, T = s.trip.T, R = M.RANGES;
    if (!d || d.topic !== state.topic) { state.demo = null; return; }
    d.clock += dt * state.speed;
    var f;
    if (d.topic === 'curve') {
      f = Math.min(1, d.clock / 4000);
      var hv = R.h[1] + (R.h[0] - R.h[1]) * f;
      s.curve.h = snap(Math.max(R.h[0], Math.round(hv / R.h[2]) * R.h[2]));
      if (f >= 1) { state.demo = null; }
    } else if (d.topic === 'area') {
      if (d.phase === 0) {
        f = Math.min(1, d.clock / 3000);
        s.area.t1 = snap(Math.min(T, Math.round(T * f / R.tStep) * R.tStep));
        if (f >= 1) { s.area.t1 = T; d.phase = 1; d.clock = 0; }
      } else {
        var idx = Math.min(M.RECT_COUNTS.length - 1, Math.floor(d.clock / 1300));
        s.area.n = M.RECT_COUNTS[idx];
        if (d.clock >= 1300 * M.RECT_COUNTS.length) { state.demo = null; }
      }
    } else {
      f = Math.min(1, d.clock / 4000);
      s.link.t = snap(Math.min(T, Math.round(T * f / R.tStep) * R.tStep));
      if (f >= 1) { s.link.t = T; state.demo = null; }
    }
  }

  /* ---------- animation loop ---------- */

  var running = false, lastTs = 0;

  function kick() {
    if (running) { return; }
    running = true; lastTs = 0;
    root.requestAnimationFrame(tick);
  }

  function tick(ts) {
    var dt = lastTs ? Math.min(100, ts - lastTs) : 16;
    lastTs = ts;
    var r = state.result, busy = false;
    if (state.demo) { demoFrame(dt); busy = !!state.demo; update(); }
    if (r && r.anim) {
      busy = true;
      if (r.prog < 1) {
        r.prog = Math.min(1, r.prog + dt * state.speed / 1100);
      } else if (r.playing) {
        r.hold += dt * state.speed;
        if (r.hold >= 1500) {
          r.hold = 0;
          if (r.k < lastStep()) { r.k += 1; r.prog = 0; }
          else { r.playing = false; r.anim = false; }
        }
      } else {
        r.anim = false;
      }
      update();
    }
    if (busy) { root.requestAnimationFrame(tick); } else { running = false; }
  }

  /* ---------- render ---------- */

  function fillNotes(ul, sc, step, hide) {
    ul.textContent = '';
    var hiddenShown = false;
    (sc.notes || []).forEach(function (n) {
      if ((n.s || 0) > step) { return; }
      if (n.key && hide && hide[n.key]) {
        if (!hiddenShown) { ul.appendChild(el('li', 'hidden-note', tx(UI.hidden))); hiddenShown = true; }
        return;
      }
      ul.appendChild(el('li', n.c ? 'c-' + n.c : '', tx(n.text)));
    });
  }

  function update() {
    var lang = state.lang, topic = state.topic, q = currentQ(), p = P(topic);
    doc.documentElement.lang = lang === 'tl' ? 'tl' : 'en';

    $('tagline').textContent = tx(UI.tagline);
    $('lang').textContent = tx(UI.lang);
    $('lang').setAttribute('aria-label', tx(UI.langLabel));
    topicButtons.forEach(function (tb) {
      tb.el.textContent = tx(UI.tab[tb.topic]);
      if (tb.topic === topic) { tb.el.setAttribute('aria-current', 'true'); } else { tb.el.removeAttribute('aria-current'); }
    });
    $('topic-title').textContent = tx(UI.title[topic]);
    $('topic-story').textContent = tx(topic === 'slope' && p.plain ? UI.story.slopePlain : UI.story[topic]);
    $('example-note').textContent = tx(UI.example);
    $('scope').textContent = tx(UI.scope);

    /* sliders */
    var defs = sliderDefs(topic);
    sliderEls.forEach(function (rec, i) {
      var d = defs[i];
      if (!d) { return; }
      var v = state.p[rec.obj][rec.key];
      rec.input.min = String(d.range[0]); rec.input.max = String(d.range[1]); rec.input.step = String(d.range[2]);
      if (Number(rec.input.value) !== v) { rec.input.value = String(v); }
      rec.name.textContent = d.name;
      rec.val.textContent = M.fmt(v);
      rec.hint.textContent = tx(d.hint);
      rec.input.setAttribute('aria-valuetext', M.fmt(v));
      rec.minus.setAttribute('aria-label', d.name + ' −');
      rec.plus.setAttribute('aria-label', d.name + ' +');
    });
    if (extraEls.plain) { extraEls.plain.checked = !!state.p.slope.plain; extraEls.plainText.textContent = tx(UI.plain); }
    if (extraEls.rects) {
      extraEls.rectLabel.textContent = tx(UI.rects);
      extraEls.rects.forEach(function (rb) { rb.el.setAttribute('aria-pressed', rb.n === state.p.area.n ? 'true' : 'false'); });
    }
    if (extraEls.demo) { extraEls.demo.textContent = tx(state.demo ? UI.stop : UI.demo[topic]); }

    /* graphs */
    var answered = !!(state.result && q && state.result.qid === q.id);
    var hide = {};
    if (q && !answered) { (q.hides || []).forEach(function (k) { hide[k] = true; }); }
    var second = $('fig-second'), summary = $('link-summary');
    // layout first, so the canvases are measured at their final width
    $('question-col').hidden = topic === 'link';
    $('explore').parentNode.className = topic === 'link' ? 'single' : '';
    $('compare').hidden = !answered;
    if (topic === 'link') {
      var lk = M.link(p);
      second.hidden = false; summary.hidden = false;
      $('graphs').className = 'two';
      D.draw($('cv-main'), lk.top, { lang: lang });
      fillNotes($('notes-main'), lk.top, 1e9);
      D.draw($('cv-second'), lk.bottom, { lang: lang });
      fillNotes($('notes-second'), lk.bottom, 1e9);
      summary.textContent = '';
      [
        tx(UI.linkSlope) + ': ' + M.fmt(M.slopeNumeric(p.a, p.T, p.t)) + ' km/h = ' + M.fmt(M.v(p.a, p.T, p.t)) + ' km/h.',
        tx(UI.linkArea) + ': ' + M.fmt(M.areaNumeric(p.a, p.T, p.t)) + ' km = ' + M.fmt(M.s(p.a, p.T, p.t)) + ' km.',
        tx(UI.linkEnd)
      ].forEach(function (line) { summary.appendChild(el('span', '', line)); summary.appendChild(el('br')); });
    } else {
      var sc = M.explore(topic, p);
      second.hidden = true; summary.hidden = true;
      $('graphs').className = '';
      D.draw($('cv-main'), sc, { lang: lang, hide: hide });
      fillNotes($('notes-main'), sc, 1e9, hide);
    }
    $('cv-main').setAttribute('aria-label', tx(UI.graphAlt));
    $('cv-second').setAttribute('aria-label', tx(UI.graphAlt));

    /* question */
    if (q) {
      $('ask-title').textContent = tx(UI.askTitle);
      qButtons.forEach(function (qb) {
        qb.el.textContent = tx(UI.q) + ' ' + qb.n;
        qb.el.setAttribute('aria-pressed', qb.id === q.id ? 'true' : 'false');
      });
      var need = q.need ? q.need(p) : null;
      $('prompt').hidden = !!need;
      $('answer-form').hidden = !!need;
      if (!need) { $('prompt').textContent = tx(q.prompt(p)); }
      if (answerInput) { answerInput.label.textContent = tx(UI.answer); }
      optionEls.forEach(function (o) { o.text.textContent = tx(o.opt.text); });
      $('check').textContent = tx(UI.check);
      $('reset').textContent = tx(UI.reset);
      $('msg').textContent = need ? tx(UI.need[need]) : (state.msg ? tx(state.msg) : '');
    }

    /* comparison */
    var card = $('compare'), r = state.result;
    card.hidden = !answered;
    if (answered) {
      card.setAttribute('data-status', r.res.status);
      $('caption').textContent = tx(r.cmp.caption);
      $('cap-you').textContent = tx(UI.you);
      $('cap-ok').textContent = tx(UI.ok);
      var o = { lang: lang, step: r.k, prog: r.prog };
      D.draw($('cv-you'), r.cmp.you, o);
      D.draw($('cv-ok'), r.cmp.ok, o);
      $('cv-you').setAttribute('aria-label', tx(UI.you) + '. ' + tx(UI.graphAlt));
      $('cv-ok').setAttribute('aria-label', tx(UI.ok) + '. ' + tx(UI.graphAlt));
      fillNotes($('notes-you'), r.cmp.you, r.k);
      fillNotes($('notes-ok'), r.cmp.ok, r.k);
      $('step-count').textContent = tx(UI.step) + ' ' + (r.k + 1) + ' ' + tx(UI.of) + ' ' + r.cmp.steps.length;
      $('step-text').textContent = tx(r.cmp.steps[r.k]);
      $('back').textContent = tx(UI.back); $('next').textContent = tx(UI.next);
      $('play').textContent = tx(UI.play); $('pause').textContent = tx(UI.pause);
      $('back').disabled = r.k <= 0;
      $('next').disabled = r.k >= lastStep();
      $('play').disabled = r.playing;
      $('pause').disabled = !r.playing;
      $('speed-label').textContent = tx(UI.speed);
      var sel = $('speed');
      for (var i = 0; i < sel.options.length; i++) { sel.options[i].textContent = tx(UI.speedOpt[sel.options[i].value]); }
      $('keys').textContent = tx(UI.keys);
    }
  }

  /* ---------- wiring ---------- */

  var topicButtons = [];

  function init() {
    var nav = $('topics');
    TOPICS.forEach(function (t) {
      var b = el('button', 'btn topic'); b.type = 'button';
      b.setAttribute('data-topic', t);
      b.addEventListener('click', function () { setTopic(t); });
      nav.appendChild(b);
      topicButtons.push({ topic: t, el: b });
    });
    $('lang').addEventListener('click', function () { state.lang = state.lang === 'en' ? 'tl' : 'en'; update(); });
    $('answer-form').addEventListener('submit', function (e) { e.preventDefault(); check(); });
    $('reset').addEventListener('click', resetSliders);
    $('back').addEventListener('click', replayBack);
    $('next').addEventListener('click', replayNext);
    $('play').addEventListener('click', replayPlay);
    $('pause').addEventListener('click', replayPause);
    $('speed').addEventListener('change', function () {
      var v = Number($('speed').value);
      state.speed = (v === 0.5 || v === 2) ? v : 1;
    });
    doc.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) { return; }
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { return; }
      if (!state.result) { return; }
      var k = (e.key || '').toLowerCase();
      if (k === 'n') { replayNext(); }
      else if (k === 'b') { replayBack(); }
      else if (k === 'p') { if (state.result.playing) { replayPause(); } else { replayPlay(); } }
    });
    var resizeTimer = null;
    root.addEventListener('resize', function () {
      if (resizeTimer) { root.clearTimeout(resizeTimer); }
      resizeTimer = root.setTimeout(update, 60);
    });
    buildTopic();
    update();
    // redraw when a canvas changes width for any other reason (scrollbar, rotation)
    if (root.ResizeObserver) {
      var widths = {}, pending = false;
      var ro = new root.ResizeObserver(function () {
        var changed = false;
        ['cv-main', 'cv-second', 'cv-you', 'cv-ok'].forEach(function (id) {
          var w = $(id).clientWidth;
          if (w && widths[id] !== w) { widths[id] = w; changed = true; }
        });
        if (changed && !pending) {
          pending = true;
          root.requestAnimationFrame(function () { pending = false; update(); });
        }
      });
      ['cv-main', 'cv-second', 'cv-you', 'cv-ok'].forEach(function (id) { ro.observe($(id)); });
    }
  }

  root.Residual = { state: state, errors: errors, update: update, setTopic: setTopic, TOPICS: TOPICS, P: P };

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window);
