import { computeAudioLevel, createWebAudioBuffer } from './WebAudioUtils.js';
import type { AudioStreamBuffer } from './Recorder.js';

function buf(channelData: number[][], sampleRate = 48000): AudioStreamBuffer {
  return {
    sampleRate,
    numberOfChannels: channelData.length,
    numberOfFrames: channelData[0]?.length ?? 0,
    channelData: channelData.map((c) => Float32Array.from(c)),
  };
}

describe('computeAudioLevel', () => {
  it('reports silence as zero amplitude and -Infinity dB', () => {
    const level = computeAudioLevel(buf([[0, 0, 0, 0]]));
    expect(level.rms).toBe(0);
    expect(level.peak).toBe(0);
    expect(level.rmsDb).toBe(-Infinity);
    expect(level.peakDb).toBe(-Infinity);
  });

  it('computes RMS and peak, and their dBFS equivalents', () => {
    // constant magnitude 0.5 -> rms == peak == 0.5 -> ~ -6.02 dBFS
    const level = computeAudioLevel(buf([[0.5, -0.5, 0.5, -0.5]]));
    expect(level.rms).toBeCloseTo(0.5, 5);
    expect(level.peak).toBeCloseTo(0.5, 5);
    expect(level.rmsDb).toBeCloseTo(20 * Math.log10(0.5), 4);
    expect(level.peakDb).toBeCloseTo(20 * Math.log10(0.5), 4);
  });

  it('takes the peak as the max absolute sample across all channels', () => {
    const level = computeAudioLevel(buf([[0.1, -0.9], [0.3, 0.2]]));
    expect(level.peak).toBeCloseTo(0.9, 5);
  });

  it('treats a full-scale signal as 0 dBFS', () => {
    const level = computeAudioLevel(buf([[1, -1, 1, -1]]));
    expect(level.peakDb).toBeCloseTo(0, 5);
  });

  it('handles an empty buffer without dividing by zero', () => {
    const level = computeAudioLevel(buf([[]]));
    expect(level.rms).toBe(0);
    expect(level.peakDb).toBe(-Infinity);
  });
});

describe('createWebAudioBuffer', () => {
  // Minimal AudioContext stub: createBuffer returns an object backed by Float32Arrays.
  function fakeContext(): AudioContext {
    const channels: Float32Array[] = [];
    return {
      createBuffer(numberOfChannels: number, numberOfFrames: number, _sampleRate: number) {
        for (let i = 0; i < numberOfChannels; i++) channels[i] = new Float32Array(numberOfFrames);
        return { getChannelData: (i: number) => channels[i] };
      },
    } as unknown as AudioContext;
  }

  it('copies channel data into a created AudioBuffer', () => {
    const out = createWebAudioBuffer(buf([[0.1, 0.2, 0.3]]), fakeContext());
    expect(out).not.toBeNull();
    const data = out!.getChannelData(0);
    expect(data.length).toBe(3);
    expect(data[0]).toBeCloseTo(0.1, 5);
    expect(data[1]).toBeCloseTo(0.2, 5);
    expect(data[2]).toBeCloseTo(0.3, 5);
  });

  it('returns null for a malformed buffer instead of throwing (safe in stream callbacks)', () => {
    const bad = { sampleRate: 48000, numberOfChannels: 2, numberOfFrames: 4, channelData: [Float32Array.from([0, 0, 0, 0])] } as AudioStreamBuffer;
    expect(createWebAudioBuffer(bad, fakeContext())).toBeNull();
  });

  it('returns null when no usable AudioContext is provided', () => {
    expect(createWebAudioBuffer(buf([[0.1]]), undefined as unknown as AudioContext)).toBeNull();
  });
});
