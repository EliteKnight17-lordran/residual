/* Dev-only: walks every question on every topic with real clicks and typing,
 * as one of three personas, and writes down what the page showed (text and
 * screenshots). Reading and judging that output is the actual role-play.
 * Usage: node tools/roleplay.js <student|phone|teacher> <outDir>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { launch, fileUrl, sleep, ROOT } = require('./cdp');

// What each persona types. The weak student makes the classic slips; the teacher probes edges.
const PLAN = {
  student: { slope: ['2', '3.5', 'steeper', 'up'], lines: ['-5', '5', 'yes', 'cross'], curve: ['12.5', 'same', 'none'], area: ['15', '18.75', 'grows', 'kmh'] },
  phone: { slope: ['1/3', '0.33', 'same', 'down'], lines: ['5 km', '25', 'no', 'never'], curve: ['3.13', 'changes', 'limit'], area: ['30', '20', 'settles', 'km'] },
  teacher: { slope: ['3.004', '3,5', 'steeper', 'up'], lines: ['5.00', '₱25', 'yes', 'cross'], curve: ['20', 'same', 'none'], area: ['10', '7.97', 'grows', 'kmh'] }
};

const SNAP = '(function(){' +
  'function t(id){var e=document.getElementById(id);return e&&!e.hidden&&e.getClientRects().length?e.innerText.replace(/\\s+/g," ").trim():"";}' +
  'var c=document.getElementById("compare");' +
  'return {prompt:t("prompt"),msg:t("msg"),caption:t("caption"),step:t("step-count")+" | "+t("step-text"),you:t("notes-you"),ok:t("notes-ok"),main:t("notes-main"),status:c.hidden?"":c.getAttribute("data-status")};' +
  '})()';

(async () => {
  const who = process.argv[2] || 'student';
  const out = path.resolve(process.argv[3] || 'roleplay-' + who);
  fs.mkdirSync(out, { recursive: true });
  const log = [];
  const browser = await launch();
  const page = await browser.page();
  if (who === 'phone') { await page.viewport(360, 640, true); } else { await page.viewport(1280, 900, false); }
  await page.goto(fileUrl(ROOT));
  const t0 = Date.now();
  let firstInsight = null;
  for (const topic of ['slope', 'lines', 'curve', 'area']) {
    await page.click('button[data-topic="' + topic + '"]');
    const answers = PLAN[who][topic];
    for (let i = 0; i < answers.length; i++) {
      await page.click('#qtabs button:nth-child(' + (i + 1) + ')');
      if (who === 'teacher') { await page.click('#lang'); } // the teacher reads the Taglish
      const numeric = await page.eval('!!document.getElementById("answer")');
      if (numeric) {
        await page.click('#answer');
        await page.eval('document.getElementById("answer").select()');
        await page.type(answers[i]);
        await page.key('Enter', 'Enter', 13); // submit with the keyboard
      } else {
        await page.click('#answer-area input[value="' + answers[i] + '"]');
        await page.click('#check');
      }
      await sleep(150);
      const snap = await page.eval(SNAP);
      if (!firstInsight && snap.caption) { firstInsight = (Date.now() - t0) / 1000; }
      log.push('## ' + topic + ' Q' + (i + 1) + ' typed ' + JSON.stringify(answers[i]) + ' -> ' + (snap.status || 'no comparison'));
      log.push('prompt : ' + snap.prompt);
      log.push('graph  : ' + snap.main);
      if (snap.msg) { log.push('message: ' + snap.msg); }
      if (snap.caption) {
        log.push('caption: ' + snap.caption);
        log.push('yours  : ' + snap.you);
        log.push('correct: ' + snap.ok);
        await page.screenshot(path.join(out, topic + '-q' + (i + 1) + '.png'), who !== 'phone');
        await page.click('#play'); await sleep(500);
        await page.click('#pause');
        const mid = await page.eval(SNAP); log.push('paused : ' + mid.step);
        for (let k = 0; k < 6; k++) {
          const d = await page.eval('document.getElementById("next").disabled');
          if (d) { break; }
          await page.click('#next'); await sleep(1250);
          const s = await page.eval(SNAP); log.push('next   : ' + s.step + ' || ' + s.ok);
        }
        await page.click('#back');
        const b = await page.eval(SNAP); log.push('back   : ' + b.step);
      }
      if (who === 'teacher') { await page.click('#lang'); }
      log.push('');
    }
    if (topic === 'curve' || topic === 'area') {
      await page.click('#demo'); await sleep(1200);
      await page.screenshot(path.join(out, topic + '-demo.png'), false);
      const s = await page.eval(SNAP);
      log.push('demo running on ' + topic + ': ' + s.main); log.push('');
      await page.click('#demo');
    }
  }
  await page.click('button[data-topic="link"]');
  await page.click('#demo'); await sleep(2500);
  await page.screenshot(path.join(out, 'link.png'), who !== 'phone');
  log.push('## connect: ' + await page.eval('document.getElementById("link-summary").innerText.replace(/\\s+/g," ")'));
  log.push('first caption appeared ' + firstInsight + ' s after the page loaded (scripted typing, not a human)');
  log.push('console errors: ' + JSON.stringify(page.consoleErrors) + ' exceptions: ' + JSON.stringify(page.exceptions));
  fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n'));
  console.log(log.join('\n'));
  page.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
