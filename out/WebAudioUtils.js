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
export function createWebAudioBuffer(audioStreamBuffer, audioContext) {
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
            }
            else if (Array.isArray(inputArray)) {
                // Convert regular array to Float32Array for better performance
                const float32Array = new Float32Array(inputArray);
                outputArray.set(float32Array);
            }
            else {
                // Fallback: manual copy with type conversion
                for (let i = 0; i < numberOfFrames; i++) {
                    const sample = inputArray[i];
                    outputArray[i] = typeof sample === 'number' && isFinite(sample) ? sample : 0;
                }
            }
        }
        return audioBuffer;
    }
    catch (error) {
        // Return null for any conversion failures - don't throw in streaming contexts
        return null;
    }
}
//# sourceMappingURL=WebAudioUtils.js.map