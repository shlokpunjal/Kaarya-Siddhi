// theme.ts
//
// FONT LOADING REQUIREMENT:
// This file assumes you are loading STATIC, per-weight font files —
// Poppins-Bold, Poppins-SemiBold, Poppins-Medium, Poppins-Regular —
// via your asset linking step (react-native.config.js / expo-font).
// Do NOT also set `fontWeight` alongside `fontFamily` in these styles.
// On Android in particular, RN will try to synthesize a bold/medium
// variant on top of an already-weighted custom font file, which can
// cause inconsistent rendering or silently fall back to the system font.
// If you'd rather use a single variable font file instead of static
// weights, flip this around: drop `fontFamily` from each style below
// and rely on `fontWeight` only.

export const typography = {
  heading: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    lineHeight: 36,
    letterSpacing: 0,
  },
  subheading: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0,
  },
  heading3: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  },
  label: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const;

// NOTE: statusText is intentionally a SINGLE fixed set of values shared
// by both light and dark themes (not split per-theme like `status` below).
// This is only correct if these colors are always rendered as text on a
// status CHIP whose background stays a consistent light tint in both
// themes. If statusText is ever used directly on `base.background` or
// `surfaceL1/L2`, it needs theme-specific variants too — dark green text
// (e.g. completed: #1E4620) will be near-illegible on a dark background.
// Confirm usage context before treating this as final.
export const universalColors = {
  statusText: {
    completed: '#1E4620',
    inReview: '#1A365D',
    pending: '#7B341E',
    overdue: '#621212',
  },
} as const;

export const lightTheme = {
  isDark: false,
  colors: {
    base: {
      background: '#F9F9FA', // Slightly warm grey
      surfaceL1: '#FFFFFF',  // Base elevated surface (e.g. cards on background)
      surfaceL2: '#F1F1F3',  // Further-elevated surface (e.g. modal on card)
      border: '#E2E2E6',     // Subtle outlines
    },
    brand: {
      primary: "#0B1B3D",
      accent: "#E8870A",
      onPrimary: "#FFFFFF",
      secprimary: "#0B1B3D",
    },
    text: {
      primary: '#1A1A1E',    // Near black ink
      secondary: '#6E717A',  // Cool grey timestamp/placeholder
    },
    // Status colors are intentionally DIFFERENT hex values between light
    // and dark themes (not the same token at different opacity). Dark
    // mode uses desaturated/darkened variants to avoid vibrating against
    // a dark background. This is deliberate — do not "unify" these.
    status: {
      completed: '#2D6A4F',
      inReview: '#2B6CB0',
      pending: '#DD6B20',
      overdue: '#C53030',
    },
    ...universalColors,
  },
} as const;
  
export const darkTheme = {
  isDark: true,
  colors: {
    base: {
      background: '#0B0F19', // Deep space blue-black
      surfaceL1: '#161D30',  // Base elevated surface
      surfaceL2: '#1F2942',  // Further-elevated surface
      border: '#2A3754',
    },
    brand: {
      primary: "#0B1B3D",
      accent: "#E8870A",
      onPrimary: "#FFFFFF",
      secprimary: "#133886",
    },
    text: {
      primary: '#F5F6F9',    // Warm non-glare white
      secondary: '#8E9AA8',  // Muted blue-grey labels — verify contrast
                              // against `base.background` at 12px (label)
                              // size before sign-off.
    },
    status: {
      completed: '#11815f',
      inReview: '#3182CE',
      pending: '#ED8936',
      overdue: '#E53E3E',
    },
    ...universalColors,
  },
} as const;

// Global TypeScript mappings derived directly from your token blueprints
export type Theme = typeof lightTheme | typeof darkTheme;
export type TypographyStyle = keyof typeof typography;