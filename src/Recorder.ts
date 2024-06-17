import { randomUUID } from "crypto";
import { finalizationRegistry } from "./finalizationRegistry.js";
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "stream";
import { AppleDevice, Camera, Microphone, Window } from "./RecordKit.js";

/**
 * @group Recording
 */
export class Recorder extends EventEmitter {
  private readonly rpc: NSRPC;
  private readonly target: string;

  /** @ignore */
  static async newInstance(rpc: NSRPC, schema: RecorderSchema): Promise<Recorder> {
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
      if (item.type == 'windowBasedCrop') {
        if (typeof item.window != 'number') {
          item.window = item.window.id
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

  async prepare(): Promise<void> {
    await this.rpc.perform({ target: this.target, action: 'prepare' });
  }

  async start(): Promise<void> {
    await this.rpc.perform({ target: this.target, action: 'start' });
  }

  async stop(): Promise<RecordingResult> {
    return await this.rpc.perform({ target: this.target, action: 'stop' }) as RecordingResult;
  }
}

/**
 * @group Recording
 */
export interface RecorderSchema {
  output_directory?: string
  items: RecorderSchemaItem[]
}

/**
 * @group Recording
 */
export type RecorderSchemaItem =
  | WebcamSchema
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
export interface WindowBasedCropSchema {
  type: 'windowBasedCrop'
  filename?: string
  window: Window | number // UInt32
  shows_cursor?: boolean
  mouse_events?: boolean
  keyboard_events?: boolean
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