/**
 * SiteForge Security, Sanitization & Validation Module (validators.js)
 * Enforces XSS escaping, URL scheme whitelisting, UPI/WhatsApp/slug/analytics validators,
 * image/SVG sanitization, hostile-key JSON guard, safe embedded HTML JSON, and migration.
 */

import { getContrastRatio, resolveTheme } from './themes.js';

export const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB stored/SVG limit
export const MAX_UPLOAD_RASTER_BYTES = 10 * 1024 * 1024; // 10 MB upload cap before canvas compression
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024; // 20 MB import cap
export const CURRENT_SCHEMA_VERSION = 3;

const HOSTILE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Escapes &, <, >, ", and ' before ANY user value enters an HTML string.
 */
export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely serializes JSON for embedding inside <script type="application/json">.
 * Escapes <, >, &, U+2028, and U+2029 as unicode escapes so data can NEVER break out of </script>.
 */
export function serializeJsonForScriptTag(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Extracts embedded SiteForge project JSON from an exported HTML document string.
 */
export function extractEmbeddedProjectFromHtml(htmlString) {
  if (typeof htmlString !== 'string') return { ok: false, error: 'Empty HTML input.' };
  const match = htmlString.match(
    /<script[^>]*id=["']siteforge-project["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) {
    return { ok: false, error: 'No SiteForge embedded project data found in this HTML file.' };
  }
  return safeParseJsonText(match[1].trim());
}

/**
 * Recursively checks an object graph or raw JSON string for prototype-pollution keys.
 */
export function hasHostileKeys(obj, seen = new Set()) {
  if (!obj || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((item) => hasHostileKeys(item, seen));
  }
  for (const key of Object.keys(obj)) {
    if (HOSTILE_KEYS.has(key)) return true;
    if (hasHostileKeys(obj[key], seen)) return true;
  }
  return false;
}

/**
 * Parses JSON text while strictly rejecting __proto__, constructor, and prototype keys.
 */
export function safeParseJsonText(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { ok: false, error: 'Empty JSON content.' };
  }
  if (rawText.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'File exceeds the 20 MB maximum import limit.' };
  }
  // Reject hostile property names even before JSON.parse turns "__proto__" into prototype
  if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(rawText)) {
    return { ok: false, error: 'Rejected JSON: disallowed prototype key detected.' };
  }
  try {
    const parsed = JSON.parse(rawText, (key, value) => {
      if (HOSTILE_KEYS.has(key)) {
        throw new Error(`Disallowed key "${key}"`);
      }
      return value;
    });
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Invalid JSON: expected an object.' };
    }
    if (hasHostileKeys(parsed)) {
      return { ok: false, error: 'Rejected JSON: disallowed prototype key detected.' };
    }
    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, error: err?.message || 'Invalid JSON syntax.' };
  }
}

/**
 * Converts user text with simple formatting (**bold**, *italic*, blank lines)
 * into safe HTML paragraphs. Always escapes HTML FIRST so XSS can never run.
 */
export function formatSafeRichText(raw) {
  const escaped = escapeHTML(raw || '');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const formatted = block
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br />');
      return `<p>${formatted}</p>`;
    });
  return paragraphs.join('\n');
}

/**
 * Strictly validates and sanitizes URLs for links.
 * Allows ONLY http:, https:, mailto:, tel:, relative safe page slugs (e.g. about.html),
 * and optional #anchor fragments.
 * Blocks javascript:, data:, vbscript:, and other dangerous schemes.
 */
export function sanitizeUrl(rawUrl, { allowAnchor = true, allowRelativePage = true } = {}) {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]+/g, '');
  const lower = cleaned.toLowerCase();

  if (allowAnchor && cleaned.startsWith('#')) {
    return /^#[a-zA-Z0-9_-]+$/.test(cleaned) ? cleaned : '#top';
  }

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return '';
  }

  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return cleaned;
  }

  // Allow safe relative HTML page links inside multi-page exports (e.g., about.html, blog/post-1.html)
  if (
    allowRelativePage &&
    !cleaned.includes('..') &&
    /^(?:\.\/|\.\.\/)?[a-z0-9-]+(?:\/[a-z0-9-]+)?\.html(?:#[a-zA-Z0-9_-]+)?$/.test(cleaned)
  ) {
    return cleaned;
  }

  // Reject any other explicit protocol scheme
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleaned)) {
    return '';
  }

  // Allow bare domain/path like "github.com/user" and normalize to https://
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i.test(cleaned)) {
    return 'https://' + cleaned;
  }

  return '';
}

export function isDangerousUrl(rawUrl) {
  const cleaned = String(rawUrl || '')
    .replace(/[\u0000-\u001F\u007F]+/g, '')
    .trim()
    .toLowerCase();
  if (!cleaned) return false;
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('vbscript:')
  ) {
    return true;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleaned)) {
    return !(
      cleaned.startsWith('http://') ||
      cleaned.startsWith('https://') ||
      cleaned.startsWith('mailto:') ||
      cleaned.startsWith('tel:')
    );
  }
  return false;
}

export function isValidUrlInput(rawUrl, { allowAnchor = true } = {}) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return true;
  if (isDangerousUrl(trimmed)) return false;
  return Boolean(sanitizeUrl(trimmed, { allowAnchor }));
}

export function isValidHttpsUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return true;
  if (isDangerousUrl(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidEmail(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed || trimmed.length > 120) return false;
  const pattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!pattern.test(trimmed)) return false;
  const tld = trimmed.split('.').pop() || '';
  return tld.length >= 2;
}

export function isValidPhone(phone) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return true;
  if (!/^[+]?[\d\s().-]{7,25}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates WhatsApp international number (digits with country code, 8 to 15 digits).
 */
export function isValidWhatsAppNumber(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return true;
  if (!/^[+]?[\d\s()-]{8,22}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function cleanWhatsAppDigits(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 15);
}

/**
 * Validates UPI ID format: localpart@bankhandle (e.g., shopname@upi, name.123@okaxis).
 */
export function isValidUpiId(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/.test(trimmed);
}

/**
 * Builds a properly URL-encoded UPI payment URI (INR currency only).
 * Requires valid pa (UPI ID) and non-empty pn (Payee Name).
 */
export function buildUpiUri({ pa, pn, am = '', tn = '' }) {
  const cleanPa = String(pa || '').trim();
  const cleanPn = String(pn || '').trim();
  if (!isValidUpiId(cleanPa) || !cleanPn) return '';

  const params = [
    `pa=${encodeURIComponent(cleanPa)}`,
    `pn=${encodeURIComponent(cleanPn.slice(0, 60))}`,
  ];

  const cleanAm = String(am || '').trim();
  if (cleanAm && /^\d+(?:\.\d{1,2})?$/.test(cleanAm) && Number(cleanAm) > 0) {
    params.push(`am=${encodeURIComponent(cleanAm)}`);
  }

  params.push('cu=INR');

  const cleanTn = String(tn || '').trim();
  if (cleanTn) {
    params.push(`tn=${encodeURIComponent(cleanTn.slice(0, 80))}`);
  }

  return `upi://pay?${params.join('&')}`;
}

/**
 * Validates privacy-friendly allowlisted analytics IDs strictly by format.
 */
export function isValidAnalyticsConfig(provider, id) {
  const cleanId = String(id || '').trim();
  if (!provider || provider === 'none') return true;
  if (!cleanId) return false;
  if (provider === 'ga4') return /^G-[A-Z0-9]{6,14}$/.test(cleanId);
  if (provider === 'plausible') return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(cleanId);
  if (provider === 'cloudflare') return /^[a-f0-9]{32}$/i.test(cleanId);
  return false;
}

export function isValidHexColor(hex) {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}

/**
 * Safe site/publish/page slug validation:
 * Only lowercase a-z, 0-9, and hyphen (-). Explicitly rejects "..", "/", "\".
 */
export function validateSafeName(rawName) {
  const name = String(rawName || '').trim();
  if (!name) {
    return { valid: false, error: 'Please enter a name.' };
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid name: "..", "/" and "\\" are not allowed.',
    };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or fewer.' };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    return {
      valid: false,
      error: 'Use only lowercase letters (a-z), numbers (0-9), and hyphens (-).',
    };
  }
  return { valid: true, slug: name };
}

export function validatePageSlug(rawSlug) {
  return validateSafeName(rawSlug);
}

export function slugifyName(raw) {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return cleaned || 'my-site';
}

/**
 * Strictly validates that an image string is either an allowed base64 data URI
 * or an internal IndexedDB image blob reference (sfimg:id).
 */
export function sanitizeImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  if (/^sfimg:[a-zA-Z0-9_-]{4,80}$/.test(dataUrl)) return dataUrl;
  const safePattern = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
  return safePattern.test(dataUrl) ? dataUrl : '';
}

/**
 * Checks SVG markup and rejects scripts, inline event handlers (on*), javascript: URIs,
 * or dangerous embedded elements.
 */
export function isSvgSafe(svgText) {
  if (typeof svgText !== 'string') return false;
  const lower = svgText.toLowerCase();
  if (!lower.includes('<svg')) return false;
  if (/<script[\s>]/i.test(svgText)) return false;
  if (/\son[a-z]+\s*=/i.test(svgText)) return false;
  if (/javascript\s*:/i.test(svgText)) return false;
  if (/<(foreignobject|iframe|object|embed|applet)\b/i.test(svgText)) return false;
  return true;
}

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Reads and validates an uploaded image file (png, jpg, svg, webp; SVG max 500 KB sanitized).
 * For rasters up to 10 MB, use image-studio.js compressRasterFile; this helper stays compatible.
 */
export function readAndValidateImageFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ ok: false, error: 'No file selected.' });
      return;
    }

    const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowedExts = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp']);

    if (!allowedMimes.has(file.type) && !allowedExts.has(ext)) {
      resolve({ ok: false, error: 'Only PNG, JPG, SVG, or WebP images are allowed.' });
      return;
    }

    const isSvg = file.type === 'image/svg+xml' || ext === 'svg';
    const maxBytes = isSvg ? MAX_IMAGE_BYTES : MAX_UPLOAD_RASTER_BYTES;

    if (file.size > maxBytes) {
      resolve({
        ok: false,
        error: isSvg
          ? `SVG is too large (${Math.round(file.size / 1024)} KB). Maximum SVG size is 500 KB.`
          : `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum upload size is 10 MB.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve({ ok: false, error: 'Could not read image file.' });

    if (isSvg) {
      reader.onload = () => {
        const svgText = String(reader.result || '');
        if (!isSvgSafe(svgText)) {
          resolve({
            ok: false,
            error: 'SVG rejected for security: remove any <script> tags, event handlers (on*), or embedded objects.',
          });
          return;
        }
        resolve({
          ok: true,
          dataUrl: 'data:image/svg+xml;base64,' + utf8ToBase64(svgText),
          fileName: file.name.slice(0, 120),
          sizeBytes: file.size,
          isSvg: true,
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(dataUrl)) {
          resolve({ ok: false, error: 'Unsupported image format.' });
          return;
        }
        resolve({
          ok: true,
          dataUrl,
          fileName: file.name.slice(0, 120),
          sizeBytes: file.size,
          isSvg: false,
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Estimates raw byte size of a base64 data URI.
 */
export function estimateDataUrlBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const idx = dataUrl.indexOf(',');
  if (idx === -1) return 0;
  return Math.floor((dataUrl.length - idx - 1) * 0.75);
}

/**
 * Legacy pre-export quality & accessibility audit helper (preserved for backwards compatibility).
 * Full 5-pillar Site Health Score lives in health.js.
 */
export function auditSiteQuality(state) {
  const warnings = [];
  const theme = resolveTheme(state);

  const textBgContrast = getContrastRatio(theme.vars['--text'], theme.vars['--bg']);
  if (textBgContrast < 4.5) {
    warnings.push({
      level: 'warn',
      title: 'Low text contrast',
      detail: `Body text vs background ratio is ${textBgContrast.toFixed(1)}:1 (WCAG AA recommends 4.5:1).`,
      stepIdx: 3,
    });
  }

  const primaryBgContrast = getContrastRatio(theme.vars['--primary'], theme.vars['--bg']);
  if (primaryBgContrast < 3.0) {
    warnings.push({
      level: 'warn',
      title: 'Low primary accent contrast',
      detail: `Primary colour vs background ratio is ${primaryBgContrast.toFixed(1)}:1 (recommended 3.0:1+).`,
      stepIdx: 3,
    });
  }

  if (state.heroSideImage && !(state.heroSideImageAlt || '').trim()) {
    warnings.push({
      level: 'warn',
      title: 'Missing hero image alt text',
      detail: 'Add descriptive alt text for your hero image in Step 6 for accessibility.',
      stepIdx: 5,
    });
  }
  if (state.aboutImage && !(state.aboutImageAlt || '').trim()) {
    warnings.push({
      level: 'warn',
      title: 'Missing about image alt text',
      detail: 'Add alt text for your About section image in Step 7.',
      stepIdx: 6,
    });
  }

  const descLen = (state.metaDescription || '').trim().length;
  if (descLen === 0) {
    warnings.push({
      level: 'warn',
      title: 'Missing meta description',
      detail: 'Add a 70–160 character meta description in Step 11 for better search snippets.',
      stepIdx: 10,
    });
  } else if (descLen < 70 || descLen > 160) {
    warnings.push({
      level: 'info',
      title: 'Meta description length outside ideal range',
      detail: `Currently ${descLen} characters (aim for 70–160 characters).`,
      stepIdx: 10,
    });
  }

  if (!(state.siteName || '').trim()) {
    warnings.push({ level: 'warn', title: 'Site name is empty', detail: 'Add your site name in Step 1.', stepIdx: 0 });
  }
  if (!(state.heroHeadline || '').trim()) {
    warnings.push({ level: 'warn', title: 'Hero headline is empty', detail: 'Write a hero headline in Step 6.', stepIdx: 5 });
  }
  if (!(state.about || '').trim()) {
    warnings.push({ level: 'warn', title: 'About text is empty', detail: 'Add your story in Step 7.', stepIdx: 6 });
  }
  if (!(state.contactEmail || '').trim()) {
    warnings.push({ level: 'warn', title: 'Contact email is empty', detail: 'Provide a valid email in Step 9.', stepIdx: 8 });
  }

  return warnings;
}

/**
 * Migrates older SiteForge v1/v2 project states up to CURRENT_SCHEMA_VERSION (v3)
 * without losing any user data.
 */
export function migrateProjectState(raw, defaultStateFactory) {
  const base = defaultStateFactory();
  if (!raw || typeof raw !== 'object') return base;

  const incoming = { ...raw };
  const fromVersion = Number(incoming.schemaVersion || 1);

  // v1 -> v2: convert string menu items into objects, map old social string fields if present
  if (fromVersion < 2) {
    if (Array.isArray(incoming.menuItems)) {
      incoming.menuItems = incoming.menuItems.map((m, idx) =>
        typeof m === 'string'
          ? {
              label: m,
              type: 'section',
              target: idx === 0 ? '#top' : `#${slugifyName(m)}`,
              pageType: idx === 0 ? 'home' : '',
              slug: idx === 0 ? 'index' : slugifyName(m),
              metaTitle: '',
              metaDescription: '',
              customBody: '',
            }
          : m
      );
    }
    if (typeof incoming.socialLinks === 'string') {
      incoming.socialLinks = {};
    }
    if (!incoming.siteLanguage && incoming.language) {
      incoming.siteLanguage = incoming.language;
    }
  }

  // v2 -> v3: add multi-page metadata onto existing menu items, preserve canonicalUrl as siteUrl if set
  if (fromVersion < 3) {
    if (incoming.canonicalUrl && !incoming.siteUrl) {
      incoming.siteUrl = incoming.canonicalUrl;
    }
    if (Array.isArray(incoming.menuItems)) {
      incoming.menuItems = incoming.menuItems.map((m, idx) => {
        const label = String(m?.label || `Page ${idx + 1}`);
        const target = String(m?.target || '#top');
        const inferType =
          target === '#top' || idx === 0
            ? 'home'
            : target === '#about'
            ? 'about'
            : target === '#services'
            ? 'services'
            : target === '#projects'
            ? 'portfolio'
            : target === '#gallery'
            ? 'gallery'
            : target === '#pricing'
            ? 'pricing'
            : target === '#team'
            ? 'team'
            : target === '#faq'
            ? 'faq'
            : target === '#contact'
            ? 'contact'
            : 'custom';
        return {
          ...m,
          label,
          slug: m?.slug || (inferType === 'home' ? 'index' : slugifyName(label)),
          pageType: m?.pageType || inferType,
          metaTitle: m?.metaTitle || '',
          metaDescription: m?.metaDescription || '',
          customBody: m?.customBody || '',
        };
      });
    }
  }

  incoming.schemaVersion = CURRENT_SCHEMA_VERSION;
  return incoming;
}

/**
 * Validates, migrates, and safely normalizes an imported JSON project state against defaults.
 */
export function validateAndNormalizeProjectState(candidate, defaultStateFactory) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, error: 'Invalid project JSON: expected an object.' };
  }
  if (hasHostileKeys(candidate)) {
    return { ok: false, error: 'Rejected JSON: disallowed prototype key detected.' };
  }

  const migrated = migrateProjectState(candidate, defaultStateFactory);
  const base = defaultStateFactory();

  for (const key of Object.keys(base)) {
    const incoming = migrated[key];
    if (incoming === undefined || incoming === null) continue;

    if (typeof base[key] === 'string') {
      if (typeof incoming !== 'string') continue;
      if (
        key.toLowerCase().includes('dataurl') ||
        key.endsWith('Image') ||
        key === 'heroBgImage' ||
        key === 'heroSideImage' ||
        key === 'aboutImage'
      ) {
        if (incoming === '') {
          base[key] = '';
        } else {
          const safe = sanitizeImageDataUrl(incoming);
          if (!safe) return { ok: false, error: `Invalid or unsafe image data in "${key}".` };
          if (safe.startsWith('data:image/svg+xml;base64,')) {
            try {
              if (!isSvgSafe(atob(safe.split(',')[1]))) {
                return { ok: false, error: `SVG image in "${key}" failed security sanitization.` };
              }
            } catch {
              return { ok: false, error: `Corrupt SVG image in "${key}".` };
            }
          }
          base[key] = safe;
        }
      } else {
        const maxLen = key === 'about' ? 4000 : key === 'siteUrl' || key === 'canonicalUrl' || key === 'contactFormEndpoint' ? 300 : 500;
        base[key] = incoming.slice(0, maxLen);
      }
    } else if (typeof base[key] === 'boolean') {
      base[key] = Boolean(incoming);
    } else if (typeof base[key] === 'number') {
      const n = Number(incoming);
      if (Number.isFinite(n)) base[key] = n;
    } else if (Array.isArray(base[key]) && Array.isArray(incoming)) {
      base[key] = incoming.slice(0, 30);
    } else if (typeof base[key] === 'object' && typeof incoming === 'object' && !Array.isArray(incoming)) {
      base[key] = { ...base[key], ...incoming };
    }
  }

  base.schemaVersion = CURRENT_SCHEMA_VERSION;

  // Enforce menu item max (8) & sanitize URLs/slugs
  if (Array.isArray(base.menuItems)) {
    base.menuItems = base.menuItems.slice(0, 8).map((item, idx) => {
      if (typeof item === 'string') {
        return {
          label: item.slice(0, 28),
          type: 'section',
          target: '#top',
          pageType: idx === 0 ? 'home' : 'custom',
          slug: idx === 0 ? 'index' : slugifyName(item),
          metaTitle: '',
          metaDescription: '',
          customBody: '',
        };
      }
      const isExt = item?.type === 'external';
      const label = String(item?.label || '').slice(0, 28);
      const rawSlug = String(item?.slug || (idx === 0 ? 'index' : slugifyName(label)));
      const safeSlug = rawSlug === 'index' ? 'index' : slugifyName(rawSlug);
      return {
        label,
        type: isExt ? 'external' : 'section',
        target: isExt
          ? isDangerousUrl(item?.target)
            ? ''
            : String(item?.target || '').slice(0, 200)
          : String(item?.target || '#top').slice(0, 60),
        pageType: String(item?.pageType || (idx === 0 ? 'home' : 'custom')).slice(0, 24),
        slug: safeSlug,
        metaTitle: String(item?.metaTitle || '').slice(0, 90),
        metaDescription: String(item?.metaDescription || '').slice(0, 200),
        customBody: String(item?.customBody || '').slice(0, 4000),
      };
    });
    if (base.menuItems.length === 0) {
      base.menuItems = defaultStateFactory().menuItems;
    }
  }

  // Enforce footer extra pages max (6)
  if (Array.isArray(base.footerPages)) {
    base.footerPages = base.footerPages.slice(0, 6).map((p, idx) => ({
      title: String(p?.title || `Page ${idx + 1}`).slice(0, 60),
      slug: slugifyName(p?.slug || p?.title || `page-${idx + 1}`),
      pageType: String(p?.pageType || 'custom').slice(0, 24),
      metaDescription: String(p?.metaDescription || '').slice(0, 200),
      body: String(p?.body || '').slice(0, 8000),
    }));
  }

  // Enforce blog posts max (20)
  if (Array.isArray(base.blogPosts)) {
    base.blogPosts = base.blogPosts.slice(0, 20).map((post, idx) => ({
      id: String(post?.id || `post-${idx + 1}`).slice(0, 40),
      title: String(post?.title || '').slice(0, 120),
      slug: slugifyName(post?.slug || post?.title || `post-${idx + 1}`),
      date: String(post?.date || '').slice(0, 20),
      summary: String(post?.summary || '').slice(0, 300),
      body: String(post?.body || '').slice(0, 8000),
    }));
  }

  if (Array.isArray(base.services)) {
    base.services = base.services.slice(0, 12).map((s) => ({
      title: String(s?.title || '').slice(0, 80),
      description: String(s?.description || '').slice(0, 280),
      icon: String(s?.icon || 'sparkles').slice(0, 40),
      image: sanitizeImageDataUrl(s?.image || ''),
      imageAlt: String(s?.imageAlt || '').slice(0, 140),
      price: String(s?.price || '').slice(0, 30),
      link: isDangerousUrl(s?.link) ? '' : String(s?.link || '').slice(0, 200),
      buttonLabel: String(s?.buttonLabel || '').slice(0, 30),
    }));
  }

  if (base.socialLinks && typeof base.socialLinks === 'object') {
    for (const [k, v] of Object.entries(base.socialLinks)) {
      base.socialLinks[k] = isDangerousUrl(v) ? '' : String(v || '').slice(0, 200);
    }
  }

  if (base.contactFormEndpoint && !isValidHttpsUrl(base.contactFormEndpoint)) {
    base.contactFormEndpoint = '';
  }

  if (base.analyticsProvider && !isValidAnalyticsConfig(base.analyticsProvider, base.analyticsId)) {
    base.analyticsProvider = 'none';
    base.analyticsId = '';
  }

  return { ok: true, state: base };
}
