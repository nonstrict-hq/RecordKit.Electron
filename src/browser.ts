// Browser-only exports - safe for use in browser environments
// This entry point excludes Node.js-specific functionality like EventEmitter, crypto, etc.

export { createWebAudioBuffer, computeAudioLevel } from './WebAudioUtils.js';

// Type-only exports for browser use
export type { AudioStreamBuffer } from './Recorder.js';
export type { AudioLevel } from './WebAudioUtils.js';

// Sidecar JSON types (pure types, safe in the browser) — useful when parsing a recording bundle's
// input-event / window-presence / dimension-change JSON files in a renderer process.
export type * from './InputEvents.js';
export type * from './RecordingMetadata.js';
export type * from './Errors.js';
export type * from './WindowLevels.js';
export { RECORDKIT_ERROR_CODE_NUMBERS } from './Errors.js';
export { WINDOW_LEVELS } from './WindowLevels.js';
