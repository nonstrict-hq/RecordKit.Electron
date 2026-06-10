/**
 * Named macOS window levels, mirroring RecordKit's `RKWindow.Level` Swift type.
 *
 * A {@link Window}'s `level` is a raw integer. macOS assigns windows to a small set of well-known
 * levels; this map lets you compare a window's level against those named values, e.g.
 *
 * ```ts
 * if (window.level === WINDOW_LEVELS.floating) { ... }
 * if (window.level >= WINDOW_LEVELS.mainMenu) { ... } // at or above the menu bar
 * ```
 *
 * Levels are `Comparable` in Swift: a higher number is drawn in front of a lower one. Some names
 * share the same numeric value (e.g. `floating`, `submenu`, `tornOffMenu` are all `3`).
 *
 * @group Discovery
 */
export const WINDOW_LEVELS = {
  baseWindow: -2147483648,
  minimumWindow: -2147483643,
  desktopWindow: -2147483623,
  desktopIconWindow: -2147483603,
  backstopMenu: -20,
  normal: 0,
  floating: 3,
  submenu: 3,
  tornOffMenu: 3,
  modalPanel: 8,
  utilityWindow: 19,
  mainMenu: 24,
  statusBar: 25,
  popUpMenu: 101,
  overlayWindow: 102,
  helpWindow: 200,
  draggingWindow: 500,
  screenSaver: 1000,
  screenSaverWindow: 1000,
  assistiveTechHighWindow: 1500,
  cursorWindow: 2147483630,
  maximumWindow: 2147483631,
} as const;

/**
 * The name of a well-known macOS window level. See {@link WINDOW_LEVELS}.
 *
 * @group Discovery
 */
export type WindowLevelName = keyof typeof WINDOW_LEVELS;
