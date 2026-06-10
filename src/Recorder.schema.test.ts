import { Recorder } from './Recorder.js';
import type { AudioStreamBuffer, RecorderSchemaItem } from './Recorder.js';
import type { Display, Microphone, Window } from './RecordKit.js';
import type { NSRPC } from './NonstrictRPC.js';

// Pins the TypeScript -> RPC wire mapping done by Recorder.newInstance: device objects are
// normalized to ids, callbacks are replaced by registered-closure tokens, and optional fields
// (defaults) are passed through verbatim or omitted — never silently injected. This is the layer
// where parity with the Swift schema can drift, so it is locked down here without spawning the RPC.
interface RegisteredClosure {
  handler: (params: Record<string, unknown>) => Record<string, unknown> | void;
  prefix: string;
}

function mockRpc() {
  const calls: { initialize?: any; closures: RegisteredClosure[] } = { closures: [] };
  const rpc = {
    async initialize(args: any) { calls.initialize = args; },
    registerClosure(options: RegisteredClosure) { calls.closures.push(options); return `closure:${options.prefix}`; },
    async perform() { return undefined; },
    async manualRelease() { },
  } as unknown as NSRPC;
  return { rpc, calls };
}

async function wire(items: RecorderSchemaItem[]) {
  const { rpc, calls } = mockRpc();
  await Recorder.newInstance(rpc, { items });
  return { item: calls.initialize.params.schema.items[0], calls };
}

// Fixtures are fully-typed literals (no casts), so this suite also locks down the public schema
// types themselves: a field disappearing from the types fails compilation here.
const MICROPHONE: Microphone = { id: 'mic-7', isVirtual: false, name: 'X', model_id: 'model', manufacturer: 'Acme', availability: 'available' };
const DISPLAY: Display = { id: 5, symbolName: 'display', frame: { x: 0, y: 0, width: 1920, height: 1080 }, isMain: true, availability: 'available' };
const WINDOW: Window = { id: 42, frame: { x: 0, y: 0, width: 800, height: 600 }, level: 0 };

describe('Recorder schema serialization (TS -> RPC wire)', () => {
  it('passes microphone echoCancellation / audioDelay / filename through verbatim', async () => {
    const { item } = await wire([
      { type: 'microphone', microphone: 'mic-1', echoCancellation: 'aggressive', audioDelay: 0.3, filename: 'm.m4a' },
    ]);
    expect(item).toMatchObject({ type: 'microphone', microphone: 'mic-1', echoCancellation: 'aggressive', audioDelay: 0.3, filename: 'm.m4a' });
  });

  it('normalizes a Microphone object to its id', async () => {
    const { item } = await wire([
      { type: 'microphone', microphone: MICROPHONE },
    ]);
    expect(item.microphone).toBe('mic-7');
  });

  it('keeps applicationAudio backend and applicationID on the wire', async () => {
    const { item } = await wire([
      { type: 'applicationAudio', applicationID: 64149, backend: 'screenCaptureKit', filename: 'a.m4a' },
    ]);
    expect(item).toMatchObject({ type: 'applicationAudio', applicationID: 64149, backend: 'screenCaptureKit', filename: 'a.m4a' });
  });

  it('normalizes a Display object and replaces a segment callback with a closure token', async () => {
    const { item, calls } = await wire([
      { type: 'display', display: DISPLAY, output: 'segmented', segmentCallback: () => { } },
    ]);
    expect(item.display).toBe(5);
    expect(typeof item.segmentCallback).toBe('string'); // function replaced by a registered-closure token
    expect(calls.closures.some((c) => c.prefix === 'Display.onSegment')).toBe(true);
  });

  it('normalizes a desktopIndependentWindow Window object and replaces its segment callback', async () => {
    const { item, calls } = await wire([
      { type: 'desktopIndependentWindow', window: WINDOW, output: 'segmented', segmentCallback: () => { } },
    ]);
    expect(item.window).toBe(42);
    expect(typeof item.segmentCallback).toBe('string');
    expect(calls.closures.some((c) => c.prefix === 'DesktopIndependentWindow.onSegment')).toBe(true);
  });

  it('does not inject defaults for omitted optional fields (omitted = Swift default)', async () => {
    const { item } = await wire([{ type: 'microphone', microphone: 'mic-1' }]);
    expect('echoCancellation' in item).toBe(false);
    expect('audioDelay' in item).toBe(false);
  });
});

describe('Recorder inputEventsOutput wiring (TS -> RPC wire)', () => {
  async function wireSegmentedInputEvents(item: RecorderSchemaItem, expectedPrefix: string) {
    const { item: wired, calls } = await wire([item]);
    expect(typeof wired.inputEventsOutput.segmentCallback).toBe('string'); // function replaced by a registered-closure token
    const closure = calls.closures.find((c) => c.prefix === expectedPrefix);
    expect(closure).toBeDefined();
    return closure!;
  }

  it('replaces the display inputEventsOutput segment callback and forwards segment paths', async () => {
    const received: string[] = [];
    const closure = await wireSegmentedInputEvents(
      { type: 'display', display: 5, mouse_events: true, inputEventsOutput: { output: 'segmented', segmentCallback: (path) => received.push(path) } },
      'Display.onInputEventsSegment',
    );
    closure.handler({ path: '/tmp/My Recordings/display-events 1.json' });
    expect(received).toEqual(['/tmp/My Recordings/display-events 1.json']);
  });

  it('replaces the windowBasedCrop inputEventsOutput segment callback', async () => {
    await wireSegmentedInputEvents(
      { type: 'windowBasedCrop', window: 42, mouse_events: true, inputEventsOutput: { output: 'segmented', segmentCallback: () => { } } },
      'WindowBasedCrop.onInputEventsSegment',
    );
  });

  it('replaces the desktopIndependentWindow inputEventsOutput segment callback', async () => {
    await wireSegmentedInputEvents(
      { type: 'desktopIndependentWindow', window: 42, mouse_events: true, inputEventsOutput: { output: 'segmented', segmentCallback: () => { } } },
      'DesktopIndependentWindow.onInputEventsSegment',
    );
  });

  it('passes a singleFile inputEventsOutput through verbatim', async () => {
    const { item } = await wire([
      { type: 'display', display: 5, mouse_events: true, inputEventsOutput: { filename: 'events.json' } },
    ]);
    expect(item.inputEventsOutput).toEqual({ filename: 'events.json' });
  });
});

describe('Recorder audio stream decoding (RPC -> AudioStreamBuffer)', () => {
  function base64Samples(samples: number[]): string {
    const floats = new Float32Array(samples);
    return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength).toString('base64');
  }

  async function wireMicrophoneStream() {
    const received: AudioStreamBuffer[] = [];
    const { calls } = await wire([
      { type: 'microphone', microphone: 'mic-1', output: 'stream', streamCallback: (buffer) => received.push(buffer) },
    ]);
    const closure = calls.closures.find((c) => c.prefix === 'MicrophoneStream.onAudioBuffer');
    expect(closure).toBeDefined();
    return { closure: closure!, received };
  }

  it('decodes base64 channel data into per-channel Float32Arrays', async () => {
    const { closure, received } = await wireMicrophoneStream();
    closure.handler({
      sampleRate: 48000,
      numberOfChannels: 2,
      numberOfFrames: 3,
      channelData: [base64Samples([0, 0.5, -0.5]), base64Samples([1, -1, 0.25])],
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ sampleRate: 48000, numberOfChannels: 2, numberOfFrames: 3 });
    expect(Array.from(received[0].channelData[0])).toEqual([0, 0.5, -0.5]);
    expect(Array.from(received[0].channelData[1])).toEqual([1, -1, 0.25]);
  });

  it('drops malformed audio buffers instead of invoking the stream callback', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
    try {
      const { closure, received } = await wireMicrophoneStream();
      closure.handler({ sampleRate: 48000, numberOfChannels: 1, numberOfFrames: 3 }); // missing channelData
      closure.handler({ sampleRate: 48000, numberOfChannels: 1, numberOfFrames: 3, channelData: [12345] }); // not base64 strings
      expect(received).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });
});
