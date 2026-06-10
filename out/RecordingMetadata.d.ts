import type { EventTime } from './InputEvents.js';
/**
 * Presence of a window at a point in time within a recording.
 *
 * Encoded as a flat object discriminated by `type`. Mirrors the Swift
 * `RKWindowPresence` enum.
 *
 * @remarks
 * The `present` member ({@link WindowInfo}) carries the window's position,
 * size and identifying metadata at that moment; the `absent` member
 * ({@link WindowAbsence}) marks a time at which the tracked window was not
 * present (e.g. closed, minimized, or moved to another Space).
 *
 * @group Recording
 */
export type WindowPresence = WindowInfo | WindowAbsence;
/**
 * Information about a window that is present at a point in time within a recording.
 *
 * Mirrors the Swift `RKWindowInfo` struct (the `present` case of
 * `RKWindowPresence`).
 *
 * @group Recording
 */
export interface WindowInfo {
    type: 'present';
    /** Time the event occurred in the recording. */
    time: EventTime;
    /** ID of the window. */
    windowID: number;
    /** Title of the window. */
    windowTitle?: string;
    /**
     * ID of the macOS Space where this window lives (can be used to detect space changes).
     *
     * @remarks Mirrors a Swift `UInt64`; for very large Space IDs this can exceed JavaScript's
     * `Number.MAX_SAFE_INTEGER`. ({@link WindowInfo.windowID} and {@link WindowInfo.applicationID}
     * are 32-bit and not affected.)
     */
    spaceID?: number;
    /** ID of the application the window belongs to. */
    applicationID?: number;
    /** Title of the application the window belongs to. */
    applicationName?: string;
    /** X-axis position of the window relative to the top left of recorded area, ranging from 0 to 1. */
    x: number;
    /** Y-axis position of the window relative to the top left of recorded area, ranging from 0 to 1. */
    y: number;
    /** Width of the window relative to the top left of recorded area, ranging from 0 to 1. */
    width: number;
    /** Height of the window relative to the top left of recorded area, ranging from 0 to 1. */
    height: number;
}
/**
 * Marks the absence of a window at a point in time within a recording.
 *
 * Mirrors the Swift `RKWindowAbsence` struct (the `absent` case of
 * `RKWindowPresence`).
 *
 * @group Recording
 */
export interface WindowAbsence {
    type: 'absent';
    /** Time the event occurred in the recording. */
    time: EventTime;
}
/**
 * An event representing a video dimension change during recording.
 * This can be caused by device rotation or other content size changes.
 *
 * Mirrors the Swift `RKVideoDimensionChange` struct.
 *
 * @group Recording
 */
export interface VideoDimensionChange {
    /** Time the dimension change occurred in the recording. */
    time: EventTime;
    /** The original (pre-rotation) dimensions of the content, in pixels. */
    dimensions: {
        /** Content width in pixels. */
        width: number;
        /** Content height in pixels. */
        height: number;
    };
    /**
     * The rotation in degrees (0, 90, 180, or -90) that a player should apply to display
     * this segment correctly. Positive values are clockwise, negative are counterclockwise.
     */
    rotation: number;
    /**
     * Whether the player should animate the transition to this rotation.
     * `true` when device rotated during continuous recording.
     * `false` at recording start or after pause/resume (instant change).
     */
    animated: boolean;
}
