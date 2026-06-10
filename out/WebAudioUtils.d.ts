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
/**
 * An audio level measurement, as returned by {@link computeAudioLevel}.
 *
 * @group Recording
 */
export interface AudioLevel {
    /** Root-mean-square (average) amplitude across all channels. Usually in `[0, 1]`, but can exceed `1` for hot or clipped signals. */
    rms: number;
    /** Peak absolute amplitude across all channels. Usually in `[0, 1]`, but can exceed `1` for hot or clipped signals. */
    peak: number;
    /** {@link AudioLevel.rms} in decibels relative to full scale (0 dBFS). `-Infinity` for silence; can exceed `0` for clipped signals. */
    rmsDb: number;
    /** {@link AudioLevel.peak} in decibels relative to full scale (0 dBFS). `-Infinity` for silence; can exceed `0` for clipped signals. */
    peakDb: number;
}
/**
 * Computes RMS and peak audio levels from an {@link AudioStreamBuffer}, for rendering a microphone (or
 * system-audio) level meter.
 *
 * Electron has no dedicated microphone-preview component; the supported way to render a live level meter
 * is to use a microphone/system-audio `stream` output and call this helper in your `streamCallback`.
 *
 * @example
 * ```typescript
 * import { computeAudioLevel } from '@nonstrict/recordkit';
 *
 * const streamCallback = (audioBuffer) => {
 *   const { peakDb } = computeAudioLevel(audioBuffer);
 *   meterElement.style.height = `${Math.max(0, 100 + peakDb)}%`; // -100 dB..0 dB -> 0%..100%
 * };
 * ```
 *
 * @group Recording
 */
export declare function computeAudioLevel(audioStreamBuffer: AudioStreamBuffer): AudioLevel;
