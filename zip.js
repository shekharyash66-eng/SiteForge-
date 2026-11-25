/**
 * SiteForge Tiny ZIP Writer & Reader (zip.js)
 * Pure vanilla JS ZIP archive builder & reader using the STORE method
 * and standard IEEE 802.3 CRC-32 checksums. Zero external dependencies.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

// Precompute standard 256-entry CRC-32 lookup table (polynomial 0xEDB88320).
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let bit = 0; bit < 8; bit++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

/**
 * Computes unsigned 32-bit CRC-32 over a Uint8Array.
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Sanitizes a ZIP entry path to prevent directory traversal (".."),
 * backslashes, leading slashes, or ASCII control characters.
 * @param {string} rawName
 * @param {boolean} [isDirectory]
 * @returns {string}
 */
export function sanitizeZipEntryName(rawName, isDirectory = false) {
  const raw = String(rawName || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\\/g, '/');

  const segments = raw
    .split('/')
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, '-'));

  const safe = segments.length ? segments.join('/') : 'file.txt';
  return isDirectory ? safe.replace(/\/+$/, '') + '/' : safe;
}

/**
 * Converts a JS Date into MS-DOS time and date 16-bit integers.
 * @param {Date} date
 * @returns {{ dosTime: number, dosDate: number }}
 */
function toDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

/**
 * Creates a Blob (application/zip) from an array of file/directory entries.
 * Each entry: { name: string, data?: string | Uint8Array | ArrayBuffer, isDirectory?: boolean }
 *
 * @param {Array<{ name: string, data?: string | Uint8Array | ArrayBuffer, isDirectory?: boolean }>} entries
 * @returns {Blob}
 */
export function createZip(entries) {
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  const { dosTime, dosDate } = toDosDateTime(new Date());

  for (const entry of entries) {
    const isDir = Boolean(entry.isDirectory) || String(entry.name || '').endsWith('/');
    const cleanName = sanitizeZipEntryName(entry.name, isDir);
    const nameBytes = textEncoder.encode(cleanName);

    let dataBytes;
    if (isDir) {
      dataBytes = new Uint8Array(0);
    } else if (entry.data instanceof Uint8Array) {
      dataBytes = entry.data;
    } else if (entry.data instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(entry.data);
    } else {
      dataBytes = textEncoder.encode(String(entry.data ?? ''));
    }

    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    // 1. Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(localHeader.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint16(6, 0x0800, true);
    ldv.setUint16(8, 0, true);
    ldv.setUint16(10, dosTime, true);
    ldv.setUint16(12, dosDate, true);
    ldv.setUint32(14, checksum, true);
    ldv.setUint32(18, size, true);
    ldv.setUint32(22, size, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    // 2. Central Directory Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(centralHeader.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, dosTime, true);
    cdv.setUint16(14, dosDate, true);
    cdv.setUint32(16, checksum, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, isDir ? 0x10 : 0x20, true);
    cdv.setUint32(42, localOffset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    localOffset += localHeader.length + dataBytes.length;
  }

  let centralSize = 0;
  for (const chunk of centralChunks) {
    centralSize += chunk.length;
  }

  // 3. End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, localOffset, true);
  edv.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, eocd], {
    type: 'application/zip',
  });
}

/**
 * Pure vanilla JS ZIP reader for STORE (method 0) archives created by SiteForge
 * or standard uncompressed ZIP tools. Verifies CRC-32 checksums for every file.
 * Supports optional DecompressionStream('deflate-raw') when encountering DEFLATE (method 8).
 *
 * @param {ArrayBuffer | Uint8Array} input
 * @returns {Promise<{ ok: boolean, entries: Array<{ name: string, isDirectory: boolean, data: Uint8Array, crcOk: boolean, expectedCrc: number, actualCrc: number, text: () => string }>, allCrcOk: boolean, error?: string }>}
 */
export async function readZip(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 22) {
    return { ok: false, entries: [], allCrcOk: false, error: 'File is too small to be a valid ZIP archive.' };
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    return { ok: false, entries: [], allCrcOk: false, error: 'Missing ZIP End-of-Central-Directory record.' };
  }

  const totalEntries = dv.getUint16(eocdOffset + 10, true);
  const centralSize = dv.getUint32(eocdOffset + 12, true);
  const centralOffset = dv.getUint32(eocdOffset + 16, true);

  if (centralOffset + centralSize > bytes.length) {
    return { ok: false, entries: [], allCrcOk: false, error: 'Corrupt ZIP central directory bounds.' };
  }

  const entries = [];
  let cursor = centralOffset;
  let allCrcOk = true;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (cursor + 46 > bytes.length || dv.getUint32(cursor, true) !== 0x02014b50) {
      return { ok: false, entries, allCrcOk: false, error: `Invalid central directory header at entry ${idx}.` };
    }

    const method = dv.getUint16(cursor + 10, true);
    const expectedCrc = dv.getUint32(cursor + 16, true);
    const compSize = dv.getUint32(cursor + 20, true);
    const nameLen = dv.getUint16(cursor + 28, true);
    const extraLen = dv.getUint16(cursor + 30, true);
    const commentLen = dv.getUint16(cursor + 32, true);
    const localHeaderOffset = dv.getUint32(cursor + 42, true);

    const rawName = textDecoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    cursor += 46 + nameLen + extraLen + commentLen;

    if (localHeaderOffset + 30 > bytes.length || dv.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      return { ok: false, entries, allCrcOk: false, error: `Invalid local header for "${rawName}".` };
    }

    const localNameLen = dv.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = dv.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compSize;

    if (dataEnd > bytes.length) {
      return { ok: false, entries, allCrcOk: false, error: `Truncated data for "${rawName}".` };
    }

    const rawSlice = bytes.subarray(dataStart, dataEnd);
    let dataBytes;

    if (method === 0) {
      dataBytes = new Uint8Array(rawSlice);
    } else if (method === 8 && typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(rawSlice);
        writer.close();
        const ab = await new Response(ds.readable).arrayBuffer();
        dataBytes = new Uint8Array(ab);
      } catch {
        return { ok: false, entries, allCrcOk: false, error: `Failed to decompress entry "${rawName}".` };
      }
    } else {
      return { ok: false, entries, allCrcOk: false, error: `Unsupported compression method (${method}) for "${rawName}".` };
    }

    const isDirectory = rawName.endsWith('/');
    const safeName = sanitizeZipEntryName(rawName, isDirectory);
    const actualCrc = crc32(dataBytes);
    const crcOk = actualCrc === expectedCrc;
    if (!crcOk) allCrcOk = false;

    entries.push({
      name: safeName,
      rawName,
      isDirectory,
      data: dataBytes,
      expectedCrc,
      actualCrc,
      crcOk,
      text: () => textDecoder.decode(dataBytes),
    });
  }

  return { ok: true, entries, allCrcOk };
}

/**
 * Decodes a base64 data URI (such as an uploaded logo) into raw Uint8Array bytes
 * and determines its appropriate file extension.
 * @param {string} dataUrl
 * @returns {{ bytes: Uint8Array, ext: string, mime: string } | null}
 */
export function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const mimeSubtype = match[2];
  const base64 = match[3];
  const extMap = {
    png: 'png',
    jpeg: 'jpg',
    jpg: 'jpg',
    webp: 'webp',
    'svg+xml': 'svg',
  };

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, ext: extMap[mimeSubtype] || 'bin', mime };
  } catch {
    return null;
  }
}

/**
 * Converts a Blob or Uint8Array to a base64 data URI.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}
