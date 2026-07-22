// Single source of truth for the 2nd Act Expo asset build.
// Colors are copied verbatim from src/app/globals.css (the live-site "Rustic Editorial"
// tokens). Do NOT invent hex values — every graphic/type color must appear here.

export const COLORS = {
  // Cream canvas
  cream: '#F5F0E8',
  creamLight: '#FAF8F4',
  creamDark: '#EDE7DA',
  // Navy
  navy950: '#0c1929',
  navy900: '#122640',
  navy800: '#1b3a5f',
  navy700: '#234e7e',
  // Copper (accent / display ONLY — fails 7:1 as body text)
  copper700: '#4a1408',
  copper600: '#6e2210',
  copper500: '#8e3012',
  copper400: '#b04020',
  copper300: '#c4603d',
  copper200: '#d99070',
  copper100: '#edc8b0',
  copperOnDark: '#CC6535', // ~4.7:1 on navy
  copperOnLight: '#8E3012', // ~6.2:1 on white
  // Text tones
  charcoal: '#1a1a1a',
  stone: '#4a4a4a',
  muted: '#7a7a7a',
  faint: '#b0a899',
  // QR
  qrDark: '#000000',
  qrLight: '#ffffff',
};

// Canonical contact block (identical treatment wherever it appears).
export const CONTACT = {
  site: 'waypointfranchise.com',
  email: 'kelsey@waypointfranchise.com',
  phone: '(214) 995-1062',
};

export const BRAND = {
  name: 'Waypoint Franchise Advisors',
  wordmarkTop: 'Waypoint',
  wordmarkBottom: 'Franchise Advisors',
};

// QR targets from the brief.
export const URLS = {
  doc: 'https://docs.google.com/document/d/1zGcw_SuQ_sec_VPz6IVAH732koLZIT5tsd_rllD9Tr8/edit?usp=sharing',
  booking: 'https://tidycal.com/m7v2jox/2nd-act-expo-meeting',
  // Candidate first-party redirect (NOT a third-party shortener). Only used if the
  // long Doc URL fails the compression-simulated decode test at background size.
  redirectCandidate: 'https://waypointfranchise.com/guide',
};

export const CANVAS = { width: 1920, height: 1080 };

// QR display sizes (px on the 1920x1080 canvas).
export const QR_SIZES = {
  backgroundDoc: 360, // virtual background fallback (brief min 300; larger survives video)
  slideDoc: 480, // slide 4 dominant "give" (brief min 400)
  slideBooking: 400, // slide 4 secondary "ask" (brief min 400)
};
