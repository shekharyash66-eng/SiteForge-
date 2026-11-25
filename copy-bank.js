/**
 * SiteForge Smart Copy Bank & Brand Studio (copy-bank.js)
 * - Phase B1: Deterministic, rule-based writing helper (NO AI) across all 30 site types x 6 tones
 * - Phase B2: Brand color harmony generator (5 rules), contrast-verified themes, Canvas logo palette extractor, Font pairing presets
 */

import { getContrastRatio } from './themes.js';
import { hexToHsl, hslToHex, nudgeColorForContrast } from './health.js';
import { loadImageElement } from './image-studio.js';

// =========================================================================
// Deterministic Seeded PRNG (same inputs ALWAYS give the exact same order)
// =========================================================================

function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seedStr) {
  const copy = [...arr];
  const rand = mulberry32(hashSeed(seedStr));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// =========================================================================
// Phase B1: Smart Copy Bank (30 Site Types x 6 Tones)
// =========================================================================

export const COPY_TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'bold', label: 'Bold' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'playful', label: 'Playful' },
  { id: 'minimal', label: 'Minimal' },
];

const SITE_TYPE_NOUNS = {
  personal: { subject: 'ideas & work', audience: 'readers and peers', craft: 'personal projects', location: 'everywhere' },
  portfolio: { subject: 'creative work', audience: 'clients and studios', craft: 'design & direction', location: 'worldwide' },
  'dev-portfolio': { subject: 'fast, reliable software', audience: 'engineering teams', craft: 'web engineering', location: 'globally' },
  resume: { subject: 'proven career impact', audience: 'hiring teams', craft: 'leadership & delivery', location: 'worldwide' },
  business: { subject: 'dependable solutions', audience: 'local and global clients', craft: 'business services', location: 'your community' },
  startup: { subject: 'modern workflows', audience: 'fast-moving teams', craft: 'product innovation', location: 'everywhere' },
  saas: { subject: 'simpler software tools', audience: 'growing teams', craft: 'cloud productivity', location: 'worldwide' },
  'mobile-app': { subject: 'everyday mobile tasks', audience: 'busy people', craft: 'mobile experiences', location: 'on iOS and Android' },
  agency: { subject: 'brands that stand out', audience: 'ambitious companies', craft: 'strategy & design', location: 'globally' },
  freelancer: { subject: 'focused independent craft', audience: 'founders and teams', craft: 'consulting & execution', location: 'remotely' },
  blog: { subject: 'thoughtful essays', audience: 'curious readers', craft: 'independent writing', location: 'online' },
  magazine: { subject: 'original reporting', audience: 'engaged subscribers', craft: 'editorial journalism', location: 'daily' },
  restaurant: { subject: 'seasonal cooking', audience: 'diners and neighbours', craft: 'fresh hospitality', location: 'our dining room' },
  cafe: { subject: 'small-batch roasts & bakes', audience: 'morning regulars', craft: 'artisan coffee & pastry', location: 'our corner cafe' },
  event: { subject: 'unforgettable gatherings', audience: 'speakers and attendees', craft: 'live event programming', location: 'in person' },
  wedding: { subject: 'a joyful celebration', audience: 'family and friends', craft: 'wedding festivities', location: 'together' },
  photography: { subject: 'honest visual stories', audience: 'couples and brands', craft: 'editorial photography', location: 'on location' },
  music: { subject: 'live sound & original songs', audience: 'listeners and venues', craft: 'independent music', location: 'on tour' },
  podcast: { subject: 'candid conversations', audience: 'weekly listeners', craft: 'audio storytelling', location: 'every week' },
  gaming: { subject: 'competitive play & streams', audience: 'community players', craft: 'live gaming', location: 'online' },
  education: { subject: 'practical mastery', audience: 'ambitious learners', craft: 'hands-on courses', location: 'at your pace' },
  school: { subject: 'curious young minds', audience: 'students and families', craft: 'academic excellence', location: 'on campus' },
  ngo: { subject: 'lasting community impact', audience: 'supporters and volunteers', craft: 'grassroots action', location: 'locally' },
  fitness: { subject: 'stronger daily habits', audience: 'members of every level', craft: 'personal training', location: 'in the studio' },
  clinic: { subject: 'compassionate care', audience: 'patients and families', craft: 'evidence-based medicine', location: 'our clinic' },
  'real-estate': { subject: 'places that feel like home', audience: 'buyers and sellers', craft: 'property guidance', location: 'across the city' },
  travel: { subject: 'memorable journeys', audience: 'curious travellers', craft: 'curated itineraries', location: 'around the world' },
  law: { subject: 'clear legal counsel', audience: 'founders and families', craft: 'advisory & representation', location: 'with integrity' },
  salon: { subject: 'calm everyday ritual', audience: 'guests seeking renewal', craft: 'hair & spa care', location: 'our studio' },
  store: { subject: 'well-made essentials', audience: 'thoughtful shoppers', craft: 'curated goods', location: 'direct to you' },
};

const TONE_MODIFIERS = {
  professional: { opener: 'Trusted', verb: 'Delivering', adj: 'clear, dependable', closing: 'Built for long-term results.' },
  friendly: { opener: 'Welcome to', verb: 'Bringing', adj: 'warm, approachable', closing: 'We are always glad to help.' },
  bold: { opener: 'Built to lead:', verb: 'Redefining', adj: 'high-impact, fearless', closing: 'No fluff—just real momentum.' },
  elegant: { opener: 'Refined', verb: 'Curating', adj: 'timeless, considered', closing: 'Crafted with quiet precision.' },
  playful: { opener: 'Hello from', verb: 'Sparking', adj: 'bright, joyful', closing: 'Good energy included.' },
  minimal: { opener: 'Simply', verb: 'Focused on', adj: 'calm, uncluttered', closing: 'Less noise, better work.' },
};

function interpolate(template, ctx) {
  return template
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{service\}/g, ctx.service)
    .replace(/\{subject\}/g, ctx.subject)
    .replace(/\{audience\}/g, ctx.audience)
    .replace(/\{craft\}/g, ctx.craft)
    .replace(/\{opener\}/g, ctx.opener)
    .replace(/\{verb\}/g, ctx.verb)
    .replace(/\{adj\}/g, ctx.adj)
    .replace(/\{closing\}/g, ctx.closing);
}

/**
 * Returns 6 deterministic, tailored copy variants for any field, siteType, tone, and shuffle offset.
 */
export function getSmartCopySuggestions({ field, state, tone = 'professional', shuffleIndex = 0 }) {
  const meta = SITE_TYPE_NOUNS[state.siteType] || SITE_TYPE_NOUNS.business;
  const mod = TONE_MODIFIERS[tone] || TONE_MODIFIERS.professional;

  const addressParts = String(state.contactAddress || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : addressParts[0] || meta.location;
  const firstService = state.services?.[0]?.title?.trim() || meta.craft;

  const ctx = {
    name: (state.siteName || 'Our Studio').trim(),
    city,
    service: firstService,
    subject: meta.subject,
    audience: meta.audience,
    craft: meta.craft,
    ...mod,
  };

  const pools = {
    tagline: [
      '{opener} {craft} in {city}.',
      '{verb} {adj} {subject} for {audience}.',
      '{name} — {craft} made clear and human.',
      'Thoughtful {service} tailored for {audience}.',
      '{adj} {craft}, built with care in {city}.',
      '{verb} {subject} without unnecessary complexity.',
      'Your partner for {service} and {craft}.',
    ],
    heroHeadline: [
      '{verb} {adj} {subject} for {audience}.',
      '{name}: {craft} built around what matters most.',
      'Better {service} for {audience} in {city}.',
      'Experience {adj} {craft} with {name}.',
      'Turning {subject} into lasting value.',
      '{opener} {service} designed for real-world results.',
      'Simple, thoughtful {craft}—done right.',
    ],
    heroSubheadline: [
      'At {name}, we specialize in {service} and {craft} for {audience}. {closing}',
      'Based in {city}, we bring {adj} {subject} to every project from day one.',
      'Clear communication, reliable schedules, and {adj} {craft} you can count on.',
      'Explore how {name} helps {audience} achieve more with {service}.',
      'Thoughtfully designed {subject} that puts clarity and quality first.',
      'Start a conversation today and see how {name} approaches {craft}.',
    ],
    about: [
      '{name} started with a simple goal: bring {adj} {craft} to {audience} in {city}.\n\nEvery engagement begins by listening carefully, defining clear milestones, and delivering {subject} that holds up over time. {closing}',
      'We believe great {craft} should feel effortless for {audience}. At {name}, we pair hands-on experience in {service} with transparent communication at every step.\n\nWhether you are starting fresh or improving what already exists, we focus on work that genuinely serves people.',
      'Rooted in {city}, {name} is dedicated to {subject}. Our team combines deep expertise in {service} with a calm, practical process.\n\nWe measure success by clarity, craftsmanship, and the long-term trust of the people we work with.',
      'For {audience} who value detail and reliability, {name} offers {adj} {craft}. We keep teams small, communication direct, and standards consistently high.\n\n{closing}',
      '{name} was created to make {service} clearer, faster, and more human. Every detail—from first draft to final delivery—is shaped around real goals.',
    ],
    serviceDescription: [
      '{adj} {service} tailored for {audience} with clear timelines and transparent deliverables.',
      'End-to-end {service} focused on practical outcomes and lasting quality.',
      'Hands-on {craft} designed to solve everyday challenges for {audience}.',
      'Dedicated {service} support in {city} with straightforward pricing and responsive follow-through.',
      'A structured, reliable approach to {service} that saves time and removes guesswork.',
      'Thoughtful {service} crafted to match your exact goals and schedule.',
    ],
    ctaButton: [
      'Get in Touch',
      'Start a Conversation',
      'Book a Consultation',
      'Explore Our Work',
      'Request a Quote',
      'Schedule a Visit',
      'See How It Works',
    ],
    faqAnswer: [
      'We typically respond within one business day. Reach out via email or the contact form with a brief overview of what you need.',
      'Yes—every project at {name} is tailored around your scope, timeline, and budget with clear upfront milestones.',
      'We serve {audience} in {city} and remotely, keeping communication straightforward from start to finish.',
      'Getting started is simple: share your goals through the contact section and we will outline clear next steps.',
      'We provide honest estimates before any work begins so there are never unexpected surprises.',
      'Feel free to message us anytime—we are happy to walk through options with zero obligation.',
    ],
    testimonial: [
      'Working with {name} was effortless from day one. Their {craft} exceeded every expectation.',
      'Clear communication, fair pricing, and genuinely {adj} results. Highly recommended for {audience}.',
      '{name} transformed our experience with {service}. Every detail felt thoughtful and well executed.',
      'Reliable, responsive, and easy to collaborate with. We gladly recommend {name} in {city}.',
      'Rarely do you find this level of care in {craft}. {name} delivered right on schedule.',
      'From our very first conversation to the final handoff, {name} made everything simple and clear.',
    ],
    metaDescription: [
      '{name} offers {adj} {craft} and {service} for {audience} in {city}. Explore our work and get in touch today.',
      'Discover {name}: {verb} {subject} with care and clarity. View services, details, and contact information.',
      '{opener} {craft} by {name} in {city}. Practical {service} designed around {audience}.',
      'Looking for {service}? {name} delivers {adj} {subject} with transparent communication.',
      'Visit {name} to learn about our {craft}, read answers to common questions, and connect directly.',
    ],
  };

  const rawList = pools[field] || pools.heroHeadline;
  const filled = rawList.map((tpl) => {
    const str = interpolate(tpl, ctx);
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  const seed = `${state.siteType}|${tone}|${field}|${ctx.name}|${ctx.city}|${shuffleIndex}`;
  return seededShuffle(filled, seed).slice(0, 6);
}

// =========================================================================
// Phase B2: Brand Studio (Color Harmonies, Logo Color Extractor, Font Pairings)
// =========================================================================

export function generateBrandHarmonies(brandHex) {
  const baseHex = /^#[0-9a-fA-F]{6}$/.test(brandHex) ? brandHex : '#c2593f';
  const { h, s } = hexToHsl(baseHex);
  const sat = Math.max(28, Math.min(82, s));

  const rules = [
    { id: 'complementary', name: 'Complementary', accentHue: (h + 180) % 360, bgHue: h, dark: false },
    { id: 'analogous', name: 'Analogous', accentHue: (h + 32) % 360, bgHue: (h + 15) % 360, dark: false },
    { id: 'triadic', name: 'Triadic', accentHue: (h + 120) % 360, bgHue: (h + 240) % 360, dark: false },
    { id: 'split', name: 'Split-Complementary', accentHue: (h + 150) % 360, bgHue: (h + 210) % 360, dark: false },
    { id: 'monochrome', name: 'Monochrome Dark', accentHue: h, bgHue: h, dark: true },
  ];

  return rules.map((r) => {
    const bg = r.dark ? hslToHex(r.bgHue, Math.min(24, sat * 0.4), 9) : hslToHex(r.bgHue, Math.min(30, sat * 0.35), 97);
    const rawText = r.dark ? hslToHex(r.bgHue, 16, 94) : hslToHex(r.bgHue, 24, 14);
    const rawPrimary = r.dark ? hslToHex(h, sat, 64) : baseHex;
    const rawAccent = r.dark ? hslToHex(r.accentHue, sat, 68) : hslToHex(r.accentHue, sat, 44);

    // Guarantee WCAG 2.2 AA contrast on every generated palette
    const text = nudgeColorForContrast(rawText, bg, 7.0);
    const primary = nudgeColorForContrast(rawPrimary, bg, 4.5);
    const accent = nudgeColorForContrast(rawAccent, bg, 3.5);

    return {
      id: `brand-${r.id}`,
      name: r.name,
      bg,
      text,
      primary,
      accent,
      contrastText: Number(getContrastRatio(text, bg).toFixed(1)),
      contrastPrimary: Number(getContrastRatio(primary, bg).toFixed(1)),
    };
  });
}

/**
 * Extracts up to 5 dominant brand colors from an uploaded logo using Canvas pixel quantization.
 */
export async function extractLogoPalette(dataUrlOrBlob) {
  if (typeof document === 'undefined' || !dataUrlOrBlob) return [];
  try {
    const img = await loadImageElement(dataUrlOrBlob);
    const c = document.createElement('canvas');
    const size = 48;
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 160) continue; // Ignore transparent background pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Quantize to 32-step buckets
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${Math.min(255, qr)},${Math.min(255, qg)},${Math.min(255, qb)}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const sorted = [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
      });

    // Prefer colorful (non-near-white/black) first, keep up to 5 unique
    const colorful = sorted.filter((hex) => {
      const { s, l } = hexToHsl(hex);
      return s > 18 && l > 12 && l < 90;
    });
    const combined = [...new Set([...colorful, ...sorted])];
    return combined.slice(0, 5);
  } catch {
    return [];
  }
}
