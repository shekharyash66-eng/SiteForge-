/**
 * SiteForge Master Options Data Hub (options.js)
 * EVERY choice list across all 12 steps lives here as a plain data array.
 * Adding one more option means adding one object to an array — never new logic.
 */

export { THEME_LIST, themes } from './themes.js';
export { SERVICE_ICONS, SERVICE_ICON_MAP, SOCIAL_ICON_PATHS } from './icons.js';

/* ==========================================================================
   Step 01 · Site Languages (15, including RTL Arabic & Urdu)
   ========================================================================== */
export const SITE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية (RTL)', dir: 'rtl' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو (RTL)', dir: 'rtl' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
];

/* ==========================================================================
   Step 02 · 30 Site Types (each with icon & sensible editable defaults)
   ========================================================================== */
export const SITE_TYPES = [
  { id: 'personal', name: 'Personal', icon: 'home', description: 'Personal bio, projects, and contact.', defaults: { menu: ['Home', 'About', 'Projects', 'Contact'], headline: 'Hello, I build thoughtful things.', servicesHeading: 'Highlights', sections: ['services', 'timeline', 'cta'] } },
  { id: 'portfolio', name: 'Portfolio', icon: 'palette', description: 'Creative showcase and case studies.', defaults: { menu: ['Home', 'About', 'Work', 'Contact'], headline: 'Selected creative work & visual craft.', servicesHeading: 'Selected Work', sections: ['services', 'projects', 'testimonials', 'cta'] } },
  { id: 'developer', name: 'Developer Portfolio', icon: 'code', description: 'Engineering projects, stack, and GitHub.', defaults: { menu: ['Home', 'About', 'Projects', 'Contact'], headline: 'Full-stack engineer crafting fast software.', servicesHeading: 'Featured Projects', sections: ['services', 'projects', 'timeline', 'faq'] } },
  { id: 'resume', name: 'Resume / CV', icon: 'book', description: 'Experience timeline, skills, and achievements.', defaults: { menu: ['Home', 'About', 'Experience', 'Contact'], headline: 'Curriculum Vitae & Career Highlights.', servicesHeading: 'Core Skills', sections: ['services', 'timeline', 'testimonials'] } },
  { id: 'business', name: 'Business', icon: 'briefcase', description: 'Company profile, offerings, and trust.', defaults: { menu: ['Home', 'About', 'Services', 'Pricing', 'Contact'], headline: 'Reliable solutions built for growing teams.', servicesHeading: 'Our Services', sections: ['services', 'features', 'testimonials', 'partners', 'cta'] } },
  { id: 'startup', name: 'Startup', icon: 'rocket', description: 'Product pitch, traction, and waitlist.', defaults: { menu: ['Home', 'Features', 'Pricing', 'FAQ', 'Contact'], headline: 'Ship faster with a smarter workflow.', servicesHeading: 'Platform Capabilities', sections: ['features', 'services', 'pricing', 'faq', 'newsletter', 'cta'] } },
  { id: 'saas', name: 'SaaS / Software', icon: 'cpu', description: 'Cloud product landing, tiers, and FAQ.', defaults: { menu: ['Home', 'Features', 'Pricing', 'FAQ', 'Contact'], headline: 'Software engineered for clarity and speed.', servicesHeading: 'Core Modules', sections: ['features', 'pricing', 'testimonials', 'faq', 'partners', 'cta'] } },
  { id: 'mobile-app', name: 'Mobile App Landing', icon: 'smartphone', description: 'App benefits, screens, and reviews.', defaults: { menu: ['Home', 'Features', 'Reviews', 'FAQ', 'Contact'], headline: 'Your daily companion, right in your pocket.', servicesHeading: 'App Highlights', sections: ['features', 'services', 'testimonials', 'faq', 'newsletter'] } },
  { id: 'agency', name: 'Agency', icon: 'layers', description: 'Design, strategy, team, and client work.', defaults: { menu: ['Home', 'About', 'Work', 'Team', 'Contact'], headline: 'We design brands and digital products.', servicesHeading: 'Capabilities', sections: ['services', 'projects', 'team', 'partners', 'testimonials', 'cta'] } },
  { id: 'freelancer', name: 'Freelancer', icon: 'feather', description: 'Independent consultant services & rates.', defaults: { menu: ['Home', 'About', 'Services', 'Pricing', 'Contact'], headline: 'Independent expertise tailored to your goals.', servicesHeading: 'How I Can Help', sections: ['services', 'pricing', 'testimonials', 'faq'] } },
  { id: 'blog', name: 'Blog', icon: 'pen', description: 'Essays, articles, and reader newsletter.', defaults: { menu: ['Home', 'About', 'Blog', 'Contact'], headline: 'Notes on craft, technology, and ideas.', servicesHeading: 'Featured Articles', sections: ['services', 'newsletter', 'faq'] } },
  { id: 'magazine', name: 'Magazine / News', icon: 'globe', description: 'Editorial stories, columns, and dispatches.', defaults: { menu: ['Home', 'About', 'Stories', 'Team', 'Contact'], headline: 'Independent journalism and deep stories.', servicesHeading: 'Latest Stories', sections: ['services', 'projects', 'team', 'newsletter'] } },
  { id: 'restaurant', name: 'Restaurant', icon: 'utensils', description: 'Signature dishes, story, and reservations.', defaults: { menu: ['Home', 'About', 'Menu', 'Gallery', 'Contact'], headline: 'Seasonal flavours crafted fresh every evening.', servicesHeading: 'Signature Menu', sections: ['services', 'gallery', 'testimonials', 'cta'] } },
  { id: 'cafe', name: 'Cafe / Bakery', icon: 'coffee', description: 'Roasts, pastries, hours, and cozy gallery.', defaults: { menu: ['Home', 'About', 'Menu', 'Gallery', 'Contact'], headline: 'Small-batch coffee and warm artisan bakes.', servicesHeading: 'Daily Menu', sections: ['services', 'gallery', 'testimonials'] } },
  { id: 'event', name: 'Event / Conference', icon: 'calendar', description: 'Schedule, speakers, tickets, and FAQ.', defaults: { menu: ['Home', 'About', 'Schedule', 'Pricing', 'FAQ', 'Contact'], headline: 'Where builders and thinkers gather live.', servicesHeading: 'Event Tracks', sections: ['timeline', 'team', 'pricing', 'faq', 'partners'] } },
  { id: 'wedding', name: 'Wedding', icon: 'heart', description: 'Celebration schedule, story, and RSVP.', defaults: { menu: ['Home', 'Story', 'Schedule', 'Gallery', 'Contact'], headline: 'Join us as we celebrate our next chapter.', servicesHeading: 'Weekend Events', sections: ['timeline', 'gallery', 'faq'] } },
  { id: 'photography', name: 'Photography', icon: 'camera', description: 'Visual gallery, sessions, and bookings.', defaults: { menu: ['Home', 'About', 'Gallery', 'Pricing', 'Contact'], headline: 'Capturing honest light and human stories.', servicesHeading: 'Session Packages', sections: ['gallery', 'services', 'pricing', 'testimonials'] } },
  { id: 'music', name: 'Music / Band', icon: 'music', description: 'Releases, tour dates, and booking.', defaults: { menu: ['Home', 'About', 'Releases', 'Events', 'Contact'], headline: 'Live sound, new records, and upcoming dates.', servicesHeading: 'Discography & Shows', sections: ['services', 'timeline', 'gallery', 'newsletter'] } },
  { id: 'podcast', name: 'Podcast', icon: 'mic', description: 'Episodes, hosts, and listener notes.', defaults: { menu: ['Home', 'About', 'Episodes', 'FAQ', 'Contact'], headline: 'Weekly conversations with curious minds.', servicesHeading: 'Recent Episodes', sections: ['services', 'team', 'newsletter', 'faq'] } },
  { id: 'gaming', name: 'Gaming', icon: 'gamepad', description: 'Community, tournaments, and highlights.', defaults: { menu: ['Home', 'About', 'Games', 'Events', 'Contact'], headline: 'Play together, compete, and level up.', servicesHeading: 'Featured Modes', sections: ['services', 'features', 'timeline', 'cta'] } },
  { id: 'education', name: 'Education / Course', icon: 'award', description: 'Curriculum, syllabus, pricing, and FAQ.', defaults: { menu: ['Home', 'About', 'Curriculum', 'Pricing', 'FAQ', 'Contact'], headline: 'Master practical skills at your own pace.', servicesHeading: 'Course Modules', sections: ['services', 'timeline', 'pricing', 'testimonials', 'faq'] } },
  { id: 'school', name: 'School / College', icon: 'building', description: 'Programs, faculty, campus life, admissions.', defaults: { menu: ['Home', 'About', 'Programs', 'Team', 'Contact'], headline: 'Inspiring lifelong curiosity and excellence.', servicesHeading: 'Academic Programs', sections: ['services', 'team', 'gallery', 'faq'] } },
  { id: 'ngo', name: 'NGO / Charity', icon: 'leaf', description: 'Mission, impact metrics, and volunteering.', defaults: { menu: ['Home', 'About', 'Programs', 'Team', 'Contact'], headline: 'Working together for lasting community impact.', servicesHeading: 'Active Initiatives', sections: ['services', 'timeline', 'team', 'cta', 'newsletter'] } },
  { id: 'fitness', name: 'Fitness / Gym', icon: 'dumbbell', description: 'Classes, coaches, memberships, and hours.', defaults: { menu: ['Home', 'About', 'Classes', 'Pricing', 'Contact'], headline: 'Train smarter and build lasting strength.', servicesHeading: 'Training Programs', sections: ['services', 'pricing', 'team', 'testimonials'] } },
  { id: 'clinic', name: 'Clinic / Healthcare', icon: 'stethoscope', description: 'Treatments, specialists, hours, and booking.', defaults: { menu: ['Home', 'About', 'Services', 'Team', 'FAQ', 'Contact'], headline: 'Compassionate care for every stage of health.', servicesHeading: 'Clinical Services', sections: ['services', 'team', 'faq', 'cta'] } },
  { id: 'real-estate', name: 'Real Estate', icon: 'key', description: 'Featured properties, agents, and inquiries.', defaults: { menu: ['Home', 'About', 'Listings', 'Team', 'Contact'], headline: 'Find spaces designed for how you live.', servicesHeading: 'Featured Listings', sections: ['services', 'projects', 'team', 'testimonials'] } },
  { id: 'travel', name: 'Travel / Tourism', icon: 'plane', description: 'Curated itineraries, destinations, and guides.', defaults: { menu: ['Home', 'About', 'Trips', 'Gallery', 'Contact'], headline: 'Curated journeys to unforgettable places.', servicesHeading: 'Signature Trips', sections: ['services', 'gallery', 'timeline', 'testimonials'] } },
  { id: 'law', name: 'Law / Consulting', icon: 'scale', description: 'Practice areas, counsel, and consultation.', defaults: { menu: ['Home', 'About', 'Practice', 'Team', 'Contact'], headline: 'Clear counsel for complex decisions.', servicesHeading: 'Practice Areas', sections: ['services', 'team', 'faq', 'partners'] } },
  { id: 'salon', name: 'Salon / Spa', icon: 'scissors', description: 'Treatments, stylists, pricing, and booking.', defaults: { menu: ['Home', 'About', 'Services', 'Pricing', 'Contact'], headline: 'Calm rituals for hair, skin, and renewal.', servicesHeading: 'Treatments', sections: ['services', 'pricing', 'gallery', 'testimonials'] } },
  { id: 'store', name: 'Online Store Showcase', icon: 'shopping-bag', description: 'Product catalog, pricing, and direct orders.', defaults: { menu: ['Home', 'About', 'Shop', 'FAQ', 'Contact'], headline: 'Everyday goods crafted with honest materials.', servicesHeading: 'Featured Products', sections: ['services', 'features', 'gallery', 'faq', 'newsletter'] } },
];

/* ==========================================================================
   Step 03 · 12 Layouts (with visual thumbnails) + Layout Controls
   ========================================================================== */
export const LAYOUT_LIST = [
  { id: 'classic', name: 'Classic', description: 'Top bar, centered hero, balanced sections.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="9" rx="2" fill="currentColor" opacity=".2"/><rect x="26" y="19" width="68" height="16" rx="2" fill="currentColor" opacity=".34"/><rect x="8" y="42" width="32" height="26" rx="2" fill="currentColor" opacity=".18"/><rect x="44" y="42" width="32" height="26" rx="2" fill="currentColor" opacity=".18"/><rect x="80" y="42" width="32" height="26" rx="2" fill="currentColor" opacity=".18"/></svg>` },
  { id: 'sidebar', name: 'Sidebar', description: 'Persistent left rail with wide content area.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="26" height="68" rx="2" fill="currentColor" opacity=".28"/><rect x="36" y="6" width="80" height="22" rx="2" fill="currentColor" opacity=".34"/><rect x="36" y="34" width="38" height="36" rx="2" fill="currentColor" opacity=".18"/><rect x="78" y="34" width="38" height="36" rx="2" fill="currentColor" opacity=".18"/></svg>` },
  { id: 'minimal', name: 'Minimal', description: 'Narrow editorial column with quiet rules.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="24" y="6" width="72" height="6" rx="1.5" fill="currentColor" opacity=".2"/><rect x="24" y="18" width="52" height="12" rx="2" fill="currentColor" opacity=".35"/><rect x="24" y="36" width="72" height="2" rx="1" fill="currentColor" opacity=".2"/><rect x="24" y="43" width="72" height="11" rx="1.5" fill="currentColor" opacity=".16"/><rect x="24" y="58" width="72" height="11" rx="1.5" fill="currentColor" opacity=".16"/></svg>` },
  { id: 'card-grid', name: 'Card Grid', description: 'Bento grid tiles across hero, about, and work.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="8" rx="2" fill="currentColor" opacity=".18"/><rect x="4" y="16" width="70" height="28" rx="3" fill="currentColor" opacity=".34"/><rect x="78" y="16" width="38" height="28" rx="3" fill="currentColor" opacity=".2"/><rect x="4" y="48" width="35" height="24" rx="3" fill="currentColor" opacity=".2"/><rect x="43" y="48" width="35" height="24" rx="3" fill="currentColor" opacity=".2"/><rect x="82" y="48" width="34" height="24" rx="3" fill="currentColor" opacity=".2"/></svg>` },
  { id: 'split-hero', name: 'Split Hero', description: '50/50 asymmetric hero with brand showcase.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="8" rx="2" fill="currentColor" opacity=".18"/><rect x="4" y="16" width="54" height="30" rx="2" fill="currentColor" opacity=".28"/><rect x="62" y="16" width="54" height="30" rx="2" fill="currentColor" opacity=".38"/><rect x="4" y="52" width="54" height="20" rx="2" fill="currentColor" opacity=".16"/><rect x="62" y="52" width="54" height="20" rx="2" fill="currentColor" opacity=".16"/></svg>` },
  { id: 'magazine', name: 'Magazine', description: 'Editorial masthead, featured lead, multi-column.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="34" y="4" width="52" height="7" rx="1.5" fill="currentColor" opacity=".36"/><rect x="4" y="14" width="112" height="2" fill="currentColor" opacity=".2"/><rect x="4" y="20" width="66" height="30" rx="2" fill="currentColor" opacity=".28"/><rect x="74" y="20" width="42" height="13" rx="2" fill="currentColor" opacity=".2"/><rect x="74" y="37" width="42" height="13" rx="2" fill="currentColor" opacity=".2"/><rect x="4" y="54" width="112" height="18" rx="2" fill="currentColor" opacity=".14"/></svg>` },
  { id: 'masonry-gallery', name: 'Masonry Gallery', description: 'Staggered visual columns ideal for portfolios.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="8" rx="2" fill="currentColor" opacity=".18"/><rect x="4" y="16" width="35" height="26" rx="2" fill="currentColor" opacity=".32"/><rect x="43" y="16" width="35" height="18" rx="2" fill="currentColor" opacity=".22"/><rect x="82" y="16" width="34" height="32" rx="2" fill="currentColor" opacity=".28"/><rect x="4" y="46" width="35" height="24" rx="2" fill="currentColor" opacity=".18"/><rect x="43" y="38" width="35" height="32" rx="2" fill="currentColor" opacity=".26"/><rect x="82" y="52" width="34" height="18" rx="2" fill="currentColor" opacity=".18"/></svg>` },
  { id: 'one-page-landing', name: 'One-Page Landing', description: 'Bold alternating full-bleed marketing bands.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="20" rx="2" fill="currentColor" opacity=".34"/><rect x="4" y="28" width="112" height="14" rx="2" fill="currentColor" opacity=".14"/><rect x="4" y="46" width="112" height="14" rx="2" fill="currentColor" opacity=".24"/><rect x="4" y="64" width="112" height="8" rx="2" fill="currentColor" opacity=".16"/></svg>` },
  { id: 'centered-stack', name: 'Centered Stack', description: 'Symmetrical centered narrative from top to bottom.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="36" y="5" width="48" height="7" rx="2" fill="currentColor" opacity=".26"/><rect x="20" y="17" width="80" height="16" rx="2" fill="currentColor" opacity=".34"/><rect x="28" y="38" width="64" height="14" rx="2" fill="currentColor" opacity=".18"/><rect x="28" y="56" width="64" height="14" rx="2" fill="currentColor" opacity=".18"/></svg>` },
  { id: 'left-nav-docs', name: 'Left-Nav Docs', description: 'Structured sidebar table-of-contents + clean reading pane.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="8" rx="2" fill="currentColor" opacity=".22"/><rect x="4" y="16" width="24" height="56" rx="2" fill="currentColor" opacity=".18"/><rect x="34" y="16" width="82" height="16" rx="2" fill="currentColor" opacity=".32"/><rect x="34" y="36" width="82" height="14" rx="2" fill="currentColor" opacity=".16"/><rect x="34" y="54" width="82" height="18" rx="2" fill="currentColor" opacity=".16"/></svg>` },
  { id: 'timeline', name: 'Timeline', description: 'Vertical milestone spine linking story & chapters.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="59" y="14" width="2" height="58" fill="currentColor" opacity=".3"/><circle cx="60" cy="22" r="3" fill="currentColor"/><circle cx="60" cy="42" r="3" fill="currentColor"/><circle cx="60" cy="62" r="3" fill="currentColor"/><rect x="10" y="16" width="42" height="14" rx="2" fill="currentColor" opacity=".22"/><rect x="68" y="34" width="42" height="14" rx="2" fill="currentColor" opacity=".28"/><rect x="10" y="54" width="42" height="14" rx="2" fill="currentColor" opacity=".22"/></svg>` },
  { id: 'fullscreen-hero', name: 'Full-Screen Hero', description: 'Immersive full-viewport opening banner + flowing page.', thumbnailSvg: `<svg viewBox="0 0 120 76" aria-hidden="true"><rect x="4" y="4" width="112" height="44" rx="3" fill="currentColor" opacity=".36"/><rect x="28" y="18" width="64" height="8" rx="2" fill="#fff" opacity=".6"/><rect x="44" y="31" width="32" height="7" rx="2" fill="#fff" opacity=".5"/><rect x="4" y="52" width="54" height="20" rx="2" fill="currentColor" opacity=".18"/><rect x="62" y="52" width="54" height="20" rx="2" fill="currentColor" opacity=".18"/></svg>` },
];

/* ==========================================================================
   Curated Template Gallery Families & Featured Priority Order
   Maps editorial style labels onto the existing 24 themes (zero duplication).
   ========================================================================== */
export const GALLERY_FAMILIES = [
  {
    id: 'classic',
    title: 'Classic Templates',
    subtitle: 'Editorial top navigation, structured hero rhythm, and balanced multi-column sections.',
    variants: [
      { styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Ink', themeId: 'charcoal-gold', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Rust', themeId: 'autumn-rust', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Slate', themeId: 'slate-gray', headingFont: 'transitional-serif', bodyFont: 'modern-sans' },
      { styleLabel: 'Newsprint', themeId: 'mono-bw', headingFont: 'classic-serif', bodyFont: 'modern-sans' },
      { styleLabel: 'Mustard', themeId: 'retro-yellow', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
    ],
  },
  {
    id: 'sidebar',
    title: 'Sidebar Templates',
    subtitle: 'Persistent architectural left rail paired with an airy, scrollable reading column.',
    variants: [
      { styleLabel: 'Forest', themeId: 'forest-green', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Rust', themeId: 'autumn-rust', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Harbor', themeId: 'ocean-blue', headingFont: 'transitional-serif', bodyFont: 'modern-sans' },
      { styleLabel: 'Clay', themeId: 'coffee-brown', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Slate', themeId: 'slate-gray', headingFont: 'modern-sans', bodyFont: 'modern-sans' },
      { styleLabel: 'Night', themeId: 'dark-pro', headingFont: 'geometric-sans', bodyFont: 'modern-sans' },
    ],
  },
  {
    id: 'minimal',
    title: 'Minimal Templates',
    subtitle: 'Quiet single-column typography with generous margins and restrained hairline rules.',
    variants: [
      { styleLabel: 'Harbor', themeId: 'ocean-blue', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'old-style', bodyFont: 'humanist-sans' },
      { styleLabel: 'Ink', themeId: 'charcoal-gold', headingFont: 'classic-serif', bodyFont: 'modern-sans' },
      { styleLabel: 'Rust', themeId: 'autumn-rust', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Forest', themeId: 'forest-green', headingFont: 'old-style', bodyFont: 'humanist-sans' },
      { styleLabel: 'Clay', themeId: 'coffee-brown', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Night', themeId: 'dark-pro', headingFont: 'modern-sans', bodyFont: 'modern-sans' },
    ],
  },
  {
    id: 'split-hero',
    title: 'Split Templates',
    subtitle: '50/50 asymmetric editorial hero with dedicated visual showcase and structured grid below.',
    variants: [
      { styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Ink', themeId: 'charcoal-gold', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Rust', themeId: 'autumn-rust', headingFont: 'transitional-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Slate', themeId: 'slate-gray', headingFont: 'geometric-sans', bodyFont: 'modern-sans' },
    ],
  },
  {
    id: 'magazine',
    title: 'Magazine Templates',
    subtitle: 'Double-ruled editorial masthead, asymmetric feature lead, and multi-column publication rhythm.',
    variants: [
      { styleLabel: 'Newsprint', themeId: 'mono-bw', headingFont: 'classic-serif', bodyFont: 'humanist-sans', featured: true },
      { styleLabel: 'Slate', themeId: 'slate-gray', headingFont: 'transitional-serif', bodyFont: 'modern-sans' },
      { styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Ink', themeId: 'charcoal-gold', headingFont: 'classic-serif', bodyFont: 'modern-sans' },
    ],
  },
  {
    id: 'card-grid',
    title: 'Card Grid Templates',
    subtitle: 'Structured bento-style tiles framing hero, capabilities, and projects with clean geometry.',
    variants: [
      { styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Rust', themeId: 'autumn-rust', headingFont: 'geometric-sans', bodyFont: 'modern-sans' },
      { styleLabel: 'Slate', themeId: 'slate-gray', headingFont: 'modern-sans', bodyFont: 'modern-sans' },
      { styleLabel: 'Forest', themeId: 'forest-green', headingFont: 'classic-serif', bodyFont: 'humanist-sans' },
      { styleLabel: 'Harbor', themeId: 'ocean-blue', headingFont: 'geometric-sans', bodyFont: 'modern-sans' },
      { styleLabel: 'Night', themeId: 'dark-pro', headingFont: 'geometric-sans', bodyFont: 'modern-sans' },
    ],
  },
];

// Top 6 featured templates in exact presentation priority order
export const FEATURED_TEMPLATES = [
  { layoutId: 'classic', layoutLabel: 'Classic', styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: 'Warm ivory editorial' },
  { layoutId: 'magazine', layoutLabel: 'Magazine', styleLabel: 'Newsprint', themeId: 'mono-bw', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: 'Masthead & feature grid' },
  { layoutId: 'minimal', layoutLabel: 'Minimal', styleLabel: 'Harbor', themeId: 'ocean-blue', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: 'Serene single column' },
  { layoutId: 'sidebar', layoutLabel: 'Sidebar', styleLabel: 'Forest', themeId: 'forest-green', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: 'Persistent left rail' },
  { layoutId: 'split-hero', layoutLabel: 'Split', styleLabel: 'Paper', themeId: 'golden-luxury', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: '50/50 brand showcase' },
  { layoutId: 'classic', layoutLabel: 'Classic', styleLabel: 'Ink', themeId: 'charcoal-gold', headingFont: 'classic-serif', bodyFont: 'humanist-sans', note: 'Rich dark studio' },
];

export const HEADER_STYLES = [
  { id: 'sticky', name: 'Sticky', description: 'Stays pinned as you scroll.' },
  { id: 'static', name: 'Static', description: 'Scrolls naturally with the page.' },
  { id: 'transparent', name: 'Transparent over Hero', description: 'Floats cleanly over the opening hero.' },
  { id: 'centered', name: 'Centered Logo', description: 'Brand centered above navigation links.' },
  { id: 'split', name: 'Split Nav', description: 'Brand left, links center, CTA right.' },
];

export const CONTENT_WIDTHS = [
  { id: 'narrow', name: 'Narrow', css: '780px' },
  { id: 'normal', name: 'Normal', css: '1080px' },
  { id: 'wide', name: 'Wide', css: '1280px' },
  { id: 'full', name: 'Full', css: '100%' },
];

export const DIVIDER_STYLES = [
  { id: 'none', name: 'None' },
  { id: 'wave', name: 'Wave' },
  { id: 'slant', name: 'Slant' },
  { id: 'curve', name: 'Curve' },
];

/* ==========================================================================
   Step 04 · 12 System Font Stacks + Style Options
   ========================================================================== */
export const FONT_STACKS = [
  { id: 'modern-sans', name: 'Modern Sans', sample: 'Clean contemporary UI sans', css: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'humanist-sans', name: 'Humanist Sans', sample: 'Warm legible humanist strokes', css: '"Segoe UI", Candara, "Bitstream Vera Sans", "DejaVu Sans", Trebuchet MS, sans-serif' },
  { id: 'geometric-sans', name: 'Geometric Sans', sample: 'Crisp circular geometric feel', css: '"Avenir Next", Avenir, "Century Gothic", CenturyGothic, AppleGothic, sans-serif' },
  { id: 'classic-serif', name: 'Classic Serif', sample: 'Timeless editorial book serif', css: 'Georgia, "Times New Roman", Times, serif' },
  { id: 'transitional-serif', name: 'Transitional Serif', sample: 'Sharp balanced magazine serif', css: 'Baskerville, "Baskerville Old Face", "Hoefler Text", Garamond, Georgia, serif' },
  { id: 'slab-serif', name: 'Slab Serif', sample: 'Sturdy bold slab-serif presence', css: 'Rockwell, "Courier Bold", Courier, Georgia, serif' },
  { id: 'monospace', name: 'Monospace', sample: 'Technical fixed-width clarity', css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' },
  { id: 'rounded', name: 'Rounded', sample: 'Friendly soft rounded terminals', css: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, "Arial Rounded MT Bold", sans-serif' },
  { id: 'condensed', name: 'Condensed', sample: 'Compact athletic headline voice', css: '"Arial Narrow", "Roboto Condensed", Impact, Haettenschweiler, sans-serif' },
  { id: 'elegant-display', name: 'Elegant Display', sample: 'High-contrast luxury display', css: 'Didot, "Bodoni MT", "Noto Serif Display", "URW Palladio L", P052, Georgia, serif' },
  { id: 'handwriting', name: 'Handwriting / Cursive', sample: 'Expressive handwritten character', css: '"Segoe Print", "Bradley Hand", Chilanka, TSCu_Comic, casual, cursive' },
  { id: 'old-style', name: 'Old-Style', sample: 'Classical humanist literary serif', css: '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, Palatino, serif' },
];

export const FONT_STACK_MAP = Object.fromEntries(FONT_STACKS.map((f) => [f.id, f]));

export const HEADING_WEIGHTS = [
  { id: 'normal', name: 'Normal', css: '500' },
  { id: 'bold', name: 'Bold', css: '700' },
  { id: 'extra-bold', name: 'Extra-Bold', css: '800' },
];

export const BASE_FONT_SIZES = [
  { id: 'small', name: 'Small', css: '14.5px' },
  { id: 'medium', name: 'Medium', css: '16px' },
  { id: 'large', name: 'Large', css: '17.5px' },
  { id: 'extra-large', name: 'Extra-Large', css: '19px' },
];

export const LINE_HEIGHTS = [
  { id: 'tight', name: 'Tight', css: '1.42' },
  { id: 'normal', name: 'Normal', css: '1.65' },
  { id: 'relaxed', name: 'Relaxed', css: '1.85' },
];

export const CORNER_RADII = [
  { id: 'square', name: 'Square', css: '0px', btnCss: '0px' },
  { id: 'small', name: 'Small', css: '6px', btnCss: '6px' },
  { id: 'medium', name: 'Medium', css: '12px', btnCss: '9px' },
  { id: 'large', name: 'Large', css: '20px', btnCss: '14px' },
  { id: 'pill', name: 'Pill', css: '26px', btnCss: '999px' },
];

export const BUTTON_STYLES = [
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'soft', name: 'Soft' },
  { id: 'pill', name: 'Pill' },
  { id: 'gradient', name: 'Gradient' },
  { id: '3d', name: '3D Raised' },
];

export const CARD_STYLES = [
  { id: 'flat', name: 'Flat' },
  { id: 'bordered', name: 'Bordered' },
  { id: 'shadow', name: 'Shadow' },
  { id: 'glass', name: 'Glass' },
  { id: 'neumorphic', name: 'Neumorphic' },
];

export const SHADOW_STRENGTHS = [
  { id: 'none', name: 'None', css: 'none' },
  { id: 'soft', name: 'Soft', css: '0 4px 16px rgba(0,0,0,0.06)' },
  { id: 'medium', name: 'Medium', css: '0 10px 28px rgba(0,0,0,0.11)' },
  { id: 'strong', name: 'Strong', css: '0 18px 42px rgba(0,0,0,0.2)' },
];

export const SPACING_DENSITIES = [
  { id: 'compact', name: 'Compact', padY: '2.4rem', gap: '1rem' },
  { id: 'comfortable', name: 'Comfortable', padY: '3.8rem', gap: '1.35rem' },
  { id: 'spacious', name: 'Spacious', padY: '5.2rem', gap: '1.8rem' },
];

export const BACKGROUND_STYLES = [
  { id: 'plain', name: 'Plain' },
  { id: 'gradient', name: 'Soft Gradient' },
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'diagonal', name: 'Diagonal Lines' },
  { id: 'waves', name: 'Waves' },
];

export const ANIMATION_STYLES = [
  { id: 'none', name: 'None' },
  { id: 'fade-in', name: 'Fade In' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'stagger', name: 'Stagger on Scroll' },
];

export const DARK_MODE_DEFAULTS = [
  { id: 'auto', name: 'Auto (OS Preference)' },
  { id: 'light', name: 'Always Light' },
  { id: 'dark', name: 'Always Dark' },
];

/* ==========================================================================
   Step 05 · Menu Options
   ========================================================================== */
export const MENU_QUICK_CHIPS = [
  { label: 'Home', target: '#top' },
  { label: 'About', target: '#about' },
  { label: 'Services', target: '#services' },
  { label: 'Portfolio', target: '#projects' },
  { label: 'Projects', target: '#projects' },
  { label: 'Blog', target: '#services' },
  { label: 'Pricing', target: '#pricing' },
  { label: 'Gallery', target: '#gallery' },
  { label: 'Team', target: '#team' },
  { label: 'Testimonials', target: '#testimonials' },
  { label: 'FAQ', target: '#faq' },
  { label: 'Contact', target: '#contact' },
  { label: 'Shop', target: '#services' },
  { label: 'Events', target: '#timeline' },
  { label: 'Menu', target: '#services' },
  { label: 'Careers', target: '#contact' },
];

export const SECTION_ANCHORS = [
  { id: '#top', label: 'Top / Hero' },
  { id: '#about', label: 'About' },
  { id: '#services', label: 'Services' },
  { id: '#projects', label: 'Projects' },
  { id: '#features', label: 'Features' },
  { id: '#testimonials', label: 'Testimonials' },
  { id: '#pricing', label: 'Pricing' },
  { id: '#team', label: 'Team' },
  { id: '#faq', label: 'FAQ' },
  { id: '#gallery', label: 'Gallery' },
  { id: '#timeline', label: 'Timeline' },
  { id: '#newsletter', label: 'Newsletter' },
  { id: '#contact', label: 'Contact' },
];

export const MENU_ALIGNMENTS = [
  { id: 'left', name: 'Left' },
  { id: 'center', name: 'Centre' },
  { id: 'right', name: 'Right' },
];

export const MENU_STYLES = [
  { id: 'text', name: 'Text' },
  { id: 'underline', name: 'Underline' },
  { id: 'pill', name: 'Pill' },
  { id: 'boxed', name: 'Boxed' },
];

export const MOBILE_MENU_STYLES = [
  { id: 'dropdown', name: 'Dropdown' },
  { id: 'slide-in', name: 'Slide-In Drawer' },
  { id: 'fullscreen', name: 'Full-Screen Overlay' },
];

/* ==========================================================================
   Step 06 · Hero Options & Step 07 · About Options
   ========================================================================== */
export const HERO_ALIGNMENTS = [
  { id: 'left', name: 'Left' },
  { id: 'center', name: 'Centre' },
  { id: 'right', name: 'Right' },
];

export const HERO_HEIGHTS = [
  { id: 'compact', name: 'Compact', css: '320px' },
  { id: 'medium', name: 'Medium', css: '460px' },
  { id: 'tall', name: 'Tall', css: '600px' },
  { id: 'fullscreen', name: 'Full-Screen', css: '88vh' },
];

export const HEADLINE_SIZES = [
  { id: 'm', name: 'M', css: 'clamp(1.85rem, 3.2vw, 2.5rem)' },
  { id: 'l', name: 'L', css: 'clamp(2.25rem, 4.4vw, 3.4rem)' },
  { id: 'xl', name: 'XL', css: 'clamp(2.7rem, 5.5vw, 4.3rem)' },
];

export const HERO_BG_MODES = [
  { id: 'theme', name: 'Theme Colour' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'pattern', name: 'Pattern' },
  { id: 'image', name: 'Uploaded Image' },
];

export const IMAGE_SHAPES = [
  { id: 'square', name: 'Square' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'circle', name: 'Circle' },
  { id: 'blob', name: 'Blob' },
  { id: 'arch', name: 'Arch' },
  { id: 'hexagon', name: 'Hexagon' },
];

export const ABOUT_IMAGE_POSITIONS = [
  { id: 'left', name: 'Left' },
  { id: 'right', name: 'Right' },
  { id: 'top', name: 'Top' },
];

/* ==========================================================================
   Step 08 · 12 Toggleable & Draggable Sections
   ========================================================================== */
export const SECTION_CATALOG = [
  { id: 'services', name: 'Services / Offerings', defaultHeading: 'Services & Offerings', defaultSubheading: 'Tailored solutions crafted for real outcomes.' },
  { id: 'projects', name: 'Projects Gallery', defaultHeading: 'Featured Projects', defaultSubheading: 'A closer look at recent highlights.' },
  { id: 'features', name: 'Features Grid', defaultHeading: 'Why Choose Us', defaultSubheading: 'Built around clarity, speed, and attention to detail.' },
  { id: 'testimonials', name: 'Testimonials', defaultHeading: 'What People Say', defaultSubheading: 'Kind words from clients and collaborators.' },
  { id: 'pricing', name: 'Pricing Plans', defaultHeading: 'Simple, Transparent Pricing', defaultSubheading: 'Pick the plan that matches your needs.' },
  { id: 'team', name: 'Team Members', defaultHeading: 'Meet the Team', defaultSubheading: 'The people behind every detail.' },
  { id: 'faq', name: 'FAQ Accordion', defaultHeading: 'Frequently Asked Questions', defaultSubheading: 'Quick answers before we start.' },
  { id: 'gallery', name: 'Image Gallery', defaultHeading: 'Visual Gallery', defaultSubheading: 'Click any photo to view full size.' },
  { id: 'timeline', name: 'Timeline / Process', defaultHeading: 'How It Works', defaultSubheading: 'A clear, step-by-step path from idea to launch.' },
  { id: 'partners', name: 'Logos / Partners Strip', defaultHeading: 'Trusted By', defaultSubheading: 'Teams and communities we proudly work with.' },
  { id: 'newsletter', name: 'Newsletter Signup', defaultHeading: 'Stay in the Loop', defaultSubheading: 'Occasional updates—no noise, unsubscribe anytime.' },
  { id: 'cta', name: 'Call-to-Action Banner', defaultHeading: 'Ready to Get Started?', defaultSubheading: 'Reach out today and let us bring your vision to life.' },
];

/* ==========================================================================
   Step 09 · Contact Options
   ========================================================================== */
export const CONTACT_FIELD_OPTIONS = [
  { id: 'name', name: 'Full Name' },
  { id: 'email', name: 'Email Address' },
  { id: 'phone', name: 'Phone Number' },
  { id: 'subject', name: 'Subject' },
  { id: 'dropdown', name: 'Topic Dropdown' },
  { id: 'message', name: 'Message' },
  { id: 'checkbox', name: 'Consent Checkbox' },
];

export const CONTACT_LAYOUTS = [
  { id: 'form-left', name: 'Form Left' },
  { id: 'form-right', name: 'Form Right' },
  { id: 'stacked', name: 'Stacked' },
  { id: 'cards-only', name: 'Cards Only' },
];

/* ==========================================================================
   Step 10 · Footer Styles & 16 Social Platforms
   ========================================================================== */
export const FOOTER_STYLES = [
  { id: 'simple', name: 'Simple' },
  { id: 'multi-column', name: 'Multi-Column' },
  { id: 'centered', name: 'Centered' },
  { id: 'dark', name: 'Dark' },
  { id: 'minimal', name: 'Minimal' },
];

export const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', placeholder: 'facebook.com/yourpage', color: '#1877f2' },
  { id: 'instagram', name: 'Instagram', placeholder: 'instagram.com/handle', color: '#e1306c' },
  { id: 'x', name: 'X', placeholder: 'x.com/handle', color: '#111111' },
  { id: 'linkedin', name: 'LinkedIn', placeholder: 'linkedin.com/in/name', color: '#0a66c2' },
  { id: 'youtube', name: 'YouTube', placeholder: 'youtube.com/@channel', color: '#dc2626' },
  { id: 'github', name: 'GitHub', placeholder: 'github.com/username', color: '#24292f' },
  { id: 'whatsapp', name: 'WhatsApp', placeholder: 'wa.me/15551234567', color: '#16a34a' },
  { id: 'telegram', name: 'Telegram', placeholder: 't.me/username', color: '#0284c7' },
  { id: 'pinterest', name: 'Pinterest', placeholder: 'pinterest.com/handle', color: '#bd081c' },
  { id: 'snapchat', name: 'Snapchat', placeholder: 'snapchat.com/add/handle', color: '#ca8a04' },
  { id: 'reddit', name: 'Reddit', placeholder: 'reddit.com/u/handle', color: '#ea580c' },
  { id: 'discord', name: 'Discord', placeholder: 'discord.gg/invite', color: '#5865f2' },
  { id: 'dribbble', name: 'Dribbble', placeholder: 'dribbble.com/handle', color: '#ea4c89' },
  { id: 'behance', name: 'Behance', placeholder: 'behance.net/handle', color: '#1769ff' },
  { id: 'medium', name: 'Medium', placeholder: 'medium.com/@handle', color: '#111111' },
  { id: 'spotify', name: 'Spotify', placeholder: 'open.spotify.com/artist/id', color: '#16a34a' },
];

export const SOCIAL_ICON_STYLES = [
  { id: 'plain', name: 'Plain' },
  { id: 'circle', name: 'Circle' },
  { id: 'square', name: 'Square' },
  { id: 'coloured', name: 'Coloured' },
];

/* ==========================================================================
   Step 11 · SEO, Logo & Favicon Options
   ========================================================================== */
export const ROBOTS_OPTIONS = [
  { id: 'index, follow', name: 'Index & Follow' },
  { id: 'noindex, nofollow', name: 'No Index' },
];

export const TWITTER_CARD_TYPES = [
  { id: 'summary', name: 'Summary' },
  { id: 'summary_large_image', name: 'Summary Large Image' },
];

export const LOGO_MODES = [
  { id: 'text', name: 'Text Logo' },
  { id: 'upload', name: 'Upload Image' },
  { id: 'emoji', name: 'Emoji Logo' },
];

export const LOGO_SIZES = [
  { id: 's', name: 'Small', px: 28 },
  { id: 'm', name: 'Medium', px: 36 },
  { id: 'l', name: 'Large', px: 46 },
];

export const LOGO_POSITIONS = [
  { id: 'left', name: 'Left' },
  { id: 'center', name: 'Centre' },
];

export const FAVICON_MODES = [
  { id: 'auto-letter', name: 'Auto Initial Letter' },
  { id: 'auto-emoji', name: 'Auto Emoji Circle' },
  { id: 'upload', name: 'Upload Image' },
];

/* ==========================================================================
   Global Preview, App Accent & 10 One-Click Starter Presets
   ========================================================================== */
export const PREVIEW_DEVICES = [
  { id: 'mobile-s', name: 'Mobile S', width: 320, height: 568 },
  { id: 'mobile-m', name: 'Mobile M', width: 375, height: 667 },
  { id: 'mobile-l', name: 'Mobile L', width: 425, height: 740 },
  { id: 'tablet', name: 'Tablet', width: 768, height: 960 },
  { id: 'laptop', name: 'Laptop', width: 1024, height: 768 },
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900 },
  { id: 'full', name: 'Full', width: 0, height: 0 },
];

export const PREVIEW_ZOOMS = [50, 75, 100];

export const APP_ACCENTS = [
  { id: 'terracotta', name: 'Terracotta', hex: '#A65F49', hover: '#8E4F3C', darkHex: '#C97D65' },
  { id: 'forest', name: 'Forest', hex: '#15803d', hover: '#166534', darkHex: '#4ade80' },
  { id: 'ocean', name: 'Ocean', hex: '#1d4ed8', hover: '#1e40af', darkHex: '#60a5fa' },
  { id: 'plum', name: 'Plum', hex: '#7c3aed', hover: '#6d28d9', darkHex: '#a78bfa' },
  { id: 'amber', name: 'Amber', hex: '#b45309', hover: '#92400e', darkHex: '#fbbf24' },
  { id: 'slate', name: 'Slate', hex: '#334155', hover: '#1e293b', darkHex: '#94a3b8' },
];

export const SITE_STRUCTURE_MODES = [
  { id: 'one-page', name: 'One Page (Sections)', desc: 'Single scrolling page with section anchors (#about, #contact). Downloads as one HTML file or ZIP.' },
  { id: 'multi', name: 'Multi-Page Website', desc: 'Each menu item becomes a real .html page (index.html, about.html, blog) with shared header, footer & sitemap.' },
];

export const PAGE_TYPES = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'blog', label: 'Blog / News' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'team', label: 'Team' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
  { id: 'custom', label: 'Custom Text Page' },
];

export const FONT_PAIRINGS = [
  { id: 'editorial', name: 'Editorial Classic', heading: 'classic-serif', body: 'modern-sans', sample: 'Refined Serif + Clean Sans' },
  { id: 'studio-swiss', name: 'Swiss Studio', heading: 'geometric-sans', body: 'modern-sans', sample: 'Geometric Sans + System Sans' },
  { id: 'modern-tech', name: 'Modern Engineer', heading: 'modern-sans', body: 'monospace', sample: 'Crisp Sans + Monospace' },
  { id: 'literary', name: 'Literary Journal', heading: 'old-style', body: 'transitional-serif', sample: 'Old-Style + Transitional Serif' },
  { id: 'bold-impact', name: 'Bold Agency', heading: 'condensed', body: 'humanist-sans', sample: 'Condensed Display + Humanist Sans' },
  { id: 'warm-friendly', name: 'Warm Craft', heading: 'rounded', body: 'humanist-sans', sample: 'Rounded + Friendly Sans' },
  { id: 'minimal-mono', name: 'Minimal Terminal', heading: 'monospace', body: 'modern-sans', sample: 'Monospace + Clean Sans' },
  { id: 'classic-slab', name: 'Press & Slab', heading: 'slab-serif', body: 'modern-sans', sample: 'Slab Serif + Neutral Sans' },
];

export const ANALYTICS_PROVIDERS = [
  { id: 'none', name: 'None (100% Zero Tracking)', placeholder: '', hint: 'Recommended for maximum privacy and zero external scripts.' },
  { id: 'ga4', name: 'Google Analytics 4', placeholder: 'G-XXXXXXXXXX', hint: 'Loads only after visitor clicks Accept on the consent banner.' },
  { id: 'plausible', name: 'Plausible Analytics', placeholder: 'yourdomain.com', hint: 'Privacy-friendly analytics. Loads only after visitor consent.' },
  { id: 'cloudflare', name: 'Cloudflare Web Analytics', placeholder: '32-character hex token', hint: 'Cookie-free beacon loaded only after visitor consent.' },
];

export const LEGAL_PAGE_TYPES = [
  { id: 'privacy', label: 'Privacy Policy', slug: 'privacy-policy' },
  { id: 'terms', label: 'Terms of Service', slug: 'terms' },
  { id: 'disclaimer', label: 'Disclaimer', slug: 'disclaimer' },
  { id: 'refund', label: 'Refund / Returns Policy', slug: 'refund-policy' },
  { id: 'cookies', label: 'Cookie Notice', slug: 'cookie-notice' },
];

export const GO_LIVE_PROVIDERS = [
  {
    id: 'netlify',
    name: 'Netlify (Easiest — Drag & Drop)',
    steps: [
      'Click "Download ZIP" in Step 12 and unzip the folder on your computer.',
      'Sign in to Netlify and choose Sites -> Add new site -> Deploy manually.',
      'Drag your entire unzipped folder onto the upload area.',
      'Your site goes live with automatic HTTPS. Hosting is provided by Netlify; SiteForge prepares the ready-to-upload files.',
    ],
  },
  {
    id: 'github',
    name: 'GitHub Pages',
    steps: [
      'Unzip your SiteForge download so index.html is at the top level.',
      'Create a new repository on GitHub and upload all files from the folder.',
      'Open Repository Settings -> Pages -> Source: Deploy from branch (main / root).',
      'Save and wait a minute for your live HTTPS address. Hosting is provided by GitHub.',
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    steps: [
      'Unzip your SiteForge ZIP folder on your computer.',
      'Open Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Direct Upload.',
      'Name your project, upload the folder, and click Deploy site.',
      'Hosting is provided by Cloudflare; SiteForge builds static files ready for instant delivery.',
    ],
  },
  {
    id: 'standard',
    name: 'Any Web Host (cPanel / FTP)',
    steps: [
      'Open your hosting control panel (File Manager) or connect via FTP/SFTP.',
      'Open the public web folder (usually named public_html, www, or htdocs).',
      'Upload all files and the assets/ folder from your unzipped SiteForge package.',
      'Visit your domain in a browser to verify every page and image loads cleanly.',
    ],
  },
  {
    id: 'domain',
    name: 'Connecting a Custom Domain',
    steps: [
      'In your web host dashboard, open Domain Settings and enter your domain name.',
      'Copy the DNS records shown by your host (usually an A record for @ and a CNAME for www).',
      'Log in to your domain registrar and paste those DNS records.',
      'Once DNS updates, enable automatic HTTPS/SSL in your host settings and add your Site URL in Step 11 so sitemap.xml matches.',
    ],
  },
];

export const LAUNCH_CHECKLIST_ITEMS = [
  { id: 'test-phone', label: 'Test the layout on a mobile width (375px) or phone' },
  { id: 'check-links', label: 'Check all navigation links, buttons, and social links' },
  { id: 'real-contact', label: 'Add real email, phone, or address in Step 9' },
  { id: 'replace-sample', label: 'Replace all default sample text with your own copy' },
  { id: 'health-80', label: 'Reach a Site Health Score of 80 or higher' },
  { id: 'backup-done', label: 'Save a .siteforge backup file of your workspace' },
  { id: 'test-offline', label: 'Test opening your exported site with the internet turned off' },
];

export const TOUR_STEPS = [
  { title: 'Welcome to SiteForge', body: 'Build a complete, multi-page, SEO-ready website 100% offline with zero code and zero AI.' },
  { title: '12 Guided Steps', body: 'Move through the wizard on the left. Use "Smart Copy" or "Surprise me" whenever you are not sure what to write.' },
  { title: 'Click-to-Edit Live Preview', body: 'Click any heading, text, or button in the preview on the right to jump straight to its input field.' },
  { title: 'Site Health Score', body: 'Keep an eye on the live Health badge in the header—it checks SEO, WCAG 2.2 AA accessibility, performance, and security.' },
  { title: 'Your Work Is Protected', body: 'Projects and compressed images auto-save to IndexedDB. Use Settings -> Storage & Data to back up everything into one .siteforge file.' },
  { title: 'Go Live Anywhere', body: 'In Step 12, download a single HTML file or multi-page ZIP with sitemap, JSON-LD, QR poster, and Go-Live instructions.' },
];

export const HELP_CENTER_ITEMS = [
  { term: 'SEO (Search Engine Optimization)', category: 'Glossary', body: 'Metadata, headings, structured JSON-LD data, and sitemap.xml that help search engines understand and rank your pages.' },
  { term: 'Alt Text', category: 'Glossary', body: 'A short plain-language description of an image read aloud by screen readers and shown if an image fails to load.' },
  { term: 'Favicon', category: 'Glossary', body: 'The tiny icon shown in browser tabs and bookmarks. SiteForge generates a full SVG + PNG favicon pack automatically.' },
  { term: 'Web Hosting', category: 'Glossary', body: 'The service that stores your exported HTML/CSS/image files and serves them to visitors over HTTPS (e.g., Netlify, GitHub Pages, Cloudflare Pages, cPanel).' },
  { term: 'Domain Name', category: 'Glossary', body: 'Your human-readable website address (like yourstudio.com), purchased from a registrar and pointed via DNS to your web host.' },
  { term: 'One-Page vs Multi-Page', category: 'FAQ', body: 'In Step 5, pick One Page for a single scrolling site or Multi-Page to generate separate index.html, about.html, services.html, and blog post pages with relative links.' },
  { term: 'Round-Trip Editing ("Open in SiteForge")', category: 'FAQ', body: 'Every exported HTML and ZIP embeds your project data safely inside the file. Drag or open any SiteForge HTML or ZIP back into SiteForge to keep editing anytime.' },
  { term: 'UPI Payments', category: 'FAQ', body: 'SiteForge generates a standard upi://pay link and QR code. Payment happens strictly inside the visitor’s own UPI app; your website never touches money.' },
  { term: 'Offline-Ready Website', category: 'FAQ', body: 'Enable "Make my website work offline" in Step 12 to bundle a Service Worker and Web Manifest inside your exported ZIP. Requires HTTPS hosting (or localhost for testing).' },
  { term: 'Backing Up Your Projects', category: 'FAQ', body: 'Open Settings -> Storage & Data and click "Back up everything" to save all projects and images into one portable .siteforge archive.' },
];

export const WHATS_NEW_ITEMS = [
  { phase: 'Phase A', title: 'IndexedDB Data Safety & .siteforge Backups', detail: 'Projects, compressed image Blobs, and version snapshots live in IndexedDB with storage persistence, 7-day backup reminders, and optional local folder saving.' },
  { phase: 'Phase A', title: 'Sandboxed Click-to-Edit Preview & Multi-Page Sites', detail: 'Preview runs in a strict sandbox without allow-same-origin. Click any preview element to jump to its field, and build multi-page websites with blog posts.' },
  { phase: 'Phase A', title: 'Image Studio, 40 Decorative SVGs & Site Health Score', detail: 'Auto-compress uploads up to 10 MB under 500 KB with crop, rotate, flip, focal point, plus live 5-pillar WCAG 2.2 AA / SEO / Performance grading and 1-click contrast auto-fix.' },
  { phase: 'Phase A', title: 'SEO Power Pack & Go-Live Kit', detail: 'Auto-generated JSON-LD, sitemap.xml, robots.txt, humans.txt, 404.html, Canvas 1200×630 OG image, SVG+PNG favicon pack, Go-Live guide, Launch Checklist & QR code.' },
  { phase: 'Phase B', title: 'Smart Copy Bank & Brand Studio', detail: 'Deterministic writing templates for all 30 site types × 6 tones, 5-rule Brand Color Harmonies, logo color extraction, reusable Custom Themes, and Font Pairings.' },
  { phase: 'Phase B', title: 'Conversion Tools, Bilingual Sites, Offline Export & Legal Pages', detail: 'Floating WhatsApp chat, UPI Pay + pure-JS QR codes & A4 posters, vCard downloads, offline-queuing contact forms, side-by-side bilingual sites, legal templates, consent-gated analytics, and visitor accessibility widget.' },
  { phase: 'Phase C', title: 'Round-Trip Editing, Demo Mode, Command Palette & Security Hardening', detail: 'Re-open any exported HTML or ZIP in SiteForge, Ctrl+K Command Palette, Version History snapshots, Guided Tour, Offline Help Center, Demo Mode with architecture diagram, and SHA-256 CSP headers.' },
];

export function createDefaultState() {
  const sectionMeta = {};
  for (const s of SECTION_CATALOG) {
    sectionMeta[s.id] = {
      enabled: ['services', 'testimonials', 'faq', 'cta'].includes(s.id),
      heading: s.defaultHeading,
      subheading: s.defaultSubheading,
    };
  }

  return {
    schemaVersion: 3,

    // 01 Site Identity
    siteName: '',
    tagline: '',
    siteLanguage: 'en',
    // Phase B4: Bilingual
    bilingualEnabled: false,
    secondLanguage: 'hi',
    exportLangFolders: false,
    translations: {},

    // 02 Site Type
    siteType: 'portfolio',
    copyTone: 'professional',

    // 03 Layout
    layout: 'classic',
    headerStyle: 'sticky',
    contentWidth: 'normal',
    dividerStyle: 'none',

    // 04 Colours, Font & Style (Classic / Paper editorial starter)
    theme: 'golden-luxury',
    useCustomColors: false,
    customPrimary: '#9a6b16',
    customAccent: '#b47d1c',
    customBg: '#faf7f0',
    customText: '#1f1a10',
    headingFont: 'classic-serif',
    bodyFont: 'humanist-sans',
    headingWeight: 'bold',
    baseFontSize: 'medium',
    lineHeight: 'normal',
    cornerRadius: 'small',
    buttonStyle: 'solid',
    cardStyle: 'bordered',
    shadowStrength: 'none',
    spacingDensity: 'comfortable',
    backgroundStyle: 'plain',
    animationStyle: 'fade-in',
    darkModeDefault: 'light',
    showDarkModeToggle: true,
    a11yWidgetEnabled: false,

    // 05 Menu & Multi-Page Structure (Phase A3)
    siteStructure: 'one-page',
    menuItems: [
      { label: 'Home', type: 'section', target: '#top', pageType: 'home', slug: 'index', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'About', type: 'section', target: '#about', pageType: 'about', slug: 'about', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Services', type: 'section', target: '#services', pageType: 'services', slug: 'services', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Contact', type: 'section', target: '#contact', pageType: 'contact', slug: 'contact', metaTitle: '', metaDescription: '', customBody: '' },
    ],
    footerPages: [],
    blogPosts: [],
    menuAlignment: 'right',
    menuStyle: 'text',
    mobileMenuStyle: 'dropdown',
    navCtaEnabled: false,
    navCtaText: 'Get in Touch',
    navCtaLink: '#contact',

    // 06 Hero Section
    heroBadge: '',
    heroHeadline: '',
    heroSubheadline: '',
    heroPrimaryBtnText: 'Start a Project',
    heroPrimaryBtnLink: '#contact',
    heroSecondaryBtnText: 'View Services',
    heroSecondaryBtnLink: '#services',
    heroAlignment: 'left',
    heroHeight: 'medium',
    headlineSize: 'l',
    heroBgMode: 'theme',
    heroBgImage: '',
    heroBgOverlay: 45,
    heroSideImage: '',
    heroSideImageAlt: '',
    heroImageShape: 'rounded',
    decorativeHeroSvg: '',

    // 07 About
    aboutHeading: 'About Us',
    about: '',
    aboutAlignment: 'left',
    aboutImage: '',
    aboutImageAlt: '',
    aboutImageShape: 'rounded',
    aboutImagePosition: 'right',
    decorativeAboutSvg: '',
    aboutHighlights: [
      { icon: 'check', text: 'Crafted with clarity and care' },
      { icon: 'bolt', text: 'Fast, responsive, and accessible' },
    ],
    aboutStats: [
      { number: '120+', label: 'Projects Completed' },
      { number: '98%', label: 'Client Satisfaction' },
    ],

    // Image Studio metadata (width, height, focalX, focalY per image slot)
    imageMeta: {},

    // 08 Services & Extra Sections
    servicesColumns: 3,
    servicesCardStyle: 'inherit',
    services: [
      { title: '', description: '', icon: 'sparkles', image: '', imageAlt: '', price: '', link: '', buttonLabel: '' },
    ],
    sectionOrder: SECTION_CATALOG.map((s) => s.id),
    sections: sectionMeta,
    projects: [
      { title: 'Brand Refresh', category: 'Identity', description: 'Complete visual direction and design system.', link: '' },
      { title: 'Product Website', category: 'Web', description: 'High-clarity launch site built for speed.', link: '' },
    ],
    features: [
      { icon: 'bolt', title: 'Zero Bloat', description: 'Lightweight semantic markup that loads instantly.' },
      { icon: 'shield', title: 'Built to Last', description: 'Clean architecture designed for long-term reliability.' },
      { icon: 'compass', title: 'Thoughtful UX', description: 'Clear hierarchy across desktop, tablet, and mobile.' },
    ],
    testimonials: [
      { name: 'Priya Nair', role: 'Founder, Studio Kalpa', quote: 'Clear communication, sharp execution, and a finished result we are proud to share.', rating: 5 },
      { name: 'Daniel Brooks', role: 'Product Lead, Harbor', quote: 'Delivered ahead of schedule with extraordinary attention to every detail.', rating: 5 },
    ],
    pricingPlans: [
      { name: 'Starter', price: '$49', period: '/month', features: 'Core features\nEmail support\nMonthly review', ctaText: 'Choose Starter', ctaLink: '#contact', highlighted: false },
      { name: 'Pro', price: '$129', period: '/month', features: 'Everything in Starter\nPriority delivery\nDedicated advisor', ctaText: 'Choose Pro', ctaLink: '#contact', highlighted: true },
    ],
    teamMembers: [
      { name: 'Aarav Mehta', role: 'Lead Designer', photo: '' },
      { name: 'Elena Morales', role: 'Principal Engineer', photo: '' },
    ],
    faqItems: [
      { question: 'How quickly can we get started?', answer: 'Reach out using the contact section and we respond within one business day.' },
      { question: 'Do you work with international clients?', answer: 'Yes—we collaborate seamlessly across time zones.' },
    ],
    galleryItems: [],
    timelineItems: [
      { step: '01', title: 'Discovery', description: 'Align on goals, audience, and key milestones.' },
      { step: '02', title: 'Design & Build', description: 'Craft and review working iterations together.' },
      { step: '03', title: 'Launch', description: 'Ship cleanly with full documentation and handoff.' },
    ],
    partners: ['Northstar Labs', 'Cedar & Co.', 'Harbor Studio', 'Meridian Press'],
    newsletterButtonText: 'Subscribe',
    newsletterNote: 'Join 2,000+ readers. Zero spam.',
    ctaButtonText: 'Start a Conversation',
    ctaButtonLink: '#contact',

    // 09 Contact & Conversion Tools (Phase B3)
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    workingHours: 'Mon – Fri, 9:00 AM – 6:00 PM',
    whatsappNumber: '',
    whatsappFloatEnabled: false,
    whatsappMessage: 'Hello! I found your website and would like to connect.',
    upiEnabled: false,
    upiId: '',
    upiAmount: '',
    upiNote: 'Payment',
    vcardEnabled: true,
    directionsEnabled: true,
    contactFormEnabled: true,
    contactFormMode: 'mailto',
    contactFormEndpoint: '',
    contactFormFields: ['name', 'email', 'subject', 'message'],
    contactDropdownOptions: 'General Inquiry, Project Quote, Support',
    contactCheckboxLabel: 'I agree to be contacted regarding my message.',
    contactButtonLabel: 'Send Message',
    contactSuccessText: 'Opening your email app with your message pre-filled.',
    contactLayout: 'form-right',
    showStaticMap: true,
    enableClickToCall: true,
    enableClickToEmail: true,

    // 10 Footer, Social & Legal Pages (Phase B6)
    footerText: '',
    copyrightText: '',
    autoCopyrightYear: true,
    footerStyle: 'multi-column',
    footerLinkGroups: [
      {
        title: 'Explore',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Services', url: '#services' },
          { label: 'Contact', url: '#contact' },
        ],
      },
    ],
    socialLinks: {},
    socialIconStyle: 'circle',
    showBackToTop: true,
    showSiteForgeCredit: true,
    legalPages: { privacy: false, terms: false, disclaimer: false, refund: false, cookies: false },
    legalCountry: 'India',

    // 11 SEO, Logo, Favicon & Analytics (Phase A6 + B6)
    siteUrl: '',
    geoLat: '',
    geoLng: '',
    priceRange: '',
    cuisineType: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    metaAuthor: '',
    canonicalUrl: '',
    robots: 'index, follow',
    ogTitle: '',
    ogDescription: '',
    ogImageDataUrl: '',
    twitterCard: 'summary_large_image',
    logoMode: 'text',
    logoDataUrl: '',
    logoFileName: '',
    logoTextFont: 'modern-sans',
    logoTextColor: '',
    logoEmoji: '✦',
    logoSize: 'm',
    logoPosition: 'left',
    faviconMode: 'auto-letter',
    faviconEmoji: '✦',
    faviconColor: '#c2593f',
    faviconDataUrl: '',
    analyticsProvider: 'none',
    analyticsId: '',

    // 12 Launch & Export Options (Phase A7 + B5)
    makeSiteOffline: false,
    launchChecklist: {},
  };
}

// Local offline SVG compass-star mark for the Northstar Studio Quick Demo
const NORTHSTAR_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
  '<rect width="64" height="64" rx="14" fill="#261813"/>' +
  '<circle cx="32" cy="32" r="21" stroke="#DFD3C7" stroke-width="1.4" stroke-opacity="0.45"/>' +
  '<path d="M32 10L36.8 27.2L54 32L36.8 36.8L32 54L27.2 36.8L10 32L27.2 27.2L32 10Z" fill="#B4482D"/>' +
  '<circle cx="32" cy="32" r="4.2" fill="#FAF7F0"/>' +
  '</svg>';

const NORTHSTAR_LOGO_DATA_URL =
  'data:image/svg+xml;base64,' +
  (typeof btoa === 'function'
    ? btoa(NORTHSTAR_LOGO_SVG)
    : Buffer.from(NORTHSTAR_LOGO_SVG, 'utf8').toString('base64'));

/**
 * Complete, presentation-ready demonstration project ("Northstar Studio")
 * used exclusively inside Safe Temporary Quick Demo Mode.
 */
export function createQuickDemoState() {
  const base = createDefaultState();
  const sections = { ...base.sections };
  for (const key of Object.keys(sections)) {
    sections[key] = { ...sections[key], enabled: false };
  }
  sections.services = {
    enabled: true,
    heading: 'Capabilities & Services',
    subheading: 'Multidisciplinary design and engineering tailored to ambitious brands.',
  };
  sections.projects = {
    enabled: true,
    heading: 'Selected Projects',
    subheading: 'Recent digital products, visual identities, and web platforms.',
  };
  sections.timeline = {
    enabled: true,
    heading: 'Our Process',
    subheading: 'A clear four-stage rhythm from initial strategy to polished launch.',
  };
  sections.testimonials = {
    enabled: true,
    heading: 'Client Perspectives',
    subheading: 'Words from founders and teams we partner with.',
  };
  sections.cta = {
    enabled: true,
    heading: 'Ready to shape your next digital chapter?',
    subheading: 'Tell us about your timeline, goals, and product vision—we respond within one business day.',
  };

  return {
    ...base,
    // 01 Site Identity
    siteName: 'Northstar Studio',
    tagline: 'Building digital experiences that move businesses forward.',
    siteLanguage: 'en',

    // 02 Site Type
    siteType: 'agency',
    copyTone: 'professional',

    // 03 Layout
    layout: 'split-hero',
    headerStyle: 'sticky',
    contentWidth: 'normal',
    dividerStyle: 'none',

    // 04 Colours, Font & Style
    theme: 'autumn-rust',
    useCustomColors: false,
    customPrimary: '#b4482d',
    customAccent: '#c2593f',
    customBg: '#f6f1eb',
    customText: '#261813',
    headingFont: 'classic-serif',
    bodyFont: 'humanist-sans',
    headingWeight: 'bold',
    baseFontSize: 'medium',
    lineHeight: 'normal',
    cornerRadius: 'small',
    buttonStyle: 'solid',
    cardStyle: 'bordered',
    shadowStrength: 'soft',
    spacingDensity: 'comfortable',
    backgroundStyle: 'plain',
    animationStyle: 'fade-in',
    darkModeDefault: 'light',
    showDarkModeToggle: true,

    // 05 Navigation Menu
    siteStructure: 'one-page',
    menuItems: [
      { label: 'Home', type: 'section', target: '#top', pageType: 'home', slug: 'index', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'About', type: 'section', target: '#about', pageType: 'about', slug: 'about', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Services', type: 'section', target: '#services', pageType: 'services', slug: 'services', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Projects', type: 'section', target: '#projects', pageType: 'custom', slug: 'projects', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Process', type: 'section', target: '#timeline', pageType: 'custom', slug: 'process', metaTitle: '', metaDescription: '', customBody: '' },
      { label: 'Contact', type: 'section', target: '#contact', pageType: 'contact', slug: 'contact', metaTitle: '', metaDescription: '', customBody: '' },
    ],
    menuAlignment: 'right',
    menuStyle: 'text',
    navCtaEnabled: true,
    navCtaText: 'Start a Project',
    navCtaLink: '#contact',

    // 06 Hero
    heroBadge: 'Independent Creative & Digital Studio',
    heroHeadline: 'Thoughtful Design. Powerful Digital Experiences.',
    heroSubheadline: 'We help ambitious businesses transform ideas into memorable brands and high-performing digital experiences.',
    heroPrimaryBtnText: 'Start a Project',
    heroPrimaryBtnLink: '#contact',
    heroSecondaryBtnText: 'View Projects',
    heroSecondaryBtnLink: '#projects',
    heroAlignment: 'left',
    heroHeight: 'medium',
    headlineSize: 'xl',
    heroBgMode: 'theme',
    decorativeHeroSvg: 'blob-arch',

    // 07 About
    aboutHeading: 'Strategy, Craft & Modern Engineering',
    about:
      'Northstar Studio is an independent digital design and development studio focused on helping businesses build meaningful connections with their audiences.\n\nWe combine strategy, visual storytelling, thoughtful user experience, and modern technology to create digital products that are both beautiful and useful.\n\nOur approach is simple: understand the problem, design with purpose, and build experiences that deliver lasting value.',
    aboutAlignment: 'left',
    decorativeAboutSvg: 'pat-grid',
    aboutImagePosition: 'right',
    aboutHighlights: [
      { icon: 'compass', text: 'Research-backed brand & product strategy' },
      { icon: 'layers', text: 'Cohesive design systems built for longevity' },
      { icon: 'bolt', text: 'Fast, accessible, standards-compliant engineering' },
    ],
    aboutStats: [
      { number: '64+', label: 'Digital Launches' },
      { number: '9 yrs', label: 'Independent Studio' },
      { number: '97%', label: 'Client Retention' },
    ],

    // 08 Services, Projects, Process & Testimonials
    servicesColumns: 3,
    services: [
      {
        title: 'Brand Identity',
        description: 'Create distinctive brand identities with strategic positioning, visual systems, typography, and cohesive brand guidelines.',
        icon: 'palette',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'Discuss Branding',
      },
      {
        title: 'Website Design',
        description: 'Design intuitive, responsive, and visually engaging websites that communicate clearly and convert visitors.',
        icon: 'monitor',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'Explore Web Design',
      },
      {
        title: 'Web Development',
        description: 'Build fast, accessible, and maintainable digital experiences using modern web technologies.',
        icon: 'code',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'Talk Engineering',
      },
      {
        title: 'UI/UX Design',
        description: 'Transform complex user journeys into intuitive interfaces through research, wireframing, and thoughtful interaction design.',
        icon: 'layers',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'See UX Approach',
      },
      {
        title: 'Digital Strategy',
        description: 'Help businesses identify opportunities, improve their digital presence, and build sustainable growth strategies.',
        icon: 'compass',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'Plan Strategy',
      },
      {
        title: 'Creative Consulting',
        description: 'Provide design direction, product thinking, and practical guidance for teams building digital products.',
        icon: 'sparkles',
        image: '',
        imageAlt: '',
        price: '',
        link: '#contact',
        buttonLabel: 'Book Session',
      },
    ],
    sections,
    sectionOrder: ['services', 'projects', 'timeline', 'testimonials', 'cta', 'features', 'pricing', 'team', 'faq', 'gallery', 'partners', 'newsletter'],
    projects: [
      {
        title: 'Atelier Commerce',
        category: 'E-Commerce · UX',
        description: 'A refined e-commerce experience for a premium lifestyle brand.',
        link: '#contact',
      },
      {
        title: 'Greenline Identity',
        category: 'Brand · Website',
        description: 'A complete visual identity and website for a sustainable business.',
        link: '#contact',
      },
      {
        title: 'Horizon Dashboard',
        category: 'Product · UI/UX',
        description: 'A clean and intuitive digital platform for business analytics.',
        link: '#contact',
      },
      {
        title: 'Urban Living',
        category: 'Architecture · Web',
        description: 'A responsive website experience for a modern architecture studio.',
        link: '#contact',
      },
    ],
    timelineItems: [
      { step: '01', title: 'Discovery & Positioning', description: 'Deep stakeholder interviews, audience research, and clear project objectives.' },
      { step: '02', title: 'Creative Direction', description: 'Editorial typography, color architecture, and interactive wireframes.' },
      { step: '03', title: 'Design & Engineering', description: 'Accessible, responsive implementation engineered for speed and clarity.' },
      { step: '04', title: 'Launch & Partnership', description: 'Quality verification, smooth deployment handoff, and ongoing guidance.' },
    ],
    testimonials: [
      {
        name: 'Ananya Verma',
        role: 'Founder, Atelier Commerce',
        quote: 'Northstar Studio translated our brand philosophy into a calm, high-converting storefront that customers genuinely love using.',
        rating: 5,
      },
      {
        name: 'Siddharth Rao',
        role: 'VP Product, Horizon Analytics',
        quote: 'Rare clarity of thought. They simplified our most complex dashboard workflows while elevating the entire visual identity.',
        rating: 5,
      },
    ],
    ctaButtonText: 'Start a Conversation',
    ctaButtonLink: '#contact',

    // 09 Contact
    contactEmail: 'hello@northstar.example',
    contactPhone: '+91 98765 43210',
    contactAddress: 'Sector 44, Gurugram, Haryana, India.',
    workingHours: 'Monday to Friday, 9:00 AM – 6:00 PM.',
    vcardEnabled: true,
    directionsEnabled: true,
    contactFormEnabled: true,
    contactFormMode: 'mailto',
    contactButtonLabel: 'Send Project Inquiry',
    contactLayout: 'form-right',
    showStaticMap: true,

    // 10 Footer & Social Links
    footerText: 'Thoughtful digital experiences, built with purpose.',
    copyrightText: '© Northstar Studio. All rights reserved.',
    autoCopyrightYear: true,
    footerStyle: 'multi-column',
    footerLinkGroups: [
      {
        title: 'Studio',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Services', url: '#services' },
          { label: 'Projects', url: '#projects' },
          { label: 'Process', url: '#timeline' },
        ],
      },
      {
        title: 'Connect',
        links: [
          { label: 'Start a Project', url: '#contact' },
          { label: 'hello@northstar.example', url: 'mailto:hello@northstar.example' },
        ],
      },
    ],
    socialLinks: {
      instagram: 'https://instagram.com/northstarstudio',
      linkedin: 'https://linkedin.com/company/northstarstudio',
      behance: 'https://behance.net/northstarstudio',
      dribbble: 'https://dribbble.com/northstarstudio',
    },
    socialIconStyle: 'circle',
    showBackToTop: true,
    showSiteForgeCredit: true,

    // 11 SEO & Logo
    siteUrl: 'https://northstar.example',
    metaTitle: 'Northstar Studio | Creative Design and Digital Experiences',
    metaDescription: 'Northstar Studio is a creative digital agency specializing in branding, website design, user experience, and modern web development.',
    metaKeywords: 'Creative studio, website design, branding, UI UX, web development, digital agency.',
    metaAuthor: 'Northstar Studio',
    robots: 'index, follow',
    ogTitle: 'Northstar Studio | Creative Design and Digital Experiences',
    ogDescription: 'Thoughtful design and high-performing digital experiences for ambitious businesses.',
    twitterCard: 'summary_large_image',
    logoMode: 'upload',
    logoDataUrl: NORTHSTAR_LOGO_DATA_URL,
    logoFileName: 'northstar-logo.svg',
    logoSize: 'm',
    logoPosition: 'left',
    faviconMode: 'auto-letter',
    faviconColor: '#b4482d',
  };
}

/**
 * 10 One-Click Starter Presets that populate all 12 steps immediately.
 */
export const STARTER_PRESETS = [
  {
    id: 'photographer',
    name: 'Photographer Portfolio',
    category: 'Creative',
    description: 'Masonry gallery, warm mono theme, session pricing.',
    patch: {
      siteName: 'Clara Vance Photography',
      tagline: 'Editorial & documentary light',
      siteType: 'photography',
      layout: 'masonry-gallery',
      theme: 'mono-bw',
      headingFont: 'elegant-display',
      bodyFont: 'modern-sans',
      heroBadge: 'Booking 2026 Sessions',
      heroHeadline: 'Honest light, quiet frames, timeless portraits.',
      heroSubheadline: 'Documentary wedding and editorial photography across the Pacific Northwest and beyond.',
      aboutHeading: 'Behind the Lens',
      about: 'For the past eight years I have photographed people, architecture, and unscripted celebrations on digital and medium-format film.\n\n**Natural light first.** Every session is paced calmly so real moments happen effortlessly.',
      aboutStats: [{ number: '240+', label: 'Stories Captured' }, { number: '8 yrs', label: 'Experience' }, { number: '14', label: 'Countries' }],
      services: [
        { title: 'Editorial Portraits', description: 'Two-hour natural light portrait session with 45 retouched frames.', icon: 'camera', price: '$450', link: '#contact', buttonLabel: 'Book Session', image: '' },
        { title: 'Full-Day Wedding', description: 'Ten hours of documentary coverage, online gallery, and heirloom print box.', icon: 'heart', price: '$3,200', link: '#contact', buttonLabel: 'Inquire', image: '' },
        { title: 'Brand Lookbook', description: 'Half-day studio or on-location shoot tailored for makers and small studios.', icon: 'sparkles', price: '$1,100', link: '#contact', buttonLabel: 'Request Quote', image: '' },
      ],
      contactEmail: 'hello@claravance.example',
      contactPhone: '+1 (503) 555-0192',
      contactAddress: '814 NW Flanders St, Portland, OR',
      metaDescription: 'Editorial, portrait, and documentary wedding photography by Clara Vance.',
      socialLinks: { instagram: 'instagram.com/claravance', pinterest: 'pinterest.com/claravance' },
    },
  },
  {
    id: 'artisan-cafe',
    name: 'Artisan Cafe & Roastery',
    category: 'Food & Drink',
    description: 'Coffee Brown theme, split hero, daily menu & hours.',
    patch: {
      siteName: 'Roast & Crumb',
      tagline: 'Small-batch coffee & sourdough',
      siteType: 'cafe',
      layout: 'split-hero',
      theme: 'coffee-brown',
      headingFont: 'classic-serif',
      bodyFont: 'humanist-sans',
      heroBadge: 'Open Daily from 7 AM',
      heroHeadline: 'Freshly roasted single-origin beans and warm morning bakes.',
      heroSubheadline: 'Neighborhood espresso bar and micro-bakery serving seasonal pastries and pour-overs.',
      aboutHeading: 'Our Roastery',
      about: 'Every morning at 5 AM our bakers pull country loaves and cardamom knots from the stone deck oven.\n\nWe roast ethically sourced beans in small batches twice a week for peak sweetness.',
      aboutStats: [{ number: '12', label: 'Single Origins' }, { number: '5 AM', label: 'Daily Bake' }, { number: '100%', label: 'Direct Trade' }],
      services: [
        { title: 'House Pour-Over', description: 'Rotating washed Ethiopian and Colombian micro-lots brewed to order.', icon: 'coffee', price: '$5.50', link: '', buttonLabel: '', image: '' },
        { title: 'Cardamom Morning Bun', description: 'Laminated sourdough pastry dusted with freshly ground green cardamom.', icon: 'sun', price: '$4.75', link: '', buttonLabel: '', image: '' },
        { title: 'Whole Bean Subscription', description: 'Two 250g bags roasted every second Tuesday and delivered locally.', icon: 'gift', price: '$32/mo', link: '#contact', buttonLabel: 'Subscribe', image: '' },
      ],
      contactEmail: 'brew@roastandcrumb.example',
      contactPhone: '+1 (415) 555-0148',
      contactAddress: '209 Valencia St, San Francisco, CA',
      workingHours: 'Daily, 7:00 AM – 5:00 PM',
      metaDescription: 'Neighborhood specialty coffee roastery and sourdough micro-bakery.',
      socialLinks: { instagram: 'instagram.com/roastandcrumb' },
    },
  },
  {
    id: 'startup-landing',
    name: 'Startup SaaS Landing',
    category: 'Tech',
    description: 'One-Page Landing, Dark Pro theme, pricing & features.',
    patch: {
      siteName: 'MetricFlow',
      tagline: 'Clarity for product teams',
      siteType: 'saas',
      layout: 'one-page-landing',
      theme: 'dark-pro',
      headingFont: 'geometric-sans',
      bodyFont: 'modern-sans',
      buttonStyle: 'gradient',
      heroBadge: 'v3.0 Now Available',
      heroHeadline: 'Turn messy release cycles into calm, predictable shipping.',
      heroSubheadline: 'One workspace for roadmaps, sprint health, and customer feedback—built for teams of 5 to 500.',
      aboutHeading: 'Built for Focus',
      about: 'Most project tools create more meetings than clarity. **MetricFlow** strips away busywork so engineers and designers spend their hours building.',
      aboutStats: [{ number: '4,200+', label: 'Teams' }, { number: '99.98%', label: 'Uptime' }, { number: '42%', label: 'Faster Shipping' }],
      services: [
        { title: 'Live Roadmaps', description: 'Align leadership and engineering around real-time milestones.', icon: 'compass', price: '', link: '#pricing', buttonLabel: 'See Plans', image: '' },
        { title: 'Automated Changelogs', description: 'Publish crisp release notes directly from completed work.', icon: 'rocket', price: '', link: '#pricing', buttonLabel: 'Learn More', image: '' },
        { title: 'Zero-Noise Alerts', description: 'Spot blockers early without drowning in status notifications.', icon: 'shield', price: '', link: '#pricing', buttonLabel: 'Explore', image: '' },
      ],
      contactEmail: 'team@metricflow.example',
      contactPhone: '+1 (206) 555-0174',
      contactAddress: '400 Pine St, Seattle, WA',
      metaDescription: 'Product roadmap and release workflow software for modern engineering teams.',
      socialLinks: { github: 'github.com/metricflow', x: 'x.com/metricflow', linkedin: 'linkedin.com/company/metricflow' },
    },
  },
  {
    id: 'dev-portfolio',
    name: 'Developer Portfolio',
    category: 'Tech',
    description: 'Sidebar layout, Midnight Neon theme, monospace headings.',
    patch: {
      siteName: 'Rohan Kulkarni',
      tagline: 'Systems & Frontend Engineer',
      siteType: 'developer',
      layout: 'sidebar',
      theme: 'midnight-neon',
      headingFont: 'monospace',
      bodyFont: 'modern-sans',
      heroBadge: 'Open to Principal Roles',
      heroHeadline: 'Building resilient web engines and offline-first tools.',
      heroSubheadline: '10 years shipping fast browsers, design systems, and developer infrastructure.',
      aboutHeading: 'About Me',
      about: 'I care deeply about software performance, clean semantics, and tools that work even with spotty connectivity.\n\nCurrently exploring local-first storage, WebAssembly, and zero-dependency tooling.',
      aboutStats: [{ number: '10+', label: 'Years Coding' }, { number: '38', label: 'OSS Repos' }, { number: '120k', label: 'Monthly Downloads' }],
      services: [
        { title: 'Architecture Audits', description: 'Deep performance profiling and bundle reduction for web apps.', icon: 'cpu', price: '', link: '#contact', buttonLabel: 'Discuss', image: '' },
        { title: 'Design Systems', description: 'Accessible, token-driven component libraries built to scale.', icon: 'layers', price: '', link: '#contact', buttonLabel: 'Inquire', image: '' },
        { title: 'Technical Advising', description: 'Hands-on mentorship and roadmap reviews for seed startups.', icon: 'code', price: '', link: '#contact', buttonLabel: 'Book Call', image: '' },
      ],
      contactEmail: 'rohan@kulkarni.example',
      contactPhone: '+91 98200 12345',
      contactAddress: 'Bengaluru, India',
      metaDescription: 'Portfolio of Rohan Kulkarni, Systems and Frontend Software Engineer.',
      socialLinks: { github: 'github.com/rohankulkarni', linkedin: 'linkedin.com/in/rohankulkarni', x: 'x.com/rohank_dev' },
    },
  },
  {
    id: 'creative-agency',
    name: 'Creative Design Agency',
    category: 'Business',
    description: 'Card Grid bento layout, Autumn Rust terracotta theme.',
    patch: {
      siteName: 'Terracotta Collective',
      tagline: 'Brand, Web & Motion Studio',
      siteType: 'agency',
      layout: 'card-grid',
      theme: 'autumn-rust',
      headingFont: 'geometric-sans',
      bodyFont: 'modern-sans',
      heroBadge: 'Independent Studio',
      heroHeadline: 'Distinctive identities for ambitious founders.',
      heroSubheadline: 'We partner with early and growth-stage teams to shape memorable brands and websites.',
      aboutHeading: 'Who We Are',
      about: 'A senior team of strategists, typographers, and engineers working directly with founders—no account managers, no handoff loss.',
      services: [
        { title: 'Brand Identity', description: 'Naming, visual language, typography, and comprehensive brand books.', icon: 'palette', price: '', link: '#contact', buttonLabel: 'Start Project', image: '' },
        { title: 'Web Design & Dev', description: 'Bespoke responsive websites engineered for conversion and speed.', icon: 'monitor', price: '', link: '#contact', buttonLabel: 'View Process', image: '' },
        { title: 'Product Strategy', description: 'Positioning workshops, launch narratives, and investor decks.', icon: 'target', price: '', link: '#contact', buttonLabel: 'Book Workshop', image: '' },
      ],
      contactEmail: 'studio@terracottacollective.example',
      contactPhone: '+1 (312) 555-0183',
      contactAddress: '920 W Fulton Market, Chicago, IL',
      metaDescription: 'Independent brand identity and digital product design studio.',
      socialLinks: { dribbble: 'dribbble.com/terracotta', behance: 'behance.net/terracotta', instagram: 'instagram.com/terracottastudio' },
    },
  },
  {
    id: 'fitness-studio',
    name: 'Fitness & Yoga Studio',
    category: 'Wellness',
    description: 'Full-Screen Hero, Forest Green theme, memberships.',
    patch: {
      siteName: 'Canopy Movement',
      tagline: 'Strength, mobility & breath',
      siteType: 'fitness',
      layout: 'fullscreen-hero',
      theme: 'forest-green',
      headingFont: 'rounded',
      bodyFont: 'humanist-sans',
      heroBadge: 'First Week Free',
      heroHeadline: 'Move with strength, recover with calm.',
      heroSubheadline: 'Small-group functional training, mobility flows, and mindful conditioning in a sunlit studio.',
      aboutHeading: 'Our Philosophy',
      about: 'Fitness should energize your life, not burn you out. Our certified coaches tailor every class to your pace and goals.',
      services: [
        { title: 'Functional Strength', description: 'Kettlebells, barbells, and progressive coaching capped at 10 people.', icon: 'dumbbell', price: '$25/class', link: '#pricing', buttonLabel: 'Join Class', image: '' },
        { title: 'Mobility & Flow', description: 'Guided breathwork and joint longevity sessions for recovery days.', icon: 'leaf', price: '$22/class', link: '#pricing', buttonLabel: 'Reserve', image: '' },
        { title: '1-on-1 Coaching', description: 'Custom training plans and weekly check-ins with a dedicated coach.', icon: 'award', price: '$85/session', link: '#contact', buttonLabel: 'Book Intro', image: '' },
      ],
      contactEmail: 'hello@canopymovement.example',
      contactPhone: '+1 (512) 555-0133',
      contactAddress: '1104 South Congress Ave, Austin, TX',
      workingHours: 'Mon – Sun, 6:00 AM – 8:30 PM',
      metaDescription: 'Small-group strength training and mobility studio in Austin.',
      socialLinks: { instagram: 'instagram.com/canopymovement', youtube: 'youtube.com/@canopymovement' },
    },
  },
  {
    id: 'conference-event',
    name: 'Tech Conference Event',
    category: 'Events',
    description: 'Timeline layout, Royal Purple theme, tracks & tickets.',
    patch: {
      siteName: 'CraftConf 2026',
      tagline: 'Two days of web engineering & design',
      siteType: 'event',
      layout: 'timeline',
      theme: 'royal-purple',
      headingFont: 'geometric-sans',
      bodyFont: 'modern-sans',
      heroBadge: 'Oct 14–15 · Lisbon',
      heroHeadline: 'Two days with the makers shaping the open web.',
      heroSubheadline: '24 deep-dive talks, hands-on workshops, and hallway conversations with 600 builders.',
      aboutHeading: 'About CraftConf',
      about: 'No sales pitches—only practical lessons, live code, and honest stories from engineers and designers building real products.',
      services: [
        { title: 'Design Systems Track', description: 'Tokens, accessibility, and typography at scale.', icon: 'palette', price: 'Day 1', link: '#pricing', buttonLabel: 'Get Pass', image: '' },
        { title: 'Offline & Local-First Track', description: 'PWAs, sync engines, and resilient architecture.', icon: 'globe', price: 'Day 2', link: '#pricing', buttonLabel: 'Get Pass', image: '' },
        { title: 'Hands-On Workshops', description: 'Full-day small-group labs led by speakers.', icon: 'wrench', price: 'Add-on', link: '#pricing', buttonLabel: 'Reserve Seat', image: '' },
      ],
      contactEmail: 'organizers@craftconf.example',
      contactPhone: '+351 21 555 0190',
      contactAddress: 'LX Factory, Lisbon, Portugal',
      metaDescription: 'CraftConf 2026: Two-day conference on web engineering and product design.',
      socialLinks: { x: 'x.com/craftconf', youtube: 'youtube.com/@craftconf', discord: 'discord.gg/craftconf' },
    },
  },
  {
    id: 'consulting-firm',
    name: 'Law & Advisory Practice',
    category: 'Professional',
    description: 'Classic layout, Charcoal Gold theme, serene authority.',
    patch: {
      siteName: 'Vanguard Advisory',
      tagline: 'Strategic & commercial counsel',
      siteType: 'law',
      layout: 'classic',
      theme: 'charcoal-gold',
      headingFont: 'transitional-serif',
      bodyFont: 'modern-sans',
      heroBadge: 'Est. 2012',
      heroHeadline: 'Clear counsel for pivotal business decisions.',
      heroSubheadline: 'Boutique commercial advisory helping founders and boards navigate contracts, governance, and expansion.',
      aboutHeading: 'Our Practice',
      about: 'We combine deep commercial experience with plain-language advice so leadership teams move forward with confidence.',
      services: [
        { title: 'Commercial Contracts', description: 'Drafting and negotiation for enterprise agreements and partnerships.', icon: 'scale', price: '', link: '#contact', buttonLabel: 'Consult', image: '' },
        { title: 'Corporate Governance', description: 'Board structure, equity plans, and compliance frameworks.', icon: 'shield', price: '', link: '#contact', buttonLabel: 'Consult', image: '' },
        { title: 'Cross-Border Expansion', description: 'Regulatory guidance for entering new international markets.', icon: 'globe', price: '', link: '#contact', buttonLabel: 'Consult', image: '' },
      ],
      contactEmail: 'counsel@vanguardadvisory.example',
      contactPhone: '+44 20 7946 0182',
      contactAddress: '18 Bishopsgate, London',
      metaDescription: 'Boutique commercial law and corporate governance advisory practice.',
      socialLinks: { linkedin: 'linkedin.com/company/vanguardadvisory' },
    },
  },
  {
    id: 'writer-blog',
    name: 'Personal Writer & Essays',
    category: 'Editorial',
    description: 'Minimal layout, Old-Style serif, calm reading flow.',
    patch: {
      siteName: 'Field Notes',
      tagline: 'Essays by Meera Deshmukh',
      siteType: 'blog',
      layout: 'minimal',
      theme: 'earth-natural',
      headingFont: 'old-style',
      bodyFont: 'classic-serif',
      contentWidth: 'narrow',
      heroBadge: 'Weekly Dispatch',
      heroHeadline: 'Slow essays on design, cities, and making things by hand.',
      heroSubheadline: 'An independent publication read by 12,000 curious designers, writers, and engineers.',
      aboutHeading: 'About the Author',
      about: 'Hi, I am Meera. Every Sunday I publish one long-form essay exploring craft, urban spaces, and humane technology.',
      services: [
        { title: 'The Quiet Web', description: 'Why calm, fast, ad-free websites are making a comeback.', icon: 'feather', price: '6 min read', link: '#newsletter', buttonLabel: 'Read Issue', image: '' },
        { title: 'Tools for Thinking', description: 'Building personal archives that survive decades.', icon: 'book', price: '8 min read', link: '#newsletter', buttonLabel: 'Read Issue', image: '' },
        { title: 'Notes on Typography', description: 'How proportion and rhythm make long text effortless.', icon: 'pen', price: '5 min read', link: '#newsletter', buttonLabel: 'Read Issue', image: '' },
      ],
      contactEmail: 'meera@fieldnotes.example',
      contactPhone: '',
      contactAddress: 'Pune, India',
      metaDescription: 'Field Notes: weekly essays on craft, typography, and calm technology.',
      socialLinks: { medium: 'medium.com/@meeradeshmukh', x: 'x.com/meeranotes' },
    },
  },
  {
    id: 'boutique-clinic',
    name: 'Family Health Clinic',
    category: 'Healthcare',
    description: 'Left-Nav Docs / structured layout, Teal Aqua theme.',
    patch: {
      siteName: 'Harborview Care Clinic',
      tagline: 'Modern family & preventive medicine',
      siteType: 'clinic',
      layout: 'centered-stack',
      theme: 'teal-aqua',
      headingFont: 'humanist-sans',
      bodyFont: 'humanist-sans',
      heroBadge: 'Accepting New Patients',
      heroHeadline: 'Unhurried, compassionate care for your whole family.',
      heroSubheadline: 'Same-week appointments, preventive screenings, and board-certified physicians who listen.',
      aboutHeading: 'Our Care Model',
      about: 'We believe primary care should feel personal and calm. Every appointment leaves room for questions, follow-up, and long-term wellness planning.',
      services: [
        { title: 'Preventive Checkups', description: 'Annual physicals, lab work, and personalized health roadmaps.', icon: 'stethoscope', price: '', link: '#contact', buttonLabel: 'Book Visit', image: '' },
        { title: 'Pediatric Care', description: 'Gentle well-child visits, immunizations, and developmental guidance.', icon: 'heart', price: '', link: '#contact', buttonLabel: 'Book Visit', image: '' },
        { title: 'Same-Day Urgent Visits', description: 'Prompt care for acute symptoms without crowded waiting rooms.', icon: 'clock', price: '', link: '#contact', buttonLabel: 'Call Clinic', image: '' },
      ],
      contactEmail: 'care@harborviewclinic.example',
      contactPhone: '+1 (617) 555-0166',
      contactAddress: '310 Beacon St, Boston, MA',
      workingHours: 'Mon – Sat, 8:00 AM – 6:30 PM',
      metaDescription: 'Harborview Care Clinic offers family medicine, pediatrics, and preventive care.',
      socialLinks: { facebook: 'facebook.com/harborviewcare', linkedin: 'linkedin.com/company/harborviewcare' },
    },
  },
];
