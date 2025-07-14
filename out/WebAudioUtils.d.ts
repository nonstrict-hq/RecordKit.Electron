import { AudioStreamBuffer } from './Recorder.js';
/**
 * Creates a Web Audio API AudioBuffer from a RecordKit AudioStreamBuffer.
 *
 * This utility converts RecordKit's streaming audio format to the standard Web Audio API format,
 * handling various edge cases and IPC serialization issues that may occur in Electron environments.
 *
 * @param audioStreamBuffer - The RecordKit AudioStreamBuffer to convert
 * @param audioContext - The Web Audio API AudioContext to use for buffer creation
 * @returns The created AudioBuffer, or null if conversion failed
 *
 * @example
 * ```typescript
 * import { createWebAudioBuffer } from '@nonstrict/recordkit';
 *
 * // In your stream callback
 * const streamCallback = (audioBuffer: AudioStreamBuffer) => {
 *   const audioContext = new AudioContext();
 *   const webAudioBuffer = createWebAudioBuffer(audioBuffer, audioContext);
 *
 *   if (webAudioBuffer) {
 *     // Use the buffer with Web Audio API
 *     const source = audioContext.createBufferSource();
 *     source.buffer = webAudioBuffer;
 *     source.connect(audioContext.destination);
 *     source.start();
 *   }
 * };
 * ```
 */
export declare function createWebAudioBuffer(audioStreamBuffer: AudioStreamBuffer, audioContext: AudioContext): AudioBuffer | null;
