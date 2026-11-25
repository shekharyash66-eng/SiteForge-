/**
 * SiteForge IndexedDB Data Safety & Persistence Layer (storage.js)
 * Stores projects, image Blobs, version snapshots, app settings, and published sites
 * inside IndexedDB. Keeps localStorage strictly for tiny UI prefs wrapped in try/catch.
 * Includes full workspace .siteforge ZIP backup/restore and optional File System Access folder save.
 */

import { createZip, readZip, dataUrlToBytes, blobToDataUrl } from './zip.js';
import {
  CURRENT_SCHEMA_VERSION,
  safeParseJsonText,
  validateAndNormalizeProjectState,
  sanitizeImageDataUrl,
} from './validators.js';

const DB_NAME = 'siteforge-storage-v2';
const DB_VERSION = 1;
const LEGACY_PUBLISHED_DB = 'siteforge-published-db';
const LEGACY_LS_KEY = 'siteforge_v2_workspace';
const UI_PREFS_LS_KEY = 'siteforge_v2_prefs';

// Fast in-memory cache mapping "sfimg:<id>" -> base64 data URI for synchronous preview/build
const imageUriCache = new Map();
const imageBlobCache = new Map();

let dbPromise = null;

export function openStorageDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapStore.createIndex('by_project', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('published')) {
        db.createObjectStore('published', { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// =========================================================================
// Tiny UI Preferences (localStorage only, always inside try/catch)
// =========================================================================

export function readUiPrefs(defaults) {
  try {
    const raw = localStorage.getItem(UI_PREFS_LS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // Ignore storage restriction errors
  }
  return { ...defaults };
}

export function writeUiPrefs(prefs) {
  try {
    localStorage.setItem(UI_PREFS_LS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota or privacy-mode errors
  }
}

// =========================================================================
// Settings Store (IndexedDB)
// =========================================================================

export async function getSetting(key, fallback = null) {
  try {
    const db = await openStorageDB();
    const tx = db.transaction('settings', 'readonly');
    const row = await reqPromise(tx.objectStore('settings').get(key));
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  const db = await openStorageDB();
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put({ key, value, updatedAt: Date.now() });
  await txDone(tx);
}

// =========================================================================
// Image Blob Store (IndexedDB)
// =========================================================================

export function isImageRef(val) {
  return typeof val === 'string' && /^sfimg:[a-zA-Z0-9_-]{4,80}$/.test(val);
}

export function getCachedImageUri(refOrDataUrl) {
  if (!refOrDataUrl) return '';
  if (isImageRef(refOrDataUrl)) {
    return imageUriCache.get(refOrDataUrl) || '';
  }
  return refOrDataUrl;
}

export async function saveImageBlob(blob, meta = {}) {
  const id = meta.id || `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = `sfimg:${id}`;
  const db = await openStorageDB();
  const tx = db.transaction('images', 'readwrite');
  tx.objectStore('images').put({
    id,
    blob,
    mime: blob.type || meta.mime || 'image/png',
    name: meta.name || `${id}.png`,
    width: meta.width || 0,
    height: meta.height || 0,
    size: blob.size || 0,
    updatedAt: Date.now(),
  });
  await txDone(tx);

  imageBlobCache.set(ref, blob);
  try {
    const dataUrl = await blobToDataUrl(blob);
    imageUriCache.set(ref, dataUrl);
  } catch {
    // Fallback if FileReader unavailable in headless test
  }
  return { id, ref };
}

export async function getImageRecord(refOrId) {
  const id = String(refOrId || '').replace(/^sfimg:/, '');
  if (!id) return null;
  const db = await openStorageDB();
  const tx = db.transaction('images', 'readonly');
  return reqPromise(tx.objectStore('images').get(id));
}

export async function getAllImageRecords() {
  const db = await openStorageDB();
  const tx = db.transaction('images', 'readonly');
  return reqPromise(tx.objectStore('images').getAll());
}

export async function deleteImageRecord(refOrId) {
  const id = String(refOrId || '').replace(/^sfimg:/, '');
  if (!id) return;
  const db = await openStorageDB();
  const tx = db.transaction('images', 'readwrite');
  tx.objectStore('images').delete(id);
  await txDone(tx);
  imageUriCache.delete(`sfimg:${id}`);
  imageBlobCache.delete(`sfimg:${id}`);
}

/**
 * Hydrates all stored image Blobs from IndexedDB into the fast in-memory data URI cache
 * so synchronous preview builds render every image immediately after reload.
 */
export async function hydrateImageCache() {
  try {
    const records = await getAllImageRecords();
    await Promise.all(
      records.map(async (rec) => {
        if (!rec?.id || !rec.blob) return;
        const ref = `sfimg:${rec.id}`;
        imageBlobCache.set(ref, rec.blob);
        if (!imageUriCache.has(ref)) {
          try {
            const uri = await blobToDataUrl(rec.blob);
            imageUriCache.set(ref, uri);
          } catch {
            // Skip unreadable blob
          }
        }
      })
    );
    return records.length;
  } catch {
    return 0;
  }
}

const SINGLE_IMAGE_KEYS = [
  'logoDataUrl',
  'faviconDataUrl',
  'ogImageDataUrl',
  'heroBgImage',
  'heroSideImage',
  'aboutImage',
];

/**
 * Converts any raw base64 data URIs inside a project state into IndexedDB Blob refs (sfimg:<id>)
 * before persisting the project JSON to IndexedDB. Keeps project records tiny & fast.
 */
export async function externalizeStateImagesToBlobs(stateObj) {
  const clone = structuredClone(stateObj);

  async function convertIfDataUrl(val, hintName) {
    if (typeof val !== 'string' || !val.startsWith('data:image/')) return val;
    const decoded = dataUrlToBytes(val);
    if (!decoded) return '';
    const blob = new Blob([decoded.bytes], { type: decoded.mime });
    const { ref } = await saveImageBlob(blob, { name: `${hintName}.${decoded.ext}`, mime: decoded.mime });
    imageUriCache.set(ref, val);
    return ref;
  }

  for (const key of SINGLE_IMAGE_KEYS) {
    if (clone[key] && clone[key].startsWith('data:image/')) {
      clone[key] = await convertIfDataUrl(clone[key], key);
    }
  }
  if (Array.isArray(clone.services)) {
    for (let i = 0; i < clone.services.length; i++) {
      if (clone.services[i]?.image?.startsWith('data:image/')) {
        clone.services[i].image = await convertIfDataUrl(clone.services[i].image, `service-${i + 1}`);
      }
    }
  }
  if (Array.isArray(clone.galleryItems)) {
    for (let i = 0; i < clone.galleryItems.length; i++) {
      if (clone.galleryItems[i]?.image?.startsWith('data:image/')) {
        clone.galleryItems[i].image = await convertIfDataUrl(clone.galleryItems[i].image, `gallery-${i + 1}`);
      }
    }
  }
  if (Array.isArray(clone.teamMembers)) {
    for (let i = 0; i < clone.teamMembers.length; i++) {
      if (clone.teamMembers[i]?.photo?.startsWith('data:image/')) {
        clone.teamMembers[i].photo = await convertIfDataUrl(clone.teamMembers[i].photo, `team-${i + 1}`);
      }
    }
  }

  return clone;
}

/**
 * Synchronously resolves any sfimg:<id> references inside a state object to data URIs
 * using the hydrated cache (used for preview & single-HTML/embedded exports).
 */
export function resolveStateImageUris(stateObj) {
  const clone = structuredClone(stateObj);
  const resolveVal = (v) => (isImageRef(v) ? getCachedImageUri(v) : v || '');

  for (const key of SINGLE_IMAGE_KEYS) {
    if (clone[key]) clone[key] = resolveVal(clone[key]);
  }
  if (Array.isArray(clone.services)) {
    clone.services = clone.services.map((s) => ({ ...s, image: resolveVal(s?.image) }));
  }
  if (Array.isArray(clone.galleryItems)) {
    clone.galleryItems = clone.galleryItems.map((g) => ({ ...g, image: resolveVal(g?.image) }));
  }
  if (Array.isArray(clone.teamMembers)) {
    clone.teamMembers = clone.teamMembers.map((m) => ({ ...m, photo: resolveVal(m?.photo) }));
  }
  return clone;
}

// =========================================================================
// Projects Store (IndexedDB) + Legacy Migration
// =========================================================================

export async function getAllProjects() {
  const db = await openStorageDB();
  const tx = db.transaction('projects', 'readonly');
  const list = await reqPromise(tx.objectStore('projects').getAll());
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function saveProjectRecord(project) {
  const externalizedState = await externalizeStateImagesToBlobs(project.state);
  const record = {
    id: project.id,
    name: project.name,
    currentStep: project.currentStep || 0,
    highestStep: project.highestStep || 0,
    updatedAt: project.updatedAt || Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    state: externalizedState,
  };
  const db = await openStorageDB();
  const tx = db.transaction('projects', 'readwrite');
  tx.objectStore('projects').put(record);
  await txDone(tx);
  return record;
}

export async function deleteProjectRecord(projectId) {
  const db = await openStorageDB();
  const tx = db.transaction(['projects', 'snapshots'], 'readwrite');
  tx.objectStore('projects').delete(projectId);
  const snapStore = tx.objectStore('snapshots');
  const idx = snapStore.index('by_project');
  const snaps = await reqPromise(idx.getAll(projectId));
  for (const s of snaps) {
    snapStore.delete(s.id);
  }
  await txDone(tx);
}

/**
 * Migrates any pre-upgrade projects from localStorage and legacy published sites DB
 * into the unified IndexedDB v2 store on first launch.
 */
export async function migrateLegacyStorageIfNeeded(defaultStateFactory) {
  const alreadyMigrated = await getSetting('legacyMigratedV2', false);
  if (alreadyMigrated) return false;

  // 1. Migrate legacy localStorage workspace
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const parsed = safeParseJsonText(raw);
      if (parsed.ok && Array.isArray(parsed.data?.projects)) {
        for (const p of parsed.data.projects) {
          const norm = validateAndNormalizeProjectState(p.state || {}, defaultStateFactory);
          if (norm.ok) {
            await saveProjectRecord({
              id: p.id || `proj_${Date.now().toString(36)}`,
              name: p.name || norm.state.siteName || 'Migrated Site',
              currentStep: p.currentStep || 0,
              highestStep: p.highestStep || 0,
              updatedAt: p.updatedAt || Date.now(),
              state: norm.state,
            });
          }
        }
        if (parsed.data.activeProjectId) {
          await setSetting('activeProjectId', parsed.data.activeProjectId);
        }
      }
    }
  } catch {
    // Ignore legacy localStorage issues
  }

  // 2. Migrate legacy published sites DB if present
  try {
    const legacySites = await new Promise((resolve) => {
      const req = indexedDB.open(LEGACY_PUBLISHED_DB, 1);
      req.onerror = () => resolve([]);
      req.onupgradeneeded = () => {
        // Did not exist before
      };
      req.onsuccess = () => {
        const ldb = req.result;
        if (!ldb.objectStoreNames.contains('sites')) {
          ldb.close();
          resolve([]);
          return;
        }
        const tx = ldb.transaction('sites', 'readonly');
        const allReq = tx.objectStore('sites').getAll();
        allReq.onsuccess = () => {
          ldb.close();
          resolve(allReq.result || []);
        };
        allReq.onerror = () => {
          ldb.close();
          resolve([]);
        };
      };
    });
    if (legacySites.length) {
      const db = await openStorageDB();
      const tx = db.transaction('published', 'readwrite');
      const store = tx.objectStore('published');
      for (const s of legacySites) {
        if (s?.name) store.put(s);
      }
      await txDone(tx);
    }
  } catch {
    // Ignore legacy published DB migration errors
  }

  await setSetting('legacyMigratedV2', true);
  return true;
}

// =========================================================================
// Published Sites Store (IndexedDB)
// =========================================================================

export async function idbSavePublishedSite(record) {
  const db = await openStorageDB();
  const tx = db.transaction('published', 'readwrite');
  tx.objectStore('published').put(record);
  await txDone(tx);
}

export async function idbGetAllPublishedSites() {
  const db = await openStorageDB();
  const tx = db.transaction('published', 'readonly');
  const list = await reqPromise(tx.objectStore('published').getAll());
  return list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export async function idbDeletePublishedSite(name) {
  const db = await openStorageDB();
  const tx = db.transaction('published', 'readwrite');
  tx.objectStore('published').delete(name);
  await txDone(tx);
}

// =========================================================================
// Version Snapshots Store (up to 30 named snapshots per project)
// =========================================================================

export function computeStateDiff(oldState, newState) {
  const changes = [];
  const labels = {
    siteName: 'Site name',
    tagline: 'Tagline',
    siteLanguage: 'Language',
    siteType: 'Site type',
    layout: 'Layout',
    theme: 'Theme',
    font: 'Font',
    siteStructure: 'Site structure (one-page / multi-page)',
    heroHeadline: 'Hero headline',
    about: 'About text',
    contactEmail: 'Contact email',
    contactPhone: 'Phone number',
    footerText: 'Footer text',
    metaTitle: 'SEO title',
    metaDescription: 'SEO description',
    siteUrl: 'Live Site URL',
    bilingualEnabled: 'Bilingual mode',
    upiEnabled: 'UPI payment',
    whatsappFloatEnabled: 'WhatsApp chat button',
    makeSiteOffline: 'Offline-ready exported site',
  };

  for (const [k, label] of Object.entries(labels)) {
    if (JSON.stringify(oldState?.[k]) !== JSON.stringify(newState?.[k])) {
      changes.push(label);
    }
  }
  if (JSON.stringify(oldState?.menuItems) !== JSON.stringify(newState?.menuItems)) {
    changes.push(`Navigation pages (${newState?.menuItems?.length || 0})`);
  }
  if (JSON.stringify(oldState?.services) !== JSON.stringify(newState?.services)) {
    changes.push(`Services (${newState?.services?.length || 0})`);
  }
  if (JSON.stringify(oldState?.blogPosts) !== JSON.stringify(newState?.blogPosts)) {
    changes.push(`Blog posts (${newState?.blogPosts?.length || 0})`);
  }
  if (JSON.stringify(oldState?.sections) !== JSON.stringify(newState?.sections)) {
    changes.push('Enabled sections');
  }
  return changes.length ? changes : ['Minor styling or content update'];
}

export async function saveSnapshot(projectId, name, stateObj, previousState = null) {
  const externalized = await externalizeStateImagesToBlobs(stateObj);
  const diff = previousState ? computeStateDiff(previousState, stateObj) : ['Initial snapshot'];
  const snap = {
    id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    name: String(name || 'Snapshot').slice(0, 60),
    createdAt: Date.now(),
    changes: diff,
    state: externalized,
  };

  const db = await openStorageDB();
  const tx = db.transaction('snapshots', 'readwrite');
  const store = tx.objectStore('snapshots');
  store.put(snap);

  // Trim to 30 snapshots per project
  const existing = await reqPromise(store.index('by_project').getAll(projectId));
  if (existing.length > 30) {
    existing.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const toDrop = existing.slice(0, existing.length - 30);
    for (const old of toDrop) {
      store.delete(old.id);
    }
  }
  await txDone(tx);
  return snap;
}

export async function getProjectSnapshots(projectId) {
  const db = await openStorageDB();
  const tx = db.transaction('snapshots', 'readonly');
  const list = await reqPromise(tx.objectStore('snapshots').index('by_project').getAll(projectId));
  return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function deleteSnapshot(snapshotId) {
  const db = await openStorageDB();
  const tx = db.transaction('snapshots', 'readwrite');
  tx.objectStore('snapshots').delete(snapshotId);
  await txDone(tx);
}

// =========================================================================
// Storage Estimate & Persistence API
// =========================================================================

export async function getStorageStatus() {
  let usage = 0;
  let quota = 0;
  let persisted = false;
  let persistSupported = false;

  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usage = est.usage || 0;
      quota = est.quota || 0;
    }
    if (navigator.storage?.persisted) {
      persistSupported = true;
      persisted = await navigator.storage.persisted();
    }
  } catch {
    // Ignore unsupported browser APIs
  }

  return { usage, quota, persisted, persistSupported };
}

export async function requestStorageProtection() {
  if (!navigator.storage?.persist) {
    return {
      supported: false,
      granted: false,
      message: 'This browser does not expose navigator.storage.persist(). Use "Back up everything" regularly to save a .siteforge file.',
    };
  }
  try {
    const granted = await navigator.storage.persist();
    return {
      supported: true,
      granted,
      message: granted
        ? 'Persistent storage granted! The browser will not automatically evict your SiteForge projects under storage pressure.'
        : 'Persistent storage was not granted automatically by this browser. Installing SiteForge as an app or bookmarking it often encourages the browser to grant persistence.',
    };
  } catch {
    return {
      supported: true,
      granted: false,
      message: 'Could not request persistent storage in this browser context.',
    };
  }
}

// =========================================================================
// Full Workspace Backup (.siteforge ZIP) & Validated Restore
// =========================================================================

export async function createFullBackupZip() {
  const projects = await getAllProjects();
  const images = await getAllImageRecords();
  const customThemes = await getSetting('customThemes', []);
  const activeProjectId = await getSetting('activeProjectId', projects[0]?.id || '');

  const manifest = {
    format: 'siteforge-backup',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    activeProjectId,
    projects,
    customThemes,
    imageManifest: images.map((img) => ({
      id: img.id,
      mime: img.mime || 'image/png',
      name: img.name || `${img.id}.bin`,
      width: img.width || 0,
      height: img.height || 0,
    })),
  };

  const entries = [{ name: 'backup.json', data: JSON.stringify(manifest, null, 2) }];

  for (const img of images) {
    if (!img?.blob) continue;
    const ab = await img.blob.arrayBuffer();
    entries.push({
      name: `images/${img.id}.bin`,
      data: new Uint8Array(ab),
    });
  }

  await setSetting('lastBackupAt', Date.now());
  return createZip(entries);
}

export async function restoreFullBackupZip(arrayBuffer, defaultStateFactory) {
  const parsedZip = await readZip(arrayBuffer);
  if (!parsedZip.ok) {
    return { ok: false, error: parsedZip.error || 'Could not read .siteforge backup file.' };
  }
  if (!parsedZip.allCrcOk) {
    return { ok: false, error: 'Backup file failed CRC-32 integrity verification.' };
  }

  const manifestEntry = parsedZip.entries.find((e) => e.name === 'backup.json');
  if (!manifestEntry) {
    return { ok: false, error: 'Not a valid SiteForge backup: missing backup.json.' };
  }

  const jsonRes = safeParseJsonText(manifestEntry.text());
  if (!jsonRes.ok) {
    return { ok: false, error: jsonRes.error };
  }

  const data = jsonRes.data;
  if (data.format !== 'siteforge-backup' || !Array.isArray(data.projects)) {
    return { ok: false, error: 'Invalid SiteForge backup manifest format.' };
  }

  // Validate every project BEFORE mutating IndexedDB
  const validatedProjects = [];
  for (const p of data.projects) {
    const res = validateAndNormalizeProjectState(p.state || {}, defaultStateFactory);
    if (!res.ok) {
      return { ok: false, error: `Project "${p.name || 'Untitled'}" failed validation: ${res.error}` };
    }
    validatedProjects.push({
      id: String(p.id || `proj_${Date.now().toString(36)}_${validatedProjects.length}`).slice(0, 60),
      name: String(p.name || res.state.siteName || 'Restored Site').slice(0, 60),
      currentStep: Number(p.currentStep) || 0,
      highestStep: Number(p.highestStep) || 0,
      updatedAt: Number(p.updatedAt) || Date.now(),
      state: res.state,
    });
  }

  // Restore images first
  const metaMap = new Map((data.imageManifest || []).map((m) => [m.id, m]));
  let imagesRestored = 0;
  for (const entry of parsedZip.entries) {
    if (!entry.name.startsWith('images/') || entry.isDirectory) continue;
    const id = entry.name.replace(/^images\//, '').replace(/\.bin$/, '');
    const meta = metaMap.get(id) || { mime: 'image/png', name: `${id}.png` };
    const blob = new Blob([entry.data], { type: meta.mime || 'image/png' });
    await saveImageBlob(blob, { id, name: meta.name, mime: meta.mime, width: meta.width, height: meta.height });
    imagesRestored++;
  }

  // Restore projects
  for (const proj of validatedProjects) {
    await saveProjectRecord(proj);
  }

  if (Array.isArray(data.customThemes)) {
    await setSetting('customThemes', data.customThemes.slice(0, 30));
  }
  if (data.activeProjectId) {
    await setSetting('activeProjectId', data.activeProjectId);
  }

  await hydrateImageCache();
  return { ok: true, projectCount: validatedProjects.length, imageCount: imagesRestored };
}

export async function isBackupOverdue(lastChangeAt) {
  const lastBackup = await getSetting('lastBackupAt', 0);
  if (!lastBackup) return false; // Don't nag brand-new users on day 1 until they've made changes after 7 days
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - lastBackup > SEVEN_DAYS && lastChangeAt > lastBackup;
}

// =========================================================================
// Save to Local Folder (File System Access API with ZIP Fallback)
// =========================================================================

export function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function verifyHandlePermission(handle) {
  if (!handle?.queryPermission) return false;
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

/**
 * Writes an array of { name: 'path/file.ext', data: string | Uint8Array } into a user-picked folder.
 * Remembers the directory handle in IndexedDB and re-requests permission when needed.
 */
export async function saveFilesToFolder(entries, { reuseSaved = true } = {}) {
  if (!supportsDirectoryPicker()) {
    return { ok: false, fallbackZip: true, reason: 'Directory picker not supported in this browser.' };
  }

  try {
    let dirHandle = reuseSaved ? await getSetting('savedDirHandle', null) : null;
    if (dirHandle) {
      const granted = await verifyHandlePermission(dirHandle);
      if (!granted) dirHandle = null;
    }
    if (!dirHandle) {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      try {
        await setSetting('savedDirHandle', dirHandle);
      } catch {
        // Some browsers disallow serializing handles in private mode
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parts = String(entry.name || '')
        .replace(/^\/+/, '')
        .split('/')
        .filter((p) => p && p !== '.' && p !== '..');
      if (!parts.length) continue;

      let currentDir = dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
      }
      const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(entry.data instanceof Uint8Array ? entry.data : String(entry.data ?? ''));
      await writable.close();
    }

    return { ok: true, folderName: dirHandle.name || 'selected folder', count: entries.length };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, cancelled: true, reason: 'Folder selection cancelled.' };
    }
    return { ok: false, fallbackZip: true, reason: err?.message || 'Could not write to folder.' };
  }
}
