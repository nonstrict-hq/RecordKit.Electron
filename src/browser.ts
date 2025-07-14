// Browser-only exports - safe for use in browser environments
// This entry point excludes Node.js-specific functionality like EventEmitter, crypto, etc.

export { createWebAudioBuffer } from './WebAudioUtils.js';

// Type-only exports for browser use
export type { AudioStreamBuffer } from './Recorder.js';