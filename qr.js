/**
 * SiteForge Pure Vanilla JS QR Code Encoder (qr.js)
 * Zero dependencies. Supports Byte Mode, Error Correction Level M, Versions 1 to 10.
 * Renders crisp inline SVG and printable A4 QR poster HTML for live URLs, UPI, WhatsApp, Wi-Fi, and phone.
 */

import { escapeHTML } from './validators.js';

// GF(256) log/exp tables with primitive polynomial 0x11d (285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(ecLen) {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsCompute(dataBytes, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < dataBytes.length; i++) {
    const factor = dataBytes[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

/**
 * QR Version 1..10 table for Error Correction Level M (ISO/IEC 18004)
 * Each entry: [totalCodewords, ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data, alignCenters]
 */
const QR_M_TABLE = {
  1:  [26,  10, 1, 16, 0, 0,  []],
  2:  [44,  16, 1, 28, 0, 0,  [6, 18]],
  3:  [70,  26, 1, 44, 0, 0,  [6, 22]],
  4:  [100, 18, 2, 32, 0, 0,  [6, 26]],
  5:  [134, 24, 2, 43, 0, 0,  [6, 30]],
  6:  [172, 16, 4, 27, 0, 0,  [6, 34]],
  7:  [196, 18, 4, 31, 0, 0,  [6, 22, 38]],
  8:  [242, 22, 2, 38, 2, 39, [6, 24, 42]],
  9:  [292, 22, 3, 36, 2, 37, [6, 26, 46]],
  10: [346, 26, 4, 43, 1, 44, [6, 28, 50]],
};

// Version information bitstrings for versions 7..10 (18 bits)
const VERSION_INFO = {
  7:  0x07c94,
  8:  0x085bc,
  9:  0x09a99,
  10: 0x0a4d3,
};

// Precomputed 15-bit format strings for EC Level M (00) + Masks 0..7 (with XOR 0x5412)
const FORMAT_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b,
  0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function chooseVersion(byteLen) {
  for (let v = 1; v <= 10; v++) {
    const [, , g1b, g1d, g2b, g2d] = QR_M_TABLE[v];
    const dataCapBytes = g1b * g1d + g2b * g2d;
    const countBits = v <= 9 ? 8 : 16;
    const headerBits = 4 + countBits;
    const availableBytes = Math.floor((dataCapBytes * 8 - headerBits) / 8);
    if (byteLen <= availableBytes) return v;
  }
  return -1;
}

function buildCodewords(utf8Bytes, version) {
  const [, ecPerBlock, g1b, g1d, g2b, g2d] = QR_M_TABLE[version];
  const totalDataBytes = g1b * g1d + g2b * g2d;

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zeros)
  const capBits = totalDataBytes * 8;
  const term = Math.min(4, capBits - bits.length);
  pushBits(0, term);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert bits to bytes & pad with 0xEC, 0x11 alternating
  const data = new Uint8Array(totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data[byteIdx++] = b;
  }
  const padBytes = [0xec, 0x11];
  let padToggle = 0;
  while (byteIdx < totalDataBytes) {
    data[byteIdx++] = padBytes[padToggle++ & 1];
  }

  // Split into blocks & compute Reed-Solomon EC codewords
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < g1b; i++) {
    const blk = data.subarray(offset, offset + g1d);
    offset += g1d;
    dataBlocks.push(blk);
    ecBlocks.push(rsCompute(blk, ecPerBlock));
  }
  for (let i = 0; i < g2b; i++) {
    const blk = data.subarray(offset, offset + g2d);
    offset += g2d;
    dataBlocks.push(blk);
    ecBlocks.push(rsCompute(blk, ecPerBlock));
  }

  // Interleave data codewords, then EC codewords
  const out = [];
  const maxDataLen = Math.max(g1d, g2d);
  for (let col = 0; col < maxDataLen; col++) {
    for (const blk of dataBlocks) {
      if (col < blk.length) out.push(blk[col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (const ec of ecBlocks) {
      out.push(ec[col]);
    }
  }
  return new Uint8Array(out);
}

function makeEmptyMatrix(size) {
  return {
    size,
    modules: Array.from({ length: size }, () => new Uint8Array(size)),
    isFunc: Array.from({ length: size }, () => new Uint8Array(size)),
  };
}

function setFunc(m, r, c, dark) {
  if (r < 0 || c < 0 || r >= m.size || c >= m.size) return;
  m.modules[r][c] = dark ? 1 : 0;
  m.isFunc[r][c] = 1;
}

function drawFinder(m, r0, c0) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || c < 0 || r >= m.size || c >= m.size) continue;
      const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      const dark = inOuter && (dist === 0 || dist === 1 || dist === 3);
      setFunc(m, r, c, dark);
    }
  }
}

function drawAlignment(m, rc, cc) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      setFunc(m, rc + dr, cc + dc, dist !== 1);
    }
  }
}

function placeFunctionPatterns(m, version) {
  const n = m.size;
  drawFinder(m, 0, 0);
  drawFinder(m, 0, n - 7);
  drawFinder(m, n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(m, 6, i, i % 2 === 0);
    setFunc(m, i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = QR_M_TABLE[version][6];
  for (const r of centers) {
    for (const c of centers) {
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) continue;
      drawAlignment(m, r, c);
    }
  }

  // Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(m, 8, i, false);
      setFunc(m, i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunc(m, 8, n - 1 - i, false);
    setFunc(m, n - 1 - i, 8, false);
  }
  // Dark module
  setFunc(m, n - 8, 8, true);

  // Version info for v >= 7
  if (version >= 7) {
    const bits = VERSION_INFO[version];
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = n - 11 + (i % 3);
      setFunc(m, a, b, bit);
      setFunc(m, b, a, bit);
    }
  }
}

function placeDataBits(m, codewords) {
  const n = m.size;
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let col = n - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    for (let step = 0; step < n; step++) {
      const row = upward ? n - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const c = col - dx;
        if (m.isFunc[row][c]) continue;
        let dark = 0;
        if (bitIdx < totalBits) {
          dark = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
        m.modules[row][c] = dark;
      }
    }
    upward = !upward;
  }
}

function maskBit(maskId, r, c) {
  switch (maskId) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function writeFormatInfo(modules, size, maskId) {
  const fmt = FORMAT_M[maskId];
  const bit = (i) => (fmt >>> i) & 1;
  // Top-left around finder
  for (let i = 0; i <= 5; i++) modules[8][i] = bit(14 - i);
  modules[8][7] = bit(8);
  modules[8][8] = bit(7);
  modules[7][8] = bit(6);
  for (let i = 0; i <= 5; i++) modules[5 - i][8] = bit(5 - i);

  // Split around top-right & bottom-left
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i);
  for (let i = 0; i < 7; i++) modules[size - 1 - i][8] = bit(14 - i);
  modules[size - 8][8] = 1;
}

function penaltyScore(modules, size) {
  let score = 0;
  // Rule 1: runs of >= 5
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        score += 3;
      }
    }
  }
  // Rule 4: dark/light balance
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) darkCount += modules[r][c];
  }
  const pct = (darkCount * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

/**
 * Generates a QR matrix (versions 1..10, EC Level M) for a UTF-8 string.
 * @param {string} text
 * @returns {{ ok: boolean, version?: number, size?: number, modules?: Uint8Array[], error?: string }}
 */
export function encodeQR(text) {
  const str = String(text || '');
  if (!str) return { ok: false, error: 'QR text cannot be empty.' };

  const bytes = new TextEncoder().encode(str);
  const version = chooseVersion(bytes.length);
  if (version === -1) {
    return { ok: false, error: 'Text is too long for QR Versions 1–10 (max ~213 bytes).' };
  }

  const size = 17 + version * 4;
  const codewords = buildCodewords(bytes, version);
  const base = makeEmptyMatrix(size);
  placeFunctionPatterns(base, version);
  placeDataBits(base, codewords);

  let bestScore = Infinity;
  let bestModules = null;

  for (let maskId = 0; maskId < 8; maskId++) {
    const candidate = base.modules.map((row, r) => {
      const outRow = new Uint8Array(size);
      for (let c = 0; c < size; c++) {
        const invert = !base.isFunc[r][c] && maskBit(maskId, r, c);
        outRow[c] = invert ? base.modules[r][c] ^ 1 : base.modules[r][c];
      }
      return outRow;
    });
    writeFormatInfo(candidate, size, maskId);
    const s = penaltyScore(candidate, size);
    if (s < bestScore) {
      bestScore = s;
      bestModules = candidate;
    }
  }

  return { ok: true, version, size, modules: bestModules };
}

/**
 * Renders an inline SVG string for any QR payload.
 */
export function renderQrSvg(text, { sizePx = 180, fg = '#111111', bg = '#ffffff', quietZone = 4, label = 'QR Code' } = {}) {
  const res = encodeQR(text);
  if (!res.ok) {
    return `<div style="padding:12px;border:1px solid #ccc;font-size:12px;">${escapeHTML(res.error)}</div>`;
  }
  const total = res.size + quietZone * 2;
  const paths = [];
  for (let r = 0; r < res.size; r++) {
    for (let c = 0; c < res.size; c++) {
      if (res.modules[r][c]) {
        paths.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" role="img" aria-label="${escapeHTML(label)}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${escapeHTML(bg)}"/><path d="${paths.join('')}" fill="${escapeHTML(fg)}"/></svg>`;
}

/**
 * Builds a Wi-Fi QR string: WIFI:T:WPA;S:<ssid>;P:<pass>;;
 */
export function buildWifiQrPayload(ssid, password = '', security = 'WPA') {
  const esc = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  const sec = security === 'nopass' ? 'nopass' : security === 'WEP' ? 'WEP' : 'WPA';
  return `WIFI:T:${sec};S:${esc(ssid)};P:${esc(password)};;`;
}

/**
 * Builds a printable A4 table-tent QR poster HTML document.
 */
export function buildPrintableQrPosterHtml({ siteName, subtitle, qrPayload, primaryColor = '#111111', caption = 'Scan to visit' }) {
  const qrSvg = renderQrSvg(qrPayload, { sizePx: 320, fg: '#111111', bg: '#ffffff', label: `${siteName} QR Code` });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHTML(siteName)} — Printable QR Poster</title>
<style>
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: system-ui, -apple-system, sans-serif;
    background: #ffffff; color: #111111;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
  }
  .poster {
    width: 100%; max-width: 560px; text-align: center;
    border: 3px solid ${escapeHTML(primaryColor)}; border-radius: 20px;
    padding: 48px 36px;
  }
  .badge {
    display: inline-block; padding: 6px 14px; border-radius: 999px;
    background: ${escapeHTML(primaryColor)}; color: #ffffff;
    font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }
  h1 { font-size: 40px; margin: 18px 0 8px; line-height: 1.1; }
  p.sub { font-size: 18px; color: #444; margin: 0 0 28px; }
  .qr-box {
    display: inline-block; padding: 18px; border: 2px solid #e5e7eb;
    border-radius: 16px; background: #fff;
  }
  .cta { font-size: 24px; font-weight: 700; margin: 24px 0 8px; color: ${escapeHTML(primaryColor)}; }
  .url { font-family: ui-monospace, monospace; font-size: 13px; color: #555; word-break: break-all; }
  .foot { margin-top: 28px; font-size: 11px; color: #777; }
  @media print { .no-print { display: none; } body { min-height: auto; } }
</style>
</head>
<body>
  <main class="poster">
    <span class="badge">${escapeHTML(caption)}</span>
    <h1>${escapeHTML(siteName || 'My Website')}</h1>
    ${subtitle ? `<p class="sub">${escapeHTML(subtitle)}</p>` : ''}
    <div class="qr-box">${qrSvg}</div>
    <p class="cta">${escapeHTML(caption)}</p>
    <p class="url">${escapeHTML(qrPayload)}</p>
    <p class="foot">Made offline with SiteForge</p>
    <div class="no-print" style="margin-top:24px;">
      <button type="button" id="sf-print-poster-btn" style="padding:10px 20px;font-size:15px;font-weight:700;border-radius:8px;border:none;background:${escapeHTML(primaryColor)};color:#fff;cursor:pointer;">Print Poster (A4)</button>
    </div>
  </main>
  <script>document.getElementById('sf-print-poster-btn')?.addEventListener('click',function(){window.print();});</script>
</body>
</html>`;
}
