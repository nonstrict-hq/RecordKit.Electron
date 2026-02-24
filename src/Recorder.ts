import { randomUUID } from "crypto";
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "events";
import { AppleDevice, Camera, Display, Microphone, RunningApplication, Window } from "./RecordKit.js";

/**
 * Converts RPC audio buffer data to AudioStreamBuffer format
 * @internal
 */
function convertRPCParamsToAudioStreamBuffer(params: any): AudioStreamBuffer | null {
  try {
    // params is the AudioBufferData directly from Swift
    const rawAudioBuffer = params as any;

    if (!rawAudioBuffer || !Array.isArray(rawAudioBuffer.channelData)) {
      console.error('RecordKit: Invalid audio buffer received from RPC');
      return null;
    }

    const channelData: Float32Array[] = [];

    for (const base64Data of rawAudioBuffer.channelData) {
      if (typeof base64Data !== 'string') {
        console.error('RecordKit: Invalid base64 data received');
        return null;
      }

      // Decode base64 to binary data
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert bytes to Float32Array
      const float32Array = new Float32Array(bytes.buffer);
      channelData.push(float32Array);
    }

    const audioStreamBuffer: AudioStreamBuffer = {
      sampleRate: rawAudioBuffer.sampleRate,
      numberOfChannels: rawAudioBuffer.numberOfChannels,
      numberOfFrames: rawAudioBuffer.numberOfFrames,
      channelData: channelData
    };

    return audioStreamBuffer;
  } catch (error) {
    console.error('RecordKit: Error processing audio stream buffer:', error);
    return null;
  }
}

/**
 * @group Recording
 */
export class Recorder extends EventEmitter {
  private readonly rpc: NSRPC;
  private readonly target: string;

  /** @ignore */
  static async newInstance(rpc: NSRPC, schema: {
    output_directory?: string
    items: RecorderSchemaItem[]
    settings?: {
      allowFrameReordering?: boolean
    }
  }): Promise<Recorder> {
    const target = 'Recorder_' + randomUUID();
    const object = new Recorder(rpc, target);

    schema.items.forEach(item => {
      if (item.type == 'webcam') {
        if (typeof item.camera != 'string') {
          item.camera = item.camera.id
        }
        if (typeof item.microphone != 'string') {
          item.microphone = item.microphone.id
        }
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'Webcam.onSegment',
            lifecycle: object
          });
        }
      }
      if (item.type == 'display') {
        if (typeof item.display != 'number') {
          item.display = item.display.id
        }
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'Display.onSegment',
            lifecycle: object
          });
        }
      }
      if (item.type == 'windowBasedCrop') {
        if (typeof item.window != 'number') {
          item.window = item.window.id
        }
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'Window.onSegment',
            lifecycle: object
          });
        }
      }
      if (item.type == 'appleDeviceStaticOrientation') {
        if (typeof item.device != 'string') {
          item.device = item.device.id
        }
      }
      if (item.type == 'appleDevice') {
        if (typeof item.device != 'string') {
          item.device = item.device.id
        }
      }
      if (item.type == 'systemAudio') {
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'SystemAudio.onSegment',
            lifecycle: object
          });
        }
        if (item.output == 'stream' && item.streamCallback) {
          const streamHandler = item.streamCallback;
          (item as any).streamCallback = rpc.registerClosure({
            handler: (params) => {
              const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
              if (audioBuffer) {
                streamHandler(audioBuffer);
              }
            },
            prefix: 'SystemAudioStream.onAudioBuffer',
            lifecycle: object
          });
        }
      }
      if (item.type == 'applicationAudio') {
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'ApplicationAudio.onSegment',
            lifecycle: object
          });
        }
        if (item.output == 'stream' && item.streamCallback) {
          const streamHandler = item.streamCallback;
          (item as any).streamCallback = rpc.registerClosure({
            handler: (params) => {
              const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
              if (audioBuffer) {
                streamHandler(audioBuffer);
              }
            },
            prefix: 'ApplicationAudioStream.onAudioBuffer',
            lifecycle: object
          });
        }
      }
      if (item.type == 'microphone') {
        if (typeof item.microphone != 'string') {
          item.microphone = item.microphone.id
        }
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'Microphone.onSegment',
            lifecycle: object
          });
        }
        if (item.output == 'stream' && item.streamCallback) {
          const streamHandler = item.streamCallback;
          (item as any).streamCallback = rpc.registerClosure({
            handler: (params) => {
              const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
              if (audioBuffer) {
                streamHandler(audioBuffer);
              }
            },
            prefix: 'MicrophoneStream.onAudioBuffer',
            lifecycle: object
          });
        }
      }
    })

    const weakRefObject = new WeakRef(object);
    const onAbortInstance = rpc.registerClosure({
      handler: (params) => { weakRefObject.deref()?.emit('abort', params as AbortReason) },
      prefix: 'Recorder.onAbort',
      lifecycle: object
    });

    await rpc.initialize({
      target,
      type: 'Recorder',
      params: { schema, onAbortInstance },
      lifecycle: object
    });

    return object
  }

  /** @ignore */
  constructor(rpc: NSRPC, target: string) {
    super();
    this.rpc = rpc;
    this.target = target;
  }

  async prepare() {
    await this.rpc.perform({ target: this.target, action: 'prepare' });
  }

  async start() {
    await this.rpc.perform({ target: this.target, action: 'start' });
  }

  async stop(): Promise<RecordingResult> {
    return await this.rpc.perform({ target: this.target, action: 'stop' }) as RecordingResult;
  }

  async cancel() {
    await this.rpc.manualRelease(this.target)
  }
}

/**
 * @group Recording
 */
export type RecorderSchemaItem =
  | WebcamSchema
  | DisplaySchema
  | WindowBasedCropSchema
  | AppleDeviceStaticOrientationSchema
  | AppleDeviceSchema
  | SystemAudioSchema
  | ApplicationAudioSchema
  | MicrophoneSchema

/**
 * Creates a recorder item for a webcam movie file, using the provided microphone and camera. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type WebcamSchema = {
  type: 'webcam'
  camera: Camera | string
  microphone: Microphone | string
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  preserveActiveCameraConfiguration?: boolean
  leftAudioChannelOnly?: boolean
  audioDelay?: number
  output?: 'singleFile'
  filename?: string
} | {
  type: 'webcam'
  camera: Camera | string
  microphone: Microphone | string
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  preserveActiveCameraConfiguration?: boolean
  leftAudioChannelOnly?: boolean
  audioDelay?: number
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
}

/**
 * Creates a recorder item for recording a single display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type DisplaySchema = {
  type: 'display'
  display: Display | number // UInt32
  /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
  colorSpace?: ColorSpace
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  include_audio?: boolean
  output?: 'singleFile'
  filename?: string
} | {
  type: 'display'
  display: Display | number // UInt32
  /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
  colorSpace?: ColorSpace
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  include_audio?: boolean
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
}

/**
 * Creates a recorder item for recording the initial crop of a window on a display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type WindowBasedCropSchema = {
  type: 'windowBasedCrop'
  window: Window | number // UInt32
  /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
  colorSpace?: ColorSpace
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  output?: 'singleFile'
  filename?: string
} | {
  type: 'windowBasedCrop'
  window: Window | number // UInt32
  /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
  colorSpace?: ColorSpace
  /** Video codec for the recording. Defaults to 'h264'. */
  videoCodec?: VideoCodec
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
}

/**
 * Creates a recorder item for an Apple device screen recording, using the provided deviceID. Output is stored in a RecordKit bundle.
 *
 * @deprecated Use {@link AppleDeviceSchema} instead.
 * @group Recording Schemas
 */
export interface AppleDeviceStaticOrientationSchema {
  type: 'appleDeviceStaticOrientation'
  filename?: string
  device: AppleDevice | string
}

/**
 * Creates a recorder item for an Apple device screen recording, using the provided deviceID. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export interface AppleDeviceSchema {
  type: 'appleDevice'
  filename?: string
  device: AppleDevice | string
}

/**
 * Video codec for screen recording.
 * - `h264`: H.264/AVC codec - most compatible, works on all devices.
 * - `hevc`: H.265/HEVC codec - smaller file sizes, requires newer devices for playback.
 *
 * @group Recording Schemas
 */
export type VideoCodec = 'h264' | 'hevc'

/**
 * Color space for screen recording.
 * - `sRGB`: Standard RGB color space, compatible with all modern displays.
 * - `displayP3`: Display P3 color space, used in high-end Apple displays for wide gamut colors.
 *
 * Note: Display P3 is only supported with HEVC codec. If Display P3 is requested with H.264,
 * it will automatically fall back to sRGB.
 *
 * @group Recording Schemas
 */
export type ColorSpace = 'sRGB' | 'displayP3'

/**
 * @group Recording Schemas
 */
export type SystemAudioMode = 'exclude' | 'include'

/**
 * Enumeration specifying the backend to use for system audio recording.
 * 
 * - `screenCaptureKit`: Use ScreenCaptureKit for system audio recording.
 * - `_beta_coreAudio`: This is a beta feature, not fully tested yet. Do not use in production. Supports single-file and segmented output in M4A/AAC format. Streaming output is not yet supported.
 * 
 * @group Recording Schemas
 */
export type SystemAudioBackend = 'screenCaptureKit' | '_beta_coreAudio'

/**
 * @group Recording Schemas
 */
export type AudioOutputOptionsType = 'singleFile' | 'segmented' | 'stream'

/**
 * @group Recording Schemas
 */
export type MicrophoneOutputOptionsType = 'singleFile' | 'segmented' | 'stream'

/**
 * Creates a recorder item for recording system audio. By default current process audio is excluded. Output is stored in a RecordKit bundle.
 * 
 * When using `mode: 'exclude'`, all system audio is recorded except for excluded applications.
 * When using `mode: 'include'`, only audio from specified applications is recorded.
 * 
 * @group Recording Schemas
 */
export type SystemAudioSchema = {
  type: 'systemAudio'
  mode: 'exclude'
  backend?: SystemAudioBackend
  excludeOptions?: ('currentProcess')[]
  excludedProcessIDs?: number[] // Int32
  output?: 'singleFile'
  filename?: string
} | {
  type: 'systemAudio'
  mode: 'exclude'
  backend?: SystemAudioBackend
  excludeOptions?: ('currentProcess')[]
  excludedProcessIDs?: number[] // Int32
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
} | {
  type: 'systemAudio'
  mode: 'exclude'
  backend?: SystemAudioBackend
  excludeOptions?: ('currentProcess')[]
  excludedProcessIDs?: number[] // Int32
  output: 'stream'
  /** Called with real-time audio buffer data compatible with Web Audio API. */
  streamCallback?: (audioBuffer: AudioStreamBuffer) => void
} | {
  type: 'systemAudio'
  mode: 'include'
  backend?: SystemAudioBackend
  includedApplicationIDs?: number[] // Int32
  output?: 'singleFile'
  filename?: string
} | {
  type: 'systemAudio'
  mode: 'include'
  backend?: SystemAudioBackend
  includedApplicationIDs?: number[] // Int32
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
} | {
  type: 'systemAudio'
  mode: 'include'
  backend?: SystemAudioBackend
  includedApplicationIDs?: number[] // Int32
  output: 'stream'
  /** Called with real-time audio buffer data compatible with Web Audio API. */
  streamCallback?: (audioBuffer: AudioStreamBuffer) => void
}

/**
 * Creates a recorder item for recording the audio of a single application. Output is stored in a RecordKit bundle.
 * 
 * @group Recording Schemas
 */
export type ApplicationAudioSchema = {
  type: 'applicationAudio'
  applicationID: number // Int32
  backend?: SystemAudioBackend
  output?: 'singleFile'
  filename?: string
} | {
  type: 'applicationAudio'
  applicationID: number // Int32
  backend?: SystemAudioBackend
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
} | {
  type: 'applicationAudio'
  applicationID: number // Int32
  backend?: SystemAudioBackend
  output: 'stream'
  /** Called with real-time audio buffer data compatible with Web Audio API. */
  streamCallback?: (audioBuffer: AudioStreamBuffer) => void
}

/**
 * Creates a recorder item for an audio file, using the provided microphone. Output is stored in a RecordKit bundle.
 * 
 * @group Recording Schemas
 */
export type MicrophoneSchema = {
  type: 'microphone'
  microphone: Microphone | string
  leftChannelOnly?: boolean
  audioDelay?: number
  output?: 'singleFile'
  filename?: string
} | {
  type: 'microphone'
  microphone: Microphone | string
  leftChannelOnly?: boolean
  audioDelay?: number
  output: 'segmented'
  filenamePrefix?: string
  segmentCallback?: (url: string) => void
} | {
  type: 'microphone'
  microphone: Microphone | string
  output: 'stream'
  /** Called with real-time audio buffer data compatible with Web Audio API */
  streamCallback?: (audioBuffer: AudioStreamBuffer) => void
}

/**
 * Audio buffer compatible with Web Audio API
 * 
 * @group Recording
 */
export interface AudioStreamBuffer {
  /** Sample rate in Hz (e.g., 44100, 48000) */
  sampleRate: number
  /** Number of audio channels */
  numberOfChannels: number
  /** Number of frames per channel */
  numberOfFrames: number
  /** Non-interleaved Float32 audio data - one array per channel */
  channelData: Float32Array[]
}


/**
 * @group Recording
 */
export type AbortReason =
  | { reason: 'userStopped'; result: RecordingResult; }
  | { reason: 'interrupted'; result: RecordingResult; error: any; }
  | { reason: 'failed'; error: any; }

/**
 * @group Recording
 */
export interface RecordingResult {
  url: string
  info: BundleInfo
}

/**
 * Errors produced by RecordKit include user-friendly messages suitable for display in your UI.
 *
 * See the [Logging and Error Handling guide](https://recordkit.dev/guides/logging-and-errors#error-handling) for more information.
 */
export interface RecordKitError {
  name: "RecordKitError"
  /** Error code, used for grouping related errors */
  code: string
  /** Error code number */
  codeNumber: number
  /** Message describing the problem and possible recovery options, intended to be shown directly to the end-user. */
  message: string
  /** Detailed technical description of this error, used in debugging */
  debugDescription: string
}

/**
 * @group Recording
 */
export interface BundleInfo {
  version: 1,
  files: {
    type: 'screen' | 'webcam' | 'audio' | 'mouse' | 'systemAudio' | 'appleDevice' | 'topWindow'
    filename: string
  }[]
}