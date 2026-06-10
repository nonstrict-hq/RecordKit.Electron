import { WINDOW_LEVELS } from './WindowLevels.js';

// Pins the named macOS window levels that mirror RKWindow.Level, including the documented
// shared-value aliases and front-to-back ordering.
describe('WINDOW_LEVELS', () => {
  it('pins known macOS window level values', () => {
    expect(WINDOW_LEVELS.baseWindow).toBe(-2147483648);
    expect(WINDOW_LEVELS.normal).toBe(0);
    expect(WINDOW_LEVELS.floating).toBe(3);
    expect(WINDOW_LEVELS.mainMenu).toBe(24);
    expect(WINDOW_LEVELS.screenSaver).toBe(1000);
    expect(WINDOW_LEVELS.maximumWindow).toBe(2147483631);
  });

  it('keeps the documented shared-value aliases equal', () => {
    expect(WINDOW_LEVELS.submenu).toBe(WINDOW_LEVELS.floating);
    expect(WINDOW_LEVELS.tornOffMenu).toBe(WINDOW_LEVELS.floating);
    expect(WINDOW_LEVELS.screenSaver).toBe(WINDOW_LEVELS.screenSaverWindow);
  });

  it('orders front-to-back by increasing value (Comparable in Swift)', () => {
    expect(WINDOW_LEVELS.normal).toBeLessThan(WINDOW_LEVELS.floating);
    expect(WINDOW_LEVELS.floating).toBeLessThan(WINDOW_LEVELS.mainMenu);
    expect(WINDOW_LEVELS.mainMenu).toBeLessThan(WINDOW_LEVELS.cursorWindow);
  });

  it('every level is an integer within the signed 32-bit range', () => {
    for (const v of Object.values(WINDOW_LEVELS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-2147483648);
      expect(v).toBeLessThanOrEqual(2147483647);
    }
  });
});
