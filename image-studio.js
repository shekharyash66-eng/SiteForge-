/**
 * SiteForge Image Studio & Decorative SVG Library (image-studio.js)
 * - Accepts PNG, JPG, WebP up to 10 MB and auto-compresses via Canvas (WebP with JPEG fallback) <= 500 KB
 * - SVG capped at 500 KB and strictly sanitized
 * - Pure JS JPEG EXIF Orientation (1-8) parser & fixer
 * - Crop (free, 1:1, 4:3, 16:9, 3:2, 2:3, 9:16), Rotate, Flip, Focal Point, Alt text, Width/Height
 * - 40 theme-adaptive inline SVG backgrounds & illustrations
 */

import {
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_RASTER_BYTES,
  isSvgSafe,
  utf8ToBase64,
} from './validators.js';
import { blobToDataUrl } from './zip.js';

export const CROP_ASPECT_RATIOS = [
  { id: 'free', label: 'Free', ratio: 0 },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3 },
  { id: '16:9', label: '16:9 Wide', ratio: 16 / 9 },
  { id: '3:2', label: '3:2 Photo', ratio: 3 / 2 },
  { id: '2:3', label: '2:3 Portrait', ratio: 2 / 3 },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16 },
];

/**
 * Reads JPEG EXIF Orientation tag (1..8) from an ArrayBuffer without any external library.
 */
export function readJpegExifOrientation(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        if (offset + 10 > view.byteLength) return 1;
        if (view.getUint32(offset + 2, false) !== 0x45786966) return 1; // "Exif"
        const tiffStart = offset + 8;
        const little = view.getUint16(tiffStart, false) === 0x4949;
        const firstIfd = view.getUint32(tiffStart + 4, little);
        const dirStart = tiffStart + firstIfd;
        if (dirStart + 2 > view.byteLength) return 1;
        const entries = view.getUint16(dirStart, little);
        for (let i = 0; i < entries; i++) {
          const entryOffset = dirStart + 2 + i * 12;
          if (entryOffset + 12 > view.byteLength) break;
          if (view.getUint16(entryOffset, little) === 0x0112) {
            const val = view.getUint16(entryOffset + 8, little);
            return val >= 1 && val <= 8 ? val : 1;
          }
        }
        return 1;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        const size = view.getUint16(offset, false);
        if (size < 2) break;
        offset += size;
      }
    }
  } catch {
    return 1;
  }
  return 1;
}

/**
 * Loads an HTMLImageElement from a Blob/File or data URL.
 */
export function loadImageElement(srcOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl = '';
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image.'));
    };
    if (srcOrBlob instanceof Blob) {
      objectUrl = URL.createObjectURL(srcOrBlob);
      img.src = objectUrl;
    } else {
      img.src = String(srcOrBlob || '');
    }
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

let cachedWebpSupported = null;
async function supportsWebpEncode() {
  if (cachedWebpSupported !== null) return cachedWebpSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const blob = await canvasToBlob(c, 'image/webp', 0.8);
    cachedWebpSupported = Boolean(blob && blob.type === 'image/webp');
  } catch {
    cachedWebpSupported = false;
  }
  return cachedWebpSupported;
}

/**
 * Draws an image onto a canvas applying EXIF orientation (1..8), user rotation (deg),
 * flipH/flipV, optional normalized crop box { x, y, w, h } (0..1), and max dimension cap.
 */
export async function processImageWithCanvas(
  img,
  {
    exifOrientation = 1,
    rotateDeg = 0,
    flipH = false,
    flipV = false,
    crop = { x: 0, y: 0, w: 1, h: 1 },
    maxDim = 1600,
    quality = 82,
    preferAlphaPng = false,
  } = {}
) {
  // Step 1: Normalize EXIF orientation onto an intermediate canvas
  const natW = img.naturalWidth || img.width || 800;
  const natH = img.naturalHeight || img.height || 600;
  const swapExif = exifOrientation >= 5 && exifOrientation <= 8;
  const normW = swapExif ? natH : natW;
  const normH = swapExif ? natW : natH;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = normW;
  normCanvas.height = normH;
  const nctx = normCanvas.getContext('2d');

  switch (exifOrientation) {
    case 2: nctx.transform(-1, 0, 0, 1, normW, 0); break;
    case 3: nctx.transform(-1, 0, 0, -1, normW, normH); break;
    case 4: nctx.transform(1, 0, 0, -1, 0, normH); break;
    case 5: nctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: nctx.transform(0, 1, -1, 0, normW, 0); break;
    case 7: nctx.transform(0, -1, -1, 0, normW, normH); break;
    case 8: nctx.transform(0, -1, 1, 0, 0, normH); break;
    default: break;
  }
  nctx.drawImage(img, 0, 0);

  // Step 2: Apply user rotate + flip
  const rad = (((rotateDeg % 360) + 360) % 360) * (Math.PI / 180);
  const rightAngle = Math.abs(Math.round(rotateDeg / 90)) % 2 === 1;
  const trW = rightAngle ? normH : normW;
  const trH = rightAngle ? normW : normH;

  const trCanvas = document.createElement('canvas');
  trCanvas.width = trW;
  trCanvas.height = trH;
  const tctx = trCanvas.getContext('2d');
  tctx.translate(trW / 2, trH / 2);
  tctx.rotate(rad);
  tctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  tctx.drawImage(normCanvas, -normW / 2, -normH / 2);

  // Step 3: Crop + Resize to maxDim
  const cx = Math.max(0, Math.min(0.95, Number(crop?.x) || 0));
  const cy = Math.max(0, Math.min(0.95, Number(crop?.y) || 0));
  const cw = Math.max(0.05, Math.min(1 - cx, Number(crop?.w) || 1));
  const ch = Math.max(0.05, Math.min(1 - cy, Number(crop?.h) || 1));

  const sx = Math.round(cx * trW);
  const sy = Math.round(cy * trH);
  const sw = Math.max(1, Math.round(cw * trW));
  const sh = Math.max(1, Math.round(ch * trH));

  let scale = Math.min(1, maxDim / Math.max(sw, sh));
  let outW = Math.max(1, Math.round(sw * scale));
  let outH = Math.max(1, Math.round(sh * scale));

  const webpOk = await supportsWebpEncode();
  const mime = webpOk ? 'image/webp' : preferAlphaPng ? 'image/png' : 'image/jpeg';

  let q = Math.max(0.4, Math.min(0.95, quality / 100));
  let blob = null;

  // Iteratively compress/scale until <= 500 KB
  for (let attempt = 0; attempt < 8; attempt++) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const octx = outCanvas.getContext('2d');
    if (mime === 'image/jpeg') {
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, outW, outH);
    }
    octx.drawImage(trCanvas, sx, sy, sw, sh, 0, 0, outW, outH);
    blob = await canvasToBlob(outCanvas, mime, q);
    if (!blob) break;
    if (blob.size <= MAX_IMAGE_BYTES) break;

    if (q > 0.45 && mime !== 'image/png') {
      q = Math.max(0.4, q - 0.12);
    } else {
      outW = Math.max(240, Math.round(outW * 0.78));
      outH = Math.max(240, Math.round(outH * 0.78));
    }
  }

  if (!blob) {
    throw new Error('Could not encode processed image.');
  }

  const dataUrl = await blobToDataUrl(blob);
  return {
    blob,
    dataUrl,
    width: outW,
    height: outH,
    sizeBytes: blob.size,
    mime: blob.type || mime,
  };
}

/**
 * Validates and compresses any uploaded PNG/JPG/WebP (up to 10 MB) or sanitizes SVG (up to 500 KB).
 */
export async function ingestAndOptimizeUpload(file, options = {}) {
  if (!file) return { ok: false, error: 'No file selected.' };
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);
  const allowedExts = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp']);

  if (!allowedMimes.has(file.type) && !allowedExts.has(ext)) {
    return { ok: false, error: 'Only PNG, JPG, WebP, or SVG images are supported.' };
  }

  const isSvg = file.type === 'image/svg+xml' || ext === 'svg';
  if (isSvg) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: `SVG is ${Math.round(file.size / 1024)} KB. Maximum SVG size is 500 KB.` };
    }
    const text = await file.text();
    if (!isSvgSafe(text)) {
      return {
        ok: false,
        error: 'SVG rejected for security: remove any <script> tags, event handlers (on*), or embedded objects.',
      };
    }
    const blob = new Blob([text], { type: 'image/svg+xml' });
    const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(text);
    // Attempt to parse intrinsic dimensions
    let width = 320;
    let height = 320;
    const vbMatch = text.match(/viewBox=["'][\d.\s-]+?\s+[\d.\s-]+?\s+([\d.]+)\s+([\d.]+)["']/i);
    if (vbMatch) {
      width = Math.round(Number(vbMatch[1]) || 320);
      height = Math.round(Number(vbMatch[2]) || 320);
    }
    return {
      ok: true,
      isSvg: true,
      blob,
      dataUrl,
      fileName: file.name.slice(0, 120),
      originalBytes: file.size,
      sizeBytes: blob.size,
      width,
      height,
      exifOrientation: 1,
    };
  }

  if (file.size > MAX_UPLOAD_RASTER_BYTES) {
    return {
      ok: false,
      error: `Image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum upload size is 10 MB.`,
    };
  }

  try {
    const ab = await file.arrayBuffer();
    const exifOrientation = ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg' ? readJpegExifOrientation(ab) : 1;
    const img = await loadImageElement(file);
    const processed = await processImageWithCanvas(img, {
      exifOrientation,
      quality: options.quality ?? 82,
      maxDim: options.maxDim ?? 1600,
      crop: options.crop,
      rotateDeg: options.rotateDeg ?? 0,
      flipH: Boolean(options.flipH),
      flipV: Boolean(options.flipV),
      preferAlphaPng: file.type === 'image/png',
    });
    return {
      ok: true,
      isSvg: false,
      blob: processed.blob,
      dataUrl: processed.dataUrl,
      fileName: file.name.slice(0, 120),
      originalBytes: file.size,
      sizeBytes: processed.sizeBytes,
      width: processed.width,
      height: processed.height,
      exifOrientation,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not process image file.' };
  }
}

/**
 * 40 offline, theme-adaptive decorative inline-SVG backgrounds and illustrations.
 * Uses CSS variables var(--primary), var(--accent), and var(--border) so every artwork
 * automatically matches all 24 themes + custom brand palettes.
 */
const SVG_SPECS = [
  { id: 'blob-organic', name: 'Organic Blob', category: 'Blobs', body: '<path d="M298,42C354,84,372,175,333,234C294,293,198,320,121,291C44,262,-14,177,15,107C44,37,160,-18,236,11C268,23,281,29,298,42Z" fill="var(--primary)" opacity="0.18"/><path d="M262,86C305,118,318,187,288,231C258,275,186,294,129,272C72,250,28,187,50,134C72,81,159,41,216,63Z" fill="var(--accent)" opacity="0.22"/>' },
  { id: 'blob-twin', name: 'Twin Pebbles', category: 'Blobs', body: '<circle cx="120" cy="140" r="95" fill="var(--primary)" opacity="0.16"/><ellipse cx="285" cy="185" rx="95" ry="70" transform="rotate(-18 285 185)" fill="var(--accent)" opacity="0.22"/><circle cx="215" cy="95" r="34" fill="var(--primary)" opacity="0.28"/>' },
  { id: 'blob-cloud', name: 'Soft Cloud', category: 'Blobs', body: '<path d="M85,235h225a55,55 0 0 0 8-109a78,78 0 0 0-150-24a62,62 0 0 0-83,133Z" fill="var(--primary)" opacity="0.16"/><path d="M115,245h190a40,40 0 0 0 6-79a58,58 0 0 0-112-16a46,46 0 0 0-84,95Z" fill="var(--accent)" opacity="0.2"/>' },
  { id: 'blob-fluid', name: 'Fluid Drop', category: 'Blobs', body: '<path d="M200,25C265,95,340,145,325,220C310,295,215,310,135,280C55,250,45,160,95,95C130,50,175,10,200,25Z" fill="var(--primary)" opacity="0.18"/><circle cx="205" cy="175" r="58" fill="none" stroke="var(--accent)" stroke-width="4" opacity="0.45"/>' },
  { id: 'blob-ribbon', name: 'Ribbon Swirl', category: 'Blobs', body: '<path d="M20,220 C110,80 190,290 380,90" fill="none" stroke="var(--primary)" stroke-width="34" stroke-linecap="round" opacity="0.18"/><path d="M30,150 C140,260 240,40 370,190" fill="none" stroke="var(--accent)" stroke-width="18" stroke-linecap="round" opacity="0.28"/>' },
  { id: 'blob-halo', name: 'Layered Halo', category: 'Blobs', body: '<circle cx="200" cy="160" r="128" fill="var(--primary)" opacity="0.1"/><circle cx="200" cy="160" r="92" fill="var(--accent)" opacity="0.14"/><circle cx="200" cy="160" r="56" fill="var(--primary)" opacity="0.22"/><circle cx="200" cy="160" r="22" fill="var(--accent)" opacity="0.4"/>' },
  { id: 'blob-splash', name: 'Studio Splash', category: 'Blobs', body: '<path d="M70,190 C50,100 160,30 250,70 C340,110 360,210 290,260 C220,310 90,280 70,190 Z" fill="var(--primary)" opacity="0.15"/><circle cx="330" cy="80" r="20" fill="var(--accent)" opacity="0.35"/><circle cx="75" cy="75" r="14" fill="var(--primary)" opacity="0.32"/><circle cx="345" cy="240" r="10" fill="var(--primary)" opacity="0.28"/>' },
  { id: 'blob-arch', name: 'Editorial Arch', category: 'Blobs', body: '<path d="M90,290 V135 A110,110 0 0 1 310,135 V290 Z" fill="var(--primary)" opacity="0.16"/><path d="M125,290 V155 A75,75 0 0 1 275,155 V290 Z" fill="none" stroke="var(--accent)" stroke-width="3" opacity="0.5"/>' },

  { id: 'wave-layered', name: 'Layered Waves', category: 'Waves', body: '<path d="M0,180 Q100,120 200,180 T400,180 V320 H0 Z" fill="var(--primary)" opacity="0.18"/><path d="M0,220 Q100,165 200,220 T400,220 V320 H0 Z" fill="var(--accent)" opacity="0.24"/><path d="M0,260 Q120,220 240,260 T400,260 V320 H0 Z" fill="var(--primary)" opacity="0.3"/>' },
  { id: 'wave-contour', name: 'Topographic Lines', category: 'Waves', body: '<path d="M0,70 Q100,30 200,80 T400,60" fill="none" stroke="var(--primary)" stroke-width="2.5" opacity="0.32"/><path d="M0,120 Q110,75 210,130 T400,110" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity="0.36"/><path d="M0,175 Q120,130 220,185 T400,165" fill="none" stroke="var(--primary)" stroke-width="2.5" opacity="0.32"/><path d="M0,230 Q100,185 210,235 T400,215" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity="0.28"/>' },
  { id: 'wave-sine', name: 'Acoustic Sine', category: 'Waves', body: '<path d="M10,160 C60,40 120,280 180,160 C240,40 300,280 390,160" fill="none" stroke="var(--primary)" stroke-width="8" stroke-linecap="round" opacity="0.32"/><path d="M10,160 C70,90 130,230 190,160 C250,90 310,230 390,160" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity="0.45"/>' },
  { id: 'wave-horizon', name: 'Horizon Swell', category: 'Waves', body: '<circle cx="200" cy="140" r="62" fill="var(--accent)" opacity="0.25"/><path d="M0,190 C90,150 160,220 260,180 C320,156 360,175 400,195 V320 H0 Z" fill="var(--primary)" opacity="0.24"/>' },
  { id: 'wave-hills', name: 'Rolling Hills', category: 'Waves', body: '<path d="M0,250 Q90,140 195,220 T400,190 V320 H0 Z" fill="var(--primary)" opacity="0.2"/><path d="M0,280 Q130,170 255,250 T400,230 V320 H0 Z" fill="var(--accent)" opacity="0.28"/>' },
  { id: 'wave-dunes', name: 'Desert Dunes', category: 'Waves', body: '<path d="M0,210 C120,120 220,260 400,140 V320 H0 Z" fill="var(--primary)" opacity="0.18"/><path d="M0,255 C140,180 260,290 400,200 V320 H0 Z" fill="var(--accent)" opacity="0.26"/>' },
  { id: 'wave-ripple', name: 'Water Ripples', category: 'Waves', body: '<ellipse cx="200" cy="175" rx="165" ry="70" fill="none" stroke="var(--primary)" stroke-width="2" opacity="0.22"/><ellipse cx="200" cy="175" rx="125" ry="52" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity="0.32"/><ellipse cx="200" cy="175" rx="82" ry="34" fill="none" stroke="var(--primary)" stroke-width="3" opacity="0.42"/><ellipse cx="200" cy="175" rx="38" ry="16" fill="var(--accent)" opacity="0.3"/>' },
  { id: 'wave-crest', name: 'Diagonal Crest', category: 'Waves', body: '<path d="M0,320 L0,140 Q180,220 400,60 L400,320 Z" fill="var(--primary)" opacity="0.16"/><path d="M0,320 L0,210 Q210,270 400,130 L400,320 Z" fill="var(--accent)" opacity="0.22"/>' },

  { id: 'pat-dots', name: 'Dot Matrix', category: 'Patterns', body: '<g fill="var(--primary)" opacity="0.32"><circle cx="50" cy="50" r="6"/><circle cx="110" cy="50" r="6"/><circle cx="170" cy="50" r="6"/><circle cx="230" cy="50" r="6"/><circle cx="290" cy="50" r="6"/><circle cx="350" cy="50" r="6"/><circle cx="50" cy="110" r="6"/><circle cx="110" cy="110" r="10"/><circle cx="170" cy="110" r="10"/><circle cx="230" cy="110" r="10"/><circle cx="290" cy="110" r="6"/><circle cx="350" cy="110" r="6"/><circle cx="50" cy="170" r="6"/><circle cx="110" cy="170" r="10"/><circle cx="170" cy="170" r="14" fill="var(--accent)"/><circle cx="230" cy="170" r="14" fill="var(--accent)"/><circle cx="290" cy="170" r="10"/><circle cx="350" cy="170" r="6"/><circle cx="50" cy="230" r="6"/><circle cx="110" cy="230" r="6"/><circle cx="170" cy="230" r="10"/><circle cx="230" cy="230" r="10"/><circle cx="290" cy="230" r="6"/><circle cx="350" cy="230" r="6"/></g>' },
  { id: 'pat-grid', name: 'Blueprint Grid', category: 'Patterns', body: '<g stroke="var(--primary)" stroke-width="1.5" opacity="0.24"><line x1="40" y1="20" x2="40" y2="300"/><line x1="100" y1="20" x2="100" y2="300"/><line x1="160" y1="20" x2="160" y2="300"/><line x1="220" y1="20" x2="220" y2="300"/><line x1="280" y1="20" x2="280" y2="300"/><line x1="340" y1="20" x2="340" y2="300"/><line x1="20" y1="60" x2="380" y2="60"/><line x1="20" y1="120" x2="380" y2="120"/><line x1="20" y1="180" x2="380" y2="180"/><line x1="20" y1="240" x2="380" y2="240"/></g><rect x="100" y="60" width="120" height="120" fill="var(--accent)" opacity="0.18"/><rect x="220" y="180" width="60" height="60" fill="var(--primary)" opacity="0.28"/>' },
  { id: 'pat-stripes', name: 'Diagonal Stripes', category: 'Patterns', body: '<g stroke="var(--primary)" stroke-width="14" opacity="0.16"><line x1="-20" y1="80" x2="120" y2="-40"/><line x1="-20" y1="160" x2="200" y2="-40"/><line x1="-20" y1="240" x2="280" y2="-40"/><line x1="-20" y1="320" x2="360" y2="-40"/><line x1="40" y1="340" x2="420" y2="0"/><line x1="120" y1="340" x2="420" y2="80"/><line x1="200" y1="340" x2="420" y2="160"/></g>' },
  { id: 'pat-checker', name: 'Soft Blocks', category: 'Patterns', body: '<g opacity="0.22"><rect x="40" y="40" width="72" height="72" rx="12" fill="var(--primary)"/><rect x="184" y="40" width="72" height="72" rx="12" fill="var(--accent)"/><rect x="112" y="112" width="72" height="72" rx="12" fill="var(--primary)"/><rect x="256" y="112" width="72" height="72" rx="12" fill="var(--accent)"/><rect x="40" y="184" width="72" height="72" rx="12" fill="var(--accent)"/><rect x="184" y="184" width="72" height="72" rx="12" fill="var(--primary)"/></g>' },
  { id: 'pat-plus', name: 'Swiss Crosses', category: 'Patterns', body: '<g stroke="var(--primary)" stroke-width="4" stroke-linecap="round" opacity="0.32"><path d="M60,55v24M48,67h24M160,55v24M148,67h24M260,55v24M248,67h24M340,55v24M328,67h24M110,145v24M98,157h24M210,145v24M198,157h24M310,145v24M298,157h24M60,235v24M48,247h24M160,235v24M148,247h24M260,235v24M248,247h24"/></g>' },
  { id: 'pat-hex', name: 'Hexagon Mesh', category: 'Patterns', body: '<g fill="none" stroke="var(--primary)" stroke-width="2.5" opacity="0.3"><polygon points="100,40 140,63 140,109 100,132 60,109 60,63"/><polygon points="180,40 220,63 220,109 180,132 140,109 140,63" fill="var(--accent)" fill-opacity="0.16"/><polygon points="260,40 300,63 300,109 260,132 220,109 220,63"/><polygon points="140,109 180,132 180,178 140,201 100,178 100,132"/><polygon points="220,109 260,132 260,178 220,201 180,178 180,132" fill="var(--primary)" fill-opacity="0.15"/><polygon points="180,178 220,201 220,247 180,270 140,247 140,201"/></g>' },
  { id: 'pat-chevron', name: 'Chevron Rhythm', category: 'Patterns', body: '<g fill="none" stroke="var(--primary)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"><polyline points="30,90 110,45 190,90 270,45 350,90"/><polyline points="30,155 110,110 190,155 270,110 350,155" stroke="var(--accent)"/><polyline points="30,220 110,175 190,220 270,175 350,220"/></g>' },
  { id: 'pat-arc', name: 'Bauhaus Arcs', category: 'Patterns', body: '<path d="M40,160 A100,100 0 0 1 240,160 Z" fill="var(--primary)" opacity="0.2"/><path d="M160,160 A100,100 0 0 0 360,160 Z" fill="var(--accent)" opacity="0.24"/><circle cx="140" cy="220" r="46" fill="var(--accent)" opacity="0.2"/><circle cx="260" cy="96" r="32" fill="var(--primary)" opacity="0.26"/>' },

  { id: 'abs-geo', name: 'Geometric Composition', category: 'Abstract', body: '<rect x="55" y="45" width="140" height="140" rx="22" fill="var(--primary)" opacity="0.18"/><circle cx="260" cy="175" r="82" fill="var(--accent)" opacity="0.22"/><polygon points="180,90 265,250 95,250" fill="none" stroke="var(--primary)" stroke-width="4" opacity="0.45"/>' },
  { id: 'abs-orbit', name: 'Orbital Rings', category: 'Abstract', body: '<ellipse cx="200" cy="160" rx="155" ry="52" transform="rotate(-22 200 160)" fill="none" stroke="var(--primary)" stroke-width="3" opacity="0.35"/><ellipse cx="200" cy="160" rx="155" ry="52" transform="rotate(22 200 160)" fill="none" stroke="var(--accent)" stroke-width="3" opacity="0.35"/><circle cx="200" cy="160" r="34" fill="var(--primary)" opacity="0.28"/><circle cx="328" cy="112" r="12" fill="var(--accent)" opacity="0.65"/><circle cx="82" cy="212" r="9" fill="var(--primary)" opacity="0.55"/>' },
  { id: 'abs-prism', name: 'Crystal Prism', category: 'Abstract', body: '<polygon points="200,30 330,130 280,280 120,280 70,130" fill="var(--primary)" opacity="0.14"/><polygon points="200,30 330,130 200,165" fill="var(--accent)" opacity="0.24"/><polygon points="200,30 70,130 200,165" fill="var(--primary)" opacity="0.22"/><polygon points="200,165 280,280 120,280" fill="var(--accent)" opacity="0.18"/>' },
  { id: 'abs-burst', name: 'Sunburst Rays', category: 'Abstract', body: '<g stroke="var(--primary)" stroke-width="3" stroke-linecap="round" opacity="0.32"><line x1="200" y1="30" x2="200" y2="80"/><line x1="200" y1="240" x2="200" y2="290"/><line x1="70" y1="160" x2="120" y2="160"/><line x1="280" y1="160" x2="330" y2="160"/><line x1="108" y1="68" x2="144" y2="104"/><line x1="256" y1="216" x2="292" y2="252"/><line x1="292" y1="68" x2="256" y2="104"/><line x1="144" y1="216" x2="108" y2="252"/></g><circle cx="200" cy="160" r="56" fill="var(--accent)" opacity="0.25"/><circle cx="200" cy="160" r="28" fill="var(--primary)" opacity="0.35"/>' },
  { id: 'abs-cards', name: 'Floating Cards', category: 'Abstract', body: '<rect x="55" y="75" width="160" height="110" rx="16" fill="var(--primary)" opacity="0.16" transform="rotate(-7 135 130)"/><rect x="155" y="95" width="180" height="125" rx="16" fill="var(--accent)" opacity="0.22" transform="rotate(6 245 157)"/><rect x="115" y="135" width="170" height="115" rx="16" fill="var(--primary)" opacity="0.26"/>' },
  { id: 'abs-steps', name: 'Ascending Steps', category: 'Abstract', body: '<rect x="45" y="210" width="60" height="70" rx="10" fill="var(--primary)" opacity="0.18"/><rect x="125" y="165" width="60" height="115" rx="10" fill="var(--accent)" opacity="0.24"/><rect x="205" y="115" width="60" height="165" rx="10" fill="var(--primary)" opacity="0.28"/><rect x="285" y="65" width="60" height="215" rx="10" fill="var(--accent)" opacity="0.34"/>' },
  { id: 'abs-rings', name: 'Interlocking Rings', category: 'Abstract', body: '<circle cx="155" cy="160" r="82" fill="none" stroke="var(--primary)" stroke-width="14" opacity="0.25"/><circle cx="245" cy="160" r="82" fill="none" stroke="var(--accent)" stroke-width="14" opacity="0.28"/>' },
  { id: 'abs-frame', name: 'Corner Frame', category: 'Abstract', body: '<path d="M40,120 V40 H120 M280,40 H360 V120 M360,200 V280 H280 M120,280 H40 V200" fill="none" stroke="var(--primary)" stroke-width="6" stroke-linecap="round" opacity="0.35"/><rect x="95" y="85" width="210" height="150" rx="14" fill="var(--accent)" opacity="0.14"/>' },

  { id: 'ill-workspace', name: 'Desk & Browser', category: 'Illustrations', body: '<rect x="55" y="55" width="290" height="195" rx="16" fill="var(--primary)" opacity="0.14" stroke="var(--primary)" stroke-width="3" stroke-opacity="0.35"/><line x1="55" y1="95" x2="345" y2="95" stroke="var(--primary)" stroke-width="2" opacity="0.3"/><circle cx="80" cy="75" r="5" fill="var(--accent)"/><circle cx="98" cy="75" r="5" fill="var(--primary)" opacity="0.5"/><rect x="80" y="116" width="110" height="18" rx="6" fill="var(--primary)" opacity="0.35"/><rect x="80" y="146" width="85" height="10" rx="5" fill="var(--accent)" opacity="0.35"/><rect x="80" y="168" width="95" height="10" rx="5" fill="var(--primary)" opacity="0.22"/><rect x="215" y="116" width="105" height="105" rx="12" fill="var(--accent)" opacity="0.24"/>' },
  { id: 'ill-mobile', name: 'Mobile Showcase', category: 'Illustrations', body: '<rect x="135" y="30" width="130" height="255" rx="24" fill="var(--primary)" opacity="0.16" stroke="var(--primary)" stroke-width="3" stroke-opacity="0.4"/><rect x="175" y="45" width="50" height="6" rx="3" fill="var(--primary)" opacity="0.4"/><rect x="155" y="75" width="90" height="65" rx="10" fill="var(--accent)" opacity="0.32"/><rect x="155" y="158" width="90" height="12" rx="6" fill="var(--primary)" opacity="0.35"/><rect x="155" y="182" width="65" height="10" rx="5" fill="var(--primary)" opacity="0.22"/><rect x="155" y="216" width="90" height="32" rx="16" fill="var(--accent)" opacity="0.4"/>' },
  { id: 'ill-chart', name: 'Growth Chart', category: 'Illustrations', body: '<line x1="55" y1="255" x2="345" y2="255" stroke="var(--primary)" stroke-width="3" opacity="0.35"/><polyline points="65,220 135,175 195,195 265,115 335,75" fill="none" stroke="var(--primary)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/><circle cx="135" cy="175" r="8" fill="var(--accent)"/><circle cx="265" cy="115" r="8" fill="var(--accent)"/><circle cx="335" cy="75" r="11" fill="var(--primary)"/>' },
  { id: 'ill-botanical', name: 'Botanical Leaves', category: 'Illustrations', body: '<path d="M200,285 Q195,180 205,65" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" opacity="0.45"/><path d="M200,220 C130,210 105,155 155,135 C185,125 200,175 200,220 Z" fill="var(--primary)" opacity="0.25"/><path d="M202,165 C270,155 295,100 245,80 C215,70 202,120 202,165 Z" fill="var(--accent)" opacity="0.3"/><path d="M198,120 C145,105 135,60 175,45 C195,40 200,85 198,120 Z" fill="var(--primary)" opacity="0.22"/>' },
  { id: 'ill-mountains', name: 'Alpine Peaks', category: 'Illustrations', body: '<circle cx="305" cy="82" r="30" fill="var(--accent)" opacity="0.35"/><polygon points="25,275 145,95 265,275" fill="var(--primary)" opacity="0.24"/><polygon points="155,275 265,125 375,275" fill="var(--accent)" opacity="0.28"/><polygon points="115,140 145,95 175,140 158,132 145,144 132,132" fill="var(--bg)" opacity="0.65"/>' },
  { id: 'ill-coffee', name: 'Cafe Cup', category: 'Illustrations', body: '<path d="M120,125 H260 V210 A55,55 0 0 1 205,265 H175 A55,55 0 0 1 120,210 Z" fill="var(--primary)" opacity="0.25"/><path d="M260,145 H285 A26,26 0 0 1 285,197 H260" fill="none" stroke="var(--primary)" stroke-width="10" opacity="0.35"/><path d="M155,95 Q145,70 160,55 M190,95 Q180,70 195,55 M225,95 Q215,70 230,55" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity="0.45"/>' },
  { id: 'ill-camera', name: 'Studio Lens', category: 'Illustrations', body: '<rect x="75" y="95" width="250" height="165" rx="22" fill="var(--primary)" opacity="0.2"/><rect x="145" y="65" width="110" height="35" rx="10" fill="var(--primary)" opacity="0.26"/><circle cx="200" cy="178" r="56" fill="var(--accent)" opacity="0.28"/><circle cx="200" cy="178" r="32" fill="var(--primary)" opacity="0.35"/><circle cx="285" cy="128" r="10" fill="var(--accent)" opacity="0.5"/>' },
  { id: 'ill-compass', name: 'Compass Rose', category: 'Illustrations', body: '<circle cx="200" cy="160" r="105" fill="none" stroke="var(--primary)" stroke-width="3" opacity="0.32"/><polygon points="200,62 224,160 200,185 176,160" fill="var(--primary)" opacity="0.45"/><polygon points="200,258 224,160 200,135 176,160" fill="var(--accent)" opacity="0.3"/><circle cx="200" cy="160" r="10" fill="var(--bg)" stroke="var(--primary)" stroke-width="3"/>' },
];

export const DECORATIVE_SVGS = SVG_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  category: spec.category,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320" aria-hidden="true" focusable="false">${spec.body}</svg>`,
}));

export const DECORATIVE_SVG_MAP = Object.fromEntries(DECORATIVE_SVGS.map((item) => [item.id, item]));

export function renderDecorativeSvg(id, className = 'sf-deco-svg') {
  const item = DECORATIVE_SVG_MAP[id];
  if (!item) return '';
  return `<div class="${className}" aria-hidden="true">${item.svg}</div>`;
}
