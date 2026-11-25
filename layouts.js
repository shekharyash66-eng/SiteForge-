/**
 * SiteForge Layout & HTML Generator (layouts.js)
 * 12 responsive layouts x 24 themes = 288 templates generated via a nested loop.
 * Supports One-Page & Multi-Page websites, Blog posts, Legal pages, Bilingual sites,
 * Conversion tools (WhatsApp float, UPI Pay + QR, vCard, Directions, Offline-queuing Form),
 * Visitor Accessibility widget, Consent-gated Analytics, JSON-LD, CSP, Click-to-Edit preview,
 * Offline-ready exported site, and Round-trip embedded project JSON.
 */

import { renderIcon, renderSocialIcon } from './icons.js';
import {
  BASE_FONT_SIZES,
  CONTENT_WIDTHS,
  CORNER_RADII,
  FONT_STACK_MAP,
  HEADING_WEIGHTS,
  HEADLINE_SIZES,
  HERO_HEIGHTS,
  LAYOUT_LIST,
  LEGAL_PAGE_TYPES,
  LINE_HEIGHTS,
  LOGO_SIZES,
  SHADOW_STRENGTHS,
  SITE_LANGUAGES,
  SOCIAL_PLATFORMS,
  SPACING_DENSITIES,
} from './options.js';
import { THEME_LIST, getReadableOnColor, resolveTheme, themes } from './themes.js';
import {
  escapeHTML,
  formatSafeRichText,
  sanitizeImageDataUrl,
  sanitizeUrl,
  utf8ToBase64,
  cleanWhatsAppDigits,
  buildUpiUri,
  isValidUpiId,
  isValidHttpsUrl,
  isValidAnalyticsConfig,
  serializeJsonForScriptTag,
  slugifyName,
} from './validators.js';
import { getCachedImageUri } from './storage.js';
import { renderDecorativeSvg } from './image-studio.js';
import { renderQrSvg } from './qr.js';
import {
  generateJsonLd,
  buildLegalPageContent,
  buildCspMetaContent,
} from './health.js';

const SOCIAL_META_MAP = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.id, p]));

/* ==========================================================================
   1. Helpers: Image resolution, Click-to-edit attr, Bilingual text, Favicon
   ========================================================================== */

function resolveImg(rawVal, assetMap = null) {
  if (!rawVal) return '';
  const safe = sanitizeImageDataUrl(rawVal);
  if (!safe) return '';
  if (assetMap && assetMap.has(safe)) {
    return assetMap.get(safe);
  }
  const uri = getCachedImageUri(safe);
  if (assetMap && assetMap.has(uri)) {
    return assetMap.get(uri);
  }
  return uri || (safe.startsWith('data:image/') ? safe : '');
}

function imgMetaAttrs(state, slotKey, { eager = false, fallbackW = 800, fallbackH = 600 } = {}) {
  const m = state.imageMeta?.[slotKey] || {};
  const w = Number(m.width) > 0 ? Math.round(Number(m.width)) : fallbackW;
  const h = Number(m.height) > 0 ? Math.round(Number(m.height)) : fallbackH;
  const fx = Number.isFinite(Number(m.focalX)) ? Number(m.focalX) : 50;
  const fy = Number.isFinite(Number(m.focalY)) ? Number(m.focalY) : 50;
  const loadAttr = eager ? ' decoding="async"' : ' loading="lazy" decoding="async"';
  return `width="${w}" height="${h}" style="object-position:${fx}% ${fy}%;"${loadAttr}`;
}

function editAttr(opts, field, stepIdx) {
  if (!opts?.previewMode) return '';
  return ` data-sf-field="${escapeHTML(field)}" data-sf-step="${stepIdx}"`;
}

function tx(state, fieldKey, fallback, opts) {
  const primary = state[fieldKey] ?? fallback ?? '';
  if (opts?.langMode === 'secondary' && state.bilingualEnabled && state.translations?.[fieldKey]) {
    return state.translations[fieldKey];
  }
  return primary;
}

function i18nDataAttr(state, fieldKey) {
  if (!state.bilingualEnabled) return '';
  const alt = (state.translations?.[fieldKey] || '').trim();
  if (!alt) return '';
  return ` data-sf-i18n="${escapeHTML(fieldKey)}"`;
}

function buildFaviconDataUri(state, primaryColor, assetMap = null) {
  if (state.faviconMode === 'upload') {
    const safe = resolveImg(state.faviconDataUrl, assetMap);
    if (safe) return safe;
  }
  const bg = /^#[0-9a-fA-F]{6}$/.test(state.faviconColor || '') ? state.faviconColor : primaryColor;
  const fg = getReadableOnColor(bg);
  const rawChar =
    state.faviconMode === 'auto-emoji'
      ? (state.faviconEmoji || '✦').trim().slice(0, 2)
      : ((state.siteName || 'S').trim()[0] || 'S').toUpperCase();
  const safeChar = escapeHTML(rawChar);
  const xmlNs = 'http:' + '//www.w3.org/2000/svg';
  const svg = `<svg xmlns="${xmlNs}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${bg}"/><text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="700" fill="${fg}">${safeChar}</text></svg>`;
  return 'data:image/svg+xml;base64,' + utf8ToBase64(svg);
}

function renderSectionDivider(style) {
  if (style === 'wave') {
    return `<div class="sf-divider" aria-hidden="true"><svg viewBox="0 0 1200 64" preserveAspectRatio="none"><path d="M0,32 C240,68 480,0 720,32 C960,64 1100,14 1200,32 L1200,64 L0,64 Z" fill="var(--border)" opacity="0.35"/></svg></div>`;
  }
  if (style === 'slant') {
    return `<div class="sf-divider" aria-hidden="true"><svg viewBox="0 0 1200 48" preserveAspectRatio="none"><polygon points="0,48 1200,0 1200,48" fill="var(--border)" opacity="0.3"/></svg></div>`;
  }
  if (style === 'curve') {
    return `<div class="sf-divider" aria-hidden="true"><svg viewBox="0 0 1200 54" preserveAspectRatio="none"><path d="M0,54 Q600,0 1200,54 L1200,54 L0,54 Z" fill="var(--border)" opacity="0.32"/></svg></div>`;
  }
  return '';
}

function buildBackgroundPatternCss(bgStyle) {
  if (bgStyle === 'gradient') {
    return `background-image: radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 46%), radial-gradient(circle at 88% 92%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 44%);`;
  }
  if (bgStyle === 'dots') {
    return `background-image: radial-gradient(color-mix(in srgb, var(--text) 12%, transparent) 1px, transparent 1px); background-size: 22px 22px;`;
  }
  if (bgStyle === 'grid') {
    return `background-image: linear-gradient(to right, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px); background-size: 32px 32px;`;
  }
  if (bgStyle === 'diagonal') {
    return `background-image: repeating-linear-gradient(-45deg, transparent, transparent 14px, color-mix(in srgb, var(--border) 42%, transparent) 14px, color-mix(in srgb, var(--border) 42%, transparent) 15px);`;
  }
  if (bgStyle === 'waves') {
    return `background-image: radial-gradient(circle at 100% 50%, transparent 20%, color-mix(in srgb, var(--border) 35%, transparent) 21%, color-mix(in srgb, var(--border) 35%, transparent) 24%, transparent 25%), radial-gradient(circle at 0% 50%, transparent 20%, color-mix(in srgb, var(--border) 35%, transparent) 21%, color-mix(in srgb, var(--border) 35%, transparent) 24%, transparent 25%); background-size: 44px 44px;`;
  }
  return '';
}

function buildThemeStyleBlock(state, theme) {
  const varsToCss = (v) =>
    Object.entries(v)
      .map(([k, val]) => `      ${k}: ${val};`)
      .join('\n');

  const hFont = (FONT_STACK_MAP[state.headingFont] || FONT_STACK_MAP['modern-sans']).css;
  const bFont = (FONT_STACK_MAP[state.bodyFont] || FONT_STACK_MAP['modern-sans']).css;
  const hWeight = (HEADING_WEIGHTS.find((w) => w.id === state.headingWeight) || HEADING_WEIGHTS[1]).css;
  const baseSize = (BASE_FONT_SIZES.find((s) => s.id === state.baseFontSize) || BASE_FONT_SIZES[1]).css;
  const lineH = (LINE_HEIGHTS.find((l) => l.id === state.lineHeight) || LINE_HEIGHTS[1]).css;
  const radius = CORNER_RADII.find((r) => r.id === state.cornerRadius) || CORNER_RADII[2];
  const shadow = (SHADOW_STRENGTHS.find((s) => s.id === state.shadowStrength) || SHADOW_STRENGTHS[1]).css;
  const spacing = SPACING_DENSITIES.find((s) => s.id === state.spacingDensity) || SPACING_DENSITIES[1];
  const width = (CONTENT_WIDTHS.find((w) => w.id === state.contentWidth) || CONTENT_WIDTHS[1]).css;
  const hSize = (HEADLINE_SIZES.find((h) => h.id === state.headlineSize) || HEADLINE_SIZES[1]).css;
  const heroH = (HERO_HEIGHTS.find((h) => h.id === state.heroHeight) || HERO_HEIGHTS[1]).css;

  const primaryBtnText = getReadableOnColor(theme.vars['--primary']);
  const altBtnText = getReadableOnColor(theme.altVars['--primary']);

  let mediaRule = '';
  if (state.darkModeDefault === 'auto') {
    mediaRule = theme.isDarkDefault
      ? `@media (prefers-color-scheme: light) { :root:not([data-mode="dark"]) {\n${varsToCss(theme.altVars)}\n      --btn-text: ${altBtnText};\n    } }`
      : `@media (prefers-color-scheme: dark) { :root:not([data-mode="light"]) {\n${varsToCss(theme.altVars)}\n      --btn-text: ${altBtnText};\n    } }`;
  }

  return `
    :root {
${varsToCss(theme.vars)}
      --btn-text: ${primaryBtnText};
      --font-heading: ${hFont};
      --font-body: ${bFont};
      --heading-weight: ${hWeight};
      --base-size: ${baseSize};
      --line-height: ${lineH};
      --radius: ${radius.css};
      --btn-radius: ${state.buttonStyle === 'pill' ? '999px' : radius.btnCss};
      --shadow: ${shadow};
      --sec-pad: ${spacing.padY};
      --grid-gap: ${spacing.gap};
      --container-max: ${width};
      --hero-h1-size: ${hSize};
      --hero-min-h: ${heroH};
    }

    ${mediaRule}

    :root[data-mode="${theme.isDarkDefault ? 'light' : 'dark'}"] {
${varsToCss(theme.altVars)}
      --btn-text: ${altBtnText};
    }

    :root[data-mode="${theme.isDarkDefault ? 'dark' : 'light'}"] {
${varsToCss(theme.vars)}
      --btn-text: ${primaryBtnText};
    }

    :root[data-high-contrast="true"] {
      --bg: #000000;
      --card: #0a0a0a;
      --text: #ffffff;
      --muted: #f3f4f6;
      --primary: #facc15;
      --accent: #38bdf8;
      --border: #ffffff;
      --btn-text: #000000;
    }
  `;
}

/* ==========================================================================
   2. Multi-Page Manifest Builder (Phase A3 + B6)
   ========================================================================== */

export function getSitePageManifest(state) {
  const isMulti = state.siteStructure === 'multi';
  const pages = [];

  if (!isMulti) {
    pages.push({
      slug: 'index',
      filename: 'index.html',
      title: (state.metaTitle || state.siteName || 'Home').trim(),
      label: 'Home',
      pageType: 'home',
      source: 'menu',
      metaDescription: state.metaDescription || '',
    });
  } else {
    const usedSlugs = new Set();
    const menuItems = Array.isArray(state.menuItems) && state.menuItems.length
      ? state.menuItems
      : [{ label: 'Home', type: 'section', target: '#top', pageType: 'home', slug: 'index' }];

    menuItems.forEach((item, idx) => {
      if (item.type === 'external') return;
      let slug = idx === 0 || item.pageType === 'home' ? 'index' : slugifyName(item.slug || item.label || `page-${idx + 1}`);
      if (usedSlugs.has(slug)) slug = `${slug}-${idx + 1}`;
      usedSlugs.add(slug);
      pages.push({
        slug,
        filename: `${slug}.html`,
        title: (item.metaTitle || item.label || 'Page').trim(),
        label: (item.label || 'Page').trim(),
        pageType: item.pageType || (idx === 0 ? 'home' : 'custom'),
        source: 'menu',
        metaDescription: item.metaDescription || '',
        customBody: item.customBody || '',
      });
    });

    // Extra footer-only pages (up to 6)
    (state.footerPages || []).slice(0, 6).forEach((fp, idx) => {
      let slug = slugifyName(fp.slug || fp.title || `extra-${idx + 1}`);
      if (usedSlugs.has(slug)) slug = `${slug}-${idx + 1}`;
      usedSlugs.add(slug);
      pages.push({
        slug,
        filename: `${slug}.html`,
        title: (fp.title || `Page ${idx + 1}`).trim(),
        label: (fp.title || `Page ${idx + 1}`).trim(),
        pageType: fp.pageType || 'custom',
        source: 'footer',
        metaDescription: fp.metaDescription || '',
        customBody: fp.body || '',
      });
    });
  }

  // Enabled Legal Pages (Phase B6)
  const existingSlugs = new Set(pages.map((p) => p.slug));
  if (state.legalPages && typeof state.legalPages === 'object') {
    for (const lp of LEGAL_PAGE_TYPES) {
      if (!state.legalPages[lp.id]) continue;
      if (existingSlugs.has(lp.slug)) continue;
      existingSlugs.add(lp.slug);
      const legalData = buildLegalPageContent(lp.id, state);
      pages.push({
        slug: legalData.slug,
        filename: `${legalData.slug}.html`,
        title: legalData.title,
        label: legalData.title,
        pageType: 'legal',
        legalType: lp.id,
        source: 'legal',
        metaDescription: `${legalData.title} for ${state.siteName || 'this website'}.`,
        customBody: legalData.body,
      });
    }
  }

  // Blog Post Pages (up to 20 posts)
  if (isMulti && Array.isArray(state.blogPosts)) {
    state.blogPosts.slice(0, 20).forEach((post, idx) => {
      if (!(post?.title || '').trim()) return;
      let slug = `post-${slugifyName(post.slug || post.title || `article-${idx + 1}`)}`;
      if (existingSlugs.has(slug)) slug = `${slug}-${idx + 1}`;
      existingSlugs.add(slug);
      pages.push({
        slug,
        filename: `${slug}.html`,
        title: post.title.trim(),
        label: post.title.trim(),
        pageType: 'blog-post',
        post,
        source: 'blog',
        metaDescription: (post.summary || '').trim(),
      });
    });
  }

  return pages;
}

/* ==========================================================================
   3. Reusable Semantic Content Section Builders
   ========================================================================== */

function renderBrand(state, theme, opts) {
  const siteNameRaw = tx(state, 'siteName', '', opts).trim();
  const siteName = escapeHTML(siteNameRaw || 'Studio Atelier');
  const sizePx = (LOGO_SIZES.find((s) => s.id === state.logoSize) || LOGO_SIZES[1]).px;
  const monogram = escapeHTML(((siteNameRaw || 'SA').slice(0, 2) || 'SA').toUpperCase());
  const homeHref = state.siteStructure === 'multi' ? 'index.html' : '#top';
  const edit = editAttr(opts, 'siteName', 0);

  if (state.logoMode === 'upload') {
    const safeLogo = resolveImg(state.logoDataUrl, opts.assetMap);
    if (safeLogo) {
      return `<a class="sf-brand" href="${homeHref}"${edit}><img src="${safeLogo}" alt="${siteName} logo" width="${sizePx}" height="${sizePx}" style="height:${sizePx}px;width:auto;max-width:140px;object-fit:contain;border-radius:6px;" /><span${i18nDataAttr(state, 'siteName')}>${siteName}</span></a>`;
    }
  }

  if (state.logoMode === 'emoji') {
    const emoji = escapeHTML((state.logoEmoji || '✦').trim().slice(0, 4));
    return `<a class="sf-brand" href="${homeHref}"${edit}><span class="sf-brand-emoji" style="font-size:${Math.round(sizePx * 0.72)}px;line-height:1;" aria-hidden="true">${emoji}</span><span${i18nDataAttr(state, 'siteName')}>${siteName}</span></a>`;
  }

  const textFont = (FONT_STACK_MAP[state.logoTextFont] || FONT_STACK_MAP[state.headingFont] || FONT_STACK_MAP['modern-sans']).css;
  const customColor = /^#[0-9a-fA-F]{6}$/.test(state.logoTextColor || '') ? state.logoTextColor : '';
  const colorStyle = customColor ? `color:${customColor};` : '';

  return `<a class="sf-brand" href="${homeHref}"${edit} style="font-family:${textFont};${colorStyle}"><span class="sf-brand-mark" style="width:${sizePx}px;height:${sizePx}px;font-size:${Math.round(sizePx * 0.38)}px;${customColor ? `background:${customColor};color:${getReadableOnColor(customColor)};` : ''}" aria-hidden="true">${monogram}</span><span${i18nDataAttr(state, 'siteName')}>${siteName}</span></a>`;
}

function renderNavItems(state, opts) {
  const isMulti = state.siteStructure === 'multi';
  const currentSlug = opts.currentSlug || 'index';
  const items = Array.isArray(state.menuItems) && state.menuItems.length
    ? state.menuItems
    : [{ label: 'Home', type: 'section', target: '#top', slug: 'index', pageType: 'home' }];

  return items
    .filter((item) => String(item?.label || '').trim())
    .map((item, idx) => {
      const label = escapeHTML(item.label.trim());
      const isExt = item.type === 'external';
      let safeHref = '#top';
      let isActive = false;

      if (isExt) {
        safeHref = sanitizeUrl(item.target || '', { allowAnchor: false }) || '#top';
      } else if (isMulti) {
        const slug = idx === 0 || item.pageType === 'home' ? 'index' : slugifyName(item.slug || item.label || `page-${idx + 1}`);
        safeHref = `${slug}.html`;
        isActive = slug === currentSlug;
      } else {
        safeHref = sanitizeUrl(item.target || '#top', { allowAnchor: true }) || '#top';
      }

      const extAttrs = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
      const activeAttr = isActive ? ' aria-current="page"' : '';
      return `<a class="sf-nav-link${isActive ? ' is-current' : ''}" href="${escapeHTML(safeHref)}"${extAttrs}${activeAttr}>${label}</a>`;
    })
    .join('\n          ');
}

function renderHeader(state, theme, opts, { isSidebar = false } = {}) {
  const navLinks = renderNavItems(state, opts);
  const rawCtaLink = state.siteStructure === 'multi' && state.navCtaLink === '#contact' ? 'contact.html' : state.navCtaLink || '#contact';
  const ctaLink = sanitizeUrl(rawCtaLink, { allowAnchor: true }) || '#contact';
  const navCta =
    state.navCtaEnabled && (state.navCtaText || '').trim()
      ? `<a class="sf-btn sf-btn-sm sf-nav-cta" href="${escapeHTML(ctaLink)}"${editAttr(opts, 'navCtaText', 4)}>${escapeHTML(state.navCtaText.trim())}</a>`
      : '';

  const lang1 = SITE_LANGUAGES.find((l) => l.code === state.siteLanguage) || SITE_LANGUAGES[0];
  const lang2 = SITE_LANGUAGES.find((l) => l.code === state.secondLanguage) || SITE_LANGUAGES[1];
  const langToggle = state.bilingualEnabled
    ? `<button type="button" id="sf-lang-toggle" class="sf-icon-btn" aria-label="Switch website language" title="Switch language">${escapeHTML(
        (opts.langMode === 'secondary' ? lang1.code : lang2.code).toUpperCase()
      )}</button>`
    : '';

  const darkToggle = state.showDarkModeToggle
    ? `<button type="button" id="sf-theme-toggle" class="sf-icon-btn" aria-label="Toggle dark mode" aria-pressed="false" title="Toggle light or dark mode">Dark</button>`
    : '';

  const installBtn = state.makeSiteOffline && !opts.previewMode
    ? `<button type="button" id="sf-site-install" class="sf-icon-btn" hidden>Install</button>`
    : '';

  const hamburger = `<button type="button" id="sf-menu-btn" class="sf-icon-btn sf-menu-btn" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="sf-nav-panel"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>`;

  if (isSidebar) {
    return `
    <aside class="sf-sidebar-rail" id="top">
      <div class="sf-sidebar-top">
        <div class="sf-sidebar-head">
          ${renderBrand(state, theme, opts)}
          <div class="sf-header-actions">${langToggle}${darkToggle}${hamburger}</div>
        </div>
        <nav id="sf-nav-panel" class="sf-nav sf-nav-vertical sf-menu-${escapeHTML(state.menuStyle)} sf-mobile-${escapeHTML(state.mobileMenuStyle)}" aria-label="Main navigation">
          ${navLinks}
          ${navCta}
        </nav>
      </div>
      <div class="sf-sidebar-foot">
        ${state.tagline ? `<p class="sf-muted-sm"${i18nDataAttr(state, 'tagline')}>${escapeHTML(tx(state, 'tagline', '', opts))}</p>` : ''}
        ${renderSocialRow(state, true)}
      </div>
    </aside>`;
  }

  const headerClasses = [
    'sf-header',
    `sf-header-${escapeHTML(state.headerStyle)}`,
    state.logoPosition === 'center' ? 'sf-logo-center' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
  <header class="${headerClasses}" id="top">
    <div class="sf-container sf-header-inner">
      <div class="sf-brand-wrap">${renderBrand(state, theme, opts)}</div>
      <nav id="sf-nav-panel" class="sf-nav sf-nav-align-${escapeHTML(state.menuAlignment)} sf-menu-${escapeHTML(state.menuStyle)} sf-mobile-${escapeHTML(state.mobileMenuStyle)}" aria-label="Main navigation">
        ${navLinks}
      </nav>
      <div class="sf-header-actions">
        ${navCta}
        ${langToggle}
        ${installBtn}
        ${darkToggle}
        ${hamburger}
      </div>
    </div>
  </header>`;
}

function renderHero(state, opts, { layoutId }) {
  const rawName = tx(state, 'siteName', '', opts).trim();
  const siteName = escapeHTML(rawName || 'Studio Atelier');
  const headlineRaw = tx(state, 'heroHeadline', '', opts).trim();
  const headline = escapeHTML(
    headlineRaw || (rawName ? `${rawName} — Crafted with clarity and purpose.` : 'Thoughtful craft for the modern web.')
  );
  const subRaw =
    tx(state, 'heroSubheadline', '', opts).trim() ||
    tx(state, 'tagline', '', opts).trim() ||
    'An independent studio designing clear, lasting websites, visual identities, and digital products.';
  const subheadline = escapeHTML(subRaw);
  const badge = (state.heroBadge || '').trim() || (!headlineRaw && !rawName ? 'Editorial Studio · Est. 2026' : '');
  const primaryText = tx(state, 'heroPrimaryBtnText', '', opts).trim();
  const rawPrimaryLink = state.siteStructure === 'multi' && state.heroPrimaryBtnLink === '#contact' ? 'contact.html' : state.heroPrimaryBtnLink || '#contact';
  const primaryLink = sanitizeUrl(rawPrimaryLink, { allowAnchor: true }) || '#contact';
  const secondaryText = tx(state, 'heroSecondaryBtnText', '', opts).trim();
  const rawSecLink = state.siteStructure === 'multi' && state.heroSecondaryBtnLink === '#about' ? 'about.html' : state.heroSecondaryBtnLink || '#about';
  const secondaryLink = sanitizeUrl(rawSecLink, { allowAnchor: true }) || '#about';

  const bgImg = state.heroBgMode === 'image' ? resolveImg(state.heroBgImage, opts.assetMap) : '';
  const overlayAlpha = Math.max(0, Math.min(90, Number(state.heroBgOverlay ?? 45))) / 100;
  const sideImg = resolveImg(state.heroSideImage, opts.assetMap);
  const sideAlt = escapeHTML((state.heroSideImageAlt || `${state.siteName || 'Hero'} showcase`).trim());
  const decoSvg = !sideImg && state.decorativeHeroSvg ? renderDecorativeSvg(state.decorativeHeroSvg, 'sf-deco-visual') : '';

  const hasSideVisual = Boolean(sideImg) || Boolean(decoSvg) || layoutId === 'split-hero';
  const heroBgClass = `sf-hero-bg-${escapeHTML(state.heroBgMode)}`;
  const alignClass = `sf-align-${escapeHTML(state.heroAlignment)}`;

  const bgStyleAttr = bgImg
    ? ` style="background-image:linear-gradient(rgba(10,12,18,${overlayAlpha}),rgba(10,12,18,${overlayAlpha})),url('${bgImg}');background-size:cover;background-position:center;color:#ffffff;"`
    : '';

  const sideVisualHtml = sideImg
    ? `<div class="sf-hero-media"${editAttr(opts, 'heroSideImage', 5)}><img class="sf-shaped-img sf-shape-${escapeHTML(state.heroImageShape)}" src="${sideImg}" alt="${sideAlt}" ${imgMetaAttrs(state, 'heroSideImage', { eager: true, fallbackW: 800, fallbackH: 600 })} /></div>`
    : decoSvg
    ? `<div class="sf-hero-media"${editAttr(opts, 'decorativeHeroSvg', 5)}>${decoSvg}</div>`
    : layoutId === 'split-hero'
    ? `<div class="sf-hero-showcase sf-card"><span class="sf-kicker">${escapeHTML(state.siteType)}</span><h2>${siteName}</h2><p>${subheadline || 'Crafted cleanly with SiteForge.'}</p></div>`
    : '';

  const buttonsHtml =
    primaryText || secondaryText
      ? `<div class="sf-hero-actions">
          ${primaryText ? `<a class="sf-btn" href="${escapeHTML(primaryLink)}"${editAttr(opts, 'heroPrimaryBtnText', 5)}${i18nDataAttr(state, 'heroPrimaryBtnText')}>${escapeHTML(primaryText)}</a>` : ''}
          ${secondaryText ? `<a class="sf-btn sf-btn-secondary" href="${escapeHTML(secondaryLink)}"${editAttr(opts, 'heroSecondaryBtnText', 5)}${i18nDataAttr(state, 'heroSecondaryBtnText')}>${escapeHTML(secondaryText)}</a>` : ''}
        </div>`
      : '';

  return `
  <section class="sf-hero ${heroBgClass} ${alignClass} ${bgImg ? 'sf-hero-has-bgimg' : ''} ${hasSideVisual ? 'sf-hero-split' : ''}"${bgStyleAttr}>
    <div class="sf-container sf-hero-inner">
      <div class="sf-hero-copy sf-anim">
        ${badge ? `<p class="sf-hero-badge"${editAttr(opts, 'heroBadge', 5)}>${escapeHTML(badge)}</p>` : ''}
        <h1${editAttr(opts, 'heroHeadline', 5)}${i18nDataAttr(state, 'heroHeadline')}>${headline}</h1>
        ${subheadline ? `<p class="sf-hero-sub"${editAttr(opts, 'heroSubheadline', 5)}${i18nDataAttr(state, 'heroSubheadline')}>${subheadline}</p>` : ''}
        ${buttonsHtml}
      </div>
      ${sideVisualHtml}
    </div>
  </section>`;
}

function renderAbout(state, opts, { headingTag = 'h2' } = {}) {
  const heading = escapeHTML(tx(state, 'aboutHeading', 'About Us', opts).trim() || 'About Us');
  const rawAbout = tx(state, 'about', '', opts).trim();
  const richBody = formatSafeRichText(
    rawAbout ||
      'We pair disciplined typography with purposeful digital architecture to build websites that feel calm, distinctive, and effortless to navigate.\n\nEvery detail—from layout proportion to responsive rhythm—is shaped to serve your visitors clearly.'
  );
  const aboutImg = resolveImg(state.aboutImage, opts.assetMap);
  const aboutAlt = escapeHTML((state.aboutImageAlt || `${state.siteName || 'About'} photo`).trim());
  const decoSvg = !aboutImg && state.decorativeAboutSvg ? renderDecorativeSvg(state.decorativeAboutSvg, 'sf-deco-visual') : '';
  const pos = state.aboutImagePosition || 'right';

  const highlights = (state.aboutHighlights || []).filter((h) => String(h?.text || '').trim());
  const stats = (state.aboutStats || []).filter((s) => String(s?.number || '').trim() || String(s?.label || '').trim());

  const highlightsHtml = highlights.length
    ? `<ul class="sf-highlights">${highlights
        .map((h) => `<li><span class="sf-hi-icon">${renderIcon(h.icon || 'check', 18)}</span><span>${escapeHTML(h.text)}</span></li>`)
        .join('')}</ul>`
    : '';

  const statsHtml = stats.length
    ? `<div class="sf-stats-row">${stats
        .map((s) => `<div class="sf-stat sf-card"><div class="sf-stat-num">${escapeHTML(s.number)}</div><div class="sf-stat-label">${escapeHTML(s.label)}</div></div>`)
        .join('')}</div>`
    : '';

  const imgBlock = aboutImg
    ? `<div class="sf-about-media"${editAttr(opts, 'aboutImage', 6)}><img class="sf-shaped-img sf-shape-${escapeHTML(state.aboutImageShape)}" src="${aboutImg}" alt="${aboutAlt}" ${imgMetaAttrs(state, 'aboutImage', { eager: false, fallbackW: 800, fallbackH: 600 })} /></div>`
    : decoSvg
    ? `<div class="sf-about-media"${editAttr(opts, 'decorativeAboutSvg', 6)}>${decoSvg}</div>`
    : '';

  const hasVisual = Boolean(aboutImg || decoSvg);
  const gridClass = hasVisual ? `sf-about-grid sf-about-pos-${escapeHTML(pos)}` : 'sf-about-single';

  return `
  <section class="sf-section sf-align-${escapeHTML(state.aboutAlignment)}" id="about">
    <div class="sf-container sf-anim">
      <div class="${gridClass}">
        ${hasVisual && (pos === 'left' || pos === 'top') ? imgBlock : ''}
        <div class="sf-about-copy">
          <p class="sf-kicker">About</p>
          <${headingTag}${editAttr(opts, 'aboutHeading', 6)}${i18nDataAttr(state, 'aboutHeading')}>${heading}</${headingTag}>
          <div class="sf-prose"${editAttr(opts, 'about', 6)}${i18nDataAttr(state, 'about')}>${richBody}</div>
          ${highlightsHtml}
        </div>
        ${hasVisual && pos === 'right' ? imgBlock : ''}
      </div>
      ${statsHtml}
    </div>
  </section>`;
}

function renderExtraSection(sectionId, state, opts, { forceEnable = false, headingTag = 'h2' } = {}) {
  const meta = state.sections?.[sectionId] || { enabled: false, heading: sectionId, subheading: '' };
  if (!forceEnable && !meta.enabled) return '';

  const heading = escapeHTML((meta.heading || sectionId).trim());
  const subheading = escapeHTML((meta.subheading || '').trim());
  const headHtml = `<div class="sf-sec-head"${editAttr(opts, `section:${sectionId}`, 7)}><p class="sf-kicker">${escapeHTML(sectionId)}</p><${headingTag}>${heading}</${headingTag}>${subheading ? `<p class="sf-sec-sub">${subheading}</p>` : ''}</div>`;

  switch (sectionId) {
    case 'services': {
      const cols = Math.max(1, Math.min(4, Number(state.servicesColumns) || 3));
      const items = (state.services || []).filter((s) => String(s?.title || '').trim() || String(s?.description || '').trim());
      const display = items.length
        ? items
        : [
            { title: 'Brand Direction', description: 'Distinctive visual systems, editorial typography, and cohesive identity guidelines.', icon: 'palette', price: '', link: '#contact', buttonLabel: 'Learn More', image: '' },
            { title: 'Editorial Web Design', description: 'Responsive, high-clarity websites shaped around thoughtful reading hierarchy.', icon: 'monitor', price: '', link: '#contact', buttonLabel: 'Learn More', image: '' },
            { title: 'Digital Architecture', description: 'Fast, accessible front-end foundations built for long-term reliability.', icon: 'layers', price: '', link: '#contact', buttonLabel: 'Learn More', image: '' },
          ];
      const cardOverride = state.servicesCardStyle && state.servicesCardStyle !== 'inherit' ? ` sf-card-${escapeHTML(state.servicesCardStyle)}` : '';

      return `
      <section class="sf-section" id="services">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-${cols}">
            ${display
              .map((s, idx) => {
                const img = resolveImg(s.image, opts.assetMap);
                const href = sanitizeUrl(s.link || '', { allowAnchor: true });
                const isExt = /^https?:\/\//i.test(href);
                return `<article class="sf-card${cardOverride} sf-service-card"${editAttr(opts, 'services', 7)}>
                  ${img ? `<img class="sf-card-img" src="${img}" alt="${escapeHTML(s.imageAlt || s.title || 'Service')}" ${imgMetaAttrs(state, `services:${idx}`, { fallbackW: 600, fallbackH: 400 })} />` : `<div class="sf-icon-badge">${renderIcon(s.icon || 'sparkles', 22)}</div>`}
                  <div class="sf-card-top-row">
                    <h3>${escapeHTML(s.title || 'Untitled')}</h3>
                    ${s.price ? `<span class="sf-price-tag">${escapeHTML(s.price)}</span>` : ''}
                  </div>
                  <p>${escapeHTML(s.description || '')}</p>
                  ${href && s.buttonLabel ? `<a class="sf-card-link" href="${escapeHTML(href)}"${isExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHTML(s.buttonLabel)} &rarr;</a>` : ''}
                </article>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'projects': {
      const items = (state.projects || []).filter((p) => String(p?.title || '').trim());
      if (!items.length) return '';
      return `
      <section class="sf-section" id="projects">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-2">
            ${items
              .map((p, i) => {
                const href = sanitizeUrl(p.link || '', { allowAnchor: true });
                const isExt = /^https?:\/\//i.test(href);
                return `<article class="sf-card sf-project-card"${editAttr(opts, 'projects', 7)}>
                  <div class="sf-card-top-row">
                    <span class="sf-kicker" style="margin:0;">${escapeHTML(p.category || `0${i + 1}`)}</span>
                    ${href ? `<a class="sf-card-link" href="${escapeHTML(href)}"${isExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>View Project &rarr;</a>` : ''}
                  </div>
                  <h3>${escapeHTML(p.title)}</h3>
                  <p>${escapeHTML(p.description || '')}</p>
                </article>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'features': {
      const items = (state.features || []).filter((f) => String(f?.title || '').trim());
      if (!items.length) return '';
      return `
      <section class="sf-section" id="features">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-3">
            ${items
              .map(
                (f) => `<article class="sf-card"${editAttr(opts, 'features', 7)}>
                <div class="sf-icon-badge">${renderIcon(f.icon || 'bolt', 20)}</div>
                <h3>${escapeHTML(f.title)}</h3>
                <p>${escapeHTML(f.description || '')}</p>
              </article>`
              )
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'testimonials': {
      const items = (state.testimonials || []).filter((t) => String(t?.quote || '').trim());
      if (!items.length) return '';
      return `
      <section class="sf-section" id="testimonials">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-2">
            ${items
              .map((t) => {
                const stars = Math.max(1, Math.min(5, Number(t.rating) || 5));
                const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
                return `<blockquote class="sf-card sf-quote-card"${editAttr(opts, 'testimonials', 7)}>
                  <div class="sf-stars" aria-label="${stars} out of 5 stars">${starStr}</div>
                  <p class="sf-quote-text">&ldquo;${escapeHTML(t.quote)}&rdquo;</p>
                  <footer class="sf-quote-author"><strong>${escapeHTML(t.name || 'Client')}</strong>${t.role ? ` <span>· ${escapeHTML(t.role)}</span>` : ''}</footer>
                </blockquote>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'pricing': {
      const plans = (state.pricingPlans || []).filter((p) => String(p?.name || '').trim());
      if (!plans.length) return '';
      return `
      <section class="sf-section" id="pricing">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-${Math.min(4, Math.max(1, plans.length))}">
            ${plans
              .map((p) => {
                const feats = String(p.features || '')
                  .split('\n')
                  .map((f) => f.trim())
                  .filter(Boolean);
                const rawHref = state.siteStructure === 'multi' && (!p.ctaLink || p.ctaLink === '#contact') ? 'contact.html' : p.ctaLink || '#contact';
                const href = sanitizeUrl(rawHref, { allowAnchor: true }) || '#contact';
                return `<article class="sf-card sf-pricing-card${p.highlighted ? ' is-highlighted' : ''}"${editAttr(opts, 'pricingPlans', 7)}>
                  ${p.highlighted ? '<div class="sf-kicker">Recommended</div>' : ''}
                  <h3>${escapeHTML(p.name)}</h3>
                  <div class="sf-plan-price"><strong>${escapeHTML(p.price || '$0')}</strong><span>${escapeHTML(p.period || '')}</span></div>
                  <ul class="sf-plan-features">${feats.map((f) => `<li>${escapeHTML(f)}</li>`).join('')}</ul>
                  <a class="sf-btn${p.highlighted ? '' : ' sf-btn-secondary'}" href="${escapeHTML(href)}">${escapeHTML(p.ctaText || 'Get Started')}</a>
                </article>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'team': {
      const members = (state.teamMembers || []).filter((m) => String(m?.name || '').trim());
      if (!members.length) return '';
      return `
      <section class="sf-section" id="team">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-grid sf-cols-${Math.min(4, Math.max(2, members.length))}">
            ${members
              .map((m, idx) => {
                const photo = resolveImg(m.photo, opts.assetMap);
                const init = escapeHTML(m.name.trim().slice(0, 2).toUpperCase());
                return `<article class="sf-card sf-team-card"${editAttr(opts, 'teamMembers', 7)}>
                  ${photo ? `<img class="sf-team-photo" src="${photo}" alt="${escapeHTML(m.name)}" ${imgMetaAttrs(state, `teamMembers:${idx}`, { fallbackW: 168, fallbackH: 168 })} />` : `<div class="sf-team-avatar" aria-hidden="true">${init}</div>`}
                  <h3>${escapeHTML(m.name)}</h3>
                  <p>${escapeHTML(m.role || '')}</p>
                </article>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'faq': {
      const items = (state.faqItems || []).filter((f) => String(f?.question || '').trim());
      if (!items.length) return '';
      return `
      <section class="sf-section" id="faq">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-faq-list">
            ${items
              .map(
                (f) => `<details class="sf-faq-item sf-card"${editAttr(opts, 'faqItems', 7)}>
                <summary>${escapeHTML(f.question)}</summary>
                <p>${escapeHTML(f.answer || '')}</p>
              </details>`
              )
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'gallery': {
      const items = (state.galleryItems || []).filter((g) => resolveImg(g?.image, opts.assetMap));
      if (!items.length) return '';
      return `
      <section class="sf-section" id="gallery">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-gallery-grid">
            ${items
              .map((g, idx) => {
                const safeSrc = resolveImg(g.image, opts.assetMap);
                const alt = escapeHTML((g.alt || g.caption || `Gallery photo ${idx + 1}`).trim());
                return `<figure class="sf-gallery-item sf-card"${editAttr(opts, 'galleryItems', 7)}>
                  <button type="button" class="sf-gallery-btn" data-lightbox-src="${safeSrc}" data-lightbox-cap="${alt}" aria-label="View ${alt}">
                    <img src="${safeSrc}" alt="${alt}" ${imgMetaAttrs(state, `galleryItems:${idx}`, { fallbackW: 800, fallbackH: 600 })} />
                  </button>
                  ${g.caption ? `<figcaption>${escapeHTML(g.caption)}</figcaption>` : ''}
                </figure>`;
              })
              .join('\n')}
          </div>
        </div>
      </section>`;
    }

    case 'timeline': {
      const items = (state.timelineItems || []).filter((t) => String(t?.title || '').trim());
      if (!items.length) return '';
      return `
      <section class="sf-section" id="timeline">
        <div class="sf-container sf-anim">
          ${headHtml}
          <ol class="sf-timeline-list">
            ${items
              .map(
                (t, idx) => `<li class="sf-timeline-item sf-card"${editAttr(opts, 'timelineItems', 7)}>
                <span class="sf-timeline-step">${escapeHTML(t.step || String(idx + 1).padStart(2, '0'))}</span>
                <div>
                  <h3>${escapeHTML(t.title)}</h3>
                  <p>${escapeHTML(t.description || '')}</p>
                </div>
              </li>`
              )
              .join('\n')}
          </ol>
        </div>
      </section>`;
    }

    case 'partners': {
      const items = (state.partners || []).map((p) => String(p || '').trim()).filter(Boolean);
      if (!items.length) return '';
      return `
      <section class="sf-section" id="partners">
        <div class="sf-container sf-anim">
          ${headHtml}
          <div class="sf-partners-row">
            ${items.map((p) => `<span class="sf-partner-name">${escapeHTML(p)}</span>`).join('')}
          </div>
        </div>
      </section>`;
    }

    case 'newsletter': {
      return `
      <section class="sf-section" id="newsletter">
        <div class="sf-container sf-anim">
          <div class="sf-card sf-newsletter-card">
            <div>
              <p class="sf-kicker">Newsletter</p>
              <${headingTag}>${heading}</${headingTag}>
              ${subheading ? `<p>${subheading}</p>` : ''}
            </div>
            <form class="sf-newsletter-form" id="sf-newsletter-form">
              <label class="sf-sr-only" for="sf-nl-email">Email address</label>
              <input id="sf-nl-email" type="email" required placeholder="you@domain.com" />
              <button type="submit" class="sf-btn">${escapeHTML((state.newsletterButtonText || 'Subscribe').trim())}</button>
              <p class="sf-muted-sm" id="sf-nl-msg" aria-live="polite">${escapeHTML(state.newsletterNote || '')}</p>
            </form>
          </div>
        </div>
      </section>`;
    }

    case 'cta': {
      const rawHref = state.siteStructure === 'multi' && (!state.ctaButtonLink || state.ctaButtonLink === '#contact') ? 'contact.html' : state.ctaButtonLink || '#contact';
      const href = sanitizeUrl(rawHref, { allowAnchor: true }) || '#contact';
      return `
      <section class="sf-section" id="cta">
        <div class="sf-container sf-anim">
          <div class="sf-cta-banner"${editAttr(opts, 'ctaButtonText', 7)}>
            <div>
              <${headingTag}>${heading}</${headingTag}>
              ${subheading ? `<p>${subheading}</p>` : ''}
            </div>
            <a class="sf-btn sf-cta-btn" href="${escapeHTML(href)}">${escapeHTML((state.ctaButtonText || 'Get Started').trim())}</a>
          </div>
        </div>
      </section>`;
    }

    default:
      return '';
  }
}

function renderContact(state, opts, { headingTag = 'h2' } = {}) {
  const email = (state.contactEmail || '').trim();
  const phone = (state.contactPhone || '').trim();
  const phoneClean = phone.replace(/[^\d+]/g, '');
  const address = (state.contactAddress || '').trim();
  const hours = (state.workingHours || '').trim();
  const wa = cleanWhatsAppDigits(state.whatsappNumber || '');
  const waText = encodeURIComponent((state.whatsappMessage || 'Hello!').trim());
  const waHref = wa ? `https://wa.me/${wa}?text=${waText}` : '';

  const infoItems = [];
  if (email) {
    infoItems.push(
      `<li><span class="sf-contact-lbl">Email</span>${
        state.enableClickToEmail
          ? `<a class="sf-contact-val" href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a>`
          : `<span class="sf-contact-val">${escapeHTML(email)}</span>`
      }</li>`
    );
  }
  if (phone) {
    infoItems.push(
      `<li><span class="sf-contact-lbl">Phone</span>${
        state.enableClickToCall
          ? `<a class="sf-contact-val" href="tel:${escapeHTML(phoneClean)}">${escapeHTML(phone)}</a>`
          : `<span class="sf-contact-val">${escapeHTML(phone)}</span>`
      }</li>`
    );
  }
  if (wa) {
    infoItems.push(
      `<li><span class="sf-contact-lbl">WhatsApp</span><a class="sf-contact-val" href="${escapeHTML(waHref)}" target="_blank" rel="noopener noreferrer">+${escapeHTML(wa)}</a></li>`
    );
  }
  if (address) {
    infoItems.push(`<li><span class="sf-contact-lbl">Address</span><span class="sf-contact-val">${escapeHTML(address)}</span></li>`);
  }
  if (hours) {
    infoItems.push(`<li><span class="sf-contact-lbl">Working Hours</span><span class="sf-contact-val">${escapeHTML(hours)}</span></li>`);
  }
  if (!infoItems.length) {
    infoItems.push(
      `<li><span class="sf-contact-lbl">Email</span><span class="sf-contact-val">hello@studio.example</span></li>`,
      `<li><span class="sf-contact-lbl">Availability</span><span class="sf-contact-val">Mon – Fri · Open for new inquiries</span></li>`
    );
  }

  // Action pills: Save Contact (.vcf), Get Directions (geo:/maps), UPI Pay
  const actionButtons = [];
  if (state.vcardEnabled && (email || phone || state.siteName)) {
    actionButtons.push(`<button type="button" id="sf-vcard-btn" class="sf-btn sf-btn-sm sf-btn-secondary">Save Contact (.vcf)</button>`);
  }
  if (state.directionsEnabled && address) {
    const dirHref = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    actionButtons.push(`<a class="sf-btn sf-btn-sm sf-btn-secondary" href="${escapeHTML(dirHref)}" target="_blank" rel="noopener noreferrer">Get Directions</a>`);
  }

  // Phase B3: UPI Pay block
  let upiBlock = '';
  if (state.upiEnabled && isValidUpiId(state.upiId)) {
    const upiUri = buildUpiUri({
      pa: state.upiId,
      pn: state.siteName || 'Merchant',
      am: state.upiAmount,
      tn: state.upiNote || 'Payment',
    });
    if (upiUri) {
      const qrSvg = renderQrSvg(upiUri, { sizePx: 148, fg: '#111111', bg: '#ffffff', label: `UPI QR code for ${state.siteName || state.upiId}` });
      upiBlock = `
      <div class="sf-upi-box">
        <div class="sf-upi-qr">${qrSvg}</div>
        <div class="sf-upi-meta">
          <span class="sf-kicker" style="margin-bottom:0.25rem;">UPI Payment (INR)</span>
          <p class="sf-muted-sm" style="margin-bottom:0.5rem;">UPI ID: <strong>${escapeHTML(state.upiId)}</strong>${state.upiAmount ? ` · ₹${escapeHTML(state.upiAmount)}` : ''}</p>
          <a class="sf-btn sf-btn-sm" href="${escapeHTML(upiUri)}">Pay via UPI App</a>
          <p class="sf-muted-sm" style="margin-top:0.45rem;font-size:0.75rem;">Payment happens directly inside your UPI app. This website never handles or stores money.</p>
        </div>
      </div>`;
    }
  }

  const staticMapHtml = state.showStaticMap
    ? `<div class="sf-static-map" role="img" aria-label="Location map card for ${escapeHTML(address || state.siteName || 'our studio')}">
        <div class="sf-map-pin">${renderIcon('map-pin', 22)}</div>
        <div class="sf-map-label">${escapeHTML(address || 'Studio Appointments · Available Worldwide')}</div>
      </div>`
    : '';

  const infoCard = `<div class="sf-card sf-contact-info"${editAttr(opts, 'contactEmail', 8)}>
    <p class="sf-kicker">Contact</p>
    <${headingTag}>Get in Touch</${headingTag}>
    <address style="font-style:normal;"><ul class="sf-contact-list">${infoItems.join('')}</ul></address>
    ${actionButtons.length ? `<div class="sf-contact-actions">${actionButtons.join('')}</div>` : ''}
    ${upiBlock}
    ${staticMapHtml}
  </div>`;

  const chosen = new Set(Array.isArray(state.contactFormFields) ? state.contactFormFields : ['name', 'email', 'message']);
  const dropdownOpts = String(state.contactDropdownOptions || 'General Inquiry, Support')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const formMode = state.contactFormMode === 'endpoint' && isValidHttpsUrl(state.contactFormEndpoint) ? 'endpoint' : 'mailto';

  const formCard =
    state.contactFormEnabled && state.contactLayout !== 'cards-only'
      ? `<form class="sf-card sf-contact-form" id="sf-contact-form" data-mode="${formMode}" data-endpoint="${escapeHTML(formMode === 'endpoint' ? state.contactFormEndpoint : '')}" data-mailto="${escapeHTML(email)}" data-success="${escapeHTML(state.contactSuccessText || 'Message sent.')}">
          <h3>Send a Message</h3>
          <div class="sf-hp" aria-hidden="true"><label for="sf-hp-field">Leave blank</label><input id="sf-hp-field" name="_gotcha" type="text" tabindex="-1" autocomplete="off" /></div>
          ${chosen.has('name') ? `<label class="sf-fl">Name<input type="text" name="name" required placeholder="Your name" /></label>` : ''}
          ${chosen.has('email') ? `<label class="sf-fl">Email<input type="email" name="email" required placeholder="you@domain.com" /></label>` : ''}
          ${chosen.has('phone') ? `<label class="sf-fl">Phone<input type="tel" name="phone" placeholder="+1 555 000 0000" /></label>` : ''}
          ${chosen.has('subject') ? `<label class="sf-fl">Subject<input type="text" name="subject" placeholder="How can we help?" /></label>` : ''}
          ${chosen.has('dropdown') ? `<label class="sf-fl">Topic<select name="topic">${dropdownOpts.map((o) => `<option>${escapeHTML(o)}</option>`).join('')}</select></label>` : ''}
          ${chosen.has('message') ? `<label class="sf-fl">Message<textarea name="message" rows="4" required placeholder="Tell us about your project or question..."></textarea></label>` : ''}
          ${chosen.has('checkbox') ? `<label class="sf-check-fl"><input type="checkbox" name="consent" required /><span>${escapeHTML(state.contactCheckboxLabel || 'I agree to be contacted.')}</span></label>` : ''}
          <button type="submit" class="sf-btn">${escapeHTML((state.contactButtonLabel || 'Send Message').trim())}</button>
          <p class="sf-muted-sm" id="sf-contact-status" aria-live="polite"></p>
        </form>`
      : '';

  const gridClass = `sf-contact-grid sf-contact-${escapeHTML(state.contactLayout || 'form-right')}`;

  return `
  <section class="sf-section" id="contact">
    <div class="sf-container sf-anim">
      <div class="${gridClass}">
        ${state.contactLayout === 'form-left' ? `${formCard}${infoCard}` : `${infoCard}${formCard}`}
      </div>
    </div>
  </section>`;
}

function renderBlogListSection(state, opts) {
  const posts = (state.blogPosts || []).filter((p) => String(p?.title || '').trim());
  return `
  <section class="sf-section" id="blog">
    <div class="sf-container sf-anim">
      <div class="sf-sec-head">
        <p class="sf-kicker">Blog &amp; News</p>
        <h1>Latest Articles</h1>
        <p class="sf-sec-sub">Updates, notes, and stories from ${escapeHTML(state.siteName || 'our team')}.</p>
      </div>
      ${
        posts.length
          ? `<div class="sf-grid sf-cols-2">
              ${posts
                .map((post, idx) => {
                  const slug = `post-${slugifyName(post.slug || post.title || `article-${idx + 1}`)}`;
                  return `<article class="sf-card sf-project-card">
                    ${post.date ? `<p class="sf-kicker">${escapeHTML(post.date)}</p>` : ''}
                    <h2><a href="${escapeHTML(slug)}.html">${escapeHTML(post.title)}</a></h2>
                    ${post.summary ? `<p>${escapeHTML(post.summary)}</p>` : ''}
                    <a class="sf-card-link" href="${escapeHTML(slug)}.html">Read Article &rarr;</a>
                  </article>`;
                })
                .join('\n')}
            </div>`
          : `<div class="sf-card"><p>No blog posts yet. Add up to 20 posts in Step 5 to populate your blog.</p></div>`
      }
    </div>
  </section>`;
}

function renderBlogPostSection(post, state) {
  return `
  <section class="sf-section" id="article">
    <div class="sf-container sf-anim">
      <p class="sf-kicker"><a href="blog.html">&larr; Back to Blog</a>${post.date ? ` · ${escapeHTML(post.date)}` : ''}</p>
      <h1>${escapeHTML(post.title)}</h1>
      ${post.summary ? `<p class="sf-hero-sub">${escapeHTML(post.summary)}</p>` : ''}
      <article class="sf-prose" style="margin-top:1.75rem;">${formatSafeRichText(post.body || post.summary || '')}</article>
    </div>
  </section>`;
}

function renderCustomOrLegalPageSection(pageMeta) {
  return `
  <section class="sf-section" id="page-content">
    <div class="sf-container sf-anim">
      <div class="sf-sec-head">
        <p class="sf-kicker">${escapeHTML(pageMeta.pageType === 'legal' ? 'Legal Notice' : 'Page')}</p>
        <h1>${escapeHTML(pageMeta.title)}</h1>
      </div>
      <article class="sf-card sf-prose">${formatSafeRichText(pageMeta.customBody || 'Edit this page content in Step 5.')}</article>
    </div>
  </section>`;
}

function renderSocialRow(state, compact = false) {
  const entries = Object.entries(state.socialLinks || {})
    .map(([id, rawUrl]) => ({ id, url: sanitizeUrl(rawUrl, { allowAnchor: false }), meta: SOCIAL_META_MAP[id] }))
    .filter((e) => e.url && e.meta);

  if (!entries.length) return '';

  const styleCls = `sf-social-${escapeHTML(state.socialIconStyle || 'circle')}`;
  return `<div class="sf-social-row ${styleCls}" aria-label="Social links">
    ${entries
      .map(
        (e) =>
          `<a class="sf-social-btn" href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(e.meta.label)}" title="${escapeHTML(e.meta.label)}">${renderSocialIcon(e.id, compact ? 15 : 17)}</a>`
      )
      .join('')}
  </div>`;
}

function renderFooter(state, opts) {
  const siteName = escapeHTML(tx(state, 'siteName', '', opts).trim() || 'Studio Atelier');
  const footerText = tx(state, 'footerText', '', opts).trim() || 'Crafted with editorial clarity and timeless proportion.';
  const year = new Date().getFullYear();
  const copyrightRaw = (state.copyrightText || '').trim();
  const copyrightLine = copyrightRaw
    ? escapeHTML(copyrightRaw)
    : `${state.autoCopyrightYear ? `© ${year} ` : ''}${siteName}. All rights reserved.`;

  const linkGroups = (state.footerLinkGroups || []).filter(
    (g) => (g?.title || '').trim() || (g?.links || []).some((l) => l?.label?.trim())
  );

  // Append extra footer pages & enabled legal pages automatically
  const extraLinks = [];
  if (state.siteStructure === 'multi') {
    for (const fp of (state.footerPages || []).slice(0, 6)) {
      if ((fp?.title || '').trim()) {
        extraLinks.push({ label: fp.title.trim(), url: `${slugifyName(fp.slug || fp.title)}.html` });
      }
    }
  }
  if (state.legalPages && typeof state.legalPages === 'object') {
    for (const lp of LEGAL_PAGE_TYPES) {
      if (state.legalPages[lp.id]) {
        extraLinks.push({ label: lp.label, url: `${lp.slug}.html` });
      }
    }
  }

  const allGroups = [...linkGroups];
  if (extraLinks.length) {
    allGroups.push({ title: 'Information', links: extraLinks });
  }

  const groupsHtml =
    allGroups.length && state.footerStyle !== 'minimal'
      ? `<div class="sf-footer-cols">${allGroups
          .map(
            (g) => `<div class="sf-footer-col">
            <h4>${escapeHTML(g.title || 'Links')}</h4>
            <ul>${(g.links || [])
              .filter((l) => (l?.label || '').trim())
              .map((l) => {
                const href = sanitizeUrl(l.url || '#top', { allowAnchor: true }) || '#top';
                const isExt = /^https?:\/\//i.test(href);
                return `<li><a href="${escapeHTML(href)}"${isExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHTML(l.label)}</a></li>`;
              })
              .join('')}</ul>
          </div>`
          )
          .join('')}</div>`
      : '';

  const waDigits = cleanWhatsAppDigits(state.whatsappNumber || '');
  const waFloatHtml =
    state.whatsappFloatEnabled && waDigits
      ? `<a class="sf-wa-float" href="https://wa.me/${escapeHTML(waDigits)}?text=${encodeURIComponent((state.whatsappMessage || 'Hello!').trim())}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">${renderSocialIcon('whatsapp', 22)}</a>`
      : '';

  const a11yWidgetHtml = state.a11yWidgetEnabled
    ? `<div class="sf-a11y-widget" aria-label="Accessibility controls">
        <button type="button" id="sf-a11y-dec" class="sf-a11y-btn" title="Decrease text size" aria-label="Decrease text size">A-</button>
        <button type="button" id="sf-a11y-inc" class="sf-a11y-btn" title="Increase text size" aria-label="Increase text size">A+</button>
        <button type="button" id="sf-a11y-hc" class="sf-a11y-btn" aria-pressed="false" title="Toggle high contrast">Contrast</button>
        <button type="button" id="sf-a11y-rm" class="sf-a11y-btn" aria-pressed="false" title="Reduce motion">Motion</button>
      </div>`
    : '';

  const consentBannerHtml =
    state.analyticsProvider && state.analyticsProvider !== 'none' && isValidAnalyticsConfig(state.analyticsProvider, state.analyticsId)
      ? `<div id="sf-consent-banner" class="sf-consent-banner" role="dialog" aria-label="Analytics consent" hidden>
          <p>This site uses optional privacy-friendly analytics (${escapeHTML(state.analyticsProvider.toUpperCase())}). Allow anonymous visit statistics?</p>
          <div class="sf-consent-actions">
            <button type="button" id="sf-consent-decline" class="sf-btn sf-btn-sm sf-btn-secondary">Decline</button>
            <button type="button" id="sf-consent-accept" class="sf-btn sf-btn-sm">Accept</button>
          </div>
        </div>`
      : '';

  return `
  <footer class="sf-footer sf-footer-${escapeHTML(state.footerStyle || 'multi-column')}">
    <div class="sf-container sf-footer-inner">
      <div class="sf-footer-brand"${editAttr(opts, 'footerText', 9)}>
        <strong>${siteName}</strong>
        ${footerText ? `<p${i18nDataAttr(state, 'footerText')}>${escapeHTML(footerText)}</p>` : ''}
        ${renderSocialRow(state)}
      </div>
      ${groupsHtml}
    </div>
    <div class="sf-container sf-footer-bottom">
      <span>${copyrightLine}</span>
      ${state.showSiteForgeCredit ? '<span class="sf-credit">Made with SiteForge</span>' : ''}
    </div>
  </footer>
  ${a11yWidgetHtml}
  ${waFloatHtml}
  ${consentBannerHtml}
  ${state.showBackToTop ? '<a href="#top" id="sf-back-top" class="sf-back-top" aria-label="Back to top">&uarr;</a>' : ''}`;
}

function renderOrderedSections(state, opts) {
  const divider = renderSectionDivider(state.dividerStyle);
  const order = Array.isArray(state.sectionOrder) ? state.sectionOrder : [];
  const blocks = order
    .map((secId) => renderExtraSection(secId, state, opts))
    .filter(Boolean);
  return blocks.join(divider);
}

/* ==========================================================================
   4. Shared CSS & Runtime JS Builders (Supports inline OR external assets/)
   ========================================================================== */

export function buildSharedCss(state, theme, layoutCss = '', { previewMode = false } = {}) {
  const previewCss = previewMode
    ? `
    [data-sf-field] { position: relative; cursor: pointer; transition: outline-color 0.12s ease; }
    [data-sf-field]:hover { outline: 2px dashed var(--primary); outline-offset: 4px; border-radius: 4px; }
    [data-sf-field]:hover::after {
      content: "Edit"; position: absolute; top: -22px; inset-inline-end: 0;
      background: var(--primary); color: var(--btn-text); font-size: 11px; font-weight: 700;
      font-family: system-ui, sans-serif; padding: 2px 7px; border-radius: 4px;
      pointer-events: none; z-index: 95; line-height: 1.4; letter-spacing: 0.03em;
    }
    `
    : '';

  return `${buildThemeStyleBlock(state, theme)}

    *, *::before, *::after { box-sizing: border-box; }
    html {
      scroll-behavior: smooth;
      scroll-padding-top: ${state.headerStyle === 'sticky' ? '78px' : '16px'};
      font-size: var(--base-size);
    }
    body {
      margin: 0;
      font-family: var(--font-body);
      background-color: var(--bg);
      color: var(--text);
      line-height: var(--line-height);
      ${buildBackgroundPatternCss(state.backgroundStyle)}
      -webkit-font-smoothing: antialiased;
    }

    a { color: var(--primary); text-decoration: none; min-height: 24px; }
    a:hover { text-decoration: underline; }
    a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    button, .sf-btn, .sf-nav-link, .sf-social-btn, .sf-icon-btn { min-width: 24px; min-height: 24px; }

    .sf-sr-only, .sf-hp { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
    .sf-skip-link {
      position:absolute; left:-9999px; top:0; padding:0.65rem 1rem;
      background:var(--primary); color:var(--btn-text); font-weight:600; z-index:999;
    }
    .sf-skip-link:focus { left:0.75rem; top:0.75rem; border-radius:6px; }

    .sf-container { width: 100%; max-width: var(--container-max); margin: 0 auto; padding: 0 1.5rem; }
    .sf-section { padding: var(--sec-pad) 0; border-top: 1px solid var(--border); }
    .sf-kicker { font-size: 0.76rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--primary); margin: 0 0 0.55rem 0; }
    .sf-sec-head { margin-bottom: 1.75rem; max-width: 66ch; }
    .sf-sec-sub { margin-top: 0.45rem; }

    h1, h2, h3, h4 { font-family: var(--font-heading); font-weight: var(--heading-weight); margin: 0; line-height: 1.18; letter-spacing: -0.02em; color: var(--text); }
    h1 { font-size: var(--hero-h1-size); text-wrap: balance; }
    h2 { font-size: clamp(1.45rem, 2.8vw, 2.15rem); margin-bottom: 0.65rem; }
    h3 { font-size: 1.12rem; margin-bottom: 0.4rem; }
    p { margin: 0 0 0.9rem 0; color: var(--muted); }
    p:last-child { margin-bottom: 0; }
    .sf-muted-sm { font-size: 0.84rem; color: var(--muted); }

    .sf-align-left { text-align: start; }
    .sf-align-center { text-align: center; }
    .sf-align-center .sf-hero-actions, .sf-align-center .sf-highlights { justify-content: center; }
    .sf-align-center .sf-hero-sub, .sf-align-center .sf-sec-head, .sf-align-center .sf-prose { margin-inline: auto; }
    .sf-align-right { text-align: end; }
    .sf-align-right .sf-hero-actions { justify-content: flex-end; }

    /* Buttons (6 styles) */
    .sf-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
      padding: 0.72rem 1.35rem; border-radius: var(--btn-radius);
      font: inherit; font-weight: 600; font-size: 0.94rem; cursor: pointer;
      border: 1.5px solid var(--primary); background: var(--primary); color: var(--btn-text);
      transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
    }
    .sf-btn:hover { text-decoration: none; opacity: 0.92; transform: translateY(-1px); }
    .sf-btn-sm { padding: 0.45rem 0.9rem; font-size: 0.84rem; }
    .sf-btn-secondary { background: transparent; color: var(--text); border-color: var(--border); }
    .sf-btn-secondary:hover { background: var(--card); border-color: var(--primary); }
    body.sf-btnstyle-outline .sf-btn:not(.sf-btn-secondary) { background: transparent; color: var(--primary); }
    body.sf-btnstyle-soft .sf-btn:not(.sf-btn-secondary) { background: color-mix(in srgb, var(--primary) 15%, var(--bg)); color: var(--primary); border-color: transparent; }
    body.sf-btnstyle-gradient .sf-btn:not(.sf-btn-secondary) { background: linear-gradient(135deg, var(--primary), var(--accent)); border-color: transparent; }
    body.sf-btnstyle-3d .sf-btn:not(.sf-btn-secondary) { box-shadow: 0 4px 0 color-mix(in srgb, var(--primary) 65%, #000); }
    body.sf-btnstyle-3d .sf-btn:not(.sf-btn-secondary):active { transform: translateY(2px); box-shadow: 0 1px 0 color-mix(in srgb, var(--primary) 65%, #000); }

    /* Cards (5 styles) */
    .sf-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1.45rem; box-shadow: var(--shadow);
    }
    body.sf-cardstyle-flat .sf-card, .sf-card-flat { border-color: transparent; box-shadow: none; }
    body.sf-cardstyle-bordered .sf-card, .sf-card-bordered { box-shadow: none; }
    body.sf-cardstyle-shadow .sf-card, .sf-card-shadow { border-color: transparent; box-shadow: 0 10px 28px rgba(0,0,0,0.09); }
    body.sf-cardstyle-glass .sf-card, .sf-card-glass { background: color-mix(in srgb, var(--card) 72%, transparent); backdrop-filter: blur(10px); }
    body.sf-cardstyle-neumorphic .sf-card, .sf-card-neumorphic { border-color: transparent; box-shadow: 6px 6px 14px rgba(0,0,0,0.08), -4px -4px 12px rgba(255,255,255,0.45); }

    /* Header & Menu */
    .sf-header { background: var(--bg); border-bottom: 1px solid var(--border); z-index: 40; }
    .sf-header-sticky { position: sticky; top: 0; }
    .sf-header-transparent { position: absolute; left: 0; right: 0; top: 0; background: transparent; border-bottom-color: transparent; }
    .sf-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 0.85rem; padding-bottom: 0.85rem; position: relative; }
    .sf-header-centered .sf-header-inner, .sf-logo-center .sf-header-inner { flex-direction: column; text-align: center; }
    .sf-header-split .sf-nav { margin: 0 auto; }
    .sf-brand { display: inline-flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1.08rem; color: var(--text); }
    .sf-brand:hover { text-decoration: none; }
    .sf-brand-mark { display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--primary); color: var(--btn-text); font-weight: 700; flex-shrink: 0; }
    .sf-nav { display: flex; align-items: center; gap: 0.5rem 1.2rem; flex-wrap: wrap; }
    .sf-nav-align-left { margin-inline-end: auto; }
    .sf-nav-align-center { margin-inline: auto; }
    .sf-nav-align-right { margin-inline-start: auto; }
    .sf-nav-link { color: var(--muted); font-size: 0.92rem; font-weight: 500; padding: 0.38rem 0.55rem; border-radius: 6px; transition: color 0.15s ease, background-color 0.15s ease; }
    .sf-nav-link:hover, .sf-nav-link.is-current { color: var(--primary); text-decoration: none; font-weight: 600; }
    .sf-menu-underline .sf-nav-link:hover, .sf-menu-underline .sf-nav-link.is-current { box-shadow: inset 0 -2px 0 var(--primary); border-radius: 0; }
    .sf-menu-pill .sf-nav-link { border-radius: 999px; padding: 0.38rem 0.85rem; }
    .sf-menu-pill .sf-nav-link:hover, .sf-menu-pill .sf-nav-link.is-current { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .sf-menu-boxed .sf-nav-link { border: 1px solid var(--border); background: var(--card); padding: 0.35rem 0.75rem; }
    .sf-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .sf-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 36px; height: 36px; padding: 0 0.65rem; border-radius: 8px;
      border: 1px solid var(--border); background: var(--card); color: var(--text);
      font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer;
    }
    .sf-menu-btn { display: none; }

    /* Hero & Decorative Visuals */
    .sf-hero { min-height: var(--hero-min-h); display: flex; align-items: center; padding: calc(var(--sec-pad) + 1rem) 0 var(--sec-pad); }
    .sf-hero-bg-gradient { background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--bg)), color-mix(in srgb, var(--accent) 12%, var(--bg))); }
    .sf-hero-bg-pattern { background-image: radial-gradient(color-mix(in srgb, var(--primary) 18%, transparent) 1.2px, transparent 1.2px); background-size: 20px 20px; }
    .sf-hero-has-bgimg h1, .sf-hero-has-bgimg p, .sf-hero-has-bgimg .sf-hero-badge { color: #ffffff; }
    .sf-hero-inner { display: grid; gap: 2rem; align-items: center; }
    .sf-hero-split .sf-hero-inner { grid-template-columns: 1.15fr 0.85fr; text-align: start; }
    .sf-hero-badge { display: inline-block; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--primary); margin-bottom: 0.75rem; }
    .sf-hero-sub { font-size: 1.1rem; max-width: 58ch; margin-top: 1rem; }
    .sf-hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.65rem; }
    .sf-hero-media, .sf-about-media { display: flex; justify-content: center; }
    .sf-deco-visual svg { width: 100%; max-width: 400px; height: auto; display: block; }
    .sf-hero-showcase { min-height: 240px; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }

    /* 6 Image Shapes */
    .sf-shaped-img { width: 100%; max-width: 440px; height: auto; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
    .sf-shape-square { border-radius: 0; }
    .sf-shape-rounded { border-radius: calc(var(--radius) + 6px); }
    .sf-shape-circle { aspect-ratio: 1 / 1; border-radius: 50%; }
    .sf-shape-blob { aspect-ratio: 1 / 1; border-radius: 44% 56% 62% 38% / 44% 36% 64% 56%; }
    .sf-shape-arch { border-radius: 220px 220px 12px 12px; }
    .sf-shape-hexagon { aspect-ratio: 1 / 1; clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%); }

    /* About */
    .sf-about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.25rem; align-items: center; }
    .sf-about-pos-top { grid-template-columns: 1fr; }
    .sf-prose { max-width: 68ch; }
    .sf-highlights { list-style: none; padding: 0; margin: 1.25rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.65rem; }
    .sf-highlights li { display: flex; align-items: center; gap: 0.55rem; font-weight: 500; color: var(--text); }
    .sf-hi-icon { color: var(--primary); display: inline-flex; flex-shrink: 0; }
    .sf-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 2rem; }
    .sf-stat { text-align: center; padding: 1.15rem; }
    .sf-stat-num { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .sf-stat-label { font-size: 0.84rem; color: var(--muted); margin-top: 0.2rem; }

    /* Grids & Cards */
    .sf-grid { display: grid; gap: var(--grid-gap); }
    .sf-cols-1 { grid-template-columns: 1fr; }
    .sf-cols-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .sf-cols-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .sf-cols-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .sf-icon-badge { width: 42px; height: 42px; border-radius: 10px; background: color-mix(in srgb, var(--primary) 13%, var(--bg)); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem; }
    .sf-card-img { width: 100%; height: 170px; object-fit: cover; border-radius: calc(var(--radius) * 0.7); margin-bottom: 0.9rem; display: block; }
    .sf-card-top-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.35rem; }
    .sf-price-tag { font-weight: 700; color: var(--primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .sf-card-link { display: inline-block; margin-top: 0.65rem; font-weight: 600; font-size: 0.9rem; }

    /* Extra Sections */
    .sf-quote-card { margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .sf-stars { color: var(--primary); letter-spacing: 0.1em; font-size: 0.95rem; }
    .sf-quote-text { color: var(--text); font-size: 1.02rem; }
    .sf-quote-author { font-size: 0.86rem; color: var(--muted); margin-top: auto; }
    .sf-pricing-card { display: flex; flex-direction: column; gap: 0.85rem; }
    .sf-pricing-card.is-highlighted { border: 2px solid var(--primary); }
    .sf-plan-price { display: flex; align-items: baseline; gap: 0.25rem; }
    .sf-plan-price strong { font-size: 2rem; font-variant-numeric: tabular-nums; }
    .sf-plan-features { list-style: none; padding: 0; margin: 0 0 auto; display: grid; gap: 0.45rem; color: var(--muted); font-size: 0.92rem; }
    .sf-plan-features li::before { content: "✓ "; color: var(--primary); font-weight: 700; }
    .sf-team-card { text-align: center; }
    .sf-team-photo, .sf-team-avatar { width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 0.85rem; object-fit: cover; display: flex; align-items: center; justify-content: center; background: var(--primary); color: var(--btn-text); font-weight: 700; font-size: 1.35rem; }
    .sf-faq-list { display: grid; gap: 0.75rem; max-width: 780px; }
    .sf-faq-item summary { cursor: pointer; font-weight: 600; color: var(--text); list-style: none; display: flex; justify-content: space-between; align-items: center; min-height: 28px; }
    .sf-faq-item summary::after { content: "+"; font-weight: 700; color: var(--primary); font-size: 1.2rem; }
    .sf-faq-item[open] summary::after { content: "−"; }
    .sf-faq-item p { margin-top: 0.75rem; }
    .sf-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 1rem; }
    .sf-gallery-item { margin: 0; padding: 0.5rem; }
    .sf-gallery-btn { border: none; padding: 0; background: none; width: 100%; cursor: pointer; display: block; }
    .sf-gallery-btn img { width: 100%; height: auto; aspect-ratio: 4/3; object-fit: cover; border-radius: calc(var(--radius) * 0.6); display: block; }
    .sf-gallery-item figcaption { font-size: 0.82rem; color: var(--muted); padding: 0.45rem 0.25rem 0.15rem; }
    .sf-timeline-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
    .sf-timeline-item { display: flex; align-items: flex-start; gap: 1.15rem; }
    .sf-timeline-step { font-family: ui-monospace, monospace; font-weight: 700; color: var(--primary); font-size: 0.95rem; padding-top: 0.15rem; flex-shrink: 0; }
    .sf-partners-row { display: flex; flex-wrap: wrap; gap: 1rem 2.25rem; align-items: center; }
    .sf-partner-name { font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem; color: var(--muted); letter-spacing: 0.02em; }
    .sf-newsletter-card { display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.5rem; align-items: center; }
    .sf-newsletter-form { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
    .sf-newsletter-form input { flex: 1; min-width: 190px; padding: 0.7rem 0.9rem; border-radius: var(--btn-radius); border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; }
    .sf-cta-banner { background: var(--primary); color: var(--btn-text); border-radius: calc(var(--radius) + 4px); padding: 2.25rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.25rem; }
    .sf-cta-banner h2, .sf-cta-banner p { color: var(--btn-text); margin: 0; }
    .sf-cta-banner p { opacity: 0.88; margin-top: 0.35rem; }
    .sf-cta-btn { background: var(--btn-text); color: var(--primary); border-color: var(--btn-text); }

    /* Contact, UPI & Conversion Widgets */
    .sf-contact-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 1.5rem; align-items: start; }
    .sf-contact-stacked, .sf-contact-cards-only { grid-template-columns: 1fr; max-width: 760px; }
    .sf-contact-list { list-style: none; padding: 0; margin: 1.15rem 0 0; display: grid; gap: 0.8rem; }
    .sf-contact-list li { display: flex; flex-direction: column; gap: 0.12rem; }
    .sf-contact-lbl { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
    .sf-contact-val { font-weight: 500; color: var(--text); word-break: break-word; }
    .sf-contact-actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 1.15rem; }
    .sf-upi-box { margin-top: 1.25rem; padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .sf-upi-qr { background: #fff; padding: 6px; border-radius: 8px; border: 1px solid #e5e7eb; flex-shrink: 0; }
    .sf-upi-meta { flex: 1; min-width: 180px; }
    .sf-static-map { margin-top: 1.25rem; padding: 1.5rem; border-radius: var(--radius); border: 1px dashed var(--border); background: repeating-linear-gradient(0deg, transparent, transparent 19px, color-mix(in srgb, var(--border) 45%, transparent) 19px, color-mix(in srgb, var(--border) 45%, transparent) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, color-mix(in srgb, var(--border) 45%, transparent) 19px, color-mix(in srgb, var(--border) 45%, transparent) 20px), var(--bg); display: flex; flex-direction: column; align-items: center; gap: 0.4rem; text-align: center; }
    .sf-map-pin { color: var(--primary); }
    .sf-map-label { font-size: 0.86rem; font-weight: 600; color: var(--text); }
    .sf-contact-form { display: flex; flex-direction: column; gap: 0.85rem; }
    .sf-fl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.86rem; font-weight: 600; color: var(--text); }
    .sf-fl input, .sf-fl textarea, .sf-fl select { padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; font-weight: 400; }
    .sf-check-fl { display: flex; align-items: center; gap: 0.5rem; font-size: 0.86rem; color: var(--muted); }

    /* Footer, Social, WhatsApp Float, A11y Widget, Consent Banner */
    .sf-footer { border-top: 1px solid var(--border); padding: 2.5rem 0 1.75rem; }
    .sf-footer-dark { background: #111318; color: #e5e7eb; }
    .sf-footer-dark p, .sf-footer-dark a, .sf-footer-dark span, .sf-footer-dark h4, .sf-footer-dark strong { color: #e5e7eb; }
    .sf-footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
    .sf-footer-centered .sf-footer-inner, .sf-footer-centered .sf-footer-bottom { flex-direction: column; text-align: center; align-items: center; }
    .sf-footer-minimal .sf-footer-inner { border-bottom: none; padding-bottom: 0.75rem; }
    .sf-footer-cols { display: flex; flex-wrap: wrap; gap: 2.25rem; }
    .sf-footer-col h4 { font-size: 0.88rem; margin-bottom: 0.6rem; }
    .sf-footer-col ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.88rem; }
    .sf-footer-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; padding-top: 1.15rem; font-size: 0.84rem; color: var(--muted); }
    .sf-social-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .sf-social-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; color: var(--text); border: 1px solid var(--border); border-radius: 50%; transition: transform 0.15s ease; }
    .sf-social-btn:hover { transform: translateY(-2px); color: var(--primary); border-color: var(--primary); }
    .sf-social-plain .sf-social-btn { border: none; width: auto; height: auto; padding: 0.25rem; }
    .sf-social-square .sf-social-btn { border-radius: 6px; }
    .sf-back-top { position: fixed; inset-inline-end: 1.25rem; bottom: 1.25rem; width: 42px; height: 42px; border-radius: 50%; background: var(--primary); color: var(--btn-text); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: var(--shadow); z-index: 30; }
    .sf-wa-float { position: fixed; inset-inline-end: 1.25rem; bottom: 4.5rem; width: 48px; height: 48px; border-radius: 50%; background: #16a34a; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.22); z-index: 35; }
    .sf-wa-float:hover { transform: scale(1.06); text-decoration: none; }
    .sf-a11y-widget { position: fixed; inset-inline-start: 1rem; bottom: 1rem; display: flex; gap: 4px; background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 4px 6px; box-shadow: var(--shadow); z-index: 45; }
    .sf-a11y-btn { border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 999px; font: inherit; font-size: 0.74rem; font-weight: 700; padding: 4px 9px; cursor: pointer; }
    .sf-a11y-btn[aria-pressed="true"] { background: var(--primary); color: var(--btn-text); border-color: var(--primary); }
    .sf-consent-banner { position: fixed; left: 1rem; right: 1rem; bottom: 1rem; max-width: 560px; margin: 0 auto; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem; box-shadow: 0 12px 32px rgba(0,0,0,0.2); z-index: 80; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.85rem; }
    .sf-consent-banner[hidden] { display: none; }
    .sf-consent-banner p { margin: 0; font-size: 0.84rem; flex: 1; min-width: 200px; }
    .sf-consent-actions { display: flex; gap: 0.5rem; }
    .sf-divider svg { display: block; width: 100%; height: 36px; }

    /* Lightbox */
    .sf-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; padding: 1.5rem; z-index: 90; }
    .sf-lightbox[hidden] { display: none; }
    .sf-lightbox img { max-width: 92vw; max-height: 78vh; border-radius: 10px; }
    .sf-lightbox p { color: #ffffff; margin: 0; }
    .sf-lightbox button { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.4); color: #fff; font-size: 1.3rem; cursor: pointer; }

    /* Scroll Animations */
    body.sf-anim-fade-in .sf-anim, body.sf-anim-slide-up .sf-anim, body.sf-anim-zoom .sf-anim, body.sf-anim-stagger .sf-anim {
      opacity: 0; transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }
    body.sf-anim-slide-up .sf-anim, body.sf-anim-stagger .sf-anim { transform: translateY(16px); }
    body.sf-anim-zoom .sf-anim { transform: scale(0.97); }
    .sf-anim.is-visible, :root[data-reduce-motion="true"] .sf-anim { opacity: 1 !important; transform: none !important; }
    :root[data-reduce-motion="true"] * { transition: none !important; scroll-behavior: auto !important; }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      * { transition: none !important; }
      .sf-anim { opacity: 1 !important; transform: none !important; }
    }

    @media (max-width: 820px) {
      .sf-menu-btn { display: inline-flex; }
      .sf-nav { display: none; }
      .sf-nav.is-open { display: flex; flex-direction: column; align-items: flex-start; gap: 0.65rem; }
      .sf-nav.sf-mobile-dropdown.is-open { position: absolute; left: 0; right: 0; top: 100%; background: var(--card); border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; z-index: 50; }
      .sf-nav.sf-mobile-slide-in.is-open { position: fixed; top: 0; bottom: 0; inset-inline-end: 0; width: 260px; background: var(--card); border-inline-start: 1px solid var(--border); padding: 4.5rem 1.5rem 1.5rem; box-shadow: -8px 0 30px rgba(0,0,0,0.2); z-index: 60; }
      .sf-nav.sf-mobile-fullscreen.is-open { position: fixed; inset: 0; background: var(--bg); justify-content: center; align-items: center; font-size: 1.25rem; z-index: 60; }
      .sf-hero-split .sf-hero-inner, .sf-about-grid, .sf-contact-grid, .sf-newsletter-card { grid-template-columns: 1fr; }
    }

${layoutCss}
${previewCss}`;
}

export function buildSharedRuntimeJs(state, theme, { previewMode = false } = {}) {
  const defaultModeJs =
    state.darkModeDefault === 'dark'
      ? 'dark'
      : state.darkModeDefault === 'light'
      ? 'light'
      : theme.isDarkDefault
      ? 'dark'
      : 'light';

  const lang1 = SITE_LANGUAGES.find((l) => l.code === state.siteLanguage) || SITE_LANGUAGES[0];
  const lang2 = SITE_LANGUAGES.find((l) => l.code === state.secondLanguage) || SITE_LANGUAGES[1];

  const i18nPayload = state.bilingualEnabled
    ? {
        primary: {
          code: lang1.code,
          dir: lang1.dir,
          strings: {
            siteName: state.siteName || '',
            tagline: state.tagline || '',
            heroHeadline: state.heroHeadline || '',
            heroSubheadline: state.heroSubheadline || '',
            heroPrimaryBtnText: state.heroPrimaryBtnText || '',
            heroSecondaryBtnText: state.heroSecondaryBtnText || '',
            aboutHeading: state.aboutHeading || '',
            about: state.about || '',
            footerText: state.footerText || '',
          },
        },
        secondary: {
          code: lang2.code,
          dir: lang2.dir,
          strings: state.translations || {},
        },
      }
    : null;

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${(state.siteName || 'Contact').replace(/[\r\n]/g, ' ')}`,
    state.contactEmail ? `EMAIL:${state.contactEmail.replace(/[\r\n]/g, '')}` : '',
    state.contactPhone ? `TEL:${state.contactPhone.replace(/[\r\n]/g, '')}` : '',
    state.contactAddress ? `ADR:;;${state.contactAddress.replace(/[\r\n]/g, ' ')};;;;` : '',
    state.siteUrl ? `URL:${state.siteUrl.replace(/[\r\n]/g, '')}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');

  const analyticsCfg =
    !previewMode &&
    state.analyticsProvider &&
    state.analyticsProvider !== 'none' &&
    isValidAnalyticsConfig(state.analyticsProvider, state.analyticsId)
      ? { provider: state.analyticsProvider, id: state.analyticsId.trim() }
      : null;

  const previewBridgeJs = previewMode
    ? `
      // Preview Mode: Click-to-edit + Link interception (works in sandbox without allow-same-origin)
      document.addEventListener('click', function (ev) {
        var link = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (link) {
          var href = link.getAttribute('href') || '';
          if (/^[a-z0-9-]+\\.html$/i.test(href)) {
            ev.preventDefault();
            window.parent.postMessage({ type: 'SF_PREVIEW_NAV', slug: href.replace(/\\.html$/i, '') }, '*');
            return;
          }
          if (/^https?:\\/\\//i.test(href)) {
            ev.preventDefault();
            window.parent.postMessage({ type: 'SF_PREVIEW_EXTERNAL', url: href }, '*');
            return;
          }
        }
        var editEl = ev.target && ev.target.closest ? ev.target.closest('[data-sf-field]') : null;
        if (editEl) {
          ev.preventDefault();
          ev.stopPropagation();
          window.parent.postMessage({
            type: 'SF_EDIT_FIELD',
            field: editEl.getAttribute('data-sf-field'),
            stepIdx: Number(editEl.getAttribute('data-sf-step') || 0)
          }, '*');
        }
      }, true);
    `
    : '';

  return `(function () {
      var root = document.documentElement;
      var defaultMode = '${defaultModeJs}';
      var toggleBtn = document.getElementById('sf-theme-toggle');
      var menuBtn = document.getElementById('sf-menu-btn');
      var navPanel = document.getElementById('sf-nav-panel');

      function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
      function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

      function getMode() {
        var explicit = root.getAttribute('data-mode');
        if (explicit === 'dark' || explicit === 'light') return explicit;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return defaultMode;
      }

      function syncToggle() {
        if (!toggleBtn) return;
        var m = getMode();
        toggleBtn.setAttribute('aria-pressed', m === 'dark' ? 'true' : 'false');
        toggleBtn.textContent = m === 'dark' ? 'Light' : 'Dark';
      }

      var savedMode = safeGet('siteforge-visitor-mode');
      if ((savedMode === 'dark' || savedMode === 'light') && '${state.darkModeDefault}' === 'auto') {
        root.setAttribute('data-mode', savedMode);
      }
      syncToggle();

      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          var next = getMode() === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-mode', next);
          safeSet('siteforge-visitor-mode', next);
          syncToggle();
        });
      }

      if (menuBtn && navPanel) {
        menuBtn.addEventListener('click', function () {
          var open = navPanel.classList.toggle('is-open');
          menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        navPanel.addEventListener('click', function (ev) {
          if (ev.target && ev.target.tagName === 'A') {
            navPanel.classList.remove('is-open');
            menuBtn.setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Bilingual Switcher (Phase B4)
      var i18nData = ${i18nPayload ? serializeJsonForScriptTag(i18nPayload) : 'null'};
      var langBtn = document.getElementById('sf-lang-toggle');
      if (i18nData && langBtn) {
        var curLang = safeGet('siteforge-visitor-lang') || 'primary';
        function applyLang(which) {
          curLang = which === 'secondary' ? 'secondary' : 'primary';
          var pack = i18nData[curLang];
          var other = i18nData[curLang === 'primary' ? 'secondary' : 'primary'];
          root.lang = pack.code;
          root.dir = pack.dir;
          langBtn.textContent = other.code.toUpperCase();
          document.querySelectorAll('[data-sf-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-sf-i18n');
            var val = (pack.strings && pack.strings[key]) || (i18nData.primary.strings && i18nData.primary.strings[key]) || '';
            if (val) el.textContent = val;
          });
          safeSet('siteforge-visitor-lang', curLang);
        }
        if (curLang === 'secondary') applyLang('secondary');
        langBtn.addEventListener('click', function () {
          applyLang(curLang === 'primary' ? 'secondary' : 'primary');
        });
      }

      // Visitor Accessibility Widget (Phase B6)
      var a11yDec = document.getElementById('sf-a11y-dec');
      var a11yInc = document.getElementById('sf-a11y-inc');
      var a11yHc = document.getElementById('sf-a11y-hc');
      var a11yRm = document.getElementById('sf-a11y-rm');
      if (a11yDec && a11yInc) {
        var fontScale = Number(safeGet('sf-a11y-scale') || '100');
        function applyScale(s) {
          fontScale = Math.max(85, Math.min(130, s));
          root.style.fontSize = fontScale + '%';
          safeSet('sf-a11y-scale', String(fontScale));
        }
        if (fontScale !== 100) applyScale(fontScale);
        a11yDec.addEventListener('click', function () { applyScale(fontScale - 10); });
        a11yInc.addEventListener('click', function () { applyScale(fontScale + 10); });
      }
      if (a11yHc) {
        if (safeGet('sf-a11y-hc') === '1') {
          root.setAttribute('data-high-contrast', 'true');
          a11yHc.setAttribute('aria-pressed', 'true');
        }
        a11yHc.addEventListener('click', function () {
          var on = root.getAttribute('data-high-contrast') !== 'true';
          if (on) root.setAttribute('data-high-contrast', 'true'); else root.removeAttribute('data-high-contrast');
          a11yHc.setAttribute('aria-pressed', on ? 'true' : 'false');
          safeSet('sf-a11y-hc', on ? '1' : '0');
        });
      }
      if (a11yRm) {
        if (safeGet('sf-a11y-rm') === '1') {
          root.setAttribute('data-reduce-motion', 'true');
          a11yRm.setAttribute('aria-pressed', 'true');
        }
        a11yRm.addEventListener('click', function () {
          var on = root.getAttribute('data-reduce-motion') !== 'true';
          if (on) root.setAttribute('data-reduce-motion', 'true'); else root.removeAttribute('data-reduce-motion');
          a11yRm.setAttribute('aria-pressed', on ? 'true' : 'false');
          safeSet('sf-a11y-rm', on ? '1' : '0');
        });
      }

      // vCard Download (Phase B3)
      var vcardBtn = document.getElementById('sf-vcard-btn');
      if (vcardBtn) {
        vcardBtn.addEventListener('click', function () {
          var blob = new Blob([${serializeJsonForScriptTag(vcardLines)}], { type: 'text/vcard;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = ${serializeJsonForScriptTag(`${slugifyName(state.siteName || 'contact')}.vcf`)};
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
      }

      // Lightbox for Gallery images
      var lb = document.getElementById('sf-lightbox');
      var lbImg = document.getElementById('sf-lb-img');
      var lbCap = document.getElementById('sf-lb-cap');
      var lbClose = document.getElementById('sf-lb-close');
      document.querySelectorAll('[data-lightbox-src]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!lb || !lbImg) return;
          lbImg.src = btn.getAttribute('data-lightbox-src') || '';
          lbImg.alt = btn.getAttribute('data-lightbox-cap') || '';
          if (lbCap) lbCap.textContent = lbImg.alt;
          lb.hidden = false;
        });
      });
      if (lbClose && lb) {
        lbClose.addEventListener('click', function () { lb.hidden = true; });
        lb.addEventListener('click', function (ev) { if (ev.target === lb) lb.hidden = true; });
      }

      // Contact Form: Mailto OR HTTPS Endpoint with Honeypot + Offline Queue (Phase B3)
      var cForm = document.getElementById('sf-contact-form');
      if (cForm) {
        var QUEUE_KEY = 'sf-form-queue';
        var status = document.getElementById('sf-contact-status');
        function flushQueue() {
          var ep = cForm.getAttribute('data-endpoint') || '';
          if (!ep || !navigator.onLine) return;
          var raw = safeGet(QUEUE_KEY);
          if (!raw) return;
          try {
            var q = JSON.parse(raw);
            if (!Array.isArray(q) || !q.length) return;
            var remaining = [];
            Promise.all(q.map(function (item) {
              return fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(item) })
                .then(function (r) { if (!r.ok) remaining.push(item); })
                .catch(function () { remaining.push(item); });
            })).then(function () {
              safeSet(QUEUE_KEY, JSON.stringify(remaining));
              if (status && remaining.length === 0) status.textContent = 'Queued offline message sent automatically!';
            });
          } catch (e) {}
        }
        window.addEventListener('online', flushQueue);
        flushQueue();

        cForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var fd = new FormData(cForm);
          if (fd.get('_gotcha')) return; // Honeypot spam trap
          var mode = cForm.getAttribute('data-mode') || 'mailto';
          var ep = cForm.getAttribute('data-endpoint') || '';
          if (mode === 'endpoint' && ep) {
            var payload = {};
            fd.forEach(function (val, key) { if (key !== '_gotcha') payload[key] = String(val); });
            if (!navigator.onLine) {
              try {
                var cur = JSON.parse(safeGet(QUEUE_KEY) || '[]');
                cur.push(payload);
                safeSet(QUEUE_KEY, JSON.stringify(cur));
              } catch (e) {}
              if (status) status.textContent = 'You are offline. Message queued and will send automatically when back online.';
              cForm.reset();
              return;
            }
            if (status) status.textContent = 'Sending...';
            fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
              .then(function (r) {
                if (status) status.textContent = r.ok ? (cForm.getAttribute('data-success') || 'Message sent!') : 'Could not send message. Please email us directly.';
                if (r.ok) cForm.reset();
              })
              .catch(function () {
                try {
                  var cur2 = JSON.parse(safeGet(QUEUE_KEY) || '[]');
                  cur2.push(payload);
                  safeSet(QUEUE_KEY, JSON.stringify(cur2));
                } catch (e) {}
                if (status) status.textContent = 'Network unavailable. Message queued to send when online.';
              });
            return;
          }
          var to = cForm.getAttribute('data-mailto') || '';
          var subj = fd.get('subject') || fd.get('topic') || ('Message from ' + (fd.get('name') || 'Visitor'));
          var lines = [];
          fd.forEach(function (val, key) { if (val && key !== '_gotcha') lines.push(key + ': ' + val); });
          if (status) status.textContent = cForm.getAttribute('data-success') || 'Message prepared.';
          if (to) {
            var a = document.createElement('a');
            a.href = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(String(subj)) + '&body=' + encodeURIComponent(lines.join('\\n'));
            a.click();
          }
        });
      }

      // Newsletter Form
      var nForm = document.getElementById('sf-newsletter-form');
      if (nForm) {
        nForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var msg = document.getElementById('sf-nl-msg');
          if (msg) msg.textContent = 'Thanks for subscribing!';
          nForm.reset();
        });
      }

      // Consent-Gated Allowlisted Analytics (Phase B6)
      var analyticsCfg = ${analyticsCfg ? serializeJsonForScriptTag(analyticsCfg) : 'null'};
      var consentBanner = document.getElementById('sf-consent-banner');
      function loadAnalyticsScript(cfg) {
        if (!cfg || !cfg.id) return;
        var s = document.createElement('script');
        s.defer = true;
        if (cfg.provider === 'ga4') {
          s.async = true;
          s.src = 'https:' + '//www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.id);
          document.head.appendChild(s);
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push(['js', new Date()]);
          window.dataLayer.push(['config', cfg.id, { anonymize_ip: true }]);
        } else if (cfg.provider === 'plausible') {
          s.setAttribute('data-domain', cfg.id);
          s.src = 'https:' + '//plausible.io/js/script.js';
          document.head.appendChild(s);
        } else if (cfg.provider === 'cloudflare') {
          s.src = 'https:' + '//static.cloudflareinsights.com/beacon.min.js';
          s.setAttribute('data-cf-beacon', JSON.stringify({ token: cfg.id }));
          document.head.appendChild(s);
        }
      }
      if (analyticsCfg && consentBanner) {
        var choice = safeGet('sf-analytics-consent');
        if (choice === 'accepted') {
          loadAnalyticsScript(analyticsCfg);
        } else if (!choice) {
          consentBanner.hidden = false;
          var acc = document.getElementById('sf-consent-accept');
          var dec = document.getElementById('sf-consent-decline');
          if (acc) acc.addEventListener('click', function () {
            safeSet('sf-analytics-consent', 'accepted');
            consentBanner.hidden = true;
            loadAnalyticsScript(analyticsCfg);
          });
          if (dec) dec.addEventListener('click', function () {
            safeSet('sf-analytics-consent', 'declined');
            consentBanner.hidden = true;
          });
        }
      }

      // Offline-Ready Exported Website SW & Install Prompt (Phase B5)
      if (${state.makeSiteOffline && !previewMode ? 'true' : 'false'}) {
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
          navigator.serviceWorker.register('./sw.js').catch(function () {});
        }
        var instBtn = document.getElementById('sf-site-install');
        var deferredInstall = null;
        window.addEventListener('beforeinstallprompt', function (ev) {
          ev.preventDefault();
          deferredInstall = ev;
          if (instBtn) instBtn.hidden = false;
        });
        if (instBtn) {
          instBtn.addEventListener('click', function () {
            if (!deferredInstall) return;
            deferredInstall.prompt();
            deferredInstall = null;
            instBtn.hidden = true;
          });
        }
      }

      // Scroll Reveal Animations (honours prefers-reduced-motion)
      var anims = document.querySelectorAll('.sf-anim');
      if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en, idx) {
            if (en.isIntersecting) {
              setTimeout(function () { en.target.classList.add('is-visible'); }, idx * 60);
              io.unobserve(en.target);
            }
          });
        }, { threshold: 0.06 });
        anims.forEach(function (el) { io.observe(el); });
      } else {
        anims.forEach(function (el) { el.classList.add('is-visible'); });
      }
      ${previewBridgeJs}
    })();`;
}

/* ==========================================================================
   5. Complete HTML Document Wrapper (One-Page, Multi-Page, Preview, Export)
   ========================================================================== */

function wrapDocument({ state, theme, layoutId, layoutCss, bodyHtml, opts = {}, pageMeta = null }) {
  const activeLangCode = opts.langMode === 'secondary' && state.bilingualEnabled ? state.secondLanguage : state.siteLanguage;
  const langObj = SITE_LANGUAGES.find((l) => l.code === activeLangCode) || SITE_LANGUAGES[0];
  const baseSiteName = (state.siteName || '').trim() || 'SiteForge Site';
  const pageTitleRaw =
    pageMeta && pageMeta.slug !== 'index'
      ? `${pageMeta.title} — ${baseSiteName}`
      : (state.metaTitle || '').trim() || baseSiteName;

  const metaTitle = escapeHTML(pageTitleRaw);
  const metaDesc = escapeHTML(
    (pageMeta?.metaDescription || state.metaDescription || state.heroSubheadline || state.tagline || '').trim()
  );
  const metaKeywords = escapeHTML((state.metaKeywords || '').trim());
  const metaAuthor = escapeHTML((state.metaAuthor || '').trim());
  const baseUrl = (state.siteUrl || state.canonicalUrl || '').trim().replace(/\/+$/, '');
  const canonical =
    baseUrl && isValidHttpsUrl(baseUrl)
      ? pageMeta && pageMeta.slug !== 'index'
        ? `${baseUrl}/${pageMeta.filename}`
        : `${baseUrl}/`
      : sanitizeUrl(state.canonicalUrl || '', { allowAnchor: false });

  const ogTitle = escapeHTML((state.ogTitle || '').trim() || pageTitleRaw);
  const ogDesc = escapeHTML((state.ogDescription || '').trim() || (state.metaDescription || state.heroSubheadline || '').trim());
  const ogImg = opts.ogImagePath || resolveImg(state.ogImageDataUrl, opts.assetMap);
  const faviconUri = opts.faviconPath || buildFaviconDataUri(state, theme.vars['--primary'], opts.assetMap);

  // Hreflang alternate tags for bilingual sites
  let hreflangTags = '';
  if (state.bilingualEnabled && baseUrl && isValidHttpsUrl(baseUrl)) {
    const pFile = pageMeta && pageMeta.slug !== 'index' ? pageMeta.filename : '';
    const lang2 = state.secondLanguage || 'hi';
    hreflangTags = `
  <link rel="alternate" hreflang="${escapeHTML(state.siteLanguage || 'en')}" href="${escapeHTML(`${baseUrl}/${pFile}`)}" />
  <link rel="alternate" hreflang="${escapeHTML(lang2)}" href="${escapeHTML(`${baseUrl}/${lang2}/${pFile}`)}" />`;
  }

  // JSON-LD structured data (Phase A6)
  const jsonLdList = generateJsonLd(state, {
    pageTitle: pageMeta?.title || baseSiteName,
    pageSlug: pageMeta?.slug || 'index',
    includeBreadcrumbs: state.siteStructure === 'multi',
  });
  const jsonLdTags = jsonLdList
    .map((block) => `  <script type="application/ld+json">${serializeJsonForScriptTag(block)}</script>`)
    .join('\n');

  const initialModeAttr =
    state.darkModeDefault === 'dark'
      ? ' data-mode="dark"'
      : state.darkModeDefault === 'light'
      ? ' data-mode="light"'
      : '';

  const colorScheme = state.darkModeDefault === 'dark' ? 'dark light' : state.darkModeDefault === 'light' ? 'light dark' : 'light dark';

  const cssBlock = opts.externalAssets
    ? `  <link rel="stylesheet" href="${escapeHTML(opts.assetPrefix || '')}assets/style.css" />`
    : `  <style>\n${buildSharedCss(state, theme, layoutCss, { previewMode: opts.previewMode })}\n  </style>`;

  const runtimeJs = buildSharedRuntimeJs(state, theme, { previewMode: opts.previewMode });
  const scriptBlock = opts.externalAssets
    ? `  <script defer src="${escapeHTML(opts.assetPrefix || '')}assets/site.js"></script>`
    : `  <script>${runtimeJs}</script>`;

  // Phase C4: Content-Security-Policy meta tag
  const cspContent = buildCspMetaContent(state, {
    scriptHashes: opts.scriptHashes || [],
    externalAssets: Boolean(opts.externalAssets),
  });

  // Phase C1: Round-trip embedded project JSON (stripped in previewMode for speed, included in every export!)
  const embeddedProjectTag =
    opts.embedProject && !opts.previewMode
      ? `\n  <script type="application/json" id="siteforge-project">${serializeJsonForScriptTag(opts.embedProject)}</script>`
      : '';

  const manifestLink =
    state.makeSiteOffline && !opts.previewMode
      ? `\n  <link rel="manifest" href="${escapeHTML(opts.assetPrefix || './')}manifest.webmanifest" />`
      : '';

  return `<!doctype html>
<html lang="${escapeHTML(langObj.code)}" dir="${escapeHTML(langObj.dir)}"${initialModeAttr}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${escapeHTML(cspContent)}" />
  <title>${metaTitle}</title>
  ${metaDesc ? `<meta name="description" content="${metaDesc}" />` : ''}
  ${metaKeywords ? `<meta name="keywords" content="${metaKeywords}" />` : ''}
  ${metaAuthor ? `<meta name="author" content="${metaAuthor}" />` : ''}
  <meta name="robots" content="${escapeHTML(state.robots || 'index, follow')}" />
  <meta name="theme-color" content="${escapeHTML(theme.vars['--primary'])}" />
  <meta name="color-scheme" content="${colorScheme}" />
  ${canonical ? `<link rel="canonical" href="${escapeHTML(canonical)}" />` : ''}${hreflangTags}
  <meta property="og:title" content="${ogTitle}" />
  ${ogDesc ? `<meta property="og:description" content="${ogDesc}" />` : ''}
  <meta property="og:type" content="website" />
  ${ogImg ? `<meta property="og:image" content="${escapeHTML(ogImg)}" />` : ''}
  <meta name="twitter:card" content="${escapeHTML(state.twitterCard || 'summary_large_image')}" />
  <meta name="twitter:title" content="${ogTitle}" />
  ${ogDesc ? `<meta name="twitter:description" content="${ogDesc}" />` : ''}
  <link rel="icon" href="${escapeHTML(faviconUri)}" />${manifestLink}
${jsonLdTags}
${cssBlock}
</head>
<body class="sf-layout-${escapeHTML(layoutId)} sf-btnstyle-${escapeHTML(state.buttonStyle)} sf-cardstyle-${escapeHTML(state.cardStyle)} sf-anim-${escapeHTML(state.animationStyle)}">
  <a class="sf-skip-link" href="#sf-main">Skip to content</a>
${bodyHtml}
  <div id="sf-lightbox" class="sf-lightbox" hidden role="dialog" aria-modal="true" aria-label="Image viewer">
    <button type="button" id="sf-lb-close" aria-label="Close image viewer">&times;</button>
    <img id="sf-lb-img" src="" alt="" />
    <p id="sf-lb-cap"></p>
  </div>${embeddedProjectTag}
${scriptBlock}
</body>
</html>`;
}

/* ==========================================================================
   6. Page Main Body Router (Supports One-Page & Multi-Page!)
   ========================================================================== */

function buildMainContentForPage(state, layoutId, opts, pageMeta) {
  const divider = renderSectionDivider(state.dividerStyle);

  // One-page mode OR Multi-page Home page
  if (!pageMeta || state.siteStructure !== 'multi') {
    return `
      ${renderHero(state, opts, { layoutId })}
      ${divider}
      ${renderAbout(state, opts)}
      ${divider}
      ${renderOrderedSections(state, opts)}
      ${divider}
      ${renderContact(state, opts)}`;
  }

  switch (pageMeta.pageType) {
    case 'home':
      return `
      ${renderHero(state, opts, { layoutId })}
      ${divider}
      ${renderAbout(state, opts)}
      ${divider}
      ${renderExtraSection('services', state, opts)}
      ${divider}
      ${renderExtraSection('cta', state, opts)}`;
    case 'about':
      return renderAbout(state, opts, { headingTag: 'h1' });
    case 'services':
      return renderExtraSection('services', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'portfolio':
      return renderExtraSection('projects', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'gallery':
      return renderExtraSection('gallery', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'pricing':
      return renderExtraSection('pricing', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'team':
      return renderExtraSection('team', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'faq':
      return renderExtraSection('faq', state, opts, { forceEnable: true, headingTag: 'h1' });
    case 'contact':
      return renderContact(state, opts, { headingTag: 'h1' });
    case 'blog':
      return renderBlogListSection(state, opts);
    case 'blog-post':
      return renderBlogPostSection(pageMeta.post, state);
    case 'legal':
    case 'custom':
    default:
      return renderCustomOrLegalPageSection(pageMeta);
  }
}

function buildStandardBody(state, theme, layoutId, opts, pageMeta) {
  return `
  ${renderHeader(state, theme, opts)}
  <main id="sf-main">
    ${buildMainContentForPage(state, layoutId, opts, pageMeta)}
  </main>
  ${renderFooter(state, opts)}`;
}

/* ==========================================================================
   7. 12 Distinct Layout Functions + Layout CSS Registry
   ========================================================================== */

export const LAYOUT_CSS_MAP = {
  classic: `
      .sf-layout-classic .sf-header { border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 92%, transparent); }
      .sf-layout-classic .sf-hero { border-bottom: 1px solid var(--border); }
      .sf-layout-classic .sf-hero h1 { letter-spacing: -0.025em; }
      .sf-layout-classic .sf-kicker { letter-spacing: 0.14em; }
      .sf-layout-classic .sf-card { transition: border-color 0.2s ease, transform 0.2s ease; }
      .sf-layout-classic .sf-card:hover { border-color: var(--primary); }`,
  sidebar: `
      .sf-sidebar-shell { display: grid; grid-template-columns: 265px 1fr; min-height: 100vh; }
      .sf-sidebar-rail { background: color-mix(in srgb, var(--primary) 5%, var(--card)); border-inline-end: 1px solid var(--border); padding: 1.85rem 1.45rem; display: flex; flex-direction: column; justify-content: space-between; position: sticky; top: 0; height: 100vh; }
      .sf-sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 1.85rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
      .sf-nav-vertical { flex-direction: column; align-items: stretch; gap: 0.25rem; }
      .sf-nav-vertical .sf-nav-link { padding: 0.55rem 0.75rem; border-inline-start: 2px solid transparent; border-radius: 4px; }
      .sf-nav-vertical .sf-nav-link:hover, .sf-nav-vertical .sf-nav-link.is-current { border-inline-start-color: var(--primary); background: color-mix(in srgb, var(--primary) 9%, transparent); color: var(--text); }
      .sf-sidebar-foot { border-top: 1px solid var(--border); padding-top: 1rem; }
      .sf-sidebar-content .sf-hero { text-align: start; border-bottom: 1px solid var(--border); }
      @media (max-width: 820px) {
        .sf-sidebar-shell { grid-template-columns: 1fr; }
        .sf-sidebar-rail { position: sticky; height: auto; border-inline-end: none; border-bottom: 1px solid var(--border); padding: 0.85rem 1.25rem; }
        .sf-sidebar-head { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .sf-sidebar-foot { display: none; }
      }`,
  minimal: `
      .sf-layout-minimal { --container-max: 740px; }
      .sf-layout-minimal .sf-header { border-bottom: 1px solid var(--border); background: var(--bg); }
      .sf-layout-minimal .sf-hero { padding-top: calc(var(--sec-pad) * 1.25); padding-bottom: var(--sec-pad); }
      .sf-layout-minimal .sf-card { background: transparent; box-shadow: none; border: none; border-top: 1px solid var(--border); border-radius: 0; padding: 1.35rem 0; }
      .sf-layout-minimal .sf-grid { grid-template-columns: 1fr; gap: 0; }
      .sf-layout-minimal .sf-section { border-top: 1px solid var(--border); }
      .sf-layout-minimal .sf-icon-badge { background: transparent; border: 1px solid var(--border); }`,
  'card-grid': `
      .sf-layout-card-grid .sf-hero-inner { background: var(--card); border: 1px solid var(--border); border-radius: calc(var(--radius) + 6px); padding: clamp(1.85rem, 3.6vw, 3rem); box-shadow: var(--shadow); }
      .sf-layout-card-grid .sf-section { border-top: none; padding: calc(var(--sec-pad) * 0.65) 0; }
      .sf-layout-card-grid .sf-card { background: var(--card); border: 1px solid var(--border); border-radius: calc(var(--radius) + 2px); transition: transform 0.18s ease, border-color 0.18s ease; }
      .sf-layout-card-grid .sf-card:hover { transform: translateY(-2px); border-color: var(--primary); }`,
  'split-hero': `
      .sf-layout-split-hero .sf-hero { text-align: start; border-bottom: 1px solid var(--border); }
      .sf-layout-split-hero .sf-hero-inner { gap: clamp(2rem, 4vw, 3.5rem); align-items: center; }
      .sf-layout-split-hero .sf-hero-media, .sf-layout-split-hero .sf-hero-showcase { background: var(--card); border: 1px solid var(--border); border-radius: calc(var(--radius) + 4px); padding: 1.75rem; }
      .sf-layout-split-hero .sf-hero-actions { justify-content: flex-start; }`,
  magazine: `
      .sf-layout-magazine .sf-header { border-bottom: 3px double var(--text); background: var(--bg); }
      .sf-layout-magazine .sf-header-inner { padding-top: 1.15rem; padding-bottom: 1rem; }
      .sf-layout-magazine .sf-brand { font-size: 1.2rem; letter-spacing: 0.04em; text-transform: uppercase; }
      .sf-layout-magazine .sf-hero { border-bottom: 1px solid var(--text); text-align: start; }
      .sf-layout-magazine .sf-hero h1 { font-style: italic; letter-spacing: -0.02em; }
      .sf-layout-magazine .sf-sec-head { border-bottom: 1px solid var(--border); padding-bottom: 0.85rem; margin-bottom: 1.75rem; }
      .sf-layout-magazine .sf-grid.sf-cols-3 { grid-template-columns: 1.45fr 1fr 1fr; }
      .sf-layout-magazine .sf-prose { border-inline-start: 2px solid var(--primary); padding-inline-start: 1.25rem; }
      @media (max-width: 820px) { .sf-layout-magazine .sf-grid.sf-cols-3 { grid-template-columns: 1fr; } }`,
  'masonry-gallery': `
      .sf-layout-masonry-gallery .sf-grid, .sf-layout-masonry-gallery .sf-gallery-grid { display: block; column-count: 3; column-gap: var(--grid-gap); }
      .sf-layout-masonry-gallery .sf-grid > *, .sf-layout-masonry-gallery .sf-gallery-grid > * { break-inside: avoid; margin-bottom: var(--grid-gap); }
      @media (max-width: 820px) { .sf-layout-masonry-gallery .sf-grid, .sf-layout-masonry-gallery .sf-gallery-grid { column-count: 1; } }`,
  'one-page-landing': `
      .sf-layout-one-page-landing .sf-section:nth-of-type(even) { background: color-mix(in srgb, var(--primary) 5%, var(--bg)); }
      .sf-layout-one-page-landing .sf-sec-head { text-align: center; margin-inline: auto; }`,
  'centered-stack': `
      .sf-layout-centered-stack .sf-container { max-width: 860px; }
      .sf-layout-centered-stack .sf-sec-head, .sf-layout-centered-stack .sf-hero { text-align: center; }
      .sf-layout-centered-stack .sf-sec-head, .sf-layout-centered-stack .sf-hero-sub { margin-inline: auto; }
      .sf-layout-centered-stack .sf-hero-actions { justify-content: center; }`,
  'left-nav-docs': `
      .sf-docs-shell { display: grid; grid-template-columns: 210px 1fr; gap: 2rem; align-items: start; }
      .sf-docs-toc { position: sticky; top: 5.2rem; padding: 1.5rem 0; display: flex; flex-direction: column; gap: 0.45rem; border-inline-end: 1px solid var(--border); padding-inline-end: 1rem; }
      .sf-doc-link { font-size: 0.88rem; color: var(--muted); padding: 0.25rem 0; }
      .sf-doc-link:hover { color: var(--primary); }
      .sf-docs-main .sf-container { padding-inline: 0; }
      @media (max-width: 820px) { .sf-docs-shell { grid-template-columns: 1fr; } .sf-docs-toc { display: none; } }`,
  timeline: `
      .sf-layout-timeline main { position: relative; }
      .sf-layout-timeline .sf-section .sf-container { border-inline-start: 2px solid var(--primary); padding-inline-start: 1.75rem; }`,
  'fullscreen-hero': `
      .sf-layout-fullscreen-hero .sf-hero { min-height: 92vh; background: linear-gradient(145deg, color-mix(in srgb, var(--primary) 22%, var(--bg)), color-mix(in srgb, var(--accent) 14%, var(--bg))); }`,
};

function renderLayoutById(layoutId, state, theme, opts = {}, pageMeta = null) {
  const layoutCss = LAYOUT_CSS_MAP[layoutId] || '';

  if (layoutId === 'sidebar') {
    const bodyHtml = `
  <div class="sf-sidebar-shell">
    ${renderHeader(state, theme, opts, { isSidebar: true })}
    <div class="sf-sidebar-content">
      <main id="sf-main">
        ${buildMainContentForPage(state, 'sidebar', opts, pageMeta)}
      </main>
      ${renderFooter(state, opts)}
    </div>
  </div>`;
    return wrapDocument({ state, theme, layoutId: 'sidebar', layoutCss, bodyHtml, opts, pageMeta });
  }

  if (layoutId === 'left-nav-docs') {
    const navAnchors = renderNavItems(state, opts).replace(/class="sf-nav-link/g, 'class="sf-doc-link');
    const bodyHtml = `
  ${renderHeader(state, theme, opts)}
  <div class="sf-container sf-docs-shell">
    <aside class="sf-docs-toc" aria-label="On this page">
      <p class="sf-kicker">Contents</p>
      ${navAnchors}
    </aside>
    <main id="sf-main" class="sf-docs-main">
      ${buildMainContentForPage(state, 'left-nav-docs', opts, pageMeta)}
    </main>
  </div>
  ${renderFooter(state, opts)}`;
    return wrapDocument({ state, theme, layoutId: 'left-nav-docs', layoutCss, bodyHtml, opts, pageMeta });
  }

  return wrapDocument({
    state,
    theme,
    layoutId,
    layoutCss,
    bodyHtml: buildStandardBody(state, theme, layoutId, opts, pageMeta),
    opts,
    pageMeta,
  });
}

export const layouts = Object.fromEntries(
  LAYOUT_LIST.map((l) => [l.id, (state, theme, opts, pageMeta) => renderLayoutById(l.id, state, theme, opts, pageMeta)])
);

/* ==========================================================================
   8. Nested Loop Generating All 288 Templates (12 Layouts x 24 Themes)
   ========================================================================== */

export const TEMPLATES = [];
for (const layout of LAYOUT_LIST) {
  for (const theme of THEME_LIST) {
    TEMPLATES.push({
      id: `${layout.id}--${theme.id}`,
      layout: layout.id,
      layoutId: layout.id,
      layoutName: layout.name,
      theme: theme.id,
      themeId: theme.id,
      themeName: theme.name,
      isDark: theme.isDarkDefault,
      name: `${layout.name} · ${theme.name}`,
      render: (state) => layouts[layout.id]({ ...state, layout: layout.id, theme: theme.id }, theme),
    });
  }
}

/* ==========================================================================
   9. Exported Offline-Ready Site Manifest & Service Worker Generators (B5)
   ========================================================================== */

export function buildExportedSiteManifest(state, theme) {
  return JSON.stringify(
    {
      name: (state.siteName || 'My Website').trim(),
      short_name: (state.siteName || 'Site').trim().slice(0, 12),
      description: (state.metaDescription || state.tagline || 'Built with SiteForge').trim(),
      start_url: './index.html',
      display: 'standalone',
      background_color: theme.vars['--bg'],
      theme_color: theme.vars['--primary'],
      icons: [
        { src: './assets/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
        { src: './assets/icons/favicon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2
  );
}

export function buildExportedSiteSwJs(cacheFiles) {
  const version = `site-v${Date.now().toString(36)}`;
  const unique = [...new Set(['./', './index.html', './offline.html', ...cacheFiles.map((f) => './' + f.replace(/^\.\//, ''))])];
  return `const CACHE_NAME = '${version}';
const ASSETS = ${JSON.stringify(unique, null, 2)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./offline.html')))
  );
});
`;
}

export function buildExportedOfflineHtml(state, theme) {
  const v = theme.vars;
  return `<!doctype html>
<html lang="${escapeHTML(state.siteLanguage || 'en')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Offline — ${escapeHTML(state.siteName || 'Website')}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:${v['--bg']};color:${v['--text']};padding:24px;text-align:center;}
  .box{max-width:440px;background:${v['--card']};border:1px solid ${v['--border']};border-radius:16px;padding:36px 24px;}
  a{display:inline-block;margin-top:16px;padding:10px 20px;border-radius:8px;background:${v['--primary']};color:#fff;text-decoration:none;font-weight:600;}
</style>
</head>
<body>
  <main class="box">
    <h1>You are offline</h1>
    <p>Previously cached pages of ${escapeHTML(state.siteName || 'this website')} remain available offline.</p>
    <a href="./index.html">Return to Home</a>
  </main>
</body>
</html>`;
}

/* ==========================================================================
   10. Public Entry Points: buildSite (single page) & buildSitePages (multi)
   ========================================================================== */

/**
 * Deterministic single-page renderer (used by preview, single-HTML download, and Publish).
 */
export function buildSite(state, opts = {}) {
  const layoutId = layouts[state.layout] ? state.layout : 'classic';
  const resolvedTheme = resolveTheme(state);
  const manifest = getSitePageManifest(state);
  const targetSlug = opts.currentSlug || 'index';
  const pageMeta = manifest.find((p) => p.slug === targetSlug) || manifest[0];
  return layouts[layoutId](state, resolvedTheme, { ...opts, currentSlug: pageMeta.slug }, pageMeta);
}

/**
 * Builds ALL pages, shared CSS, and shared JS for multi-page or full ZIP export.
 */
export function buildSitePages(state, opts = {}) {
  const layoutId = layouts[state.layout] ? state.layout : 'classic';
  const resolvedTheme = resolveTheme(state);
  const manifest = getSitePageManifest(state);
  const layoutCss = LAYOUT_CSS_MAP[layoutId] || '';

  const sharedCss = buildSharedCss(state, resolvedTheme, layoutCss, { previewMode: false });
  const sharedJs = buildSharedRuntimeJs(state, resolvedTheme, { previewMode: false });

  const pages = manifest.map((pageMeta) => ({
    ...pageMeta,
    html: layouts[layoutId](
      state,
      resolvedTheme,
      {
        ...opts,
        currentSlug: pageMeta.slug,
        externalAssets: Boolean(opts.externalAssets),
        embedProject: pageMeta.slug === 'index' ? opts.embedProject : null,
      },
      pageMeta
    ),
  }));

  // Optional separate bilingual language folder (/hi/, /es/, etc.) in multi-page ZIP mode
  const secondaryPages = [];
  if (state.bilingualEnabled && state.exportLangFolders && state.siteStructure === 'multi') {
    const langCode = slugifyName(state.secondLanguage || 'hi');
    for (const pageMeta of manifest) {
      secondaryPages.push({
        ...pageMeta,
        filename: `${langCode}/${pageMeta.filename}`,
        html: layouts[layoutId](
          state,
          resolvedTheme,
          {
            ...opts,
            currentSlug: pageMeta.slug,
            langMode: 'secondary',
            externalAssets: Boolean(opts.externalAssets),
            assetPrefix: '../',
            embedProject: null,
          },
          pageMeta
        ),
      });
    }
  }

  return {
    pages,
    secondaryPages,
    sharedCss,
    sharedJs,
    theme: resolvedTheme,
  };
}
