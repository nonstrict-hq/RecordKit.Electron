import { Recorder, RecorderSchemaItem } from "./Recorder.js";
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
export declare class RecordKit {
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
     * @group Discovery
     */
    getWindows(): Promise<Window[]>;
    /**
     * @group Discovery
     */
    getCameras(): Promise<Camera[]>;
    /**
     * @group Discovery
     */
    getMicrophones(): Promise<Microphone[]>;
    /**
     * @group Discovery
     */
    getAppleDevices(): Promise<AppleDevice[]>;
    /**
     * @group Permissions
     */
    getCameraAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * @group Permissions
     */
    getMicrophoneAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * @group Permissions
     */
    getScreenRecordingAccess(): Promise<boolean>;
    /**
     * @group Permissions
     */
    requestCameraAccess(): Promise<boolean>;
    /**
     * @group Permissions
     */
    requestMicrophoneAccess(): Promise<boolean>;
    /**
     * @group Permissions
     */
    requestScreenRecordingAccess(): Promise<void>;
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
 * @group Discovery
 */
export interface AppleDevice {
    id: string;
    name: string;
    model_id?: string;
    availability: 'available' | 'notPaired' | 'notConnected' | 'pairedNeedsConnect' | 'pairedNeedsReconnect';
}
/**
 * @group Discovery
 */
export interface Camera {
    id: string;
    name: string;
    model_id: string;
    manufacturer: string;
    availability: 'available' | 'lidClosed' | 'unknownSuspended';
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
    availability: 'available' | 'lidClosed' | 'unknownSuspended' | 'notConnected';
}
/**
 * @group Discovery
 */
export interface Window {
    id: number;
    title?: string;
    frame: Bounds;
    level: number;
    application_process_id?: number;
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
