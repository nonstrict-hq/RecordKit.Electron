import { IpcRecordKit } from "./IpcRecordKit.js";
import { Recorder } from "./Recorder.js";
import { EventEmitter } from "stream";
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
                console.log('RecordKit:', params.formattedMessage);
                this.emit('log', params);
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
     * @group Discovery
     */
    async getDisplays() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getDisplays' });
    }
    /**
     * @group Discovery
     */
    async getWindows() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getWindows' });
    }
    /**
     * @group Discovery
     */
    async getCameras() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getCameras' });
    }
    /**
     * @group Discovery
     */
    async getMicrophones() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getMicrophones' });
    }
    /**
     * @group Discovery
     */
    async getAppleDevices() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'Recorder', action: 'getAppleDevices' });
    }
    /**
     * @group Permissions
     */
    async getCameraAuthorizationStatus() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getCameraAuthorizationStatus' });
    }
    /**
     * @group Permissions
     */
    async getMicrophoneAuthorizationStatus() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getMicrophoneAuthorizationStatus' });
    }
    /**
     * @group Permissions
     */
    async getScreenRecordingAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'getScreenRecordingAccess' });
    }
    /**
     * @group Permissions
     */
    async requestCameraAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestCameraAccess' });
    }
    /**
     * @group Permissions
     */
    async requestMicrophoneAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestMicrophoneAccess' });
    }
    /**
     * @group Permissions
     */
    async requestScreenRecordingAccess() {
        return await this.ipcRecordKit.nsrpc.perform({ type: 'AuthorizationStatus', action: 'requestScreenRecordingAccess' });
    }
    async createRecorder(schema) {
        return Recorder.newInstance(this.ipcRecordKit.nsrpc, schema);
    }
}
/** @ignore */
export let recordkit = new RecordKit();
//# sourceMappingURL=RecordKit.js.map