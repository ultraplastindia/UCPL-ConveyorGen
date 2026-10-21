'use strict';
/* Browser test: ease of use - welcome card, quick start, example, Skip, Needed/Optional badges, plain-language summary, layout icons. */
var path = require('path'), fs = require('fs');
var pw; try { pw = require('playwright'); } catch (e) { try { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); } catch (e2) { console.log('SKIPPED: playwright not installed'); process.exit(0); } }
var url = 'file://' + path.resolve(__dirname, '..', 'index.html'), out = path.join(__dirname, 'screenshots'); fs.mkdirSync(out, { recursive: true });
var fails = 0; function check(n, c, extra) { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  ' + (extra || ''))); if (!c) fails++; }
(async function () {
  var browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
  async function open(w, h) { var c = await browser.newContext({ viewport: { width: w, height: h } }), p = await c.newPage(), errs = []; p.on('pageerror', function (e) { errs.push(e.message); }); await p.goto(url); await p.waitForSelector('#stepBody input'); p.__errs = errs; return p; }
  var p = await open(1280, 900);
  check('step counter shows "Step 1 of 4"', /Step 1 of 4/.test(await p.textContent('#stepCount')));
  check('every step says what is needed on the page', /Needed on this page/.test(await p.textContent('#stepNeed')));
  check('welcome card explains: fill what you know, only length needed', /only what you know/i.test(await p.textContent('.welcome')) && /conveyor length/.test(await p.textContent('.welcome')));
  check('floor fields carry an "Optional" badge', /Optional/.test(await p.textContent('label[for=f_floorLength]')));
  check('layout choices have pictures', (await p.$$('.lay .layicon')).length === 8);
  check('Skip button is visible on step 1', await p.isVisible('#btnSkip'));
  await p.screenshot({ path: path.join(out, 'easy-step1.png') });
  // example
  await p.click('#tryExample'); check('"Fill an example" fills the form', (await p.inputValue('#f_floorLength')) === '20' && (await p.inputValue('#f_projectName')) === 'Example - bottle line');
  // skip through
  await p.click('#btnSkip'); await p.click('#btnSkip'); await p.click('#btnSkip');
  check('Skip moves through steps 1-3 to the conveyor step', /Conveyor/.test(await p.textContent('#stepTitle')) && /Step 4 of 4/.test(await p.textContent('#stepCount')));
  check('Skip is hidden on the last step; length is marked Needed', !(await p.isVisible('#btnSkip')) && /Needed/.test(await p.textContent('label[for=f_routeLength]')));
  check('length hint explains in plain words', /get ON to where they get OFF/.test(await p.textContent('#stepBody')));
  await p.screenshot({ path: path.join(out, 'easy-step4.png') });
  await p.click('#btnNext'); await p.waitForSelector('#resultsBody .hero');
  var sm = await p.textContent('#simpleCard');
  check('results start with an "In simple words" card', /In simple words/.test(sm) && /What you told us/.test(sm) && /What we suggest/.test(sm) && /What to do now/.test(sm), sm);
  check('plain summary quotes the entered 12 m and the example product', /12\.00 m/.test(sm) && /70 x 70 x 200 mm/.test(sm), sm);
  await p.screenshot({ path: path.join(out, 'easy-results-top.png') });
  check('no JS errors (desktop)', p.__errs.length === 0, p.__errs.join('|'));
  // quick start on a fresh page, mobile
  var m = await open(390, 800);
  await m.screenshot({ path: path.join(out, 'easy-mobile-step1.png') });
  await m.click('#quickStart'); check('Quick start jumps straight to the length step', /Conveyor/.test(await m.textContent('#stepTitle')));
  await m.fill('#f_routeLength', '6'); await m.click('#btnNext'); await m.waitForSelector('#resultsBody .hero');
  check('quick start with only a 6 m length gives results', /6\.00 m/.test(await m.textContent('#simpleCard')));
  var wide = await m.evaluate(function () { return document.documentElement.scrollWidth > window.innerWidth + 2; });
  check('no sideways scrolling on a phone', !wide);
  check('no JS errors (mobile)', m.__errs.length === 0, m.__errs.join('|'));
  await browser.close(); if (fails) { console.log(fails + ' check(s) FAILED'); process.exit(1); } console.log('All ease-of-use browser checks passed');
})().catch(function (e) { console.error(e); process.exit(1); });
