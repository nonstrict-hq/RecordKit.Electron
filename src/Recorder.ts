import { randomUUID } from "crypto";
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "stream";
import { AppleDevice, Camera, Display, Microphone, Window } from "./RecordKit.js";

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

/**
 * @group Recording Schemas
 */
export interface WebcamSchema {
  type: 'webcam'
  filename?: string
  camera: Camera | string
  microphone: Microphone | string
}

/**
 * @group Recording Schemas
 */
export type DisplaySchema = DisplaySingleFile | DisplaySegmented

interface DisplaySingleFile {
  type: 'display'
  display: Display | number // UInt32
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  include_audio?: boolean
  output?: 'singleFile'
  filename?: string
}

interface DisplaySegmented {
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
 * @group Recording Schemas
 */
export type WindowBasedCropSchema = WindowBasedCropSchemaSingleFile | WindowBasedCropSchemaSegmented

interface WindowBasedCropSchemaSingleFile {
  type: 'windowBasedCrop'
  window: Window | number // UInt32
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
  output?: 'singleFile'
  filename?: string
}

interface WindowBasedCropSchemaSegmented {
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
 * @group Recording Schemas
 */
export interface AppleDeviceStaticOrientationSchema {
  type: 'appleDeviceStaticOrientation'
  filename?: string
  device: AppleDevice | string
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
    type: 'screen' | 'webcam' | 'mouse' | 'appleDevice'
    filename: string
  }[]
}