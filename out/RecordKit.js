import { IpcRecordKit } from "./IpcRecordKit.js";
import { Recorder } from "./Recorder.js";
import { EventEmitter } from "events";
import { existsSync } from "node:fs";
/** @internal */
function windowIdOf(window) {
    return typeof window == 'number' ? window : window.id;
}
/** @internal */
function displayIdOf(display) {
    return display == null ? undefined : (typeof display == 'number' ? display : display.id);
}
/** @internal */
function cameraIdOf(camera) {
    return typeof camera == 'string' ? camera : camera.id;
}
/** @internal */
function microphoneIdOf(microphone) {
    return typeof microphone == 'string' ? microphone : microphone.id;
}
/** @internal */
function appleDeviceIdOf(device) {
    return typeof device == 'string' ? device : device.id;
}
/** @internal */
function applicationIdOf(application) {
    return typeof application == 'number' ? application : application.id;
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
    ipcRecordKit = new IpcRecordKit();
    /** @ignore */
    constructor() {
        super();
    }
    /**
     * Initialize the RecordKit SDK.
     *
     * ⚠️ Must be called before calling any other RecordKit method.
     *
     * @param args
     */
    async initialize(args) {
        let rpcBinaryPath = args.rpcBinaryPath;
        if (args.fallbackToNodeModules ?? true) {
            if (!existsSync(rpcBinaryPath)) {
                rpcBinaryPath = rpcBinaryPath.replace('node_modules/electron/dist/Electron.app/Contents/Resources', 'node_modules/@nonstrict/recordkit/bin');
                console.error(`RecordKit: [RPC] !! Falling back to RPC binary from node_modules at ${rpcBinaryPath}`);
            }
        }
        await this.ipcRecordKit.initialize(rpcBinaryPath, args.logRpcMessages);
        const logHandlerInstance = this.ipcRecordKit.nsrpc.registerClosure({
            handler: (params) => {
                const message = params;
                console.log('RecordKit:', message.formattedMessage);
                this.emit('log', message);
            },
            prefix: 'RecordKit.logHandler',
            lifecycle: this
        });
        await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogHandler', params: { logHandlerInstance } });
        if (args.logLevel) {
            await this.setLogLevel(args.logLevel);
        }
    }
    /**
     * Set the global log level. Defaults to `debug`.
     *
     * Messages with a lower level than this will be ignored and not passed to any log handlers.
     *
     * @group Logging
     */
    async setLogLevel(logLevel) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogLevel', params: { logLevel } });
    }
    /**
     * Overrides the global log level for a specific category. Defaults to the global log level.
     *
     * Messages in the given category with a lower level than this will be ignored and not passed to any log handlers.
     *
     * @group Logging
     */
    async setCategoryLogLevel(params) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Logger', action: 'setLogLevel', params });
    }
    /**
     * A list of Mac displays that can be used for screen recording.
     *
     * @group Discovery
     */
    async getDisplays() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getDisplays' });
    }
    /**
     * A list of macOS windows that can be used for screen recording.
     *
     * @group Discovery
     */
    async getWindows() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getWindows' });
    }
    /**
     * A list of cameras that are connected to the system.
     *
     * @param params.includeDeskView - Whether to include Desk View cameras in the results
     * @group Discovery
     */
    async getCameras(params) {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getCameras', params: { includeDeskView: params?.includeDeskView ?? false } });
    }
    /**
     * A list of microphones that are connected to the system.
     *
     * @group Discovery
     */
    async getMicrophones() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getMicrophones' });
    }
    /**
     * A list of iOS devices that are connected to the system.
     *
     * @group Discovery
     */
    async getAppleDevices() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getAppleDevices' });
    }
    /**
     * A list of currently running applications that can be used for screen or audio recording.
     *
     * @group Discovery
     */
    async getRunningApplications() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getRunningApplications' });
    }
    /**
     * The user's preferred devices for each source type, ordered most-preferred first.
     *
     * RecordKit remembers which devices the user last recorded with (unless disabled via the recorder's
     * `updatesUserPreferred` setting). Use this to pre-select a sensible default device in your UI.
     *
     * @group Preferred Devices
     */
    async getUserPreferred() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'getPreferred' });
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
    async updatePreferredMicrophone(microphone) {
        const id = microphoneIdOf(microphone);
        await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateMicrophone', params: { id } });
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
    async updatePreferredCamera(camera) {
        const id = cameraIdOf(camera);
        await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateCamera', params: { id } });
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
    async updatePreferredDisplay(display) {
        const id = displayIdOf(display);
        await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateDisplay', params: { id } });
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
    async updatePreferredAppleDevice(device) {
        const id = appleDeviceIdOf(device);
        await this.ipcRecordKit.nsrpc.perform({ type: 'UserPreferred', action: 'updateAppleDevice', params: { id } });
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
    async maximizeWindow(window, options) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowMaximize', params: { window: windowIdOf(window), display: displayIdOf(options?.display) } });
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
    async resizeWindow(window, size, options) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowResize', params: { window: windowIdOf(window), width: size.width, height: size.height, display: displayIdOf(options?.display) } });
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
    async centerWindow(window, options) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowCenter', params: { window: windowIdOf(window), display: displayIdOf(options?.display) } });
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
    async moveWindow(window, position) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'windowMove', params: { window: windowIdOf(window), x: position.x, y: position.y } });
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
    async setCameraActiveFormat(camera, dimensions) {
        await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'cameraSetActiveFormat', params: { camera: cameraIdOf(camera), width: dimensions.width, height: dimensions.height } });
    }
    /**
     * Returns the camera capture format that {@link setCameraActiveFormat} would select for the given
     * dimensions (in pixels), without applying it. Returns `undefined` if the camera has no suitable format.
     *
     * @group Device Control
     */
    async getCameraBestFormat(camera, dimensions) {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'cameraBestFormat', params: { camera: cameraIdOf(camera), width: dimensions.width, height: dimensions.height } });
    }
    /**
     * Returns the icon of the given running application as a `data:image/png;base64,...` URL,
     * usable directly as the `src` of an HTML `<img>` tag.
     *
     * @group Device Control
     */
    async getApplicationIcon(application) {
        const id = applicationIdOf(application);
        const result = await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getApplicationIcon', params: { application: id } });
        return result.icon;
    }
    /**
     * Indicates if camera can be used.
     *
     * Authorization status that indicates whether the user grants the app permission to capture video.
     *
     * @group Permissions
     */
    async getCameraAuthorizationStatus() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getCameraAuthorizationStatus' });
    }
    /**
     * Indicates if microphone can be used.
     *
     * Authorization status that indicates whether the user grants the app permission to capture audio.
     *
     * @group Permissions
     */
    async getMicrophoneAuthorizationStatus() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getMicrophoneAuthorizationStatus' });
    }
    /**
     * Indicates if screen can be recorded.
     *
     * @group Permissions
     */
    async getScreenRecordingAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getScreenRecordingAccess' });
    }
    /**
     * Indicates if system audio can be recorded.
     *
     * @group Permissions
     */
    async getSystemAudioRecordingAccess(options) {
        return await this.ipcRecordKit.nsrpc.perform({
            type: 'AuthorizationStatus',
            action: 'getSystemAudioRecordingAccess',
            params: {
                backend: options?.backend ?? 'default'
            }
        });
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
    async probeSystemAudioRecordingAccess(options) {
        return await this.ipcRecordKit.nsrpc.perform({
            type: 'AuthorizationStatus',
            action: 'probeSystemAudioRecordingAccess',
            params: {
                backend: options?.backend ?? 'default'
            }
        });
    }
    /**
     * Indicates if keystroke events of other apps can be recorded via Input Monitoring.
     *
     * @group Permissions
     */
    async getInputMonitoringAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getInputMonitoringAccess' });
    }
    /**
     * Indicates if other apps can be controlled via Accessibility.
     *
     * @group Permissions
     */
    async getAccessibilityControlAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getAccessibilityControlAccess' });
    }
    /**
     * Requests the user's permission to allow the app to capture the camera.
     *
     * Prompts the users if this is the first time requesting access, otherwise immediately returns.
     *
     * @returns Boolean value that indicates whether the user granted or denied access to your app.
     * @group Permissions
     */
    async requestCameraAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestCameraAccess' });
    }
    /**
     * Requests the user's permission to allow the app to capture the microphone.
     *
     * Prompts the users if this is the first time requesting access, otherwise immediately returns.
     *
     * @returns Boolean value that indicates whether the user granted or denied access to your app.
     * @group Permissions
     */
    async requestMicrophoneAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestMicrophoneAccess' });
    }
    /**
     * Requests the user's permission to allow the app to capture the screen.
     *
     * Afterwards, the users needs to restart this app, for the permission to become active in the app.
     *
     * @group Permissions
     */
    async requestScreenRecordingAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestScreenRecordingAccess' });
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
    async requestSystemAudioRecordingAccess(options) {
        return await this.ipcRecordKit.nsrpc.perform({
            type: 'AuthorizationStatus',
            action: 'requestSystemAudioRecordingAccess',
            params: {
                backend: options?.backend ?? 'default'
            }
        });
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
    async requestInputMonitoringAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestInputMonitoringAccess' });
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
    async requestAccessibilityControlAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestAccessibilityControlAccess' });
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
    async createRecorder(schema) {
        return Recorder.newInstance(this.ipcRecordKit.nsrpc, schema);
    }
}
/** @ignore */
export let recordkit = new RecordKit();
//# sourceMappingURL=RecordKit.js.map