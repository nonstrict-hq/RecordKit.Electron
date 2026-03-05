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
export type WebcamSchema = {
    type: 'webcam';
    camera: Camera | string;
    microphone: Microphone | string;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    preserveActiveCameraConfiguration?: boolean;
    leftAudioChannelOnly?: boolean;
    audioDelay?: number;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'webcam';
    camera: Camera | string;
    microphone: Microphone | string;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    preserveActiveCameraConfiguration?: boolean;
    leftAudioChannelOnly?: boolean;
    audioDelay?: number;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
};
/**
 * Creates a recorder item for recording a single display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type DisplaySchema = {
    type: 'display';
    display: Display | number;
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    include_audio?: boolean;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'display';
    display: Display | number;
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
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
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    output?: 'singleFile';
    filename?: string;
} | {
    type: 'windowBasedCrop';
    window: Window | number;
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
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
 * Video codec for screen recording.
 * - `h264`: H.264/AVC codec - most compatible, works on all devices.
 * - `hevc`: H.265/HEVC codec - smaller file sizes, requires newer devices for playback.
 *
 * @group Recording Schemas
 */
export type VideoCodec = 'h264' | 'hevc';
/**
 * Color space for screen recording.
 * - `sRGB`: Standard RGB color space, compatible with all modern displays.
 * - `displayP3`: Display P3 color space, used in high-end Apple displays for wide gamut colors.
 *
 * Note: Display P3 is only supported with HEVC codec. If Display P3 is requested with H.264,
 * it will automatically fall back to sRGB.
 *
 * @group Recording Schemas
 */
export type ColorSpace = 'sRGB' | 'displayP3';
/**
 * @group Recording Schemas
 */
export type SystemAudioMode = 'exclude' | 'include';
/**
 * Enumeration specifying the backend to use for system audio recording.
 *
 * - `screenCaptureKit`: Use ScreenCaptureKit for system audio recording.
 * - `_beta_coreAudio`: This is a beta feature, not fully tested yet. Do not use in production. Supports single-file and segmented output in M4A/AAC format. Streaming output is not yet supported.
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
    /** Called with real-time audio buffer data compatible with Web Audio API. */
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
    /** Called with real-time audio buffer data compatible with Web Audio API. */
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
    /** Called with real-time audio buffer data compatible with Web Audio API. */
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
/**
 * Errors produced by RecordKit include user-friendly messages suitable for display in your UI.
 *
 * See the [Logging and Error Handling guide](https://recordkit.dev/guides/logging-and-errors#error-handling) for more information.
 */
export interface RecordKitError {
    name: "RecordKitError";
    /** Error code, used for grouping related errors */
    code: string;
    /** Error code number */
    codeNumber: number;
    /** Message describing the problem and possible recovery options, intended to be shown directly to the end-user. */
    message: string;
    /** Detailed technical description of this error, used in debugging */
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
