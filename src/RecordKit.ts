import { IpcRecordKit } from "./IpcRecordKit.js";
import { Recorder, RecorderSchemaItem } from "./Recorder.js";
import type { SystemAudioBackend, RecorderSettings, Size } from "./Recorder.js";
import { EventEmitter } from "events";
import { existsSync } from "node:fs";

/** @internal */
function windowIdOf(window: Window | number): number {
  return typeof window == 'number' ? window : window.id
}
/** @internal */
function displayIdOf(display: Display | number | undefined): number | undefined {
  return display == null ? undefined : (typeof display == 'number' ? display : display.id)
}
/** @internal */
function cameraIdOf(camera: Camera | string): string {
  return typeof camera == 'string' ? camera : camera.id
}
/** @internal */
function microphoneIdOf(microphone: Microphone | string): string {
  return typeof microphone == 'string' ? microphone : microphone.id
}
/** @internal */
function appleDeviceIdOf(device: AppleDevice | string): string {
  return typeof device == 'string' ? device : device.id
}
/** @internal */
function applicationIdOf(application: RunningApplication | number): number {
  return typeof application == 'number' ? application : application.id
}

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
 * Log what's going on to the console for easy debugging and troubleshooting. See the [Logging and Error Handling guide](https://recordkit.dev/guides/logging-and-errors) for more information.
 *
 * @groupDescription Preferred Devices
 * Read and update the user's preferred devices, so you can pre-select sensible defaults in your UI.
 *
 * @groupDescription Window Control
 * Move, resize, center and maximize windows of other applications (requires Accessibility Control permission).
 *
 * @groupDescription Device Control
 * Configure capture devices, such as selecting a camera's active format or fetching an application's icon.
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
        const message = params as unknown as LogMessage
        console.log('RecordKit:', message.formattedMessage)
        this.emit('log', message)
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
   * The user's preferred devices for each source type, ordered most-preferred first.
   *
   * RecordKit remembers which devices the user last recorded with (unless disabled via the recorder's
   * `updatesUserPreferred` setting). Use this to pre-select a sensible default device in your UI.
   *
   * @group Preferred Devices
   */
  async getUserPreferred(): Promise<UserPreferred> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'getPreferred' }) as UserPreferred
  }

  /**
   * Records the given microphone as the user's most-preferred microphone.
   *
   * Call this whenever the user manually selects a microphone, so it can be pre-selected later via
   * {@link getUserPreferred}. The selection moves to the front of {@link UserPreferred.microphoneIDs}.
   *
   * @param microphone - The microphone to prefer, either a {@link Microphone} or its {@link Microphone.id}.
   * @group Preferred Devices
   */
  async updatePreferredMicrophone(microphone: Microphone | string): Promise<void> {
    const id = microphoneIdOf(microphone)
    await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateMicrophone', params: { id } })
  }

  /**
   * Records the given camera as the user's most-preferred camera.
   *
   * Call this whenever the user manually selects a camera, so it can be pre-selected later via
   * {@link getUserPreferred}. The selection moves to the front of {@link UserPreferred.cameraIDs}.
   *
   * @param camera - The camera to prefer, either a {@link Camera} or its {@link Camera.id}.
   * @group Preferred Devices
   */
  async updatePreferredCamera(camera: Camera | string): Promise<void> {
    const id = cameraIdOf(camera)
    await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateCamera', params: { id } })
  }

  /**
   * Records the given display as the user's most-preferred display.
   *
   * Call this whenever the user manually selects a display, so it can be pre-selected later via
   * {@link getUserPreferred}. The selection moves to the front of {@link UserPreferred.displayIDs}.
   *
   * @param display - The display to prefer, either a {@link Display} or its {@link Display.id}.
   * @group Preferred Devices
   */
  async updatePreferredDisplay(display: Display | number): Promise<void> {
    const id = displayIdOf(display)
    await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateDisplay', params: { id } })
  }

  /**
   * Records the given Apple device as the user's most-preferred Apple device.
   *
   * Call this whenever the user manually selects an Apple device, so it can be pre-selected later via
   * {@link getUserPreferred}. The selection moves to the front of {@link UserPreferred.appleDeviceIDs}.
   *
   * @param device - The Apple device to prefer, either an {@link AppleDevice} or its {@link AppleDevice.id}.
   * @group Preferred Devices
   */
  async updatePreferredAppleDevice(device: AppleDevice | string): Promise<void> {
    const id = appleDeviceIdOf(device)
    await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateAppleDevice', params: { id } })
  }

  /**
   * Maximizes the given window, resizing it to fill the display's visible area (excluding the menu bar and Dock)
   * and centering it on that display.
   *
   * Requires Accessibility Control permission (see {@link getAccessibilityControlAccess}).
   *
   * @remarks
   * Rejects if the window cannot be maximized — typically because Accessibility permission is missing,
   * the target display cannot be found, or the window is minimized or closed.
   *
   * @param window - The window to maximize, either a {@link Window} or its {@link Window.id}.
   * @param options.display - The display to maximize onto, either a {@link Display} or its {@link Display.id}. Defaults to the window's current display.
   * @group Window Control
   */
  async maximizeWindow(window: Window | number, options?: { display?: Display | number }): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowMaximize', params: { window: windowIdOf(window), display: displayIdOf(options?.display) } })
  }

  /**
   * Resizes the given window to the given size (in points), keeping it centered on its display.
   *
   * Requires Accessibility Control permission (see {@link getAccessibilityControlAccess}).
   *
   * @remarks
   * The requested size is clipped to the display's visible frame if it would be larger. After resizing,
   * the window is re-centered so that a window which could not shrink/grow to the requested size still
   * ends up centered. Rejects if Accessibility permission is missing, the target display cannot be found,
   * or the window is minimized, closed, or does not support resizing.
   *
   * @param window - The window to resize, either a {@link Window} or its {@link Window.id}.
   * @param size - The new size in points.
   * @param options.display - The display to center on, either a {@link Display} or its {@link Display.id}. Defaults to the window's current display.
   * @group Window Control
   */
  async resizeWindow(window: Window | number, size: Size, options?: { display?: Display | number }): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowResize', params: { window: windowIdOf(window), width: size.width, height: size.height, display: displayIdOf(options?.display) } })
  }

  /**
   * Centers the given window within the visible area (excluding the menu bar and Dock) of its display,
   * keeping its current size.
   *
   * Requires Accessibility Control permission (see {@link getAccessibilityControlAccess}).
   *
   * @remarks
   * Rejects if Accessibility permission is missing, the target display cannot be found, or the window is
   * minimized, closed, or does not support moving.
   *
   * @param window - The window to center, either a {@link Window} or its {@link Window.id}.
   * @param options.display - The display to center on, either a {@link Display} or its {@link Display.id}. Defaults to the window's current display.
   * @group Window Control
   */
  async centerWindow(window: Window | number, options?: { display?: Display | number }): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowCenter', params: { window: windowIdOf(window), display: displayIdOf(options?.display) } })
  }

  /**
   * Moves the given window so its top-left corner is at the given position (in points, top-left origin).
   *
   * Requires Accessibility Control permission (see {@link getAccessibilityControlAccess}).
   *
   * @remarks
   * Rejects if Accessibility permission is missing, or the window is minimized, closed, or does not
   * support moving.
   *
   * @param window - The window to move, either a {@link Window} or its {@link Window.id}.
   * @param position - The new top-left origin for the window, in points (top-left coordinate space).
   * @group Window Control
   */
  async moveWindow(window: Window | number, position: { x: number, y: number }): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowMove', params: { window: windowIdOf(window), x: position.x, y: position.y } })
  }

  /**
   * Selects the camera's active capture format that best matches the given dimensions (in pixels).
   *
   * Use this when you want the camera to deliver a specific resolution — typically before recording or
   * before showing a live preview, so the preview renders at the intended resolution. The format stays
   * in effect until something else changes it.
   *
   * The chosen format is the smallest format whose dimensions are ≥ the target, preferring biplanar YUV
   * pixel formats, and falling back to the largest available format if nothing meets the target.
   *
   * @remarks
   * Rejects if the camera is unavailable, has no usable video format, or its configuration is locked by
   * another process.
   *
   * @param camera - The camera to configure, either a {@link Camera} or its {@link Camera.id}.
   * @param dimensions - Target dimensions in pixels.
   * @group Device Control
   */
  async setCameraActiveFormat(camera: Camera | string, dimensions: Size): Promise<void> {
    await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'cameraSetActiveFormat', params: { camera: cameraIdOf(camera), width: dimensions.width, height: dimensions.height } })
  }

  /**
   * Returns the camera capture format that {@link setCameraActiveFormat} would select for the given
   * dimensions (in pixels), without applying it. Returns `undefined` if the camera has no suitable format.
   *
   * @group Device Control
   */
  async getCameraBestFormat(camera: Camera | string, dimensions: Size): Promise<CameraFormat | undefined> {
    return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'cameraBestFormat', params: { camera: cameraIdOf(camera), width: dimensions.width, height: dimensions.height } }) as CameraFormat | undefined
  }

  /**
   * Returns the icon of the given running application as a `data:image/png;base64,...` URL,
   * usable directly as the `src` of an HTML `<img>` tag.
   *
   * @group Device Control
   */
  async getApplicationIcon(application: RunningApplication | number): Promise<string> {
    const id = applicationIdOf(application)
    const result = await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getApplicationIcon', params: { application: id } }) as { icon: string }
    return result.icon
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
  async getSystemAudioRecordingAccess(options?: { backend?: SystemAudioPermissionBackend }): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({
      type: 'AuthorizationStatus',
      action: 'getSystemAudioRecordingAccess',
      params: {
        backend: options?.backend ?? 'default'
      }
    }) as boolean
  }

  /**
   * Probes whether system audio can actually be recorded with the given backend by attempting a short silent capture.
   *
   * Unlike {@link getSystemAudioRecordingAccess}, which reads the recorded permission state, this verifies the
   * permission is truly usable, immediately detecting cases where the OS reports a permission as granted but
   * capture would still fail (e.g. after the user revokes it).
   *
   * @remarks If the permission state is still undetermined, this may trigger the system audio permission prompt.
   * @group Permissions
   */
  async probeSystemAudioRecordingAccess(options?: { backend?: SystemAudioPermissionBackend }): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({
      type: 'AuthorizationStatus',
      action: 'probeSystemAudioRecordingAccess',
      params: {
        backend: options?.backend ?? 'default'
      }
    }) as boolean
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
   * Permission path depends on the selected backend:
   * - `default` and `coreAudio`: system audio capture permission
   * - `screenCaptureKit`: Screen Recording permission
   * - `_beta_coreAudio`: deprecated alias for `coreAudio`
   *
   * For the `screenCaptureKit` backend the user must restart the app before the granted permission
   * becomes active. The `default` and `coreAudio` backends return the live granted/denied result
   * with no restart required (macOS 14.2+).
   *
   * @returns Boolean value that indicates whether the user granted or denied access to your app.
   * @group Permissions
   */
  async requestSystemAudioRecordingAccess(options?: { backend?: SystemAudioPermissionBackend }): Promise<boolean> {
    return await this.ipcRecordKit.nsrpc.perform({
      type: 'AuthorizationStatus',
      action: 'requestSystemAudioRecordingAccess',
      params: {
        backend: options?.backend ?? 'default'
      }
    }) as boolean
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

  /**
   * Creates a {@link Recorder} for the given schema.
   *
   * The schema describes what to record (its `items`, e.g. a webcam, display, microphone or system audio),
   * where to write the resulting RecordKit bundle (`output_directory`), and optional session-wide
   * {@link RecorderSettings}. Call {@link Recorder.prepare} then {@link Recorder.start} on the returned recorder.
   *
   * @remarks The given `schema` is consumed: device/window objects in its `items` are replaced by their IDs and
   * any callbacks are registered internally. Pass a fresh schema object per call rather than reusing one.
   *
   * @group Recording
   */
  async createRecorder(
    schema: {
      output_directory?: string
      items: RecorderSchemaItem[]
      settings?: RecorderSettings
    }): Promise<Recorder> {
    return Recorder.newInstance(this.ipcRecordKit.nsrpc, schema);
  }
}

/**
 * Typed event overloads for {@link RecordKit}. Declaration-merges with the class so that
 * `recordkit.on('log', message => …)` receives a typed {@link LogMessage} instead of `any`.
 *
 * @group Logging
 */
export interface RecordKit {
  /** Fires for every log message emitted by RecordKit. See {@link LogMessage}. */
  on(event: 'log', listener: (message: LogMessage) => void): this;
  /** @see {@link RecordKit.on} */
  once(event: 'log', listener: (message: LogMessage) => void): this;
  /** @see {@link RecordKit.on} */
  off(event: 'log', listener: (message: LogMessage) => void): this;
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
 * Backend selector used for backend-aware system audio permission checks and requests.
 *
 * @group Permissions
 */
export type SystemAudioPermissionBackend = 'default' | SystemAudioBackend

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

  /** Indicates whether this is a virtual camera (e.g. provided by software rather than physical hardware). */
  isVirtual: boolean;

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
 * A camera capture format, as returned by {@link RecordKit.getCameraBestFormat}.
 *
 * @group Discovery
 */
export interface CameraFormat {
  /** Width of the format, in pixels. */
  width: number
  /** Height of the format, in pixels. */
  height: number
  /** Highest frame rate supported by this format, in frames per second. */
  maxFrameRate: number
}

/**
 * A microphone whose audio can be recorded.
 * 
 * @group Discovery
 */
export interface Microphone {
  /** An identifier that uniquely identifies the microphone. */
  id: string;

  /** Indicates whether this is a virtual microphone (e.g. provided by software rather than physical hardware). */
  isVirtual: boolean;

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

  /** SF Symbol name representing this display (e.g. `laptopcomputer`, `display`), suitable for use in the UI. */
  symbolName: string;

  /** Frame of the display, relative to the main display. Uses top-left coordinate space. */
  frame: Bounds

  /** Visible frame of the display (excluding the menu bar and Dock), relative to the main display. Top-left coordinate space. */
  visibleFrame?: Bounds

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
 * The user's preferred device IDs for each source type, ordered most-preferred first.
 *
 * @group Preferred Devices
 */
export interface UserPreferred {
  /** Preferred microphone IDs (matching {@link Microphone.id}), most-preferred first. */
  microphoneIDs: string[]
  /** Preferred camera IDs (matching {@link Camera.id}), most-preferred first. */
  cameraIDs: string[]
  /** Preferred display IDs (matching {@link Display.id}), most-preferred first. */
  displayIDs: number[]
  /** Preferred Apple device IDs (matching {@link AppleDevice.id}), most-preferred first. */
  appleDeviceIDs: string[]
}

/**
 * @group Logging
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical'

/**
 * A structured log message emitted by RecordKit, delivered as the payload of the `'log'` event.
 *
 * @example
 * ```ts
 * recordkit.on('log', (message) => {
 *   if (message.level === 'error') myLogger.error(message.category, message.message, message.metadata)
 * })
 * ```
 *
 * @group Logging
 */
export interface LogMessage {
  /** Time the message was logged, in milliseconds since the Unix epoch. Use `new Date(timestamp)` to get a `Date`. */
  timestamp: number
  /** Severity level of the message. */
  level: LogLevel
  /** Category the message belongs to (e.g. the subsystem that emitted it). */
  category: string
  /** The log message text. */
  message: string
  /** Additional structured key/value metadata attached to the message. */
  metadata: Record<string, string>
  /** Pre-formatted, human-readable representation of the message (timestamp, level, category, message and metadata). */
  formattedMessage: string
}
