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
export declare const WINDOW_LEVELS: {
    readonly baseWindow: -2147483648;
    readonly minimumWindow: -2147483643;
    readonly desktopWindow: -2147483623;
    readonly desktopIconWindow: -2147483603;
    readonly backstopMenu: -20;
    readonly normal: 0;
    readonly floating: 3;
    readonly submenu: 3;
    readonly tornOffMenu: 3;
    readonly modalPanel: 8;
    readonly utilityWindow: 19;
    readonly mainMenu: 24;
    readonly statusBar: 25;
    readonly popUpMenu: 101;
    readonly overlayWindow: 102;
    readonly helpWindow: 200;
    readonly draggingWindow: 500;
    readonly screenSaver: 1000;
    readonly screenSaverWindow: 1000;
    readonly assistiveTechHighWindow: 1500;
    readonly cursorWindow: 2147483630;
    readonly maximumWindow: 2147483631;
};
/**
 * The name of a well-known macOS window level. See {@link WINDOW_LEVELS}.
 *
 * @group Discovery
 */
export type WindowLevelName = keyof typeof WINDOW_LEVELS;
