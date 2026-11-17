// NYAYASATHI — BRUTALISM design system
// Raw, loud, flat. Paper, ink, one hot accent. No gradients, no soft shadows, no rounded corners.

export const Colors = {
  // Core palette
  paper: '#F4EFE6',        // warm off-white page background
  card: '#FFFDF7',         // near-white card fill
  ink: '#111111',          // near-black primary text
  pitchBlack: '#000000',   // pure black (borders / tab bar / header)
  mutedInk: '#3F3D38',     // secondary text (warm gray)
  faintInk: '#6B6963',     // tertiary text
  yellow: '#FFD400',       // electric yellow accent
  yellowDark: '#E0B000',   // pressed / dark-yellow border
  red: '#FF3B00',          // hot red (danger / emergency)
  redDark: '#C22A00',      // dark red border
  green: '#00A86B',        // success accent
  greenDark: '#00704A',    // dark green border

  // Legacy aliases kept so every screen keeps compiling after the redesign
  navy: '#111111',
  navyDark: '#000000',
  navyLight: '#111111',
  gold: '#FFD400',
  goldLight: '#FFD400',
  goldDark: '#C9A400',
  ivory: '#FFFDF7',
  ivoryCard: '#FFFDF7',
  background: '#F4EFE6',
  cardBorder: '#111111',
  textPrimary: '#111111',
  textSecondary: '#3F3D38',
  textMuted: '#6B6963',
  emergencyBg: '#FBE7DF',
  emergencyBorder: '#FF3B00',
  emergencyText: '#C22A00',
  cacheBadgeBg: '#FFD400',
  cacheBadgeBorder: '#111111',
  cacheBadgeText: '#111111',
  successBg: '#E6F6EC',
  successText: '#00704A',
  chipBg: '#FFFDF7',
  chipBorder: '#111111',
  chipText: '#111111',
  inputBg: '#FFFDF7',
  inputBorder: '#111111',
};

export const BORDER = 3;          // standard brutalist border width
export const BORDER_THIN = 2;     // thin brutalist border

// Hard offset shadows — the signature of brutalism. No blur, ever.
export const hardShadow = (offset = 6) => ({
  boxShadow: `${offset}px ${offset}px 0 #111111`,
});
export const hardShadowSmall = {
  boxShadow: '3px 3px 0 #111111',
};

// Typography helpers
export const mono = {
  fontFamily: 'Courier New, Courier, monospace',
};

export const displayBlack = {
  fontWeight: '900' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};
