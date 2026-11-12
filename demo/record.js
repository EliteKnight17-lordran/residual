/* Records the demo clips of Residual exactly as the app is.
 * Drives headless Microsoft Edge with real mouse and key events, saves the
 * browser's own frames, and writes a step log per clip. encode.py then turns
 * the frames into .mp4 files in real time (nothing is sped up).
 *
 * Usage: node demo/record.js <framesDir> [clip names...]
 * The app's files are only read, never written.
 *
 * Headless browsers draw no mouse pointer, so a pointer mark is overlaid on
 * the page while recording (not in the app's files). Clip 09 has no overlay.
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const URL0 = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/%3A/g, ':');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'residual-demo-'));
  const proc = spawn(EDGE, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir, '--no-first-run',
    '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    const f = path.join(dir, 'DevToolsActivePort');
    if (fs.existsSync(f)) { const t = fs.readFileSync(f, 'utf8').split('\n')[0].trim(); if (t) { port = Number(t); } }
  }
  if (!port) { proc.kill(); throw new Error('browser did not start'); }
  return { port, close: async () => { proc.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* locked */ } } };
}

async function openPage(port) {
  const info = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const waiting = new Map();
  const pg = { errors: [], onFrame: null };
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); if (m.error) { w.bad(new Error(m.error.message)); } else { w.ok(m.result); } return; }
    if (m.method === 'Page.screencastFrame') {
      if (pg.onFrame) { pg.onFrame(m.params); }
      pg.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    }
    if (m.method === 'Runtime.exceptionThrown') { pg.errors.push('exception: ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text)); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { pg.errors.push('console: ' + m.params.args.map((a) => a.value || a.description || '').join(' ')); }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') { pg.errors.push('log: ' + m.params.entry.text); }
  };
  pg.send = (method, params) => new Promise((ok, bad) => { const n = ++id; waiting.set(n, { ok, bad }); ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
  pg.eval = async (expr) => {
    const r = await pg.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) { throw new Error('eval: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); }
    return r.result.value;
  };
  pg.close = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  await pg.send('Page.enable'); await pg.send('Runtime.enable'); await pg.send('Log.enable');
  return pg;
}

const POINTER = `(function(kind){
  var d=document.createElement('div');d.id='__demo_pointer';
  var s=d.style;s.position='fixed';s.left='0';s.top='0';s.zIndex='2147483647';s.pointerEvents='none';s.transform='translate(-100px,-100px)';
  if(kind==='touch'){s.width='34px';s.height='34px';s.margin='-17px 0 0 -17px';s.borderRadius='50%';s.background='rgba(0,0,0,0.25)';s.border='2px solid rgba(0,0,0,0.6)';}
  else{d.innerHTML='<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18.5 L12 28 L15.5 26.5 L11.5 17.5 L19.5 17.5 Z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';s.margin='-2px 0 0 -2px';}
  document.documentElement.appendChild(d);
  window.addEventListener('mousemove',function(e){d.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';},true);
  window.addEventListener('mousedown',function(){d.style.opacity='0.55';},true);
  window.addEventListener('mouseup',function(){d.style.opacity='1';},true);
})`;

async function recordClip(browser, framesRoot, name, opts, script) {
  const pg = await openPage(browser.port);
  const W = opts.width, H = opts.height;
  await pg.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: opts.scale || 1, mobile: !!opts.mobile });
  const dir = path.join(framesRoot, name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = []; const steps = []; let t0 = null;
  pg.onFrame = (p) => {
    const i = frames.length;
    fs.writeFileSync(path.join(dir, String(i).padStart(6, '0') + '.jpg'), Buffer.from(p.data, 'base64'));
    frames.push({ i, ts: p.metadata.timestamp });
  };
  let mx = W / 2, my = H / 2, down = false;

  const h = {
    W, H, pg, sleep,
    pause: (ms) => sleep(ms === undefined ? 2000 : ms),
    mark: (label) => { steps.push({ t: Math.round((Date.now() - t0) / 100) / 10, label }); },
    async goto(url) {
      await pg.send('Page.navigate', { url });
      for (let i = 0; i < 200; i++) { await sleep(50); if (await pg.eval('document.readyState==="complete" && !!window.Residual')) { break; } }
      if (opts.pointer) { await pg.eval(POINTER + '(' + JSON.stringify(opts.pointer) + ')'); }
    },
    async move(x, y, ms) {
      const dist = Math.hypot(x - mx, y - my);
      const dur = ms || Math.max(500, dist / 0.45);      // about 450 px per second: slow
      const n = Math.max(2, Math.round(dur / 16)), sx = mx, sy = my;
      for (let i = 1; i <= n; i++) {
        const u = i / n, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        mx = sx + (x - sx) * e; my = sy + (y - sy) * e;
        await pg.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: down ? 'left' : 'none', buttons: down ? 1 : 0 });
        await sleep(16);
      }
    },
    async press() { down = true; await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', buttons: 1, clickCount: 1 }); },
    async release() { down = false; await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button: 'left', buttons: 0, clickCount: 1 }); },
    rect: (sel) => pg.eval(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,min:Number(e.min),max:Number(e.max),value:Number(e.value)};})()`),
    scrollY: () => pg.eval('window.scrollY'),
    async scrollTo(y, pxPerSec) {
      const max = await pg.eval('document.documentElement.scrollHeight - window.innerHeight');
      y = Math.max(0, Math.min(max, y));
      const from = await h.scrollY(), dist = Math.abs(y - from);
      if (dist < 1) { return; }
      const n = Math.max(2, Math.round(dist / (pxPerSec || 260) * 1000 / 16));
      for (let i = 1; i <= n; i++) {
        const u = i / n, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        await pg.eval('window.scrollTo(0,' + (from + (y - from) * e) + ')');
        await sleep(16);
      }
    },
    // scroll only if the element is not comfortably on screen
    async show(sel, where) {
      const r = await h.rect(sel);
      if (!r) { throw new Error('no element ' + sel); }
      if (r.y < 20 || r.y + r.h > H - 20) {
        const y0 = await h.scrollY();
        await h.scrollTo(where === 'top' ? y0 + r.y - 16 : y0 + r.y + r.h / 2 - H / 2);
      }
    },
    // put two things on screen together: top one at the top if both fit, else keep the bottom one in
    async frame(topSel, bottomSel) {
      const a = await h.rect(topSel), b = await h.rect(bottomSel), y0 = await h.scrollY();
      const fits = (b.y + b.h) - a.y <= H - 30;
      await h.scrollTo(fits ? y0 + a.y - 10 : y0 + b.y + b.h - (H - 22));
      return fits;
    },
    async click(sel, where) {
      await h.show(sel, where);
      const r = await h.rect(sel);
      await h.move(r.x + r.w / 2, r.y + r.h / 2);
      await sleep(350);
      await h.press(); await sleep(90); await h.release();
    },
    async hover(sel) { const r = await h.rect(sel); await h.move(r.x + r.w / 2, r.y + r.h / 2); },
    // press on the slider thumb and drag it slowly to a new value
    async drag(sel, to, ms) {
      await h.show(sel);
      let r = await h.rect(sel);
      const tw = 16, xOf = (v) => r.x + tw / 2 + (v - r.min) / (r.max - r.min) * (r.w - tw);
      await h.move(xOf(r.value), r.y + r.h / 2);
      await sleep(350);
      await h.press(); await sleep(150);
      const targets = Array.isArray(to) ? to : [to];
      for (const v of targets) { await h.move(xOf(v), r.y + r.h / 2, ms || Math.max(1500, Math.abs(xOf(v) - mx) / 0.09)); await sleep(700); }
      await h.release();
    },
    async type(text) {
      for (const ch of text) {
        await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch });
        await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
        await sleep(220);
      }
    },
    async key(key, code, vk, text) {
      await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text });
      await sleep(60);
      await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    },
    async waitFor(expr, maxMs) {
      const end = Date.now() + (maxMs || 60000);
      while (Date.now() < end) { if (await pg.eval(expr)) { return true; } await sleep(150); }
      return false;
    },
    text: (id) => pg.eval(`(function(){var e=document.getElementById(${JSON.stringify(id)});return e&&e.getClientRects().length?e.innerText.replace(/\\s+/g,' ').trim():'';})()`)
  };

  await h.goto(opts.url || URL0);
  await sleep(400);
  await pg.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * (opts.scale || 1), maxHeight: H * (opts.scale || 1), everyNthFrame: 1 });
  t0 = Date.now();
  // nudge so the first frame is delivered straight away
  await pg.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my });
  await sleep(300);
  const notes = [];
  await script(h, notes);
  const shot = await pg.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, name + '-end.png'), Buffer.from(shot.data, 'base64'));
  const endWall = Date.now();
  await pg.send('Page.stopScreencast');
  await sleep(200);
  const meta = { name, width: W, height: H, startWall: t0 / 1000, endWall: endWall / 1000, seconds: (endWall - t0) / 1000, frames, steps, notes, errors: pg.errors };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
  console.log(name + ': ' + meta.seconds.toFixed(1) + ' s, ' + frames.length + ' frames, errors ' + JSON.stringify(pg.errors));
  steps.forEach((s) => console.log('   ' + s.t.toFixed(1).padStart(6) + '  ' + s.label));
  notes.forEach((n) => console.log('   NOTE ' + n));
  pg.close();
}

const DESK = { width: 1280, height: 720, pointer: 'arrow' };
const replayDone = 'window.Residual.state.result && !window.Residual.state.result.playing && !window.Residual.state.result.anim';

const CLIPS = {
  '01-intro': [DESK, async (h) => {
    h.mark('Title "Residual", tagline, language button, the five topic tabs; slope topic open'); await h.pause(3000);
    for (const t of ['slope', 'lines', 'curve', 'area', 'link']) { await h.hover('button[data-topic="' + t + '"]'); await h.pause(900); }
    h.mark('Pointer has passed over each topic tab (no clicks)'); await h.pause();
    await h.move(640, 420);
    h.mark('Slow scroll down the slope page: graph, notes, sliders, question card');
    const max = await h.pg.eval('document.documentElement.scrollHeight - window.innerHeight');
    await h.scrollTo(max, 110);
    h.mark('Bottom of page: plain-graph checkbox and the scope note'); await h.pause(3000);
    await h.scrollTo(0, 220);
    h.mark('Back at the top'); await h.pause();
  }],

  '02-slope': [DESK, async (h, notes) => {
    h.mark('Slope topic. Question 1: "What is the slope of y = 3.00x + 2.00?"'); await h.pause();
    await h.click('#answer'); await h.pause(600); await h.type('2');
    h.mark('Typed 2 in the answer box'); await h.pause();
    await h.click('#check');
    h.mark('Checked. Caption: ' + await h.text('caption')); await h.pause(1200);
    await h.show('#compare', 'top');
    h.mark('Side by side: "Your answer" (dashed, slope 2) and "Correct" (slope 3), replay at step 4 of 4'); await h.pause(4000);
    await h.click('#play');
    h.mark('Pressed Play steps: replay restarts at step 1 and walks to step 4');
    await h.waitFor(replayDone, 40000);
    h.mark('Replay finished on: ' + await h.text('step-text')); await h.pause(2500);
    notes.push('graph and b slider fit on screen together: ' + await h.frame('#cv-main', '#sl-b'));
    h.mark('Scrolled up to the main graph and sliders'); await h.pause(1200);
    await h.drag('#sl-m', [5, 1, 3]);
    h.mark('Dragged m 3 -> 5 -> 1 -> 3: the line tilts. The comparison card disappears as soon as a slider moves'); await h.pause();
    await h.drag('#sl-b', [14, 0, 2]);
    h.mark('Dragged b 2 -> 14 -> 0 -> 2: the line lifts and drops without tilting'); await h.pause(2500);
    notes.push('After the slider drag the comparison card is gone; visible: ' + (await h.pg.eval('!document.getElementById("compare").hidden')));
  }],

  '03-two-lines': [DESK, async (h, notes) => {
    await h.pause(1000);
    await h.click('button[data-topic="lines"]');
    h.mark('Two lines topic: schemes A and B on one graph'); await h.pause();
    await h.click('#qtabs button:nth-child(3)');
    h.mark('Question 3: ' + await h.text('prompt')); await h.pause(2500);
    await h.click('#answer-area input[value="yes"]');
    h.mark('Picked the wrong option: "Yes. A higher base fare always costs more."'); await h.pause();
    await h.click('#check');
    h.mark('Checked. Caption: ' + await h.text('caption')); await h.pause(1200);
    await h.show('#compare', 'top');
    h.mark('Side by side: "Your answer" (A drawn parallel above B) and "Correct" (lines crossing at 5 km)'); await h.pause(4000);
    await h.click('#play');
    h.mark('Pressed Play steps');
    await h.waitFor(replayDone, 40000);
    h.mark('Replay finished on: ' + await h.text('step-text')); await h.pause(2500);
    notes.push('graph and m (A) slider fit on screen together: ' + await h.frame('#cv-main', '#sl-m1'));
    h.mark('Scrolled up to the main graph and sliders'); await h.pause(1200);
    await h.drag('#sl-m1', [3.5, 0.5, 2]);
    h.mark('Dragged m (A) 2 -> 3.5 -> 0.5 -> 2: where the two lines cross slides along the graph'); await h.pause(2500);
    notes.push('Notes under the main graph while dragging: ' + await h.text('notes-main'));
  }],

  '04-curve-slope': [DESK, async (h, notes) => {
    await h.pause(1000);
    await h.click('button[data-topic="curve"]');
    h.mark('Curve slope topic: distance curve, point at t = 0.25, solid tangent, dashed line to a second point'); await h.pause(3000);
    notes.push('graph and t slider fit on screen together: ' + await h.frame('#cv-main', '#sl-t0'));
    await h.pause(800);
    await h.drag('#sl-t0', [0.6, 0.15, 0.25]);
    h.mark('Dragged t 0.25 -> 0.6 -> 0.15 -> 0.25 with the mouse (graph is partly off screen: it and the slider do not fit in 720 px)'); await h.pause();
    await h.frame('#cv-main', '#notes-main');
    await h.move(820, 500); await h.pause(1000);
    const y1 = await h.scrollY();
    for (let i = 0; i < 9; i++) { await h.key('ArrowRight', 'ArrowRight', 39); await h.pause(450); }
    await h.pause(1200);
    for (let i = 0; i < 6; i++) { await h.key('ArrowLeft', 'ArrowLeft', 37); await h.pause(450); }
    notes.push('page scroll moved when arrow keys were pressed: ' + ((await h.scrollY()) !== y1));
    h.mark('Same slider moved with the arrow keys, graph in full view: t 0.25 -> 0.70 -> 0.40, the point rides the curve and the tangent tilts with it'); await h.pause();
    // reach the animate button with the keyboard so the graph can stay on screen
    for (let i = 0; i < 5; i++) { await h.key('Tab', 'Tab', 9); await h.pause(350); }
    const focused = await h.pg.eval('document.activeElement && document.activeElement.id');
    notes.push('keyboard focus after 5 Tab presses: ' + focused);
    h.mark('Tabbed to the "Shrink the gap h" button (focus ring on it)'); await h.pause(1200);
    await h.frame('#cv-main', '#notes-main');
    await h.move(820, 500); await h.pause(800);
    const before = await h.scrollY();
    await h.key(' ', 'Space', 32, ' ');
    h.mark('Pressed Space: h shrinks from 0.50 to 0.01, the second point closes in and the dashed line swings onto the tangent');
    await h.waitFor('!window.Residual.state.demo', 20000);
    notes.push('page scroll moved when Space was pressed: ' + ((await h.scrollY()) !== before));
    h.mark('Animation done. Notes: ' + await h.text('notes-main')); await h.pause(3500);
  }],

  '05-area': [DESK, async (h, notes) => {
    await h.pause(1000);
    await h.click('button[data-topic="area"]');
    h.mark('Area topic: speed curve, shaded area to t = 0.50, 4 rectangles'); await h.pause(2500);
    await h.click('#qtabs button:nth-child(4)');
    h.mark('Opened Question 4 (the only area question that leaves the exact area visible under the graph)'); await h.pause();
    await h.click('#extras .rect-n:nth-of-type(1)');
    for (let i = 0; i < 4; i++) { await h.key('Tab', 'Tab', 9); await h.pause(350); }
    notes.push('keyboard focus after 4 Tab presses: ' + await h.pg.eval('document.activeElement && document.activeElement.id'));
    h.mark('Tabbed to the "Sweep, then add rectangles" button'); await h.pause(1000);
    await h.frame('#cv-main', '#notes-main');
    await h.move(820, 420); await h.pause(800);
    await h.key(' ', 'Space', 32, ' ');
    h.mark('Pressed Space: the slice sweeps left to right for 3 s, then the rectangle count steps 4, 8, 16, 100 (1.3 s each)');
    await h.waitFor('!window.Residual.state.demo', 30000);
    h.mark('Animation done. Notes: ' + await h.text('notes-main')); await h.pause(3000);
    notes.push('graph and rectangle buttons fit on screen together: ' + await h.frame('#cv-main', '#extras .rect-n:nth-of-type(4)'));
    await h.pause(800);
    for (const k of [1, 2, 3, 4]) {
      await h.click('#extras .rect-n:nth-of-type(' + k + ')');
      const line = (await h.text('notes-main'));
      h.mark('Clicked ' + [4, 8, 16, 100][k - 1] + ' rectangles. ' + line.replace(/^.*?\)\s*/, '')); await h.pause(2500);
    }
    await h.frame('#cv-main', '#notes-main');
    h.mark('Scrolled up: 100 rectangles under the whole curve'); await h.pause(3000);
  }],

  '06-closing': [DESK, async (h, notes) => {
    await h.pause(1000);
    await h.click('button[data-topic="link"]');
    h.mark('Connect tab: distance graph (left) with tangent, speed graph (right) with shaded area, yellow summary box'); await h.pause(3500);
    notes.push('graphs and t slider fit on screen together: ' + await h.frame('#cv-main', '#sl-t'));
    await h.pause(800);
    await h.drag('#sl-t', [0.9, 0.2, 0.5]);
    h.mark('Dragged t 0.5 -> 0.9 -> 0.2 -> 0.5: slope on the left equals height on the right; area on the right equals height on the left'); await h.pause(2500);
    await h.click('#demo');
    await h.frame('#cv-main', '#link-summary');
    h.mark('Pressed "Move t along the trip": t runs from 0 to the end of the trip');
    await h.waitFor('!window.Residual.state.demo', 20000);
    h.mark('Animation done. Summary: ' + await h.text('link-summary')); await h.pause(4000);
  }],

  '07-taglish': [DESK, async (h) => {
    h.mark('Slope topic, English'); await h.pause();
    await h.click('#answer'); await h.pause(500); await h.type('2'); await h.pause(1000);
    await h.click('#check');
    h.mark('Checked 2. English caption: ' + await h.text('caption')); await h.pause(3500);
    await h.click('#lang');
    h.mark('Clicked the language button. Taglish caption: ' + await h.text('caption')); await h.pause(4500);
    await h.click('#lang');
    h.mark('Clicked again: back to English'); await h.pause(3000);
    await h.click('#lang');
    h.mark('Clicked again: Taglish, whole page'); await h.pause(2000);
    await h.move(900, 600);
    await h.scrollTo(380, 150);
    h.mark('Scrolled down in Taglish: both pictures, notes, step text and replay buttons'); await h.pause(3500);
  }],

  '08-phone': [{ width: 375, height: 812, scale: 2, mobile: true, pointer: 'touch' }, async (h, notes) => {
    h.mark('Phone width 375: title, topic tabs, start of the slope page'); await h.pause(3000);
    await h.move(187, 500);
    await h.show('#prompt', 'top');
    h.mark('Scrolled down past graph and sliders to the question'); await h.pause(2500);
    await h.click('#answer'); await h.pause(600); await h.type('2');
    h.mark('Typed 2'); await h.pause();
    await h.click('#check');
    h.mark('Checked: page jumps to the caption. ' + await h.text('caption')); await h.pause(4000);
    const y = await h.scrollY();
    await h.scrollTo(y + 620, 130);
    h.mark('Scrolled through "Your answer" then "Correct" (stacked, not side by side, at this width)'); await h.pause(2500);
    await h.click('#play');
    h.mark('Pressed Play steps');
    await h.pause(600);
    await h.show('.pair .ok', 'top');
    h.mark('Scrolled to the "Correct" picture while the steps play');
    await h.waitFor(replayDone, 40000);
    await h.pause(1500);
    await h.show('#step-text');
    h.mark('Replay finished on: ' + await h.text('step-text')); await h.pause(3000);
  }],

  '09-tests': [{ width: 1280, height: 720, url: URL0 + '?test=1' }, async (h, notes) => {
    h.mark('index.html?test=1 opened; heading "running", seed line, group A filling in');
    let lastRows = 0, said = {};
    for (let i = 0; i < 600; i++) {
      await h.sleep(500);
      const s = await h.pg.eval('(function(){var p=document.getElementById("test-panel");var r=p.querySelectorAll("tr").length;var t=p.querySelector("table");return {rows:r,bottom:t?t.getBoundingClientRect().bottom+window.scrollY:0,done:!!window.__residualTestDone,groups:Array.prototype.map.call(p.querySelectorAll("th"),function(x){return x.textContent.slice(0,9);})};})()');
      s.groups.forEach((g) => { if (!said[g]) { said[g] = 1; h.mark('Group header appears: ' + g.trim()); } });
      if (s.rows !== lastRows) { lastRows = s.rows; await h.scrollTo(s.bottom - 640, 500); }   // follow the newest result row
      if (s.done) { break; }
    }
    const done = await h.pg.eval('JSON.stringify({ok:window.__residualTestDone.ok,seed:window.__residualTestDone.seed,seconds:window.__residualTestDone.seconds})');
    notes.push('test page result: ' + done);
    h.mark('Run finished: ' + done); await h.pause(1500);
    await h.scrollTo(0, 900);
    h.mark('Top of the page: final heading and seed. ' + (await h.pg.eval('document.querySelector("#test-panel h2").textContent + " | " + document.querySelector("#test-panel p").textContent'))); await h.pause(5000);
    const end = await h.pg.eval('document.querySelector("#test-panel table").getBoundingClientRect().bottom + window.scrollY - 700');
    h.mark('Slow scroll through every group (A to E) and every check');
    await h.scrollTo(end, 160);
    h.mark('End of the table: group E'); await h.pause(3000);
    await h.scrollTo(0, 900);
    h.mark('Final screen held 5 s: heading with the result and the seed'); await h.pause(5200);
  }],

  '10-correct': [DESK, async (h) => {
    h.mark('Slope topic, Question 1: slope of y = 3.00x + 2.00'); await h.pause();
    await h.click('#answer'); await h.pause(600); await h.type('3');
    h.mark('Typed 3 (the correct slope)'); await h.pause();
    await h.click('#check');
    h.mark('Checked. Caption: ' + await h.text('caption')); await h.pause(1200);
    await h.show('#compare', 'top');
    h.mark('Both pictures are the same line; caption box is blue'); await h.pause(4500);
  }],

  '11-parallel': [DESK, async (h) => {
    await h.pause(1000);
    await h.click('button[data-topic="lines"]');
    h.mark('Two lines topic'); await h.pause();
    await h.click('#qtabs button:nth-child(4)');
    h.mark('Question 4 sets both schemes to the same m. ' + await h.text('prompt')); await h.pause(2500);
    h.mark('Notes under the graph: ' + await h.text('notes-main')); await h.pause(2500);
    await h.click('#answer-area input[value="cross"]');
    h.mark('Picked the wrong option: "Yes. They meet somewhere far along the ride."'); await h.pause();
    await h.click('#check');
    h.mark('Checked. Caption: ' + await h.text('caption')); await h.pause(1200);
    await h.show('#compare', 'top');
    h.mark('Side by side: "Your answer" (B bent to meet A) and "Correct" (parallel, gap marked)'); await h.pause(5000);
  }],

  '12-plain-graph': [DESK, async (h, notes) => {
    h.mark('Slope topic, story graph (fare against distance)'); await h.pause();
    await h.click('#plain');
    h.mark('Ticked "Plain graph": axes now run from -10 to 10'); await h.pause(2500);
    notes.push('graph and m slider fit on screen together: ' + await h.frame('#cv-main', '#sl-m'));
    await h.pause(1000);
    await h.drag('#sl-m', [-2, -4, -1.5]);
    h.mark('Dragged m 3 -> -2 -> -4 -> -1.5: the line tips over and goes down. Notes: ' + await h.text('notes-main')); await h.pause(3000);
  }]
};

(async () => {
  const framesRoot = path.resolve(process.argv[2]);
  const want = process.argv.slice(3);
  const browser = await launch();
  try {
    for (const name of Object.keys(CLIPS)) {
      if (want.length && want.indexOf(name) < 0) { continue; }
      await recordClip(browser, framesRoot, name, CLIPS[name][0], CLIPS[name][1]);
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
