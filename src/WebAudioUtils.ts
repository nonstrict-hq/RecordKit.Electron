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
export function createWebAudioBuffer(
  audioStreamBuffer: AudioStreamBuffer,
  audioContext: AudioContext
): AudioBuffer | null {
  // Input validation
  if (!audioStreamBuffer || typeof audioStreamBuffer !== 'object') {
    return null;
  }

  if (!audioContext || typeof audioContext.createBuffer !== 'function') {
    return null;
  }

  try {
    const { sampleRate, numberOfChannels, numberOfFrames, channelData } = audioStreamBuffer;

    // Validate required properties
    if (typeof sampleRate !== 'number' || sampleRate <= 0 || sampleRate > 192000) {
      return null;
    }

    if (typeof numberOfChannels !== 'number' || numberOfChannels <= 0 || numberOfChannels > 32) {
      return null;
    }

    if (typeof numberOfFrames !== 'number' || numberOfFrames <= 0 || numberOfFrames > 1048576) {
      return null;
    }

    if (!Array.isArray(channelData) || channelData.length !== numberOfChannels) {
      return null;
    }

    // Validate channel data arrays
    for (let i = 0; i < numberOfChannels; i++) {
      const channel = channelData[i];
      if (!channel || (!Array.isArray(channel) && !(channel instanceof Float32Array))) {
        return null;
      }
      
      // Check length matches expected frame count
      if (channel.length !== numberOfFrames) {
        return null;
      }
    }

    // Create Web Audio AudioBuffer
    const audioBuffer = audioContext.createBuffer(numberOfChannels, numberOfFrames, sampleRate);

    // Copy channel data to AudioBuffer
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const outputArray = audioBuffer.getChannelData(channel);
      const inputArray = channelData[channel];

      // Handle both Float32Array and regular arrays (from Electron IPC serialization)
      if (inputArray instanceof Float32Array) {
        // Direct copy for Float32Array
        outputArray.set(inputArray);
      } else if (Array.isArray(inputArray)) {
        // Convert regular array to Float32Array for better performance
        const float32Array = new Float32Array(inputArray);
        outputArray.set(float32Array);
      } else {
        // Fallback: manual copy with type conversion
        for (let i = 0; i < numberOfFrames; i++) {
          const sample = inputArray[i];
          outputArray[i] = typeof sample === 'number' && isFinite(sample) ? sample : 0;
        }
      }
    }

    return audioBuffer;
  } catch (error) {
    // Return null for any conversion failures - don't throw in streaming contexts
    return null;
  }
}

/**
 * An audio level measurement, as returned by {@link computeAudioLevel}.
 *
 * @group Recording
 */
export interface AudioLevel {
  /** Root-mean-square (average) amplitude across all channels. Usually in `[0, 1]`, but can exceed `1` for hot or clipped signals. */
  rms: number
  /** Peak absolute amplitude across all channels. Usually in `[0, 1]`, but can exceed `1` for hot or clipped signals. */
  peak: number
  /** {@link AudioLevel.rms} in decibels relative to full scale (0 dBFS). `-Infinity` for silence; can exceed `0` for clipped signals. */
  rmsDb: number
  /** {@link AudioLevel.peak} in decibels relative to full scale (0 dBFS). `-Infinity` for silence; can exceed `0` for clipped signals. */
  peakDb: number
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
export function computeAudioLevel(audioStreamBuffer: AudioStreamBuffer): AudioLevel {
  let sumSquares = 0
  let peak = 0
  let count = 0

  for (const channel of audioStreamBuffer.channelData) {
    for (let i = 0; i < channel.length; i++) {
      const sample = channel[i]
      sumSquares += sample * sample
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
      count++
    }
  }

  const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0
  const toDb = (value: number) => value > 0 ? 20 * Math.log10(value) : -Infinity

  return { rms, peak, rmsDb: toDb(rms), peakDb: toDb(peak) }
}
