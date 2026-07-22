// Shared QR helpers: local generation (qrcode) + dual-decoder verification
// (@undecaf/zbar-wasm primary, @zxing/library cross-check) fed from raw RGBA via sharp.
import QRCode from 'qrcode';
import sharp from 'sharp';
import { COLORS } from './tokens.mjs';

// Generate a crisp QR PNG buffer at (or just above) a target pixel size.
// Uses an INTEGER pixels-per-module scale so modules stay square with no anti-alias blur.
// ECC level H, quiet zone = 4 modules (brief spec).
export async function makeQR(url, targetPx) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const modules = qr.modules.size; // symbol modules (no quiet zone)
  const margin = 4; // quiet zone in modules
  const totalModules = modules + margin * 2;
  const scale = Math.max(1, Math.round(targetPx / totalModules));
  const sizePx = scale * totalModules;
  const buffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    margin,
    scale,
    color: { dark: COLORS.qrDark + 'ff', light: COLORS.qrLight + 'ff' },
    type: 'png',
  });
  return { buffer, version: qr.version, modules, totalModules, scale, sizePx };
}

// Extract raw RGBA from any PNG/JPEG buffer.
async function toRGBA(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// --- Decoder 1: zbar-wasm (primary; strongest on compression blur) ---
let _zbar = null;
async function zbar() {
  if (!_zbar) _zbar = await import('@undecaf/zbar-wasm');
  return _zbar;
}
export async function decodeZbar(buf) {
  const { data, width, height } = await toRGBA(buf);
  const { scanImageData } = await zbar();
  const img = { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width, height };
  const symbols = await scanImageData(img);
  if (symbols && symbols.length) return symbols[0].decode();
  return null;
}

// --- Decoder 2: @zxing/library (independent cross-check) ---
let _zxing = null;
async function zxing() {
  if (_zxing === null) {
    try {
      const mod = await import('@zxing/library');
      // In this ESM build (0.23.0) the core classes are only exposed under `default`.
      const src = mod.RGBLuminanceSource ? mod : mod.default;
      _zxing = src && src.RGBLuminanceSource ? src : false;
    } catch (e) {
      _zxing = false; // mark unavailable
    }
  }
  return _zxing;
}
export async function decodeZxing(buf) {
  const lib = await zxing();
  if (!lib) return { ok: null, text: null, note: 'zxing-unavailable' };
  // zxing wants a 1-byte-per-pixel luminance buffer (length === w*h). Build it from RGBA.
  const { data, width, height } = await toRGBA(buf);
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
    lum[i] = (data[j] * 306 + data[j + 1] * 601 + data[j + 2] * 117) >> 10; // ~0.299/0.587/0.114
  }
  // zxing logs its own decode-miss stack traces straight to stderr; filter just those.
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => {
    const s = typeof chunk === 'string' ? chunk : chunk.toString();
    if (s.includes('MultiFormatReader') || s.includes('@zxing/library') || s.includes('ReaderException')) {
      const cb = rest[rest.length - 1];
      if (typeof cb === 'function') cb();
      return true;
    }
    return origWrite(chunk, ...rest);
  };
  try {
    const source = new lib.RGBLuminanceSource(lum, width, height);
    const bitmap = new lib.BinaryBitmap(new lib.HybridBinarizer(source));
    const reader = new lib.MultiFormatReader();
    const hints = new Map();
    hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [lib.BarcodeFormat.QR_CODE]);
    hints.set(lib.DecodeHintType.TRY_HARDER, true);
    const result = reader.decode(bitmap, hints);
    return { ok: true, text: result.getText() };
  } catch (e) {
    return { ok: false, text: null };
  } finally {
    process.stderr.write = origWrite;
  }
}

// Simulate Zoom video: lanczos downscale, then lossy JPEG at 4:2:0 chroma subsampling
// (mirrors H.264 chroma decimation — this is what actually attacks QR module edges).
export async function compress(buf, w, h, quality) {
  return sharp(buf)
    .resize(w, h, { kernel: 'lanczos3' })
    .jpeg({ quality, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

// Clean downscale (no JPEG) for the baseline comparison.
export async function downscale(buf, w, h) {
  return sharp(buf).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
}

// Composite a QR PNG onto a flat cream canvas at an integer offset (module-aligned crisp).
export async function compositeOnCanvas(qrBuf, canvasW, canvasH, qrLeft, qrTop, bg = COLORS.creamLight) {
  const base = sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: bg },
  });
  return base.composite([{ input: qrBuf, left: qrLeft, top: qrTop }]).png().toBuffer();
}

// Decode with BOTH engines; returns agreement against the expected string.
export async function decodeBoth(buf, expected) {
  const zb = await decodeZbar(buf).catch(() => null);
  const zx = await decodeZxing(buf);
  const zbOk = zb === expected;
  // null ONLY when the engine is unavailable; a real decode failure is false.
  const zxOk = zx.ok === null ? null : zx.text === expected;
  return { zbar: zb, zbarOk: zbOk, zxing: zx.text, zxingOk: zxOk, zxingNote: zx.note };
}
