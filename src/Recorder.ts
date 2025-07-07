import { randomUUID } from "crypto";
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "stream";
import { AppleDevice, Camera, Display, Microphone, RunningApplication, Window } from "./RecordKit.js";

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
      if (item.type == 'systemAudio') {
        if (item.output == 'segmented' && item.segmentCallback) {
          const segmentHandler = item.segmentCallback;
          (item as any).segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path as string) },
            prefix: 'SystemAudio.onSegment',
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
      }
    })

    const weakRefObject = new WeakRef(object);
    const onAbortInstance = rpc.registerClosure({
      handler: (params) => { weakRefObject.deref()?.emit('abort', params.reason as AbortReason) },
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
  | SystemAudioSchema
  | ApplicationAudioSchema

/**
 * Creates a recorder item for a webcam movie file, using the provided microphone and camera. Output is stored in a RecordKit bundle.
 * 
 * @group Recording Schemas
 */
export interface WebcamSchema {
  type: 'webcam'
  filename?: string
  camera: Camera | string
  microphone: Microphone | string
}

/**
 * Creates a recorder item for recording a single display. Output is stored in a RecordKit bundle.
 * 
 * @group Recording Schemas
 */
export type DisplaySchema = {
  type: 'display'
  display: Display | number // UInt32
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  include_audio?: boolean
  output?: 'singleFile'
  filename?: string
} | {
  type: 'display'
  display: Display | number // UInt32
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
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  output?: 'singleFile'
  filename?: string
} | {
  type: 'windowBasedCrop'
  window: Window | number // UInt32
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
 * @group Recording Schemas
 */
export interface AppleDeviceStaticOrientationSchema {
  type: 'appleDeviceStaticOrientation'
  filename?: string
  device: AppleDevice | string
}

/**
 * @group Recording Schemas
 */
export type SystemAudioMode = 'exclude' | 'include'

/**
 * Enumeration specifying the backend to use for system audio recording.
 * 
 * - `screenCaptureKit`: Use ScreenCaptureKit for system audio recording.
 * - `_beta_coreAudio`: This a beta feature, it is not fully implemented yet. Do not use in production. Currently only records single files in .caf format.
 * 
 * @group Recording Schemas
 */
export type SystemAudioBackend = 'screenCaptureKit' | '_beta_coreAudio'

/**
 * @group Recording Schemas
 */
export type AudioOutputOptionsType = 'singleFile' | 'segmented'

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
}

/**
 * @group Recording
 */
export type AbortReason =
  | { reason: 'userStopped'; result: RecordingResult; }
  | { reason: 'interrupted'; result: RecordingResult; error: RecordKitError; }
  | { reason: 'failed'; error: RecordKitError; }

/**
 * @group Recording
 */
export interface RecordingResult {
  url: string
  info: BundleInfo
}

export interface RecordKitError {
  message?: string // Message describing the problem and possible recovery options, intended to be shown directly to the end-user.
  error_group: string // Generic title, used for grouping related errors
  debug_description: string // Detailed technical description of this error, used in debugging
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