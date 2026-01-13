/// <reference types="node" resolution-mode="require"/>
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "events";
import { AppleDevice, Camera, Display, Microphone, Window } from "./RecordKit.js";
/**
 * @group Recording
 */
export declare class Recorder extends EventEmitter {
    private readonly rpc;
    private readonly target;
    /** @ignore */
    static newInstance(rpc: NSRPC, schema: {
        output_directory?: string;
        items: RecorderSchemaItem[];
        settings?: {
            allowFrameReordering?: boolean;
        };
    }): Promise<Recorder>;
    /** @ignore */
    constructor(rpc: NSRPC, target: string);
    prepare(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<RecordingResult>;
    cancel(): Promise<void>;
}
/**
 * @group Recording
 */
export type RecorderSchemaItem = WebcamSchema | DisplaySchema | WindowBasedCropSchema | AppleDeviceStaticOrientationSchema | SystemAudioSchema | ApplicationAudioSchema | MicrophoneSchema;
/**
 * Creates a recorder item for a webcam movie file, using the provided microphone and camera. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export interface WebcamSchema {
    type: 'webcam';
    filename?: string;
    camera: Camera | string;
    microphone: Microphone | string;
    preserveActiveCameraConfiguration?: boolean;
    leftAudioChannelOnly?: boolean;
    audioDelay?: number;
}
/**
 * Creates a recorder item for recording a single display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type DisplaySchema = {
    type: 'display';
    display: Display | number;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    include_audio?: boolean;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'display';
    display: Display | number;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    include_audio?: boolean;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
};
/**
 * Creates a recorder item for recording the initial crop of a window on a display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type WindowBasedCropSchema = {
    type: 'windowBasedCrop';
    window: Window | number;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'windowBasedCrop';
    window: Window | number;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
};
/**
 * Creates a recorder item for an Apple device screen recording, using the provided deviceID. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export interface AppleDeviceStaticOrientationSchema {
    type: 'appleDeviceStaticOrientation';
    filename?: string;
    device: AppleDevice | string;
}
/**
 * @group Recording Schemas
 */
export type SystemAudioMode = 'exclude' | 'include';
/**
 * Enumeration specifying the backend to use for system audio recording.
 *
 * - `screenCaptureKit`: Use ScreenCaptureKit for system audio recording.
 * - `_beta_coreAudio`: This a beta feature, it is not fully implemented yet. Do not use in production. Currently only records single files in .caf format.
 *
 * @group Recording Schemas
 */
export type SystemAudioBackend = 'screenCaptureKit' | '_beta_coreAudio';
/**
 * @group Recording Schemas
 */
export type AudioOutputOptionsType = 'singleFile' | 'segmented' | 'stream';
/**
 * @group Recording Schemas
 */
export type MicrophoneOutputOptionsType = 'singleFile' | 'segmented' | 'stream';
/**
 * Creates a recorder item for recording system audio. By default current process audio is excluded. Output is stored in a RecordKit bundle.
 *
 * When using `mode: 'exclude'`, all system audio is recorded except for excluded applications.
 * When using `mode: 'include'`, only audio from specified applications is recorded.
 *
 * @group Recording Schemas
 */
export type SystemAudioSchema = {
    type: 'systemAudio';
    mode: 'exclude';
    backend?: SystemAudioBackend;
    excludeOptions?: ('currentProcess')[];
    excludedProcessIDs?: number[];
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'systemAudio';
    mode: 'exclude';
    backend?: SystemAudioBackend;
    excludeOptions?: ('currentProcess')[];
    excludedProcessIDs?: number[];
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
} | {
    type: 'systemAudio';
    mode: 'exclude';
    backend?: SystemAudioBackend;
    excludeOptions?: ('currentProcess')[];
    excludedProcessIDs?: number[];
    output: 'stream';
    /** Called with real-time audio buffer data compatible with Web Audio API. Requires _beta_coreAudio backend and macOS 14.2+ */
    streamCallback?: (audioBuffer: AudioStreamBuffer) => void;
} | {
    type: 'systemAudio';
    mode: 'include';
    backend?: SystemAudioBackend;
    includedApplicationIDs?: number[];
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'systemAudio';
    mode: 'include';
    backend?: SystemAudioBackend;
    includedApplicationIDs?: number[];
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
} | {
    type: 'systemAudio';
    mode: 'include';
    backend?: SystemAudioBackend;
    includedApplicationIDs?: number[];
    output: 'stream';
    /** Called with real-time audio buffer data compatible with Web Audio API. Requires _beta_coreAudio backend and macOS 14.2+ */
    streamCallback?: (audioBuffer: AudioStreamBuffer) => void;
};
/**
 * Creates a recorder item for recording the audio of a single application. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type ApplicationAudioSchema = {
    type: 'applicationAudio';
    applicationID: number;
    backend?: SystemAudioBackend;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'applicationAudio';
    applicationID: number;
    backend?: SystemAudioBackend;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
} | {
    type: 'applicationAudio';
    applicationID: number;
    backend?: SystemAudioBackend;
    output: 'stream';
    /** Called with real-time audio buffer data compatible with Web Audio API. Requires _beta_coreAudio backend and macOS 14.2+ */
    streamCallback?: (audioBuffer: AudioStreamBuffer) => void;
};
/**
 * Creates a recorder item for an audio file, using the provided microphone. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type MicrophoneSchema = {
    type: 'microphone';
    microphone: Microphone | string;
    leftChannelOnly?: boolean;
    audioDelay?: number;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'microphone';
    microphone: Microphone | string;
    leftChannelOnly?: boolean;
    audioDelay?: number;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
} | {
    type: 'microphone';
    microphone: Microphone | string;
    output: 'stream';
    /** Called with real-time audio buffer data compatible with Web Audio API */
    streamCallback?: (audioBuffer: AudioStreamBuffer) => void;
};
/**
 * Audio buffer compatible with Web Audio API
 *
 * @group Recording
 */
export interface AudioStreamBuffer {
    /** Sample rate in Hz (e.g., 44100, 48000) */
    sampleRate: number;
    /** Number of audio channels */
    numberOfChannels: number;
    /** Number of frames per channel */
    numberOfFrames: number;
    /** Non-interleaved Float32 audio data - one array per channel */
    channelData: Float32Array[];
}
/**
 * @group Recording
 */
export type AbortReason = {
    reason: 'userStopped';
    result: RecordingResult;
} | {
    reason: 'interrupted';
    result: RecordingResult;
    error: any;
} | {
    reason: 'failed';
    error: any;
};
/**
 * @group Recording
 */
export interface RecordingResult {
    url: string;
    info: BundleInfo;
}
export interface RecordKitError {
    name: "RecordKitError";
    code: string;
    codeNumber: number;
    message: string;
    debugDescription: string;
}
/**
 * @group Recording
 */
export interface BundleInfo {
    version: 1;
    files: {
        type: 'screen' | 'webcam' | 'audio' | 'mouse' | 'systemAudio' | 'appleDevice' | 'topWindow';
        filename: string;
    }[];
}
