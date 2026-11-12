/* Dev-only helper: drives headless Microsoft Edge (or Chrome) over the DevTools
 * protocol, with no npm packages. Needs Node 22+ (built-in WebSocket and fetch).
 * The app itself never needs this.
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function launch() {
  const exe = CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) { throw new Error('No Edge or Chrome found. Set BROWSER_PATH.'); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'residual-cdp-'));
  const proc = spawn(exe, [
    '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--hide-scrollbars', 'about:blank'
  ], { stdio: 'ignore' });
  const portFile = path.join(dir, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    if (fs.existsSync(portFile)) {
      const txt = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
      if (txt) { port = Number(txt); }
    }
  }
  if (!port) { proc.kill(); throw new Error('Browser did not start.'); }
  return {
    port,
    async page() { return openPage(port); },
    async close() {
      proc.kill();
      await sleep(300);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* locked on Windows; harmless */ }
    }
  };
}

async function openPage(port) {
  const res = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' });
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0;
  const waiting = new Map();
  const page = { consoleErrors: [], exceptions: [], requests: [], offline: false };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const w = waiting.get(msg.id); waiting.delete(msg.id);
      if (msg.error) { w.bad(new Error(msg.error.message)); } else { w.ok(msg.result); }
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      page.consoleErrors.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      page.exceptions.push((d.exception && d.exception.description) || d.text);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      page.consoleErrors.push('log: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
    }
    if (msg.method === 'Network.requestWillBeSent') { page.requests.push(msg.params.request.url); }
  };
  page.send = (method, params) => new Promise((ok, bad) => {
    const n = ++id;
    waiting.set(n, { ok, bad });
    ws.send(JSON.stringify({ id: n, method, params: params || {} }));
  });
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');

  page.viewport = (width, height, mobile) => page.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile
  });
  page.goOffline = async () => {
    page.offline = true;
    await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  };
  page.goto = async (url) => {
    await page.send('Page.navigate', { url });
    for (let i = 0; i < 200; i++) {
      await sleep(50);
      const r = await page.eval('document.readyState === "complete" && !!window.Residual');
      if (r) { return; }
    }
    throw new Error('Page did not load: ' + url);
  };
  page.eval = async (expr) => {
    const r = await page.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error('eval failed: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    }
    return r.result.value;
  };
  page.screenshot = async (file, full) => {
    let clip;
    if (full) {
      const m = await page.send('Page.getLayoutMetrics');
      const s = m.cssContentSize || m.contentSize;
      clip = { x: 0, y: 0, width: s.width, height: s.height, scale: 1 };
    }
    const r = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full, clip });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  };
  // Real key and mouse input, for the role-play pass.
  page.click = async (selector) => {
    const pt = await page.eval(`(function(){var e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    if (!pt) { throw new Error('No element: ' + selector); }
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  };
  page.type = async (text) => { await page.send('Input.insertText', { text }); };
  page.key = async (key, code, vk) => {
    const base = { key, code: code || key, windowsVirtualKeyCode: vk || 0, nativeVirtualKeyCode: vk || 0 };
    await page.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown', text: key.length === 1 ? key : (key === 'Enter' ? '\r' : undefined) }, base));
    await page.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
  };
  page.close = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  return page;
}

// Tiny static server for the "served from a local server" check.
function serve(rootDir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(rootDir, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(rootDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: 'http://127.0.0.1:' + server.address().port + '/index.html', close: () => server.close() })));
}

function fileUrl(rootDir) {
  return 'file:///' + path.join(rootDir, 'index.html').replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/%3A/g, ':');
}

module.exports = { launch, serve, fileUrl, sleep, ROOT: path.resolve(__dirname, '..') };
