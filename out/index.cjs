'use strict';

var node_child_process = require('node:child_process');
var readline = require('readline');
var crypto = require('crypto');
var stream = require('stream');
var node_fs = require('node:fs');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var readline__namespace = /*#__PURE__*/_interopNamespaceDefault(readline);

const finalizationRegistry = new FinalizationRegistry(async (destructor) => { await destructor(); });

class NSRPC {
    logMessages = false;
    send;
    responseHandlers = new Map();
    closureTargets = new Map();
    constructor(send) {
        this.send = send;
    }
    receive(data) {
        // TODO: For now we just assume the message is a valid NSRPC message, but we should:
        // - Check if the nsrpc property is set to a number in the range of 1..<2
        // - Validate the message against the defined interfaces above
        let message;
        try {
            if (this.logMessages) {
                console.log("RecordKit: [RPC] <", data.trimEnd());
            }
            message = JSON.parse(data);
        }
        catch (error) {
            if (this.logMessages) {
                console.error("RecordKit: [RPC] !! Above message is invalid JSON, will be ignored.");
            }
            return;
        }
        if ("status" in message) {
            // This is a response, dispatch it so it can be handled
            const responseHandler = this.responseHandlers.get(message.id);
            this.responseHandlers.delete(message.id);
            if (responseHandler === undefined) {
                console.error("RecordKit: [RPC] !! Got a response for an unknown request.", message.id);
                return;
            }
            if ("error" in message) {
                responseHandler.reject(message.error);
            }
            else {
                responseHandler.resolve(message.result);
            }
        }
        else {
            // This is a request
            const responseBody = this.handleRequest(message);
            if (responseBody !== undefined) {
                this.sendResponse(message.id, responseBody);
            }
        }
    }
    /* Sending helpers */
    sendMessage(message) {
        const stringMessage = JSON.stringify(message);
        if (this.logMessages) {
            console.log("RecordKit: [RPC] >", stringMessage);
        }
        this.send(stringMessage);
    }
    sendResponse(id, response) {
        if (id === undefined) {
            return;
        }
        this.sendMessage({ ...response, nsrpc: 1, id });
    }
    async sendRequest(request) {
        const id = "req_" + crypto.randomUUID();
        const response = new Promise((resolve, reject) => {
            this.responseHandlers.set(id, { resolve, reject });
        });
        this.sendMessage({ ...request, nsrpc: 1, id });
        return response;
    }
    /* Request handling */
    handleRequest(request) {
        switch (request.procedure) {
            case "init":
                return {
                    status: 501,
                    error: {
                        debugDescription: "Init procedure not implemented.",
                        userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                    },
                };
            case "perform":
                if ("action" in request) {
                    return {
                        status: 501,
                        error: {
                            debugDescription: "Perform procedure for (static) methods not implemented.",
                            userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                        },
                    };
                }
                else {
                    return this.handleClosureRequest(request);
                }
            case "release":
                return {
                    status: 501,
                    error: {
                        debugDescription: "Release procedure not implemented.",
                        userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                    },
                };
        }
    }
    handleClosureRequest(request) {
        const handler = this.closureTargets.get(request.target);
        if (handler === undefined) {
            return {
                status: 404,
                error: {
                    debugDescription: `Perform target '${request.target}' not found.`,
                    userMessage: "Failed to communicate with external process. (Target not found)",
                },
            };
        }
        try {
            const rawresult = handler(request.params ?? {});
            const result = rawresult === undefined ? undefined : rawresult;
            return {
                status: 200,
                result,
            };
        }
        catch (error) {
            return {
                status: 202,
                // TODO: Would be good to have an error type that we can throw that fills these fields more specifically. (But for now it doesn't matter since this is just communicated back the the CLI and not to the user.)
                error: {
                    debugDescription: `${error}`,
                    userMessage: "Handler failed to perform request.",
                    underlyingError: error,
                },
            };
        }
    }
    /* Perform remote procedures */
    async initialize(args) {
        const target = args.target;
        finalizationRegistry.register(args.lifecycle, async () => {
            await this.release(target);
        });
        await this.sendRequest({
            target: args.target,
            type: args.type,
            params: args.params,
            procedure: "init",
        });
    }
    async perform(body) {
        return await this.sendRequest({
            ...body,
            procedure: "perform",
        });
    }
    async release(target) {
        await this.sendRequest({
            procedure: "release",
            target,
        });
    }
    async manualRelease(target) {
        await this.sendRequest({
            procedure: "manual-release",
            target,
        });
    }
    /* Register locally available targets/actions */
    registerClosure(options) {
        const target = `target_${options.prefix}_${crypto.randomUUID()}`;
        this.closureTargets.set(target, options.handler);
        finalizationRegistry.register(options.lifecycle, () => {
            this.closureTargets.delete(target);
        });
        return target;
    }
}

class IpcRecordKit {
    childProcess;
    nsrpc;
    constructor() {
        this.nsrpc = new NSRPC((message) => this.write(message));
    }
    async initialize(recordKitRpcPath, logMessages = false) {
        if (this.childProcess !== undefined) {
            throw new Error('RecordKit: [RPC] Already initialized.');
        }
        this.nsrpc.logMessages = logMessages;
        this.childProcess = await new Promise((resolve, reject) => {
            const childProcess = node_child_process.spawn(recordKitRpcPath, { stdio: ['pipe', 'pipe', logMessages ? 'pipe' : 'ignore'] });
            childProcess.on('close', (code, signal) => { console.error(`RecordKit: [RPC] Closed with code ${code} and signal ${signal}`); });
            childProcess.on('error', (error) => { reject(error); });
            childProcess.on('exit', (code, signal) => { console.error(`RecordKit: [RPC] Exited with code ${code} and signal ${signal}`); });
            childProcess.on('spawn', () => { resolve(childProcess); });
        });
        const { stdout, stderr } = this.childProcess;
        if (!stdout) {
            throw new Error('RecordKit: [RPC] !! No stdout stream on child process.');
        }
        readline__namespace.createInterface({ input: stdout }).on('line', (line) => {
            this.nsrpc.receive(line);
        });
        if (stderr) {
            readline__namespace.createInterface({ input: stderr }).on('line', (line) => {
                console.log(`RecordKit: [RPC] Lognoise on stderr: ${line}`);
            });
        }
    }
    write(message) {
        const stdin = this.childProcess?.stdin;
        if (!stdin) {
            throw new Error('RecordKit: [RPC] !! Missing stdin stream.');
        }
        stdin.write(message + "\n");
    }
}

/**
 * @group Recording
 */
class Recorder extends stream.EventEmitter {
    rpc;
    target;
    /** @ignore */
    static async newInstance(rpc, schema) {
        const target = 'Recorder_' + crypto.randomUUID();
        const object = new Recorder(rpc, target);
        schema.items.forEach(item => {
            if (item.type == 'webcam') {
                if (typeof item.camera != 'string') {
                    item.camera = item.camera.id;
                }
                if (typeof item.microphone != 'string') {
                    item.microphone = item.microphone.id;
                }
            }
            if (item.type == 'display') {
                if (typeof item.display != 'number') {
                    item.display = item.display.id;
                }
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'Display.onSegment',
                        lifecycle: object
                    });
                }
            }
            if (item.type == 'windowBasedCrop') {
                if (typeof item.window != 'number') {
                    item.window = item.window.id;
                }
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'Window.onSegment',
                        lifecycle: object
                    });
                }
            }
            if (item.type == 'appleDeviceStaticOrientation') {
                if (typeof item.device != 'string') {
                    item.device = item.device.id;
                }
            }
        });
        const weakRefObject = new WeakRef(object);
        const onAbortInstance = rpc.registerClosure({
            handler: (params) => { weakRefObject.deref()?.emit('abort', params.reason); },
            prefix: 'Recorder.onAbort',
            lifecycle: object
        });
        await rpc.initialize({
            target,
            type: 'Recorder',
            params: { schema, onAbortInstance },
            lifecycle: object
        });
        return object;
    }
    /** @ignore */
    constructor(rpc, target) {
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
    async stop() {
        return await this.rpc.perform({ target: this.target, action: 'stop' });
    }
    async cancel() {
        await this.rpc.manualRelease(this.target);
    }
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
 * Log what's going on to the console for easy debugging and troubleshooting.
 */
class RecordKit {
    ipcRecordKit = new IpcRecordKit();
    /** @ignore */
    constructor() { }
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
            if (!node_fs.existsSync(rpcBinaryPath)) {
                rpcBinaryPath = rpcBinaryPath.replace('node_modules/electron/dist/Electron.app/Contents/Resources', 'node_modules/@nonstrict/recordkit/bin');
                console.error(`RecordKit: [RPC] !! Falling back to RPC binary from node_modules at ${rpcBinaryPath}`);
            }
        }
        await this.ipcRecordKit.initialize(rpcBinaryPath, args.logRpcMessages);
        const logHandlerInstance = this.ipcRecordKit.nsrpc.registerClosure({
            handler: (params) => { console.log('RecordKit:', params.formattedMessage); },
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
let recordkit = new RecordKit();

exports.recordkit = recordkit;
//# sourceMappingURL=index.cjs.map
