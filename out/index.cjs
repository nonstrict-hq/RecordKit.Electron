'use strict';

var node_child_process = require('node:child_process');
var readline = require('readline');
var crypto = require('crypto');
var events = require('events');
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
    terminationError;
    constructor(send) {
        this.send = send;
    }
    /**
     * Marks the RPC connection as permanently gone, e.g. because the external process exited.
     *
     * All in-flight requests are rejected with the given error and any future request fails
     * immediately with the same error, instead of waiting forever for a response that can no
     * longer arrive.
     */
    terminate(error) {
        this.terminationError = error;
        const pendingHandlers = [...this.responseHandlers.values()];
        this.responseHandlers.clear();
        for (const handler of pendingHandlers) {
            handler.reject(error);
        }
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
        if (this.terminationError !== undefined) {
            throw this.terminationError;
        }
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
        await this.sendRequest({
            target: args.target,
            type: args.type,
            params: args.params,
            procedure: "init",
        });
        // Register the GC release only after a successful init; registering earlier would later send a
        // release for a target the external process never knew about.
        const target = args.target;
        finalizationRegistry.register(args.lifecycle, () => {
            // Swallow rejections: the external process may already be gone, in which case there is
            // nothing left to release.
            this.release(target).catch(() => { });
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
        this.childProcess.on('close', (code, signal) => {
            // No response can arrive anymore; fail all in-flight and future requests instead of letting
            // them hang forever.
            this.nsrpc.terminate(new Error(`RecordKit: [RPC] Process is gone (closed with code ${code} and signal ${signal}).`));
        });
        this.childProcess.stdin?.on('error', (error) => {
            // Without an error listener, a failed write to a dead process would crash Node with an
            // unhandled 'error' event. The 'close' handler above already fails all requests.
            console.error(`RecordKit: [RPC] !! Failed to write to RPC process: ${error}`);
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
        if (stdin.destroyed) {
            throw new Error('RecordKit: [RPC] !! Process is gone, cannot write to its stdin.');
        }
        stdin.write(message + "\n");
    }
}

/**
 * Converts RPC audio buffer data to AudioStreamBuffer format
 * @internal
 */
function convertRPCParamsToAudioStreamBuffer(params) {
    try {
        // params is the AudioBufferData directly from Swift
        const rawAudioBuffer = params;
        if (!rawAudioBuffer || !Array.isArray(rawAudioBuffer.channelData)) {
            console.error('RecordKit: Invalid audio buffer received from RPC');
            return null;
        }
        const channelData = [];
        for (const base64Data of rawAudioBuffer.channelData) {
            if (typeof base64Data !== 'string') {
                console.error('RecordKit: Invalid base64 data received');
                return null;
            }
            // Decode base64 to binary data
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            // Convert bytes to Float32Array
            const float32Array = new Float32Array(bytes.buffer);
            channelData.push(float32Array);
        }
        const audioStreamBuffer = {
            sampleRate: rawAudioBuffer.sampleRate,
            numberOfChannels: rawAudioBuffer.numberOfChannels,
            numberOfFrames: rawAudioBuffer.numberOfFrames,
            channelData: channelData
        };
        return audioStreamBuffer;
    }
    catch (error) {
        console.error('RecordKit: Error processing audio stream buffer:', error);
        return null;
    }
}
/**
 * Registers the per-segment callback of a {@link JSONOutputOptions} (if any) as an RPC closure,
 * replacing the function with the closure target so the options object can be serialized.
 * @internal
 */
function registerJSONOutputSegmentCallback(output, rpc, object, prefix) {
    if (output && output.output == 'segmented' && output.segmentCallback) {
        const segmentHandler = output.segmentCallback;
        output.segmentCallback = rpc.registerClosure({
            handler: (params) => { segmentHandler(params.path); },
            prefix,
            lifecycle: object
        });
    }
}
/**
 * @group Recording
 */
class Recorder extends events.EventEmitter {
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
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'Webcam.onSegment',
                        lifecycle: object
                    });
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
                registerJSONOutputSegmentCallback(item.inputEventsOutput, rpc, object, 'Display.onInputEventsSegment');
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
                registerJSONOutputSegmentCallback(item.inputEventsOutput, rpc, object, 'WindowBasedCrop.onInputEventsSegment');
            }
            if (item.type == 'desktopIndependentWindow') {
                if (typeof item.window != 'number') {
                    item.window = item.window.id;
                }
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'DesktopIndependentWindow.onSegment',
                        lifecycle: object
                    });
                }
                registerJSONOutputSegmentCallback(item.inputEventsOutput, rpc, object, 'DesktopIndependentWindow.onInputEventsSegment');
            }
            if (item.type == 'appleDeviceStaticOrientation') {
                if (typeof item.device != 'string') {
                    item.device = item.device.id;
                }
            }
            if (item.type == 'appleDevice') {
                if (typeof item.device != 'string') {
                    item.device = item.device.id;
                }
            }
            if (item.type == 'systemAudio') {
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'SystemAudio.onSegment',
                        lifecycle: object
                    });
                }
                if (item.output == 'stream' && item.streamCallback) {
                    const streamHandler = item.streamCallback;
                    item.streamCallback = rpc.registerClosure({
                        handler: (params) => {
                            const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
                            if (audioBuffer) {
                                streamHandler(audioBuffer);
                            }
                        },
                        prefix: 'SystemAudioStream.onAudioBuffer',
                        lifecycle: object
                    });
                }
            }
            if (item.type == 'applicationAudio') {
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'ApplicationAudio.onSegment',
                        lifecycle: object
                    });
                }
                if (item.output == 'stream' && item.streamCallback) {
                    const streamHandler = item.streamCallback;
                    item.streamCallback = rpc.registerClosure({
                        handler: (params) => {
                            const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
                            if (audioBuffer) {
                                streamHandler(audioBuffer);
                            }
                        },
                        prefix: 'ApplicationAudioStream.onAudioBuffer',
                        lifecycle: object
                    });
                }
            }
            if (item.type == 'microphone') {
                if (typeof item.microphone != 'string') {
                    item.microphone = item.microphone.id;
                }
                if (item.output == 'segmented' && item.segmentCallback) {
                    const segmentHandler = item.segmentCallback;
                    item.segmentCallback = rpc.registerClosure({
                        handler: (params) => { segmentHandler(params.path); },
                        prefix: 'Microphone.onSegment',
                        lifecycle: object
                    });
                }
                if (item.output == 'stream' && item.streamCallback) {
                    const streamHandler = item.streamCallback;
                    item.streamCallback = rpc.registerClosure({
                        handler: (params) => {
                            const audioBuffer = convertRPCParamsToAudioStreamBuffer(params);
                            if (audioBuffer) {
                                streamHandler(audioBuffer);
                            }
                        },
                        prefix: 'MicrophoneStream.onAudioBuffer',
                        lifecycle: object
                    });
                }
            }
        });
        const weakRefObject = new WeakRef(object);
        const onAbortInstance = rpc.registerClosure({
            handler: (params) => { weakRefObject.deref()?.emit('abort', params); },
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
    /**
     * Prepares the recording session for instant recording, allocating resources and validating the
     * configuration.
     *
     * Preparing ahead of time lets {@link start} begin recording instantly; without it, starting incurs
     * a setup delay.
     *
     * @returns The expected {@link BundleInfo} describing the file assets that will be produced by this
     * recording, allowing you to inspect the planned output (filenames, asset types, sizes) before
     * recording starts.
     */
    async prepare() {
        return await this.rpc.perform({ target: this.target, action: 'prepare' });
    }
    /**
     * Starts recording. If the session was not already {@link prepare}d this performs setup first,
     * incurring a short delay; call {@link prepare} ahead of time to start instantly.
     */
    async start() {
        await this.rpc.perform({ target: this.target, action: 'start' });
    }
    /**
     * Pauses the recording. The capture hardware remains active so recording can be resumed quickly.
     *
     * Call {@link resume} to continue recording, or {@link stop} to finish.
     */
    async pause() {
        await this.rpc.perform({ target: this.target, action: 'pause' });
    }
    /**
     * Resumes a recording that was previously paused with {@link pause}.
     */
    async resume() {
        await this.rpc.perform({ target: this.target, action: 'resume' });
    }
    /**
     * Stops the recording, finalizes the output files, and returns the {@link RecordingResult}
     * describing the completed bundle. The recorder cannot be reused after stopping.
     *
     * @remarks Known limitation: when the recording failed, the returned promise rejects with the
     * failure but the partial recording result is not available over the RPC bridge (the Swift API
     * surfaces it as `PartialResultError`). Any partially-written files do remain on disk in the
     * bundle inside the schema's `output_directory`.
     */
    async stop() {
        return await this.rpc.perform({ target: this.target, action: 'stop' });
    }
    /**
     * Cancels the recording and releases its resources without finalizing output. Use this to discard
     * an in-progress or prepared recording; call {@link stop} instead to keep the result.
     */
    async cancel() {
        await this.rpc.manualRelease(this.target);
    }
}

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
class RecordKit extends events.EventEmitter {
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
            if (!node_fs.existsSync(rpcBinaryPath)) {
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
let recordkit = new RecordKit();

// Error code types mirroring RecordKit's `RKError` / `RKError.Code` Swift enum, JSON-for-JSON, as
// surfaced over the RPC bridge. `RecordKitError.code` carries the Swift case name (from
// `RKError.Code.description`) and `RecordKitError.codeNumber` the corresponding `Int` raw value;
// user-facing text is on `RecordKitError.message`, technical detail on `RecordKitError.debugDescription`.
// See the RecordKitErrorCode docs below and https://recordkit.dev/guides/logging-and-errors#error-handling
/**
 * Mapping from each {@link RecordKitErrorCode} name to its numeric raw value.
 *
 * The numbers correspond to the `Int` raw values of the Swift `RKError.Code`
 * enum and to the `RecordKitError.codeNumber` reported over RPC.
 *
 * @group Recording
 */
const RECORDKIT_ERROR_CODE_NUMBERS = {
    // Configuration Errors
    invalidLicense: -1001,
    invalidConfiguration: -1002,
    // Permission Errors
    microphonePermissionRequired: -1101,
    cameraPermissionRequired: -1102,
    screenRecordingPermissionRequired: -1103,
    systemAudioPermissionRequired: -1104,
    // Device Availability Errors
    microphoneUnavailable: -1201,
    cameraUnavailable: -1202,
    displayUnavailable: -1203,
    windowUnavailable: -1204,
    systemAudioUnavailable: -1205,
    appleDeviceUnavailable: -1206,
    inputRecordingUnavailable: -1207,
    // Recording State Errors
    noVideoFramesReceived: -1301,
    noAudioSamplesReceived: -1302,
    screenCaptureStoppedLowDiskSpace: -1303,
    screenCaptureStoppedWithError: -1304,
    screenCaptureStoppedWithoutError: -1305,
    // Internal Errors
    internalError: -1600,
    uncaughtError: -1601,
    internalConductorError: -1602,
    configurationFailed: -1603,
    configurationNotSupported: -1604,
    audioFormatError: -1605,
    videoFormatError: -1606,
    audioFormatConfigurationFailed: -1607,
    videoFormatConfigurationFailed: -1608,
    mediaFormatInitializationFailed: -1609,
    mediaFormatConfigurationFailed: -1610,
    audioDeviceInitializationFailed: -1611,
    audioDeviceConfigurationFailed: -1612,
    assetWriterFailed: -1613,
    tccUnavailableError: -1614,
    // Processing/Operation Errors
    audioProcessingFailed: -1701,
    audioBufferProcessingFailed: -1702,
    audioBufferCreationFailed: -1703,
    inputEventProcessingFailed: -1704,
    assetWriterCreationFailed: -1705,
    fileOperationFailed: -1706,
    windowOperationFailed: -1707,
};

/**
 * Named macOS window levels, mirroring RecordKit's `RKWindow.Level` Swift type.
 *
 * A {@link Window}'s `level` is a raw integer. macOS assigns windows to a small set of well-known
 * levels; this map lets you compare a window's level against those named values, e.g.
 *
 * ```ts
 * if (window.level === WINDOW_LEVELS.floating) { ... }
 * if (window.level >= WINDOW_LEVELS.mainMenu) { ... } // at or above the menu bar
 * ```
 *
 * Levels are `Comparable` in Swift: a higher number is drawn in front of a lower one. Some names
 * share the same numeric value (e.g. `floating`, `submenu`, `tornOffMenu` are all `3`).
 *
 * @group Discovery
 */
const WINDOW_LEVELS = {
    baseWindow: -2147483648,
    minimumWindow: -2147483643,
    desktopWindow: -2147483623,
    desktopIconWindow: -2147483603,
    backstopMenu: -20,
    normal: 0,
    floating: 3,
    submenu: 3,
    tornOffMenu: 3,
    modalPanel: 8,
    utilityWindow: 19,
    mainMenu: 24,
    statusBar: 25,
    popUpMenu: 101,
    overlayWindow: 102,
    helpWindow: 200,
    draggingWindow: 500,
    screenSaver: 1000,
    screenSaverWindow: 1000,
    assistiveTechHighWindow: 1500,
    cursorWindow: 2147483630,
    maximumWindow: 2147483631,
};

/**
 * Creates a Web Audio API AudioBuffer from a RecordKit AudioStreamBuffer.
 *
 * This utility converts RecordKit's streaming audio format to the standard Web Audio API format,
 * handling various edge cases and IPC serialization issues that may occur in Electron environments.
 *
 * @param audioStreamBuffer - The RecordKit AudioStreamBuffer to convert
 * @param audioContext - The Web Audio API AudioContext to use for buffer creation
 * @returns The created AudioBuffer, or null if conversion failed
 *
 * @example
 * ```typescript
 * import { createWebAudioBuffer } from '@nonstrict/recordkit';
 *
 * // In your stream callback
 * const streamCallback = (audioBuffer: AudioStreamBuffer) => {
 *   const audioContext = new AudioContext();
 *   const webAudioBuffer = createWebAudioBuffer(audioBuffer, audioContext);
 *
 *   if (webAudioBuffer) {
 *     // Use the buffer with Web Audio API
 *     const source = audioContext.createBufferSource();
 *     source.buffer = webAudioBuffer;
 *     source.connect(audioContext.destination);
 *     source.start();
 *   }
 * };
 * ```
 */
function createWebAudioBuffer(audioStreamBuffer, audioContext) {
    // Input validation
    if (!audioStreamBuffer || typeof audioStreamBuffer !== 'object') {
        return null;
    }
    if (!audioContext || typeof audioContext.createBuffer !== 'function') {
        return null;
    }
    try {
        const { sampleRate, numberOfChannels, numberOfFrames, channelData } = audioStreamBuffer;
        // Validate required properties
        if (typeof sampleRate !== 'number' || sampleRate <= 0 || sampleRate > 192000) {
            return null;
        }
        if (typeof numberOfChannels !== 'number' || numberOfChannels <= 0 || numberOfChannels > 32) {
            return null;
        }
        if (typeof numberOfFrames !== 'number' || numberOfFrames <= 0 || numberOfFrames > 1048576) {
            return null;
        }
        if (!Array.isArray(channelData) || channelData.length !== numberOfChannels) {
            return null;
        }
        // Validate channel data arrays
        for (let i = 0; i < numberOfChannels; i++) {
            const channel = channelData[i];
            if (!channel || (!Array.isArray(channel) && !(channel instanceof Float32Array))) {
                return null;
            }
            // Check length matches expected frame count
            if (channel.length !== numberOfFrames) {
                return null;
            }
        }
        // Create Web Audio AudioBuffer
        const audioBuffer = audioContext.createBuffer(numberOfChannels, numberOfFrames, sampleRate);
        // Copy channel data to AudioBuffer
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const outputArray = audioBuffer.getChannelData(channel);
            const inputArray = channelData[channel];
            // Handle both Float32Array and regular arrays (from Electron IPC serialization)
            if (inputArray instanceof Float32Array) {
                // Direct copy for Float32Array
                outputArray.set(inputArray);
            }
            else if (Array.isArray(inputArray)) {
                // Convert regular array to Float32Array for better performance
                const float32Array = new Float32Array(inputArray);
                outputArray.set(float32Array);
            }
            else {
                // Fallback: manual copy with type conversion
                for (let i = 0; i < numberOfFrames; i++) {
                    const sample = inputArray[i];
                    outputArray[i] = typeof sample === 'number' && isFinite(sample) ? sample : 0;
                }
            }
        }
        return audioBuffer;
    }
    catch (error) {
        // Return null for any conversion failures - don't throw in streaming contexts
        return null;
    }
}
/**
 * Computes RMS and peak audio levels from an {@link AudioStreamBuffer}, for rendering a microphone (or
 * system-audio) level meter.
 *
 * Electron has no dedicated microphone-preview component; the supported way to render a live level meter
 * is to use a microphone/system-audio `stream` output and call this helper in your `streamCallback`.
 *
 * @example
 * ```typescript
 * import { computeAudioLevel } from '@nonstrict/recordkit';
 *
 * const streamCallback = (audioBuffer) => {
 *   const { peakDb } = computeAudioLevel(audioBuffer);
 *   meterElement.style.height = `${Math.max(0, 100 + peakDb)}%`; // -100 dB..0 dB -> 0%..100%
 * };
 * ```
 *
 * @group Recording
 */
function computeAudioLevel(audioStreamBuffer) {
    let sumSquares = 0;
    let peak = 0;
    let count = 0;
    for (const channel of audioStreamBuffer.channelData) {
        for (let i = 0; i < channel.length; i++) {
            const sample = channel[i];
            sumSquares += sample * sample;
            const abs = Math.abs(sample);
            if (abs > peak)
                peak = abs;
            count++;
        }
    }
    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    const toDb = (value) => value > 0 ? 20 * Math.log10(value) : -Infinity;
    return { rms, peak, rmsDb: toDb(rms), peakDb: toDb(peak) };
}

exports.RECORDKIT_ERROR_CODE_NUMBERS = RECORDKIT_ERROR_CODE_NUMBERS;
exports.WINDOW_LEVELS = WINDOW_LEVELS;
exports.computeAudioLevel = computeAudioLevel;
exports.createWebAudioBuffer = createWebAudioBuffer;
exports.recordkit = recordkit;
//# sourceMappingURL=index.cjs.map
