import { RECORDKIT_ERROR_CODE_NUMBERS } from './Errors.js';

// These pin the error-code contract that mirrors the Swift `RKError.Code` raw values. The
// `satisfies Record<RecordKitErrorCode, number>` in Errors.ts guarantees completeness at compile
// time; these runtime checks guard the actual numbers against silent drift.
describe('RECORDKIT_ERROR_CODE_NUMBERS', () => {
  const entries = Object.entries(RECORDKIT_ERROR_CODE_NUMBERS);

  it('maps every code to a negative integer', () => {
    for (const [, value] of entries) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeLessThan(0);
    }
  });

  it('has no duplicate code numbers', () => {
    const values = entries.map(([, v]) => v);
    expect(new Set(values).size).toBe(values.length);
  });

  it('pins known anchor values from the Swift RKError.Code enum', () => {
    expect(RECORDKIT_ERROR_CODE_NUMBERS.invalidLicense).toBe(-1001);
    expect(RECORDKIT_ERROR_CODE_NUMBERS.microphonePermissionRequired).toBe(-1101);
    expect(RECORDKIT_ERROR_CODE_NUMBERS.cameraUnavailable).toBe(-1202);
    expect(RECORDKIT_ERROR_CODE_NUMBERS.noVideoFramesReceived).toBe(-1301);
    expect(RECORDKIT_ERROR_CODE_NUMBERS.internalError).toBe(-1600);
    expect(RECORDKIT_ERROR_CODE_NUMBERS.windowOperationFailed).toBe(-1707);
  });

  it('keeps codes inside their documented category ranges', () => {
    const inRange = (v: number, hi: number, lo: number) => v <= hi && v > lo;
    expect(inRange(RECORDKIT_ERROR_CODE_NUMBERS.invalidConfiguration, -1001, -1100)).toBe(true);
    expect(inRange(RECORDKIT_ERROR_CODE_NUMBERS.systemAudioPermissionRequired, -1101, -1200)).toBe(true);
    expect(inRange(RECORDKIT_ERROR_CODE_NUMBERS.appleDeviceUnavailable, -1201, -1300)).toBe(true);
    expect(inRange(RECORDKIT_ERROR_CODE_NUMBERS.assetWriterFailed, -1600, -1700)).toBe(true);
    expect(inRange(RECORDKIT_ERROR_CODE_NUMBERS.windowOperationFailed, -1701, -1800)).toBe(true);
  });
});
