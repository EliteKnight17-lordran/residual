/* Dev-only: opens index.html?test=1 in headless Edge/Chrome and prints what the
 * page reports. It does not run any test itself: the page does.
 * Usage: node tools/run-tests.js [file|http|offline] [seed] [screenshot.png]
 */
'use strict';
const { launch, serve, fileUrl, sleep, ROOT } = require('./cdp');

(async () => {
  const mode = process.argv[2] || 'file';
  const seed = process.argv[3] && process.argv[3] !== '-' ? '&seed=' + process.argv[3] : '';
  const shot = process.argv[4];
  const browser = await launch();
  const page = await browser.page();
  await page.viewport(1280, 900, false);
  let server = null, base = fileUrl(ROOT);
  if (mode === 'http') { server = await serve(ROOT); base = server.url; }
  if (mode === 'offline') { await page.goOffline(); }
  await page.goto(base + '?test=1' + seed);
  let done = null;
  for (let i = 0; i < 1800 && !done; i++) {
    await sleep(500);
    done = await page.eval('window.__residualTestDone ? JSON.stringify(window.__residualTestDone) : null');
  }
  if (!done) { console.log('TIMEOUT: the test page never finished'); console.log(await page.eval('document.getElementById("test-panel").innerText')); process.exitCode = 1; }
  else {
    const r = JSON.parse(done);
    console.log('mode=' + mode + (mode === 'offline' ? ' (network switched off)' : '') + '  seed=' + r.seed + '  ' + r.seconds.toFixed(1) + 's  ' + (r.ok ? 'ALL GROUPS PASS' : 'FAILED'));
    for (const g of r.groups) {
      const ok = g.checks.every((c) => c.pass);
      console.log((ok ? 'PASS ' : 'FAIL ') + g.name);
      for (const c of g.checks) {
        if (!c.pass || process.env.VERBOSE) { console.log('   ' + (c.pass ? 'pass ' : 'FAIL ') + c.name + ' | ' + c.info); }
        if (!c.pass) { c.fails.forEach((f) => console.log('        ' + f)); }
      }
    }
    if (!r.ok) { process.exitCode = 1; }
  }
  const outside = page.requests.filter((u) => !u.startsWith('file:') && !(server && u.startsWith(server.url.replace('/index.html', ''))) && !u.startsWith('about:') && !u.startsWith('data:'));
  console.log('requests seen by the browser: ' + page.requests.length + ', to outside hosts: ' + outside.length + (outside.length ? ' ' + JSON.stringify(outside) : ''));
  console.log('console errors/warnings: ' + page.consoleErrors.length + ' ' + JSON.stringify(page.consoleErrors.slice(0, 5)) + '  uncaught exceptions: ' + page.exceptions.length + ' ' + JSON.stringify(page.exceptions.slice(0, 5)));
  if (outside.length || page.consoleErrors.length || page.exceptions.length) { process.exitCode = 1; }
  if (shot) { await page.eval('window.scrollTo(0,0)'); await page.screenshot(shot, true); }
  page.close();
  if (server) { server.close(); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
