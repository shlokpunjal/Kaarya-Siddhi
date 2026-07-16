// utils/responsive.ts
//
// Screen-width-aware scaling helpers. The app is locked to portrait
// (see app.json), so we scale off width only — no rotation handling needed.
//
// Reference device: 375×812 (a common mid-size phone width — close to
// what most screens in this app were visually tuned against). Every
// scale() call below asks "how much bigger/smaller is this device than
// the reference, and adjust by that ratio."
//
// USAGE:
//   Replace `width: 320`           → `width: wp(85)`        (85% of screen width)
//   Replace `height: 140`          → `height: moderateScale(140)`
//   Replace `fontSize: 24`         → `fontSize: moderateScale(24)`
//   Replace `marginLeft: 33`       → `marginLeft: wp(8.8)`   (33/375 ≈ 8.8%)
//
// Prefer wp()/hp() for anything that should track screen edges (card widths,
// side margins, section spacing). Prefer moderateScale() for things that
// should grow a little with screen size but not proportionally — font
// sizes, icon sizes, border radii. Using wp() for a 24px font would make
// text balloon on tablets; moderateScale() dampens that.

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/** Width as a percentage of the current screen width. wp(50) = half the screen wide. */
export function wp(percentage: number): number {
  return Math.round((percentage / 100) * SCREEN_WIDTH);
}

/** Height as a percentage of the current screen height. hp(10) = 10% of screen tall. */
export function hp(percentage: number): number {
  return Math.round((percentage / 100) * SCREEN_HEIGHT);
}

/** Straight linear scale from the reference width — use sparingly, mainly for full-bleed elements. */
export function scale(size: number): number {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
}

/** Vertical equivalent of scale(), from the reference height. */
export function verticalScale(size: number): number {
  return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

/**
 * Dampened scale — grows/shrinks less aggressively than scale().
 * Best default for font sizes, icon sizes, border radii, and fixed-height
 * chips/avatars, where you want *some* adjustment on very different screens
 * without things looking cartoonishly large on tablets.
 * factor: 0 = no scaling, 1 = same as scale(). 0.5 is a good default.
 */
export function moderateScale(size: number, factor: number = 0.5): number {
  return Math.round(size + (scale(size) - size) * factor);
}

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// Rough device-size buckets, for the rare case where you need a genuine
// layout branch (e.g. showing 2 columns instead of 1) rather than just scaling.
export const isSmallDevice = SCREEN_WIDTH < 360;
export const isLargeDevice = SCREEN_WIDTH >= 428;