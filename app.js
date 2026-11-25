/**
 * SiteForge Main Application Engine (app.js)
 * Single-state deterministic builder, generic 12-step wizard driven by `steps`,
 * 50-step Undo/Redo, multi-project workspace, 288-template gallery, 10 starter
 * presets, IndexedDB local publisher, ZIP/HTML/JSON/PDF exports, i18n, and PWA.
 */

import { DICTIONARY, APP_LANGUAGES, t } from './i18n.js';
import { SERVICE_ICONS, renderIcon, renderSocialIcon } from './icons.js';
import { TEMPLATES, buildSite, getSitePageManifest, layouts } from './layouts.js';
import {
  ABOUT_IMAGE_POSITIONS,
  ANALYTICS_PROVIDERS,
  ANIMATION_STYLES,
  APP_ACCENTS,
  BACKGROUND_STYLES,
  BASE_FONT_SIZES,
  BUTTON_STYLES,
  CARD_STYLES,
  CONTACT_FIELD_OPTIONS,
  CONTACT_LAYOUTS,
  CONTENT_WIDTHS,
  CORNER_RADII,
  DARK_MODE_DEFAULTS,
  DIVIDER_STYLES,
  FAVICON_MODES,
  FEATURED_TEMPLATES,
  FONT_PAIRINGS,
  FONT_STACKS,
  FOOTER_STYLES,
  GALLERY_FAMILIES,
  HEADER_STYLES,
  HEADING_WEIGHTS,
  HEADLINE_SIZES,
  HERO_ALIGNMENTS,
  HERO_BG_MODES,
  HERO_HEIGHTS,
  IMAGE_SHAPES,
  LAUNCH_CHECKLIST_ITEMS,
  LAYOUT_LIST,
  LEGAL_PAGE_TYPES,
  LINE_HEIGHTS,
  LOGO_MODES,
  LOGO_POSITIONS,
  LOGO_SIZES,
  MENU_ALIGNMENTS,
  MENU_QUICK_CHIPS,
  MENU_STYLES,
  MOBILE_MENU_STYLES,
  PAGE_TYPES,
  PREVIEW_DEVICES,
  ROBOTS_OPTIONS,
  SECTION_ANCHORS,
  SECTION_CATALOG,
  SHADOW_STRENGTHS,
  SITE_LANGUAGES,
  SITE_STRUCTURE_MODES,
  SITE_TYPES,
  SOCIAL_ICON_STYLES,
  SOCIAL_PLATFORMS,
  SPACING_DENSITIES,
  STARTER_PRESETS,
  THEME_LIST,
  TWITTER_CARD_TYPES,
  createDefaultState,
  createQuickDemoState,
  themes,
} from './options.js';
import {
  auditSiteQuality,
  escapeHTML,
  isDangerousUrl,
  isValidAnalyticsConfig,
  isValidEmail,
  isValidHexColor,
  isValidHttpsUrl,
  isValidPhone,
  isValidUpiId,
  isValidUrlInput,
  isValidWhatsAppNumber,
  safeParseJsonText,
  slugifyName,
  validateAndNormalizeProjectState,
  validatePageSlug,
  validateSafeName,
} from './validators.js';
import { autoFixStateContrast, evaluateSiteHealth } from './health.js';
import { DECORATIVE_SVGS, ingestAndOptimizeUpload, renderDecorativeSvg } from './image-studio.js';
import {
  deleteProjectRecord,
  externalizeStateImagesToBlobs,
  getAllProjects,
  getCachedImageUri,
  getProjectSnapshots,
  getSetting,
  hydrateImageCache,
  idbDeletePublishedSite,
  idbGetAllPublishedSites,
  idbSavePublishedSite,
  isBackupOverdue,
  migrateLegacyStorageIfNeeded,
  readUiPrefs,
  resolveStateImageUris,
  saveImageBlob,
  saveProjectRecord,
  setSetting,
  supportsDirectoryPicker,
  writeUiPrefs,
} from './storage.js';
import {
  advanceTour,
  applySmartCopyChoice,
  bindImageStudioEvents,
  buildSingleExportHtml,
  bumpSmartCopyShuffle,
  clearAppCachesOnly,
  copySelfTestReport,
  createNamedSnapshot,
  downloadFullSiteZip,
  downloadQrPosterFile,
  downloadQrSvgFile,
  exportCustomThemeJson,
  exportSiteToFolder,
  finishTour,
  handleCommandKeydown,
  handlePersistRequest,
  openAndRunSelfTestModal,
  openBrandStudioModal,
  openCommandPalette,
  openDemoModal,
  openExportedFileInSiteForge,
  openGoLiveModal,
  openGuidedTour,
  openHelpCenterModal,
  openHistoryModal,
  openImageStudioModal,
  openSmartCopyModal,
  openWhatsNewModal,
  removeSnapshotById,
  renderBrandStudioBody,
  renderCommandPaletteList,
  renderDemoBody,
  renderGoLiveBody,
  renderHelpCenterBody,
  renderSmartCopyBody,
  renderStorageDataSectionHtml,
  resetDemoTimer,
  runFullBackupDownload,
  runFullBackupRestore,
  runLogoColorExtraction,
  saveCurrentCustomTheme,
  setBrandSeed,
  setGoLiveTab,
  setQrMode,
  setSmartCopyField,
  setWifiDraft,
  toggleDemoTimer,
  writeStepForMe,
} from './features-ui.js';

/* ==========================================================================
   1. Constants, IndexedDB Workspace State & 50-Step Undo/Redo
   ========================================================================== */

const OFFLINE_TOAST_KEY = 'siteforge_offline_toasted_v1';
const MAX_HISTORY = 50;

let workspace = {
  activeId: 'proj-default',
  projects: [
    {
      id: 'proj-default',
      name: 'My First Site',
      updatedAt: Date.now(),
      currentStep: 0,
      highestStep: 0,
      state: createDefaultState(),
    },
  ],
};

let prefs = {
  theme: 'light',
  accent: 'terracotta',
  density: 'comfortable',
  lang: 'en',
};

// Single active `state` object (all preview/download/export/publish read this)
let state = workspace.projects[0].state;
let currentStep = 0;
let highestStep = 0;
let editingFromReview = false;
let currentErrors = {};
let inlineUploadErrors = {};
let publishError = '';
let publishSlugDraft = '';
let openIconPickerIndex = -1;
let siteTypeSearch = '';

// Preview controls state
let previewDeviceId = 'full';
let previewRotated = false;
let previewZoom = 100;
let previewForcedMode = null; // null | 'light' | 'dark'
let previewPageSlug = 'index';
let previewDebounceTimer = null;
let autosaveTimer = null;
let waitingSwRegistration = null;
let activePreviewBlobUrl = null;
const libraryBlobUrls = [];
let latestSiteHtml = '';

// 50-step Undo / Redo history per active project
let historyStack = [];
let historyIndex = -1;
let typingTimer = null;

// Drag-and-drop tracking
let dragKind = null;
let dragFromIdx = -1;

// Safe Temporary Quick Demo Mode state (strictly in-memory, never persists over user projects)
let isDemoMode = false;
let demoSavedSnapshot = null;
let galleryShowAll288 = false;

const clone = (v) => JSON.parse(JSON.stringify(v));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getActiveProject() {
  return workspace.projects.find((p) => p.id === workspace.activeId) || workspace.projects[0];
}

function initHistory(initialState) {
  historyStack = [clone(initialState)];
  historyIndex = 0;
  updateHistoryButtons();
}

function pushHistory(nextState) {
  clearTimeout(typingTimer);
  const snap = clone(nextState);
  const curr = historyStack[historyIndex];
  if (curr && JSON.stringify(curr) === JSON.stringify(snap)) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(snap);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateHistoryButtons();
}

function scheduleTypingHistory() {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => pushHistory(state), 350);
}

function undo() {
  clearTimeout(typingTimer);
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  state = clone(historyStack[historyIndex]);
  syncActiveProjectAndSave();
  renderAll();
  showToast('Undid last change');
}

function redo() {
  clearTimeout(typingTimer);
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex += 1;
  state = clone(historyStack[historyIndex]);
  syncActiveProjectAndSave();
  renderAll();
  showToast('Redid change');
}

function updateHistoryButtons() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = historyIndex <= 0;
  if (r) r.disabled = historyIndex >= historyStack.length - 1;
}

function showQuotaExceededBanner(errMsg) {
  const banner = document.getElementById('banner-quota-error');
  const msg = document.getElementById('quota-error-msg');
  if (msg && errMsg) msg.textContent = errMsg;
  if (banner) banner.hidden = false;
  const el = document.getElementById('autosave-hint');
  if (el) el.textContent = 'Storage full';
}

function syncActiveProjectAndSave() {
  if (isDemoMode) {
    const el = document.getElementById('autosave-hint');
    if (el) el.textContent = 'Demo (unsaved)';
    return;
  }
  const proj = getActiveProject();
  if (proj) {
    proj.state = state;
    proj.currentStep = currentStep;
    proj.highestStep = highestStep;
    proj.updatedAt = Date.now();
  }
  const el = document.getElementById('autosave-hint');
  if (el) el.textContent = 'Saving…';

  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    if (isDemoMode) return;
    try {
      const target = getActiveProject();
      if (!target) return;
      // Externalize any inline data URIs into IndexedDB Blob store
      const extState = await externalizeStateImagesToBlobs(target.state);
      target.state = extState;
      if (target.id === workspace.activeId) state = extState;
      await saveProjectRecord(target);
      await setSetting('activeProjectId', workspace.activeId);
      const hint = document.getElementById('autosave-hint');
      if (hint) {
        hint.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const qBanner = document.getElementById('banner-quota-error');
      if (qBanner) qBanner.hidden = true;
    } catch (err) {
      if (err && (err.name === 'QuotaExceededError' || /quota/i.test(String(err.message)))) {
        showQuotaExceededBanner('Browser storage quota reached. Click "Back up now" to save a .siteforge archive before clearing large images.');
      } else {
        const hint = document.getElementById('autosave-hint');
        if (hint) hint.textContent = 'Save error';
      }
    }
  }, 500);
}

function updateDemoModeChrome() {
  const banner = document.getElementById('banner-demo-mode');
  const triggerBtn = document.getElementById('btn-quick-demo');
  if (banner) banner.hidden = !isDemoMode;
  if (triggerBtn) {
    triggerBtn.classList.toggle('is-active', isDemoMode);
    triggerBtn.setAttribute('aria-pressed', isDemoMode ? 'true' : 'false');
    const lbl = triggerBtn.querySelector('span');
    if (lbl) lbl.textContent = isDemoMode ? 'Exit Demo' : 'Quick Demo';
  }
}

function enterQuickDemo() {
  if (isDemoMode) {
    updateDemoModeChrome();
    showToast('Quick Demo is active — Northstar Studio');
    return;
  }
  clearTimeout(autosaveTimer);
  clearTimeout(typingTimer);

  // Snapshot the user's real project, wizard position, undo stack & preview settings in memory
  demoSavedSnapshot = {
    activeId: workspace.activeId,
    state: clone(state),
    currentStep,
    highestStep,
    editingFromReview,
    historyStack: clone(historyStack),
    historyIndex,
    previewDeviceId,
    previewRotated,
    previewZoom,
    previewForcedMode,
    previewPageSlug,
    publishSlugDraft,
  };

  isDemoMode = true;
  state = createQuickDemoState();
  currentStep = 0;
  highestStep = steps.length - 1;
  editingFromReview = false;
  currentErrors = {};
  inlineUploadErrors = {};
  publishError = '';
  publishSlugDraft = slugifyName(state.siteName);
  previewPageSlug = 'index';
  previewForcedMode = null;

  initHistory(state);
  updateDemoModeChrome();
  const hint = document.getElementById('autosave-hint');
  if (hint) hint.textContent = 'Demo (unsaved)';
  renderAll();
  updatePreview(true);
  showToast('Quick Demo active: Northstar Studio (your saved project is untouched)', 'success');
}

function exitQuickDemo({ silent = false } = {}) {
  if (!isDemoMode) return;
  clearTimeout(typingTimer);
  isDemoMode = false;

  if (demoSavedSnapshot) {
    workspace.activeId = demoSavedSnapshot.activeId;
    state = clone(demoSavedSnapshot.state);
    currentStep = demoSavedSnapshot.currentStep;
    highestStep = demoSavedSnapshot.highestStep;
    editingFromReview = demoSavedSnapshot.editingFromReview;
    historyStack = clone(demoSavedSnapshot.historyStack);
    historyIndex = demoSavedSnapshot.historyIndex;
    previewDeviceId = demoSavedSnapshot.previewDeviceId;
    previewRotated = demoSavedSnapshot.previewRotated;
    previewZoom = demoSavedSnapshot.previewZoom;
    previewForcedMode = demoSavedSnapshot.previewForcedMode;
    previewPageSlug = demoSavedSnapshot.previewPageSlug;
    publishSlugDraft = demoSavedSnapshot.publishSlugDraft;
    demoSavedSnapshot = null;
  }

  currentErrors = {};
  inlineUploadErrors = {};
  publishError = '';
  updateDemoModeChrome();
  const hint = document.getElementById('autosave-hint');
  if (hint) hint.textContent = 'Saved';
  applyPreviewViewport();
  renderAll();
  updatePreview(true);
  if (!silent) showToast('Exited Demo Mode — your saved project has been restored');
}

async function loadWorkspaceFromIdb() {
  try {
    await migrateLegacyStorageIfNeeded(createDefaultState);
    await hydrateImageCache();
    const list = await getAllProjects();
    const activeId = await getSetting('activeProjectId', null);
    if (list && list.length > 0) {
      const validProjects = [];
      for (const p of list) {
        const res = validateAndNormalizeProjectState(p.state, createDefaultState);
        if (res.ok) {
          validProjects.push({
            id: String(p.id || `proj-${Date.now()}`),
            name: String(p.name || 'Untitled Project').slice(0, 60),
            updatedAt: Number(p.updatedAt) || Date.now(),
            currentStep: Number.isInteger(p.currentStep) && p.currentStep >= 0 && p.currentStep < 12 ? p.currentStep : 0,
            highestStep: Number.isInteger(p.highestStep) && p.highestStep >= 0 && p.highestStep < 12 ? p.highestStep : 0,
            state: res.state,
          });
        }
      }
      if (validProjects.length) {
        workspace.projects = validProjects;
        const found = validProjects.find((p) => p.id === activeId) || validProjects[0];
        workspace.activeId = found.id;
        state = found.state;
        currentStep = found.currentStep;
        highestStep = Math.max(found.highestStep, currentStep);
        return;
      }
    }
    // Seed initial project in IDB
    await saveProjectRecord(workspace.projects[0]);
    await setSetting('activeProjectId', workspace.activeId);
  } catch {
    // Keep fresh default workspace
  }
}

function loadPrefs() {
  const defaultTheme =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  prefs = readUiPrefs({ ...prefs, theme: defaultTheme });
  applyPrefs();
}

function savePrefs() {
  writeUiPrefs(prefs);
}

function applyPrefs() {
  const root = document.documentElement;
  root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-density', prefs.density);
  const accentObj = APP_ACCENTS.find((a) => a.id === prefs.accent) || APP_ACCENTS[0];
  root.style.setProperty('--sf-accent', prefs.theme === 'dark' ? accentObj.darkHex : accentObj.hex);
  root.style.setProperty('--sf-accent-hover', accentObj.hover);

  // Translate static UI labels
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key, prefs.lang);
  });
  const quickThemeLbl = document.getElementById('quick-theme-label');
  if (quickThemeLbl) quickThemeLbl.textContent = prefs.theme === 'dark' ? 'Light' : 'Dark';
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute('content', prefs.theme === 'dark' ? '#191815' : '#F5F2EB');
  updateConnectivityBadge();
  const projLabel = document.getElementById('active-project-label');
  if (projLabel) projLabel.textContent = getActiveProject().name.slice(0, 18);
}

/* ==========================================================================
   2. Generic 12-Step Configuration Array (`steps`)
   Each step is { id, title, type, fields[], validate, surprise, reset }.
   Adding a 13th step requires only adding one object here.
   ========================================================================== */

const steps = [
  {
    id: 'identity',
    title: 'Site Identity',
    type: 'identity',
    label: 'Name, tagline, and site language',
    hint: 'Sets your brand identity plus the HTML lang and dir (LTR/RTL) attributes.',
    fields: ['siteName', 'tagline', 'siteLanguage'],
    validate(s) {
      const err = {};
      const name = (s.siteName || '').trim();
      if (!name) err.siteName = 'Site name is required.';
      else if (name.length > 60) err.siteName = 'Site name must be 60 characters or fewer.';
      if ((s.tagline || '').length > 120) err.tagline = 'Tagline must be 120 characters or fewer.';
      return err;
    },
    surprise(s) {
      const samples = [
        ['Northwind Studio', 'Design and engineering with quiet precision'],
        ['Solaris Kitchen', 'Seasonal ingredients, honest craft'],
        ['Kestrel Labs', 'Offline-first tools for modern builders'],
        ['Verve Atelier', 'Visual identity and editorial spaces'],
      ];
      const [name, tag] = pickRandom(samples);
      s.siteName = name;
      s.tagline = tag;
      s.siteLanguage = 'en';
    },
    reset(s) {
      const d = createDefaultState();
      s.siteName = d.siteName;
      s.tagline = d.tagline;
      s.siteLanguage = d.siteLanguage;
    },
  },
  {
    id: 'siteType',
    title: 'Site Type',
    type: 'site-type',
    label: 'Pick one of 30 website types',
    hint: 'Pre-fills sensible menu links, sections, and starter headings—everything stays editable.',
    fields: ['siteType'],
    validate(s) {
      if (!SITE_TYPES.some((t) => t.id === s.siteType)) return { siteType: 'Choose a site type.' };
      return {};
    },
    surprise(s) {
      applySiteTypeDefaults(s, pickRandom(SITE_TYPES).id, true);
    },
    reset(s) {
      applySiteTypeDefaults(s, 'portfolio', false);
    },
  },
  {
    id: 'layout',
    title: 'Layout',
    type: 'layout',
    label: 'Choose from 12 layouts and structure controls',
    hint: 'Pick a page architecture, then fine-tune header behavior, content width, and dividers.',
    fields: ['layout', 'headerStyle', 'contentWidth', 'dividerStyle'],
    validate(s) {
      if (!layouts[s.layout]) return { layout: 'Choose a layout.' };
      return {};
    },
    surprise(s) {
      s.layout = pickRandom(LAYOUT_LIST).id;
      s.headerStyle = pickRandom(HEADER_STYLES).id;
      s.contentWidth = pickRandom(CONTENT_WIDTHS).id;
      s.dividerStyle = pickRandom(DIVIDER_STYLES).id;
    },
    reset(s) {
      const d = createDefaultState();
      s.layout = d.layout;
      s.headerStyle = d.headerStyle;
      s.contentWidth = d.contentWidth;
      s.dividerStyle = d.dividerStyle;
    },
  },
  {
    id: 'style',
    title: 'Colours, Font & Style',
    type: 'style',
    label: '24 themes, 12 system fonts, and visual polish',
    hint: '12 layouts × 24 themes = 288 deterministic templates. Override colours anytime.',
    fields: ['theme', 'headingFont', 'bodyFont', 'customPrimary', 'customAccent', 'customBg', 'customText'],
    validate(s) {
      const err = {};
      if (!themes[s.theme]) err.theme = 'Choose a colour theme.';
      if (s.useCustomColors) {
        for (const k of ['customPrimary', 'customAccent', 'customBg', 'customText']) {
          if (!isValidHexColor(s[k])) err[k] = 'Use a valid 6-digit hex colour (e.g. #2563eb).';
        }
      }
      return err;
    },
    surprise(s) {
      const tObj = pickRandom(THEME_LIST);
      s.theme = tObj.id;
      s.useCustomColors = false;
      s.headingFont = pickRandom(FONT_STACKS).id;
      s.bodyFont = pickRandom(FONT_STACKS.slice(0, 6)).id;
      s.cornerRadius = pickRandom(CORNER_RADII).id;
      s.buttonStyle = pickRandom(BUTTON_STYLES).id;
      s.cardStyle = pickRandom(CARD_STYLES).id;
      s.backgroundStyle = pickRandom(BACKGROUND_STYLES).id;
      s.animationStyle = pickRandom(ANIMATION_STYLES).id;
    },
    reset(s) {
      const d = createDefaultState();
      const keys = [
        'theme', 'useCustomColors', 'customPrimary', 'customAccent', 'customBg', 'customText',
        'headingFont', 'bodyFont', 'headingWeight', 'baseFontSize', 'lineHeight', 'cornerRadius',
        'buttonStyle', 'cardStyle', 'shadowStrength', 'spacingDensity', 'backgroundStyle',
        'animationStyle', 'darkModeDefault', 'showDarkModeToggle',
      ];
      for (const k of keys) s[k] = d[k];
    },
  },
  {
    id: 'menu',
    title: 'Menu',
    type: 'menu',
    label: 'Build your navigation bar (1 to 8 items)',
    hint: 'Drag rows to reorder, use quick-add chips, and link to page sections or external URLs.',
    fields: ['menuItems', 'navCtaLink'],
    validate(s) {
      const err = {};
      const items = Array.isArray(s.menuItems) ? s.menuItems : [];
      if (items.length < 1) err.menuItems = 'At least 1 menu item is required.';
      if (items.length > 8) err.menuItems = 'Maximum of 8 menu items allowed.';
      items.forEach((m, i) => {
        if (!String(m?.label || '').trim()) err[`menu_${i}_label`] = 'Label cannot be empty.';
        else if (m.label.length > 28) err[`menu_${i}_label`] = 'Max 28 characters.';
        if (m?.type === 'external') {
          if (!String(m.target || '').trim()) err[`menu_${i}_target`] = 'Enter an external URL.';
          else if (!isValidUrlInput(m.target, { allowAnchor: false })) {
            err[`menu_${i}_target`] = 'Enter a safe http(s), mailto, or tel URL (javascript:/data: blocked).';
          }
        }
      });
      if (s.navCtaEnabled && s.navCtaLink && !isValidUrlInput(s.navCtaLink, { allowAnchor: true })) {
        err.navCtaLink = 'Unsafe or invalid CTA link.';
      }
      return err;
    },
    surprise(s) {
      s.menuItems = [
        { label: 'Home', type: 'section', target: '#top' },
        { label: 'About', type: 'section', target: '#about' },
        { label: 'Services', type: 'section', target: '#services' },
        { label: 'FAQ', type: 'section', target: '#faq' },
        { label: 'Contact', type: 'section', target: '#contact' },
      ];
      s.menuAlignment = pickRandom(MENU_ALIGNMENTS).id;
      s.menuStyle = pickRandom(MENU_STYLES).id;
      s.mobileMenuStyle = pickRandom(MOBILE_MENU_STYLES).id;
      s.navCtaEnabled = true;
    },
    reset(s) {
      const d = createDefaultState();
      s.menuItems = d.menuItems;
      s.menuAlignment = d.menuAlignment;
      s.menuStyle = d.menuStyle;
      s.mobileMenuStyle = d.mobileMenuStyle;
      s.navCtaEnabled = d.navCtaEnabled;
      s.navCtaText = d.navCtaText;
      s.navCtaLink = d.navCtaLink;
    },
  },
  {
    id: 'hero',
    title: 'Hero Section',
    type: 'hero',
    label: 'Craft your opening hero banner',
    hint: 'Headline, buttons, background style, and optional shaped hero image.',
    fields: ['heroHeadline', 'heroSubheadline', 'heroPrimaryBtnLink', 'heroSecondaryBtnLink'],
    validate(s) {
      const err = {};
      const h = (s.heroHeadline || '').trim();
      if (!h) err.heroHeadline = 'Hero headline is required.';
      else if (h.length > 120) err.heroHeadline = 'Max 120 characters.';
      if (s.heroPrimaryBtnLink && !isValidUrlInput(s.heroPrimaryBtnLink, { allowAnchor: true })) {
        err.heroPrimaryBtnLink = 'Unsafe or invalid button URL.';
      }
      if (s.heroSecondaryBtnLink && !isValidUrlInput(s.heroSecondaryBtnLink, { allowAnchor: true })) {
        err.heroSecondaryBtnLink = 'Unsafe or invalid button URL.';
      }
      return err;
    },
    surprise(s) {
      const picks = [
        ['New Release', 'Thoughtful craft engineered for everyday clarity.', 'Simple, fast, and built to serve your audience everywhere.'],
        ['Independent Studio', 'Design that feels calm, intentional, and memorable.', 'Partnering with teams to bring lasting ideas to the web.'],
        ['Welcome', 'Where great work meets real human connection.', 'Explore our story, offerings, and how we can collaborate.'],
      ];
      const [badge, head, sub] = pickRandom(picks);
      s.heroBadge = badge;
      s.heroHeadline = head;
      s.heroSubheadline = sub;
      s.heroAlignment = pickRandom(HERO_ALIGNMENTS).id;
      s.heroBgMode = pickRandom(['theme', 'gradient', 'pattern']);
      s.headlineSize = pickRandom(HEADLINE_SIZES).id;
    },
    reset(s) {
      const d = createDefaultState();
      for (const k of ['heroBadge', 'heroHeadline', 'heroSubheadline', 'heroPrimaryBtnText', 'heroPrimaryBtnLink', 'heroSecondaryBtnText', 'heroSecondaryBtnLink', 'heroAlignment', 'heroHeight', 'headlineSize', 'heroBgMode', 'heroBgImage', 'heroBgOverlay', 'heroSideImage', 'heroSideImageAlt', 'heroImageShape']) {
        s[k] = d[k];
      }
    },
  },
  {
    id: 'about',
    title: 'About',
    type: 'about',
    label: 'Share your story, highlights, and key stats',
    hint: 'Supports simple formatting: **bold**, *italic*, and blank lines for paragraphs.',
    fields: ['aboutHeading', 'about'],
    validate(s) {
      const err = {};
      const txt = (s.about || '').trim();
      if (!txt) err.about = 'About text is required.';
      else if (txt.length > 2000) err.about = 'Keep About text under 2000 characters.';
      return err;
    },
    surprise(s) {
      s.aboutHeading = 'Our Story';
      s.about = '**Quality over noise.** We started with a simple goal: deliver dependable, thoughtfully crafted work that people enjoy using every day.\n\nFrom initial discovery to final handoff, *clarity and transparency* guide every step.';
      s.aboutHighlights = [
        { icon: 'check', text: 'Transparent communication at every milestone' },
        { icon: 'bolt', text: 'Fast turnaround without cutting corners' },
        { icon: 'shield', text: 'Long-term reliability and support' },
      ];
      s.aboutStats = [
        { number: '150+', label: 'Clients Served' },
        { number: '99%', label: 'Satisfaction' },
        { number: '8 yrs', label: 'Experience' },
      ];
    },
    reset(s) {
      const d = createDefaultState();
      for (const k of ['aboutHeading', 'about', 'aboutAlignment', 'aboutImage', 'aboutImageAlt', 'aboutImageShape', 'aboutImagePosition', 'aboutHighlights', 'aboutStats']) {
        s[k] = d[k];
      }
    },
  },
  {
    id: 'sections',
    title: 'Services & Sections',
    type: 'sections',
    label: 'Items (1–12), 60 icons, and 12 toggleable sections',
    hint: 'Configure your core offerings, then enable and drag-reorder any extra page sections.',
    fields: ['services'],
    validate(s) {
      const err = {};
      const items = Array.isArray(s.services) ? s.services : [];
      if (items.length < 1) {
        err.services = 'Add at least 1 service or project item.';
        return err;
      }
      items.forEach((item, idx) => {
        if (!String(item?.title || '').trim()) err[`srv_${idx}_title`] = 'Title is required.';
        if (!String(item?.description || '').trim()) err[`srv_${idx}_desc`] = 'Description is required.';
        if (item?.link && !isValidUrlInput(item.link, { allowAnchor: true })) {
          err[`srv_${idx}_link`] = 'Unsafe or invalid link URL.';
        }
      });
      return err;
    },
    surprise(s) {
      s.servicesColumns = pickRandom([2, 3]);
      s.services = [
        { title: 'Strategy & Discovery', description: 'Research, roadmap clarity, and measurable goals.', icon: 'compass', price: '$600', link: '#contact', buttonLabel: 'Learn more', image: '' },
        { title: 'Custom Design & Build', description: 'Tailored responsive work built with precision.', icon: 'palette', price: '$1,800', link: '#contact', buttonLabel: 'Get quote', image: '' },
        { title: 'Ongoing Care', description: 'Continuous updates, improvements, and direct support.', icon: 'shield', price: '$250/mo', link: '#contact', buttonLabel: 'Subscribe', image: '' },
      ];
      s.sections.testimonials.enabled = true;
      s.sections.faq.enabled = true;
      s.sections.timeline.enabled = true;
    },
    reset(s) {
      const d = createDefaultState();
      s.services = d.services;
      s.servicesColumns = d.servicesColumns;
      s.servicesCardStyle = d.servicesCardStyle;
      s.sectionOrder = d.sectionOrder;
      s.sections = d.sections;
    },
  },
  {
    id: 'contact',
    title: 'Contact',
    type: 'contact',
    label: 'Contact details, form fields, and layout',
    hint: 'Email is required. The visual form opens your visitor’s email client via mailto: (zero backend).',
    fields: ['contactEmail', 'contactPhone', 'whatsappNumber'],
    validate(s) {
      const err = {};
      const email = (s.contactEmail || '').trim();
      if (!email) err.contactEmail = 'Email address is required.';
      else if (!isValidEmail(email)) err.contactEmail = 'Enter a valid email address (for example hello@domain.com).';

      if ((s.contactPhone || '').trim() && !isValidPhone(s.contactPhone)) {
        err.contactPhone = 'Enter a valid phone number (7–15 digits).';
      }
      if ((s.whatsappNumber || '').trim() && !isValidWhatsAppNumber(s.whatsappNumber)) {
        err.whatsappNumber = 'Enter a valid WhatsApp number with country code (7–15 digits).';
      }
      if (s.upiEnabled && !isValidUpiId(s.upiId || '')) {
        err.upiId = 'Enter a valid UPI ID (e.g. name@bank).';
      }
      if (s.contactFormMode === 'endpoint' && !isValidHttpsUrl(s.contactFormEndpoint || '')) {
        err.contactFormEndpoint = 'Form endpoint must be a valid https:// URL.';
      }
      return err;
    },
    surprise(s) {
      const slug = slugifyName(s.siteName || 'studio');
      s.contactEmail = `hello@${slug}.example`;
      s.contactPhone = '+1 (555) 234-5678';
      s.contactAddress = '240 Market Street, Suite 400';
      s.workingHours = 'Mon – Fri, 9:00 AM – 6:00 PM';
      s.contactLayout = pickRandom(CONTACT_LAYOUTS).id;
      s.showStaticMap = true;
    },
    reset(s) {
      const d = createDefaultState();
      for (const k of ['contactEmail', 'contactPhone', 'contactAddress', 'workingHours', 'whatsappNumber', 'contactFormEnabled', 'contactFormFields', 'contactDropdownOptions', 'contactCheckboxLabel', 'contactButtonLabel', 'contactSuccessText', 'contactLayout', 'showStaticMap', 'enableClickToCall', 'enableClickToEmail']) {
        s[k] = d[k];
      }
    },
  },
  {
    id: 'footer',
    title: 'Footer & Social',
    type: 'footer',
    label: 'Footer layout, link groups, and 16 social platforms',
    hint: 'All social links are validated and rendered with clean inline SVG icons.',
    fields: ['footerText', 'socialLinks'],
    validate(s) {
      const err = {};
      for (const plat of SOCIAL_PLATFORMS) {
        const val = (s.socialLinks?.[plat.id] || '').trim();
        if (val && !isValidUrlInput(val, { allowAnchor: false })) {
          err[`social_${plat.id}`] = `Invalid or unsafe URL for ${plat.name}.`;
        }
      }
      (s.footerLinkGroups || []).forEach((g, gi) => {
        (g.links || []).forEach((l, li) => {
          if (l.url && isDangerousUrl(l.url)) {
            err[`fgrp_${gi}_${li}`] = 'Unsafe link scheme blocked.';
          }
        });
      });
      return err;
    },
    surprise(s) {
      const slug = slugifyName(s.siteName || 'siteforge');
      s.footerStyle = pickRandom(FOOTER_STYLES).id;
      s.socialIconStyle = pickRandom(SOCIAL_ICON_STYLES).id;
      s.footerText = 'Built with care for fast, calm browsing on any device.';
      s.socialLinks = { github: `github.com/${slug}`, instagram: `instagram.com/${slug}`, linkedin: `linkedin.com/company/${slug}` };
    },
    reset(s) {
      const d = createDefaultState();
      for (const k of ['footerText', 'copyrightText', 'autoCopyrightYear', 'footerStyle', 'footerLinkGroups', 'socialLinks', 'socialIconStyle', 'showBackToTop', 'showSiteForgeCredit']) {
        s[k] = d[k];
      }
    },
  },
  {
    id: 'seo',
    title: 'SEO, Logo & Favicon',
    type: 'seo',
    label: 'Search metadata, Open Graph, logo, and favicon',
    hint: 'Images are limited to 500 KB (PNG, JPG, SVG, WebP) and embedded offline as base64.',
    fields: ['metaTitle', 'metaDescription', 'canonicalUrl'],
    validate(s) {
      const err = {};
      if ((s.metaTitle || '').length > 70) err.metaTitle = 'Meta title should be 70 characters or fewer.';
      if ((s.siteUrl || '').trim() && !isValidHttpsUrl(s.siteUrl)) {
        err.siteUrl = 'Site URL should be a valid https:// address (e.g. https://yourdomain.com).';
      }
      if ((s.canonicalUrl || '').trim() && !isValidUrlInput(s.canonicalUrl, { allowAnchor: false })) {
        err.canonicalUrl = 'Enter a valid http(s) canonical URL.';
      }
      if (s.analyticsProvider && s.analyticsProvider !== 'none' && !isValidAnalyticsConfig(s.analyticsProvider, s.analyticsId)) {
        err.analyticsId = 'Enter a valid Measurement ID / domain / token for the selected analytics provider.';
      }
      return err;
    },
    surprise(s) {
      const name = (s.siteName || 'My Website').trim();
      s.metaTitle = `${name} — Official Website`;
      s.metaDescription = `${name}: ${(s.heroSubheadline || s.tagline || 'Explore our services, story, and direct contact details on our fast, responsive website.').slice(0, 120)}`.slice(0, 155);
      s.metaKeywords = `${name.toLowerCase()}, ${s.siteType}, responsive, website`;
      s.logoMode = pickRandom(['text', 'emoji']);
      s.logoEmoji = pickRandom(['✦', '◆', '◈', '▲', '●']);
      s.faviconMode = 'auto-letter';
    },
    reset(s) {
      const d = createDefaultState();
      for (const k of ['metaTitle', 'metaDescription', 'metaKeywords', 'metaAuthor', 'canonicalUrl', 'robots', 'ogTitle', 'ogDescription', 'ogImageDataUrl', 'twitterCard', 'logoMode', 'logoDataUrl', 'logoFileName', 'logoTextFont', 'logoTextColor', 'logoEmoji', 'logoSize', 'logoPosition', 'faviconMode', 'faviconEmoji', 'faviconColor', 'faviconDataUrl']) {
        s[k] = d[k];
      }
    },
  },
  {
    id: 'review',
    title: 'Review, Export & Publish',
    type: 'review',
    label: 'Audit, download, print PDF, or publish locally',
    hint: 'Every export uses the exact HTML shown in your live preview.',
    fields: [],
    validate() {
      return {};
    },
    surprise() {},
    reset() {},
  },
];

function applySiteTypeDefaults(targetState, typeId, forceOverwrite = false) {
  const typeObj = SITE_TYPES.find((t) => t.id === typeId);
  if (!typeObj) return;
  targetState.siteType = typeId;
  const defs = typeObj.defaults;
  if (!defs) return;

  if (forceOverwrite || !targetState.heroHeadline) {
    targetState.heroHeadline = defs.headline;
  }
  if (defs.servicesHeading && targetState.sections?.services) {
    targetState.sections.services.heading = defs.servicesHeading;
  }
  if (Array.isArray(defs.menu)) {
    const anchorMap = {
      Home: '#top', About: '#about', Story: '#about', Services: '#services', Work: '#projects',
      Projects: '#projects', Experience: '#timeline', Pricing: '#pricing', Features: '#features',
      FAQ: '#faq', Contact: '#contact', Menu: '#services', Gallery: '#gallery', Team: '#team',
      Schedule: '#timeline', Releases: '#services', Events: '#timeline', Episodes: '#services',
      Curriculum: '#services', Programs: '#services', Classes: '#services', Listings: '#services',
      Trips: '#services', Practice: '#services', Shop: '#services', Blog: '#services', Stories: '#services', Reviews: '#testimonials',
    };
    targetState.menuItems = defs.menu.slice(0, 8).map((label) => ({
      label,
      type: 'section',
      target: anchorMap[label] || '#services',
    }));
  }
  if (Array.isArray(defs.sections)) {
    for (const sec of SECTION_CATALOG) {
      if (targetState.sections[sec.id]) {
        targetState.sections[sec.id].enabled = defs.sections.includes(sec.id);
      }
    }
  }
}

/* ==========================================================================
   3. IndexedDB Published Sites Wrapper (uses unified storage.js DB)
   ========================================================================== */

const dbPut = (record) => idbSavePublishedSite(record);
const dbGetAll = () => idbGetAllPublishedSites();
const dbDelete = (slug) => idbDeletePublishedSite(slug);

async function refreshLibraryCount() {
  try {
    const list = await dbGetAll();
    const el = document.getElementById('library-count');
    if (el) el.textContent = String(list.length);
  } catch {}
}

/* ==========================================================================
   4. Live Preview (Debounced 180ms, Multi-Page Switcher, Strict Sandbox, Health Badge)
   ========================================================================== */

function updateHeaderHealthBadge() {
  const badge = document.getElementById('btn-health-badge');
  const gEl = document.getElementById('health-badge-grade');
  const sEl = document.getElementById('health-badge-score');
  if (!badge || !gEl || !sEl) return;
  const resolved = resolveStateImageUris(state);
  const report = evaluateSiteHealth(resolved);
  gEl.textContent = report.grade;
  sEl.textContent = String(report.overall);
  badge.classList.remove('is-good', 'is-warn', 'is-bad');
  badge.classList.add(report.overall >= 80 ? 'is-good' : report.overall >= 60 ? 'is-warn' : 'is-bad');
  badge.title = `Site Health: ${report.overall}/100 (Grade ${report.grade}) — click to inspect`;
}

function applyPreviewViewport() {
  const shell = document.getElementById('preview-frame-shell');
  const zoomWrap = document.getElementById('preview-zoom-wrap');
  if (!shell || !zoomWrap) return;

  const dev = PREVIEW_DEVICES.find((d) => d.id === previewDeviceId) || PREVIEW_DEVICES[PREVIEW_DEVICES.length - 1];
  if (dev.width === 0) {
    shell.style.width = '100%';
    shell.style.height = '100%';
  } else {
    const w = previewRotated ? dev.height : dev.width;
    const h = previewRotated ? dev.width : dev.height;
    shell.style.width = `${w}px`;
    shell.style.height = `${h}px`;
  }

  const widthEl = document.getElementById('preview-browser-width');
  if (widthEl) {
    if (dev.width === 0) {
      widthEl.textContent = '1280 px';
    } else {
      const w = previewRotated ? dev.height : dev.width;
      widthEl.textContent = `${w} px`;
    }
  }

  const activePreset =
    previewDeviceId === 'tablet'
      ? 'tablet'
      : previewDeviceId.startsWith('mobile')
      ? 'mobile'
      : 'desktop';
  document.querySelectorAll('[data-preview-preset]').forEach((btn) => {
    const match = btn.getAttribute('data-preview-preset') === activePreset;
    btn.classList.toggle('is-active', match);
    btn.setAttribute('aria-pressed', match ? 'true' : 'false');
  });

  const scale = previewZoom / 100;
  zoomWrap.style.transform = scale === 1 ? 'none' : `scale(${scale})`;
}

function updatePreviewImmediate() {
  const resolved = resolveStateImageUris(state);
  const manifest = getSitePageManifest(resolved);
  const pageSelect = document.getElementById('preview-page-select');
  if (pageSelect) {
    if (manifest.length > 1) {
      pageSelect.hidden = false;
      if (!manifest.some((p) => p.slug === previewPageSlug)) previewPageSlug = 'index';
      pageSelect.innerHTML = manifest
        .map((p) => `<option value="${escapeHTML(p.slug)}" ${p.slug === previewPageSlug ? 'selected' : ''}>Page: ${escapeHTML(p.title)}</option>`)
        .join('');
    } else {
      pageSelect.hidden = true;
      previewPageSlug = 'index';
    }
  }

  const previewState = previewForcedMode
    ? { ...resolved, darkModeDefault: previewForcedMode }
    : resolved;

  latestSiteHtml = buildSite(resolved, { previewMode: false, embedState: true, currentSlug: previewPageSlug });
  const frameHtml = buildSite(previewState, { previewMode: true, currentSlug: previewPageSlug });

  const iframe = document.getElementById('preview-frame');
  if (iframe) iframe.srcdoc = frameHtml;

  const fileEl = document.getElementById('preview-browser-filename');
  if (fileEl) {
    const baseSlug = slugifyName(state.siteName || 'siteforge-site');
    fileEl.textContent = previewPageSlug && previewPageSlug !== 'index' ? `${previewPageSlug}.html` : `${baseSlug}.html`;
  }

  const label = document.getElementById('preview-template-label');
  if (label) {
    const lName = (LAYOUT_LIST.find((l) => l.id === state.layout) || LAYOUT_LIST[0]).name;
    const tName = (THEME_LIST.find((t) => t.id === state.theme) || THEME_LIST[0]).name;
    const modeTag = state.siteStructure === 'multi' ? ` · ${manifest.length} pages` : '';
    label.textContent = `${lName} · ${tName}${modeTag}`;
  }

  const openBtn = document.getElementById('btn-open-preview-tab');
  const demoViewBtn = document.getElementById('btn-demo-view-site');
  if (openBtn || demoViewBtn) {
    if (activePreviewBlobUrl) URL.revokeObjectURL(activePreviewBlobUrl);
    activePreviewBlobUrl = URL.createObjectURL(new Blob([latestSiteHtml], { type: 'text/html;charset=utf-8' }));
    if (openBtn) openBtn.setAttribute('href', activePreviewBlobUrl);
    if (demoViewBtn) demoViewBtn.setAttribute('href', activePreviewBlobUrl);
  }

  updateHeaderHealthBadge();
}

function updatePreview(immediate = false) {
  clearTimeout(previewDebounceTimer);
  if (immediate) {
    updatePreviewImmediate();
  } else {
    previewDebounceTimer = setTimeout(updatePreviewImmediate, 180);
  }
}

/* ==========================================================================
   5. Exports (HTML + CSP, Full SEO/Multi-page ZIP, Folder, Clipboard, PDF, JSON, Publish)
   ========================================================================== */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadHtml(htmlOverride = null, slug = slugifyName(state.siteName)) {
  const html = htmlOverride || (await buildSingleExportHtml(state));
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${slug}.html`);
  showToast(`Downloaded ${slug}.html`, 'success');
}

async function downloadZip() {
  await downloadFullSiteZip(state, showToast);
}

async function copyHtmlToClipboard() {
  const html = await buildSingleExportHtml(state);
  try {
    await navigator.clipboard.writeText(html);
    showToast('HTML copied to clipboard', 'success');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('HTML copied to clipboard', 'success');
  }
}

function printGeneratedSitePdf() {
  if (currentStep === steps.length - 1) {
    window.print();
    return;
  }
  const blobUrl = URL.createObjectURL(new Blob([latestSiteHtml], { type: 'text/html;charset=utf-8' }));
  showToast('Tip: Go to Step 12 to print the review sheet, or click Open in Preview toolbar to print the site.');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

function exportProjectJson() {
  const slug = slugifyName(state.siteName || getActiveProject().name);
  const resolved = resolveStateImageUris(state);
  const payload = {
    app: 'SiteForge',
    schemaVersion: 3,
    projectName: getActiveProject().name,
    exportedAt: new Date().toISOString(),
    state: resolved,
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slug}-siteforge.json`);
  showToast('Exported project JSON', 'success');
}

async function importProjectJson(file) {
  if (!file) return;
  const res = await openExportedFileInSiteForge(file);
  if (!res.ok) {
    showToast(res.error || 'Invalid file.', 'error');
    return;
  }
  state = await externalizeStateImagesToBlobs(res.state);
  currentErrors = {};
  publishSlugDraft = slugifyName(state.siteName);
  pushHistory(state);
  syncActiveProjectAndSave();
  renderAll();
  showToast('Project opened in SiteForge', 'success');
}

async function publishLocally(rawSlug) {
  const check = validateSafeName(rawSlug);
  if (!check.valid) {
    publishError = check.error;
    const errEl = document.getElementById('err-publish-slug');
    const inp = document.getElementById('input-publish-slug');
    if (errEl) errEl.textContent = publishError;
    if (inp) {
      inp.classList.add('is-invalid');
      inp.focus();
    }
    return;
  }

  publishError = '';
  const html = await buildSingleExportHtml(state);
  const now = Date.now();
  await dbPut({
    slug: check.slug,
    siteName: (state.siteName || '').trim() || check.slug,
    layout: state.layout,
    theme: state.theme,
    html,
    publishedAt: now,
    updatedAt: now,
    sizeBytes: new TextEncoder().encode(html).length,
  });
  await refreshLibraryCount();
  const errEl = document.getElementById('err-publish-slug');
  const inp = document.getElementById('input-publish-slug');
  if (errEl) errEl.textContent = '';
  if (inp) inp.classList.remove('is-invalid');
  showToast(`Published "${check.slug}" locally`, 'success');
}

/* ==========================================================================
   6. Step Renderers (Driven Generically by `steps`)
   ========================================================================== */

function choicePillsHtml(fieldKey, options, currentValue) {
  return `<div class="choice-pills">${options
    .map((o) => {
      const id = o.id ?? o.value;
      const label = o.name ?? o.label ?? id;
      const sel = String(currentValue) === String(id);
      return `<button type="button" class="choice-pill${sel ? ' is-selected' : ''}" data-set-field="${fieldKey}" data-set-value="${escapeHTML(id)}">${escapeHTML(label)}</button>`;
    })
    .join('')}</div>`;
}

function uploadSlotHtml({ slotKey, label, dataUrl, altKey = '', altValue = '', helper = 'PNG, JPG, WebP up to 10 MB (auto-compressed ≤ 500 KB) or SVG' }) {
  const err = inlineUploadErrors[slotKey] || '';
  const resolvedSrc = getCachedImageUri(dataUrl) || dataUrl || '';
  const meta = state.imageMeta?.[slotKey];
  const isSvg = resolvedSrc.startsWith('data:image/svg');
  return `
    <div class="field-group">
      <span class="field-label">${escapeHTML(label)}</span>
      <div class="upload-box">
        <div class="upload-row">
          <span class="field-helper">${escapeHTML(helper)}</span>
          <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            <label class="btn btn-secondary btn-sm" for="upload-${slotKey}">Upload</label>
            <input id="upload-${slotKey}" type="file" data-upload-slot="${slotKey}" accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp" class="sr-only" />
            ${resolvedSrc && !isSvg ? `<button type="button" class="btn btn-secondary btn-sm" data-open-img-studio="${slotKey}" data-alt-key="${escapeHTML(altKey)}">Edit / Crop</button>` : ''}
            ${resolvedSrc ? `<button type="button" class="btn btn-ghost btn-sm" data-clear-slot="${slotKey}">Remove</button>` : ''}
          </div>
        </div>
        ${
          resolvedSrc
            ? `<div style="display:flex;align-items:center;gap:0.6rem;">
                <img class="img-thumb-sm" src="${resolvedSrc}" alt="${escapeHTML(altValue || label)}" />
                ${
                  altKey
                    ? `<input type="text" class="field-input" data-bind="${altKey}" value="${escapeHTML(altValue)}" placeholder="Image alt text (for accessibility & SEO)" maxlength="120" />`
                    : `<span class="field-helper">Stored in IndexedDB${meta?.width ? ` · ${meta.width}×${meta.height}` : ''}</span>`
                }
              </div>`
            : ''
        }
      </div>
      <div class="field-error" aria-live="polite">${escapeHTML(err)}</div>
    </div>`;
}

function decorativeSvgPickerHtml(fieldKey, currentId) {
  return `
    <div class="field-group">
      <div class="field-label-row">
        <span class="field-label">Decorative inline SVG artwork (40 offline theme-adaptive options)</span>
        ${currentId ? `<button type="button" class="mini-pill-btn" data-set-field="${fieldKey}" data-set-value="">Clear SVG</button>` : ''}
      </div>
      <div class="deco-svg-grid">
        ${DECORATIVE_SVGS.map(
          (item) => `<button type="button" class="deco-svg-btn${currentId === item.id ? ' is-selected' : ''}" data-set-field="${fieldKey}" data-set-value="${item.id}" title="${escapeHTML(item.name)}">
            ${renderDecorativeSvg(item.id, 'sf-deco-thumb')}
            <span>${escapeHTML(item.name)}</span>
          </button>`
        ).join('')}
      </div>
    </div>`;
}

function renderStepBody(step) {
  switch (step.type) {
    case 'identity': {
      const nameErr = currentErrors.siteName || '';
      const tagErr = currentErrors.tagline || '';
      const secondLangObj = SITE_LANGUAGES.find((l) => l.code === state.secondLanguage) || SITE_LANGUAGES[1];
      const tr = (state.translations && state.translations[state.secondLanguage]) || {};
      return `
        <div class="field-group">
          <div class="field-label-row">
            <label class="field-label" for="f-siteName">Site name<span class="required-mark">*</span></label>
            <span class="char-count" data-count="siteName">${(state.siteName || '').length}/60</span>
          </div>
          <input id="f-siteName" type="text" class="field-input${nameErr ? ' is-invalid' : ''}" data-bind="siteName" maxlength="60" value="${escapeHTML(state.siteName)}" placeholder="e.g. Northwind Studio" />
          <div class="field-error" id="err-siteName" aria-live="polite">${escapeHTML(nameErr)}</div>
        </div>

        <div class="field-group">
          <div class="field-label-row">
            <label class="field-label" for="f-tagline">Tagline / slogan</label>
            <span class="char-count" data-count="tagline">${(state.tagline || '').length}/120</span>
          </div>
          <input id="f-tagline" type="text" class="field-input${tagErr ? ' is-invalid' : ''}" data-bind="tagline" maxlength="120" value="${escapeHTML(state.tagline)}" placeholder="e.g. Thoughtful digital products built to last" />
          <div class="field-error" id="err-tagline" aria-live="polite">${escapeHTML(tagErr)}</div>
        </div>

        <div class="field-group">
          <span class="field-label">Primary site language (sets HTML lang &amp; LTR/RTL direction)</span>
          <div class="choice-pills">
            ${SITE_LANGUAGES.map(
              (l) => `<button type="button" class="choice-pill${state.siteLanguage === l.code ? ' is-selected' : ''}" data-set-field="siteLanguage" data-set-value="${l.code}">${escapeHTML(l.name)} · ${escapeHTML(l.nativeName)}</button>`
            ).join('')}
          </div>
        </div>

        <details class="sf-acc"${state.bilingualEnabled ? ' open' : ''}>
          <summary>Bilingual Website (Optional 2nd Language Switcher)</summary>
          <div class="sf-acc-body">
            <div class="toggle-line">
              <label for="f-bilingualEnabled">Enable 2nd language switcher on generated site</label>
              <input id="f-bilingualEnabled" type="checkbox" data-bind-check="bilingualEnabled" ${state.bilingualEnabled ? 'checked' : ''} />
            </div>
            ${
              state.bilingualEnabled
                ? `<div class="field-group">
                    <label class="field-label" for="f-secondLanguage">Second language</label>
                    <select id="f-secondLanguage" class="field-select" data-bind="secondLanguage">
                      ${SITE_LANGUAGES.filter((l) => l.code !== state.siteLanguage)
                        .map((l) => `<option value="${l.code}" ${state.secondLanguage === l.code ? 'selected' : ''}>${escapeHTML(l.name)} (${escapeHTML(l.nativeName)})</option>`)
                        .join('')}
                    </select>
                  </div>
                  <div class="toggle-line">
                    <label for="f-exportLangFolders">Also export separate /${escapeHTML(state.secondLanguage || 'hi')}/ folder pages with hreflang</label>
                    <input id="f-exportLangFolders" type="checkbox" data-bind-check="exportLangFolders" ${state.exportLangFolders ? 'checked' : ''} />
                  </div>
                  <div class="field-row-2">
                    <div class="field-group">
                      <label class="field-label">Translated Site Name (${escapeHTML(secondLangObj.name)})</label>
                      <input type="text" class="field-input" data-tr-field="siteName" value="${escapeHTML(tr.siteName || '')}" placeholder="Translated brand name" maxlength="60" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">Translated Tagline</label>
                      <input type="text" class="field-input" data-tr-field="tagline" value="${escapeHTML(tr.tagline || '')}" placeholder="Translated tagline" maxlength="120" />
                    </div>
                  </div>
                  <div class="field-row-2">
                    <div class="field-group">
                      <label class="field-label">Translated Hero Headline</label>
                      <input type="text" class="field-input" data-tr-field="heroHeadline" value="${escapeHTML(tr.heroHeadline || '')}" placeholder="Translated hero headline" maxlength="120" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">Translated Hero Subheadline</label>
                      <input type="text" class="field-input" data-tr-field="heroSubheadline" value="${escapeHTML(tr.heroSubheadline || '')}" placeholder="Translated subheadline" maxlength="220" />
                    </div>
                  </div>
                  <div class="field-group">
                    <label class="field-label">Translated About Story</label>
                    <textarea class="field-textarea" style="min-height:68px;" data-tr-field="about" maxlength="2000" placeholder="Translated About text...">${escapeHTML(tr.about || '')}</textarea>
                  </div>`
                : '<p class="field-helper" style="margin:0;">Turn on to add a live language switcher button to your header and translate key text side-by-side.</p>'
            }
          </div>
        </details>`;
    }

    case 'site-type': {
      const q = siteTypeSearch.trim().toLowerCase();
      const filtered = q
        ? SITE_TYPES.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
        : SITE_TYPES;
      return `
        <div class="field-group">
          <label class="sr-only" for="sitetype-search">Filter 30 site types</label>
          <input id="sitetype-search" type="search" class="field-input" value="${escapeHTML(siteTypeSearch)}" placeholder="Filter 30 site types (e.g. Cafe, SaaS, Wedding, Clinic)..." />
        </div>
        <div class="mcq-grid">
          ${filtered
            .map(
              (t) => `<button type="button" class="mcq-card${state.siteType === t.id ? ' is-selected' : ''}" data-pick-sitetype="${t.id}">
              <div class="mcq-card-head">
                <span class="mcq-icon">${renderIcon(t.icon, 17)}</span>
                <span class="mcq-card-title">${escapeHTML(t.name)}</span>
              </div>
              <span class="mcq-card-desc">${escapeHTML(t.description)}</span>
            </button>`
            )
            .join('')}
        </div>`;
    }

    case 'layout': {
      const activeTheme = themes[state.theme] || THEME_LIST[0];
      const coreIds = ['classic', 'sidebar', 'minimal', 'split-hero', 'magazine', 'card-grid'];
      const coreLayouts = coreIds.map((id) => LAYOUT_LIST.find((l) => l.id === id)).filter(Boolean);
      const extraLayouts = LAYOUT_LIST.filter((l) => !coreIds.includes(l.id));
      const siteBrand = (state.siteName || '').trim() || 'Studio Atelier';
      return `
        <details class="sf-acc" open>
          <summary>Featured Editorial Templates (6)</summary>
          <div class="sf-acc-body">
            <div class="inline-bar" style="justify-content:space-between;">
              <span class="field-helper">Curated layout + colour pairings ready with one click</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-open-gallery-inline">Open Full Gallery (288)</button>
            </div>
            <div class="tpl-gallery-grid is-compact">
              ${FEATURED_TEMPLATES.map((ft) => {
                const th = themes[ft.themeId] || THEME_LIST[0];
                const isActive = state.layout === ft.layoutId && state.theme === ft.themeId && !state.useCustomColors;
                return renderTemplateCardHtml({
                  layoutId: ft.layoutId,
                  themeId: ft.themeId,
                  title: `${ft.layoutLabel} / ${ft.styleLabel}`,
                  subtitle: ft.note,
                  headingFont: ft.headingFont,
                  bodyFont: ft.bodyFont,
                  featured: true,
                  active: isActive,
                  themeObj: th,
                  siteBrand,
                });
              }).join('')}
            </div>
          </div>
        </details>

        <details class="sf-acc" open>
          <summary>Core Page Layouts (6)</summary>
          <div class="sf-acc-body">
            <div class="tpl-gallery-grid is-compact">
              ${coreLayouts
                .map(
                  (l) => `<button type="button" class="tpl-card${state.layout === l.id ? ' is-selected' : ''}" data-set-field="layout" data-set-value="${l.id}">
                    <div class="tpl-mini-stage">
                      ${renderTemplateThumbnailHtml(l.id, activeTheme, siteBrand)}
                      <span class="tpl-hover-cue">${state.layout === l.id ? 'Selected' : 'Use layout'}</span>
                    </div>
                    <div class="tpl-card-foot">
                      <div class="tpl-card-meta">
                        <strong class="tpl-card-title">${escapeHTML(l.name)}</strong>
                        <span class="tpl-card-sub">${escapeHTML(l.description)}</span>
                      </div>
                      ${state.layout === l.id ? '<span class="tpl-selected-mark" aria-label="Selected">&#10003;</span>' : ''}
                    </div>
                  </button>`
                )
                .join('')}
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>More Specialized Layouts (${extraLayouts.length})</summary>
          <div class="sf-acc-body">
            <div class="mcq-grid">
              ${extraLayouts
                .map(
                  (l) => `<button type="button" class="mcq-card${state.layout === l.id ? ' is-selected' : ''}" data-set-field="layout" data-set-value="${l.id}">
                    <span class="layout-thumb">${l.thumbnailSvg}</span>
                    <span class="mcq-card-title">${escapeHTML(l.name)}</span>
                    <span class="mcq-card-desc">${escapeHTML(l.description)}</span>
                  </button>`
                )
                .join('')}
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Header, Width &amp; Section Dividers</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Header style</span>${choicePillsHtml('headerStyle', HEADER_STYLES, state.headerStyle)}</div>
            <div class="field-group"><span class="field-label">Content width</span>${choicePillsHtml('contentWidth', CONTENT_WIDTHS, state.contentWidth)}</div>
            <div class="field-group"><span class="field-label">Section divider style</span>${choicePillsHtml('dividerStyle', DIVIDER_STYLES, state.dividerStyle)}</div>
          </div>
        </details>`;
    }

    case 'style': {
      return `
        <details class="sf-acc" open>
          <summary>Colour Theme (24 presets) &amp; Custom Overrides</summary>
          <div class="sf-acc-body">
            <div class="inline-bar" style="justify-content:space-between;">
              <span class="field-helper">12 layouts × 24 themes = 288 templates</span>
              <div class="inline-bar">
                <button type="button" class="btn btn-primary btn-sm" id="btn-open-brand-studio">Open Brand Studio</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-open-gallery-inline">288 Gallery</button>
              </div>
            </div>
            <div class="theme-grid">
              ${THEME_LIST.map(
                (th) => `<button type="button" class="theme-swatch-card${state.theme === th.id ? ' is-selected' : ''}" data-pick-theme="${th.id}">
                  <span class="swatch-dots" aria-hidden="true">
                    <span class="swatch-dot" style="background:${th.vars['--bg']};"></span>
                    <span class="swatch-dot" style="background:${th.vars['--primary']};"></span>
                    <span class="swatch-dot" style="background:${th.vars['--accent']};"></span>
                  </span>
                  <span class="swatch-meta">
                    <span class="swatch-name">${escapeHTML(th.name)}</span>
                    <span class="swatch-sub">${escapeHTML(th.description)}</span>
                  </span>
                </button>`
              ).join('')}
            </div>

            <div class="toggle-line">
              <label for="f-useCustomColors">Override theme with custom colours</label>
              <input id="f-useCustomColors" type="checkbox" data-bind-check="useCustomColors" ${state.useCustomColors ? 'checked' : ''} />
            </div>
            ${
              state.useCustomColors
                ? `<div class="color-grid">
                    <label class="color-picker-item"><input type="color" data-bind="customPrimary" value="${escapeHTML(state.customPrimary)}" /><span>Primary (${escapeHTML(state.customPrimary)})</span></label>
                    <label class="color-picker-item"><input type="color" data-bind="customAccent" value="${escapeHTML(state.customAccent)}" /><span>Accent (${escapeHTML(state.customAccent)})</span></label>
                    <label class="color-picker-item"><input type="color" data-bind="customBg" value="${escapeHTML(state.customBg)}" /><span>Background (${escapeHTML(state.customBg)})</span></label>
                    <label class="color-picker-item"><input type="color" data-bind="customText" value="${escapeHTML(state.customText)}" /><span>Text (${escapeHTML(state.customText)})</span></label>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-reset-custom-colors">Reset to theme colours</button>`
                : ''
            }
          </div>
        </details>

        <details class="sf-acc">
          <summary>Typography (12 System Font Stacks)</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <span class="field-label">Heading font</span>
              <div class="mcq-grid">
                ${FONT_STACKS.map(
                  (f) => `<button type="button" class="mcq-card${state.headingFont === f.id ? ' is-selected' : ''}" data-set-field="headingFont" data-set-value="${f.id}">
                    <span class="mcq-card-title" style="font-family:${escapeHTML(f.css)};">Aa · ${escapeHTML(f.name)}</span>
                    <span class="mcq-card-desc">${escapeHTML(f.sample)}</span>
                  </button>`
                ).join('')}
              </div>
            </div>
            <div class="field-group">
              <span class="field-label">Body font</span>
              <div class="choice-pills">
                ${FONT_STACKS.map(
                  (f) => `<button type="button" class="choice-pill${state.bodyFont === f.id ? ' is-selected' : ''}" style="font-family:${escapeHTML(f.css)};" data-set-field="bodyFont" data-set-value="${f.id}">${escapeHTML(f.name)}</button>`
                ).join('')}
              </div>
            </div>
            <div class="field-group"><span class="field-label">Heading weight</span>${choicePillsHtml('headingWeight', HEADING_WEIGHTS, state.headingWeight)}</div>
            <div class="field-group"><span class="field-label">Base font size</span>${choicePillsHtml('baseFontSize', BASE_FONT_SIZES, state.baseFontSize)}</div>
            <div class="field-group"><span class="field-label">Line height</span>${choicePillsHtml('lineHeight', LINE_HEIGHTS, state.lineHeight)}</div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Surfaces, Backgrounds, Motion &amp; Dark Mode</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Corner radius</span>${choicePillsHtml('cornerRadius', CORNER_RADII, state.cornerRadius)}</div>
            <div class="field-group"><span class="field-label">Button style</span>${choicePillsHtml('buttonStyle', BUTTON_STYLES, state.buttonStyle)}</div>
            <div class="field-group"><span class="field-label">Card style</span>${choicePillsHtml('cardStyle', CARD_STYLES, state.cardStyle)}</div>
            <div class="field-group"><span class="field-label">Shadow strength</span>${choicePillsHtml('shadowStrength', SHADOW_STRENGTHS, state.shadowStrength)}</div>
            <div class="field-group"><span class="field-label">Spacing density</span>${choicePillsHtml('spacingDensity', SPACING_DENSITIES, state.spacingDensity)}</div>
            <div class="field-group"><span class="field-label">Pure-CSS background style</span>${choicePillsHtml('backgroundStyle', BACKGROUND_STYLES, state.backgroundStyle)}</div>
            <div class="field-group"><span class="field-label">Scroll animation</span>${choicePillsHtml('animationStyle', ANIMATION_STYLES, state.animationStyle)}</div>
            <div class="field-group"><span class="field-label">Dark mode default</span>${choicePillsHtml('darkModeDefault', DARK_MODE_DEFAULTS, state.darkModeDefault)}</div>
            <div class="toggle-line">
              <label for="f-showDarkModeToggle">Show visitor Dark/Light mode toggle button</label>
              <input id="f-showDarkModeToggle" type="checkbox" data-bind-check="showDarkModeToggle" ${state.showDarkModeToggle ? 'checked' : ''} />
            </div>
            <div class="toggle-line">
              <label for="f-a11yWidgetEnabled">Include Visitor Accessibility Widget (A-/A+, High Contrast, Reduce Motion)</label>
              <input id="f-a11yWidgetEnabled" type="checkbox" data-bind-check="a11yWidgetEnabled" ${state.a11yWidgetEnabled ? 'checked' : ''} />
            </div>
          </div>
        </details>`;
    }

    case 'menu': {
      const items = state.menuItems || [];
      const atMax = items.length >= 8;
      const atMin = items.length <= 1;
      const isMulti = state.siteStructure === 'multi-page';
      const footerPages = state.footerPages || [];
      const blogPosts = state.blogPosts || [];
      return `
        <div class="field-group">
          <span class="field-label">Site Structure<span class="tip-badge" title="One-page puts everything on index.html. Multi-page creates separate linked .html files (about.html, services.html, blog posts) with shared CSS/JS in ZIP exports.">?</span></span>
          ${choicePillsHtml('siteStructure', SITE_STRUCTURE_MODES, state.siteStructure)}
        </div>

        <details class="sf-acc" open>
          <summary>${isMulti ? 'Navigation Pages' : 'Menu Links'} (${items.length}/8 · Drag or click arrows to reorder)</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <span class="field-helper">Quick-add chips:</span>
              <div class="choice-pills">
                ${MENU_QUICK_CHIPS.map(
                  (c) => `<button type="button" class="choice-pill" data-quick-menu-label="${escapeHTML(c.label)}" data-quick-menu-target="${escapeHTML(c.target)}" ${atMax ? 'disabled' : ''}>+ ${escapeHTML(c.label)}</button>`
                ).join('')}
              </div>
            </div>

            <div class="list-editor">
              ${items
                .map((m, idx) => {
                  const lErr = currentErrors[`menu_${idx}_label`] || '';
                  const tErr = currentErrors[`menu_${idx}_target`] || '';
                  const isExt = m.type === 'external';
                  return `
                  <div class="list-row" draggable="true" data-drag-kind="menu" data-drag-idx="${idx}">
                    <span class="drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
                    <div class="list-row-fields">
                      <div class="field-row-2">
                        <input type="text" class="field-input${lErr ? ' is-invalid' : ''}" data-menu-idx="${idx}" data-menu-field="label" maxlength="28" value="${escapeHTML(m.label || '')}" placeholder="Menu label" aria-label="Menu item ${idx + 1} label" />
                        <select class="field-select" data-menu-idx="${idx}" data-menu-field="type" aria-label="Menu item ${idx + 1} link type">
                          <option value="section" ${!isExt ? 'selected' : ''}>${isMulti ? 'Site Page' : 'On-page section'}</option>
                          <option value="external" ${isExt ? 'selected' : ''}>External URL</option>
                        </select>
                      </div>
                      ${
                        isExt
                          ? `<input type="url" class="field-input${tErr ? ' is-invalid' : ''}" data-menu-idx="${idx}" data-menu-field="target" maxlength="200" value="${escapeHTML(m.target || '')}" placeholder="example.com" aria-label="External link URL" />`
                          : isMulti
                          ? `<div class="field-row-2">
                              <select class="field-select" data-menu-idx="${idx}" data-menu-field="pageType" aria-label="Page template">
                                ${PAGE_TYPES.map((pt) => `<option value="${pt.id}" ${(m.pageType || 'custom') === pt.id ? 'selected' : ''}>${escapeHTML(pt.name)}</option>`).join('')}
                              </select>
                              <input type="text" class="field-input" data-menu-idx="${idx}" data-menu-field="slug" maxlength="40" value="${escapeHTML(m.slug || (idx === 0 ? 'index' : slugifyName(m.label || 'page')))}" placeholder="page-slug" aria-label="Page filename slug" />
                            </div>
                            <div class="field-row-2">
                              <input type="text" class="field-input" data-menu-idx="${idx}" data-menu-field="metaTitle" maxlength="70" value="${escapeHTML(m.metaTitle || '')}" placeholder="Optional page SEO title" />
                              <input type="text" class="field-input" data-menu-idx="${idx}" data-menu-field="metaDescription" maxlength="160" value="${escapeHTML(m.metaDescription || '')}" placeholder="Optional page meta description" />
                            </div>
                            ${
                              (m.pageType || '') === 'custom'
                                ? `<textarea class="field-textarea" style="min-height:58px;" data-menu-idx="${idx}" data-menu-field="customBody" maxlength="2500" placeholder="Custom page body content (supports **bold** and *italic*)...">${escapeHTML(m.customBody || '')}</textarea>`
                                : ''
                            }`
                          : `<select class="field-select" data-menu-idx="${idx}" data-menu-field="target" aria-label="Section anchor">
                              ${SECTION_ANCHORS.map((a) => `<option value="${a.id}" ${m.target === a.id ? 'selected' : ''}>${escapeHTML(a.label)} (${a.id})</option>`).join('')}
                            </select>`
                      }
                      <div class="field-error" aria-live="polite">${escapeHTML(lErr || tErr)}</div>
                    </div>
                    <div class="list-row-actions">
                      <button type="button" class="mini-icon-btn" data-menu-move="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
                      <button type="button" class="mini-icon-btn" data-menu-move="${idx}" data-dir="1" ${idx === items.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
                      <button type="button" class="mini-icon-btn is-remove" data-menu-remove="${idx}" ${atMin ? 'disabled' : ''} aria-label="Remove">&times;</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>

            <div class="list-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-menu-add" ${atMax ? 'disabled' : ''}>+ Add ${isMulti ? 'page' : 'menu item'}</button>
              <span class="char-count">${items.length} / 8 items</span>
            </div>
          </div>
        </details>

        ${
          isMulti
            ? `<details class="sf-acc">
                <summary>Footer-Only Extra Pages (${footerPages.length}/6) &amp; Blog Posts (${blogPosts.length}/20)</summary>
                <div class="sf-acc-body">
                  <div class="field-group">
                    <span class="field-label">Footer-only extra pages (${footerPages.length}/6)</span>
                    ${footerPages
                      .map(
                        (fp, fi) => `<div class="list-row"><div class="list-row-fields">
                        <div class="field-row-2">
                          <input type="text" class="field-input" data-arr-key="footerPages" data-arr-idx="${fi}" data-arr-sub="title" value="${escapeHTML(fp.title || '')}" placeholder="Page title" maxlength="50" />
                          <input type="text" class="field-input" data-arr-key="footerPages" data-arr-idx="${fi}" data-arr-sub="slug" value="${escapeHTML(fp.slug || '')}" placeholder="slug (e.g. careers)" maxlength="40" />
                        </div>
                        <textarea class="field-textarea" style="min-height:56px;" data-arr-key="footerPages" data-arr-idx="${fi}" data-arr-sub="body" maxlength="2500" placeholder="Page content...">${escapeHTML(fp.body || '')}</textarea>
                      </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="footerPages" data-idx="${fi}">&times;</button></div>`
                      )
                      .join('')}
                    <button type="button" class="btn btn-secondary btn-sm" data-arr-add="footerPages" ${footerPages.length >= 6 ? 'disabled' : ''}>+ Add footer page</button>
                  </div>

                  <div class="field-group">
                    <span class="field-label">Blog / News Posts (${blogPosts.length}/20 · each gets its own .html page)</span>
                    ${blogPosts
                      .map(
                        (bp, bi) => `<div class="list-row"><div class="list-row-fields">
                        <div class="field-row-2">
                          <input type="text" class="field-input" data-arr-key="blogPosts" data-arr-idx="${bi}" data-arr-sub="title" value="${escapeHTML(bp.title || '')}" placeholder="Post title" maxlength="100" />
                          <input type="text" class="field-input" data-arr-key="blogPosts" data-arr-idx="${bi}" data-arr-sub="date" value="${escapeHTML(bp.date || '')}" placeholder="YYYY-MM-DD" maxlength="20" />
                        </div>
                        <input type="text" class="field-input" data-arr-key="blogPosts" data-arr-idx="${bi}" data-arr-sub="excerpt" value="${escapeHTML(bp.excerpt || '')}" placeholder="Short excerpt" maxlength="180" />
                        <textarea class="field-textarea" style="min-height:60px;" data-arr-key="blogPosts" data-arr-idx="${bi}" data-arr-sub="body" maxlength="4000" placeholder="Full article text...">${escapeHTML(bp.body || '')}</textarea>
                      </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="blogPosts" data-idx="${bi}">&times;</button></div>`
                      )
                      .join('')}
                    <button type="button" class="btn btn-secondary btn-sm" data-arr-add="blogPosts" ${blogPosts.length >= 20 ? 'disabled' : ''}>+ Add blog post</button>
                  </div>
                </div>
              </details>`
            : ''
        }

        <details class="sf-acc">
          <summary>Menu Style, Mobile Drawer &amp; Navbar CTA</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Alignment</span>${choicePillsHtml('menuAlignment', MENU_ALIGNMENTS, state.menuAlignment)}</div>
            <div class="field-group"><span class="field-label">Link style</span>${choicePillsHtml('menuStyle', MENU_STYLES, state.menuStyle)}</div>
            <div class="field-group"><span class="field-label">Mobile menu style</span>${choicePillsHtml('mobileMenuStyle', MOBILE_MENU_STYLES, state.mobileMenuStyle)}</div>
            <div class="toggle-line">
              <label for="f-navCtaEnabled">Show Navbar Call-to-Action button</label>
              <input id="f-navCtaEnabled" type="checkbox" data-bind-check="navCtaEnabled" ${state.navCtaEnabled ? 'checked' : ''} />
            </div>
            ${
              state.navCtaEnabled
                ? `<div class="field-row-2">
                    <input type="text" class="field-input" data-bind="navCtaText" value="${escapeHTML(state.navCtaText)}" placeholder="CTA Button Text" maxlength="28" />
                    <input type="text" class="field-input${currentErrors.navCtaLink ? ' is-invalid' : ''}" data-bind="navCtaLink" value="${escapeHTML(state.navCtaLink)}" placeholder="#contact or example.com" maxlength="200" />
                  </div>
                  <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.navCtaLink || '')}</div>`
                : ''
            }
          </div>
        </details>`;
    }

    case 'hero': {
      const hErr = currentErrors.heroHeadline || '';
      return `
        <details class="sf-acc" open>
          <summary>Basic Copy &amp; Buttons</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <label class="field-label" for="f-heroBadge">Optional badge above headline</label>
              <input id="f-heroBadge" type="text" class="field-input" data-bind="heroBadge" maxlength="40" value="${escapeHTML(state.heroBadge)}" placeholder="e.g. New · Open for 2026" />
            </div>
            <div class="field-group">
              <div class="field-label-row">
                <label class="field-label" for="f-heroHeadline">Hero headline<span class="required-mark">*</span></label>
                <span class="char-count" data-count="heroHeadline">${(state.heroHeadline || '').length}/120</span>
              </div>
              <input id="f-heroHeadline" type="text" class="field-input${hErr ? ' is-invalid' : ''}" data-bind="heroHeadline" maxlength="120" value="${escapeHTML(state.heroHeadline)}" placeholder="Write a bold, clear opening headline" />
              <div class="field-error" id="err-heroHeadline" aria-live="polite">${escapeHTML(hErr)}</div>
            </div>
            <div class="field-group">
              <label class="field-label" for="f-heroSubheadline">Subheadline</label>
              <textarea id="f-heroSubheadline" class="field-textarea" style="min-height:68px;" data-bind="heroSubheadline" maxlength="220" placeholder="Supporting sentence explaining your offer...">${escapeHTML(state.heroSubheadline)}</textarea>
            </div>
            <div class="field-row-2">
              <div class="field-group">
                <label class="field-label" for="f-heroPrimaryBtnText">Primary button text</label>
                <input id="f-heroPrimaryBtnText" type="text" class="field-input" data-bind="heroPrimaryBtnText" maxlength="32" value="${escapeHTML(state.heroPrimaryBtnText)}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="f-heroPrimaryBtnLink">Primary button link</label>
                <input id="f-heroPrimaryBtnLink" type="text" class="field-input${currentErrors.heroPrimaryBtnLink ? ' is-invalid' : ''}" data-bind="heroPrimaryBtnLink" maxlength="200" value="${escapeHTML(state.heroPrimaryBtnLink)}" />
                <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.heroPrimaryBtnLink || '')}</div>
              </div>
            </div>
            <div class="field-row-2">
              <div class="field-group">
                <label class="field-label" for="f-heroSecondaryBtnText">Secondary button text</label>
                <input id="f-heroSecondaryBtnText" type="text" class="field-input" data-bind="heroSecondaryBtnText" maxlength="32" value="${escapeHTML(state.heroSecondaryBtnText)}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="f-heroSecondaryBtnLink">Secondary button link</label>
                <input id="f-heroSecondaryBtnLink" type="text" class="field-input${currentErrors.heroSecondaryBtnLink ? ' is-invalid' : ''}" data-bind="heroSecondaryBtnLink" maxlength="200" value="${escapeHTML(state.heroSecondaryBtnLink)}" />
                <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.heroSecondaryBtnLink || '')}</div>
              </div>
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Layout, Background &amp; Side Image</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Hero alignment</span>${choicePillsHtml('heroAlignment', HERO_ALIGNMENTS, state.heroAlignment)}</div>
            <div class="field-group"><span class="field-label">Hero height</span>${choicePillsHtml('heroHeight', HERO_HEIGHTS, state.heroHeight)}</div>
            <div class="field-group"><span class="field-label">Headline size</span>${choicePillsHtml('headlineSize', HEADLINE_SIZES, state.headlineSize)}</div>
            <div class="field-group"><span class="field-label">Hero background</span>${choicePillsHtml('heroBgMode', HERO_BG_MODES, state.heroBgMode)}</div>
            ${
              state.heroBgMode === 'image'
                ? `${uploadSlotHtml({ slotKey: 'heroBgImage', label: 'Hero background image', dataUrl: state.heroBgImage })}
                  <div class="field-group">
                    <div class="field-label-row"><label class="field-label" for="f-heroBgOverlay">Overlay darkness</label><span class="char-count">${state.heroBgOverlay}%</span></div>
                    <input id="f-heroBgOverlay" type="range" min="0" max="85" value="${state.heroBgOverlay}" data-bind-num="heroBgOverlay" />
                  </div>`
                : ''
            }
            ${uploadSlotHtml({ slotKey: 'heroSideImage', label: 'Optional side hero image', dataUrl: state.heroSideImage, altKey: 'heroSideImageAlt', altValue: state.heroSideImageAlt })}
            <div class="field-group"><span class="field-label">Hero image shape</span>${choicePillsHtml('heroImageShape', IMAGE_SHAPES, state.heroImageShape)}</div>
            ${decorativeSvgPickerHtml('decorativeHeroSvg', state.decorativeHeroSvg)}
          </div>
        </details>`;
    }

    case 'about': {
      const aErr = currentErrors.about || '';
      const highlights = state.aboutHighlights || [];
      const stats = state.aboutStats || [];
      return `
        <details class="sf-acc" open>
          <summary>About Story &amp; Formatting</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <label class="field-label" for="f-aboutHeading">Section heading</label>
              <input id="f-aboutHeading" type="text" class="field-input" data-bind="aboutHeading" maxlength="70" value="${escapeHTML(state.aboutHeading)}" />
            </div>
            <div class="field-group">
              <div class="field-label-row">
                <label class="field-label" for="f-about">About text<span class="required-mark">*</span></label>
                <div style="display:flex;gap:0.3rem;align-items:center;">
                  <button type="button" class="mini-pill-btn" data-format-about="bold" title="Wrap selected text in **bold**"><strong>B</strong></button>
                  <button type="button" class="mini-pill-btn" data-format-about="italic" title="Wrap selected text in *italic*"><em>I</em></button>
                  <span class="char-count" data-count="about">${(state.about || '').length}/2000</span>
                </div>
              </div>
              <textarea id="f-about" class="field-textarea${aErr ? ' is-invalid' : ''}" data-bind="about" maxlength="2000" placeholder="Tell visitors your story. Use **bold**, *italic*, and blank lines for paragraphs.">${escapeHTML(state.about)}</textarea>
              <div class="field-error" id="err-about" aria-live="polite">${escapeHTML(aErr)}</div>
            </div>
            <div class="field-group"><span class="field-label">Alignment</span>${choicePillsHtml('aboutAlignment', HERO_ALIGNMENTS, state.aboutAlignment)}</div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>About Image, Highlights (up to 6) &amp; Stats (up to 4)</summary>
          <div class="sf-acc-body">
            ${uploadSlotHtml({ slotKey: 'aboutImage', label: 'About section image', dataUrl: state.aboutImage, altKey: 'aboutImageAlt', altValue: state.aboutImageAlt })}
            <div class="field-group"><span class="field-label">Image position</span>${choicePillsHtml('aboutImagePosition', ABOUT_IMAGE_POSITIONS, state.aboutImagePosition)}</div>
            <div class="field-group"><span class="field-label">Image shape</span>${choicePillsHtml('aboutImageShape', IMAGE_SHAPES, state.aboutImageShape)}</div>
            ${decorativeSvgPickerHtml('decorativeAboutSvg', state.decorativeAboutSvg)}

            <div class="field-group">
              <span class="field-label">Highlights / values (${highlights.length}/6)</span>
              <div class="list-editor">
                ${highlights
                  .map(
                    (h, idx) => `<div class="list-row">
                    <div class="list-row-fields field-row-2">
                      <select class="field-select" data-arr-key="aboutHighlights" data-arr-idx="${idx}" data-arr-sub="icon" aria-label="Highlight icon">
                        ${SERVICE_ICONS.map((ic) => `<option value="${ic.id}" ${h.icon === ic.id ? 'selected' : ''}>${escapeHTML(ic.name)}</option>`).join('')}
                      </select>
                      <input type="text" class="field-input" data-arr-key="aboutHighlights" data-arr-idx="${idx}" data-arr-sub="text" value="${escapeHTML(h.text || '')}" placeholder="Highlight statement" maxlength="90" />
                    </div>
                    <button type="button" class="mini-icon-btn is-remove" data-arr-remove="aboutHighlights" data-idx="${idx}" aria-label="Remove highlight">&times;</button>
                  </div>`
                  )
                  .join('')}
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-arr-add="aboutHighlights" ${highlights.length >= 6 ? 'disabled' : ''}>+ Add highlight</button>
            </div>

            <div class="field-group">
              <span class="field-label">Stats counters (${stats.length}/4)</span>
              <div class="list-editor">
                ${stats
                  .map(
                    (st, idx) => `<div class="list-row">
                    <div class="list-row-fields field-row-2">
                      <input type="text" class="field-input" data-arr-key="aboutStats" data-arr-idx="${idx}" data-arr-sub="number" value="${escapeHTML(st.number || '')}" placeholder="e.g. 120+" maxlength="20" />
                      <input type="text" class="field-input" data-arr-key="aboutStats" data-arr-idx="${idx}" data-arr-sub="label" value="${escapeHTML(st.label || '')}" placeholder="e.g. Clients" maxlength="40" />
                    </div>
                    <button type="button" class="mini-icon-btn is-remove" data-arr-remove="aboutStats" data-idx="${idx}" aria-label="Remove stat">&times;</button>
                  </div>`
                  )
                  .join('')}
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-arr-add="aboutStats" ${stats.length >= 4 ? 'disabled' : ''}>+ Add stat</button>
            </div>
          </div>
        </details>`;
    }

    case 'sections': {
      const items = state.services || [];
      return `
        <details class="sf-acc" open>
          <summary>Services / Projects Items (${items.length}/12 · 60 Built-in SVG Icons)</summary>
          <div class="sf-acc-body">
            <div class="field-row-2">
              <div class="field-group"><span class="field-label">Columns</span>${choicePillsHtml('servicesColumns', [{ id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' }], state.servicesColumns)}</div>
              <div class="field-group"><span class="field-label">Card style</span>${choicePillsHtml('servicesCardStyle', [{ id: 'inherit', name: 'Theme Default' }, ...CARD_STYLES], state.servicesCardStyle)}</div>
            </div>

            <div class="list-editor">
              ${items
                .map((s, idx) => {
                  const tErr = currentErrors[`srv_${idx}_title`] || '';
                  const dErr = currentErrors[`srv_${idx}_desc`] || '';
                  const lErr = currentErrors[`srv_${idx}_link`] || '';
                  return `
                  <div class="list-row">
                    <div class="list-row-fields">
                      <div class="field-row-2">
                        <input type="text" class="field-input${tErr ? ' is-invalid' : ''}" data-arr-key="services" data-arr-idx="${idx}" data-arr-sub="title" value="${escapeHTML(s.title || '')}" placeholder="Title*" maxlength="80" />
                        <input type="text" class="field-input" data-arr-key="services" data-arr-idx="${idx}" data-arr-sub="price" value="${escapeHTML(s.price || '')}" placeholder="Optional price (e.g. $99)" maxlength="30" />
                      </div>
                      <div class="field-error" aria-live="polite">${escapeHTML(tErr)}</div>
                      <input type="text" class="field-input${dErr ? ' is-invalid' : ''}" data-arr-key="services" data-arr-idx="${idx}" data-arr-sub="description" value="${escapeHTML(s.description || '')}" placeholder="Short description*" maxlength="280" />
                      <div class="field-error" aria-live="polite">${escapeHTML(dErr)}</div>
                      <div class="field-row-2">
                        <input type="text" class="field-input${lErr ? ' is-invalid' : ''}" data-arr-key="services" data-arr-idx="${idx}" data-arr-sub="link" value="${escapeHTML(s.link || '')}" placeholder="Optional link (#contact or example.com)" maxlength="200" />
                        <input type="text" class="field-input" data-arr-key="services" data-arr-idx="${idx}" data-arr-sub="buttonLabel" value="${escapeHTML(s.buttonLabel || '')}" placeholder="Button label (e.g. Learn more)" maxlength="30" />
                      </div>
                      <div class="field-error" aria-live="polite">${escapeHTML(lErr)}</div>
                      <div class="inline-bar">
                        <button type="button" class="choice-pill" data-toggle-icon-picker="${idx}">${renderIcon(s.icon || 'sparkles', 15)} <span>Change icon</span></button>
                        <label class="choice-pill" for="upload-srv-${idx}">Upload image</label>
                        <input id="upload-srv-${idx}" type="file" data-upload-array="services" data-arr-idx="${idx}" data-arr-sub="image" accept=".png,.jpg,.jpeg,.svg,.webp" class="sr-only" />
                        ${s.image ? `<button type="button" class="mini-pill-btn" data-clear-array-img="services" data-arr-idx="${idx}" data-arr-sub="image">Clear img</button>` : ''}
                      </div>
                      ${
                        openIconPickerIndex === idx
                          ? `<div class="icon-picker-grid">${SERVICE_ICONS.map(
                              (ic) => `<button type="button" class="icon-pick-btn${s.icon === ic.id ? ' is-selected' : ''}" data-pick-srv-icon="${idx}" data-icon-id="${ic.id}" title="${escapeHTML(ic.name)}">${renderIcon(ic.id, 16)}</button>`
                            ).join('')}</div>`
                          : ''
                      }
                    </div>
                    <div class="list-row-actions">
                      <button type="button" class="mini-icon-btn" data-arr-move="services" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
                      <button type="button" class="mini-icon-btn" data-arr-move="services" data-idx="${idx}" data-dir="1" ${idx === items.length - 1 ? 'disabled' : ''}>&darr;</button>
                      <button type="button" class="mini-icon-btn is-remove" data-arr-remove="services" data-idx="${idx}" ${items.length <= 1 ? 'disabled' : ''}>&times;</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>
            <div class="list-footer">
              <button type="button" class="btn btn-secondary btn-sm" data-arr-add="services" ${items.length >= 12 ? 'disabled' : ''}>+ Add item</button>
              <span class="char-count">${items.length} / 12 items</span>
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Choose &amp; Reorder Page Sections (12 sections · Drag to reorder)</summary>
          <div class="sf-acc-body">
            <div class="list-editor">
              ${(state.sectionOrder || [])
                .map((secId, idx) => {
                  const cat = SECTION_CATALOG.find((c) => c.id === secId);
                  const meta = state.sections?.[secId];
                  if (!cat || !meta) return '';
                  return `
                  <div class="list-row" draggable="true" data-drag-kind="section" data-drag-idx="${idx}">
                    <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                    <div class="list-row-fields">
                      <label class="toggle-line" style="padding:0;">
                        <strong>${escapeHTML(cat.name)}</strong>
                        <input type="checkbox" data-toggle-section="${secId}" ${meta.enabled ? 'checked' : ''} />
                      </label>
                      ${
                        meta.enabled
                          ? `<div class="field-row-2">
                              <input type="text" class="field-input" data-sec-meta="${secId}" data-sec-field="heading" value="${escapeHTML(meta.heading)}" placeholder="Section heading" maxlength="70" />
                              <input type="text" class="field-input" data-sec-meta="${secId}" data-sec-field="subheading" value="${escapeHTML(meta.subheading)}" placeholder="Subheading" maxlength="140" />
                            </div>`
                          : ''
                      }
                    </div>
                    <div class="list-row-actions">
                      <button type="button" class="mini-icon-btn" data-sec-move="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
                      <button type="button" class="mini-icon-btn" data-sec-move="${idx}" data-dir="1" ${idx === state.sectionOrder.length - 1 ? 'disabled' : ''}>&darr;</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Edit Content for Enabled Extra Sections</summary>
          <div class="sf-acc-body">
            ${renderExtraSectionEditors()}
          </div>
        </details>`;
    }

    case 'contact': {
      const eErr = currentErrors.contactEmail || '';
      const pErr = currentErrors.contactPhone || '';
      const wErr = currentErrors.whatsappNumber || '';
      const chosen = new Set(state.contactFormFields || []);
      return `
        <details class="sf-acc" open>
          <summary>Direct Contact Details</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <label class="field-label" for="f-contactEmail">Email address<span class="required-mark">*</span></label>
              <input id="f-contactEmail" type="email" class="field-input${eErr ? ' is-invalid' : ''}" data-bind="contactEmail" maxlength="120" value="${escapeHTML(state.contactEmail)}" placeholder="hello@studio.com" />
              <div class="field-error" id="err-contactEmail" aria-live="polite">${escapeHTML(eErr)}</div>
            </div>
            <div class="field-row-2">
              <div class="field-group">
                <label class="field-label" for="f-contactPhone">Phone number</label>
                <input id="f-contactPhone" type="tel" class="field-input${pErr ? ' is-invalid' : ''}" data-bind="contactPhone" maxlength="25" value="${escapeHTML(state.contactPhone)}" placeholder="+1 (555) 234-5678" />
                <div class="field-error" aria-live="polite">${escapeHTML(pErr)}</div>
              </div>
              <div class="field-group">
                <label class="field-label" for="f-whatsappNumber">WhatsApp number</label>
                <input id="f-whatsappNumber" type="tel" class="field-input${wErr ? ' is-invalid' : ''}" data-bind="whatsappNumber" maxlength="25" value="${escapeHTML(state.whatsappNumber)}" placeholder="+1 555 234 5678" />
                <div class="field-error" aria-live="polite">${escapeHTML(wErr)}</div>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label" for="f-contactAddress">Address / City</label>
              <input id="f-contactAddress" type="text" class="field-input" data-bind="contactAddress" maxlength="200" value="${escapeHTML(state.contactAddress)}" placeholder="420 Cedar Ave, Portland, OR" />
            </div>
            <div class="field-group">
              <label class="field-label" for="f-workingHours">Working hours</label>
              <input id="f-workingHours" type="text" class="field-input" data-bind="workingHours" maxlength="100" value="${escapeHTML(state.workingHours)}" placeholder="Mon – Fri, 9:00 AM – 6:00 PM" />
            </div>
            <div class="toggle-line"><label for="f-enableClickToEmail">Enable click-to-email (mailto:)</label><input id="f-enableClickToEmail" type="checkbox" data-bind-check="enableClickToEmail" ${state.enableClickToEmail ? 'checked' : ''} /></div>
            <div class="toggle-line"><label for="f-enableClickToCall">Enable click-to-call (tel:)</label><input id="f-enableClickToCall" type="checkbox" data-bind-check="enableClickToCall" ${state.enableClickToCall ? 'checked' : ''} /></div>
            <div class="toggle-line"><label for="f-showStaticMap">Show styled offline static map card</label><input id="f-showStaticMap" type="checkbox" data-bind-check="showStaticMap" ${state.showStaticMap ? 'checked' : ''} /></div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Conversion Tools (WhatsApp Float, UPI Pay, vCard, Directions)</summary>
          <div class="sf-acc-body">
            <div class="toggle-line"><label for="f-whatsappFloatEnabled">Show floating WhatsApp chat button</label><input id="f-whatsappFloatEnabled" type="checkbox" data-bind-check="whatsappFloatEnabled" ${state.whatsappFloatEnabled ? 'checked' : ''} /></div>
            ${
              state.whatsappFloatEnabled
                ? `<div class="field-group">
                    <label class="field-label" for="f-whatsappMessage">Pre-filled WhatsApp message</label>
                    <input id="f-whatsappMessage" type="text" class="field-input" data-bind="whatsappMessage" maxlength="160" value="${escapeHTML(state.whatsappMessage || '')}" placeholder="Hello! I would like to connect." />
                  </div>`
                : ''
            }
            <div class="toggle-line"><label for="f-vcardEnabled">Include &ldquo;Save Contact (.vcf)&rdquo; vCard download button</label><input id="f-vcardEnabled" type="checkbox" data-bind-check="vcardEnabled" ${state.vcardEnabled ? 'checked' : ''} /></div>
            <div class="toggle-line"><label for="f-directionsEnabled">Include &ldquo;Get Directions&rdquo; link from address</label><input id="f-directionsEnabled" type="checkbox" data-bind-check="directionsEnabled" ${state.directionsEnabled ? 'checked' : ''} /></div>

            <div class="toggle-line"><label for="f-upiEnabled">Include UPI Pay button &amp; scannable QR code</label><input id="f-upiEnabled" type="checkbox" data-bind-check="upiEnabled" ${state.upiEnabled ? 'checked' : ''} /></div>
            ${
              state.upiEnabled
                ? `<div class="notice-box"><strong>Important:</strong> UPI links open the visitor&rsquo;s UPI app directly. SiteForge never processes payments or holds funds — always verify payments inside your own UPI app.</div>
                  <div class="field-row-2">
                    <div class="field-group">
                      <label class="field-label" for="f-upiId">UPI ID (VPA)*</label>
                      <input id="f-upiId" type="text" class="field-input${currentErrors.upiId ? ' is-invalid' : ''}" data-bind="upiId" maxlength="80" value="${escapeHTML(state.upiId || '')}" placeholder="merchant@upi" />
                      <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.upiId || '')}</div>
                    </div>
                    <div class="field-group">
                      <label class="field-label" for="f-upiAmount">Default amount (optional)</label>
                      <input id="f-upiAmount" type="text" class="field-input" data-bind="upiAmount" maxlength="12" value="${escapeHTML(state.upiAmount || '')}" placeholder="e.g. 500" />
                    </div>
                  </div>
                  <div class="field-group">
                    <label class="field-label" for="f-upiNote">Payment note</label>
                    <input id="f-upiNote" type="text" class="field-input" data-bind="upiNote" maxlength="60" value="${escapeHTML(state.upiNote || '')}" placeholder="Order payment" />
                  </div>`
                : ''
            }
          </div>
        </details>

        <details class="sf-acc">
          <summary>Visual Contact Form &amp; Layout</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Contact layout</span>${choicePillsHtml('contactLayout', CONTACT_LAYOUTS, state.contactLayout)}</div>
            <div class="toggle-line"><label for="f-contactFormEnabled">Include contact form</label><input id="f-contactFormEnabled" type="checkbox" data-bind-check="contactFormEnabled" ${state.contactFormEnabled ? 'checked' : ''} /></div>
            <div class="field-group">
              <span class="field-label">Form delivery mode</span>
              ${choicePillsHtml('contactFormMode', [{ id: 'mailto', name: 'Email App (mailto: — zero backend)' }, { id: 'endpoint', name: 'HTTPS Form Endpoint (with offline queue)' }], state.contactFormMode || 'mailto')}
            </div>
            ${
              state.contactFormMode === 'endpoint'
                ? `<div class="field-group">
                    <label class="field-label" for="f-contactFormEndpoint">HTTPS Form Endpoint URL (e.g. Formspree, Basin, custom webhook)</label>
                    <input id="f-contactFormEndpoint" type="url" class="field-input${currentErrors.contactFormEndpoint ? ' is-invalid' : ''}" data-bind="contactFormEndpoint" maxlength="240" value="${escapeHTML(state.contactFormEndpoint || '')}" placeholder="https://formspree.io/f/your-id" />
                    <span class="field-helper">Includes a hidden spam honeypot field and automatic offline queueing if a visitor submits while offline.</span>
                    <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.contactFormEndpoint || '')}</div>
                  </div>`
                : ''
            }
            <div class="field-group">
              <span class="field-label">Form fields</span>
              <div class="choice-pills">
                ${CONTACT_FIELD_OPTIONS.map(
                  (f) => `<button type="button" class="choice-pill${chosen.has(f.id) ? ' is-selected' : ''}" data-toggle-contact-field="${f.id}">${escapeHTML(f.name)}</button>`
                ).join('')}
              </div>
            </div>
            <div class="field-row-2">
              <div class="field-group"><label class="field-label" for="f-contactButtonLabel">Button label</label><input id="f-contactButtonLabel" type="text" class="field-input" data-bind="contactButtonLabel" value="${escapeHTML(state.contactButtonLabel)}" maxlength="40" /></div>
              <div class="field-group"><label class="field-label" for="f-contactSuccessText">Success message</label><input id="f-contactSuccessText" type="text" class="field-input" data-bind="contactSuccessText" value="${escapeHTML(state.contactSuccessText)}" maxlength="120" /></div>
            </div>
          </div>
        </details>`;
    }

    case 'footer': {
      const groups = state.footerLinkGroups || [];
      return `
        <details class="sf-acc" open>
          <summary>Footer Copy, Style &amp; Link Groups</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Footer style</span>${choicePillsHtml('footerStyle', FOOTER_STYLES, state.footerStyle)}</div>
            <div class="field-group">
              <label class="field-label" for="f-footerText">Footer blurb</label>
              <input id="f-footerText" type="text" class="field-input" data-bind="footerText" maxlength="160" value="${escapeHTML(state.footerText)}" placeholder="Short closing statement" />
            </div>
            <div class="field-group">
              <label class="field-label" for="f-copyrightText">Custom copyright text</label>
              <input id="f-copyrightText" type="text" class="field-input" data-bind="copyrightText" maxlength="120" value="${escapeHTML(state.copyrightText)}" placeholder="Defaults to your site name" />
            </div>
            <div class="toggle-line"><label for="f-autoCopyrightYear">Auto-include current year</label><input id="f-autoCopyrightYear" type="checkbox" data-bind-check="autoCopyrightYear" ${state.autoCopyrightYear ? 'checked' : ''} /></div>
            <div class="toggle-line"><label for="f-showBackToTop">Show Back-to-Top button</label><input id="f-showBackToTop" type="checkbox" data-bind-check="showBackToTop" ${state.showBackToTop ? 'checked' : ''} /></div>
            <div class="toggle-line"><label for="f-showSiteForgeCredit">Show &ldquo;Made with SiteForge&rdquo; credit</label><input id="f-showSiteForgeCredit" type="checkbox" data-bind-check="showSiteForgeCredit" ${state.showSiteForgeCredit ? 'checked' : ''} /></div>

            <div class="field-group">
              <span class="field-label">Extra footer link groups (${groups.length}/3)</span>
              ${groups
                .map(
                  (g, gi) => `<div class="list-row" style="flex-direction:column;">
                  <div style="display:flex;width:100%;gap:0.4rem;">
                    <input type="text" class="field-input" data-fgrp-title="${gi}" value="${escapeHTML(g.title || '')}" placeholder="Group heading" maxlength="40" />
                    <button type="button" class="mini-icon-btn is-remove" data-fgrp-remove="${gi}" aria-label="Remove group">&times;</button>
                  </div>
                  ${(g.links || [])
                    .map(
                      (l, li) => `<div class="field-row-2" style="width:100%;">
                      <input type="text" class="field-input" data-fgrp-link="${gi}:${li}:label" value="${escapeHTML(l.label || '')}" placeholder="Link label" maxlength="32" />
                      <input type="text" class="field-input" data-fgrp-link="${gi}:${li}:url" value="${escapeHTML(l.url || '')}" placeholder="#about or example.com" maxlength="160" />
                    </div>`
                    )
                    .join('')}
                  <button type="button" class="mini-pill-btn" data-fgrp-add-link="${gi}" ${(g.links || []).length >= 5 ? 'disabled' : ''}>+ Add link</button>
                </div>`
                )
                .join('')}
              <button type="button" class="btn btn-secondary btn-sm" id="btn-fgrp-add" ${groups.length >= 3 ? 'disabled' : ''}>+ Add link group</button>
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>16 Social Platforms &amp; Icon Style</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Social icon style</span>${choicePillsHtml('socialIconStyle', SOCIAL_ICON_STYLES, state.socialIconStyle)}</div>
            <div class="list-editor">
              ${SOCIAL_PLATFORMS.map((p) => {
                const val = state.socialLinks?.[p.id] || '';
                const err = currentErrors[`social_${p.id}`] || '';
                return `<div class="field-group">
                  <label class="field-label" style="display:flex;align-items:center;gap:0.4rem;" for="soc-${p.id}">${renderSocialIcon(p.id, 14)} ${escapeHTML(p.name)}</label>
                  <input id="soc-${p.id}" type="url" class="field-input${err ? ' is-invalid' : ''}" data-social-platform="${p.id}" value="${escapeHTML(val)}" placeholder="${escapeHTML(p.placeholder)}" maxlength="200" />
                  <div class="field-error" aria-live="polite">${escapeHTML(err)}</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </details>

        <details class="sf-acc">
          <summary>Legal Pages (Privacy, Terms, Disclaimer, Refund, Cookies)</summary>
          <div class="sf-acc-body">
            <div class="notice-box"><strong>Notice:</strong> Starter legal pages are plain-language templates for convenience only and are not legal advice. Have a qualified professional review them for your business.</div>
            <div class="field-group">
              <label class="field-label" for="f-legalCountry">Jurisdiction / Country</label>
              <input id="f-legalCountry" type="text" class="field-input" data-bind="legalCountry" maxlength="60" value="${escapeHTML(state.legalCountry || 'India')}" placeholder="e.g. India, United States, United Kingdom" />
            </div>
            <div class="list-editor">
              ${LEGAL_PAGE_TYPES.map(
                (lp) => `<label class="checklist-item">
                  <input type="checkbox" data-legal-page="${lp.id}" ${state.legalPages?.[lp.id] ? 'checked' : ''} />
                  <div><strong>${escapeHTML(lp.name)}</strong><div class="field-helper">Creates <code>${escapeHTML(lp.slug)}.html</code> and links it in your footer.</div></div>
                </label>`
              ).join('')}
            </div>
          </div>
        </details>`;
    }

    case 'seo': {
      const descLen = (state.metaDescription || '').length;
      const descCls = descLen >= 120 && descLen <= 160 ? 'is-good' : descLen >= 60 && descLen <= 180 ? 'is-warn' : 'is-bad';
      const descLabel = descLen >= 120 && descLen <= 160 ? 'Ideal' : descLen === 0 ? 'Missing' : descLen < 120 ? 'Short' : 'Too long';
      return `
        <details class="sf-acc" open>
          <summary>SEO Power Pack, Site URL &amp; Open Graph</summary>
          <div class="sf-acc-body">
            <div class="field-group">
              <label class="field-label" for="f-siteUrl">Live Site URL (generates sitemap.xml, canonical URLs &amp; QR code)</label>
              <input id="f-siteUrl" type="url" class="field-input${currentErrors.siteUrl ? ' is-invalid' : ''}" data-bind="siteUrl" maxlength="200" value="${escapeHTML(state.siteUrl || '')}" placeholder="https://yourdomain.com" />
              <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.siteUrl || '')}</div>
            </div>
            <div class="field-group">
              <div class="field-label-row"><label class="field-label" for="f-metaTitle">Meta title</label><span class="char-count" data-count="metaTitle">${(state.metaTitle || '').length}/70</span></div>
              <input id="f-metaTitle" type="text" class="field-input" data-bind="metaTitle" maxlength="70" value="${escapeHTML(state.metaTitle)}" placeholder="Defaults to site name" />
            </div>
            <div class="field-group">
              <div class="field-label-row">
                <label class="field-label" for="f-metaDescription">Meta description</label>
                <span class="char-count ${descCls}" data-count-desc>${descLen}/160 · ${descLabel}</span>
              </div>
              <textarea id="f-metaDescription" class="field-textarea" style="min-height:72px;" data-bind="metaDescription" maxlength="220" placeholder="Aim for 120–160 characters for search engines...">${escapeHTML(state.metaDescription)}</textarea>
            </div>
            <div class="field-row-2">
              <div class="field-group"><label class="field-label" for="f-metaKeywords">Keywords</label><input id="f-metaKeywords" type="text" class="field-input" data-bind="metaKeywords" maxlength="200" value="${escapeHTML(state.metaKeywords)}" placeholder="design, studio, web" /></div>
              <div class="field-group"><label class="field-label" for="f-metaAuthor">Author</label><input id="f-metaAuthor" type="text" class="field-input" data-bind="metaAuthor" maxlength="80" value="${escapeHTML(state.metaAuthor)}" /></div>
            </div>
            <div class="field-row-2">
              <div class="field-group"><label class="field-label" for="f-priceRange">Price range (optional JSON-LD)</label><input id="f-priceRange" type="text" class="field-input" data-bind="priceRange" maxlength="20" value="${escapeHTML(state.priceRange || '')}" placeholder="e.g. $$ or ₹₹" /></div>
              <div class="field-group"><label class="field-label" for="f-cuisineType">Cuisine / specialty (optional)</label><input id="f-cuisineType" type="text" class="field-input" data-bind="cuisineType" maxlength="60" value="${escapeHTML(state.cuisineType || '')}" placeholder="e.g. Coffee &amp; Bakery" /></div>
            </div>
            <div class="field-group">
              <label class="field-label" for="f-canonicalUrl">Canonical URL override (optional)</label>
              <input id="f-canonicalUrl" type="url" class="field-input${currentErrors.canonicalUrl ? ' is-invalid' : ''}" data-bind="canonicalUrl" maxlength="200" value="${escapeHTML(state.canonicalUrl)}" placeholder="https://yourdomain.com" />
              <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.canonicalUrl || '')}</div>
            </div>
            <div class="field-row-2">
              <div class="field-group"><span class="field-label">Robots</span>${choicePillsHtml('robots', ROBOTS_OPTIONS, state.robots)}</div>
              <div class="field-group"><span class="field-label">Twitter Card</span>${choicePillsHtml('twitterCard', TWITTER_CARD_TYPES, state.twitterCard)}</div>
            </div>
            <div class="field-row-2">
              <div class="field-group"><label class="field-label" for="f-ogTitle">Open Graph title</label><input id="f-ogTitle" type="text" class="field-input" data-bind="ogTitle" maxlength="70" value="${escapeHTML(state.ogTitle)}" placeholder="Defaults to meta title" /></div>
              <div class="field-group"><label class="field-label" for="f-ogDescription">Open Graph description</label><input id="f-ogDescription" type="text" class="field-input" data-bind="ogDescription" maxlength="160" value="${escapeHTML(state.ogDescription)}" /></div>
            </div>
            ${uploadSlotHtml({ slotKey: 'ogImageDataUrl', label: 'Open Graph preview image (auto-generated 1200×630 PNG in ZIP if left blank)', dataUrl: state.ogImageDataUrl })}
          </div>
        </details>

        <details class="sf-acc">
          <summary>Logo &amp; Favicon Pack (SVG + 16/32/180/192/512 PNG in ZIP)</summary>
          <div class="sf-acc-body">
            <div class="field-group"><span class="field-label">Logo type</span>${choicePillsHtml('logoMode', LOGO_MODES, state.logoMode)}</div>
            ${
              state.logoMode === 'upload'
                ? uploadSlotHtml({ slotKey: 'logoDataUrl', label: 'Upload brand logo', dataUrl: state.logoDataUrl })
                : state.logoMode === 'emoji'
                ? `<div class="field-group"><label class="field-label" for="f-logoEmoji">Logo emoji / symbol</label><input id="f-logoEmoji" type="text" class="field-input" data-bind="logoEmoji" maxlength="4" value="${escapeHTML(state.logoEmoji)}" /></div>`
                : `<div class="field-row-2">
                    <div class="field-group"><label class="field-label" for="f-logoTextFont">Text logo font</label><select id="f-logoTextFont" class="field-select" data-bind="logoTextFont">${FONT_STACKS.map((f) => `<option value="${f.id}" ${state.logoTextFont === f.id ? 'selected' : ''}>${escapeHTML(f.name)}</option>`).join('')}</select></div>
                    <div class="field-group"><label class="field-label" for="f-logoTextColor">Optional logo colour</label><input id="f-logoTextColor" type="color" class="field-input" style="height:38px;padding:3px;" data-bind="logoTextColor" value="${escapeHTML(state.logoTextColor || '#c2593f')}" /></div>
                  </div>`
            }
            <div class="field-row-2">
              <div class="field-group"><span class="field-label">Logo size</span>${choicePillsHtml('logoSize', LOGO_SIZES, state.logoSize)}</div>
              <div class="field-group"><span class="field-label">Logo position</span>${choicePillsHtml('logoPosition', LOGO_POSITIONS, state.logoPosition)}</div>
            </div>

            <div class="field-group"><span class="field-label">Favicon</span>${choicePillsHtml('faviconMode', FAVICON_MODES, state.faviconMode)}</div>
            ${
              state.faviconMode === 'upload'
                ? uploadSlotHtml({ slotKey: 'faviconDataUrl', label: 'Upload favicon image', dataUrl: state.faviconDataUrl })
                : `<div class="field-row-2">
                    ${state.faviconMode === 'auto-emoji' ? `<div class="field-group"><label class="field-label" for="f-faviconEmoji">Favicon emoji</label><input id="f-faviconEmoji" type="text" class="field-input" data-bind="faviconEmoji" maxlength="4" value="${escapeHTML(state.faviconEmoji)}" /></div>` : `<div class="field-group"><span class="field-helper">Uses the first letter of your site name on a coloured circle.</span></div>`}
                    <div class="field-group"><label class="field-label" for="f-faviconColor">Circle colour</label><input id="f-faviconColor" type="color" class="field-input" style="height:38px;padding:3px;" data-bind="faviconColor" value="${escapeHTML(state.faviconColor || '#c2593f')}" /></div>
                  </div>`
            }
          </div>
        </details>

        <details class="sf-acc">
          <summary>Optional Consent-Gated Visitor Analytics (Off by Default)</summary>
          <div class="sf-acc-body">
            <p class="field-helper" style="margin:0;">SiteForge never injects arbitrary scripts. Only allowlisted privacy-conscious providers are supported, and they only load after the visitor accepts the consent bar on your live site.</p>
            <div class="field-group">
              <span class="field-label">Analytics provider</span>
              ${choicePillsHtml('analyticsProvider', ANALYTICS_PROVIDERS, state.analyticsProvider || 'none')}
            </div>
            ${
              state.analyticsProvider && state.analyticsProvider !== 'none'
                ? `<div class="field-group">
                    <label class="field-label" for="f-analyticsId">${escapeHTML((ANALYTICS_PROVIDERS.find((p) => p.id === state.analyticsProvider)?.placeholder) || 'Analytics ID')}</label>
                    <input id="f-analyticsId" type="text" class="field-input${currentErrors.analyticsId ? ' is-invalid' : ''}" data-bind="analyticsId" maxlength="80" value="${escapeHTML(state.analyticsId || '')}" placeholder="${escapeHTML((ANALYTICS_PROVIDERS.find((p) => p.id === state.analyticsProvider)?.placeholder) || '')}" />
                    <div class="field-error" aria-live="polite">${escapeHTML(currentErrors.analyticsId || '')}</div>
                  </div>`
                : ''
            }
          </div>
        </details>`;
    }

    case 'review': {
      const resolved = resolveStateImageUris(state);
      const health = evaluateSiteHealth(resolved);
      const pillars = health.pillars || health.scores || { seo: 0, accessibility: 0, performance: 0, content: 0, security: 0 };
      const gradeCls = health.overall >= 80 ? 'is-good' : health.overall >= 60 ? 'is-warn' : 'is-bad';
      const lName = (LAYOUT_LIST.find((l) => l.id === state.layout) || LAYOUT_LIST[0]).name;
      const tName = (THEME_LIST.find((t) => t.id === state.theme) || THEME_LIST[0]).name;
      const langObj = SITE_LANGUAGES.find((l) => l.code === state.siteLanguage) || SITE_LANGUAGES[0];
      const suggestedSlug = publishSlugDraft || slugifyName(state.siteName);
      const manifest = getSitePageManifest(resolved);
      const contrastIssue = health.checks.some(
        (c) => (c.canAutoFixContrast || c.fixAction?.type === 'autofix-contrast') && String(c.status || '').toLowerCase() !== 'pass'
      );
      const checklistState = state.launchChecklist || {};
      const checklistDone = LAUNCH_CHECKLIST_ITEMS.filter((it) => checklistState[it.id]).length;

      const summaryRows = [
        [0, '01 · Site Identity', `${state.siteName || 'Not set'} · ${langObj.name} (${langObj.dir.toUpperCase()})${state.bilingualEnabled ? ` + ${state.secondLanguage}` : ''}`],
        [1, '02 · Site Type', (SITE_TYPES.find((t) => t.id === state.siteType) || SITE_TYPES[0]).name],
        [2, '03 · Layout', `${lName} · Header: ${state.headerStyle} · Width: ${state.contentWidth}`],
        [3, '04 · Style', `${tName}${state.useCustomColors ? ' (Custom colours)' : ''} · ${state.headingFont} / ${state.bodyFont}`],
        [4, '05 · Structure & Menu', `${state.siteStructure === 'multi-page' ? `Multi-page (${manifest.length} pages)` : 'One-page'} · ${(state.menuItems || []).map((m) => m.label).join(' · ')}`],
        [5, '06 · Hero', state.heroHeadline || 'Not set'],
        [6, '07 · About', (state.about || 'Not set').slice(0, 110)],
        [7, '08 · Sections', `${(state.services || []).length} service(s) · ${Object.values(state.sections || {}).filter((x) => x.enabled).length} enabled sections`],
        [8, '09 · Contact', [state.contactEmail, state.contactPhone, state.upiEnabled ? `UPI: ${state.upiId}` : ''].filter(Boolean).join(' · ') || 'Not set'],
        [9, '10 · Footer & Legal', `${state.footerStyle} · ${Object.values(state.socialLinks || {}).filter(Boolean).length} social(s) · ${Object.values(state.legalPages || {}).filter(Boolean).length} legal page(s)`],
        [10, '11 · SEO & Logo', `${state.metaTitle || state.siteName || 'Default'}${state.siteUrl ? ` · ${state.siteUrl}` : ''} · Logo: ${state.logoMode}`],
      ];

      return `
        <div class="health-panel">
          <div class="health-summary-row">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div class="health-grade-ring ${gradeCls}">
                <span style="font-size:1.35rem;line-height:1;">${escapeHTML(health.grade)}</span>
                <span style="font-size:0.65rem;">${health.overall}/100</span>
              </div>
              <div>
                <strong style="font-size:0.95rem;">Live Site Health Score</strong>
                <div class="field-helper">CWV Targets: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 · Est. page ${health.estimatedKb ?? 20} KB</div>
              </div>
            </div>
            ${contrastIssue ? `<button type="button" id="btn-autofix-contrast" class="btn btn-primary btn-sm">Auto-fix Contrast (≥ 4.5:1)</button>` : ''}
          </div>

          <div class="health-pillars">
            ${[
              ['SEO', pillars.seo],
              ['WCAG AA', pillars.accessibility],
              ['Perf (Est.)', pillars.performance],
              ['Content', pillars.content],
              ['Security', pillars.security],
            ]
              .map(
                ([lbl, val]) => `<div class="health-pillar-card">
                <strong>${val}</strong>
                <span>${lbl}</span>
                <div class="health-bar-track"><div class="health-bar-fill" style="width:${val}%;"></div></div>
              </div>`
              )
              .join('')}
          </div>

          <div class="health-checks-list">
            ${health.checks
              .map((c) => {
                const st = String(c.status || 'pass').toLowerCase();
                const fixStep =
                  typeof c.stepIdx === 'number'
                    ? c.stepIdx
                    : typeof c.fixAction?.stepIdx === 'number'
                    ? c.fixAction.stepIdx
                    : null;
                const isContrastAuto = c.canAutoFixContrast || c.fixAction?.type === 'autofix-contrast';
                const actionHtml =
                  st === 'pass'
                    ? ''
                    : isContrastAuto
                    ? `<button type="button" class="review-edit-btn" id="btn-autofix-contrast">Auto-fix</button>`
                    : fixStep !== null
                    ? `<button type="button" class="review-edit-btn" data-edit-step="${fixStep}">Fix it</button>`
                    : '';
                return `<div class="health-check-row is-${st}">
                <div>
                  <span class="health-status-tag ${st}">${escapeHTML(st)}</span>
                  <strong style="margin-left:0.35rem;">${escapeHTML(c.title)}</strong>
                  <div class="field-helper">${escapeHTML(c.detail)}</div>
                </div>
                ${actionHtml}
              </div>`;
              })
              .join('')}
          </div>
        </div>

        <div class="sf-acc" style="padding:0.75rem 0.9rem;">
          <div class="toggle-line" style="padding:0;">
            <label for="f-makeSiteOffline"><strong>Make my website work offline</strong> (adds manifest.webmanifest, versioned sw.js, offline.html &amp; subtle Install button to ZIP)</label>
            <input id="f-makeSiteOffline" type="checkbox" data-bind-check="makeSiteOffline" ${state.makeSiteOffline ? 'checked' : ''} />
          </div>
        </div>

        <div class="export-actions-grid">
          <button type="button" id="btn-download-zip" class="btn btn-primary">Download Full Website (.zip)</button>
          <button type="button" id="btn-download-html" class="btn btn-secondary">${escapeHTML(t('downloadHtml', prefs.lang))}</button>
          <button type="button" id="btn-save-folder" class="btn btn-secondary">${supportsDirectoryPicker() ? 'Save Directly to Folder' : 'Save Folder (ZIP Fallback)'}</button>
          <button type="button" id="btn-open-golive" class="btn btn-secondary">Go-Live Guide &amp; QR Poster</button>
          <button type="button" id="btn-copy-html" class="btn btn-secondary">${escapeHTML(t('copyHtml', prefs.lang))}</button>
          <button type="button" id="btn-print-pdf" class="btn btn-secondary">Print Review Sheet (PDF)</button>
          <button type="button" id="btn-export-json" class="btn btn-secondary">${escapeHTML(t('exportJson', prefs.lang))}</button>
          <button type="button" id="btn-open-siteforge-review" class="btn btn-secondary">Open .html / .zip to Edit</button>
        </div>

        <details class="sf-acc">
          <summary>Pre-Launch Checklist (${checklistDone}/${LAUNCH_CHECKLIST_ITEMS.length} complete)</summary>
          <div class="sf-acc-body">
            ${LAUNCH_CHECKLIST_ITEMS.map(
              (item) => `<label class="checklist-item">
                <input type="checkbox" data-launch-check="${item.id}" ${checklistState[item.id] ? 'checked' : ''} />
                <span>${escapeHTML(item.label)}</span>
              </label>`
            ).join('')}
          </div>
        </details>

        <div class="publish-box">
          <div class="field-label-row">
            <label class="field-label" for="input-publish-slug">Publish locally (IndexedDB)</label>
            <button type="button" class="review-edit-btn" id="btn-open-library-inline">Open Library</button>
          </div>
          <span class="field-helper">Allowed characters: lowercase a-z, 0-9, and hyphen (-). Paths like &ldquo;../test&rdquo; are rejected.</span>
          <div class="publish-row">
            <input id="input-publish-slug" type="text" class="field-input${publishError ? ' is-invalid' : ''}" value="${escapeHTML(suggestedSlug)}" placeholder="my-site-name" maxlength="50" />
            <button type="button" id="btn-publish-local" class="btn btn-primary">${escapeHTML(t('publishBtn', prefs.lang))}</button>
          </div>
          <div id="err-publish-slug" class="field-error" aria-live="polite">${escapeHTML(publishError)}</div>
        </div>

        <div class="review-list">
          ${summaryRows
            .map(
              ([idx, lbl, val]) => `<div class="review-row">
              <div><div class="review-kicker">${escapeHTML(lbl)}</div><div class="review-value">${escapeHTML(val)}</div></div>
              <button type="button" class="review-edit-btn" data-edit-step="${idx}">${escapeHTML(t('edit', prefs.lang))}</button>
            </div>`
            )
            .join('')}
        </div>`;
    }

    default:
      return '';
  }
}

function renderExtraSectionEditors() {
  const blocks = [];

  if (state.sections?.projects?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Projects / Portfolio (${state.projects.length}/10)</span>
        ${state.projects
          .map(
            (pr, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-2">
              <input type="text" class="field-input" data-arr-key="projects" data-arr-idx="${i}" data-arr-sub="title" value="${escapeHTML(pr.title || '')}" placeholder="Project title" />
              <input type="text" class="field-input" data-arr-key="projects" data-arr-idx="${i}" data-arr-sub="category" value="${escapeHTML(pr.category || '')}" placeholder="Category (e.g. Web, Brand)" />
            </div>
            <div class="field-row-2">
              <input type="text" class="field-input" data-arr-key="projects" data-arr-idx="${i}" data-arr-sub="description" value="${escapeHTML(pr.description || '')}" placeholder="Short summary" />
              <input type="text" class="field-input" data-arr-key="projects" data-arr-idx="${i}" data-arr-sub="link" value="${escapeHTML(pr.link || '')}" placeholder="Optional link (#contact or example.com)" />
            </div>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="projects" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="projects" ${state.projects.length >= 10 ? 'disabled' : ''}>+ Add project</button>
      </div>`);
  }

  if (state.sections?.features?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Features Grid (${state.features.length}/9)</span>
        ${state.features
          .map(
            (ft, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-2">
              <input type="text" class="field-input" data-arr-key="features" data-arr-idx="${i}" data-arr-sub="title" value="${escapeHTML(ft.title || '')}" placeholder="Feature title" />
              <input type="text" class="field-input" data-arr-key="features" data-arr-idx="${i}" data-arr-sub="description" value="${escapeHTML(ft.description || '')}" placeholder="Feature description" />
            </div>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="features" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="features" ${state.features.length >= 9 ? 'disabled' : ''}>+ Add feature</button>
      </div>`);
  }

  if (state.sections?.testimonials?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Testimonials (${state.testimonials.length}/8)</span>
        ${state.testimonials
          .map(
            (item, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-3">
              <input type="text" class="field-input" data-arr-key="testimonials" data-arr-idx="${i}" data-arr-sub="name" value="${escapeHTML(item.name || '')}" placeholder="Name" />
              <input type="text" class="field-input" data-arr-key="testimonials" data-arr-idx="${i}" data-arr-sub="role" value="${escapeHTML(item.role || '')}" placeholder="Role" />
              <select class="field-select" data-arr-key="testimonials" data-arr-idx="${i}" data-arr-sub="rating">
                ${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${Number(item.rating) === n ? 'selected' : ''}>${n} ★</option>`).join('')}
              </select>
            </div>
            <input type="text" class="field-input" data-arr-key="testimonials" data-arr-idx="${i}" data-arr-sub="quote" value="${escapeHTML(item.quote || '')}" placeholder="Quote" />
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="testimonials" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="testimonials" ${state.testimonials.length >= 8 ? 'disabled' : ''}>+ Add testimonial</button>
      </div>`);
  }

  if (state.sections?.pricing?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Pricing Plans (${state.pricingPlans.length}/4)</span>
        ${state.pricingPlans
          .map(
            (p, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-3">
              <input type="text" class="field-input" data-arr-key="pricingPlans" data-arr-idx="${i}" data-arr-sub="name" value="${escapeHTML(p.name || '')}" placeholder="Plan name" />
              <input type="text" class="field-input" data-arr-key="pricingPlans" data-arr-idx="${i}" data-arr-sub="price" value="${escapeHTML(p.price || '')}" placeholder="$49" />
              <input type="text" class="field-input" data-arr-key="pricingPlans" data-arr-idx="${i}" data-arr-sub="period" value="${escapeHTML(p.period || '')}" placeholder="/month" />
            </div>
            <textarea class="field-textarea" style="min-height:58px;" data-arr-key="pricingPlans" data-arr-idx="${i}" data-arr-sub="features" placeholder="One feature per line">${escapeHTML(p.features || '')}</textarea>
            <label class="toggle-line" style="padding:0;"><span>Highlight this plan</span><input type="checkbox" data-arr-check="pricingPlans" data-arr-idx="${i}" data-arr-sub="highlighted" ${p.highlighted ? 'checked' : ''} /></label>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="pricingPlans" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="pricingPlans" ${state.pricingPlans.length >= 4 ? 'disabled' : ''}>+ Add pricing plan</button>
      </div>`);
  }

  if (state.sections?.faq?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">FAQ Accordion (${state.faqItems.length}/12)</span>
        ${state.faqItems
          .map(
            (f, i) => `<div class="list-row"><div class="list-row-fields">
            <input type="text" class="field-input" data-arr-key="faqItems" data-arr-idx="${i}" data-arr-sub="question" value="${escapeHTML(f.question || '')}" placeholder="Question" />
            <input type="text" class="field-input" data-arr-key="faqItems" data-arr-idx="${i}" data-arr-sub="answer" value="${escapeHTML(f.answer || '')}" placeholder="Answer" />
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="faqItems" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="faqItems" ${state.faqItems.length >= 12 ? 'disabled' : ''}>+ Add FAQ</button>
      </div>`);
  }

  if (state.sections?.team?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Team Members (${state.teamMembers.length}/8)</span>
        ${state.teamMembers
          .map(
            (m, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-2">
              <input type="text" class="field-input" data-arr-key="teamMembers" data-arr-idx="${i}" data-arr-sub="name" value="${escapeHTML(m.name || '')}" placeholder="Name" />
              <input type="text" class="field-input" data-arr-key="teamMembers" data-arr-idx="${i}" data-arr-sub="role" value="${escapeHTML(m.role || '')}" placeholder="Role" />
            </div>
            <div class="inline-bar">
              <label class="choice-pill" for="upload-team-${i}">Upload photo</label>
              <input id="upload-team-${i}" type="file" data-upload-array="teamMembers" data-arr-idx="${i}" data-arr-sub="photo" accept=".png,.jpg,.jpeg,.svg,.webp" class="sr-only" />
              ${m.photo ? `<img class="img-thumb-sm" src="${getCachedImageUri(m.photo) || m.photo}" alt="${escapeHTML(m.name)}" />` : ''}
            </div>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="teamMembers" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="teamMembers" ${state.teamMembers.length >= 8 ? 'disabled' : ''}>+ Add member</button>
      </div>`);
  }

  if (state.sections?.gallery?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Image Gallery with Lightbox (${state.galleryItems.length}/12)</span>
        ${state.galleryItems
          .map(
            (g, i) => `<div class="list-row"><div class="list-row-fields">
            <div style="display:flex;gap:0.5rem;align-items:center;">
              ${g.image ? `<img class="img-thumb-sm" src="${getCachedImageUri(g.image) || g.image}" alt="${escapeHTML(g.alt || '')}" />` : ''}
              <input type="text" class="field-input" data-arr-key="galleryItems" data-arr-idx="${i}" data-arr-sub="caption" value="${escapeHTML(g.caption || '')}" placeholder="Caption / Alt text" />
            </div>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="galleryItems" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <div class="inline-bar">
          <label class="btn btn-secondary btn-sm" for="upload-gallery-add">+ Upload gallery image</label>
          <input id="upload-gallery-add" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" class="sr-only" ${state.galleryItems.length >= 12 ? 'disabled' : ''} />
        </div>
      </div>`);
  }

  if (state.sections?.timeline?.enabled) {
    blocks.push(`
      <div class="field-group">
        <span class="field-label">Timeline / Process (${state.timelineItems.length}/8)</span>
        ${state.timelineItems
          .map(
            (tm, i) => `<div class="list-row"><div class="list-row-fields">
            <div class="field-row-2">
              <input type="text" class="field-input" data-arr-key="timelineItems" data-arr-idx="${i}" data-arr-sub="title" value="${escapeHTML(tm.title || '')}" placeholder="Step title" />
              <input type="text" class="field-input" data-arr-key="timelineItems" data-arr-idx="${i}" data-arr-sub="description" value="${escapeHTML(tm.description || '')}" placeholder="Description" />
            </div>
          </div><button type="button" class="mini-icon-btn is-remove" data-arr-remove="timelineItems" data-idx="${i}">&times;</button></div>`
          )
          .join('')}
        <button type="button" class="btn btn-secondary btn-sm" data-arr-add="timelineItems" ${state.timelineItems.length >= 8 ? 'disabled' : ''}>+ Add step</button>
      </div>`);
  }

  if (state.sections?.partners?.enabled) {
    blocks.push(`
      <div class="field-group">
        <label class="field-label" for="f-partners-csv">Partner / Client Names (comma-separated)</label>
        <input id="f-partners-csv" type="text" class="field-input" data-partners-csv="1" value="${escapeHTML((state.partners || []).join(', '))}" placeholder="Acme Labs, Studio North, Loomworks" maxlength="240" />
      </div>`);
  }

  if (state.sections?.newsletter?.enabled) {
    blocks.push(`
      <div class="field-row-2">
        <div class="field-group"><label class="field-label">Newsletter Button Text</label><input type="text" class="field-input" data-bind="newsletterButtonText" value="${escapeHTML(state.newsletterButtonText || '')}" placeholder="Subscribe" /></div>
        <div class="field-group"><label class="field-label">Newsletter Privacy Note</label><input type="text" class="field-input" data-bind="newsletterNote" value="${escapeHTML(state.newsletterNote || '')}" placeholder="No spam. Unsubscribe anytime." /></div>
      </div>`);
  }

  if (state.sections?.cta?.enabled) {
    blocks.push(`
      <div class="field-row-2">
        <div class="field-group"><label class="field-label">CTA Button Text</label><input type="text" class="field-input" data-bind="ctaButtonText" value="${escapeHTML(state.ctaButtonText)}" /></div>
        <div class="field-group"><label class="field-label">CTA Button Link</label><input type="text" class="field-input" data-bind="ctaButtonLink" value="${escapeHTML(state.ctaButtonLink)}" /></div>
      </div>`);
  }

  return blocks.length
    ? blocks.join('')
    : '<p class="field-helper">Enable extra sections above (Projects, Features, Testimonials, Pricing, Team, FAQ, Gallery, Timeline, Partners, Newsletter, CTA) to edit their entries here.</p>';
}

function renderProgress() {
  const total = steps.length;
  const num = currentStep + 1;
  const numStr = String(num).padStart(2, '0');
  const totalStr = String(total).padStart(2, '0');
  const completedCount = steps.filter((s, idx) => idx < total - 1 && Object.keys(s.validate(state)).length === 0).length + (currentStep === total - 1 ? 1 : 0);

  const cEl = document.getElementById('step-counter');
  const compEl = document.getElementById('completion-counter');
  const track = document.getElementById('progress-track');
  const fill = document.getElementById('progress-fill');
  const ticksEl = document.getElementById('progress-ticks');
  const dots = document.getElementById('step-dots');
  const jump = document.getElementById('step-jump-select');
  const edKicker = document.getElementById('editorial-step-kicker');
  const edFrac = document.getElementById('editorial-step-fraction');

  if (cEl) cEl.textContent = t('stepOf', prefs.lang, { x: num, n: total });
  if (compEl) compEl.textContent = `${completedCount}/${total}`;
  if (edKicker) edKicker.textContent = `Chapter ${numStr} of ${totalStr}`;
  if (edFrac) edFrac.textContent = `${numStr} / ${totalStr}`;
  if (track) {
    track.setAttribute('aria-valuemax', String(total));
    track.setAttribute('aria-valuenow', String(num));
  }
  if (fill) fill.style.width = `${(num / total) * 100}%`;

  const localizedNames = DICTIONARY[prefs.lang]?.stepNames || DICTIONARY.en.stepNames;

  if (ticksEl) {
    ticksEl.innerHTML = steps
      .map((s, idx) => {
        const isCurrent = idx === currentStep;
        const isValid = idx < total - 1 ? Object.keys(s.validate(state)).length === 0 : currentStep === total - 1;
        const isDone = !isCurrent && idx <= highestStep && isValid;
        const isPassed = idx < currentStep;
        const cls = isCurrent
          ? 'progress-tick is-current'
          : isDone || isPassed
          ? 'progress-tick is-done'
          : 'progress-tick';
        const stepLabel = localizedNames[idx] || s.title;
        return `<button type="button" class="${cls}" data-jump-step="${idx}" title="${String(idx + 1).padStart(2, '0')} ${escapeHTML(stepLabel)}" aria-label="Go to step ${idx + 1}: ${escapeHTML(stepLabel)}"></button>`;
      })
      .join('');
  }

  if (jump) {
    jump.innerHTML = steps
      .map((s, idx) => `<option value="${idx}" ${idx === currentStep ? 'selected' : ''}>${String(idx + 1).padStart(2, '0')} ${escapeHTML(localizedNames[idx] || s.title)}</option>`)
      .join('');
  }

  if (dots) {
    dots.innerHTML = steps
      .map((s, idx) => {
        const isCurrent = idx === currentStep;
        const isValid = idx < total - 1 ? Object.keys(s.validate(state)).length === 0 : currentStep === total - 1;
        const isDone = !isCurrent && idx <= highestStep && isValid;
        const cls = isCurrent ? 'step-nav-item is-current' : isDone ? 'step-nav-item is-done' : 'step-nav-item';
        const stepCode = String(idx + 1).padStart(2, '0');
        const stepLabel = localizedNames[idx] || s.title;
        return `<button type="button" class="${cls}" data-jump-step="${idx}" ${isCurrent ? 'aria-current="step"' : ''}>
          <span class="step-nav-marker" aria-hidden="true"></span>
          <span class="step-nav-num">${stepCode}</span>
          <span class="step-nav-label">${escapeHTML(stepLabel)}</span>
          ${isDone ? '<span class="step-nav-check" aria-label="Completed">&#10003;</span>' : ''}
        </button>`;
      })
      .join('');
  }
}

function renderStep() {
  const step = steps[currentStep];
  const container = document.getElementById('step-content');
  if (!container || !step) return;

  const localizedNames = DICTIONARY[prefs.lang]?.stepNames || DICTIONARY.en.stepNames;
  const titleEl = document.getElementById('editorial-step-title');
  const hintEl = document.getElementById('editorial-step-hint');
  if (titleEl) titleEl.textContent = localizedNames[currentStep] || step.title;
  if (hintEl) hintEl.textContent = step.hint || step.label || '';

  container.innerHTML = renderStepBody(step);

  const backBtn = document.getElementById('btn-back');
  const nextBtn = document.getElementById('btn-next');
  const jumpReview = document.getElementById('btn-jump-review');
  const toolsBar = document.querySelector('.step-tools-bar');
  if (backBtn) backBtn.disabled = currentStep === 0;
  if (nextBtn) {
    nextBtn.hidden = currentStep === steps.length - 1;
    nextBtn.textContent = currentStep === steps.length - 2 ? t('reviewSite', prefs.lang) : t('next', prefs.lang);
  }
  if (jumpReview) jumpReview.hidden = !editingFromReview || currentStep === steps.length - 1;
  if (toolsBar) toolsBar.hidden = currentStep === steps.length - 1;

  renderProgress();
}

function renderAll() {
  renderStep();
  updatePreview();
  updateHistoryButtons();
  const projLabel = document.getElementById('active-project-label');
  if (projLabel) {
    projLabel.textContent = isDemoMode ? 'Northstar (Demo)' : getActiveProject().name.slice(0, 16);
  }
}

/* ==========================================================================
   7. Navigation & Validation
   ========================================================================== */

function validateCurrentStep() {
  const step = steps[currentStep];
  const err = step && typeof step.validate === 'function' ? step.validate(state) : {};
  currentErrors = err || {};
  return Object.keys(currentErrors).length === 0;
}

function focusFirstInvalid() {
  const el = document.querySelector('#step-content .is-invalid');
  if (el && typeof el.focus === 'function') el.focus();
}

function goNext() {
  if (!validateCurrentStep()) {
    renderStep();
    focusFirstInvalid();
    return;
  }
  currentErrors = {};
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    highestStep = Math.max(highestStep, currentStep);
    if (currentStep === steps.length - 1) {
      editingFromReview = false;
      publishSlugDraft = slugifyName(state.siteName);
    }
    syncActiveProjectAndSave();
    renderStep();
    const pane = document.getElementById('wizard-pane');
    if (pane) pane.scrollTop = 0;
  }
}

function goBack() {
  if (currentStep <= 0) return;
  currentErrors = {};
  currentStep -= 1;
  syncActiveProjectAndSave();
  renderStep();
}

function jumpToStep(targetIdx, { fromReview = false, bypassForwardCheck = false } = {}) {
  if (targetIdx < 0 || targetIdx >= steps.length || targetIdx === currentStep) return;
  if (targetIdx > currentStep && !bypassForwardCheck) {
    if (!validateCurrentStep()) {
      renderStep();
      focusFirstInvalid();
      return;
    }
  }
  currentErrors = {};
  currentStep = targetIdx;
  editingFromReview = fromReview ? true : targetIdx === steps.length - 1 ? false : editingFromReview;
  if (targetIdx === steps.length - 1) publishSlugDraft = slugifyName(state.siteName);
  highestStep = Math.max(highestStep, currentStep);
  syncActiveProjectAndSave();
  renderStep();
}

/* ==========================================================================
   8. Modals: 288 Template Gallery, 10 Presets, Multi-Projects, Published Library, Settings
   ========================================================================== */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

let confirmCb = null;
function openConfirm({ title, message, confirmLabel = 'Confirm', onConfirm }) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-ok-btn').textContent = confirmLabel;
  confirmCb = onConfirm;
  openModal('modal-confirm');
}

let promptCb = null;
function openPrompt({ title, label, initialValue = '', validate, onSubmit }) {
  document.getElementById('prompt-modal-title').textContent = title;
  document.getElementById('prompt-label').textContent = label;
  const inp = document.getElementById('prompt-input');
  const err = document.getElementById('prompt-error');
  inp.value = initialValue;
  err.textContent = '';
  promptCb = { validate, onSubmit };
  openModal('modal-prompt');
  inp.focus();
  inp.select();
}

const THEME_STYLE_ALIAS = {
  'golden-luxury': 'Paper',
  'charcoal-gold': 'Ink',
  'autumn-rust': 'Rust',
  'slate-gray': 'Slate',
  'mono-bw': 'Newsprint',
  'retro-yellow': 'Mustard',
  'forest-green': 'Forest',
  'ocean-blue': 'Harbor',
  'coffee-brown': 'Clay',
  'dark-pro': 'Night',
};

function renderTemplateThumbnailHtml(layoutId, themeObj, siteBrand = 'Studio') {
  const v = themeObj.vars;
  const monogram = escapeHTML((siteBrand || 'S').trim().charAt(0).toUpperCase() || 'S');
  const styleVars = `--m-bg:${v['--bg']};--m-surf:${v['--surface']};--m-card:${v['--card']};--m-text:${v['--text']};--m-muted:${v['--muted']};--m-pri:${v['--primary']};--m-acc:${v['--accent']};--m-bd:${v['--border']};`;

  if (layoutId === 'sidebar' || layoutId === 'left-nav-docs') {
    return `<div class="tpl-mini tpl-mini-sidebar" style="${styleVars}" aria-hidden="true">
      <div class="m-rail">
        <span class="m-dot-brand">${monogram}</span>
        <span class="m-rline is-pri"></span>
        <span class="m-rline"></span>
        <span class="m-rline"></span>
        <span class="m-rline short"></span>
      </div>
      <div class="m-main">
        <span class="m-kicker"></span>
        <span class="m-h1">${monogram}</span>
        <span class="m-rule"></span>
        <div class="m-pills-row"><span></span><span></span><span></span></div>
        <span class="m-subhead"></span>
        <span class="m-pline"></span>
        <span class="m-pline short"></span>
      </div>
    </div>`;
  }

  if (layoutId === 'minimal' || layoutId === 'centered-stack') {
    return `<div class="tpl-mini tpl-mini-minimal" style="${styleVars}" aria-hidden="true">
      <div class="m-top-nav is-center">
        <span class="m-dot-brand">${monogram}</span>
        <span class="m-nav-links"><i></i><i></i><i></i></span>
      </div>
      <div class="m-min-body">
        <span class="m-h1 is-min">${monogram}</span>
        <span class="m-pline is-center"></span>
        <span class="m-rule is-narrow"></span>
        <span class="m-pline short is-center"></span>
        <div class="m-min-rule-list">
          <span></span><span></span>
        </div>
      </div>
    </div>`;
  }

  if (layoutId === 'split-hero') {
    return `<div class="tpl-mini tpl-mini-split" style="${styleVars}" aria-hidden="true">
      <div class="m-split-left">
        <span class="m-dot-brand">${monogram}</span>
        <span class="m-h1">${monogram}</span>
        <span class="m-pline"></span>
        <span class="m-btn-mini"></span>
      </div>
      <div class="m-split-right">
        <div class="m-top-nav is-flush"><span class="m-nav-links"><i></i><i></i><i></i></span></div>
        <div class="m-split-card">
          <span class="m-subhead"></span>
          <span class="m-pline"></span>
          <div class="m-pills-row"><span></span><span></span></div>
        </div>
      </div>
    </div>`;
  }

  if (layoutId === 'magazine') {
    return `<div class="tpl-mini tpl-mini-magazine" style="${styleVars}" aria-hidden="true">
      <div class="m-mag-mast">
        <span class="m-dot-brand">${monogram}</span>
        <span class="m-mag-title">EDITION</span>
        <span class="m-nav-links"><i></i><i></i></span>
      </div>
      <div class="m-mag-cols">
        <div class="m-mag-lead">
          <span class="m-h1">${monogram}</span>
          <span class="m-pline"></span>
          <span class="m-pline short"></span>
        </div>
        <div class="m-mag-side">
          <span class="m-subhead"></span>
          <span class="m-pline"></span>
          <span class="m-rule"></span>
          <span class="m-subhead"></span>
          <span class="m-pline short"></span>
        </div>
      </div>
    </div>`;
  }

  if (layoutId === 'card-grid' || layoutId === 'masonry-gallery') {
    return `<div class="tpl-mini tpl-mini-cards" style="${styleVars}" aria-hidden="true">
      <div class="m-top-nav">
        <span class="m-dot-brand">${monogram}</span>
        <span class="m-nav-links"><i></i><i></i><i></i></span>
      </div>
      <div class="m-bento-hero">
        <span class="m-h1 is-sm">${monogram}</span>
        <span class="m-btn-mini"></span>
      </div>
      <div class="m-bento-grid">
        <span class="m-bento-tile"></span>
        <span class="m-bento-tile"></span>
        <span class="m-bento-tile is-acc"></span>
      </div>
    </div>`;
  }

  // Classic (and other top-nav layouts)
  return `<div class="tpl-mini tpl-mini-classic" style="${styleVars}" aria-hidden="true">
    <div class="m-top-nav">
      <span class="m-dot-brand">${monogram}</span>
      <span class="m-nav-links"><i></i><i></i><i></i></span>
    </div>
    <div class="m-classic-hero">
      <div class="m-classic-copy">
        <span class="m-h1">${monogram}</span>
        <span class="m-pline"></span>
        <span class="m-pline short"></span>
      </div>
      <span class="m-monogram-ghost">${monogram}</span>
    </div>
    <div class="m-rule-strip">
      <span></span><span></span><span></span>
    </div>
    <div class="m-classic-foot">
      <span class="m-subhead"></span>
      <span class="m-pline"></span>
    </div>
  </div>`;
}

function renderTemplateCardHtml({
  layoutId,
  themeId,
  title,
  subtitle = '',
  headingFont = '',
  bodyFont = '',
  featured = false,
  active = false,
  themeObj,
  siteBrand = 'Studio',
}) {
  const v = themeObj.vars;
  const fontAttrs = `${headingFont ? ` data-heading-font="${escapeHTML(headingFont)}"` : ''}${bodyFont ? ` data-body-font="${escapeHTML(bodyFont)}"` : ''}`;
  return `<button type="button" class="tpl-card${active ? ' is-selected' : ''}" data-apply-template="${escapeHTML(layoutId)}::${escapeHTML(themeId)}"${fontAttrs}>
    <div class="tpl-mini-stage">
      ${renderTemplateThumbnailHtml(layoutId, themeObj, siteBrand)}
      ${featured ? '<span class="tpl-featured-tag">Featured</span>' : ''}
      <span class="tpl-hover-cue">${active ? 'Active' : 'Preview & Apply'}</span>
    </div>
    <div class="tpl-card-foot">
      <div class="tpl-card-meta">
        <strong class="tpl-card-title">${escapeHTML(title)}</strong>
        ${subtitle ? `<span class="tpl-card-sub">${escapeHTML(subtitle)}</span>` : ''}
      </div>
      <div class="tpl-card-right">
        <span class="tpl-swatches" aria-hidden="true">
          <span style="background:${v['--bg']};"></span>
          <span style="background:${v['--text']};"></span>
          <span style="background:${v['--primary']};"></span>
        </span>
        ${active ? '<span class="tpl-selected-mark" aria-label="Selected">&#10003;</span>' : ''}
      </div>
    </div>
  </button>`;
}

function applyTemplateSelection({ layoutId, themeId, headingFont = '', bodyFont = '' }) {
  const th = themes[themeId];
  state.layout = layoutId;
  state.theme = themeId;
  state.useCustomColors = false;
  if (th) {
    state.customPrimary = th.vars['--primary'];
    state.customAccent = th.vars['--accent'];
    state.customBg = th.vars['--bg'];
    state.customText = th.vars['--text'];
  }
  if (headingFont) state.headingFont = headingFont;
  if (bodyFont) state.bodyFont = bodyFont;
  pushHistory(state);
  syncActiveProjectAndSave();
  renderAll();
  updatePreview(true);
}

function renderTemplateGallery() {
  const body = document.getElementById('gallery-body');
  if (!body) return;
  const q = (document.getElementById('gallery-search')?.value || '').trim().toLowerCase();
  const layoutFilter = document.getElementById('gallery-filter-layout')?.value || 'all';
  const themeFilter = document.getElementById('gallery-filter-theme')?.value || 'all';
  const toneFilter = document.getElementById('gallery-filter-tone')?.value || 'all';
  const isFiltered = Boolean(q || layoutFilter !== 'all' || themeFilter !== 'all' || toneFilter !== 'all');
  const siteBrand = (state.siteName || '').trim() || 'Studio Atelier';

  if (isFiltered) {
    const matches = TEMPLATES.filter((tpl) => {
      if (layoutFilter !== 'all' && tpl.layoutId !== layoutFilter) return false;
      if (themeFilter !== 'all' && tpl.themeId !== themeFilter) return false;
      if (toneFilter === 'light' && tpl.isDark) return false;
      if (toneFilter === 'dark' && !tpl.isDark) return false;
      if (q) {
        const alias = (THEME_STYLE_ALIAS[tpl.themeId] || '').toLowerCase();
        const hay = `${tpl.name} ${tpl.layoutName} ${tpl.themeName} ${alias}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (!matches.length) {
      body.innerHTML = '<div class="library-empty"><p>No templates match your filter.</p></div>';
      return;
    }

    body.innerHTML = `
      <p class="field-helper" style="margin:0 0 0.85rem;">Showing ${matches.length} of ${TEMPLATES.length} templates</p>
      <div class="tpl-gallery-grid">
        ${matches
          .map((tpl) => {
            const th = themes[tpl.themeId];
            const alias = THEME_STYLE_ALIAS[tpl.themeId];
            const active = state.layout === tpl.layoutId && state.theme === tpl.themeId && !state.useCustomColors;
            return renderTemplateCardHtml({
              layoutId: tpl.layoutId,
              themeId: tpl.themeId,
              title: alias ? `${tpl.layoutName} / ${alias}` : tpl.layoutName,
              subtitle: `${tpl.themeName} · ${tpl.isDark ? 'Dark' : 'Light'}`,
              active,
              themeObj: th,
              siteBrand,
            });
          })
          .join('')}
      </div>`;
    return;
  }

  // Unfiltered Editorial Gallery View: Featured Priority Strip -> 6 Ordered Categories -> Optional Full 288 Grid
  const featuredHtml = `
    <section class="gallery-section">
      <div class="gallery-section-head">
        <div>
          <span class="gallery-section-kicker">Curated Selection</span>
          <h3 class="gallery-section-title">Featured Templates</h3>
        </div>
        <span class="gallery-section-count">6 signature pairings</span>
      </div>
      <div class="tpl-gallery-grid">
        ${FEATURED_TEMPLATES.map((ft) => {
          const th = themes[ft.themeId] || THEME_LIST[0];
          const active = state.layout === ft.layoutId && state.theme === ft.themeId && !state.useCustomColors;
          return renderTemplateCardHtml({
            layoutId: ft.layoutId,
            themeId: ft.themeId,
            title: `${ft.layoutLabel} / ${ft.styleLabel}`,
            subtitle: ft.note,
            headingFont: ft.headingFont,
            bodyFont: ft.bodyFont,
            featured: true,
            active,
            themeObj: th,
            siteBrand,
          });
        }).join('')}
      </div>
    </section>`;

  const familiesHtml = GALLERY_FAMILIES.map((fam) => {
    const famLabel = fam.title.replace(/\s+Templates$/i, '');
    return `
      <section class="gallery-section">
        <div class="gallery-section-head">
          <div>
            <h3 class="gallery-section-title">${escapeHTML(fam.title)}</h3>
            <p class="gallery-section-sub">${escapeHTML(fam.subtitle)}</p>
          </div>
          <span class="gallery-section-count">${fam.variants.length} styles</span>
        </div>
        <div class="tpl-gallery-grid">
          ${fam.variants
            .map((v) => {
              const th = themes[v.themeId] || THEME_LIST[0];
              const active = state.layout === fam.id && state.theme === v.themeId && !state.useCustomColors;
              return renderTemplateCardHtml({
                layoutId: fam.id,
                themeId: v.themeId,
                title: `${famLabel} / ${v.styleLabel}`,
                subtitle: th.name,
                headingFont: v.headingFont,
                bodyFont: v.bodyFont,
                featured: Boolean(v.featured),
                active,
                themeObj: th,
                siteBrand,
              });
            })
            .join('')}
        </div>
      </section>`;
  }).join('');

  const all288Html = `
    <section class="gallery-section gallery-all-section">
      <div class="gallery-section-head">
        <div>
          <h3 class="gallery-section-title">Complete Catalog (${TEMPLATES.length} Combinations)</h3>
          <p class="gallery-section-sub">Every combination of all 12 page layouts and 24 colour themes, or use the filters above.</p>
        </div>
        <button type="button" id="btn-gallery-toggle-all" class="btn btn-secondary btn-sm">
          ${galleryShowAll288 ? 'Hide Full 288 Catalog' : `Browse All ${TEMPLATES.length} Templates`}
        </button>
      </div>
      ${
        galleryShowAll288
          ? `<div class="tpl-gallery-grid">
              ${TEMPLATES.map((tpl) => {
                const th = themes[tpl.themeId];
                const active = state.layout === tpl.layoutId && state.theme === tpl.themeId && !state.useCustomColors;
                return renderTemplateCardHtml({
                  layoutId: tpl.layoutId,
                  themeId: tpl.themeId,
                  title: `${tpl.layoutName} / ${THEME_STYLE_ALIAS[tpl.themeId] || tpl.themeName}`,
                  subtitle: `${tpl.themeName} · ${tpl.isDark ? 'Dark' : 'Light'}`,
                  active,
                  themeObj: th,
                  siteBrand,
                });
              }).join('')}
            </div>`
          : ''
      }
    </section>`;

  body.innerHTML = featuredHtml + familiesHtml + all288Html;
}

function openGalleryModal() {
  const lf = document.getElementById('gallery-filter-layout');
  const tf = document.getElementById('gallery-filter-theme');
  if (lf && !lf.options.length) {
    lf.innerHTML = `<option value="all">All 12 Layouts</option>${LAYOUT_LIST.map((l) => `<option value="${l.id}">${escapeHTML(l.name)}</option>`).join('')}`;
  }
  if (tf && !tf.options.length) {
    tf.innerHTML = `<option value="all">All 24 Themes</option>${THEME_LIST.map((th) => `<option value="${th.id}">${escapeHTML(th.name)}</option>`).join('')}`;
  }
  renderTemplateGallery();
  openModal('modal-gallery');
}

function openPresetsModal() {
  const body = document.getElementById('presets-body');
  body.innerHTML = `<div class="presets-grid">${STARTER_PRESETS.map(
    (p) => `<div class="preset-card">
      <span class="mono-label">${escapeHTML(p.category)}</span>
      <h3>${escapeHTML(p.name)}</h3>
      <p>${escapeHTML(p.description)}</p>
      <button type="button" class="btn btn-primary btn-sm" data-apply-preset="${p.id}">Use Starter Preset</button>
    </div>`
  ).join('')}</div>`;
  openModal('modal-presets');
}

function renderProjectsModal() {
  const listEl = document.getElementById('projects-list');
  listEl.innerHTML = workspace.projects
    .map((p) => {
      const isAct = p.id === workspace.activeId;
      const dateStr = new Date(p.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      return `<div class="library-item${isAct ? ' is-active' : ''}">
        <div>
          <div class="library-item-title">${escapeHTML(p.name)} ${isAct ? '(Active)' : ''}</div>
          <div class="library-item-meta">${escapeHTML(p.state.siteName || 'Unnamed site')} · Step ${p.currentStep + 1}/12 · ${escapeHTML(dateStr)}</div>
        </div>
        <div class="library-item-actions">
          ${!isAct ? `<button type="button" class="btn btn-primary btn-sm" data-proj-switch="${p.id}">Open</button>` : ''}
          <button type="button" class="btn btn-secondary btn-sm" data-proj-rename="${p.id}">Rename</button>
          <button type="button" class="btn btn-secondary btn-sm" data-proj-dup="${p.id}">Duplicate</button>
          <button type="button" class="btn btn-ghost btn-sm" data-proj-del="${p.id}" ${workspace.projects.length <= 1 ? 'disabled' : ''}>Delete</button>
        </div>
      </div>`;
    })
    .join('');
}

async function openLibraryModal() {
  while (libraryBlobUrls.length) URL.revokeObjectURL(libraryBlobUrls.pop());
  const listEl = document.getElementById('library-list');
  listEl.innerHTML = '<p class="modal-copy">Loading published sites…</p>';
  openModal('modal-library');

  try {
    const sites = await dbGetAll();
    await refreshLibraryCount();
    if (!sites.length) {
      listEl.innerHTML = '<div class="library-empty"><h3>No published sites yet</h3><p>Go to Step 12 and click Publish to save sites offline in IndexedDB.</p></div>';
      return;
    }

    listEl.innerHTML = `<div class="library-grid">${sites
      .map((s) => {
        const blobUrl = URL.createObjectURL(new Blob([s.html], { type: 'text/html;charset=utf-8' }));
        libraryBlobUrls.push(blobUrl);
        const kb = Math.max(1, Math.round((s.sizeBytes || s.html.length) / 1024));
        const dt = new Date(s.updatedAt || s.publishedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        return `<div class="library-item">
          <div>
            <div class="library-item-title">${escapeHTML(s.siteName)}</div>
            <div class="library-item-meta">${escapeHTML(s.slug)} · ${kb} KB · ${escapeHTML(dt)}</div>
          </div>
          <div class="library-item-actions">
            <a class="btn btn-primary btn-sm" href="${blobUrl}" target="_blank" rel="noopener noreferrer">Open</a>
            <button type="button" class="btn btn-secondary btn-sm" data-lib-dl="${escapeHTML(s.slug)}">Download</button>
            <button type="button" class="btn btn-secondary btn-sm" data-lib-rename="${escapeHTML(s.slug)}">Rename</button>
            <button type="button" class="btn btn-secondary btn-sm" data-lib-dup="${escapeHTML(s.slug)}">Duplicate</button>
            <button type="button" class="btn btn-ghost btn-sm" data-lib-del="${escapeHTML(s.slug)}">Delete</button>
          </div>
        </div>`;
      })
      .join('')}</div>`;
  } catch {
    listEl.innerHTML = '<p class="field-error">Unable to access IndexedDB.</p>';
  }
}

async function openSettingsModal() {
  const body = document.getElementById('settings-body');
  const storageHtml = await renderStorageDataSectionHtml();
  body.innerHTML = `
    <div class="step-content">
      <div class="field-group">
        <span class="field-label">App Theme</span>
        <div class="choice-pills">
          <button type="button" class="choice-pill${prefs.theme === 'light' ? ' is-selected' : ''}" data-pref-theme="light">Light Mode</button>
          <button type="button" class="choice-pill${prefs.theme === 'dark' ? ' is-selected' : ''}" data-pref-theme="dark">Dark Mode</button>
        </div>
      </div>
      <div class="field-group">
        <span class="field-label">App Accent Colour</span>
        <div class="choice-pills">
          ${APP_ACCENTS.map(
            (a) => `<button type="button" class="choice-pill${prefs.accent === a.id ? ' is-selected' : ''}" data-pref-accent="${a.id}"><span class="swatch-dot" style="width:12px;height:12px;background:${a.hex};"></span> ${escapeHTML(a.name)}</button>`
          ).join('')}
        </div>
      </div>
      <div class="field-group">
        <span class="field-label">UI Density</span>
        <div class="choice-pills">
          <button type="button" class="choice-pill${prefs.density === 'comfortable' ? ' is-selected' : ''}" data-pref-density="comfortable">Comfortable</button>
          <button type="button" class="choice-pill${prefs.density === 'compact' ? ' is-selected' : ''}" data-pref-density="compact">Compact</button>
        </div>
      </div>
      <div class="field-group">
        <span class="field-label">App Interface Language</span>
        <div class="choice-pills">
          ${APP_LANGUAGES.map(
            (l) => `<button type="button" class="choice-pill${prefs.lang === l.code ? ' is-selected' : ''}" data-pref-lang="${l.code}">${escapeHTML(l.name)} (${escapeHTML(l.nativeName)})</button>`
          ).join('')}
        </div>
      </div>
      ${storageHtml}
    </div>`;
  openModal('modal-settings');
}

function showToast(message, variant = 'default') {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast${variant !== 'default' ? ` is-${variant}` : ''}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

/* ==========================================================================
   9. Offline-First PWA Registration, Status Badge & Install Button
   ========================================================================== */

function updateConnectivityBadge() {
  const badge = document.getElementById('connectivity-badge');
  if (!badge) return;
  const online = navigator.onLine;
  badge.textContent = online ? t('online', prefs.lang) : t('offlineReady', prefs.lang);
  badge.classList.toggle('is-offline', !online);
}

function showOfflineReadyToastOnce() {
  try {
    if (localStorage.getItem(OFFLINE_TOAST_KEY)) return;
    localStorage.setItem(OFFLINE_TOAST_KEY, '1');
  } catch {}
  showToast(t('readyOfflineToast', prefs.lang), 'success');
}

let deferredInstallPrompt = null;

function initPwa() {
  updateConnectivityBadge();
  window.addEventListener('online', () => {
    updateConnectivityBadge();
    showToast('Back online');
  });
  window.addEventListener('offline', () => {
    updateConnectivityBadge();
    showToast('Offline ready — SiteForge works completely offline');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'SITEFORGE_OFFLINE_READY') {
        showOfflineReadyToastOnce();
      }
    });

    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        if (reg.waiting) {
          waitingSwRegistration = reg;
          const b = document.getElementById('banner-sw-update');
          if (b) b.hidden = false;
        }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              waitingSwRegistration = reg;
              const b = document.getElementById('banner-sw-update');
              if (b) b.hidden = false;
            } else if (nw.state === 'activated') {
              showOfflineReadyToastOnce();
            }
          });
        });
        if (reg.active) {
          showOfflineReadyToastOnce();
        }
      })
      .catch(() => {});

    let swReloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swReloading) return;
      swReloading = true;
      window.location.reload();
    });
  }

  const installBtn = document.getElementById('btn-install-app');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isStandalone && isIOS && installBtn) installBtn.hidden = false;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn && !isStandalone) installBtn.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installBtn) installBtn.hidden = true;
    showToast('SiteForge installed for offline use', 'success');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          deferredInstallPrompt = null;
          installBtn.hidden = true;
        }
      } else if (isIOS) {
        openModal('modal-ios-install');
      }
    });
  }
}

/* ==========================================================================
   10. Event Wiring (Live Typing, Drag & Drop, Uploads, Modals, Shortcuts)
   ========================================================================== */

function bindEvents() {
  const stepContent = document.getElementById('step-content');

  // Populate preview device dropdown & segmented Desktop / Tablet / Mobile buttons
  const devSelect = document.getElementById('preview-device-select');
  devSelect.innerHTML = PREVIEW_DEVICES.map(
    (d) => `<option value="${d.id}" ${d.id === previewDeviceId ? 'selected' : ''}>${escapeHTML(d.name)}${d.width ? ` (${d.width}px)` : ''}</option>`
  ).join('');
  devSelect.addEventListener('change', () => {
    previewDeviceId = devSelect.value;
    applyPreviewViewport();
  });

  const presetMap = { desktop: 'full', tablet: 'tablet', mobile: 'mobile-m' };
  document.querySelectorAll('[data-preview-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = presetMap[btn.getAttribute('data-preview-preset')] || 'full';
      previewDeviceId = targetId;
      previewRotated = false;
      const rotBtn = document.getElementById('btn-preview-rotate');
      if (rotBtn) rotBtn.setAttribute('aria-pressed', 'false');
      if (devSelect) devSelect.value = targetId;
      applyPreviewViewport();
    });
  });

  document.getElementById('btn-preview-rotate').addEventListener('click', (e) => {
    previewRotated = !previewRotated;
    e.currentTarget.setAttribute('aria-pressed', previewRotated ? 'true' : 'false');
    applyPreviewViewport();
  });

  document.getElementById('preview-zoom-select').addEventListener('change', (e) => {
    previewZoom = Number(e.target.value) || 100;
    applyPreviewViewport();
  });

  document.getElementById('btn-preview-mode').addEventListener('click', () => {
    previewForcedMode = previewForcedMode === 'dark' ? 'light' : previewForcedMode === 'light' ? null : 'dark';
    showToast(previewForcedMode ? `Preview forced: ${previewForcedMode}` : 'Preview mode: theme default');
    updatePreview();
  });

  // Form submit & navigation
  document.getElementById('wizard-form').addEventListener('submit', (e) => {
    e.preventDefault();
    goNext();
  });
  document.getElementById('btn-back').addEventListener('click', goBack);
  document.getElementById('btn-jump-review').addEventListener('click', () => jumpToStep(steps.length - 1));

  document.getElementById('step-jump-select').addEventListener('change', (e) => {
    jumpToStep(Number(e.target.value), { bypassForwardCheck: true });
  });

  document.getElementById('step-dots').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-jump-step]');
    if (btn) jumpToStep(Number(btn.getAttribute('data-jump-step')), { bypassForwardCheck: true });
  });

  const progressTicksEl = document.getElementById('progress-ticks');
  if (progressTicksEl) {
    progressTicksEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-jump-step]');
      if (btn) jumpToStep(Number(btn.getAttribute('data-jump-step')), { bypassForwardCheck: true });
    });
  }

  // Per-step Surprise Me & Reset Step
  document.getElementById('btn-surprise-step').addEventListener('click', () => {
    const step = steps[currentStep];
    if (step?.surprise) {
      step.surprise(state);
      currentErrors = {};
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      showToast(`Randomized ${step.title}`);
    }
  });

  document.getElementById('btn-reset-step').addEventListener('click', () => {
    const step = steps[currentStep];
    if (step?.reset) {
      step.reset(state);
      currentErrors = {};
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      showToast(`Reset ${step.title}`);
    }
  });

  // Global Surprise Me (randomize entire site)
  document.getElementById('btn-surprise-all').addEventListener('click', () => {
    for (const s of steps) {
      if (s.surprise) s.surprise(state);
    }
    currentErrors = {};
    pushHistory(state);
    syncActiveProjectAndSave();
    renderAll();
    showToast('Randomized entire website!', 'success');
  });

  // Live typing & input delegation inside stepContent (preserves focus!)
  stepContent.addEventListener('input', (e) => {
    const el = e.target;

    if (el.id === 'sitetype-search') {
      siteTypeSearch = el.value;
      renderStep();
      const restored = document.getElementById('sitetype-search');
      if (restored) {
        restored.focus();
        restored.setSelectionRange(restored.value.length, restored.value.length);
      }
      return;
    }

    if (el.id === 'input-publish-slug') {
      publishSlugDraft = el.value;
      publishError = '';
      el.classList.remove('is-invalid');
      const errEl = document.getElementById('err-publish-slug');
      if (errEl) errEl.textContent = '';
      return;
    }

    const bindKey = el.getAttribute('data-bind');
    if (bindKey) {
      state[bindKey] = el.value;
      el.classList.remove('is-invalid');
      const errEl = document.getElementById(`err-${bindKey}`);
      if (errEl) errEl.textContent = '';
      const cnt = stepContent.querySelector(`[data-count="${bindKey}"]`);
      if (cnt) cnt.textContent = `${el.value.length}/${el.getAttribute('maxlength') || ''}`;
      if (bindKey === 'metaDescription') {
        const dCnt = stepContent.querySelector('[data-count-desc]');
        if (dCnt) {
          const len = el.value.length;
          const cls = len >= 120 && len <= 160 ? 'is-good' : len >= 60 && len <= 180 ? 'is-warn' : 'is-bad';
          const lbl = len >= 120 && len <= 160 ? 'Ideal' : len === 0 ? 'Missing' : len < 120 ? 'Short' : 'Too long';
          dCnt.className = `char-count ${cls}`;
          dCnt.textContent = `${len}/160 · ${lbl}`;
        }
      }
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    const numKey = el.getAttribute('data-bind-num');
    if (numKey) {
      state[numKey] = Number(el.value);
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    // Menu item inputs
    const mIdx = el.getAttribute('data-menu-idx');
    if (mIdx !== null) {
      const idx = Number(mIdx);
      const fld = el.getAttribute('data-menu-field');
      state.menuItems[idx][fld] = el.value;
      el.classList.remove('is-invalid');
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    // Generic array-of-objects inputs (services, highlights, stats, testimonials, pricing, faq, team, gallery, timeline)
    const arrKey = el.getAttribute('data-arr-key');
    if (arrKey) {
      const idx = Number(el.getAttribute('data-arr-idx'));
      const sub = el.getAttribute('data-arr-sub');
      if (state[arrKey]?.[idx]) {
        state[arrKey][idx][sub] = sub === 'rating' ? Number(el.value) : el.value;
        el.classList.remove('is-invalid');
        scheduleTypingHistory();
        syncActiveProjectAndSave();
        updatePreview();
      }
      return;
    }

    // Section heading / subheading
    const secMeta = el.getAttribute('data-sec-meta');
    if (secMeta) {
      const fld = el.getAttribute('data-sec-field');
      if (state.sections?.[secMeta]) {
        state.sections[secMeta][fld] = el.value;
        scheduleTypingHistory();
        syncActiveProjectAndSave();
        updatePreview();
      }
      return;
    }

    // Social platform URLs
    const socPlat = el.getAttribute('data-social-platform');
    if (socPlat) {
      if (!state.socialLinks) state.socialLinks = {};
      state.socialLinks[socPlat] = el.value;
      el.classList.remove('is-invalid');
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    // Footer link group titles & links
    const fgrpTitle = el.getAttribute('data-fgrp-title');
    if (fgrpTitle !== null) {
      state.footerLinkGroups[Number(fgrpTitle)].title = el.value;
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }
    const fgrpLink = el.getAttribute('data-fgrp-link');
    if (fgrpLink) {
      const [gi, li, fld] = fgrpLink.split(':');
      state.footerLinkGroups[Number(gi)].links[Number(li)][fld] = el.value;
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    if (el.getAttribute('data-partners-csv')) {
      state.partners = el.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
      return;
    }

    // Bilingual translations inputs
    const trField = el.getAttribute('data-tr-field');
    if (trField) {
      if (!state.translations || typeof state.translations !== 'object') state.translations = {};
      const langCode = state.secondLanguage || 'hi';
      if (!state.translations[langCode]) state.translations[langCode] = {};
      state.translations[langCode][trField] = el.value;
      scheduleTypingHistory();
      syncActiveProjectAndSave();
      updatePreview();
    }
  });

  // Change delegation (checkboxes, selects, image uploads)
  stepContent.addEventListener('change', async (e) => {
    const el = e.target;

    const chkKey = el.getAttribute('data-bind-check');
    if (chkKey) {
      state[chkKey] = el.checked;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const legalKey = el.getAttribute('data-legal-page');
    if (legalKey) {
      if (!state.legalPages) state.legalPages = {};
      state.legalPages[legalKey] = el.checked;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const launchKey = el.getAttribute('data-launch-check');
    if (launchKey) {
      if (!state.launchChecklist) state.launchChecklist = {};
      state.launchChecklist[launchKey] = el.checked;
      syncActiveProjectAndSave();
      renderStep();
      return;
    }

    const arrChk = el.getAttribute('data-arr-check');
    if (arrChk) {
      const idx = Number(el.getAttribute('data-arr-idx'));
      const sub = el.getAttribute('data-arr-sub');
      state[arrChk][idx][sub] = el.checked;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    if (el.getAttribute('data-menu-field') === 'type') {
      const idx = Number(el.getAttribute('data-menu-idx'));
      state.menuItems[idx].type = el.value;
      state.menuItems[idx].target = el.value === 'external' ? '' : '#about';
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    if (el.getAttribute('data-menu-field') === 'pageType') {
      const idx = Number(el.getAttribute('data-menu-idx'));
      state.menuItems[idx].pageType = el.value;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const toggleSec = el.getAttribute('data-toggle-section');
    if (toggleSec) {
      state.sections[toggleSec].enabled = el.checked;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    // Standard single image upload slot (Phase A4: up to 10 MB -> auto-compressed <= 500 KB -> IndexedDB Blob)
    const uploadSlot = el.getAttribute('data-upload-slot');
    if (uploadSlot && el.files?.[0]) {
      const res = await ingestAndOptimizeUpload(el.files[0]);
      el.value = '';
      if (!res.ok) {
        inlineUploadErrors[uploadSlot] = res.error;
        renderStep();
        showToast(res.error, 'error');
        return;
      }
      inlineUploadErrors[uploadSlot] = '';
      if (res.blob) {
        const saved = await saveImageBlob(res.blob, {
          width: res.width,
          height: res.height,
          fileName: res.fileName,
        });
        state[uploadSlot] = saved.ref;
      } else {
        state[uploadSlot] = res.dataUrl;
      }
      if (!state.imageMeta) state.imageMeta = {};
      if (res.width && res.height) {
        state.imageMeta[uploadSlot] = { width: res.width, height: res.height, focalX: 50, focalY: 50 };
      }
      if (uploadSlot === 'logoDataUrl') state.logoFileName = res.fileName;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      const kb = Math.max(1, Math.round((res.bytes || 0) / 1024));
      showToast(`Image optimized & saved (${kb} KB)`, 'success');
      return;
    }

    // Array item image upload (services, team)
    const uploadArr = el.getAttribute('data-upload-array');
    if (uploadArr && el.files?.[0]) {
      const idx = Number(el.getAttribute('data-arr-idx'));
      const sub = el.getAttribute('data-arr-sub');
      const res = await ingestAndOptimizeUpload(el.files[0]);
      el.value = '';
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      if (res.blob) {
        const saved = await saveImageBlob(res.blob, { width: res.width, height: res.height, fileName: res.fileName });
        state[uploadArr][idx][sub] = saved.ref;
      } else {
        state[uploadArr][idx][sub] = res.dataUrl;
      }
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      showToast('Image optimized & uploaded', 'success');
      return;
    }

    // Gallery image add upload
    if (el.id === 'upload-gallery-add' && el.files?.[0]) {
      const res = await ingestAndOptimizeUpload(el.files[0]);
      el.value = '';
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      if (state.galleryItems.length < 12) {
        let imgVal = res.dataUrl;
        if (res.blob) {
          const saved = await saveImageBlob(res.blob, { width: res.width, height: res.height, fileName: res.fileName });
          imgVal = saved.ref;
        }
        state.galleryItems.push({
          image: imgVal,
          caption: res.fileName.replace(/\.[^.]+$/, ''),
          alt: res.fileName.replace(/\.[^.]+$/, ''),
          width: res.width || 0,
          height: res.height || 0,
        });
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        showToast('Added optimized image to gallery', 'success');
      }
    }
  });

  // Click delegation inside stepContent
  stepContent.addEventListener('click', (e) => {
    const tplCard = e.target.closest('[data-apply-template]');
    if (tplCard) {
      const [layoutId, themeId] = tplCard.getAttribute('data-apply-template').split('::');
      applyTemplateSelection({
        layoutId,
        themeId,
        headingFont: tplCard.getAttribute('data-heading-font') || '',
        bodyFont: tplCard.getAttribute('data-body-font') || '',
      });
      showToast('Template applied', 'success');
      return;
    }

    const setBtn = e.target.closest('[data-set-field]');
    if (setBtn) {
      const k = setBtn.getAttribute('data-set-field');
      let v = setBtn.getAttribute('data-set-value');
      if (k === 'servicesColumns') v = Number(v);
      state[k] = v;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const typeBtn = e.target.closest('[data-pick-sitetype]');
    if (typeBtn) {
      applySiteTypeDefaults(state, typeBtn.getAttribute('data-pick-sitetype'), false);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const themeBtn = e.target.closest('[data-pick-theme]');
    if (themeBtn) {
      const tid = themeBtn.getAttribute('data-pick-theme');
      const th = themes[tid];
      state.theme = tid;
      if (th) {
        state.customPrimary = th.vars['--primary'];
        state.customAccent = th.vars['--accent'];
        state.customBg = th.vars['--bg'];
        state.customText = th.vars['--text'];
      }
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    if (e.target.closest('#btn-reset-custom-colors')) {
      const th = themes[state.theme] || THEME_LIST[0];
      state.useCustomColors = false;
      state.customPrimary = th.vars['--primary'];
      state.customAccent = th.vars['--accent'];
      state.customBg = th.vars['--bg'];
      state.customText = th.vars['--text'];
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      showToast('Reset colours to theme defaults');
      return;
    }

    if (e.target.closest('#btn-open-gallery-inline')) {
      openGalleryModal();
      return;
    }

    if (e.target.closest('#btn-open-brand-studio')) {
      openBrandStudioModal(state, openModal);
      return;
    }

    const openImgBtn = e.target.closest('[data-open-img-studio]');
    if (openImgBtn) {
      const slotKey = openImgBtn.getAttribute('data-open-img-studio');
      const altKey = openImgBtn.getAttribute('data-alt-key') || '';
      openImageStudioModal({
        slotKey,
        currentVal: state[slotKey],
        altKey,
        altValue: altKey ? state[altKey] || '' : '',
        meta: state.imageMeta?.[slotKey],
        openModal,
        showToast,
        onApply: async ({ ref, width, height, focalX, focalY, altValue }) => {
          state[slotKey] = ref;
          if (!state.imageMeta) state.imageMeta = {};
          state.imageMeta[slotKey] = { width, height, focalX, focalY };
          if (altKey) state[altKey] = altValue;
          pushHistory(state);
          syncActiveProjectAndSave();
          renderAll();
        },
      });
      return;
    }

    // Menu quick-add chips, add, remove, move
    const quickChip = e.target.closest('[data-quick-menu-label]');
    if (quickChip) {
      if (state.menuItems.length >= 8) return;
      state.menuItems.push({
        label: quickChip.getAttribute('data-quick-menu-label'),
        type: 'section',
        target: quickChip.getAttribute('data-quick-menu-target'),
      });
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    if (e.target.closest('#btn-menu-add')) {
      if (state.menuItems.length >= 8) return;
      state.menuItems.push({ label: 'New Link', type: 'section', target: '#about' });
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const menuRem = e.target.closest('[data-menu-remove]');
    if (menuRem) {
      if (state.menuItems.length <= 1) return;
      state.menuItems.splice(Number(menuRem.getAttribute('data-menu-remove')), 1);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const menuMove = e.target.closest('[data-menu-move]');
    if (menuMove) {
      const idx = Number(menuMove.getAttribute('data-menu-move'));
      const dir = Number(menuMove.getAttribute('data-dir'));
      const to = idx + dir;
      if (to >= 0 && to < state.menuItems.length) {
        [state.menuItems[idx], state.menuItems[to]] = [state.menuItems[to], state.menuItems[idx]];
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    // Simple Bold/Italic formatting helper for About textarea
    const fmtBtn = e.target.closest('[data-format-about]');
    if (fmtBtn) {
      const ta = document.getElementById('f-about');
      if (ta) {
        const mode = fmtBtn.getAttribute('data-format-about');
        const wrap = mode === 'bold' ? '**' : '*';
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const sel = ta.value.slice(start, end) || (mode === 'bold' ? 'bold text' : 'italic text');
        state.about = ta.value.slice(0, start) + wrap + sel + wrap + ta.value.slice(end);
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    // Clear image slot
    const clearSlot = e.target.closest('[data-clear-slot]');
    if (clearSlot) {
      const k = clearSlot.getAttribute('data-clear-slot');
      state[k] = '';
      if (k === 'logoDataUrl') state.logoFileName = '';
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const clearArrImg = e.target.closest('[data-clear-array-img]');
    if (clearArrImg) {
      const k = clearArrImg.getAttribute('data-clear-array-img');
      const idx = Number(clearArrImg.getAttribute('data-arr-idx'));
      const sub = clearArrImg.getAttribute('data-arr-sub');
      state[k][idx][sub] = '';
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    // Icon picker toggle & selection
    const toggleIp = e.target.closest('[data-toggle-icon-picker]');
    if (toggleIp) {
      const idx = Number(toggleIp.getAttribute('data-toggle-icon-picker'));
      openIconPickerIndex = openIconPickerIndex === idx ? -1 : idx;
      renderStep();
      return;
    }

    const pickIcon = e.target.closest('[data-pick-srv-icon]');
    if (pickIcon) {
      const idx = Number(pickIcon.getAttribute('data-pick-srv-icon'));
      state.services[idx].icon = pickIcon.getAttribute('data-icon-id');
      openIconPickerIndex = -1;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    // Generic array Add / Remove / Move
    const arrAdd = e.target.closest('[data-arr-add]');
    if (arrAdd) {
      const k = arrAdd.getAttribute('data-arr-add');
      const templatesByKey = {
        aboutHighlights: () => ({ icon: 'check', text: '' }),
        aboutStats: () => ({ number: '100+', label: 'Metric' }),
        services: () => ({ title: '', description: '', icon: 'sparkles', image: '', imageAlt: '', price: '', link: '', buttonLabel: '' }),
        projects: () => ({ title: '', category: 'Featured', description: '', link: '' }),
        features: () => ({ icon: 'bolt', title: '', description: '' }),
        testimonials: () => ({ name: '', role: '', quote: '', rating: 5 }),
        pricingPlans: () => ({ name: 'Plan', price: '$99', period: '/mo', features: 'Feature one\nFeature two', ctaText: 'Select', ctaLink: '#contact', highlighted: false }),
        faqItems: () => ({ question: '', answer: '' }),
        teamMembers: () => ({ name: '', role: '', photo: '' }),
        timelineItems: () => ({ step: String(state.timelineItems.length + 1).padStart(2, '0'), title: '', description: '' }),
        footerPages: () => ({ title: `Extra Page ${(state.footerPages || []).length + 1}`, slug: `page-${(state.footerPages || []).length + 1}`, body: '' }),
        blogPosts: () => ({
          id: `post-${Date.now()}`,
          title: `New Article ${(state.blogPosts || []).length + 1}`,
          slug: `article-${(state.blogPosts || []).length + 1}`,
          date: new Date().toISOString().slice(0, 10),
          excerpt: 'A short summary of your post.',
          body: 'Write your full post content here.',
        }),
      };
      if (templatesByKey[k]) {
        if (!Array.isArray(state[k])) state[k] = [];
        state[k].push(templatesByKey[k]());
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    const arrRem = e.target.closest('[data-arr-remove]');
    if (arrRem) {
      const k = arrRem.getAttribute('data-arr-remove');
      const idx = Number(arrRem.getAttribute('data-idx'));
      state[k].splice(idx, 1);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    const arrMove = e.target.closest('[data-arr-move]');
    if (arrMove) {
      const k = arrMove.getAttribute('data-arr-move');
      const idx = Number(arrMove.getAttribute('data-idx'));
      const to = idx + Number(arrMove.getAttribute('data-dir'));
      if (to >= 0 && to < state[k].length) {
        [state[k][idx], state[k][to]] = [state[k][to], state[k][idx]];
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    // Section reorder buttons
    const secMove = e.target.closest('[data-sec-move]');
    if (secMove) {
      const idx = Number(secMove.getAttribute('data-sec-move'));
      const to = idx + Number(secMove.getAttribute('data-dir'));
      if (to >= 0 && to < state.sectionOrder.length) {
        [state.sectionOrder[idx], state.sectionOrder[to]] = [state.sectionOrder[to], state.sectionOrder[idx]];
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    // Contact form field chips
    const cField = e.target.closest('[data-toggle-contact-field]');
    if (cField) {
      const fid = cField.getAttribute('data-toggle-contact-field');
      const set = new Set(state.contactFormFields || []);
      if (set.has(fid)) set.delete(fid);
      else set.add(fid);
      state.contactFormFields = Array.from(set);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }

    // Footer link groups
    if (e.target.closest('#btn-fgrp-add')) {
      if (state.footerLinkGroups.length < 3) {
        state.footerLinkGroups.push({ title: 'Links', links: [{ label: 'Home', url: '#top' }] });
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }
    const fgrpRem = e.target.closest('[data-fgrp-remove]');
    if (fgrpRem) {
      state.footerLinkGroups.splice(Number(fgrpRem.getAttribute('data-fgrp-remove')), 1);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      return;
    }
    const fgrpAddLink = e.target.closest('[data-fgrp-add-link]');
    if (fgrpAddLink) {
      const gi = Number(fgrpAddLink.getAttribute('data-fgrp-add-link'));
      if (state.footerLinkGroups[gi].links.length < 5) {
        state.footerLinkGroups[gi].links.push({ label: '', url: '#top' });
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
      }
      return;
    }

    // Review & Export step buttons
    const editBtn = e.target.closest('[data-edit-step]');
    if (editBtn) {
      jumpToStep(Number(editBtn.getAttribute('data-edit-step')), { fromReview: true, bypassForwardCheck: true });
      return;
    }
    if (e.target.closest('#btn-autofix-contrast')) {
      const fixed = autoFixStateContrast(state);
      state = fixed;
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      showToast('Contrast automatically adjusted to ≥ 4.5:1 (WCAG AA)', 'success');
      return;
    }
    if (e.target.closest('#btn-download-html')) return downloadHtml();
    if (e.target.closest('#btn-download-zip')) return downloadZip();
    if (e.target.closest('#btn-save-folder')) return exportSiteToFolder(state, showToast);
    if (e.target.closest('#btn-open-golive')) return openGoLiveModal(state, openModal);
    if (e.target.closest('#btn-open-siteforge-review')) return document.getElementById('open-siteforge-input').click();
    if (e.target.closest('#btn-copy-html')) return copyHtmlToClipboard();
    if (e.target.closest('#btn-print-pdf')) return printGeneratedSitePdf();
    if (e.target.closest('#btn-export-json')) return exportProjectJson();
    if (e.target.closest('#btn-import-json')) return document.getElementById('import-json-input').click();
    if (e.target.closest('#btn-open-library-inline')) return openLibraryModal();
    if (e.target.closest('#btn-publish-local')) {
      const inp = document.getElementById('input-publish-slug');
      publishLocally(inp ? inp.value : publishSlugDraft);
    }
  });

  // Drag-and-drop reordering for Menu items and Page Sections
  stepContent.addEventListener('dragstart', (e) => {
    const row = e.target.closest('[data-drag-kind]');
    if (!row) return;
    dragKind = row.getAttribute('data-drag-kind');
    dragFromIdx = Number(row.getAttribute('data-drag-idx'));
    row.classList.add('is-dragging');
  });
  stepContent.addEventListener('dragover', (e) => {
    if (dragKind) e.preventDefault();
  });
  stepContent.addEventListener('drop', (e) => {
    const row = e.target.closest('[data-drag-kind]');
    if (!row || !dragKind) return;
    e.preventDefault();
    const kind = row.getAttribute('data-drag-kind');
    const toIdx = Number(row.getAttribute('data-drag-idx'));
    if (kind === dragKind && dragFromIdx !== toIdx && dragFromIdx >= 0) {
      const arr = kind === 'menu' ? state.menuItems : state.sectionOrder;
      const [moved] = arr.splice(dragFromIdx, 1);
      arr.splice(toIdx, 0, moved);
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
    }
    dragKind = null;
    dragFromIdx = -1;
  });
  stepContent.addEventListener('dragend', () => {
    dragKind = null;
    dragFromIdx = -1;
    stepContent.querySelectorAll('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
  });

  // Header toolbar actions
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-save-project')?.addEventListener('click', exportProjectJson);
  document.getElementById('btn-open-project')?.addEventListener('click', () => {
    document.getElementById('open-siteforge-input')?.click();
  });
  document.getElementById('btn-quick-theme')?.addEventListener('click', () => {
    prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
    savePrefs();
    applyPrefs();
  });
  document.getElementById('btn-gallery').addEventListener('click', openGalleryModal);
  document.getElementById('btn-presets').addEventListener('click', openPresetsModal);
  document.getElementById('btn-projects').addEventListener('click', () => {
    renderProjectsModal();
    openModal('modal-projects');
  });
  document.getElementById('btn-library').addEventListener('click', openLibraryModal);
  document.getElementById('btn-shortcuts').addEventListener('click', () => openModal('modal-shortcuts'));
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);

  document.getElementById('btn-quick-demo')?.addEventListener('click', () => {
    if (isDemoMode) exitQuickDemo();
    else enterQuickDemo();
  });
  document.getElementById('btn-exit-demo')?.addEventListener('click', () => exitQuickDemo());

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (isDemoMode) {
      openConfirm({
        title: 'Exit Demo & return to your project?',
        message: 'Demo Mode is active. Exiting Demo restores your saved project intact without losing any work.',
        confirmLabel: 'Exit Demo',
        onConfirm: () => exitQuickDemo(),
      });
      return;
    }
    openConfirm({
      title: 'Reset everything?',
      message: 'This clears all 12 steps for the active project and returns to Step 1. Your other saved projects and Published Sites library remain safe.',
      confirmLabel: 'Reset Everything',
      onConfirm: () => {
        state = createDefaultState();
        currentStep = 0;
        highestStep = 0;
        editingFromReview = false;
        currentErrors = {};
        inlineUploadErrors = {};
        publishError = '';
        publishSlugDraft = '';
        initHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        showToast('Project reset');
      },
    });
  });

  // JSON import input
  const importInput = document.getElementById('import-json-input');
  importInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      if (isDemoMode) exitQuickDemo({ silent: true });
      importProjectJson(e.target.files[0]);
    }
    e.target.value = '';
  });

  // Template Gallery events
  ['gallery-search', 'gallery-filter-layout', 'gallery-filter-theme', 'gallery-filter-tone'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderTemplateGallery);
    document.getElementById(id)?.addEventListener('change', renderTemplateGallery);
  });
  document.getElementById('gallery-body').addEventListener('click', (e) => {
    if (e.target.closest('#btn-gallery-toggle-all')) {
      galleryShowAll288 = !galleryShowAll288;
      renderTemplateGallery();
      return;
    }
    const card = e.target.closest('[data-apply-template]');
    if (!card) return;
    const [layoutId, themeId] = card.getAttribute('data-apply-template').split('::');
    applyTemplateSelection({
      layoutId,
      themeId,
      headingFont: card.getAttribute('data-heading-font') || '',
      bodyFont: card.getAttribute('data-body-font') || '',
    });
    closeModal('modal-gallery');
    showToast('Template applied', 'success');
  });

  // Starter Presets events
  document.getElementById('presets-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-apply-preset]');
    if (!btn) return;
    const preset = STARTER_PRESETS.find((p) => p.id === btn.getAttribute('data-apply-preset'));
    if (!preset) return;
    const fresh = createDefaultState();
    applySiteTypeDefaults(fresh, preset.patch.siteType || 'portfolio', true);
    state = { ...fresh, ...clone(preset.patch) };
    currentErrors = {};
    publishSlugDraft = slugifyName(state.siteName);
    pushHistory(state);
    syncActiveProjectAndSave();
    renderAll();
    closeModal('modal-presets');
    showToast(`Loaded "${preset.name}" preset`, 'success');
  });

  // Multi-Project Manager events
  document.getElementById('btn-export-json-modal').addEventListener('click', exportProjectJson);
  document.getElementById('btn-import-json-modal').addEventListener('click', () => importInput.click());
  document.getElementById('btn-new-project').addEventListener('click', () => {
    if (isDemoMode) exitQuickDemo({ silent: true });
    const id = `proj-${Date.now()}`;
    const newProj = {
      id,
      name: `Site Project ${workspace.projects.length + 1}`,
      updatedAt: Date.now(),
      currentStep: 0,
      highestStep: 0,
      state: createDefaultState(),
    };
    workspace.projects.unshift(newProj);
    workspace.activeId = id;
    state = newProj.state;
    currentStep = 0;
    highestStep = 0;
    initHistory(state);
    syncActiveProjectAndSave();
    renderAll();
    renderProjectsModal();
    showToast('Created new project', 'success');
  });

  document.getElementById('projects-list').addEventListener('click', (e) => {
    const sw = e.target.closest('[data-proj-switch]');
    if (sw) {
      if (isDemoMode) exitQuickDemo({ silent: true });
      const target = workspace.projects.find((p) => p.id === sw.getAttribute('data-proj-switch'));
      if (target) {
        workspace.activeId = target.id;
        state = target.state;
        currentStep = target.currentStep || 0;
        highestStep = target.highestStep || currentStep;
        currentErrors = {};
        initHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        renderProjectsModal();
        showToast(`Switched to "${target.name}"`);
      }
      return;
    }

    const ren = e.target.closest('[data-proj-rename]');
    if (ren) {
      const target = workspace.projects.find((p) => p.id === ren.getAttribute('data-proj-rename'));
      if (!target) return;
      openPrompt({
        title: 'Rename Project',
        label: 'Project name',
        initialValue: target.name,
        validate: (v) => (v.trim() ? '' : 'Project name is required.'),
        onSubmit: (v) => {
          target.name = v.trim().slice(0, 60);
          syncActiveProjectAndSave();
          renderProjectsModal();
          applyPrefs();
          showToast('Project renamed');
        },
      });
      return;
    }

    const dup = e.target.closest('[data-proj-dup]');
    if (dup) {
      const src = workspace.projects.find((p) => p.id === dup.getAttribute('data-proj-dup'));
      if (!src) return;
      const copy = {
        id: `proj-${Date.now()}`,
        name: `${src.name} (Copy)`.slice(0, 60),
        updatedAt: Date.now(),
        currentStep: src.currentStep,
        highestStep: src.highestStep,
        state: clone(src.state),
      };
      workspace.projects.unshift(copy);
      syncActiveProjectAndSave();
      renderProjectsModal();
      showToast('Project duplicated');
      return;
    }

    const del = e.target.closest('[data-proj-del]');
    if (del && workspace.projects.length > 1) {
      const pid = del.getAttribute('data-proj-del');
      const target = workspace.projects.find((p) => p.id === pid);
      openConfirm({
        title: `Delete "${target?.name}"?`,
        message: 'This permanently deletes this saved project from your browser.',
        confirmLabel: 'Delete Project',
        onConfirm: async () => {
          workspace.projects = workspace.projects.filter((p) => p.id !== pid);
          try {
            await deleteProjectRecord(pid);
          } catch {}
          if (workspace.activeId === pid) {
            const first = workspace.projects[0];
            workspace.activeId = first.id;
            state = first.state;
            currentStep = first.currentStep || 0;
            highestStep = first.highestStep || 0;
            initHistory(state);
          }
          syncActiveProjectAndSave();
          renderAll();
          renderProjectsModal();
          showToast('Project deleted');
        },
      });
    }
  });

  // Published Library actions (Download, Rename, Duplicate, Delete)
  document.getElementById('library-list').addEventListener('click', async (e) => {
    const dl = e.target.closest('[data-lib-dl]');
    if (dl) {
      const slug = dl.getAttribute('data-lib-dl');
      const found = (await dbGetAll()).find((s) => s.slug === slug);
      if (found) downloadHtml(found.html, found.slug);
      return;
    }

    const ren = e.target.closest('[data-lib-rename]');
    if (ren) {
      const oldSlug = ren.getAttribute('data-lib-rename');
      const found = (await dbGetAll()).find((s) => s.slug === oldSlug);
      if (!found) return;
      openPrompt({
        title: 'Rename Published Site',
        label: 'Safe site slug (a-z, 0-9, hyphen)',
        initialValue: oldSlug,
        validate: (v) => {
          const check = validateSafeName(v);
          return check.valid ? '' : check.error;
        },
        onSubmit: async (v) => {
          const check = validateSafeName(v);
          if (!check.valid) return;
          if (check.slug !== oldSlug) {
            await dbPut({ ...found, slug: check.slug, updatedAt: Date.now() });
            await dbDelete(oldSlug);
          }
          await openLibraryModal();
          showToast(`Renamed to "${check.slug}"`, 'success');
        },
      });
      return;
    }

    const dup = e.target.closest('[data-lib-dup]');
    if (dup) {
      const slug = dup.getAttribute('data-lib-dup');
      const found = (await dbGetAll()).find((s) => s.slug === slug);
      if (!found) return;
      const copySlug = `${slug}-copy`.slice(0, 50);
      await dbPut({ ...found, slug: copySlug, siteName: `${found.siteName} (Copy)`, updatedAt: Date.now() });
      await openLibraryModal();
      showToast(`Duplicated as "${copySlug}"`, 'success');
      return;
    }

    const del = e.target.closest('[data-lib-del]');
    if (del) {
      const slug = del.getAttribute('data-lib-del');
      openConfirm({
        title: `Delete "${slug}"?`,
        message: 'Permanently remove this published site from IndexedDB?',
        confirmLabel: 'Delete Site',
        onConfirm: async () => {
          await dbDelete(slug);
          await openLibraryModal();
          showToast(`Deleted "${slug}"`);
        },
      });
    }
  });

  // Settings Modal events (Preferences + Storage & Data + Self-Test + Tour + Cache)
  document.getElementById('settings-body').addEventListener('click', async (e) => {
    const th = e.target.closest('[data-pref-theme]');
    if (th) {
      prefs.theme = th.getAttribute('data-pref-theme');
      savePrefs();
      applyPrefs();
      openSettingsModal();
      return;
    }
    const acc = e.target.closest('[data-pref-accent]');
    if (acc) {
      prefs.accent = acc.getAttribute('data-pref-accent');
      savePrefs();
      applyPrefs();
      openSettingsModal();
      return;
    }
    const den = e.target.closest('[data-pref-density]');
    if (den) {
      prefs.density = den.getAttribute('data-pref-density');
      savePrefs();
      applyPrefs();
      openSettingsModal();
      return;
    }
    const lang = e.target.closest('[data-pref-lang]');
    if (lang) {
      prefs.lang = lang.getAttribute('data-pref-lang');
      savePrefs();
      applyPrefs();
      renderStep();
      openSettingsModal();
      return;
    }
    if (e.target.closest('#btn-settings-persist')) {
      await handlePersistRequest(showToast, openSettingsModal);
      return;
    }
    if (e.target.closest('#btn-settings-backup')) {
      await runFullBackupDownload(showToast);
      await openSettingsModal();
      return;
    }
    if (e.target.closest('#btn-settings-restore')) {
      document.getElementById('restore-backup-input').click();
      return;
    }
    if (e.target.closest('#btn-settings-selftest')) {
      closeModal('modal-settings');
      await openAndRunSelfTestModal(openModal, showToast);
      return;
    }
    if (e.target.closest('#btn-settings-tour')) {
      closeModal('modal-settings');
      openGuidedTour(openModal, 0);
      return;
    }
    if (e.target.closest('#btn-settings-whatsnew')) {
      closeModal('modal-settings');
      openWhatsNewModal(openModal);
      return;
    }
    if (e.target.closest('#btn-settings-clear-cache')) {
      await clearAppCachesOnly(showToast);
    }
  });

  // Preview Page Switcher (Multi-Page Mode)
  document.getElementById('preview-page-select')?.addEventListener('change', (e) => {
    previewPageSlug = e.target.value || 'index';
    updatePreview(true);
  });

  // Preview Sandbox postMessage Bridge (Phase A2: Click-to-edit + Page Switch + External Link Notice)
  window.addEventListener('message', (ev) => {
    const iframe = document.getElementById('preview-frame');
    if (!iframe || ev.source !== iframe.contentWindow) return;
    const data = ev.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'SF_PREVIEW_NAV' && typeof data.slug === 'string') {
      previewPageSlug = data.slug;
      updatePreview(true);
      return;
    }
    if (data.type === 'SF_PREVIEW_EXTERNAL') {
      showToast('External link opens in a new tab on your exported site.');
      return;
    }
    if (data.type === 'SF_EDIT_FIELD' && typeof data.field === 'string') {
      const fieldToStep = {
        siteName: [0, 'f-siteName'],
        tagline: [0, 'f-tagline'],
        heroBadge: [5, 'f-heroBadge'],
        heroHeadline: [5, 'f-heroHeadline'],
        heroSubheadline: [5, 'f-heroSubheadline'],
        aboutHeading: [6, 'f-aboutHeading'],
        about: [6, 'f-about'],
        contactEmail: [8, 'f-contactEmail'],
        footerText: [9, 'f-footerText'],
      };
      const mapped = fieldToStep[data.field];
      if (mapped) {
        const [targetStep, inputId] = mapped;
        jumpToStep(targetStep, { bypassForwardCheck: true });
        document.body.classList.remove('mobile-show-preview');
        setTimeout(() => {
          const inp = document.getElementById(inputId);
          if (inp) {
            inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inp.focus();
            inp.classList.add('sf-flash-focus');
            setTimeout(() => inp.classList.remove('sf-flash-focus'), 1100);
          }
        }, 60);
      }
    }
  });

  // New Header & Step-Bar Actions (Health Badge, History, Command Palette, Demo, Help, What's New, Smart Copy)
  document.getElementById('btn-health-badge')?.addEventListener('click', () => {
    jumpToStep(steps.length - 1, { bypassForwardCheck: true });
  });
  document.getElementById('btn-history')?.addEventListener('click', () => {
    openHistoryModal(getActiveProject().id, state, openModal);
  });
  document.getElementById('btn-demo-mode')?.addEventListener('click', () => openDemoModal(openModal));
  document.getElementById('btn-help')?.addEventListener('click', () => openHelpCenterModal(openModal));
  document.getElementById('btn-whats-new')?.addEventListener('click', () => openWhatsNewModal(openModal));
  document.getElementById('btn-start-tour-from-new')?.addEventListener('click', () => {
    closeModal('modal-whats-new');
    openGuidedTour(openModal, 0);
  });
  document.getElementById('btn-open-siteforge-modal')?.addEventListener('click', () => {
    document.getElementById('open-siteforge-input').click();
  });

  // Step Tools: Smart Copy & Write it for me
  document.getElementById('btn-copy-bank')?.addEventListener('click', () => {
    openSmartCopyModal(state, steps[currentStep].id, openModal);
  });
  document.getElementById('btn-write-for-me')?.addEventListener('click', () => {
    writeStepForMe(state, steps[currentStep].id);
    currentErrors = {};
    pushHistory(state);
    syncActiveProjectAndSave();
    renderAll();
    showToast(`Filled ${steps[currentStep].title} with Smart Copy`, 'success');
  });

  // Command Palette actions factory
  const buildCommandActions = () => [
    ...steps.map((s, i) => ({
      id: `step-${i}`,
      label: `Go to Step ${String(i + 1).padStart(2, '0')}: ${s.title}`,
      category: 'Step',
      run: () => jumpToStep(i, { bypassForwardCheck: true }),
    })),
    { id: 'act-zip', label: 'Download Full Website (.zip)', category: 'Export', run: () => downloadZip() },
    { id: 'act-html', label: 'Download Single .html', category: 'Export', run: () => downloadHtml() },
    { id: 'act-folder', label: 'Save Website Directly to Folder', category: 'Export', run: () => exportSiteToFolder(state, showToast) },
    { id: 'act-golive', label: 'Open Go-Live Guide & QR Poster', category: 'Launch', run: () => openGoLiveModal(state, openModal) },
    { id: 'act-open', label: 'Open Exported .html / .zip to Edit', category: 'Round-Trip', run: () => document.getElementById('open-siteforge-input').click() },
    { id: 'act-backup', label: 'Back Up Everything (.siteforge)', category: 'Data Safety', run: () => runFullBackupDownload(showToast) },
    { id: 'act-copy', label: 'Open Smart Copy Bank', category: 'Writing', run: () => openSmartCopyModal(state, steps[currentStep].id, openModal) },
    { id: 'act-brand', label: 'Open Brand Studio (Colors & Fonts)', category: 'Design', run: () => openBrandStudioModal(state, openModal) },
    { id: 'act-gallery', label: 'Browse 288 Template Gallery', category: 'Design', run: () => openGalleryModal() },
    { id: 'act-presets', label: 'Load a Starter Preset', category: 'Design', run: () => openPresetsModal() },
    { id: 'act-history', label: 'Open Version History Snapshots', category: 'Safety', run: () => openHistoryModal(getActiveProject().id, state, openModal) },
    { id: 'act-selftest', label: 'Run Offline Self-Test Suite', category: 'Diagnostics', run: () => openAndRunSelfTestModal(openModal, showToast) },
    { id: 'act-quick-demo', label: isDemoMode ? 'Exit Quick Demo (Restore My Project)' : 'Launch Quick Demo (Northstar Studio)', category: 'Demo', run: () => (isDemoMode ? exitQuickDemo() : enterQuickDemo()) },
    { id: 'act-demo', label: 'Open Demo & Presenter Mode', category: 'Demo', run: () => openDemoModal(openModal) },
    { id: 'act-help', label: 'Open Offline Help Center', category: 'Help', run: () => openHelpCenterModal(openModal) },
    { id: 'act-tour', label: 'Take 6-Step Guided Tour', category: 'Help', run: () => openGuidedTour(openModal, 0) },
    { id: 'act-settings', label: 'Open SiteForge Settings', category: 'Settings', run: () => openSettingsModal() },
  ];

  document.getElementById('btn-cmd-palette')?.addEventListener('click', () => {
    openCommandPalette(buildCommandActions(), openModal);
  });
  document.getElementById('cmd-input')?.addEventListener('input', (e) => renderCommandPaletteList(e.target.value));
  document.getElementById('cmd-input')?.addEventListener('keydown', (e) => handleCommandKeydown(e, closeModal));
  document.getElementById('cmd-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd-id]');
    if (!btn) return;
    const item = buildCommandActions().find((a) => a.id === btn.getAttribute('data-cmd-id'));
    closeModal('modal-cmd');
    if (item) item.run();
  });

  // Hidden file inputs: Open in SiteForge (.html/.zip/.json), Restore .siteforge backup, Import custom theme JSON
  document.getElementById('open-siteforge-input')?.addEventListener('change', async (e) => {
    if (e.target.files?.[0]) {
      if (isDemoMode) exitQuickDemo({ silent: true });
      await importProjectJson(e.target.files[0]);
      closeModal('modal-projects');
    }
    e.target.value = '';
  });
  document.getElementById('restore-backup-input')?.addEventListener('change', async (e) => {
    if (e.target.files?.[0]) {
      await runFullBackupRestore(
        e.target.files[0],
        async () => {
          await loadWorkspaceFromIdb();
          initHistory(state);
          renderAll();
          await refreshLibraryCount();
          await openSettingsModal();
        },
        showToast
      );
    }
    e.target.value = '';
  });
  document.getElementById('import-theme-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = safeParseJsonText(await file.text());
    if (!parsed.ok || !isValidHexColor(parsed.data?.primary)) {
      showToast('Invalid theme JSON file.', 'error');
      return;
    }
    const d = parsed.data;
    state.useCustomColors = true;
    state.customPrimary = d.primary;
    if (isValidHexColor(d.accent)) state.customAccent = d.accent;
    if (isValidHexColor(d.bg)) state.customBg = d.bg;
    if (isValidHexColor(d.text)) state.customText = d.text;
    if (d.headingFont) state.headingFont = d.headingFont;
    if (d.bodyFont) state.bodyFont = d.bodyFont;
    pushHistory(state);
    syncActiveProjectAndSave();
    renderAll();
    await renderBrandStudioBody(state);
    showToast('Imported custom theme!', 'success');
  });

  // Banners: SW Reload, Backup Now, Dismiss
  document.getElementById('btn-sw-reload')?.addEventListener('click', () => {
    if (waitingSwRegistration?.waiting) {
      waitingSwRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  });
  document.getElementById('btn-banner-backup-now')?.addEventListener('click', () => runFullBackupDownload(showToast));
  document.getElementById('btn-quota-backup-now')?.addEventListener('click', () => runFullBackupDownload(showToast));
  document.querySelectorAll('[data-dismiss-banner]').forEach((b) => {
    b.addEventListener('click', () => {
      const target = document.getElementById(b.getAttribute('data-dismiss-banner'));
      if (target) target.hidden = true;
    });
  });

  // Self-test modal buttons
  document.getElementById('btn-rerun-selftest')?.addEventListener('click', () => openAndRunSelfTestModal(openModal, showToast));
  document.getElementById('btn-copy-selftest')?.addEventListener('click', () => copySelfTestReport(showToast));

  // Image Studio modal events
  bindImageStudioEvents(closeModal, showToast);

  // Smart Copy modal events
  document.getElementById('copy-bank-body')?.addEventListener('click', (e) => {
    const toneBtn = e.target.closest('[data-cb-tone]');
    if (toneBtn) {
      state.copyTone = toneBtn.getAttribute('data-cb-tone');
      renderSmartCopyBody(state);
      return;
    }
    const fieldBtn = e.target.closest('[data-cb-field]');
    if (fieldBtn) {
      setSmartCopyField(fieldBtn.getAttribute('data-cb-field'));
      renderSmartCopyBody(state);
      return;
    }
    if (e.target.closest('#btn-cb-shuffle')) {
      bumpSmartCopyShuffle();
      renderSmartCopyBody(state);
      return;
    }
    const useBtn = e.target.closest('[data-cb-use]');
    if (useBtn) {
      if (applySmartCopyChoice(state, Number(useBtn.getAttribute('data-cb-use')))) {
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        closeModal('modal-copy-bank');
        showToast('Applied Smart Copy suggestion', 'success');
      }
      return;
    }
    if (e.target.closest('[data-close-modal="modal-copy-bank"]')) {
      closeModal('modal-copy-bank');
    }
  });

  // Brand Studio modal events
  const bsBody = document.getElementById('brand-studio-body');
  bsBody?.addEventListener('input', async (e) => {
    if (e.target.id === 'bs-seed-color' || e.target.id === 'bs-seed-hex') {
      const val = e.target.value;
      if (isValidHexColor(val)) {
        setBrandSeed(val);
        await renderBrandStudioBody(state);
      }
    }
  });
  bsBody?.addEventListener('click', async (e) => {
    const seedBtn = e.target.closest('[data-bs-seed]');
    if (seedBtn) {
      setBrandSeed(seedBtn.getAttribute('data-bs-seed'));
      await renderBrandStudioBody(state);
      return;
    }
    if (e.target.closest('#btn-bs-extract-logo')) {
      await runLogoColorExtraction(state, showToast);
      return;
    }
    const applyH = e.target.closest('[data-bs-apply-harmony]');
    if (applyH) {
      try {
        const h = JSON.parse(applyH.getAttribute('data-bs-apply-harmony'));
        state.useCustomColors = true;
        state.customPrimary = h.primary;
        state.customAccent = h.accent;
        state.customBg = h.bg;
        state.customText = h.text;
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        showToast(`Applied "${h.name}" contrast-checked palette`, 'success');
      } catch {}
      return;
    }
    if (e.target.closest('#btn-bs-save-theme')) {
      await saveCurrentCustomTheme(state, showToast);
      return;
    }
    if (e.target.closest('#btn-bs-export-theme')) {
      exportCustomThemeJson(state, showToast);
      return;
    }
    if (e.target.closest('#btn-bs-import-theme')) {
      document.getElementById('import-theme-input').click();
      return;
    }
    const loadCt = e.target.closest('[data-bs-load-custom]');
    if (loadCt) {
      const saved = (await getSetting('customThemes', [])) || [];
      const ct = saved[Number(loadCt.getAttribute('data-bs-load-custom'))];
      if (ct) {
        state.useCustomColors = true;
        state.customPrimary = ct.primary;
        state.customAccent = ct.accent;
        state.customBg = ct.bg;
        state.customText = ct.text;
        if (ct.headingFont) state.headingFont = ct.headingFont;
        if (ct.bodyFont) state.bodyFont = ct.bodyFont;
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        await renderBrandStudioBody(state);
        showToast(`Loaded "${ct.name}"`, 'success');
      }
      return;
    }
    const pairBtn = e.target.closest('[data-bs-pairing]');
    if (pairBtn) {
      const pid = pairBtn.getAttribute('data-bs-pairing');
      const pair = FONT_PAIRINGS.find((x) => x.id === pid);
      if (pair) {
        state.headingFont = pair.heading;
        state.bodyFont = pair.body;
        pushHistory(state);
        syncActiveProjectAndSave();
        renderAll();
        await renderBrandStudioBody(state);
        showToast('Applied font pairing', 'success');
      }
    }
  });

  // Go-Live & QR Studio modal events
  const glBody = document.getElementById('golive-body');
  glBody?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-gl-tab]');
    if (tab) {
      setGoLiveTab(tab.getAttribute('data-gl-tab'));
      renderGoLiveBody(state);
      return;
    }
    const mode = e.target.closest('[data-qr-mode]');
    if (mode) {
      setQrMode(mode.getAttribute('data-qr-mode'));
      renderGoLiveBody(state);
      return;
    }
    const dlSvg = e.target.closest('#btn-qr-dl-svg');
    if (dlSvg) {
      downloadQrSvgFile(dlSvg.getAttribute('data-qr-payload'), state, showToast);
      return;
    }
    const poster = e.target.closest('#btn-qr-poster');
    if (poster) {
      downloadQrPosterFile(
        poster.getAttribute('data-qr-payload'),
        poster.getAttribute('data-qr-caption'),
        state,
        showToast
      );
    }
  });
  glBody?.addEventListener('input', (e) => {
    if (e.target.id === 'qr-wifi-ssid' || e.target.id === 'qr-wifi-pass') {
      const ssid = document.getElementById('qr-wifi-ssid')?.value || '';
      const pass = document.getElementById('qr-wifi-pass')?.value || '';
      setWifiDraft(ssid, pass);
      renderGoLiveBody(state);
    }
  });

  // Version History Snapshots modal events
  document.getElementById('history-body')?.addEventListener('click', async (e) => {
    if (e.target.closest('#btn-save-snapshot')) {
      const inp = document.getElementById('snapshot-name-input');
      await createNamedSnapshot(getActiveProject().id, inp ? inp.value : '', state, showToast);
      return;
    }
    const rest = e.target.closest('[data-snap-restore]');
    if (rest) {
      const snaps = await getProjectSnapshots(getActiveProject().id);
      const found = snaps.find((s) => s.id === rest.getAttribute('data-snap-restore'));
      if (found) {
        const res = validateAndNormalizeProjectState(found.state, createDefaultState);
        if (res.ok) {
          state = res.state;
          pushHistory(state);
          syncActiveProjectAndSave();
          renderAll();
          closeModal('modal-history');
          showToast(`Restored snapshot "${found.name}"`, 'success');
        }
      }
      return;
    }
    const del = e.target.closest('[data-snap-delete]');
    if (del) {
      await removeSnapshotById(getActiveProject().id, del.getAttribute('data-snap-delete'), state, showToast);
    }
  });

  // Demo Mode modal events
  document.getElementById('demo-body')?.addEventListener('click', async (e) => {
    if (e.target.closest('#btn-demo-timer-toggle')) {
      toggleDemoTimer();
      return;
    }
    if (e.target.closest('#btn-demo-timer-reset')) {
      resetDemoTimer();
      return;
    }
    if (e.target.closest('#btn-demo-load-sample')) {
      const preset = STARTER_PRESETS[2] || STARTER_PRESETS[0];
      const fresh = createDefaultState();
      applySiteTypeDefaults(fresh, preset.patch.siteType || 'cafe', true);
      state = {
        ...fresh,
        ...clone(preset.patch),
        siteStructure: 'multi-page',
        siteUrl: 'https://copper-kettle.example',
        bilingualEnabled: true,
        secondLanguage: 'hi',
        upiEnabled: true,
        upiId: 'copperkettle@upi',
        whatsappFloatEnabled: true,
        whatsappNumber: '+91 98765 43210',
        legalPages: { privacy: true, terms: true, disclaimer: false, refund: false, cookies: false },
        makeSiteOffline: true,
      };
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      closeModal('modal-demo');
      showToast('Loaded full multi-page demo sample project!', 'success');
      return;
    }
    if (e.target.closest('#btn-demo-xss-test')) {
      state.siteName = '<script>alert("xss")</script> Safe Demo';
      state.tagline = '<img src=x onerror=alert(1)> Escaped cleanly!';
      pushHistory(state);
      syncActiveProjectAndSave();
      renderAll();
      closeModal('modal-demo');
      showToast('Inserted harmless XSS test string — notice it renders as plain text in preview!', 'success');
      return;
    }
    if (e.target.closest('#btn-demo-selftest')) {
      closeModal('modal-demo');
      await openAndRunSelfTestModal(openModal, showToast);
      return;
    }
    if (e.target.closest('#btn-demo-backup')) {
      await runFullBackupDownload(showToast);
    }
  });

  // Help Center search
  document.getElementById('help-search')?.addEventListener('input', (e) => renderHelpCenterBody(e.target.value));

  // Guided Tour controls
  document.getElementById('btn-tour-prev')?.addEventListener('click', () => advanceTour(-1, closeModal));
  document.getElementById('btn-tour-next')?.addEventListener('click', () => advanceTour(1, closeModal));
  document.getElementById('btn-tour-skip')?.addEventListener('click', () => finishTour(closeModal));
  document.getElementById('btn-tour-skip-x')?.addEventListener('click', () => finishTour(closeModal));

  // Mobile Builder / Preview tabs
  const tabW = document.getElementById('tab-wizard');
  const tabP = document.getElementById('tab-preview');
  tabW.addEventListener('click', () => {
    document.body.classList.remove('mobile-show-preview');
    tabW.classList.add('is-active');
    tabP.classList.remove('is-active');
  });
  tabP.addEventListener('click', () => {
    document.body.classList.add('mobile-show-preview');
    tabP.classList.add('is-active');
    tabW.classList.remove('is-active');
  });

  // Modal close & dialog submits
  document.querySelectorAll('[data-close-modal]').forEach((b) => {
    b.addEventListener('click', () => closeModal(b.getAttribute('data-close-modal')));
  });
  document.querySelectorAll('.modal-backdrop').forEach((bg) => {
    bg.addEventListener('click', (e) => {
      if (e.target === bg) bg.hidden = true;
    });
  });

  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    confirmCb = null;
    closeModal('modal-confirm');
  });
  document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
    const fn = confirmCb;
    confirmCb = null;
    closeModal('modal-confirm');
    if (fn) await fn();
  });

  document.getElementById('prompt-cancel-btn').addEventListener('click', () => {
    promptCb = null;
    closeModal('modal-prompt');
  });
  document.getElementById('prompt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!promptCb) return;
    const val = document.getElementById('prompt-input').value;
    const errText = promptCb.validate ? promptCb.validate(val) : '';
    if (errText) {
      document.getElementById('prompt-error').textContent = errText;
      return;
    }
    const fn = promptCb.onSubmit;
    promptCb = null;
    closeModal('modal-prompt');
    await fn(val);
  });

  // Header Tools dropdown menu
  const moreBtn = document.getElementById('btn-more-tools');
  const moreMenu = document.getElementById('header-more-menu');
  const closeMoreMenu = () => {
    if (moreMenu) moreMenu.hidden = true;
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
  };
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = moreMenu ? moreMenu.hidden : false;
    if (moreMenu) moreMenu.hidden = !opening;
    moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
  moreMenu?.addEventListener('click', () => closeMoreMenu());
  document.addEventListener('click', (e) => {
    if (moreMenu && !moreMenu.hidden && !e.target.closest('.header-dropdown')) {
      closeMoreMenu();
    }
  });

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMoreMenu();
      document.querySelectorAll('.modal-backdrop:not([hidden])').forEach((m) => (m.hidden = true));
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette(buildCommandActions(), openModal);
    } else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      downloadHtml();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    } else if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      document.body.classList.toggle('preview-collapsed');
    }
  });
}

/* ==========================================================================
   11. Async Boot (IndexedDB Migration + Hydration + 7-Day Backup Check)
   ========================================================================== */

async function boot() {
  loadPrefs();
  bindEvents();
  applyPreviewViewport();
  await loadWorkspaceFromIdb();
  initHistory(state);
  renderAll();
  updatePreview(true);
  await refreshLibraryCount();
  initPwa();

  // Check 7-day backup reminder
  try {
    const activeProj = getActiveProject();
    if (activeProj && (await isBackupOverdue(activeProj.updatedAt))) {
      const b = document.getElementById('banner-backup-reminder');
      if (b) b.hidden = false;
    }
  } catch {}
}

boot();
