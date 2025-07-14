import { IpcRecordKit } from "./IpcRecordKit.js";
import { Recorder, RecorderSchemaItem } from "./Recorder.js";
import { EventEmitter } from "events";
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
export class RecordKit extends EventEmitter {
  private ipcRecordKit = new IpcRecordKit()

  /** @ignore */
  constructor() {
    super()
  }

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
      handler: (params) => {
        console.log('RecordKit:', params.formattedMessage)
        this.emit('log', params)
      },
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
   * A list of Mac displays that can be used for screen recording.
   *
   * @group Discovery
   */
  async getDisplays(): Promise<Display[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getDisplays' }) as Display[]
  }

  /**
   * A list of macOS windows that can be used for screen recording.
   *
   * @group Discovery
   */
  async getWindows(): Promise<Window[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getWindows' }) as Window[]
  }

  /**
   * A list of cameras that are connected to the system.
   *
   * @param params.includeDeskView - Whether to include Desk View cameras in the results
   * @group Discovery
   */
  async getCameras(params?: { includeDeskView?: boolean }): Promise<Camera[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getCameras', params: { includeDeskView: params?.includeDeskView ?? false } }) as Camera[]
  }

  /**
   * A list of microphones that are connected to the system.
   *
   * @group Discovery
   */
  async getMicrophones(): Promise<Microphone[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getMicrophones' }) as Microphone[]
  }

  /**
   * A list of iOS devices that are connected to the system.
   *
   * @group Discovery
   */
  async getAppleDevices(): Promise<AppleDevice[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getAppleDevices' }) as AppleDevice[]
  }

  /**
   * A list of currently running applications that can be used for screen or audio recording.
   *
   * @group Discovery
   */
  async getRunningApplications(): Promise<RunningApplication[]> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getRunningApplications' }) as RunningApplication[]
  }

  /**
   * Indicates if camera can be used.
   *
   * Authorization status that indicates whether the user grants the app permission to capture video.
   *
   * @group Permissions
   */
  async getCameraAuthorizationStatus(): Promise<AuthorizationStatus> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getCameraAuthorizationStatus' }) as AuthorizationStatus
  }

  /**
   * Indicates if microphone can be used.
   *
   * Authorization status that indicates whether the user grants the app permission to capture audio.
   *
   * @group Permissions
   */
  async getMicrophoneAuthorizationStatus(): Promise<AuthorizationStatus> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getMicrophoneAuthorizationStatus' }) as AuthorizationStatus
  }

  /**
   * Indicates if screen can be recorded.
   *
   * @group Permissions
   */
  async getScreenRecordingAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getScreenRecordingAccess' }) as boolean
  }

  /**
   * Indicates if system audio can be recorded.
   *
   * @group Permissions
   */
  async getSystemAudioRecordingAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getSystemAudioRecordingAccess' }) as boolean
  }

  /**
   * Indicates if keystroke events of other apps can be recorded via Input Monitoring.
   *
   * @group Permissions
   */
  async getInputMonitoringAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getInputMonitoringAccess' }) as boolean
  }

  /**
   * Indicates if other apps can be controlled via Accessibility.
   *
   * @group Permissions
   */
  async getAccessibilityControlAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getAccessibilityControlAccess' }) as boolean
  }

  /**
   * Requests the user's permission to allow the app to capture the camera.
   *
   * Prompts the users if this is the first time requesting access, otherwise immediately returns.
   *
   * @returns Boolean value that indicates whether the user granted or denied access to your app.
   * @group Permissions
   */
  async requestCameraAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestCameraAccess' }) as boolean
  }

  /**
   * Requests the user's permission to allow the app to capture the microphone.
   *
   * Prompts the users if this is the first time requesting access, otherwise immediately returns.
   *
   * @returns Boolean value that indicates whether the user granted or denied access to your app.
   * @group Permissions
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestMicrophoneAccess' }) as boolean
  }

  /**
   * Requests the user's permission to allow the app to capture the screen.
   *
   * If this is the first time requesting access, this shows dialog that lets th users open System Settings.
   * In System Settings, the user can allow the app permission to do screen recording.
   *
   * Afterwards, the users needs to restart this app, for the permission to become active in the app.
   *
   * @group Permissions
   */
  async requestScreenRecordingAccess(): Promise<void> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestScreenRecordingAccess' }) as void
  }

  /**
   * Requests the user's permission to allow the app to capture system audio.
   *
   * If this is the first time requesting access, this shows dialog that lets th users open System Settings.
   * In System Settings, the user can allow the app permission to do screen recording.
   *
   * Afterwards, the users needs to restart this app, for the permission to become active in the app.
   *
   * @remarks Currently, system audio recording is currently implemented using ScreenCaptureKit,
   * which means the users needs to grant screen recording access.
   *
   * @group Permissions
   */
  async requestSystemAudioRecordingAccess(): Promise<void> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestSystemAudioRecordingAccess' }) as void
  }

  /**
   * Requests the users's permission to monitor keystrokes of other apps via Input Monitoring.
   *
   * If this is the first time requesting access, this shows dialog that lets th users open System Settings.
   * In System Settings, the user can allow the app permission to monitor other apps.
   *
   * Afterwards, the users needs to restart this app, for the permission to become active in the app.
   *
   * @group Permissions
   */
  async requestInputMonitoringAccess(): Promise<void> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestInputMonitoringAccess' }) as void
  }

  /**
   * Requests the users's permission to control other apps via Accessibility permissions.
   *
   * If this is the first time requesting access, this shows dialog that lets th users open System Settings.
   * In System Settings, the user can allow the app permission to control apps.
   *
   * Afterwards, the users needs to restart this app, for the permission to become active in the app.
   *
   * @group Permissions
   */
  async requestAccessibilityControlAccess(): Promise<void> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestAccessibilityControlAccess' }) as void
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
 * An external iOS device that can be used for screen recording.
 * 
 * @group Discovery
 */
export interface AppleDevice {
  /** An identifier that uniquely identifies the device. */
  id: string;

  /** A localized device name for display in the user interface. */
  name: string;

  /** The model of this device. */
  model_id?: string;

  /** 
   * The current availability state of this device.
   * 
   * - `available`: Device can be recorded
   * - `notPaired`: Device cannot be recorded because it is connected but not paired (recovery: "Tap 'Trust' on iPhone")
   * - `notConnected`: Device cannot be recorded because it is currently not connected (recovery: "Connect via cable")
   * - `pairedNeedsConnect`: Device cannot be recorded because it is paired but currently not connected (recovery: "(Re-)connect via cable")
   * - `pairedNeedsReconnect`: Device cannot be recorded because it needs to be reconnected (recovery: "Unplug cable, and reconnect again")
   */
  availability: 'available' | 'notPaired' | 'notConnected' | 'pairedNeedsConnect' | 'pairedNeedsReconnect'
}

/**
 * A running macOS application of which windows or audio can be recorded.
 * 
 * @group Discovery
 */
export interface RunningApplication {
  /** Identifier for this application (process id). */
  id: number; // Int32

  /** Display name of the application. */
  name?: string;

  /** Bundle identifier of the application (e.g., "com.apple.Safari"). */
  bundle_identifier?: string;

  /** 
   * The current availability state of this application.
   * 
   * - `available`: Application can be recorded
   * - `notRunning`: Application cannot be recorded because it is not (or no longer) running
   */
  availability: 'available' | 'notRunning'
}

/**
 * A camera whose video can be recorded.
 * 
 * @group Discovery
 */
export interface Camera {
  /** An identifier that uniquely identifies the camera. */
  id: string;

  /** A localized camera name for display in the user interface. */
  name: string;

  /** The model ID of this camera. */
  model_id: string;

  /** The manufacturer of this camera. */
  manufacturer: string;

  /** 
   * The current availability state of this camera.
   * 
   * - `available`: Camera can be recorded
   * - `lidClosed`: Camera cannot be recorded because the MacBook lid is closed (recovery: "Open MacBook lid")
   * - `unknownSuspended`: Camera cannot be recorded because it is suspended for some unknown reason (recovery: "Unsuspend camera")
   * - `notConnected`: Camera cannot be recorded because it is currently not connected (recovery: "Connect camera")
   */
  availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected'

  /**
   * This URL can be used in a `img` tag to display a live preview of the camera feed in your user interface.
   * 
   * @remarks
   * The preview URL should be available for every camera under normal conditions. If you observe a camera without a preview URL please report it as a bug.
   */
  preview_url?: string;
}

/**
 * A microphone whose audio can be recorded.
 * 
 * @group Discovery
 */
export interface Microphone {
  /** An identifier that uniquely identifies the microphone. */
  id: string;

  /** A localized microphone name for display in the user interface. */
  name: string;

  /** The model ID of this microphone. */
  model_id: string;

  /** The manufacturer of this microphone. */
  manufacturer: string;

  /** 
   * The current availability state of this microphone.
   * 
   * - `available`: Microphone can be recorded
   * - `lidClosed`: Microphone cannot be recorded because the MacBook lid is closed (recovery: "Open MacBook lid")
   * - `unknownSuspended`: Microphone cannot be recorded because it is suspended for some unknown reason (recovery: "Unsuspend microphone")
   * - `notConnected`: Microphone cannot be recorded because it is currently not connected (recovery: "Connect microphone")
   */
  availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected'
}

/**
 * A Mac display that can be used for screen recording.
 * 
 * @group Discovery
 */
export interface Display {
  /** An identifier that uniquely identifies this Mac display (CGDirectDisplayID). */
  id: number; // UInt32

  /** Name of this display. */
  localizedName?: string;

  /** Frame of the display, relative to the main display. Uses top-left coordinate space. */
  frame: Bounds

  /** Indicates if this is the main display. */
  isMain: boolean

  /** 
   * The current availability state of this display.
   * 
   * - `available`: A display can be recorded
   * - `lidClosed`: A display cannot be recorded, because the MacBook lid is closed (recovery: "Open MacBook lid")
   * - `notConnected`: A display cannot be screen recorded, because it is currently not connected (recovery: "Connect display")
   */
  availability: 'available' | 'lidClosed' | 'notConnected'
}

/**
 * A macOS window that can be used for screen recording.
 * 
 * @group Discovery
 */
export interface Window {
  /** An identifier that uniquely identifies this macOS window (CGWindowID). */
  id: number; // UInt32

  /** Title of the window. */
  title?: string;

  /** Frame of the window, relative to the main display. Uses top-left coordinate space. */
  frame: Bounds

  /** 
   * The level of the window relative to other windows.
   */
  level: number // Int

  /** Process ID of the application that owns this window. */
  application_process_id?: number // Int32

  /** Name of the application that owns this window. */
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