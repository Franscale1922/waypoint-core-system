// Generate the final QR PNGs locally (no hosted service, no third-party shortener) and
// decode-verify each written file with BOTH engines, including the 4:2:0 JPEG compression
// pass. Writes to out/. Run: node build-qr.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { URLS, QR_SIZES, CANVAS } from './tokens.mjs';
import { makeQR, decodeBoth, compositeOnCanvas, downscale, compress } from './qr-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const mark = (v) => (v === true ? '✓' : v === false ? '✗' : '·');

// name -> file. Doc QR encodes the /guide short redirect everywhere. Two doc renders
// (slide + smaller background) so each is crisp at its native display size.
const TARGETS = [
  { name: 'qr-doc', url: URLS.docShort, px: QR_SIZES.slideDoc, use: 'slide 4 (dominant)' },
  { name: 'qr-booking', url: URLS.booking, px: QR_SIZES.slideBooking, use: 'slide 4 (secondary)' },
  { name: 'qr-doc-bg', url: URLS.docShort, px: QR_SIZES.backgroundDoc, use: 'virtual background' },
];

async function verifyFile(url, buf, stages) {
  const rows = [];
  let r = await decodeBoth(buf, url);
  rows.push(['standalone', r.zbarOk, r.zxingOk]);
  const comp = await compositeOnCanvas(buf, CANVAS.width, CANVAS.height, 200, 200);
  r = await decodeBoth(comp, url);
  rows.push(['composite 1920x1080', r.zbarOk, r.zxingOk]);
  for (const [w, h] of stages) {
    r = await decodeBoth(await downscale(comp, w, h), url);
    rows.push([`${w}x${h} clean`, r.zbarOk, r.zxingOk]);
    r = await decodeBoth(await compress(comp, w, h, 30), url); // worst-case q30
    rows.push([`${w}x${h} jpeg q30`, r.zbarOk, r.zxingOk]);
  }
  return rows;
}

async function main() {
  let allOk = true;
  for (const t of TARGETS) {
    const { buffer, version, totalModules, scale, sizePx } = await makeQR(t.url, t.px);
    const outPath = join(OUT, `${t.name}.png`);
    await writeFile(outPath, buffer);
    console.log(`\n━━━ ${t.name}.png (${t.use}) ━━━`);
    console.log(`  ${t.url}`);
    console.log(`  version ${version} · ${totalModules} modules · ${scale}px/module · ${sizePx}px · written`);
    const stages = t.name === 'qr-doc-bg' ? [[960, 540], [640, 360]] : [[960, 540]];
    const rows = await verifyFile(t.url, buffer, stages);
    for (const [label, zb, zx] of rows) {
      console.log(`  ${label.padEnd(20)} zbar ${mark(zb)}  zxing ${mark(zx)}`);
      if (zb !== true || zx !== true) allOk = false; // both engines must agree at every stage
    }
  }
  console.log(allOk ? '\nAll QR files written and verified on BOTH decoders at every stage.' : '\nQR verification FAILED.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
