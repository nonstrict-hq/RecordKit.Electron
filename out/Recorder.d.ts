/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "stream";
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
export type RecorderSchemaItem = WebcamSchema | DisplaySchema | WindowBasedCropSchema | AppleDeviceStaticOrientationSchema | SystemAudioSchema | ApplicationAudioSchema;
/**
 * @group Recording Schemas
 */
export interface WebcamSchema {
    type: 'webcam';
    filename?: string;
    camera: Camera | string;
    microphone: Microphone | string;
}
/**
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
 * @group Recording Schemas
 */
export type SystemAudioBackend = 'screenCaptureKit' | '_beta_coreAudio';
/**
 * @group Recording Schemas
 */
export type AudioOutputOptionsType = 'singleFile' | 'segmented';
/**
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
};
/**
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
};
/**
 * @group Recording
 */
export type AbortReason = {
    reason: 'userStopped';
    result: RecordingResult;
} | {
    reason: 'interrupted';
    result: RecordingResult;
    error: RecordKitError;
} | {
    reason: 'failed';
    error: RecordKitError;
};
/**
 * @group Recording
 */
export interface RecordingResult {
    url: string;
    info: BundleInfo;
}
export interface RecordKitError {
    message?: string;
    error_group: string;
    debug_description: string;
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
