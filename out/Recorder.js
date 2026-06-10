import { randomUUID } from "crypto";
import { EventEmitter } from "events";
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
export class Recorder extends EventEmitter {
    rpc;
    target;
    /** @ignore */
    static async newInstance(rpc, schema) {
        const target = 'Recorder_' + randomUUID();
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
//# sourceMappingURL=Recorder.js.map