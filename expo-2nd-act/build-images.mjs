// Render HTML/CSS templates to exact 1920x1080 PNGs via Playwright (headless Chromium),
// then normalize with sharp to guarantee sRGB (ICC attached) + no alpha + exact size.
// Fonts are the vendored Inter/Playfair, guaranteed by @font-face + document.fonts.load gating.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COLORS, CANVAS } from './tokens.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const T = (name) => 'file://' + join(__dirname, 'templates', name);
const OUT = join(__dirname, 'out');

// Asset manifest. Slides are added as they are designed (Phase 5). bg = flatten color.
const ASSETS = [
  // Final deliverables
  { name: 'background', template: 'background.html', out: 'background.png', bg: '#0c1929' },
  { name: 'slide-1-intro', template: 'slide-1-intro.html', out: 'slide-1-intro.png', bg: '#FAF8F4' },
  { name: 'slide-2-method', template: 'slide-2-method.html', out: 'slide-2-method.png', bg: '#FAF8F4' },
  { name: 'slide-3-questions', template: 'slide-3-questions.html', out: 'slide-3-questions.png', bg: '#FAF8F4' },
  { name: 'slide-4-qr', template: 'slide-4-qr.html', out: 'slide-4-qr.png', bg: '#FAF8F4' },
  // Utility / drafts
  { name: 'calibration-grid', template: 'calibration-grid.html', out: 'calibration-grid.png', bg: '#ffffff' },
  { name: 'draft-background', template: 'draft-background.html', out: 'draft-background.png', bg: '#FAF8F4' },
  { name: 'preview-background', template: 'preview-background.html', out: 'preview-background.png', bg: '#0c1929' },
  { name: 'preview-background-v2', template: 'preview-background-v2.html', out: 'preview-background-v2.png', bg: '#0c1929' },
];

// Critical font weights every template may use — gate the screenshot until they are laid out.
const FONT_CHECKS = [
  '900 100px "Playfair Display"', '800 100px "Playfair Display"', '700 100px "Playfair Display"',
  '400 100px "Playfair Display"', '700 100px "Inter"', '600 100px "Inter"',
  '500 100px "Inter"', '400 100px "Inter"',
];

async function waitFonts(page) {
  await page.evaluate(async (checks) => {
    await Promise.all(checks.map((c) => document.fonts.load(c)));
    await document.fonts.ready;
  }, FONT_CHECKS);
}

async function normalize(pngBuffer, outPath, bg) {
  await sharp(pngBuffer)
    .flatten({ background: bg })        // composite away any alpha -> opaque 3-channel
    .toColourspace('srgb')              // explicit sRGB output interpretation
    .withIccProfile('srgb')             // attach sRGB ICC profile to metadata
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);

  const m = await sharp(outPath).metadata();
  const ok =
    m.width === CANVAS.width && m.height === CANVAS.height &&
    m.hasAlpha === false && m.channels === 3 &&
    m.space === 'srgb' && !!m.icc;
  return { ok, m };
}

async function fontSmokeTest(context) {
  const page = await context.newPage();
  await page.goto(T('_font-smoke.html'), { waitUntil: 'load' });
  await waitFonts(page);
  const r = await page.evaluate(() => {
    const w = (id) => document.getElementById(id).getBoundingClientRect().width;
    return {
      pfCustom: w('pf-custom'), pfFallbk: w('pf-fallbk'),
      inCustom: w('in-custom'), inFallbk: w('in-fallbk'),
      pfLoaded: document.fonts.check('900 100px "Playfair Display"'),
      inLoaded: document.fonts.check('700 100px "Inter"'),
    };
  });
  await page.close();
  // If a custom face silently fell back to the generic family, widths would match.
  const pfDistinct = Math.abs(r.pfCustom - r.pfFallbk) > 2;
  const inDistinct = Math.abs(r.inCustom - r.inFallbk) > 2;
  const pass = r.pfLoaded && r.inLoaded && pfDistinct && inDistinct;
  console.log('── font smoke test ──');
  console.log(`  Playfair loaded=${r.pfLoaded} widths custom=${r.pfCustom.toFixed(1)} vs serif-fallback=${r.pfFallbk.toFixed(1)} distinct=${pfDistinct}`);
  console.log(`  Inter    loaded=${r.inLoaded} widths custom=${r.inCustom.toFixed(1)} vs sans-fallback=${r.inFallbk.toFixed(1)} distinct=${inDistinct}`);
  console.log(`  => ${pass ? 'PASS (vendored fonts render)' : 'FAIL (font fell back!)'}`);
  return pass;
}

async function render(context, asset) {
  const page = await context.newPage();
  await page.goto(T(asset.template), { waitUntil: 'load' });
  await waitFonts(page);
  const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: CANVAS.width, height: CANVAS.height } });
  await page.close();
  const outPath = join(OUT, asset.out);
  const { ok, m } = await normalize(shot, outPath, asset.bg);
  console.log(`  ${asset.out.padEnd(24)} ${m.width}x${m.height} space=${m.space} alpha=${m.hasAlpha} ch=${m.channels} icc=${!!m.icc} ${ok ? '✓' : '✗ FAIL'}`);
  return ok;
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;
  const list = only ? ASSETS.filter((a) => a.name === only) : ASSETS;
  if (only && !list.length) { console.error(`No asset named "${only}". Known: ${ASSETS.map(a => a.name).join(', ')}`); process.exit(1); }

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const context = await browser.newContext({ viewport: { width: CANVAS.width, height: CANVAS.height }, deviceScaleFactor: 1 });

  let allOk = true;
  const smoke = await fontSmokeTest(context);
  allOk = allOk && smoke;

  console.log('── render ──');
  for (const asset of list) {
    const ok = await render(context, asset);
    allOk = allOk && ok;
  }

  await browser.close();
  console.log(allOk ? '\nAll assets rendered and verified.' : '\nSome assets FAILED verification.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
