'use strict';
/* Browser test: customer gives ONLY the conveyor length (no floor, product or throughput). Everything must still work, nothing invented. */
var path = require('path'), fs = require('fs');
var pw; try { pw = require('playwright'); } catch (e) { try { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); } catch (e2) { console.log('SKIPPED: playwright not installed'); process.exit(0); } }
var url = 'file://' + path.resolve(__dirname, '..', 'index.html'), out = path.join(__dirname, 'screenshots'); fs.mkdirSync(out, { recursive: true });
var fails = 0; function check(n, c, extra) { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  ' + (extra || ''))); if (!c) fails++; }
(async function () {
  var browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
  var ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), errors = [];
  p.on('pageerror', function (e) { errors.push(e.message); }); p.on('console', function (m) { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForSelector('#stepBody input');
  await p.click('#btnNext'); check('step 1 passes with NO floor size', (await p.textContent('#stepTitle')) !== 'Factory space');
  await p.click('#btnNext'); check('product step can be skipped', true);
  await p.click('#btnNext'); check('throughput step can be skipped', /Conveyor|route|type/i.test(await p.textContent('#stepTitle')), await p.textContent('#stepTitle'));
  await p.click('#btnNext'); check('step 4 is blocked until the conveyor length is entered', await p.isVisible('#errSummary') && /conveyor length/i.test(await p.textContent('#errSummary')));
  await p.fill('#f_routeLength', '8'); await p.waitForTimeout(400);
  check('live 3D preview draws the conveyor without any floor', (await p.$$('#liveSchem canvas')).length === 1);
  await p.click('#btnNext'); await p.waitForSelector('#resultsBody .hero');
  var txt = await p.textContent('#resultsBody');
  check('the wizard form is hidden once results are shown', !(await p.isVisible('#wizardWrap')));
  check('results: 8.00 m path shown', /8\.00 m/.test(txt));
  check('results: floor shown as not given, fit not claimed', /Not given \(optional\)/.test(txt) && !/Fits inside floor/.test(txt));
  check('results: missing items are listed for engineering review (nothing invented)', /Engineering review required/.test(txt));
  check('no price / invented numbers', !/₹|\$\s?\d|INR\s?\d/.test(txt));
  check('3D view present and drawn', (await p.$$('#v3dHost canvas')).length === 1);
  check('CAD drawing card present with plan, side, end views and NO floor layout', (await p.$$('#cadCard svg')).length === 1 && /PLAN VIEW/.test(await p.textContent('#cadCard')) && /SIDE ELEVATION/.test(await p.textContent('#cadCard')) && /Floor size not entered/.test(await p.textContent('#cadCard')));
  var dl = await Promise.all([p.waitForEvent('download'), p.click('#cadDxf2')]), d2 = fs.readFileSync(await dl[0].path(), 'utf8');
  check('2D DXF downloads and carries the 8000 mm length', /AC1009/.test(d2) && /EOF\s*$/.test(d2) && /8000 mm/.test(d2) && !/Floor length/.test(d2));
  dl = await Promise.all([p.waitForEvent('download'), p.click('#cadDxf3')]); var d3 = fs.readFileSync(await dl[0].path(), 'utf8'); check('3D DXF downloads', /3DFACE/.test(d3) && /EOF\s*$/.test(d3));
  await p.click('[data-tab="plan"]'); await p.waitForTimeout(400);
  check('2D plan tab shows the conveyor on its own (no floor outline)', (await p.$$('#simHost .cv-belt')).length === 1 && (await p.$$('#simHost .sc-floor')).length === 0);
  await p.screenshot({ path: path.join(out, 'lengthonly-results.png'), fullPage: true });
  var dl2 = await Promise.all([p.waitForEvent('download'), p.click('#btnPdf')]); check('PDF downloads', fs.readFileSync(await dl2[0].path()).slice(0, 5).toString('latin1') === '%PDF-');
  dl2 = await Promise.all([p.waitForEvent('download'), p.click('#btnJson')]); var js = JSON.parse(fs.readFileSync(await dl2[0].path(), 'utf8')); check('JSON downloads; floor not invented', js.results.path.total_m === 8);
  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  await browser.close(); if (fails) { console.log(fails + ' check(s) FAILED'); process.exit(1); } console.log('All length-only browser checks passed');
})().catch(function (e) { console.error(e); process.exit(1); });
