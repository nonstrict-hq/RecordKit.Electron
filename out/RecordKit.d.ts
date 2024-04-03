import { Recorder, RecorderSchema } from "./Recorder.js";
/**
 * Entry point for the RecordKit SDK, an instance is available as `recordkit` that can be imported from the module. Do not instantiate this class directly.
 *
 * @groupDescription Discovery
 * Discover the windows and devices that are available to record.
 *
 * @groupDescription Permissions
 * Check and request the apps permission to access the recording devices.
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
        /** @ignore */
        logRpcMessages?: boolean;
    }): Promise<void>;
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
    createRecorder(schema: RecorderSchema): Promise<Recorder>;
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
    availability: 'available';
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
}
/**
 * @group Discovery
 */
export interface Microphone {
    id: string;
    name: string;
    model_id: string;
    manufacturer: string;
    availability: 'available' | 'lidClosed' | 'unknownSuspended';
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
