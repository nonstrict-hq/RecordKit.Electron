import { IpcRecordKit } from "./IpcRecordKit.js";
import { Recorder, RecorderSchemaItem } from "./Recorder.js";
import { existsSync } from "node:fs";

/** 
 * Entry point for the RecordKit SDK, an instance is available as `recordkit` that can be imported from the module. Do not instantiate this class directly.
 * 
 * @groupDescription Discovery
 * Discover the windows and devices that are available to record.
 * 
 * @groupDescription Permissions
 * Check and request the apps permission to access the recording devices.
 * 
 * @groupDescription Logging
 * Log what's going on to the console for easy debugging and troubleshooting.
 */
export class RecordKit {
  private ipcRecordKit = new IpcRecordKit()

  /** @ignore */
  constructor() { }

  /**
   * Initialize the RecordKit SDK.
   * 
   * ⚠️ Must be called before calling any other RecordKit method.
   * 
   * @param args 
   */
  async initialize(args: {
    /**
     * Path to the `recordkit-rpc` binary, most of the time this should be set to `path.join(process.resourcesPath, 'recordkit-rpc')`.
     */
    rpcBinaryPath: string,
    /**
     * Whether to fallback to the RPC binary from `node_modules` if the given path does not exist. When enabled an extra check to see if the given path exists is performed. Most of the time this should be set to `!app.isPackaged`.
     */
    fallbackToNodeModules?: boolean,
    /**
     * Set the global log level. Defaults to `debug`. 
     * 
     * This is the same as calling `setLogLevel` right after initialization.
     */
    logLevel?: LogLevel,
    /** @ignore */
    logRpcMessages?: boolean
  }): Promise<void> {
    let rpcBinaryPath = args.rpcBinaryPath
    if (args.fallbackToNodeModules ?? true) {
      if (!existsSync(rpcBinaryPath)) {
        rpcBinaryPath = rpcBinaryPath.replace('node_modules/electron/dist/Electron.app/Contents/Resources', 'node_modules/@nonstrict/recordkit/bin')
        console.error(`RecordKit: [RPC] !! Falling back to RPC binary from node_modules at ${rpcBinaryPath}`)
      }
    }

    await this.ipcRecordKit.initialize(rpcBinaryPath, args.logRpcMessages)

    const logHandlerInstance = this.ipcRecordKit.nsrpc.registerClosure({
      handler: (params) => { console.log('RecordKit:', params.formattedMessage) },
      prefix: 'RecordKit.logHandler',
      lifecycle: this
    })
    await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogHandler', params: { logHandlerInstance } })

    if (args.logLevel) {
      await this.setLogLevel(args.logLevel)
    }
  }

  /**
   * Set the global log level. Defaults to `debug`.
   * 
   * Messages with a lower level than this will be ignored and not passed to any log handlers.
   * 
   * @group Logging
   */
  async setLogLevel(logLevel: LogLevel): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogLevel', params: { logLevel } })
  }

  /**
   * Overrides the global log level for a specific category. Defaults to the global log level.
   * 
   * Messages in the given category with a lower level than this will be ignored and not passed to any log handlers.
   * 
   * @group Logging
   */
  async setCategoryLogLevel(params: { category: string, logLevel?: LogLevel }): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogLevel', params })
  }

  /**
   * @group Discovery
   */
  async getWindows(): Promise<Window[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getWindows' }) as Window[]
  }

  /**
   * @group Discovery
   */
  async getCameras(): Promise<Camera[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getCameras' }) as Camera[]
  }

  /**
   * @group Discovery
   */
  async getMicrophones(): Promise<Microphone[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getMicrophones' }) as Microphone[]
  }

  /**
   * @group Discovery
   */
  async getAppleDevices(): Promise<AppleDevice[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getAppleDevices' }) as AppleDevice[]
  }

  /**
   * @group Permissions
   */
  async getCameraAuthorizationStatus(): Promise<AuthorizationStatus> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getCameraAuthorizationStatus' }) as AuthorizationStatus
  }

  /**
   * @group Permissions
   */
  async getMicrophoneAuthorizationStatus(): Promise<AuthorizationStatus> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getMicrophoneAuthorizationStatus' }) as AuthorizationStatus
  }

  /**
   * @group Permissions
   */
  async getScreenRecordingAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getScreenRecordingAccess' }) as boolean
  }

  /**
   * @group Permissions
   */
  async requestCameraAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestCameraAccess' }) as boolean
  }

  /**
   * @group Permissions
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestMicrophoneAccess' }) as boolean
  }

  /**
   * @group Permissions
   */
  async requestScreenRecordingAccess(): Promise<void> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestScreenRecordingAccess' }) as void
  }

  async createRecorder(
    schema: {
      output_directory?: string
      items: RecorderSchemaItem[]
      settings?: {
        allowFrameReordering?: boolean
      }
    }): Promise<Recorder> {
    return Recorder.newInstance(this.ipcRecordKit.nsrpc, schema);
  }
}

/** @ignore */
export let recordkit = new RecordKit();

/**
 * @group Permissions
 * 
 * @remarks
 * Describes the apps permission to access a recording device.
 * 
 * - `notDetermined` The user has not yet made a choice.
 * - `restricted` The user cannot change the client's status, possibly due to active restrictions such as parental controls being in place.
 * - `denied` The user explicitly denied access to the hardware supporting a media type for the client.
 * - `authorized` Application is authorized to access the hardware.
 */
export type AuthorizationStatus =
  | 'notDetermined' // The user has not yet made a choice.
  | 'restricted' // The user cannot change the client's status, possibly due to active restrictions such as parental controls being in place.
  | 'denied' // The user explicitly denied access to the hardware supporting a media type for the client.
  | 'authorized' // Application is authorized to access the hardware.

/**
 * @group Discovery
 */
export interface AppleDevice {
  id: string;
  name: string;
  model_id?: string;
  availability: 'available' | 'notPaired' | 'notConnected' | 'pairedNeedsConnect' | 'pairedNeedsReconnect'
}

/**
 * @group Discovery
 */
export interface Camera {
  id: string;
  name: string;
  model_id: string;
  manufacturer: string;
  availability: 'available' | 'lidClosed' | 'unknownSuspended'

  /**
   * This URL can be used in a `img` tag to display a live preview of the camera feed in your user interface.
   * 
   * @remarks
   * The preview URL should be available for every camera under normal conditions. If you observe a camera without a preview URL please report it as a bug.
   */
  preview_url?: string;
}

/**
 * @group Discovery
 */
export interface Microphone {
  id: string;
  name: string;
  model_id: string;
  manufacturer: string;
  availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected'
}

/**
 * @group Discovery
 */
export interface Window {
  id: number; // UInt32
  title?: string;
  frame: Bounds
  level: number // Int
  application_process_id?: number // Int32
  application_name?: string
}

/**
 * @group Utilities
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * @group Logging
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical'