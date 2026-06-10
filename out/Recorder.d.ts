/// <reference types="node" resolution-mode="require"/>
import { NSRPC } from "./NonstrictRPC.js";
import { EventEmitter } from "events";
import { AppleDevice, Bounds, Camera, Display, Microphone, Window } from "./RecordKit.js";
import type { RecordKitErrorCode } from "./Errors.js";
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
        settings?: RecorderSettings;
    }): Promise<Recorder>;
    /** @ignore */
    constructor(rpc: NSRPC, target: string);
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
    prepare(): Promise<BundleInfo>;
    /**
     * Starts recording. If the session was not already {@link prepare}d this performs setup first,
     * incurring a short delay; call {@link prepare} ahead of time to start instantly.
     */
    start(): Promise<void>;
    /**
     * Pauses the recording. The capture hardware remains active so recording can be resumed quickly.
     *
     * Call {@link resume} to continue recording, or {@link stop} to finish.
     */
    pause(): Promise<void>;
    /**
     * Resumes a recording that was previously paused with {@link pause}.
     */
    resume(): Promise<void>;
    /**
     * Stops the recording, finalizes the output files, and returns the {@link RecordingResult}
     * describing the completed bundle. The recorder cannot be reused after stopping.
     *
     * @remarks Known limitation: when the recording failed, the returned promise rejects with the
     * failure but the partial recording result is not available over the RPC bridge (the Swift API
     * surfaces it as `PartialResultError`). Any partially-written files do remain on disk in the
     * bundle inside the schema's `output_directory`.
     */
    stop(): Promise<RecordingResult>;
    /**
     * Cancels the recording and releases its resources without finalizing output. Use this to discard
     * an in-progress or prepared recording; call {@link stop} instead to keep the result.
     */
    cancel(): Promise<void>;
}
/**
 * Typed event overloads for {@link Recorder}. Declaration-merges with the class so that
 * `recorder.on('abort', reason => …)` receives a typed {@link AbortReason} instead of `any`.
 *
 * @group Recording
 */
export interface Recorder {
    /** Fires when the recording is aborted by an error or a system interruption. */
    on(event: 'abort', listener: (reason: AbortReason) => void): this;
    /** @see {@link Recorder.on} */
    once(event: 'abort', listener: (reason: AbortReason) => void): this;
    /** @see {@link Recorder.on} */
    off(event: 'abort', listener: (reason: AbortReason) => void): this;
    /** @see {@link Recorder.on} */
    emit(event: 'abort', reason: AbortReason): boolean;
}
/**
 * Settings that apply to the whole recording session.
 *
 * @group Recording
 */
export interface RecorderSettings {
    /**
     * Specifies if RecordKit is allowed to do frame reordering in video files. Defaults to `true`.
     *
     * When enabled, to achieve the best compression some video encoders can reorder frames and
     * generate B-frames.
     */
    allowFrameReordering?: boolean;
    /**
     * Whether a successful recording updates the user's preferred devices for the sources it used.
     * Defaults to `true`.
     *
     * When enabled, starting a recording sets the devices in the schema as the user's preferred
     * devices (for the device types that support this).
     */
    updatesUserPreferred?: boolean;
    /** Target duration, in whole seconds, of each audio segment when using segmented output. Defaults to `6`. Fractional values are not supported. */
    audioSegmentDuration?: number;
    /** Target duration, in whole seconds, of each video segment when using segmented output. Defaults to `2`. Fractional values are not supported. */
    videoSegmentDuration?: number;
    /**
     * Maximum interval, in seconds, between keyframes in the video stream. Defaults to no forced
     * interval.
     *
     * When set, the encoder places a keyframe at least every this many seconds. The frame-count based
     * maximum keyframe interval is computed automatically from the video frame rate. When omitted, the
     * encoder uses its default keyframe-placement heuristic.
     */
    keyframeIntervalDuration?: number;
}
/**
 * @group Recording
 */
export type RecorderSchemaItem = WebcamSchema | DisplaySchema | WindowBasedCropSchema | DesktopIndependentWindowSchema | AppleDeviceStaticOrientationSchema | AppleDeviceSchema | SystemAudioSchema | ApplicationAudioSchema | MicrophoneSchema;
/**
 * A width/height pair. The unit (pixels or points) depends on the consuming API — see the
 * documentation of the specific method or option that takes this value.
 *
 * @group Recording Schemas
 */
export interface Size {
    width: number;
    height: number;
}
/**
 * Content that can be excluded from a screen recording.
 *
 * - `currentProcess`: Exclude the windows of the process hosting the recorder from the recording.
 * - `screenRecordingIndicator`: Exclude the orange screen-recording indicator from the recording.
 *
 * @remarks From Electron the process hosting the recorder is the bundled `recordkit-rpc` helper,
 * not your app — so `currentProcess` does not exclude your app's own windows. To exclude those,
 * pass your process IDs (e.g. `process.pid`) via the schema item's `excludedProcessIDs`.
 *
 * @group Recording Schemas
 */
export type ScreenRecordingExcludeOption = 'currentProcess' | 'screenRecordingIndicator';
/**
 * Output configuration for JSON sidecar files such as the mouse/keyboard input-event log.
 *
 * - `singleFile`: Write all events to a single JSON file (optionally named via `filename`).
 * - `segmented`: Write events to multiple segmented JSON files; `segmentCallback` is invoked with the
 *   path of each segment as it is written to disk.
 *
 * @group Recording Schemas
 */
export type JSONOutputOptions = {
    output?: 'singleFile';
    filename?: string;
} | {
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
};
interface WebcamSchemaBase {
    type: 'webcam';
    /** The camera to record, either a {@link Camera} or its `id`. */
    camera: Camera | string;
    /** The microphone to record alongside the camera, either a {@link Microphone} or its `id`. */
    microphone: Microphone | string;
    /** Caps the output video to at most these dimensions (in pixels), preserving aspect ratio. */
    maxVideoDimensions?: Size;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    /**
     * When `true`, leaves the camera's active format/configuration untouched instead of letting
     * RecordKit reconfigure the device for the requested recording. Defaults to `false`.
     */
    preserveActiveCameraConfiguration?: boolean;
    /** Record only the left channel of the microphone (useful for mono lavalier mics). Defaults to `false`. */
    leftAudioChannelOnly?: boolean;
    /** Delay applied to the microphone audio relative to the video, in seconds, to correct lip-sync. Defaults to `0`. */
    audioDelay?: number;
    /** Echo cancellation applied to the microphone audio. Defaults to `'off'`. */
    echoCancellation?: EchoCancellation;
    /** Background blur applied to the camera video. Defaults to `'off'`. */
    backgroundBlur?: BackgroundBlur;
}
/**
 * Creates a recorder item for a webcam movie file, using the provided microphone and camera. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type WebcamSchema = (WebcamSchemaBase & {
    output?: 'singleFile';
    filename?: string;
}) | (WebcamSchemaBase & {
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
});
/**
 * Acoustic echo cancellation applied to microphone audio. Captures system/playback audio via Core
 * Audio process taps and removes it from the microphone signal in real time using WebRTC AEC3.
 *
 * - `'off'`: No echo cancellation (default).
 * - `'aggressive'`: Maximum echo removal at the cost of speech quality — aggressive suppression,
 *   high-pass filter, and residual echo gate at 16 kHz. Optimized for speech-to-text pipelines where
 *   echo removal matters more than audio fidelity.
 * - `'balanced'`: Balanced echo removal that preserves speech quality — balanced suppression with
 *   high-pass filter but no residual echo gate at 48 kHz. Optimized for recording pipelines where
 *   audio fidelity is more important than pure echo removal.
 * - An object for full control over the AEC3 configuration; omitted fields default to the `'balanced'`
 *   preset.
 *
 * @remarks Requires macOS 14.2 or later (Core Audio process taps). On older versions, preparing the
 * recorder fails with a `configurationNotSupported` error.
 *
 * @group Recording Schemas
 */
export type EchoCancellation = 'off' | 'aggressive' | 'balanced' | {
    /**
     * Sample rate the echo canceller runs at, in Hz. Defaults to `48000`. 16 kHz is sufficient for
     * speech-to-text; 48 kHz preserves full audio fidelity.
     */
    sampleRate?: 16000 | 32000 | 48000;
    /**
     * Echo suppression mode. Defaults to `'balanced'`.
     *
     * - `'balanced'`: Conservative suppression that allows AEC3's transparent mode (passes audio
     *   through unchanged when no echo is detected) and protects near-end speech during double-talk.
     *   Best where speech naturalness matters.
     * - `'aggressive'`: Disables near-end speech detection so echo is suppressed even during
     *   double-talk; removes ~2 dB more echo but attenuates speech by 3-5 dB.
     */
    suppressionMode?: 'balanced' | 'aggressive';
    /**
     * Apply a high-pass filter on the capture signal to remove DC offset and low-frequency noise
     * that can interfere with the adaptive filter. Defaults to `true`.
     */
    highPassFilter?: boolean;
    /**
     * Apply a post-AEC3 gate that attenuates output when the speaker is active but output is quiet
     * (likely residual echo, not speech). Catches echo the suppressor misses, at the cost of
     * occasional clipping of quiet speech. Defaults to `false`.
     */
    residualEchoGate?: boolean;
};
/**
 * Background blur applied to camera video. The person is segmented from each frame using Apple's
 * Vision person segmentation and composited over a Gaussian-blurred copy of the background, keeping
 * the foreground subject sharp while blurring the background.
 *
 * - `'off'`: No background blur (default).
 * - `'balanced'`: Default-quality blur with a moderate background blur radius and soft mask edges.
 * - `'fast'`: Faster, lower-quality blur for lower-end hardware.
 * - An object for full control over the Vision-based configuration; omitted fields default to the
 *   `'balanced'` preset.
 *
 * @group Recording Schemas
 */
export type BackgroundBlur = 'off' | 'balanced' | 'fast' | {
    /**
     * Trade-off between segmentation speed and accuracy. Defaults to `'balanced'`.
     *
     * - `'accurate'`: Best segmentation quality, highest cost.
     * - `'balanced'`: Default trade-off between quality and cost.
     * - `'fast'`: Lowest cost, suitable for real-time on lower-end hardware.
     */
    quality?: 'accurate' | 'balanced' | 'fast';
    /**
     * Sigma for the Gaussian blur applied to the background. Larger values produce a stronger blur;
     * `0` disables the blur (the background is the original image). Defaults to `10`.
     */
    blurRadius?: number;
    /**
     * Sigma for the Gaussian blur applied to the segmentation mask to soften foreground/background
     * transitions; `0` keeps the raw mask edges. Defaults to `3`.
     */
    featherRadius?: number;
};
interface DisplaySchemaBase {
    type: 'display';
    /** The display to record, either a {@link Display} or its numeric id. */
    display: Display | number;
    /** Crop rectangle (in points, top-left origin) within the display. Defaults to the full display. */
    crop?: Bounds;
    /**
     * Content to exclude from the recording. Defaults to `['currentProcess', 'screenRecordingIndicator']`.
     * Pass an explicit (possibly empty) array to override the default.
     */
    excludeOptions?: ScreenRecordingExcludeOption[];
    /** Process IDs of applications to exclude from the recording. */
    excludedProcessIDs?: number[];
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Minimum interval between frames, in seconds. Caps the frame rate (e.g. `1/30` for 30 fps). Defaults to uncapped. */
    minimumFrameInterval?: number;
    /** Caps the output video to at most these dimensions (in pixels), preserving aspect ratio. */
    maxVideoDimensions?: Size;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    /** Whether to draw the mouse cursor into the recording. Defaults to `true`. */
    shows_cursor?: boolean;
    /** Whether to capture mouse input events into a JSON sidecar file. Defaults to `false`. */
    mouse_events?: boolean;
    /** Whether to capture keyboard input events into a JSON sidecar file. Defaults to `false`. */
    keyboard_events?: boolean;
    /** Output configuration for the mouse/keyboard input-event JSON sidecar files. */
    inputEventsOutput?: JSONOutputOptions;
    /** Whether to also record the display's audio. Defaults to `false`. */
    include_audio?: boolean;
}
/**
 * Creates a recorder item for recording a single display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type DisplaySchema = (DisplaySchemaBase & {
    output?: 'singleFile';
    filename?: string;
}) | (DisplaySchemaBase & {
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
});
interface WindowBasedCropSchemaBase {
    type: 'windowBasedCrop';
    /** The window to record, either a {@link Window} or its numeric id. */
    window: Window | number;
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Minimum interval between frames, in seconds. Caps the frame rate (e.g. `1/30` for 30 fps). Defaults to uncapped. */
    minimumFrameInterval?: number;
    /** Caps the output video to at most these dimensions (in pixels), preserving aspect ratio. */
    maxVideoDimensions?: Size;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    /** Whether to draw the mouse cursor into the recording. Defaults to `true`. */
    shows_cursor?: boolean;
    /** Whether to capture mouse input events into a JSON sidecar file. Defaults to `false`. */
    mouse_events?: boolean;
    /** Whether to capture keyboard input events into a JSON sidecar file. Defaults to `false`. */
    keyboard_events?: boolean;
    /** Output configuration for the mouse/keyboard input-event JSON sidecar files. */
    inputEventsOutput?: JSONOutputOptions;
    /** Whether to also record the audio of the window's application. Defaults to `false`. */
    include_audio?: boolean;
}
/**
 * Creates a recorder item for recording the initial crop of a window on a display. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type WindowBasedCropSchema = (WindowBasedCropSchemaBase & {
    output?: 'singleFile';
    filename?: string;
}) | (WindowBasedCropSchemaBase & {
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
});
interface DesktopIndependentWindowSchemaBase {
    type: 'desktopIndependentWindow';
    window: Window | number;
    /** Color space for the recording. Defaults to 'sRGB'. Note: 'displayP3' requires 'hevc' video codec. */
    colorSpace?: ColorSpace;
    /** Minimum interval between frames, in seconds. Caps the frame rate (e.g. `1/30` for 30 fps). Defaults to uncapped. */
    minimumFrameInterval?: number;
    /** Caps the output video to at most these dimensions (in pixels), preserving aspect ratio. */
    maxVideoDimensions?: Size;
    /** Video codec for the recording. Defaults to 'h264'. */
    videoCodec?: VideoCodec;
    shows_cursor?: boolean;
    mouse_events?: boolean;
    keyboard_events?: boolean;
    /** Output configuration for the mouse/keyboard input-event JSON sidecar files. */
    inputEventsOutput?: JSONOutputOptions;
    /** Whether to also record the audio of the window's application. Defaults to `false`. */
    include_audio?: boolean;
}
/**
 * Creates a recorder item that records a single window, following it across the desktop independently of
 * what is drawn on screen (the window can be moved or partially off-screen and is still captured in full).
 * Output is stored in a RecordKit bundle.
 *
 * @remarks Requires macOS 13.1 or later.
 * @group Recording Schemas
 */
export type DesktopIndependentWindowSchema = (DesktopIndependentWindowSchemaBase & {
    output?: 'singleFile';
    filename?: string;
}) | (DesktopIndependentWindowSchemaBase & {
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
});
/**
 * Creates a recorder item for an Apple device screen recording, using the provided deviceID. Output is stored in a RecordKit bundle.
 *
 * @deprecated Use {@link AppleDeviceSchema} instead.
 * @group Recording Schemas
 */
export interface AppleDeviceStaticOrientationSchema {
    type: 'appleDeviceStaticOrientation';
    filename?: string;
    device: AppleDevice | string;
}
/**
 * Creates a recorder item for an Apple device screen recording, using the provided deviceID. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export interface AppleDeviceSchema {
    type: 'appleDevice';
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
 * - `coreAudio`: Use Core Audio process taps for system audio recording.
 * - `_beta_coreAudio`: Deprecated alias for `coreAudio` kept for backward compatibility.
 *
 * @group Recording Schemas
 */
export type SystemAudioBackend = 'screenCaptureKit' | 'coreAudio' | '_beta_coreAudio';
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
 * @remarks The default `excludeOptions: ['currentProcess']` refers to the process hosting the
 * recorder — from Electron that is the bundled `recordkit-rpc` helper, which plays no audio. To
 * exclude your own app's audio, pass its process IDs via `excludedProcessIDs`.
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
interface MicrophoneSchemaCommon {
    type: 'microphone';
    microphone: Microphone | string;
    /** Echo cancellation applied to the microphone audio. Defaults to `'off'`. */
    echoCancellation?: EchoCancellation;
}
/**
 * Creates a recorder item for an audio file, using the provided microphone. Output is stored in a RecordKit bundle.
 *
 * @group Recording Schemas
 */
export type MicrophoneSchema = (MicrophoneSchemaCommon & {
    leftChannelOnly?: boolean;
    audioDelay?: number;
    output?: 'singleFile';
    filename?: string;
}) | (MicrophoneSchemaCommon & {
    leftChannelOnly?: boolean;
    audioDelay?: number;
    output: 'segmented';
    filenamePrefix?: string;
    segmentCallback?: (url: string) => void;
}) | (MicrophoneSchemaCommon & {
    output: 'stream';
    /** Called with real-time audio buffer data compatible with Web Audio API */
    streamCallback?: (audioBuffer: AudioStreamBuffer) => void;
});
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
    error: RecordKitError | NSErrorPayload;
} | {
    reason: 'failed';
    result: RecordingResult;
    error: RecordKitError | NSErrorPayload;
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
    /** Error code, used for grouping related errors. See {@link RecordKitErrorCode} for the full list of codes. */
    code: RecordKitErrorCode;
    /** Error code number. See {@link RECORDKIT_ERROR_CODE_NUMBERS}. */
    codeNumber: number;
    /** Message describing the problem and possible recovery options, intended to be shown directly to the end-user. */
    message: string;
    /** Detailed technical description of this error, used in debugging */
    debugDescription: string;
}
/**
 * An error produced outside RecordKit's own error domain — a raw `NSError` surfaced over the bridge.
 *
 * Distinguished from {@link RecordKitError} by its `name` discriminator. See the
 * [Logging and Error Handling guide](https://recordkit.dev/guides/logging-and-errors#error-handling).
 *
 * @group Recording
 */
export interface NSErrorPayload {
    name: "NSError";
    /** The `NSError` domain (e.g. `"NSOSStatusErrorDomain"`). */
    errorDomain: string;
    /** The `NSError` code within {@link NSErrorPayload.errorDomain}. */
    errorCode: number;
    /** Localized, user-facing description of the error. */
    message: string;
    /** Detailed technical description of this error, used in debugging. */
    debugDescription: string;
}
/**
 * An error raised by the RPC bridge itself rather than by a RecordKit recording — for example
 * calling a method on a recorder that was already cancelled, requesting a feature that needs a
 * newer macOS version, or referencing a window or camera that cannot be found.
 *
 * Distinguished from {@link RecordKitError} and {@link NSErrorPayload} by its `name` discriminator.
 *
 * @group Recording
 */
export interface RPCErrorPayload {
    name: "RPCError";
    /** Message describing the problem, intended to be shown directly to the end-user. */
    message: string;
    /** The same message as {@link RPCErrorPayload.message}, kept under its legacy field name. */
    userMessage: string;
    /** Detailed technical description of this error, used in debugging. */
    debugDescription: string;
}
/**
 * Describes a recording bundle's contents (the parsed `recordkit.json`). Mirrors the Swift
 * `RKBundleInfo`; the per-event sidecar types live in `RecordingMetadata.ts`.
 *
 * @group Recording
 */
export interface BundleInfo {
    version: 1;
    /** Total duration of the recording, in seconds. */
    duration: number;
    files: {
        type: 'screen' | 'webcam' | 'audio' | 'mouse' | 'systemAudio' | 'appleDevice' | 'topWindow';
        filename: string;
        /** Filenames of related sidecar files for this asset (e.g. input-event JSON), relative to the bundle. */
        related?: string[];
        /** Logical size of the recorded area, in points (e.g. `2560x1440` for a Retina 5K display). */
        recordingSize?: {
            width: number;
            height: number;
        };
        /** Dimensions of the output video, in pixels. */
        videoDimensions?: {
            width: number;
            height: number;
        };
    }[];
}
export {};
