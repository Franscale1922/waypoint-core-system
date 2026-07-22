// Decode the QR codes straight out of the FINAL composited deliverables (background.png,
// slide-4-qr.png) through the Zoom-compression matrix. This is the real acceptance test:
// the codes must survive being composited + downscaled + video-compressed.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { URLS } from './tokens.mjs';
import { compress, downscale, decodeZxing } from './qr-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');

// zbar can find multiple symbols in one frame — return ALL decoded strings.
let _zbar = null;
async function decodeAll(buf) {
  if (!_zbar) _zbar = await import('@undecaf/zbar-wasm');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const img = { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height };
  const syms = await _zbar.scanImageData(img);
  return (syms || []).map((s) => s.decode());
}

async function stageBuffers(path, stages) {
  const base = await sharp(path).png().toBuffer();
  const out = [['full 1920x1080', base]];
  for (const [w, h] of stages) {
    out.push([`${w}x${h} clean`, await downscale(base, w, h)]);
    out.push([`${w}x${h} jpeg q30`, await compress(base, w, h, 30)]);
  }
  return out;
}

async function check(name, path, expected, stages) {
  console.log(`\n━━━ ${name} ━━━  (expect: ${expected.join(', ')})`);
  let ok = true;
  for (const [label, buf] of await stageBuffers(path, stages)) {
    // zbar finds ALL codes in the frame; zxing (a second, independent engine) decodes one.
    const found = await decodeAll(buf);
    const allPresent = expected.every((u) => found.includes(u));
    const zx = (await decodeZxing(buf)).text;
    const zxCross = expected.includes(zx); // zxing independently read >=1 expected code
    const pass = allPresent && zxCross;
    if (!pass) ok = false;
    console.log(`  ${label.padEnd(20)} ${pass ? '✓' : '✗'}  zbar[${found.length}]:${found.map((f) => f.replace('https://', '')).join(',')}  zxing:${zxCross ? '✓' : '✗'}`);
  }
  return ok;
}

async function main() {
  let ok = true;
  ok = (await check('background.png', join(OUT, 'background.png'), [URLS.docShort], [[960, 540], [640, 360]])) && ok;
  ok = (await check('slide-4-qr.png', join(OUT, 'slide-4-qr.png'), [URLS.docShort, URLS.booking], [[960, 540]])) && ok;
  console.log(ok ? '\nFinal composited QRs decode on BOTH engines at every stage.' : '\nFinal QR decode FAILED.');
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
