/// <reference types="node" resolution-mode="require"/>
import { Recorder, RecorderSchemaItem } from "./Recorder.js";
import { EventEmitter } from "events";
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
export declare class RecordKit extends EventEmitter {
    private ipcRecordKit;
    /** @ignore */
    constructor();
    /**
     * Initialize the RecordKit SDK.
     *
     * ⚠️ Must be called before calling any other RecordKit method.
     *
     * @param args
     */
    initialize(args: {
        /**
         * Path to the `recordkit-rpc` binary, most of the time this should be set to `path.join(process.resourcesPath, 'recordkit-rpc')`.
         */
        rpcBinaryPath: string;
        /**
         * Whether to fallback to the RPC binary from `node_modules` if the given path does not exist. When enabled an extra check to see if the given path exists is performed. Most of the time this should be set to `!app.isPackaged`.
         */
        fallbackToNodeModules?: boolean;
        /**
         * Set the global log level. Defaults to `debug`.
         *
         * This is the same as calling `setLogLevel` right after initialization.
         */
        logLevel?: LogLevel;
        /** @ignore */
        logRpcMessages?: boolean;
    }): Promise<void>;
    /**
     * Set the global log level. Defaults to `debug`.
     *
     * Messages with a lower level than this will be ignored and not passed to any log handlers.
     *
     * @group Logging
     */
    setLogLevel(logLevel: LogLevel): Promise<void>;
    /**
     * Overrides the global log level for a specific category. Defaults to the global log level.
     *
     * Messages in the given category with a lower level than this will be ignored and not passed to any log handlers.
     *
     * @group Logging
     */
    setCategoryLogLevel(params: {
        category: string;
        logLevel?: LogLevel;
    }): Promise<void>;
    /**
     * A list of Mac displays that can be used for screen recording.
     *
     * @group Discovery
     */
    getDisplays(): Promise<Display[]>;
    /**
     * A list of macOS windows that can be used for screen recording.
     *
     * @group Discovery
     */
    getWindows(): Promise<Window[]>;
    /**
     * A list of cameras that are connected to the system.
     *
     * @param params.includeDeskView - Whether to include Desk View cameras in the results
     * @group Discovery
     */
    getCameras(params?: {
        includeDeskView?: boolean;
    }): Promise<Camera[]>;
    /**
     * A list of microphones that are connected to the system.
     *
     * @group Discovery
     */
    getMicrophones(): Promise<Microphone[]>;
    /**
     * A list of iOS devices that are connected to the system.
     *
     * @group Discovery
     */
    getAppleDevices(): Promise<AppleDevice[]>;
    /**
     * A list of currently running applications that can be used for screen or audio recording.
     *
     * @group Discovery
     */
    getRunningApplications(): Promise<RunningApplication[]>;
    /**
     * Indicates if camera can be used.
     *
     * Authorization status that indicates whether the user grants the app permission to capture video.
     *
     * @group Permissions
     */
    getCameraAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * Indicates if microphone can be used.
     *
     * Authorization status that indicates whether the user grants the app permission to capture audio.
     *
     * @group Permissions
     */
    getMicrophoneAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * Indicates if screen can be recorded.
     *
     * @group Permissions
     */
    getScreenRecordingAccess(): Promise<boolean>;
    /**
     * Indicates if system audio can be recorded.
     *
     * @group Permissions
     */
    getSystemAudioRecordingAccess(): Promise<boolean>;
    /**
     * Indicates if keystroke events of other apps can be recorded via Input Monitoring.
     *
     * @group Permissions
     */
    getInputMonitoringAccess(): Promise<boolean>;
    /**
     * Indicates if other apps can be controlled via Accessibility.
     *
     * @group Permissions
     */
    getAccessibilityControlAccess(): Promise<boolean>;
    /**
     * Requests the user's permission to allow the app to capture the camera.
     *
     * Prompts the users if this is the first time requesting access, otherwise immediately returns.
     *
     * @returns Boolean value that indicates whether the user granted or denied access to your app.
     * @group Permissions
     */
    requestCameraAccess(): Promise<boolean>;
    /**
     * Requests the user's permission to allow the app to capture the microphone.
     *
     * Prompts the users if this is the first time requesting access, otherwise immediately returns.
     *
     * @returns Boolean value that indicates whether the user granted or denied access to your app.
     * @group Permissions
     */
    requestMicrophoneAccess(): Promise<boolean>;
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
    requestScreenRecordingAccess(): Promise<void>;
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
    requestSystemAudioRecordingAccess(): Promise<void>;
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
    requestInputMonitoringAccess(): Promise<void>;
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
    requestAccessibilityControlAccess(): Promise<void>;
    createRecorder(schema: {
        output_directory?: string;
        items: RecorderSchemaItem[];
        settings?: {
            allowFrameReordering?: boolean;
        };
    }): Promise<Recorder>;
}
/** @ignore */
export declare let recordkit: RecordKit;
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
export type AuthorizationStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';
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
    availability: 'available' | 'notPaired' | 'notConnected' | 'pairedNeedsConnect' | 'pairedNeedsReconnect';
}
/**
 * A running macOS application of which windows or audio can be recorded.
 *
 * @group Discovery
 */
export interface RunningApplication {
    /** Identifier for this application (process id). */
    id: number;
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
    availability: 'available' | 'notRunning';
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
    availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected';
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
    availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected';
}
/**
 * A Mac display that can be used for screen recording.
 *
 * @group Discovery
 */
export interface Display {
    /** An identifier that uniquely identifies this Mac display (CGDirectDisplayID). */
    id: number;
    /** Name of this display. */
    localizedName?: string;
    /** Frame of the display, relative to the main display. Uses top-left coordinate space. */
    frame: Bounds;
    /** Indicates if this is the main display. */
    isMain: boolean;
    /**
     * The current availability state of this display.
     *
     * - `available`: A display can be recorded
     * - `lidClosed`: A display cannot be recorded, because the MacBook lid is closed (recovery: "Open MacBook lid")
     * - `notConnected`: A display cannot be screen recorded, because it is currently not connected (recovery: "Connect display")
     */
    availability: 'available' | 'lidClosed' | 'notConnected';
}
/**
 * A macOS window that can be used for screen recording.
 *
 * @group Discovery
 */
export interface Window {
    /** An identifier that uniquely identifies this macOS window (CGWindowID). */
    id: number;
    /** Title of the window. */
    title?: string;
    /** Frame of the window, relative to the main display. Uses top-left coordinate space. */
    frame: Bounds;
    /**
     * The level of the window relative to other windows.
     */
    level: number;
    /** Process ID of the application that owns this window. */
    application_process_id?: number;
    /** Name of the application that owns this window. */
    application_name?: string;
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
export type LogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical';
