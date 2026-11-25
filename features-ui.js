/**
 * SiteForge Phase A/B/C Feature Studios, Exporters & Modals (features-ui.js)
 * Pure vanilla ES module. Zero external dependencies, zero AI, 100% offline.
 */

import {
  COPY_TONES,
  extractLogoPalette,
  generateBrandHarmonies,
  getSmartCopySuggestions,
} from './copy-bank.js';
import {
  buildCspMetaContent,
  buildReadmeGoLiveTxt,
  computeScriptSha256,
  generate404Html,
  generateFaviconPack,
  generateHumansTxt,
  generateOgImageBytes,
  generateRobotsTxt,
  generateSitemapXml,
} from './health.js';
import { CROP_ASPECT_RATIOS, processImageWithCanvas } from './image-studio.js';
import {
  buildExportedOfflineHtml,
  buildExportedSiteManifest,
  buildExportedSiteSwJs,
  buildSite,
  buildSitePages,
} from './layouts.js';
import {
  FONT_PAIRINGS,
  FONT_STACK_MAP,
  GO_LIVE_PROVIDERS,
  HELP_CENTER_ITEMS,
  TOUR_STEPS,
  WHATS_NEW_ITEMS,
  createDefaultState,
  themes,
} from './options.js';
import {
  buildPrintableQrPosterHtml,
  buildWifiQrPayload,
  renderQrSvg,
} from './qr.js';
import { formatSelfTestReport, runSelfTests } from './selftest.js';
import {
  createFullBackupZip,
  deleteSnapshot,
  externalizeStateImagesToBlobs,
  getCachedImageUri,
  getImageRecord,
  getProjectSnapshots,
  getSetting,
  getStorageStatus,
  requestStorageProtection,
  resolveStateImageUris,
  restoreFullBackupZip,
  saveFilesToFolder,
  saveImageBlob,
  saveSnapshot,
  setSetting,
  supportsDirectoryPicker,
} from './storage.js';
import {
  MAX_IMPORT_BYTES,
  buildUpiUri,
  cleanWhatsAppDigits,
  escapeHTML,
  extractEmbeddedProjectFromHtml,
  isValidUpiId,
  isValidWhatsAppNumber,
  safeParseJsonText,
  slugifyName,
  validateAndNormalizeProjectState,
} from './validators.js';
import { createZip, dataUrlToBytes, readZip } from './zip.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

/* ==========================================================================
   1. Full Multi-Page + SEO Power Pack + Offline PWA ZIP / Folder Builder
   ========================================================================== */

export async function buildExportFileEntries(rawState) {
  const resolvedState = resolveStateImageUris(rawState);
  const themeObj = themes[resolvedState.theme] || themes['light-clean'];
  const entries = [];
  const bundle = buildSitePages(resolvedState, {
    previewMode: false,
    externalAssets: true,
    embedState: true,
  });

  // Compute SHA-256 CSP hash for shared script (external script still uses 'self', inline hashes if any)
  const scriptHash = await computeScriptSha256(bundle.runtimeJs || '');
  const cspContent = buildCspMetaContent(resolvedState, {
    scriptHashes: scriptHash ? [scriptHash] : [],
    externalAssets: true,
  });

  const injectCsp = (html) => {
    if (!html || html.includes('http-equiv="Content-Security-Policy"')) return html;
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${escapeHTML(cspContent)}" />`
    );
  };

  // Core shared assets
  entries.push({ name: 'assets/', isDirectory: true });
  entries.push({ name: 'assets/style.css', data: bundle.css || '' });
  entries.push({ name: 'assets/site.js', data: bundle.runtimeJs || '' });
  entries.push({ name: 'assets/images/', isDirectory: true });

  // Collect uploaded images into assets/images/
  const imgCandidates = [
    ['logo', resolvedState.logoDataUrl],
    ['favicon', resolvedState.faviconDataUrl],
    ['og-image', resolvedState.ogImageDataUrl],
    ['hero-bg', resolvedState.heroBgImage],
    ['hero-side', resolvedState.heroSideImage],
    ['about', resolvedState.aboutImage],
  ];
  (resolvedState.services || []).forEach((s, i) => imgCandidates.push([`service-${i + 1}`, s?.image]));
  (resolvedState.galleryItems || []).forEach((g, i) => imgCandidates.push([`gallery-${i + 1}`, g?.image]));
  (resolvedState.teamMembers || []).forEach((m, i) => imgCandidates.push([`team-${i + 1}`, m?.photo]));

  let bundledImgCount = 0;
  for (const [base, uri] of imgCandidates) {
    const decoded = dataUrlToBytes(uri);
    if (decoded) {
      entries.push({ name: `assets/images/${base}.${decoded.ext}`, data: decoded.bytes });
      bundledImgCount += 1;
    }
  }
  if (bundledImgCount === 0) {
    entries.push({
      name: 'assets/images/README.txt',
      data: 'Uploaded images from your SiteForge project appear in this folder.\n',
    });
  }

  // All generated HTML pages (index.html, multi-page .html, blog posts, legal pages, optional /<lang>/)
  const htmlFilenames = [];
  for (const p of bundle.pages || []) {
    entries.push({ name: p.filename, data: injectCsp(p.html) });
    htmlFilenames.push(p.filename);
  }

  // Phase A6: SEO Power Pack (404, robots.txt, humans.txt, sitemap.xml if Site URL set, OG PNG, Favicons)
  entries.push({ name: '404.html', data: generate404Html(resolvedState) });
  entries.push({ name: 'robots.txt', data: generateRobotsTxt(resolvedState) });
  entries.push({ name: 'humans.txt', data: generateHumansTxt(resolvedState) });
  if ((resolvedState.siteUrl || '').trim()) {
    entries.push({ name: 'sitemap.xml', data: generateSitemapXml(resolvedState.siteUrl, htmlFilenames) });
  }

  try {
    const ogBytes = await generateOgImageBytes(resolvedState);
    if (ogBytes && ogBytes.length) {
      entries.push({ name: 'og-image.png', data: ogBytes });
    }
  } catch {
    // Canvas unavailable in headless environment
  }

  try {
    const favicons = await generateFaviconPack(resolvedState);
    if (favicons && favicons.length) {
      entries.push({ name: 'assets/icons/', isDirectory: true });
      for (const f of favicons) {
        entries.push({ name: `assets/icons/${f.name}`, data: f.data });
      }
    }
  } catch {
    // Canvas unavailable
  }

  // Phase B5: Exported Offline-Ready Website (optional PWA package)
  if (resolvedState.makeSiteOffline) {
    const offlineHtml = buildExportedOfflineHtml(resolvedState, themeObj);
    const manifestJson = buildExportedSiteManifest(resolvedState, themeObj);
    const cacheList = [
      './',
      './assets/style.css',
      './assets/site.js',
      './offline.html',
      './manifest.webmanifest',
      ...htmlFilenames.map((f) => `./${f}`),
    ];
    entries.push({ name: 'manifest.webmanifest', data: manifestJson });
    entries.push({ name: 'offline.html', data: offlineHtml });
    entries.push({ name: 'sw.js', data: buildExportedSiteSwJs(cacheList) });
  }

  // Phase A7: Plain-language Go-Live instructions
  entries.push({ name: 'README-HOW-TO-GO-LIVE.txt', data: buildReadmeGoLiveTxt(resolvedState) });

  return entries;
}

export async function downloadFullSiteZip(rawState, showToast) {
  const slug = slugifyName(rawState.siteName || 'siteforge-site');
  const entries = await buildExportFileEntries(rawState);
  const blob = createZip(entries);
  downloadBlob(blob, `${slug}-siteforge.zip`);
  showToast(`Downloaded ${slug}-siteforge.zip (${entries.length} files)`, 'success');
}

export async function exportSiteToFolder(rawState, showToast) {
  const entries = await buildExportFileEntries(rawState);
  if (!supportsDirectoryPicker()) {
    const slug = slugifyName(rawState.siteName || 'siteforge-site');
    downloadBlob(createZip(entries), `${slug}-siteforge.zip`);
    showToast('Folder picker is not supported in this browser — downloaded ZIP instead.');
    return;
  }
  const res = await saveFilesToFolder(entries, { reuseSaved: true });
  if (res.ok) {
    showToast(`Saved ${res.written} files directly to folder "${res.folderName}"`, 'success');
  } else if (res.cancelled) {
    showToast('Folder selection cancelled.');
  } else {
    const slug = slugifyName(rawState.siteName || 'siteforge-site');
    downloadBlob(createZip(entries), `${slug}-siteforge.zip`);
    showToast('Could not write to folder — downloaded ZIP instead.');
  }
}

export async function buildSingleExportHtml(rawState) {
  const resolvedState = resolveStateImageUris(rawState);
  let html = buildSite(resolvedState, { previewMode: false, externalAssets: false, embedState: true });
  // Compute SHA-256 hash of inline script if present for strict CSP
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  const hashes = [];
  if (m && m[1]) {
    const h = await computeScriptSha256(m[1]);
    if (h) hashes.push(h);
  }
  const csp = buildCspMetaContent(resolvedState, { scriptHashes: hashes, externalAssets: false });
  if (!html.includes('http-equiv="Content-Security-Policy"')) {
    html = html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${escapeHTML(csp)}" />`
    );
  }
  return html;
}

/* ==========================================================================
   2. Round-Trip "Open in SiteForge" (.html, .zip, .json) — Phase C1
   ========================================================================== */

export async function openExportedFileInSiteForge(file) {
  if (!file) return { ok: false, error: 'No file selected.' };
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'File exceeds the 20 MB safety limit.' };
  }

  const lower = (file.name || '').toLowerCase();
  let candidate = null;

  try {
    if (lower.endsWith('.json')) {
      const parsed = safeParseJsonText(await file.text());
      if (!parsed.ok) return { ok: false, error: parsed.error };
      candidate = parsed.data?.state || parsed.data;
    } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const htmlText = await file.text();
      const extracted = extractEmbeddedProjectFromHtml(htmlText);
      if (!extracted.ok) return { ok: false, error: extracted.error };
      candidate = extracted.data?.state || extracted.data;
    } else if (lower.endsWith('.zip') || lower.endsWith('.siteforge')) {
      const buf = await file.arrayBuffer();
      const zRes = await readZip(buf);
      if (!zRes.ok) return { ok: false, error: zRes.error };
      // Look for index.html or any .html with embedded siteforge-project
      const indexEntry =
        zRes.files.find((f) => f.name === 'index.html') ||
        zRes.files.find((f) => f.name.endsWith('.html'));
      if (!indexEntry) return { ok: false, error: 'No HTML page found inside ZIP archive.' };
      const htmlText = new TextDecoder().decode(indexEntry.bytes);
      const extracted = extractEmbeddedProjectFromHtml(htmlText);
      if (!extracted.ok) return { ok: false, error: extracted.error };
      candidate = extracted.data?.state || extracted.data;
    } else {
      return { ok: false, error: 'Please select a SiteForge .html, .zip, or .json file.' };
    }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not read the selected file.' };
  }

  const normalized = validateAndNormalizeProjectState(candidate, createDefaultState);
  if (!normalized.ok) return normalized;
  return { ok: true, state: normalized.state };
}

/* ==========================================================================
   3. Full Portable Backup (.siteforge ZIP) & Storage Panel — Phase A1
   ========================================================================== */

export async function runFullBackupDownload(showToast) {
  try {
    const { blob, filename, projectCount, imageCount } = await createFullBackupZip();
    downloadBlob(blob, filename);
    const reminder = document.getElementById('banner-backup-reminder');
    const quotaBanner = document.getElementById('banner-quota-error');
    if (reminder) reminder.hidden = true;
    if (quotaBanner) quotaBanner.hidden = true;
    showToast(`Backup saved (${projectCount} projects, ${imageCount} images)`, 'success');
  } catch (err) {
    showToast(`Backup failed: ${err?.message || 'error'}`, 'error');
  }
}

export async function runFullBackupRestore(file, onRestored, showToast) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES * 2) {
    showToast('Backup archive is too large.', 'error');
    return;
  }
  try {
    const buf = await file.arrayBuffer();
    const res = await restoreFullBackupZip(buf, createDefaultState);
    if (!res.ok) {
      showToast(res.error || 'Could not restore backup.', 'error');
      return;
    }
    showToast(`Restored ${res.projectsRestored} projects and ${res.imagesRestored} images`, 'success');
    if (onRestored) await onRestored();
  } catch (err) {
    showToast(`Restore failed: ${err?.message || 'error'}`, 'error');
  }
}

export async function renderStorageDataSectionHtml() {
  const st = await getStorageStatus();
  const usedMb = (st.usage / (1024 * 1024)).toFixed(2);
  const quotaMb = st.quota ? (st.quota / (1024 * 1024)).toFixed(0) : '—';
  const lastBackupStr = st.lastBackupAt
    ? new Date(st.lastBackupAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never backed up yet';

  return `
    <div class="sf-acc" open style="padding:0.9rem;display:flex;flex-direction:column;gap:0.75rem;">
      <div class="field-label-row">
        <span class="field-label">Storage &amp; Data Safety (IndexedDB)</span>
        <span class="char-count">${st.persisted ? 'Protected' : 'Standard'} · ${st.percent}% used</span>
      </div>
      <div class="storage-meter-track" role="progressbar" aria-valuenow="${st.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="storage-meter-fill" style="width:${Math.min(100, Math.max(2, st.percent))}%;"></div>
      </div>
      <p class="field-helper" style="margin:0;">
        Using <strong>${escapeHTML(usedMb)} MB</strong> of ${escapeHTML(quotaMb)} MB ·
        ${st.projectCount} project(s), ${st.imageCount} image blob(s), ${st.snapshotCount} snapshot(s) ·
        Last backup: <strong>${escapeHTML(lastBackupStr)}</strong>
      </p>
      <div class="inline-bar">
        <button type="button" id="btn-settings-persist" class="btn btn-secondary btn-sm" ${st.persisted ? 'disabled' : ''}>
          ${st.persisted ? 'Data Protected' : 'Protect my data'}
        </button>
        <button type="button" id="btn-settings-backup" class="btn btn-primary btn-sm">Back up everything (.siteforge)</button>
        <button type="button" id="btn-settings-restore" class="btn btn-secondary btn-sm">Restore backup</button>
      </div>
    </div>
    <div class="sf-acc" style="padding:0.9rem;display:flex;flex-direction:column;gap:0.65rem;">
      <span class="field-label">Offline Diagnostics, Tour &amp; App Cache</span>
      <div class="inline-bar">
        <button type="button" id="btn-settings-selftest" class="btn btn-secondary btn-sm">Run Self-Test</button>
        <button type="button" id="btn-settings-tour" class="btn btn-secondary btn-sm">Replay Guided Tour</button>
        <button type="button" id="btn-settings-whatsnew" class="btn btn-secondary btn-sm">What&rsquo;s New</button>
        <button type="button" id="btn-settings-clear-cache" class="btn btn-ghost btn-sm">Clear App Cache</button>
      </div>
      <p class="field-helper" style="margin:0;">Clearing app cache refreshes cached app files while keeping all your saved projects and images safe in IndexedDB.</p>
    </div>`;
}

export async function handlePersistRequest(showToast, rerenderSettings) {
  const res = await requestStorageProtection();
  if (res.persisted) {
    showToast('Browser granted persistent storage protection!', 'success');
  } else {
    showToast('Browser did not grant automatic persistence. Use "Back up everything" regularly.');
  }
  if (rerenderSettings) await rerenderSettings();
}

export async function clearAppCachesOnly(showToast) {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    showToast('Offline app cache cleared. Reload when online to re-cache fresh files.', 'success');
  } catch {
    showToast('Unable to clear cache in this environment.', 'error');
  }
}

/* ==========================================================================
   4. Offline Self-Test Runner Modal (Phase A0)
   ========================================================================== */

let lastSelfTestSummary = null;

export async function openAndRunSelfTestModal(openModal, showToast) {
  const body = document.getElementById('selftest-body');
  if (!body) return;
  body.innerHTML = '<p class="modal-copy">Running offline verification suite (including all 288 templates, XSS checks, ZIP CRC, IndexedDB Blobs, migrations, and round-trip)… please wait.</p>';
  openModal('modal-selftest');

  try {
    const summary = await runSelfTests();
    lastSelfTestSummary = summary;
    const allOk = summary.failed === 0;
    body.innerHTML = `
      <div class="audit-item ${allOk ? 'is-ok' : 'is-warn'}" style="margin-bottom:0.85rem;">
        <div>
          <strong>${allOk ? 'ALL CHECKS PASSED' : `${summary.failed} CHECK(S) FAILED`}</strong>
          <div>${summary.passed} / ${summary.total} passed in ${summary.totalMs} ms</div>
        </div>
      </div>
      <div class="selftest-list">
        ${summary.results
          .map(
            (r) => `<div class="selftest-row ${r.pass ? 'is-pass' : 'is-fail'}">
            <div>
              <strong>${escapeHTML(r.name)}</strong>
              <div class="field-helper">${escapeHTML(r.detail)}</div>
            </div>
            <span class="health-status-tag ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'} · ${r.ms}ms</span>
          </div>`
          )
          .join('')}
      </div>`;
  } catch (err) {
    body.innerHTML = `<p class="field-error">Self-test encountered an error: ${escapeHTML(err?.message || 'unknown')}</p>`;
    showToast('Self-test failed to complete', 'error');
  }
}

export async function copySelfTestReport(showToast) {
  if (!lastSelfTestSummary) {
    showToast('Run self-test first.');
    return;
  }
  const text = formatSelfTestReport(lastSelfTestSummary);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Self-test report copied to clipboard', 'success');
  } catch {
    showToast('Could not access clipboard.', 'error');
  }
}

/* ==========================================================================
   5. Image Studio Modal (Crop, Rotate, Flip, Focal Point, Quality) — Phase A4
   ========================================================================== */

let imgStudioCtx = null;

export async function openImageStudioModal({ slotKey, currentVal, altKey, altValue, meta, onApply, openModal, showToast }) {
  const uri = getCachedImageUri(currentVal) || currentVal;
  if (!uri) {
    showToast('Upload an image first to open Image Studio.');
    return;
  }

  let sourceBlobOrUrl = uri;
  let originalBytes = 0;
  if (typeof currentVal === 'string' && currentVal.startsWith('sfimg:')) {
    const rec = await getImageRecord(currentVal);
    if (rec?.blob) {
      sourceBlobOrUrl = rec.blob;
      originalBytes = rec.bytes || rec.blob.size || 0;
    }
  } else {
    const dec = dataUrlToBytes(uri);
    if (dec) originalBytes = dec.bytes.length;
  }

  imgStudioCtx = {
    slotKey,
    sourceBlobOrUrl,
    previewUrl: uri,
    aspectRatio: 'free',
    rotateDeg: 0,
    flipH: false,
    flipV: false,
    quality: 82,
    focalX: Number.isFinite(meta?.focalX) ? meta.focalX : 50,
    focalY: Number.isFinite(meta?.focalY) ? meta.focalY : 50,
    altKey: altKey || '',
    altValue: altValue || '',
    originalBytes,
    estimatedBytes: originalBytes,
    outputWidth: meta?.width || 0,
    outputHeight: meta?.height || 0,
    lastProcessed: null,
    onApply,
  };

  renderImageStudioBody();
  openModal('modal-image-studio');
  await refreshImageStudioPreview();
}

function renderImageStudioBody() {
  const body = document.getElementById('image-studio-body');
  if (!body || !imgStudioCtx) return;
  const c = imgStudioCtx;
  const origKb = Math.max(1, Math.round((c.originalBytes || 0) / 1024));
  const estKb = Math.max(1, Math.round((c.estimatedBytes || c.originalBytes || 0) / 1024));

  body.innerHTML = `
    <div class="step-content">
      <div class="img-studio-stage" id="img-studio-stage" title="Click anywhere on the image to set the focal point">
        <img id="img-studio-preview" src="${c.previewUrl}" alt="${escapeHTML(c.altValue || 'Preview')}" />
        <span class="focal-dot" id="img-studio-focal-dot" style="left:${c.focalX}%;top:${c.focalY}%;"></span>
      </div>
      <div class="inline-bar" style="justify-content:space-between;">
        <span class="field-helper">Click image to pick focal point (${c.focalX}%, ${c.focalY}%)</span>
        <span class="char-count" id="img-studio-size">Before: ${origKb} KB → After: ${estKb} KB${c.outputWidth ? ` (${c.outputWidth}×${c.outputHeight})` : ''}</span>
      </div>

      <div class="field-group">
        <span class="field-label">Crop Aspect Ratio</span>
        <div class="choice-pills">
          ${CROP_ASPECT_RATIOS.map(
            (r) => `<button type="button" class="choice-pill${c.aspectRatio === r.id ? ' is-selected' : ''}" data-imgs-ratio="${r.id}">${escapeHTML(r.label)}</button>`
          ).join('')}
        </div>
      </div>

      <div class="inline-bar">
        <button type="button" class="btn btn-secondary btn-sm" data-imgs-op="rotL">Rotate -90°</button>
        <button type="button" class="btn btn-secondary btn-sm" data-imgs-op="rotR">Rotate +90°</button>
        <button type="button" class="btn btn-secondary btn-sm" data-imgs-op="flipH">Flip Horizontal</button>
        <button type="button" class="btn btn-secondary btn-sm" data-imgs-op="flipV">Flip Vertical</button>
      </div>

      <div class="field-group">
        <div class="field-label-row">
          <label class="field-label" for="imgs-quality">Compression Quality</label>
          <span class="char-count" id="imgs-quality-val">${c.quality}%</span>
        </div>
        <input id="imgs-quality" type="range" min="40" max="95" value="${c.quality}" />
      </div>

      <div class="field-group">
        <label class="field-label" for="imgs-alt">Image Alt Text (accessibility &amp; SEO)</label>
        <input id="imgs-alt" type="text" class="field-input" value="${escapeHTML(c.altValue)}" maxlength="140" placeholder="Describe what is shown in this image" />
      </div>
    </div>`;
}

async function refreshImageStudioPreview() {
  if (!imgStudioCtx) return;
  try {
    const res = await processImageWithCanvas(imgStudioCtx.sourceBlobOrUrl, {
      aspectRatio: imgStudioCtx.aspectRatio,
      rotateDeg: imgStudioCtx.rotateDeg,
      flipH: imgStudioCtx.flipH,
      flipV: imgStudioCtx.flipV,
      quality: imgStudioCtx.quality,
      focalX: imgStudioCtx.focalX,
      focalY: imgStudioCtx.focalY,
      maxBytes: 500 * 1024,
    });
    imgStudioCtx.lastProcessed = res;
    imgStudioCtx.previewUrl = res.dataUrl;
    imgStudioCtx.estimatedBytes = res.bytes;
    imgStudioCtx.outputWidth = res.width;
    imgStudioCtx.outputHeight = res.height;

    const img = document.getElementById('img-studio-preview');
    const sizeEl = document.getElementById('img-studio-size');
    if (img) img.src = res.dataUrl;
    if (sizeEl) {
      const origKb = Math.max(1, Math.round((imgStudioCtx.originalBytes || res.bytes) / 1024));
      const estKb = Math.max(1, Math.round(res.bytes / 1024));
      sizeEl.textContent = `Before: ${origKb} KB → After: ${estKb} KB (${res.width}×${res.height})`;
    }
  } catch {
    // Keep previous preview
  }
}

export function bindImageStudioEvents(closeModal, showToast) {
  const body = document.getElementById('image-studio-body');
  if (body) {
    body.addEventListener('click', async (e) => {
      if (!imgStudioCtx) return;
      const ratioBtn = e.target.closest('[data-imgs-ratio]');
      if (ratioBtn) {
        imgStudioCtx.aspectRatio = ratioBtn.getAttribute('data-imgs-ratio');
        renderImageStudioBody();
        await refreshImageStudioPreview();
        return;
      }
      const opBtn = e.target.closest('[data-imgs-op]');
      if (opBtn) {
        const op = opBtn.getAttribute('data-imgs-op');
        if (op === 'rotL') imgStudioCtx.rotateDeg = (imgStudioCtx.rotateDeg + 270) % 360;
        if (op === 'rotR') imgStudioCtx.rotateDeg = (imgStudioCtx.rotateDeg + 90) % 360;
        if (op === 'flipH') imgStudioCtx.flipH = !imgStudioCtx.flipH;
        if (op === 'flipV') imgStudioCtx.flipV = !imgStudioCtx.flipV;
        await refreshImageStudioPreview();
        return;
      }
      const stage = e.target.closest('#img-studio-stage');
      if (stage) {
        const rect = stage.getBoundingClientRect();
        imgStudioCtx.focalX = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
        imgStudioCtx.focalY = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
        const dot = document.getElementById('img-studio-focal-dot');
        if (dot) {
          dot.style.left = `${imgStudioCtx.focalX}%`;
          dot.style.top = `${imgStudioCtx.focalY}%`;
        }
        await refreshImageStudioPreview();
      }
    });

    body.addEventListener('input', async (e) => {
      if (!imgStudioCtx) return;
      if (e.target.id === 'imgs-quality') {
        imgStudioCtx.quality = Number(e.target.value) || 82;
        const v = document.getElementById('imgs-quality-val');
        if (v) v.textContent = `${imgStudioCtx.quality}%`;
        await refreshImageStudioPreview();
      } else if (e.target.id === 'imgs-alt') {
        imgStudioCtx.altValue = e.target.value;
      }
    });
  }

  const applyBtn = document.getElementById('btn-img-studio-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      if (!imgStudioCtx) return;
      const proc = imgStudioCtx.lastProcessed;
      if (!proc) {
        closeModal('modal-image-studio');
        return;
      }
      const saved = await saveImageBlob(proc.blob, {
        width: proc.width,
        height: proc.height,
        focalX: imgStudioCtx.focalX,
        focalY: imgStudioCtx.focalY,
        fileName: `${imgStudioCtx.slotKey}.webp`,
      });
      await imgStudioCtx.onApply({
        ref: saved.ref,
        dataUrl: saved.dataUrl,
        width: proc.width,
        height: proc.height,
        focalX: imgStudioCtx.focalX,
        focalY: imgStudioCtx.focalY,
        altValue: imgStudioCtx.altValue,
      });
      closeModal('modal-image-studio');
      showToast(`Saved optimized image (${Math.max(1, Math.round(proc.bytes / 1024))} KB)`, 'success');
    });
  }
}

/* ==========================================================================
   6. Smart Copy Bank Modal (Phase B1 — Deterministic Seeded, Zero AI)
   ========================================================================== */

let copyBankShuffle = 0;
let copyBankField = 'heroHeadline';

const COPY_FIELDS = [
  { id: 'tagline', label: 'Tagline' },
  { id: 'heroHeadline', label: 'Hero Headline' },
  { id: 'heroSubheadline', label: 'Hero Subheadline' },
  { id: 'about', label: 'About Story' },
  { id: 'cta', label: 'Call-to-Action Button' },
  { id: 'metaDescription', label: 'SEO Meta Description' },
  { id: 'services', label: 'Services Pack (3 cards)' },
  { id: 'faq', label: 'FAQ Starter Pack (3 Q&As)' },
];

export function openSmartCopyModal(state, stepId, openModal) {
  const stepDefaultField = {
    identity: 'tagline',
    hero: 'heroHeadline',
    about: 'about',
    sections: 'services',
    seo: 'metaDescription',
  };
  copyBankField = stepDefaultField[stepId] || 'heroHeadline';
  renderSmartCopyBody(state);
  openModal('modal-copy-bank');
}

export function renderSmartCopyBody(state) {
  const body = document.getElementById('copy-bank-body');
  if (!body) return;
  const tone = state.copyTone || 'professional';
  const suggestions = getSmartCopySuggestions({
    field: copyBankField,
    state,
    tone,
    shuffleIndex: copyBankShuffle,
  });

  body.innerHTML = `
    <div class="step-content">
      <div class="field-group">
        <span class="field-label">Writing Tone (30 site types × 6 tones)</span>
        <div class="choice-pills">
          ${COPY_TONES.map(
            (tn) => `<button type="button" class="choice-pill${tone === tn.id ? ' is-selected' : ''}" data-cb-tone="${tn.id}">${escapeHTML(tn.name)}</button>`
          ).join('')}
        </div>
      </div>

      <div class="field-group">
        <span class="field-label">Target Field</span>
        <div class="choice-pills">
          ${COPY_FIELDS.map(
            (f) => `<button type="button" class="choice-pill${copyBankField === f.id ? ' is-selected' : ''}" data-cb-field="${f.id}">${escapeHTML(f.label)}</button>`
          ).join('')}
        </div>
      </div>

      <div class="inline-bar" style="justify-content:space-between;">
        <span class="field-helper">100% deterministic offline templates personalized with your site name &amp; city.</span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-cb-shuffle">Shuffle</button>
      </div>

      <div class="list-editor">
        ${suggestions
          .map((item, idx) => {
            const preview =
              typeof item === 'string'
                ? item
                : Array.isArray(item)
                ? item.map((x) => x.title || x.question || '').filter(Boolean).join(' · ')
                : String(item);
            return `<div class="copy-card">
              <div>${escapeHTML(preview)}</div>
              <button type="button" class="btn btn-primary btn-sm" data-cb-use="${idx}">Use this</button>
            </div>`;
          })
          .join('')}
      </div>
      <div class="inline-bar" style="justify-content:flex-end;">
        <button type="button" class="btn btn-ghost btn-sm" data-close-modal="modal-copy-bank">Keep my own text</button>
      </div>
    </div>`;
}

export function applySmartCopyChoice(state, idx) {
  const suggestions = getSmartCopySuggestions({
    field: copyBankField,
    state,
    tone: state.copyTone || 'professional',
    shuffleIndex: copyBankShuffle,
  });
  const chosen = suggestions[idx];
  if (!chosen) return false;
  if (copyBankField === 'services' && Array.isArray(chosen)) {
    state.services = chosen.map((c) => ({
      title: c.title || '',
      description: c.description || '',
      icon: c.icon || 'sparkles',
      image: '',
      imageAlt: '',
      price: c.price || '',
      link: '#contact',
      buttonLabel: 'Learn more',
    }));
  } else if (copyBankField === 'faq' && Array.isArray(chosen)) {
    state.faqItems = chosen.map((c) => ({ question: c.question || '', answer: c.answer || '' }));
    if (state.sections?.faq) state.sections.faq.enabled = true;
  } else if (copyBankField === 'cta') {
    state.heroPrimaryBtnText = String(chosen).slice(0, 32);
    state.ctaButtonText = String(chosen).slice(0, 32);
  } else {
    state[copyBankField] = String(chosen);
  }
  return true;
}

export function writeStepForMe(state, stepId) {
  const tone = state.copyTone || 'professional';
  const pick = (field) => getSmartCopySuggestions({ field, state, tone, shuffleIndex: copyBankShuffle })[0];
  if (stepId === 'identity') {
    if (!state.siteName.trim()) state.siteName = 'Northwind Studio';
    state.tagline = String(pick('tagline') || state.tagline);
  } else if (stepId === 'hero') {
    state.heroHeadline = String(pick('heroHeadline') || state.heroHeadline);
    state.heroSubheadline = String(pick('heroSubheadline') || state.heroSubheadline);
    state.heroPrimaryBtnText = String(pick('cta') || state.heroPrimaryBtnText).slice(0, 32);
  } else if (stepId === 'about') {
    state.about = String(pick('about') || state.about);
  } else if (stepId === 'sections') {
    const srv = pick('services');
    if (Array.isArray(srv)) {
      state.services = srv.map((c) => ({
        title: c.title,
        description: c.description,
        icon: c.icon || 'sparkles',
        image: '',
        imageAlt: '',
        price: c.price || '',
        link: '#contact',
        buttonLabel: 'Learn more',
      }));
    }
    const faqs = pick('faq');
    if (Array.isArray(faqs)) {
      state.faqItems = faqs;
      if (state.sections?.faq) state.sections.faq.enabled = true;
    }
  } else if (stepId === 'seo') {
    state.metaTitle = `${state.siteName || 'My Website'} — Official Site`.slice(0, 70);
    state.metaDescription = String(pick('metaDescription') || '').slice(0, 160);
  } else {
    state.heroHeadline = state.heroHeadline || String(pick('heroHeadline') || '');
    state.about = state.about || String(pick('about') || '');
  }
  copyBankShuffle += 1;
}

export function bumpSmartCopyShuffle() {
  copyBankShuffle += 1;
}
export function setSmartCopyField(fid) {
  copyBankField = fid;
}

/* ==========================================================================
   7. Brand Studio Modal (Harmonies, Logo Extractor, Custom Themes, Pairings) — Phase B2
   ========================================================================== */

let brandSeedHex = '#c2593f';
let extractedLogoSwatches = [];

export async function openBrandStudioModal(state, openModal) {
  brandSeedHex = state.customPrimary || (themes[state.theme]?.vars['--primary']) || '#c2593f';
  await renderBrandStudioBody(state);
  openModal('modal-brand-studio');
}

export async function renderBrandStudioBody(state) {
  const body = document.getElementById('brand-studio-body');
  if (!body) return;
  const harmonies = generateBrandHarmonies(brandSeedHex);
  const savedThemes = (await getSetting('customThemes', [])) || [];
  const headFont = FONT_STACK_MAP[state.headingFont] || FONT_STACK_MAP['modern-sans'];
  const bodyFont = FONT_STACK_MAP[state.bodyFont] || FONT_STACK_MAP['modern-sans'];

  body.innerHTML = `
    <div class="step-content">
      <div class="field-group">
        <span class="field-label">1. Generate Contrast-Checked Palette from 1 Brand Colour</span>
        <div class="inline-bar">
          <input id="bs-seed-color" type="color" value="${escapeHTML(brandSeedHex)}" style="width:44px;height:36px;border:1px solid var(--sf-border);border-radius:6px;cursor:pointer;" />
          <input id="bs-seed-hex" type="text" class="field-input" style="max-width:130px;" value="${escapeHTML(brandSeedHex)}" maxlength="7" />
          <button type="button" class="btn btn-secondary btn-sm" id="btn-bs-extract-logo" ${state.logoDataUrl ? '' : 'disabled'}>Extract from Uploaded Logo</button>
        </div>
        ${
          extractedLogoSwatches.length
            ? `<div class="inline-bar" style="margin-top:0.4rem;">
                <span class="field-helper">Logo colours:</span>
                ${extractedLogoSwatches
                  .map(
                    (hex) => `<button type="button" class="choice-pill" data-bs-seed="${escapeHTML(hex)}"><span class="swatch-dot" style="width:14px;height:14px;background:${escapeHTML(hex)};"></span>${escapeHTML(hex)}</button>`
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>

      <div class="list-editor">
        ${harmonies
          .map(
            (h) => `<div class="harmony-row">
            <div style="display:flex;align-items:center;gap:0.65rem;">
              <span class="swatch-dots">
                <span class="swatch-dot" style="background:${h.bg};"></span>
                <span class="swatch-dot" style="background:${h.primary};"></span>
                <span class="swatch-dot" style="background:${h.accent};"></span>
                <span class="swatch-dot" style="background:${h.text};"></span>
              </span>
              <div>
                <strong style="font-size:0.84rem;">${escapeHTML(h.name)}</strong>
                <div class="field-helper">Text contrast ${h.textContrast}:1 · Primary ${h.primaryContrast}:1 (AA verified)</div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-bs-apply-harmony="${escapeHTML(JSON.stringify(h))}">Apply</button>
          </div>`
          )
          .join('')}
      </div>

      <div class="field-group">
        <div class="field-label-row">
          <span class="field-label">2. Custom Saved Themes (${savedThemes.length})</span>
          <div class="inline-bar">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-bs-save-theme">Save Current</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-bs-export-theme">Export JSON</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-bs-import-theme">Import JSON</button>
          </div>
        </div>
        ${
          savedThemes.length
            ? `<div class="choice-pills">
                ${savedThemes
                  .map(
                    (ct, i) => `<button type="button" class="choice-pill" data-bs-load-custom="${i}">
                    <span class="swatch-dot" style="width:12px;height:12px;background:${escapeHTML(ct.primary)};"></span>
                    ${escapeHTML(ct.name)}
                  </button>`
                  )
                  .join('')}
              </div>`
            : '<span class="field-helper">No custom themes saved yet.</span>'
        }
      </div>

      <div class="field-group">
        <span class="field-label">3. Font Pairing Presets &amp; Live Specimen</span>
        <div class="specimen-card">
          <div style="font-family:${escapeHTML(headFont.css)};font-size:1.3rem;font-weight:700;margin-bottom:0.25rem;">
            ${escapeHTML(state.siteName || 'Northwind Studio')} — Clear Typography
          </div>
          <div style="font-family:${escapeHTML(bodyFont.css)};font-size:0.9rem;color:var(--sf-muted);">
            System font stacks load in 0 ms offline with zero external requests and crisp rendering across every device.
          </div>
        </div>
        <div class="mcq-grid" style="margin-top:0.5rem;">
          ${FONT_PAIRINGS.map(
            (fp) => `<button type="button" class="mcq-card${state.headingFont === fp.headingFont && state.bodyFont === fp.bodyFont ? ' is-selected' : ''}" data-bs-pairing="${fp.id}">
              <span class="mcq-card-title">${escapeHTML(fp.name)}</span>
              <span class="mcq-card-desc">${escapeHTML(fp.vibe)}</span>
            </button>`
          ).join('')}
        </div>
      </div>
    </div>`;
}

export function setBrandSeed(hex) {
  brandSeedHex = hex;
}

export async function runLogoColorExtraction(state, showToast) {
  const uri = getCachedImageUri(state.logoDataUrl) || state.logoDataUrl;
  if (!uri) {
    showToast('Upload a logo in Step 11 first.');
    return;
  }
  const palette = await extractLogoPalette(uri);
  if (!palette.length) {
    showToast('Could not read colours from this logo.');
    return;
  }
  extractedLogoSwatches = palette;
  brandSeedHex = palette[0];
  await renderBrandStudioBody(state);
  showToast(`Extracted ${palette.length} brand colours from logo`, 'success');
}

export async function saveCurrentCustomTheme(state, showToast) {
  const saved = (await getSetting('customThemes', [])) || [];
  const name = `Brand ${saved.length + 1} (${state.customPrimary || '#2563eb'})`;
  saved.unshift({
    name,
    primary: state.customPrimary,
    accent: state.customAccent,
    bg: state.customBg,
    text: state.customText,
    headingFont: state.headingFont,
    bodyFont: state.bodyFont,
  });
  await setSetting('customThemes', saved.slice(0, 20));
  await renderBrandStudioBody(state);
  showToast('Saved custom theme to IndexedDB', 'success');
}

export function exportCustomThemeJson(state, showToast) {
  const payload = {
    app: 'SiteForgeTheme',
    version: 1,
    name: `${state.siteName || 'Custom'} Theme`,
    primary: state.customPrimary,
    accent: state.customAccent,
    bg: state.customBg,
    text: state.customText,
    headingFont: state.headingFont,
    bodyFont: state.bodyFont,
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `${slugifyName(state.siteName || 'custom')}-theme.json`
  );
  showToast('Exported custom theme JSON', 'success');
}

/* ==========================================================================
   8. Go-Live Guide & Offline QR Studio Modal (Phase A7 + B3)
   ========================================================================== */

let activeGoLiveTab = 'github-pages';
let activeQrMode = 'site';
let wifiSsidDraft = '';
let wifiPassDraft = '';

export function openGoLiveModal(state, openModal) {
  renderGoLiveBody(state);
  openModal('modal-golive');
}

export function renderGoLiveBody(state) {
  const body = document.getElementById('golive-body');
  if (!body) return;
  const provider = GO_LIVE_PROVIDERS.find((p) => p.id === activeGoLiveTab) || GO_LIVE_PROVIDERS[0];

  // Compute active QR payload
  let qrPayload = '';
  let qrCaption = '';
  if (activeQrMode === 'site') {
    qrPayload = (state.siteUrl || '').trim() || 'https://example.com';
    qrCaption = (state.siteUrl || '').trim()
      ? 'Scan to open your live website on a phone'
      : 'Add your live Site URL in Step 11 to generate your real website QR';
  } else if (activeQrMode === 'whatsapp') {
    const digits = cleanWhatsAppDigits(state.whatsappNumber || state.contactPhone || '');
    qrPayload = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(state.whatsappMessage || 'Hello!')}` : 'https://wa.me/15551234567';
    qrCaption = digits ? `WhatsApp chat for +${digits}` : 'Add your WhatsApp number in Step 9';
  } else if (activeQrMode === 'upi') {
    qrPayload = isValidUpiId(state.upiId)
      ? buildUpiUri({ pa: state.upiId, pn: state.siteName || 'Merchant', am: state.upiAmount, tn: state.upiNote })
      : 'upi://pay?pa=merchant@upi&pn=Business';
    qrCaption = isValidUpiId(state.upiId) ? `UPI ID: ${state.upiId}` : 'Add your UPI ID in Step 9';
  } else if (activeQrMode === 'phone') {
    const tel = (state.contactPhone || '').trim() || '+15552345678';
    qrPayload = `tel:${tel.replace(/[^\d+]/g, '')}`;
    qrCaption = `Call ${tel}`;
  } else if (activeQrMode === 'wifi') {
    qrPayload = buildWifiQrPayload(wifiSsidDraft || 'GuestWiFi', wifiPassDraft || '', wifiPassDraft ? 'WPA' : 'nopass');
    qrCaption = `Wi-Fi network: ${wifiSsidDraft || 'GuestWiFi'}`;
  }

  const qrSvg = renderQrSvg(qrPayload, { sizePx: 196, label: qrCaption });

  body.innerHTML = `
    <div class="step-content">
      <div class="field-group">
        <span class="field-label">Step-by-Step Free Hosting Guides (No coding required)</span>
        <div class="choice-pills">
          ${GO_LIVE_PROVIDERS.map(
            (p) => `<button type="button" class="choice-pill${p.id === activeGoLiveTab ? ' is-selected' : ''}" data-gl-tab="${p.id}">${escapeHTML(p.name)}</button>`
          ).join('')}
        </div>
      </div>

      <div class="help-card">
        <div class="field-label-row">
          <h3>${escapeHTML(provider.name)}</h3>
          <span class="mono-label">${escapeHTML(provider.cost)} · ${escapeHTML(provider.time)}</span>
        </div>
        <ol class="ios-steps" style="margin-top:0.55rem;font-size:0.84rem;">
          ${provider.steps.map((s) => `<li>${escapeHTML(s)}</li>`).join('')}
        </ol>
      </div>

      <div class="field-group" style="border-top:1px solid var(--sf-border);padding-top:0.85rem;">
        <span class="field-label">Offline QR Code &amp; Printable A4 Shop Poster</span>
        <div class="choice-pills">
          <button type="button" class="choice-pill${activeQrMode === 'site' ? ' is-selected' : ''}" data-qr-mode="site">Website / Phone Preview</button>
          <button type="button" class="choice-pill${activeQrMode === 'whatsapp' ? ' is-selected' : ''}" data-qr-mode="whatsapp">WhatsApp</button>
          <button type="button" class="choice-pill${activeQrMode === 'upi' ? ' is-selected' : ''}" data-qr-mode="upi">UPI Pay</button>
          <button type="button" class="choice-pill${activeQrMode === 'phone' ? ' is-selected' : ''}" data-qr-mode="phone">Phone Call</button>
          <button type="button" class="choice-pill${activeQrMode === 'wifi' ? ' is-selected' : ''}" data-qr-mode="wifi">Shop Wi-Fi</button>
        </div>
        ${
          activeQrMode === 'wifi'
            ? `<div class="field-row-2" style="margin-top:0.45rem;">
                <input type="text" id="qr-wifi-ssid" class="field-input" value="${escapeHTML(wifiSsidDraft)}" placeholder="Wi-Fi Network Name (SSID)" />
                <input type="text" id="qr-wifi-pass" class="field-input" value="${escapeHTML(wifiPassDraft)}" placeholder="Wi-Fi Password (optional)" />
              </div>`
            : ''
        }
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:0.6rem;">
          <div class="qr-preview-box">${qrSvg}</div>
          <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:0.5rem;">
            <strong style="font-size:0.88rem;">${escapeHTML(qrCaption)}</strong>
            <code style="font-size:0.74rem;word-break:break-all;color:var(--sf-muted);">${escapeHTML(qrPayload)}</code>
            <div class="inline-bar">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-qr-dl-svg" data-qr-payload="${escapeHTML(qrPayload)}">Download QR (.svg)</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-qr-poster" data-qr-payload="${escapeHTML(qrPayload)}" data-qr-caption="${escapeHTML(qrCaption)}">Download A4 QR Poster</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function setGoLiveTab(tab) {
  activeGoLiveTab = tab;
}
export function setQrMode(mode) {
  activeQrMode = mode;
}
export function setWifiDraft(ssid, pass) {
  wifiSsidDraft = ssid;
  wifiPassDraft = pass;
}

export function downloadQrSvgFile(payload, state, showToast) {
  const svg = renderQrSvg(payload, { sizePx: 320, label: state.siteName || 'QR Code' });
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${slugifyName(state.siteName || 'site')}-qr.svg`);
  showToast('Downloaded QR code SVG', 'success');
}

export function downloadQrPosterFile(payload, caption, state, showToast) {
  const th = themes[state.theme] || themes['light-clean'];
  const html = buildPrintableQrPosterHtml({
    siteName: state.siteName || 'My Website',
    subtitle: state.tagline || caption,
    qrPayload: payload,
    primaryColor: state.useCustomColors ? state.customPrimary : th.vars['--primary'],
    caption,
  });
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${slugifyName(state.siteName || 'site')}-qr-poster.html`);
  showToast('Downloaded printable A4 QR poster (.html — open & print)', 'success');
}

/* ==========================================================================
   9. Version History Snapshots Modal (Up to 30 per project) — Phase C3
   ========================================================================== */

export async function openHistoryModal(projectId, currentState, openModal) {
  await renderHistoryBody(projectId, currentState);
  openModal('modal-history');
}

export async function renderHistoryBody(projectId, currentState) {
  const body = document.getElementById('history-body');
  if (!body) return;
  const snaps = await getProjectSnapshots(projectId);

  body.innerHTML = `
    <div class="step-content">
      <div class="inline-bar">
        <input type="text" id="snapshot-name-input" class="field-input" style="flex:1;" maxlength="60" placeholder="Snapshot label (e.g. Before color change)" />
        <button type="button" id="btn-save-snapshot" class="btn btn-primary btn-sm">Save Snapshot</button>
      </div>
      <p class="field-helper" style="margin:0;">Stores up to 30 named checkpoints per project in IndexedDB with readable change summaries.</p>
      ${
        snaps.length === 0
          ? '<div class="library-empty"><p>No snapshots saved yet. Save one above before making major edits.</p></div>'
          : `<div class="library-grid">
              ${snaps
                .map((sn) => {
                  const dt = new Date(sn.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                  const diffText = (sn.diff || []).length ? sn.diff.join(' · ') : 'Checkpoint saved';
                  return `<div class="library-item">
                    <div>
                      <div class="library-item-title">${escapeHTML(sn.name)}</div>
                      <div class="library-item-meta">${escapeHTML(dt)}</div>
                      <div class="field-helper" style="margin-top:0.2rem;">${escapeHTML(diffText)}</div>
                    </div>
                    <div class="library-item-actions">
                      <button type="button" class="btn btn-primary btn-sm" data-snap-restore="${escapeHTML(sn.id)}">Restore</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-snap-delete="${escapeHTML(sn.id)}">Delete</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>`
      }
    </div>`;
}

export async function createNamedSnapshot(projectId, name, stateObj, showToast) {
  const existing = await getProjectSnapshots(projectId);
  const prevState = existing[0]?.state || null;
  const label = (name || '').trim() || `Checkpoint ${existing.length + 1}`;
  await saveSnapshot(projectId, label, stateObj, prevState);
  await renderHistoryBody(projectId, stateObj);
  showToast(`Saved snapshot "${label}"`, 'success');
}

export async function removeSnapshotById(projectId, snapId, currentState, showToast) {
  await deleteSnapshot(snapId);
  await renderHistoryBody(projectId, currentState);
  showToast('Snapshot deleted');
}

/* ==========================================================================
   10. Demo & Presentation Mode Modal (Phase C2)
   ========================================================================== */

let demoTimerSec = 300;
let demoTimerHandle = null;

function formatTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export async function openDemoModal(openModal) {
  await renderDemoBody();
  openModal('modal-demo');
}

export async function renderDemoBody() {
  const body = document.getElementById('demo-body');
  if (!body) return;
  let cachedCount = 0;
  let swActive = false;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      swActive = Boolean(reg && reg.active);
    }
    if ('caches' in window) {
      const names = await caches.keys();
      for (const n of names) {
        const c = await caches.open(n);
        const ks = await c.keys();
        cachedCount += ks.length;
      }
    }
  } catch {}

  const st = await getStorageStatus();

  body.innerHTML = `
    <div class="step-content">
      <div class="demo-timer-box">
        <div>
          <span class="mono-label">5-MINUTE VIVA / DEMO TIMER</span>
          <div id="demo-timer-clock" class="demo-timer-clock">${formatTimer(demoTimerSec)}</div>
        </div>
        <div class="inline-bar">
          <button type="button" id="btn-demo-timer-toggle" class="btn btn-primary btn-sm">${demoTimerHandle ? 'Pause' : 'Start'}</button>
          <button type="button" id="btn-demo-timer-reset" class="btn btn-secondary btn-sm">Reset 05:00</button>
        </div>
      </div>

      <div class="field-group">
        <span class="field-label">One-Click Demo Actions</span>
        <div class="export-actions-grid">
          <button type="button" id="btn-demo-load-sample" class="btn btn-primary btn-sm">Load Rich Sample Project</button>
          <button type="button" id="btn-demo-xss-test" class="btn btn-secondary btn-sm">Insert Harmless XSS Test</button>
          <button type="button" id="btn-demo-selftest" class="btn btn-secondary btn-sm">Run Full Self-Test Suite</button>
          <button type="button" id="btn-demo-backup" class="btn btn-secondary btn-sm">Download .siteforge Backup</button>
        </div>
      </div>

      <div class="help-card">
        <h3>Offline Proof (Live Browser Telemetry)</h3>
        <p>
          Connection: <strong>${navigator.onLine ? 'Online (ready to go offline)' : 'Offline'}</strong> ·
          Service Worker: <strong>${swActive ? 'Active' : 'Registering'}</strong> ·
          Cached App Files: <strong>${cachedCount}</strong> ·
          IndexedDB Projects: <strong>${st.projectCount}</strong> ·
          External Runtime Requests: <strong>0</strong>
        </p>
      </div>

      <div class="field-group">
        <span class="field-label">Deterministic Offline Architecture Diagram</span>
        <div class="arch-diagram-wrap">
          <svg viewBox="0 0 680 185" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SiteForge offline architecture diagram">
            <rect x="8" y="18" width="132" height="62" rx="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <text x="74" y="44" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">12-Step Wizard</text>
            <text x="74" y="63" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">options.js data arrays</text>

            <line x1="140" y1="49" x2="176" y2="49" stroke="currentColor" stroke-width="1.8"/>
            <polygon points="176,44 186,49 176,54" fill="currentColor"/>

            <rect x="188" y="18" width="138" height="62" rx="10" fill="none" stroke="currentColor" stroke-width="2.2"/>
            <text x="257" y="44" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Single State Object</text>
            <text x="257" y="63" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">IndexedDB + Blobs</text>

            <line x1="326" y1="49" x2="362" y2="49" stroke="currentColor" stroke-width="1.8"/>
            <polygon points="362,44 372,49 362,54" fill="currentColor"/>

            <rect x="374" y="18" width="136" height="62" rx="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <text x="442" y="44" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Pure buildSite()</text>
            <text x="442" y="63" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">escapeHTML + 288 tpl</text>

            <line x1="510" y1="49" x2="542" y2="49" stroke="currentColor" stroke-width="1.8"/>
            <polygon points="542,44 552,49 542,54" fill="currentColor"/>

            <rect x="554" y="10" width="118" height="36" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <text x="613" y="32" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">Sandboxed Iframe</text>

            <rect x="554" y="56" width="118" height="36" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <text x="613" y="78" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">ZIP / HTML / PWA</text>

            <rect x="120" y="114" width="440" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
            <text x="340" y="137" text-anchor="middle" font-size="11.5" font-weight="700" fill="currentColor">100% Browser-Local Engine · Zero AI · Zero Backend · Zero CDNs</text>
            <text x="340" y="155" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.72">Service Worker Cache · Pure-JS ZIP/QR/Canvas/Health · Round-Trip HTML Re-Open</text>
          </svg>
        </div>
      </div>
    </div>`;
}

export function toggleDemoTimer() {
  if (demoTimerHandle) {
    clearInterval(demoTimerHandle);
    demoTimerHandle = null;
  } else {
    demoTimerHandle = setInterval(() => {
      if (demoTimerSec > 0) demoTimerSec -= 1;
      else {
        clearInterval(demoTimerHandle);
        demoTimerHandle = null;
      }
      const el = document.getElementById('demo-timer-clock');
      if (el) el.textContent = formatTimer(demoTimerSec);
    }, 1000);
  }
  const btn = document.getElementById('btn-demo-timer-toggle');
  if (btn) btn.textContent = demoTimerHandle ? 'Pause' : 'Start';
}

export function resetDemoTimer() {
  if (demoTimerHandle) {
    clearInterval(demoTimerHandle);
    demoTimerHandle = null;
  }
  demoTimerSec = 300;
  const el = document.getElementById('demo-timer-clock');
  if (el) el.textContent = formatTimer(demoTimerSec);
  const btn = document.getElementById('btn-demo-timer-toggle');
  if (btn) btn.textContent = 'Start';
}

/* ==========================================================================
   11. Command Palette (Ctrl+K), Help Center, Guided Tour, What's New (Phase C3)
   ========================================================================== */

let cmdItemsCache = [];
let cmdActiveIdx = 0;

export function openCommandPalette(actions, openModal) {
  cmdItemsCache = actions;
  cmdActiveIdx = 0;
  const inp = document.getElementById('cmd-input');
  if (inp) inp.value = '';
  renderCommandPaletteList('');
  openModal('modal-cmd');
  if (inp) inp.focus();
}

export function renderCommandPaletteList(query) {
  const list = document.getElementById('cmd-list');
  if (!list) return;
  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? cmdItemsCache.filter(
        (a) => a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
      )
    : cmdItemsCache;
  cmdActiveIdx = Math.min(cmdActiveIdx, Math.max(0, filtered.length - 1));

  if (!filtered.length) {
    list.innerHTML = '<div class="library-empty" style="padding:1.2rem;"><p>No matching commands.</p></div>';
    return;
  }
  list.innerHTML = filtered
    .map(
      (item, i) => `<button type="button" class="cmd-item${i === cmdActiveIdx ? ' is-active' : ''}" data-cmd-id="${escapeHTML(item.id)}">
        <span>${escapeHTML(item.label)}</span>
        <span class="cmd-cat">${escapeHTML(item.category)}</span>
      </button>`
    )
    .join('');
}

export function runCommandById(id, closeModal) {
  const item = cmdItemsCache.find((a) => a.id === id);
  closeModal('modal-cmd');
  if (item && typeof item.run === 'function') item.run();
}

export function handleCommandKeydown(e, closeModal) {
  const list = document.getElementById('cmd-list');
  if (!list) return;
  const btns = Array.from(list.querySelectorAll('.cmd-item'));
  if (!btns.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdActiveIdx = (cmdActiveIdx + 1) % btns.length;
    btns.forEach((b, i) => b.classList.toggle('is-active', i === cmdActiveIdx));
    btns[cmdActiveIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdActiveIdx = (cmdActiveIdx - 1 + btns.length) % btns.length;
    btns.forEach((b, i) => b.classList.toggle('is-active', i === cmdActiveIdx));
    btns[cmdActiveIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const id = btns[cmdActiveIdx]?.getAttribute('data-cmd-id');
    if (id) runCommandById(id, closeModal);
  }
}

export function openHelpCenterModal(openModal) {
  const inp = document.getElementById('help-search');
  if (inp) inp.value = '';
  renderHelpCenterBody('');
  openModal('modal-help');
  if (inp) inp.focus();
}

export function renderHelpCenterBody(query) {
  const body = document.getElementById('help-body');
  if (!body) return;
  const q = (query || '').trim().toLowerCase();
  const matches = q
    ? HELP_CENTER_ITEMS.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.body.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q)
      )
    : HELP_CENTER_ITEMS;

  if (!matches.length) {
    body.innerHTML = '<div class="library-empty"><p>No matching offline help topics.</p></div>';
    return;
  }
  body.innerHTML = matches
    .map(
      (h) => `<article class="help-card">
        <span class="mono-label">${escapeHTML(h.category)}</span>
        <h3>${escapeHTML(h.title)}</h3>
        <p>${escapeHTML(h.body)}</p>
      </article>`
    )
    .join('');
}

export function openWhatsNewModal(openModal) {
  const body = document.getElementById('whats-new-body');
  if (!body) return;
  body.innerHTML = `<div class="help-list">${WHATS_NEW_ITEMS.map(
    (item) => `<div class="help-card">
      <span class="mono-label">${escapeHTML(item.phase)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.detail)}</p>
    </div>`
  ).join('')}</div>`;
  openModal('modal-whats-new');
}

let tourIndex = 0;

export function openGuidedTour(openModal, startAt = 0) {
  tourIndex = Math.max(0, Math.min(TOUR_STEPS.length - 1, startAt));
  renderTourStep();
  openModal('modal-tour');
}

export function renderTourStep() {
  const item = TOUR_STEPS[tourIndex];
  if (!item) return;
  const badge = document.getElementById('tour-step-badge');
  const title = document.getElementById('tour-title');
  const body = document.getElementById('tour-body');
  const prev = document.getElementById('btn-tour-prev');
  const next = document.getElementById('btn-tour-next');
  if (badge) badge.textContent = `TOUR ${tourIndex + 1} OF ${TOUR_STEPS.length}`;
  if (title) title.textContent = item.title;
  if (body) body.innerHTML = `<p class="modal-copy" style="font-size:0.95rem;line-height:1.6;">${escapeHTML(item.body)}</p>`;
  if (prev) prev.disabled = tourIndex === 0;
  if (next) next.textContent = tourIndex === TOUR_STEPS.length - 1 ? 'Start Building' : 'Next';
}

export async function advanceTour(delta, closeModal) {
  const next = tourIndex + delta;
  if (next >= TOUR_STEPS.length) {
    await setSetting('tourCompleted', true);
    closeModal('modal-tour');
    return;
  }
  tourIndex = Math.max(0, next);
  renderTourStep();
}

export async function finishTour(closeModal) {
  await setSetting('tourCompleted', true);
  closeModal('modal-tour');
}

export { externalizeStateImagesToBlobs, getCachedImageUri };
