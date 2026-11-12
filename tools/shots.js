/* Dev-only: screenshots of every topic at several widths, plus layout numbers
 * (page overflow, elements past the right edge, tap targets under 44px).
 * Usage: node tools/shots.js [outDir] [widths, comma separated]
 */
'use strict';
const path = require('path');
const { launch, fileUrl, sleep, ROOT } = require('./cdp');

const TOPICS = ['slope', 'lines', 'curve', 'area', 'link'];
const ANSWER = { slope: '2', lines: '-5', curve: '20', area: '15' };

const METRICS = `(function(){
  var vw = document.documentElement.clientWidth, out = { overflow: document.documentElement.scrollWidth - vw, past: [], small: [] };
  var all = document.querySelectorAll('#app *');
  for (var i = 0; i < all.length; i++) {
    var e = all[i]; if (!e.getClientRects().length) continue;
    var r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) out.past.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  var taps = document.querySelectorAll('#app button, #app input, #app select, #app label.opt, #app label.check');
  for (var j = 0; j < taps.length; j++) {
    var t = taps[j]; if (!t.getClientRects().length) continue;
    if (t.tagName === 'INPUT' && (t.type === 'radio' || t.type === 'checkbox')) continue; // the whole label is the target
    var q = t.getBoundingClientRect();
    if (q.height < 44 || q.width < 44) out.small.push(t.tagName + '#' + t.id + '.' + t.className + ' ' + Math.round(q.width) + 'x' + Math.round(q.height));
  }
  return out;
})()`;

(async () => {
  const outDir = path.resolve(process.argv[2] || path.join(ROOT, 'screenshots'));
  const widths = (process.argv[3] || '320,375,768,1280').split(',').map(Number);
  const browser = await launch();
  const page = await browser.page();
  let problems = 0;
  for (const w of widths) {
    await page.viewport(w, w < 700 ? 720 : 900, w < 700);
    await page.goto(fileUrl(ROOT));
    for (const t of TOPICS) {
      await page.click('button[data-topic="' + t + '"]');
      if (ANSWER[t]) {
        await page.click('#answer');
        await page.type(ANSWER[t]);
        await page.click('#check');
      }
      await sleep(250);
      await page.eval('window.scrollTo(0,0)');
      const m = await page.eval(METRICS);
      const bad = m.overflow > 0 || m.past.length || m.small.length;
      if (bad) { problems++; }
      console.log(w + ' ' + t + ': overflow=' + m.overflow + ' past=' + JSON.stringify(m.past.slice(0, 5)) + ' small=' + JSON.stringify(m.small.slice(0, 8)));
      await page.screenshot(path.join(outDir, t + '-' + w + '.png'), true);
    }
  }
  console.log('console errors: ' + JSON.stringify(page.consoleErrors) + ' exceptions: ' + JSON.stringify(page.exceptions));
  console.log(problems ? 'LAYOUT PROBLEMS: ' + problems : 'layout numbers clean');
  page.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
