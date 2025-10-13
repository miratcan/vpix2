/**
 * Central constants for VPix engine and application.
 * This file provides a single source of truth for magic numbers and configuration values.
 */

/**
 * Engine configuration constants
 */
export const ENGINE = {
  /** Maximum number of log entries to keep in memory */
  LOG_LIMIT: 50,
  /** Default grid width when not specified */
  DEFAULT_WIDTH: 32,
  /** Default grid height when not specified */
  DEFAULT_HEIGHT: 32,
} as const;

/**
 * Viewport and zoom configuration
 */
export const VIEWPORT = {
  /** Minimum zoom level */
  MIN_ZOOM: 2,
  /** Maximum zoom level */
  MAX_ZOOM: 8,
  /** Default viewport width for SSR/initial render */
  DEFAULT_VIEW_WIDTH: 800,
  /** Default viewport height for SSR/initial render */
  DEFAULT_VIEW_HEIGHT: 480,
  /** Margin (in cells) before viewport starts scrolling to follow cursor */
  SCROLL_MARGIN: 2,
} as const;

/**
 * Animation and rendering constants
 */
export const ANIMATION = {
  /** Cursor blink interval in milliseconds */
  CURSOR_BLINK_MS: 500,
  /** Trail visibility duration in milliseconds */
  TRAIL_DURATION_MS: 500,
  /** Maximum number of trail points to keep */
  TRAIL_MAX_POINTS: 400,
  /** Safety limit for line drawing iterations */
  LINE_DRAW_LIMIT: 2048,
} as const;

/**
 * Canvas rendering constants
 */
export const CANVAS = {
  /** Grid line width divisor (cell size / this value) */
  GRID_LINE_WIDTH_DIVISOR: 4,
  /** Cursor stroke width in pixels */
  CURSOR_STROKE_WIDTH: 4,
  /** Crosshair line width in pixels */
  CROSSHAIR_LINE_WIDTH: 1,
} as const;

/**
 * Storage keys for browser localStorage
 */
export const STORAGE_KEYS = {
  /** Key for storing document state */
  DOCUMENT: 'vpix.document.v1',
  /** Key for tracking if help modal was shown */
  HELP_SHOWN: 'vpix.help.shown',
} as const;

/**
 * Theme colors for canvas rendering
 */
export const THEME_COLORS = {
  /** Guide line color (vertical/horizontal guides) */
  GUIDE: 'rgba(255, 100, 255, 0.4)',
  /** Crosshair primary color */
  CROSSHAIR_PRIMARY: 'rgba(255, 255, 255, 0.4)',
  /** Crosshair shadow color for contrast */
  CROSSHAIR_SHADOW: 'rgba(0, 0, 0, 0.4)',
  /** Trail opacity base multiplier */
  TRAIL_OPACITY: 0.5,
} as const;
