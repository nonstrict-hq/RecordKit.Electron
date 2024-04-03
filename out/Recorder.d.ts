/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "stream";
import { AppleDevice, Camera, Microphone, Window } from "./RecordKit.js";
/**
 * @group Recording
 */
export declare class Recorder extends EventEmitter {
    private readonly rpc;
    private readonly target;
    /** @ignore */
    static newInstance(rpc: NSRPC, schema: RecorderSchema): Promise<Recorder>;
    /** @ignore */
    constructor(rpc: NSRPC, target: string);
    prepare(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<RecordingResult>;
}
/**
 * @group Recording
 */
export interface RecorderSchema {
    output_directory?: string;
    items: RecorderSchemaItem[];
}
/**
 * @group Recording
 */
export type RecorderSchemaItem = WebcamSchema | WindowBasedCropSchema | iPhonePortraitSchema;
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
export interface WindowBasedCropSchema {
    type: 'windowBasedCrop';
    filename?: string;
    window: Window | number;
    shows_cursor?: boolean;
    mouse_events?: boolean;
}
/**
 * @group Recording Schemas
 */
export interface iPhonePortraitSchema {
    type: 'iPhonePortrait';
    filename?: string;
    device: AppleDevice | string;
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
        type: 'screen' | 'webcam' | 'mouse' | 'appleDevice';
        filename: string;
    }[];
}
