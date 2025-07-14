import { randomUUID } from "crypto";
import { EventEmitter } from "stream";
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
//# sourceMappingURL=Recorder.js.map