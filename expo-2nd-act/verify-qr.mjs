// QR verification matrix. Decodes each QR with TWO independent engines
// (zbar-wasm + zxing) at every size, both as a clean downscale AND through a
// 4:2:0 JPEG round-trip that simulates Zoom's video compression.
// Doubles as the Phase-1 density test: compares the long Doc URL vs the
// first-party redirect candidate at background size.
import { URLS, QR_SIZES, CANVAS } from './tokens.mjs';
import { makeQR, decodeBoth, compositeOnCanvas, downscale, compress } from './qr-lib.mjs';
// (zxing's internal decode-miss traces are filtered at the stderr level inside qr-lib.)

const JPEG_QUALITIES = [70, 45, 30];
const mark = (v) => (v === true ? '✓' : v === false ? '✗' : '·'); // · = engine n/a

const CASES = [
  { name: 'doc-background', url: URLS.doc, px: QR_SIZES.backgroundDoc, stages: [[960, 540], [640, 360]] },
  { name: 'redirect-background', url: URLS.redirectCandidate, px: QR_SIZES.backgroundDoc, stages: [[960, 540], [640, 360]] },
  { name: 'doc-slide', url: URLS.doc, px: QR_SIZES.slideDoc, stages: [[960, 540]] },
  { name: 'booking-slide', url: URLS.booking, px: QR_SIZES.slideBooking, stages: [[960, 540]] },
];

async function run() {
  let allCriticalPass = true;
  const summary = [];

  for (const c of CASES) {
    const { buffer, version, totalModules, scale, sizePx } = await makeQR(c.url, c.px);
    console.log(`\n━━━ ${c.name} ━━━`);
    console.log(`  url len ${c.url.length} · QR version ${version} · ${totalModules} modules · ${scale}px/module · rendered ${sizePx}px`);

    // (a) standalone
    let r = await decodeBoth(buffer, c.url);
    console.log(`  standalone            zbar ${mark(r.zbarOk)}  zxing ${mark(r.zxingOk)}`);

    // (b) composited onto 1920x1080 cream canvas
    const comp = await compositeOnCanvas(buffer, CANVAS.width, CANVAS.height, 200, 200);
    r = await decodeBoth(comp, c.url);
    console.log(`  composite 1920x1080   zbar ${mark(r.zbarOk)}  zxing ${mark(r.zxingOk)}`);

    // (c/d) downscale stages, clean + JPEG sweep
    let worstStagePass = true;
    let lowestGoodQuality = {};
    for (const [w, h] of c.stages) {
      const clean = await downscale(comp, w, h);
      const rc = await decodeBoth(clean, c.url);
      console.log(`  ${w}x${h} clean          zbar ${mark(rc.zbarOk)}  zxing ${mark(rc.zxingOk)}`);
      let passedAnyJpeg = false;
      for (const q of JPEG_QUALITIES) {
        const jc = await compress(comp, w, h, q);
        const rj = await decodeBoth(jc, c.url);
        const pass = rj.zbarOk === true; // zbar is the primary gate
        if (pass) { passedAnyJpeg = true; lowestGoodQuality[`${w}x${h}`] = q; }
        console.log(`  ${w}x${h} jpeg q${String(q).padStart(2)}      zbar ${mark(rj.zbarOk)}  zxing ${mark(rj.zxingOk)}${pass ? '' : '   <-- FAIL'}`);
      }
      if (!passedAnyJpeg) worstStagePass = false;
    }
    summary.push({ name: c.name, worstStagePass, lowestGoodQuality });
    // background cases are the critical scannability gate
    if (c.name.endsWith('background') && c.name.startsWith('doc') && !worstStagePass) allCriticalPass = false;
  }

  console.log('\n════════ SUMMARY ════════');
  for (const s of summary) {
    console.log(`  ${s.name.padEnd(20)} ${s.worstStagePass ? 'DECODES under compression' : 'FAILS under compression'}  ${JSON.stringify(s.lowestGoodQuality)}`);
  }
  console.log('\nInterpretation: lowestGoodQuality = lowest JPEG quality at which zbar still decoded (lower = more robust margin).');
}

run().catch((e) => { console.error(e); process.exit(1); });
