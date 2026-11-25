/**
 * Design tokens for the TV UI.
 *
 * The palette is fixed offline (no CDN fonts, no remote assets) and every size
 * assumes a 1920x1080 surface with a 4% overscan safe area.
 */

export const colors = {
  background: "#05080F",
  surface: "#0E1624",
  surfaceRaised: "#16233A",
  border: "#22334F",
  primary: "#0F4C81",
  accent: "#F59E0B",
  text: "#F3F7FC",
  textMuted: "#93A7C4",
  success: "#3DD68C",
  warning: "#F5C451",
  danger: "#F2545B",
  overlay: "rgba(5, 8, 15, 0.82)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 18,
  pill: 999,
} as const;

export const fontSize = {
  xs: 13,
  sm: 16,
  md: 20,
  lg: 26,
  xl: 34,
  xxl: 46,
  display: 64,
} as const;

/** Focus ring width used by every focusable component. */
export const FOCUS_RING = 4;

/** Scale applied to a focused card. */
export const FOCUS_SCALE = 1.07;

export const cardSize = {
  posterWidth: 196,
  posterHeight: 294,
  landscapeWidth: 372,
  landscapeHeight: 209,
  gap: 20,
} as const;
