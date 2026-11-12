/* Residual canvas renderer. Draws one scene (plain data from math.js) on a canvas.
 * Every string drawn goes through txt(), which records any NaN / Infinity /
 * undefined so the test page can see canvas text too.
 */
(function (root) {
  'use strict';
  var M = root.ResidualMath;

  // Okabe-Ito colour-blind-safe palette. Student lines are also dashed,
  // so nothing depends on colour alone.
  var COLORS = {
    ok: '#0072B2', you: '#D55E00', alt: '#8A5A00', ref: '#6B6B6B',
    A: '#00775A', B: '#A3417D', ink: '#1A1A1A', grid: '#E3E3E3', axis: '#444444'
  };
  var FILLS = {
    ok: 'rgba(0,114,178,0.22)', you: 'rgba(213,94,0,0.20)', alt: 'rgba(230,159,0,0.30)',
    ref: 'rgba(107,107,107,0.18)', A: 'rgba(0,119,90,0.2)', B: 'rgba(163,65,125,0.2)'
  };
  var DASHED = { you: true, B: true };

  var bad = [];
  var BAD_RE = /NaN|Infinity|undefined|null/;

  function pick(text, lang) {
    if (text === null || text === undefined) { return ''; }
    if (typeof text === 'string') { return text; }
    return text[lang] || text.en || '';
  }

  function niceStep(span, target) {
    var raw = span / target;
    if (!(raw > 0) || !isFinite(raw)) { return 1; }
    var k = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) { if (steps[i] * k >= raw) { return steps[i] * k; } }
    return 10 * k;
  }

  function size(canvas) {
    var w = Math.round(canvas.clientWidth || (canvas.parentNode && canvas.parentNode.clientWidth) || 300);
    if (w < 120) { w = 120; }
    var h = Math.round(Math.max(210, Math.min(380, w * 0.72)));
    var dpr = Math.min(root.devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
    }
    return { w: w, h: h, dpr: dpr };
  }

  /* opts: { lang, step, prog, hide }
   *   step : items with s <= step are drawn (and u >= step when u is set)
   *   prog : 0..1 animation progress of the items whose s === step
   *   hide : object of item keys not to draw
   */
  function draw(canvas, sc, opts) {
    opts = opts || {};
    var lang = opts.lang || 'en';
    var step = opts.step === undefined ? 1e9 : opts.step;
    var prog = opts.prog === undefined ? 1 : Math.max(0, Math.min(1, opts.prog));
    var hide = opts.hide || {};
    var ctx = canvas.getContext('2d');
    if (!ctx || !sc) { return; }
    var sz = size(canvas), W = sz.w, H = sz.h;
    ctx.setTransform(sz.dpr, 0, 0, sz.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var small = W < 360;
    var tickFont = (small ? 12 : 13) + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    var labelFont = 'bold ' + (small ? 13 : 14) + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    function txt(str, x, y, color, font, align, base, halo) {
      str = String(str);
      if (BAD_RE.test(str) && bad.length < 50) { bad.push(str); }
      ctx.font = font || labelFont;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = base || 'alphabetic';
      if (halo) {
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = color || COLORS.ink;
      ctx.fillText(str, x, y);
    }

    var x0 = sc.xr[0], x1 = sc.xr[1], y0 = sc.yr[0], y1 = sc.yr[1];
    if (!(x1 > x0)) { x1 = x0 + 1; }
    if (!(y1 > y0)) { y1 = y0 + 1; }

    ctx.font = tickFont;
    var yStep = niceStep(y1 - y0, H < 260 ? 4 : 5);
    var maxTickW = 0, yv;
    for (yv = Math.ceil(y0 / yStep - 1e-9) * yStep; yv <= y1 + 1e-9; yv += yStep) {
      maxTickW = Math.max(maxTickW, ctx.measureText(M.fmt(yv)).width);
    }
    var left = Math.ceil(maxTickW) + 12, right = 24, top = 24, bottom = 44;
    var pw = W - left - right, ph = H - top - bottom;
    function X(x) { return left + (x - x0) / (x1 - x0) * pw; }
    function Y(y) { return top + ph - (y - y0) / (y1 - y0) * ph; }

    /* grid and ticks */
    ctx.lineWidth = 1; ctx.setLineDash([]);
    for (yv = Math.ceil(y0 / yStep - 1e-9) * yStep; yv <= y1 + 1e-9; yv += yStep) {
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(left, Y(yv)); ctx.lineTo(left + pw, Y(yv)); ctx.stroke();
      txt(M.fmt(yv), left - 6, Y(yv), COLORS.axis, tickFont, 'right', 'middle');
    }
    var ticks = [];
    if (sc.xticks) {
      ticks = sc.xticks.map(function (t) { return { x: t.x, label: t.label }; });
    } else {
      ctx.font = tickFont;
      var sample = Math.max(ctx.measureText(M.fmt(x0)).width, ctx.measureText(M.fmt(x1)).width) + 14;
      var xStep = niceStep(x1 - x0, Math.max(2, Math.floor(pw / sample)));
      for (var xv = Math.ceil(x0 / xStep - 1e-9) * xStep; xv <= x1 + 1e-9; xv += xStep) {
        ticks.push({ x: xv, label: M.fmt(xv) });
      }
    }
    ticks.forEach(function (t) {
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(X(t.x), top); ctx.lineTo(X(t.x), top + ph); ctx.stroke();
      txt(t.label, X(t.x), top + ph + 6, COLORS.axis, tickFont, 'center', 'top');
    });

    /* axes (the zero lines when zero is in view) */
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1.5;
    var ax = (x0 <= 0 && x1 >= 0) ? X(0) : left, ay = (y0 <= 0 && y1 >= 0) ? Y(0) : top + ph;
    ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, top + ph); ctx.moveTo(left, ay); ctx.lineTo(left + pw, ay); ctx.stroke();
    txt(pick(sc.xl, lang), left + pw, H - 6, COLORS.ink, labelFont, 'right', 'alphabetic');
    txt(pick(sc.yl, lang), 4, 15, COLORS.ink, labelFont, 'left', 'alphabetic');

    function style(it) {
      ctx.strokeStyle = COLORS[it.c] || COLORS.ink;
      ctx.fillStyle = COLORS[it.c] || COLORS.ink;
      ctx.lineWidth = it.w || 2.5;
      var dash = it.dash === undefined ? !!DASHED[it.c] : it.dash;
      ctx.setLineDash(dash ? [7, 5] : []);
    }

    var labels = [];
    function label(str, px, py, color, align, base) {
      if (!str) { return; }
      labels.push({ str: str, x: px, y: py, c: color, align: align || 'left', base: base || 'middle' });
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(left, top, pw, ph); ctx.clip();

    (sc.items || []).forEach(function (it) {
      var sAt = it.s || 0;
      if (sAt > step) { return; }
      if (it.u !== undefined && step > it.u) { return; }
      if (it.key && hide[it.key]) { return; }
      var p = sAt === step ? prog : 1;
      var col = COLORS[it.c] || COLORS.ink;
      var xa, xb, i, n, px, py;
      ctx.globalAlpha = 1;
      style(it);

      if (it.t === 'line') {
        xa = it.x0 === undefined ? x0 : Math.max(x0, it.x0);
        xb = it.x1 === undefined ? x1 : Math.min(x1, it.x1);
        if (xb > xa) {
          var xe = xa + (xb - xa) * p;
          ctx.beginPath(); ctx.moveTo(X(xa), Y(it.m * xa + it.b)); ctx.lineTo(X(xe), Y(it.m * xe + it.b)); ctx.stroke();
          if (it.label && p >= 1) {
            // put the name where the line is still inside the plot
            var lx = xb - (xb - xa) * 0.06, ly = it.m * lx + it.b;
            if (ly > y1) { lx = (y1 - (y1 - y0) * 0.08 - it.b) / it.m; ly = it.m * lx + it.b; }
            if (ly < y0) { lx = (y0 + (y1 - y0) * 0.08 - it.b) / it.m; ly = it.m * lx + it.b; }
            if (isFinite(lx) && isFinite(ly)) { label(it.label, X(lx) - 4, Y(ly) - 12, col, 'right', 'middle'); }
          }
        }
      } else if (it.t === 'seg') {
        ctx.beginPath(); ctx.moveTo(X(it.x1), Y(it.y1));
        ctx.lineTo(X(it.x1 + (it.x2 - it.x1) * p), Y(it.y1 + (it.y2 - it.y1) * p)); ctx.stroke();
      } else if (it.t === 'hline') {
        ctx.beginPath(); ctx.moveTo(left, Y(it.y)); ctx.lineTo(left + pw * p, Y(it.y)); ctx.stroke();
      } else if (it.t === 'vline') {
        ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(X(it.x), top + ph); ctx.lineTo(X(it.x), top + ph - ph * p); ctx.stroke();
      } else if (it.t === 'fn') {
        var f = it.f === 's' ? M.s : M.v;
        xb = it.from + (it.to - it.from) * p; n = 80;
        ctx.lineWidth = it.w || 3;
        ctx.beginPath();
        for (i = 0; i <= n; i++) {
          var tx = it.from + (xb - it.from) * i / n;
          if (i === 0) { ctx.moveTo(X(tx), Y(f(it.a, it.T, tx))); } else { ctx.lineTo(X(tx), Y(f(it.a, it.T, tx))); }
        }
        ctx.stroke();
      } else if (it.t === 'area') {
        xb = it.from + (it.to - it.from) * p; n = 60;
        ctx.fillStyle = FILLS[it.c] || FILLS.ok;
        ctx.beginPath(); ctx.moveTo(X(it.from), Y(0));
        for (i = 0; i <= n; i++) {
          var ta = it.from + (xb - it.from) * i / n;
          ctx.lineTo(X(ta), Y(M.v(it.a, it.T, ta)));
        }
        ctx.lineTo(X(xb), Y(0)); ctx.closePath(); ctx.fill();
        ctx.setLineDash([]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(xb), Y(0)); ctx.lineTo(X(xb), Y(M.v(it.a, it.T, xb))); ctx.stroke();
      } else if (it.t === 'rects') {
        var dt = it.to / it.n, shown = Math.ceil(it.n * p);
        ctx.fillStyle = FILLS[it.c] || FILLS.alt;
        ctx.setLineDash([]); ctx.lineWidth = it.n > 40 ? 0.5 : 1.5;
        for (i = 0; i < shown; i++) {
          var hh = M.v(it.a, it.T, i * dt);
          px = X(i * dt); py = Y(hh);
          ctx.fillRect(px, py, X((i + 1) * dt) - px, Y(0) - py);
          ctx.strokeRect(px, py, X((i + 1) * dt) - px, Y(0) - py);
        }
      } else if (it.t === 'rect') {
        ctx.globalAlpha = p;
        ctx.fillStyle = FILLS[it.c] || FILLS.ref;
        px = X(it.x); py = Y(it.h);
        ctx.fillRect(px, py, X(it.x + it.w) - px, Y(0) - py);
        ctx.strokeRect(px, py, X(it.x + it.w) - px, Y(0) - py);
      } else if (it.t === 'vbar') {
        ctx.setLineDash([]); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(X(it.x), Y(0)); ctx.lineTo(X(it.x), Y(it.y * p)); ctx.stroke();
      } else if (it.t === 'tri') {
        ctx.globalAlpha = p;
        ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
        ctx.fillStyle = FILLS[it.c] || FILLS.ref;
        ctx.beginPath(); ctx.moveTo(X(it.x1), Y(it.y1)); ctx.lineTo(X(it.x2), Y(it.y1)); ctx.lineTo(X(it.x2), Y(it.y2)); ctx.closePath();
        ctx.fill();
        ctx.beginPath(); ctx.moveTo(X(it.x1), Y(it.y1)); ctx.lineTo(X(it.x2), Y(it.y1)); ctx.lineTo(X(it.x2), Y(it.y2)); ctx.stroke();
        if (p >= 1) {
          var below = it.y2 >= it.y1;
          label(it.run, (X(it.x1) + X(it.x2)) / 2, Y(it.y1) + (below ? 11 : -11), col, 'center', 'middle');
          label(it.rise, X(it.x2) + 6, (Y(it.y1) + Y(it.y2)) / 2, col, 'left', 'middle');
        }
      } else if (it.t === 'pt') {
        ctx.globalAlpha = p;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(X(it.x), Y(it.y), 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        if (p >= 1 && it.label) { label(it.label, X(it.x) + 10, Y(it.y) + (it.below ? 14 : -12), col, 'left', 'middle'); }
      } else if (it.t === 'label') {
        if (p >= 1) {
          if (it.anchor === 'right') { label(it.str, X(it.x) - 6, Y(it.y), col, 'right', 'middle'); }
          else if (it.anchor === 'above') { label(it.str, X(it.x), Y(it.y) - 10, col, 'center', 'middle'); }
          else { label(it.str, X(it.x) + 6, Y(it.y), col, 'left', 'middle'); }
        }
      }
    });
    ctx.restore();
    ctx.globalAlpha = 1; ctx.setLineDash([]);

    /* labels: kept inside the plot, nudged down when two would overlap */
    var placed = [];
    ctx.font = labelFont;
    labels.forEach(function (lb) {
      var w = ctx.measureText(lb.str).width, hgt = 16;
      var lx = lb.align === 'right' ? lb.x - w : (lb.align === 'center' ? lb.x - w / 2 : lb.x);
      var ly = lb.y - hgt / 2;
      lx = Math.max(left + 2, Math.min(left + pw - w - 2, lx));
      ly = Math.max(top + 1, Math.min(top + ph - hgt - 1, ly));
      var baseY = ly, offs = [0, -1, 1, -2, 2, -3, 3, -4, 4];
      for (var tries = 0; tries < offs.length; tries++) {
        var ty = baseY + offs[tries] * hgt;
        if (ty < top + 1 || ty > top + ph - hgt - 1) { continue; }
        var hit = false;
        for (var j = 0; j < placed.length; j++) {
          var q = placed[j];
          if (lx < q.x + q.w + 3 && lx + w + 3 > q.x && ty < q.y + q.h && ty + hgt > q.y) { hit = true; break; }
        }
        if (!hit) { ly = ty; break; }
      }
      placed.push({ x: lx, y: ly, w: w, h: hgt });
      txt(lb.str, lx, ly + hgt / 2, lb.c, labelFont, 'left', 'middle', true);
    });
  }

  root.ResidualDraw = { draw: draw, bad: bad, COLORS: COLORS, pick: pick };
})(window);
