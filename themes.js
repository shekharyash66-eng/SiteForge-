/**
 * SiteForge Theme Engine (themes.js)
 * 24 curated themes defining --bg, --text, --primary, --accent, --card, --muted, --border.
 * Adding a 25th theme object automatically adds 12 new templates in layouts.js.
 */

export const THEME_LIST = [
  {
    id: 'light-clean',
    name: 'Light Clean',
    description: 'Light off-white, blue',
    isDarkDefault: false,
    vars: { '--bg': '#f8fafc', '--text': '#0f172a', '--primary': '#2563eb', '--accent': '#0284c7', '--card': '#ffffff', '--muted': '#475569', '--border': '#e2e8f0' },
    altVars: { '--bg': '#0f172a', '--text': '#f1f5f9', '--primary': '#60a5fa', '--accent': '#38bdf8', '--card': '#1e293b', '--muted': '#94a3b8', '--border': '#334155' },
  },
  {
    id: 'dark-pro',
    name: 'Dark Pro',
    description: 'Near-black, teal',
    isDarkDefault: true,
    vars: { '--bg': '#0d1117', '--text': '#e6edf3', '--primary': '#14b8a6', '--accent': '#2dd4bf', '--card': '#161b22', '--muted': '#8b949e', '--border': '#30363d' },
    altVars: { '--bg': '#f4fbfa', '--text': '#0f201e', '--primary': '#0f766e', '--accent': '#0d9488', '--card': '#ffffff', '--muted': '#46615d', '--border': '#cde5e1' },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Pale blue, deep blue',
    isDarkDefault: false,
    vars: { '--bg': '#eff6ff', '--text': '#0c2340', '--primary': '#1d4ed8', '--accent': '#0369a1', '--card': '#ffffff', '--muted': '#3b5978', '--border': '#bfdbfe' },
    altVars: { '--bg': '#0b192c', '--text': '#e8f1ff', '--primary': '#60a5fa', '--accent': '#38bdf8', '--card': '#132845', '--muted': '#9ab3d4', '--border': '#1f3b61' },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Pale green, forest green',
    isDarkDefault: false,
    vars: { '--bg': '#f0fdf4', '--text': '#14291d', '--primary': '#15803d', '--accent': '#0f766e', '--card': '#ffffff', '--muted': '#3f624d', '--border': '#bbf7d0' },
    altVars: { '--bg': '#0d1d14', '--text': '#e8f8ee', '--primary': '#4ade80', '--accent': '#2dd4bf', '--card': '#152c1f', '--muted': '#96b9a3', '--border': '#214230' },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Cream, orange',
    isDarkDefault: false,
    vars: { '--bg': '#fff7ed', '--text': '#2c1810', '--primary': '#c2410c', '--accent': '#ea580c', '--card': '#ffffff', '--muted': '#6b4c3b', '--border': '#fed7aa' },
    altVars: { '--bg': '#1f130d', '--text': '#fff2e6', '--primary': '#fb923c', '--accent': '#fdba74', '--card': '#2d1c13', '--muted': '#c9a690', '--border': '#4a2f21' },
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Lavender, purple',
    isDarkDefault: false,
    vars: { '--bg': '#f5f3ff', '--text': '#1e1338', '--primary': '#6d28d9', '--accent': '#9333ea', '--card': '#ffffff', '--muted': '#5b4c7a', '--border': '#ddd6fe' },
    altVars: { '--bg': '#151026', '--text': '#f3efff', '--primary': '#a78bfa', '--accent': '#c084fc', '--card': '#21193a', '--muted': '#b2a3d4', '--border': '#35295c' },
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    description: 'Blush, pink',
    isDarkDefault: false,
    vars: { '--bg': '#fff1f2', '--text': '#31101d', '--primary': '#be123c', '--accent': '#e11d48', '--card': '#ffffff', '--muted': '#724455', '--border': '#fecdd3' },
    altVars: { '--bg': '#220e16', '--text': '#ffeef1', '--primary': '#fb7185', '--accent': '#f472b6', '--card': '#321621', '--muted': '#cfa1b1', '--border': '#4d2334' },
  },
  {
    id: 'mono-bw',
    name: 'Mono B/W',
    description: 'Crisp white, pure black',
    isDarkDefault: false,
    vars: { '--bg': '#ffffff', '--text': '#111111', '--primary': '#111111', '--accent': '#404040', '--card': '#f5f5f5', '--muted': '#525252', '--border': '#d4d4d4' },
    altVars: { '--bg': '#0c0c0c', '--text': '#f5f5f5', '--primary': '#ffffff', '--accent': '#d4d4d4', '--card': '#1a1a1a', '--muted': '#a3a3a3', '--border': '#303030' },
  },
  {
    id: 'retro-yellow',
    name: 'Retro Yellow',
    description: 'Pale yellow, brown-olive',
    isDarkDefault: false,
    vars: { '--bg': '#fefce8', '--text': '#292108', '--primary': '#713f12', '--accent': '#854d0e', '--card': '#fffef5', '--muted': '#5c4b1a', '--border': '#fde68a' },
    altVars: { '--bg': '#1c180a', '--text': '#fef9dc', '--primary': '#facc15', '--accent': '#eab308', '--card': '#292310', '--muted': '#c4b682', '--border': '#453c1b' },
  },
  {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    description: 'Dark navy, neon green',
    isDarkDefault: true,
    vars: { '--bg': '#090d1f', '--text': '#eef6ff', '--primary': '#22c55e', '--accent': '#4ade80', '--card': '#121833', '--muted': '#93a3c7', '--border': '#232e59' },
    altVars: { '--bg': '#f2fbf5', '--text': '#0c1c16', '--primary': '#15803d', '--accent': '#16a34a', '--card': '#ffffff', '--muted': '#425e52', '--border': '#bbf7d0' },
  },
  {
    id: 'cherry-red',
    name: 'Cherry Red',
    description: 'Warm white, crimson',
    isDarkDefault: false,
    vars: { '--bg': '#fef2f2', '--text': '#2b0f0f', '--primary': '#b91c1c', '--accent': '#dc2626', '--card': '#ffffff', '--muted': '#6b3e3e', '--border': '#fecaca' },
    altVars: { '--bg': '#1d0d0d', '--text': '#fee2e2', '--primary': '#f87171', '--accent': '#fca5a5', '--card': '#2b1414', '--muted': '#cfa0a0', '--border': '#4a2222' },
  },
  {
    id: 'teal-aqua',
    name: 'Teal Aqua',
    description: 'Seafoam mist, deep teal',
    isDarkDefault: false,
    vars: { '--bg': '#f0fdfa', '--text': '#112a29', '--primary': '#0f766e', '--accent': '#0d9488', '--card': '#ffffff', '--muted': '#3b6461', '--border': '#99f6e4' },
    altVars: { '--bg': '#0a1f1e', '--text': '#e6fffb', '--primary': '#2dd4bf', '--accent': '#5eead4', '--card': '#122f2d', '--muted': '#8abcb7', '--border': '#1f4d4a' },
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Soft lilac, indigo',
    isDarkDefault: false,
    vars: { '--bg': '#eef2ff', '--text': '#1e1b4b', '--primary': '#4338ca', '--accent': '#6366f1', '--card': '#ffffff', '--muted': '#4b4c7a', '--border': '#c7d2fe' },
    altVars: { '--bg': '#13112b', '--text': '#eef2ff', '--primary': '#818cf8', '--accent': '#a5b4fc', '--card': '#1e1b42', '--muted': '#a3a5d1', '--border': '#312e63' },
  },
  {
    id: 'coffee-brown',
    name: 'Coffee Brown',
    description: 'Latte paper, espresso',
    isDarkDefault: false,
    vars: { '--bg': '#f7f3ee', '--text': '#261a12', '--primary': '#78350f', '--accent': '#92400e', '--card': '#ffffff', '--muted': '#634d3e', '--border': '#e2d5c7' },
    altVars: { '--bg': '#1c140f', '--text': '#f5ece4', '--primary': '#d97706', '--accent': '#f59e0b', '--card': '#291e17', '--muted': '#bba594', '--border': '#423126' },
  },
  {
    id: 'slate-gray',
    name: 'Slate Gray',
    description: 'Cool stone, dark slate',
    isDarkDefault: false,
    vars: { '--bg': '#f1f5f9', '--text': '#0f172a', '--primary': '#334155', '--accent': '#475569', '--card': '#ffffff', '--muted': '#475569', '--border': '#cbd5e1' },
    altVars: { '--bg': '#0f172a', '--text': '#f8fafc', '--primary': '#94a3b8', '--accent': '#cbd5e1', '--card': '#1e293b', '--muted': '#94a3b8', '--border': '#334155' },
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    description: 'Crisp mint, emerald',
    isDarkDefault: false,
    vars: { '--bg': '#ecfdf5', '--text': '#062c22', '--primary': '#047857', '--accent': '#059669', '--card': '#ffffff', '--muted': '#336456', '--border': '#a7f3d0' },
    altVars: { '--bg': '#071f18', '--text': '#e6faf3', '--primary': '#34d399', '--accent': '#6ee7b7', '--card': '#0f2e25', '--muted': '#88baa9', '--border': '#1a4a3c' },
  },
  {
    id: 'sky-day',
    name: 'Sky Day',
    description: 'Airy sky, azure',
    isDarkDefault: false,
    vars: { '--bg': '#f0f9ff', '--text': '#0c273b', '--primary': '#0369a1', '--accent': '#0284c7', '--card': '#ffffff', '--muted': '#3a5f78', '--border': '#bae6fd' },
    altVars: { '--bg': '#091b29', '--text': '#e8f6ff', '--primary': '#38bdf8', '--accent': '#7dd3fc', '--card': '#112a3e', '--muted': '#8eb5cf', '--border': '#1d4461' },
  },
  {
    id: 'golden-luxury',
    name: 'Golden Luxury',
    description: 'Ivory silk, burnished gold',
    isDarkDefault: false,
    vars: { '--bg': '#faf7f0', '--text': '#1f1a10', '--primary': '#9a6b16', '--accent': '#b47d1c', '--card': '#ffffff', '--muted': '#635842', '--border': '#e5dac3' },
    altVars: { '--bg': '#17140d', '--text': '#faf4e6', '--primary': '#eab308', '--accent': '#facc15', '--card': '#241f14', '--muted': '#c2b495', '--border': '#3d3421' },
  },
  {
    id: 'cyber-pink',
    name: 'Cyber Pink',
    description: 'Deep obsidian, electric magenta',
    isDarkDefault: true,
    vars: { '--bg': '#110b19', '--text': '#faf0ff', '--primary': '#ec4899', '--accent': '#f472b6', '--card': '#1c1229', '--muted': '#b39bc7', '--border': '#37234f' },
    altVars: { '--bg': '#fdf2f8', '--text': '#2c0f22', '--primary': '#be185d', '--accent': '#db2777', '--card': '#ffffff', '--muted': '#6e405b', '--border': '#fbcfe8' },
  },
  {
    id: 'autumn-rust',
    name: 'Autumn Rust',
    description: 'Warm sand, terracotta rust',
    isDarkDefault: false,
    vars: { '--bg': '#f6f1eb', '--text': '#261813', '--primary': '#b4482d', '--accent': '#c2593f', '--card': '#ffffff', '--muted': '#634d44', '--border': '#dfd3c7' },
    altVars: { '--bg': '#1a120f', '--text': '#f5ece8', '--primary': '#e67e60', '--accent': '#f29b82', '--card': '#261b17', '--muted': '#bfa69c', '--border': '#402e28' },
  },
  {
    id: 'ice-blue',
    name: 'Ice Blue',
    description: 'Frost white, steel cyan',
    isDarkDefault: false,
    vars: { '--bg': '#ecfeff', '--text': '#0d2a33', '--primary': '#0e7490', '--accent': '#0891b2', '--card': '#ffffff', '--muted': '#3b616d', '--border': '#a5f3fc' },
    altVars: { '--bg': '#091e24', '--text': '#e6fbff', '--primary': '#22d3ee', '--accent': '#67e8f9', '--card': '#112e36', '--muted': '#8ab8c4', '--border': '#1d4a57' },
  },
  {
    id: 'charcoal-gold',
    name: 'Charcoal Gold',
    description: 'Rich charcoal, warm gold',
    isDarkDefault: true,
    vars: { '--bg': '#141414', '--text': '#f5f2eb', '--primary': '#d4a138', '--accent': '#e5b95c', '--card': '#1f1f1f', '--muted': '#a6a095', '--border': '#33312c' },
    altVars: { '--bg': '#f9f7f2', '--text': '#1c1a15', '--primary': '#8c6212', '--accent': '#a6761b', '--card': '#ffffff', '--muted': '#5c5548', '--border': '#e3dccd' },
  },
  {
    id: 'candy-pop',
    name: 'Candy Pop',
    description: 'Bright pastel, berry violet',
    isDarkDefault: false,
    vars: { '--bg': '#fdf4ff', '--text': '#2b1033', '--primary': '#a21caf', '--accent': '#c026d3', '--card': '#ffffff', '--muted': '#6d4378', '--border': '#f5d0fe' },
    altVars: { '--bg': '#1d0d24', '--text': '#fceeff', '--primary': '#e879f9', '--accent': '#f0abfc', '--card': '#2c1536', '--muted': '#c49dcf', '--border': '#482357' },
  },
  {
    id: 'earth-natural',
    name: 'Earth Natural',
    description: 'Linen beige, olive moss',
    isDarkDefault: false,
    vars: { '--bg': '#f4f3ec', '--text': '#1f2418', '--primary': '#4d6b2a', '--accent': '#658838', '--card': '#ffffff', '--muted': '#545c49', '--border': '#d8dccb' },
    altVars: { '--bg': '#151910', '--text': '#eff2e6', '--primary': '#8cb357', '--accent': '#a3c96f', '--card': '#202619', '--muted': '#a2ad95', '--border': '#343d29' },
  },
];

export const themes = Object.fromEntries(THEME_LIST.map((t) => [t.id, t]));

/**
 * Merges optional custom colour overrides onto the chosen theme.
 */
export function resolveTheme(state) {
  const base = themes[state.theme] || THEME_LIST[0];
  const mergedVars = { ...base.vars };
  const mergedAlt = { ...base.altVars };

  if (state.useCustomColors) {
    const hexOk = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
    if (hexOk(state.customPrimary)) {
      mergedVars['--primary'] = state.customPrimary;
      mergedAlt['--primary'] = state.customPrimary;
    }
    if (hexOk(state.customAccent)) {
      mergedVars['--accent'] = state.customAccent;
      mergedAlt['--accent'] = state.customAccent;
    }
    if (hexOk(state.customBg)) {
      mergedVars['--bg'] = state.customBg;
    }
    if (hexOk(state.customText)) {
      mergedVars['--text'] = state.customText;
    }
  }

  return {
    ...base,
    vars: mergedVars,
    altVars: mergedAlt,
  };
}

/**
 * Computes WCAG 2.1 contrast ratio between two #RRGGBB hex colors.
 */
export function getContrastRatio(hexA, hexB) {
  const lum = (hex) => {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return 0.5;
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(clean.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = lum(hexA);
  const l2 = lum(hexB);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

/**
 * Picks high-contrast text color (#ffffff or #111111) for buttons on a given background hex.
 */
export function getReadableOnColor(bgHex) {
  return getContrastRatio(bgHex, '#ffffff') >= getContrastRatio(bgHex, '#111111')
    ? '#ffffff'
    : '#111111';
}
