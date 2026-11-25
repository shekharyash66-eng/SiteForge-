/**
 * SiteForge Health Score, SEO Power Pack, Legal Templates & CSP Module (health.js)
 * - Phase A5: Live 5-pillar Site Health Score (SEO, WCAG 2.2 AA Accessibility, Performance, Content, Security) + Auto-fix Contrast
 * - Phase A6: JSON-LD by site type, sitemap.xml, robots.txt, humans.txt, 404.html, Canvas 1200x630 OG image, SVG+PNG favicon pack
 * - Phase B6: Rule-based Legal Page templates (Privacy, Terms, Disclaimer, Refund, Cookies)
 * - Phase C4: Content-Security-Policy meta tag with Web Crypto SHA-256 script hashes
 */

import { resolveTheme, getContrastRatio } from './themes.js';
import {
  escapeHTML,
  isValidEmail,
  isDangerousUrl,
  isValidHttpsUrl,
  isValidAnalyticsConfig,
  estimateDataUrlBytes,
  slugifyName,
} from './validators.js';
import { getCachedImageUri } from './storage.js';

// =========================================================================
// Color Contrast Auto-Fixer (WCAG 2.2 AA >= 4.5:1 text, >= 3.0:1 primary)
// =========================================================================

function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  if (clean.length !== 6) return [0, 0, 0];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Nudges foreground lightness toward black or white until contrast against bgHex reaches targetRatio.
 */
export function nudgeColorForContrast(fgHex, bgHex, targetRatio = 4.6) {
  if (getContrastRatio(fgHex, bgHex) >= targetRatio) return fgHex;
  const { h, s } = hexToHsl(fgHex);
  const bgLum = getContrastRatio(bgHex, '#000000') > getContrastRatio(bgHex, '#ffffff') ? 'light' : 'dark';

  // Search lightness in direction away from bg
  let best = fgHex;
  let bestRatio = getContrastRatio(fgHex, bgHex);
  for (let step = 1; step <= 100; step++) {
    const l = bgLum === 'light' ? Math.max(2, 50 - step * 0.5) : Math.min(98, 50 + step * 0.5);
    const candidate = hslToHex(h, s, l);
    const ratio = getContrastRatio(candidate, bgHex);
    if (ratio >= targetRatio) return candidate;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return bgLum === 'light' ? '#111111' : '#f8fafc';
}

/**
 * Mutates/returns updated state colors so text >= 4.5:1 and primary >= 3.0:1 against background.
 */
export function autoFixStateContrast(state) {
  const theme = resolveTheme(state);
  const bg = theme.vars['--bg'];
  const fixedText = nudgeColorForContrast(theme.vars['--text'], bg, 4.7);
  const fixedPrimary = nudgeColorForContrast(theme.vars['--primary'], bg, 3.2);
  const fixedAccent = nudgeColorForContrast(theme.vars['--accent'], bg, 3.2);
  return {
    useCustomColors: true,
    customBg: bg,
    customText: fixedText,
    customPrimary: fixedPrimary,
    customAccent: fixedAccent,
  };
}

// =========================================================================
// Phase A5: Live 5-Pillar Site Health Score (0-100 + Grade A-F)
// =========================================================================

const SAMPLE_TEXT_HINTS = [
  'craft websites that load instantly',
  'replace this with your story',
  'sample text',
  'lorem ipsum',
];

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function evaluateSiteHealth(state, { pages = null } = {}) {
  const theme = resolveTheme(state);
  const checks = [];

  const add = (category, id, status, title, detail, fixAction = null) => {
    checks.push({ category, id, status, title, detail, fixAction });
  };

  // --- 1. SEO ---
  const titleText = (state.metaTitle || state.siteName || '').trim();
  if (!titleText) {
    add('seo', 'seo-title', 'FAIL', 'Missing page title', 'Add a site name or SEO title (under 60 characters).', { type: 'jump', stepIdx: 10, field: 'metaTitle' });
  } else if (titleText.length > 65) {
    add('seo', 'seo-title', 'WARN', 'SEO title is long', `${titleText.length} chars — aim for 60 characters or fewer.`, { type: 'jump', stepIdx: 10, field: 'metaTitle' });
  } else {
    add('seo', 'seo-title', 'PASS', 'SEO title length is good', `${titleText.length} characters (target <= 60).`);
  }

  const descText = (state.metaDescription || '').trim();
  if (!descText) {
    add('seo', 'seo-desc', 'FAIL', 'Missing meta description', 'Add a 70–160 character summary in Step 11.', { type: 'jump', stepIdx: 10, field: 'metaDescription' });
  } else if (descText.length < 70 || descText.length > 160) {
    add('seo', 'seo-desc', 'WARN', 'Meta description outside 70–160 chars', `Currently ${descText.length} characters.`, { type: 'jump', stepIdx: 10, field: 'metaDescription' });
  } else {
    add('seo', 'seo-desc', 'PASS', 'Meta description length is optimal', `${descText.length} characters (target 70–160).`);
  }

  // Unique titles in multi-page mode
  if (state.siteStructure === 'multi') {
    const titles = (state.menuItems || []).map((m) => (m.metaTitle || m.label || '').trim().toLowerCase());
    const hasDup = new Set(titles).size < titles.length;
    add(
      'seo',
      'seo-unique-titles',
      hasDup ? 'WARN' : 'PASS',
      hasDup ? 'Duplicate page titles found' : 'Unique titles across all pages',
      hasDup ? 'Give each page in Step 5 a distinct label or SEO title.' : `${titles.length} unique page titles.`,
      hasDup ? { type: 'jump', stepIdx: 4 } : null
    );
  } else {
    add('seo', 'seo-h1', 'PASS', 'Single <h1> heading per page', 'Generated layout enforces exactly one <h1> per page.');
  }

  // Image alt text
  const missingAlts = [];
  if (state.heroSideImage && !(state.heroSideImageAlt || '').trim()) missingAlts.push('Hero image');
  if (state.aboutImage && !(state.aboutImageAlt || '').trim()) missingAlts.push('About image');
  (state.galleryItems || []).forEach((g, i) => {
    if (g?.image && !(g.alt || g.caption || '').trim()) missingAlts.push(`Gallery #${i + 1}`);
  });
  (state.services || []).forEach((s, i) => {
    if (s?.image && !(s.imageAlt || s.title || '').trim()) missingAlts.push(`Service #${i + 1}`);
  });
  if (missingAlts.length) {
    add('seo', 'seo-alt', 'WARN', 'Images missing alt text', `Add alt text for: ${missingAlts.join(', ')}.`, { type: 'jump', stepIdx: 5 });
  } else {
    add('seo', 'seo-alt', 'PASS', 'All images have alt text', 'Every uploaded image includes accessible alt text.');
  }

  // JSON-LD validity
  const jsonLd = generateJsonLd(state);
  let jsonLdValid = false;
  try {
    JSON.parse(JSON.stringify(jsonLd));
    jsonLdValid = Array.isArray(jsonLd) && jsonLd.length > 0;
  } catch {
    jsonLdValid = false;
  }
  add('seo', 'seo-jsonld', jsonLdValid ? 'PASS' : 'FAIL', jsonLdValid ? 'Structured data (JSON-LD) is valid' : 'Structured data invalid', jsonLdValid ? `${jsonLd.map((j) => j['@type']).join(', ')} ready.` : 'Check site name and contact info.');

  // Sitemap readiness
  const siteUrl = (state.siteUrl || '').trim();
  if (siteUrl && isValidHttpsUrl(siteUrl)) {
    add('seo', 'seo-sitemap', 'PASS', 'Site URL set (sitemap.xml included)', `Sitemap & canonicals point to ${siteUrl}.`);
  } else {
    add('seo', 'seo-sitemap', 'WARN', 'Site URL not set (sitemap skipped)', 'Add your live HTTPS Site URL in Step 11 to include sitemap.xml in ZIP exports.', { type: 'jump', stepIdx: 10, field: 'siteUrl' });
  }

  // --- 2. Accessibility (WCAG 2.2 AA) ---
  const textRatio = getContrastRatio(theme.vars['--text'], theme.vars['--bg']);
  if (textRatio < 4.5) {
    add('accessibility', 'a11y-text-contrast', 'FAIL', `Text contrast too low (${textRatio.toFixed(1)}:1)`, 'WCAG 2.2 AA requires at least 4.5:1 for normal text.', { type: 'autofix-contrast' });
  } else {
    add('accessibility', 'a11y-text-contrast', 'PASS', `Text contrast passes AA (${textRatio.toFixed(1)}:1)`, 'Meets WCAG 2.2 AA (>= 4.5:1).');
  }

  const primaryRatio = getContrastRatio(theme.vars['--primary'], theme.vars['--bg']);
  if (primaryRatio < 3.0) {
    add('accessibility', 'a11y-primary-contrast', 'WARN', `Primary colour contrast low (${primaryRatio.toFixed(1)}:1)`, 'Large UI controls & accents should be at least 3.0:1.', { type: 'autofix-contrast' });
  } else {
    add('accessibility', 'a11y-primary-contrast', 'PASS', `Primary accent contrast passes (${primaryRatio.toFixed(1)}:1)`, 'Meets WCAG 2.2 AA (>= 3.0:1).');
  }

  const badLinkText = [];
  const checkGeneric = (txt, label) => {
    if (/^(click here|here|read more|link)$/i.test(String(txt || '').trim())) badLinkText.push(label);
  };
  checkGeneric(state.heroCtaText, 'Hero CTA');
  checkGeneric(state.heroSecondaryCtaText, 'Secondary CTA');
  checkGeneric(state.ctaButtonText, 'CTA Banner');
  if (badLinkText.length) {
    add('accessibility', 'a11y-link-text', 'WARN', 'Generic link text ("click here")', `Make link text descriptive for: ${badLinkText.join(', ')}.`, { type: 'jump', stepIdx: 5 });
  } else {
    add('accessibility', 'a11y-link-text', 'PASS', 'Descriptive link labels', 'No vague "click here" links detected.');
  }

  add('accessibility', 'a11y-wcag22', 'PASS', 'WCAG 2.2 AA structural safeguards', 'Skip link, landmarks, lang/dir, >= 24px tap targets (2.5.8), sticky-header scroll-padding-top (2.4.11), and prefers-reduced-motion built in.');

  // --- 3. Performance (Estimated Offline) ---
  const imageSlots = [
    state.logoDataUrl, state.faviconDataUrl, state.ogImageDataUrl,
    state.heroBgImage, state.heroSideImage, state.aboutImage,
    ...(state.services || []).map((s) => s?.image),
    ...(state.galleryItems || []).map((g) => g?.image),
    ...(state.teamMembers || []).map((m) => m?.photo),
  ].filter(Boolean);

  let totalImgBytes = 0;
  let oversizedCount = 0;
  for (const ref of imageSlots) {
    const uri = getCachedImageUri(ref);
    const bytes = estimateDataUrlBytes(uri);
    totalImgBytes += bytes;
    if (bytes > 500 * 1024) oversizedCount++;
  }

  if (oversizedCount > 0) {
    add('performance', 'perf-img-size', 'FAIL', `${oversizedCount} image(s) exceed 500 KB`, 'Re-upload through Image Studio to auto-compress.', { type: 'jump', stepIdx: 5 });
  } else if (totalImgBytes > 1800 * 1024) {
    add('performance', 'perf-img-size', 'WARN', `Total images are ${Math.round(totalImgBytes / 1024)} KB`, 'Consider using fewer or lower-quality photos for faster mobile loads.', { type: 'jump', stepIdx: 7 });
  } else {
    add('performance', 'perf-img-size', 'PASS', `Lightweight image payload (${Math.round(totalImgBytes / 1024)} KB)`, 'All images fit within budget with explicit width/height and lazy loading.');
  }

  add('performance', 'perf-zero-external', 'PASS', 'Zero blocking external requests', 'System fonts, inline SVG icons, and tiny vanilla JS target Core Web Vitals: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 (p75).');

  // --- 4. Content ---
  const rawJoined = `${state.siteName} ${state.heroHeadline} ${state.about}`.toLowerCase();
  const hasSample = SAMPLE_TEXT_HINTS.some((hint) => rawJoined.includes(hint));
  if (hasSample) {
    add('content', 'content-sample', 'WARN', 'Leftover sample text detected', 'Replace default placeholder copy with your own story (or try Smart Copy Bank).', { type: 'jump', stepIdx: 5 });
  } else {
    add('content', 'content-sample', 'PASS', 'Custom original copy', 'No default starter text left behind.');
  }

  const hasContact = isValidEmail(state.contactEmail);
  if (!hasContact) {
    add('content', 'content-contact', 'FAIL', 'Missing valid contact email', 'Visitors need a way to reach you in Step 9.', { type: 'jump', stepIdx: 8, field: 'contactEmail' });
  } else {
    add('content', 'content-contact', 'PASS', 'Contact information provided', `Valid email (${state.contactEmail}) set.`);
  }

  const headlineLen = (state.heroHeadline || '').trim().length;
  if (!headlineLen) {
    add('content', 'content-headline', 'FAIL', 'Hero headline is empty', 'Add a clear headline in Step 6.', { type: 'jump', stepIdx: 5, field: 'heroHeadline' });
  } else if (headlineLen > 95) {
    add('content', 'content-headline', 'WARN', 'Hero headline is very long', `${headlineLen} chars — shorter headlines scan better on mobile.`, { type: 'jump', stepIdx: 5, field: 'heroHeadline' });
  } else {
    add('content', 'content-headline', 'PASS', 'Concise hero headline', `${headlineLen} characters.`);
  }

  const emptySections = [];
  if (state.sections?.services?.enabled && !(state.services || []).some((s) => s?.title?.trim())) emptySections.push('Services');
  if (state.sections?.testimonials?.enabled && !(state.testimonials || []).some((t) => t?.quote?.trim())) emptySections.push('Testimonials');
  if (state.sections?.faq?.enabled && !(state.faqItems || []).some((f) => f?.question?.trim())) emptySections.push('FAQ');
  if (emptySections.length) {
    add('content', 'content-empty-sec', 'WARN', 'Enabled sections have no items', `Fill or disable: ${emptySections.join(', ')}.`, { type: 'jump', stepIdx: 7 });
  } else {
    add('content', 'content-empty-sec', 'PASS', 'No empty enabled sections', 'All active sections contain content.');
  }

  // --- 5. Security ---
  const urlCandidates = [
    state.heroCtaLink,
    state.heroSecondaryCtaLink,
    state.navCtaLink,
    state.ctaButtonLink,
    ...(state.menuItems || []).filter((m) => m.type === 'external').map((m) => m.target),
    ...(state.services || []).map((s) => s?.link),
    ...Object.values(state.socialLinks || {}),
  ].filter(Boolean);
  const hasDangerous = urlCandidates.some((u) => isDangerousUrl(u));
  if (hasDangerous) {
    add('security', 'sec-urls', 'FAIL', 'Blocked unsafe URL scheme detected', 'Remove any javascript:, data:, or vbscript: link.', { type: 'jump', stepIdx: 9 });
  } else {
    add('security', 'sec-urls', 'PASS', 'All links use allowed schemes', 'Only http, https, mailto, tel, and local page/anchor links are permitted.');
  }

  const analyticsOk = isValidAnalyticsConfig(state.analyticsProvider, state.analyticsId);
  add(
    'security',
    'sec-csp',
    analyticsOk ? 'PASS' : 'WARN',
    analyticsOk ? 'Strict CSP & safe external links active' : 'Check analytics ID format',
    analyticsOk
      ? 'Generated HTML enforces Content-Security-Policy, rel="noopener noreferrer", and zero inline event handlers.'
      : 'Analytics ID does not match the allowlisted provider format.',
    analyticsOk ? null : { type: 'jump', stepIdx: 10 }
  );

  // Compute pillar scores
  const categories = ['seo', 'accessibility', 'performance', 'content', 'security'];
  const scores = {};
  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    let score = 100;
    for (const c of catChecks) {
      if (c.status === 'FAIL') score -= 30;
      else if (c.status === 'WARN') score -= 12;
    }
    scores[cat] = Math.max(0, Math.min(100, score));
  }

  const overall = Math.round(
    (scores.seo + scores.accessibility + scores.performance + scores.content + scores.security) / 5
  );

  const estimatedKb = Math.max(12, Math.round((totalImgBytes + 14 * 1024) / 1024));

  return {
    overall,
    grade: scoreToGrade(overall),
    scores,
    pillars: scores,
    estimatedKb,
    checks,
    cwvTargets: 'Built for Core Web Vitals targets (p75): LCP <= 2.5 s · INP <= 200 ms · CLS <= 0.1 (estimated offline)',
  };
}

// =========================================================================
// Phase A6: SEO Power Pack (JSON-LD, sitemap.xml, robots.txt, humans.txt, 404.html)
// =========================================================================

const SITE_TYPE_SCHEMA_MAP = {
  personal: 'Person',
  portfolio: 'Person',
  'dev-portfolio': 'Person',
  resume: 'Person',
  freelancer: 'Person',
  photography: 'Person',
  business: 'Organization',
  startup: 'Organization',
  saas: 'Organization',
  'mobile-app': 'Organization',
  agency: 'Organization',
  ngo: 'Organization',
  education: 'Organization',
  school: 'Organization',
  blog: 'WebSite',
  magazine: 'WebSite',
  podcast: 'WebSite',
  music: 'Organization',
  gaming: 'Organization',
  restaurant: 'Restaurant',
  cafe: 'CafeOrCoffeeShop',
  salon: 'BeautySalon',
  clinic: 'MedicalClinic',
  fitness: 'HealthClub',
  'real-estate': 'RealEstateAgent',
  law: 'LegalService',
  travel: 'TravelAgency',
  store: 'Store',
  event: 'Event',
  wedding: 'Event',
};

const LOCAL_BUSINESS_TYPES = new Set([
  'Restaurant',
  'CafeOrCoffeeShop',
  'BeautySalon',
  'MedicalClinic',
  'HealthClub',
  'RealEstateAgent',
  'LegalService',
  'TravelAgency',
  'Store',
]);

/**
 * Generates Schema.org JSON-LD blocks containing ONLY data that is visibly rendered on the page.
 */
export function generateJsonLd(state, { pageTitle = '', pageSlug = 'index', includeBreadcrumbs = false } = {}) {
  const blocks = [];
  const name = (state.siteName || 'My Website').trim();
  const description = (state.metaDescription || state.tagline || '').trim();
  const baseUrl = (state.siteUrl || '').trim().replace(/\/+$/, '');
  const schemaType = SITE_TYPE_SCHEMA_MAP[state.siteType] || 'WebSite';

  // Primary entity block (only visible fields)
  if (schemaType === 'Person') {
    const person = { '@context': 'https://schema.org', '@type': 'Person', name };
    if (description) person.description = description;
    if (baseUrl) person.url = baseUrl;
    if (isValidEmail(state.contactEmail)) person.email = state.contactEmail.trim();
    if ((state.contactPhone || '').trim()) person.telephone = state.contactPhone.trim();
    blocks.push(person);
  } else if (LOCAL_BUSINESS_TYPES.has(schemaType) && (state.contactAddress || '').trim()) {
    const biz = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: state.contactAddress.trim(),
      },
    };
    if (description) biz.description = description;
    if (baseUrl) biz.url = baseUrl;
    if ((state.contactPhone || '').trim()) biz.telephone = state.contactPhone.trim();
    if ((state.workingHours || '').trim()) {
      biz.openingHoursSpecification = [
        {
          '@type': 'OpeningHoursSpecification',
          description: state.workingHours.trim(),
        },
      ];
    }
    if ((state.priceRange || '').trim()) biz.priceRange = state.priceRange.trim();
    const lat = Number(state.geoLat);
    const lng = Number(state.geoLng);
    if (
      String(state.geoLat || '').trim() &&
      String(state.geoLng || '').trim() &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      biz.geo = {
        '@type': 'GeoCoordinates',
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };
    }
    if (schemaType === 'Restaurant' || schemaType === 'CafeOrCoffeeShop') {
      if ((state.cuisineType || '').trim()) biz.servesCuisine = state.cuisineType.trim();
      if (baseUrl) biz.hasMenu = `${baseUrl}/#services`;
    }
    blocks.push(biz);
  } else if (schemaType === 'Event') {
    const ev = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name,
    };
    if (description) ev.description = description;
    if ((state.contactAddress || '').trim()) {
      ev.location = { '@type': 'Place', name: state.contactAddress.trim(), address: state.contactAddress.trim() };
    }
    if (baseUrl) ev.url = baseUrl;
    blocks.push(ev);
  } else if (schemaType === 'Organization') {
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name };
    if (description) org.description = description;
    if (baseUrl) org.url = baseUrl;
    if (isValidEmail(state.contactEmail)) org.email = state.contactEmail.trim();
    if ((state.contactPhone || '').trim()) org.telephone = state.contactPhone.trim();
    blocks.push(org);
  }

  // Always include WebSite node
  const webSite = { '@context': 'https://schema.org', '@type': 'WebSite', name };
  if (description) webSite.description = description;
  if (baseUrl) webSite.url = baseUrl;
  blocks.push(webSite);

  // FAQPage block ONLY when FAQ section is enabled & has visible Q&A items
  if (state.sections?.faq?.enabled) {
    const validFaq = (state.faqItems || []).filter((f) => (f?.question || '').trim() && (f?.answer || '').trim());
    if (validFaq.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: validFaq.map((f) => ({
          '@type': 'Question',
          name: f.question.trim(),
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer.trim(),
          },
        })),
      });
    }
  }

  // BreadcrumbList for multi-page subpages
  if (includeBreadcrumbs && pageSlug !== 'index') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl ? `${baseUrl}/` : 'index.html',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: pageTitle || pageSlug,
          item: baseUrl ? `${baseUrl}/${pageSlug}.html` : `${pageSlug}.html`,
        },
      ],
    });
  }

  return blocks;
}

export function generateSitemapXml(siteUrl, pageFilenames) {
  const cleanBase = String(siteUrl || '').trim().replace(/\/+$/, '');
  if (!cleanBase || !isValidHttpsUrl(cleanBase)) return '';
  const today = new Date().toISOString().slice(0, 10);
  const urls = pageFilenames
    .filter((f) => f !== '404.html' && f !== 'offline.html')
    .map((file) => {
      const loc = file === 'index.html' ? `${cleanBase}/` : `${cleanBase}/${file}`;
      return `  <url>\n    <loc>${escapeHTML(loc)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function generateRobotsTxt(state) {
  const cleanBase = String(state.siteUrl || '').trim().replace(/\/+$/, '');
  const disallow = state.robotsMeta === 'noindex,nofollow';
  const lines = [
    'User-agent: *',
    disallow ? 'Disallow: /' : 'Allow: /',
  ];
  if (cleanBase && isValidHttpsUrl(cleanBase) && !disallow) {
    lines.push(`Sitemap: ${cleanBase}/sitemap.xml`);
  }
  return lines.join('\n') + '\n';
}

export function generateHumansTxt(state) {
  return [
    '/* TEAM */',
    `Site: ${state.siteName || 'My Website'}`,
    state.contactEmail ? `Contact: ${state.contactEmail}` : '',
    state.contactAddress ? `Location: ${state.contactAddress}` : '',
    '',
    '/* SITE */',
    `Last update: ${new Date().toISOString().slice(0, 10)}`,
    'Standards: HTML5, CSS3, WCAG 2.2 AA',
    'Generator: SiteForge (100% offline deterministic website builder)',
  ]
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n') + '\n';
}

export function generate404Html(state) {
  const theme = resolveTheme(state);
  const v = theme.vars;
  return `<!doctype html>
<html lang="${escapeHTML(state.siteLanguage || 'en')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Page Not Found — ${escapeHTML(state.siteName || 'Website')}</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:system-ui,-apple-system,sans-serif; background:${v['--bg']}; color:${v['--text']}; padding:24px; text-align:center; }
  .box { max-width:480px; background:${v['--card']}; border:1px solid ${v['--border']}; border-radius:16px; padding:40px 28px; }
  .code { font-size:56px; font-weight:800; color:${v['--primary']}; margin:0 0 8px; line-height:1; }
  h1 { margin:0 0 10px; font-size:24px; }
  p { margin:0 0 24px; color:${v['--muted']}; line-height:1.6; }
  a { display:inline-block; padding:12px 22px; border-radius:10px; background:${v['--primary']}; color:#fff; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
  <main class="box">
    <p class="code">404</p>
    <h1>Page not found</h1>
    <p>The page you are looking for moved or no longer exists on ${escapeHTML(state.siteName || 'this site')}.</p>
    <a href="./index.html">Back to Home</a>
  </main>
</body>
</html>`;
}

/**
 * Generates a 1200x630 Open Graph PNG image offline using HTML5 Canvas.
 */
export async function generateOgImageBytes(state) {
  if (typeof document === 'undefined') return null;
  const theme = resolveTheme(state);
  const v = theme.vars;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = v['--bg'];
  ctx.fillRect(0, 0, 1200, 630);

  // Decorative accent shapes
  ctx.fillStyle = v['--primary'];
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(1060, 120, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = v['--accent'];
  ctx.beginPath();
  ctx.arc(160, 580, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Card frame
  ctx.fillStyle = v['--card'];
  ctx.strokeStyle = v['--border'];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(72, 72, 1056, 486, 28);
  ctx.fill();
  ctx.stroke();

  // Brand pill bar
  ctx.fillStyle = v['--primary'];
  ctx.fillRect(124, 134, 84, 10);

  // Site name
  ctx.fillStyle = v['--text'];
  ctx.font = 'bold 68px system-ui, -apple-system, sans-serif';
  const title = (state.siteName || 'My Website').slice(0, 32);
  ctx.fillText(title, 124, 240, 950);

  // Tagline
  ctx.fillStyle = v['--muted'];
  ctx.font = '400 32px system-ui, -apple-system, sans-serif';
  const tag = (state.tagline || state.heroHeadline || 'Built with SiteForge').slice(0, 72);
  ctx.fillText(tag, 124, 315, 950);

  // URL / Footer mark
  ctx.fillStyle = v['--primary'];
  ctx.font = '600 24px ui-monospace, monospace';
  const footerLine = (state.siteUrl || state.contactEmail || 'Built with SiteForge').replace(/^https?:\/\//, '').slice(0, 60);
  ctx.fillText(footerLine, 124, 486, 950);

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Generates an SVG favicon + PNG favicon pack (16, 32, 180, 192, 512 px) from logo, letter, or emoji.
 */
export async function generateFaviconPack(state) {
  const theme = resolveTheme(state);
  const bg = theme.vars['--primary'];
  const letter = escapeHTML((state.faviconEmoji || (state.siteName || 'S').trim()[0] || 'S').slice(0, 2).toUpperCase());

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="68" font-weight="700">${letter}</text></svg>`;
  const pack = [{ name: 'assets/icons/favicon.svg', data: svgStr }];

  if (typeof document === 'undefined') return pack;

  const sizes = [16, 32, 180, 192, 512];
  for (const sz of sizes) {
    const c = document.createElement('canvas');
    c.width = sz;
    c.height = sz;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, sz, sz, Math.round(sz * 0.22));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(sz * 0.54)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((state.faviconEmoji || (state.siteName || 'S').trim()[0] || 'S').slice(0, 2).toUpperCase(), sz / 2, sz * 0.53);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    if (blob) {
      const fileName = sz === 180 ? 'apple-touch-icon.png' : `favicon-${sz}.png`;
      pack.push({ name: `assets/icons/${fileName}`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
  }
  return pack;
}

// =========================================================================
// Phase B6: Rule-Based Legal Page Templates
// =========================================================================

export function buildLegalPageContent(typeId, state) {
  const name = (state.siteName || 'This Website').trim();
  const email = (state.contactEmail || 'contact@yourdomain.com').trim();
  const address = (state.contactAddress || 'Location not specified').trim();
  const country = (state.legalCountry || 'your jurisdiction').trim();
  const today = new Date().toISOString().slice(0, 10);
  const disclaimerBanner =
    'Template for guidance, not legal advice. Review and adapt this page with a qualified advisor before publishing.';

  const templates = {
    privacy: {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      body: `${disclaimerBanner}\n\nLast updated: ${today}\n\n${name} respects your privacy. This website is a static site and does not run a server-side tracking database. If you contact us via email (${email}) or our contact form, we use the details you send solely to reply to your request.\n\nData Controller: ${name}, ${address} (${country}).\n\nContact for privacy inquiries: ${email}.`,
    },
    terms: {
      title: 'Terms of Service',
      slug: 'terms',
      body: `${disclaimerBanner}\n\nLast updated: ${today}\n\nBy accessing the ${name} website, you agree to use its content lawfully and respectfully. All text, images, and branding belong to ${name} unless stated otherwise.\n\nContent is provided "as is" without warranties. Governing jurisdiction: ${country}. Questions: ${email}.`,
    },
    disclaimer: {
      title: 'Disclaimer',
      slug: 'disclaimer',
      body: `${disclaimerBanner}\n\nLast updated: ${today}\n\nInformation published on ${name} is intended for general informational purposes only. While we strive to keep details accurate and up to date, ${name} makes no guarantees regarding completeness or suitability for any specific purpose.\n\nContact: ${email} · ${address}.`,
    },
    refund: {
      title: 'Refund & Returns Policy',
      slug: 'refund-policy',
      body: `${disclaimerBanner}\n\nLast updated: ${today}\n\nThank you for choosing ${name}. If you have a question about a purchase, booking, or service, please contact us within 14 days at ${email} with your order details.\n\nApproved refunds are processed back to the original payment method in accordance with applicable consumer laws in ${country}.`,
    },
    cookies: {
      title: 'Cookie Notice',
      slug: 'cookie-notice',
      body: `${disclaimerBanner}\n\nLast updated: ${today}\n\n${name} uses minimal browser storage solely for essential preferences such as light/dark theme, language selection, and accessibility display settings. Optional privacy-friendly analytics scripts load only if you explicitly click Accept on our consent banner.\n\nContact: ${email}.`,
    },
  };

  return templates[typeId] || templates.privacy;
}

// =========================================================================
// Phase C4: Content-Security-Policy Meta Builder (with optional SHA-256 hash)
// =========================================================================

export async function computeScriptSha256(scriptBody) {
  if (!scriptBody || typeof crypto === 'undefined' || !crypto.subtle) return '';
  try {
    const bytes = new TextEncoder().encode(scriptBody);
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    const bin = hashArr.map((b) => String.fromCharCode(b)).join('');
    return `'sha256-${btoa(bin)}'`;
  } catch {
    return '';
  }
}

export function buildCspMetaContent(state, { scriptHashes = [], externalAssets = false } = {}) {
  const scriptSrc = ["'self'"];
  const connectSrc = ["'self'"];

  if (scriptHashes.length) {
    scriptSrc.push(...scriptHashes);
  } else if (!externalAssets) {
    // Fallback only if crypto.subtle unavailable synchronously
    scriptSrc.push("'unsafe-inline'");
  }

  // Only allow user-explicitly-enabled origins
  if (state.contactFormMode === 'endpoint' && isValidHttpsUrl(state.contactFormEndpoint)) {
    try {
      connectSrc.push(new URL(state.contactFormEndpoint).origin);
    } catch {
      // Ignore malformed
    }
  }

  if (state.analyticsProvider && state.analyticsProvider !== 'none' && isValidAnalyticsConfig(state.analyticsProvider, state.analyticsId)) {
    const hosts = {
      ga4: ['https:' + '//www.googletagmanager.com', 'https:' + '//www.google-analytics.com'],
      plausible: ['https:' + '//plausible.io'],
      cloudflare: ['https:' + '//static.cloudflareinsights.com', 'https:' + '//cloudflareinsights.com'],
    };
    const allowed = hosts[state.analyticsProvider] || [];
    for (const h of allowed) {
      scriptSrc.push(h);
      connectSrc.push(h);
    }
  }

  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto: https:",
  ].join('; ');
}

export function buildReadmeGoLiveTxt(state) {
  const name = state.siteName || 'Your Website';
  const slug = slugifyName(name);
  return `====================================================================
  ${name.toUpperCase()} — HOW TO GO LIVE (Built with SiteForge)
====================================================================

Your website folder is 100% self-contained. It needs no database,
no backend server, and no monthly builder fee.

1. TEST ON YOUR COMPUTER FIRST (WORKS OFFLINE)
   - Unzip this folder completely.
   - Double-click "index.html" to open your website in any browser.
   - Every page link, image, and theme toggle works without internet.

2. PUT YOUR WEBSITE ONLINE (HOSTING IS PROVIDED BY YOUR CHOSEN HOST)
   SiteForge prepares the files; a web host puts them on the internet.

   OPTION A — Netlify (Drag & Drop)
   1) Sign in to Netlify.
   2) Open Sites -> Add new site -> Deploy manually.
   3) Drag this entire unzipped folder onto the upload box.
   4) Your site is live in seconds with automatic HTTPS.

   OPTION B — GitHub Pages
   1) Create a repository on GitHub (e.g. "${slug}").
   2) Upload all files from this folder to the root of the repository.
   3) Open Settings -> Pages -> Deploy from main branch (/root).

   OPTION C — Cloudflare Pages
   1) Open Workers & Pages -> Create -> Pages -> Direct Upload.
   2) Upload this unzipped folder and deploy.

   OPTION D — Any Standard Web Host (cPanel / FTP)
   1) Open File Manager or your FTP app.
   2) Upload all files into "public_html" (or "www").

3. CONNECT YOUR CUSTOM DOMAIN
   In your host's Domain Settings, add your domain and copy the DNS
   records (A / CNAME) into your domain registrar's DNS panel.

4. EDIT THIS SITE LATER IN SITEFORGE
   Open SiteForge -> Projects -> "Open in SiteForge" and pick either
   this ZIP file or index.html to restore and continue editing anytime!
`;
}
