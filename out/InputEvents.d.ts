/**
 * Time an input event occurred in the recording.
 *
 * @group Recording
 */
export interface EventTime {
    /** The time in seconds. Prefer this field for time math. */
    seconds: number;
    /**
     * The numerator of the rational time value (`value / timescale ≈ seconds`; `value` is the
     * truncated nanosecond count, so {@link EventTime.seconds} is authoritative).
     *
     * This mirrors a 64-bit integer; for extremely long recordings (beyond ~104 days at nanosecond
     * timescale) it can exceed JavaScript's `Number.MAX_SAFE_INTEGER`, so prefer {@link EventTime.seconds}.
     */
    value: number;
    /** The denominator (timescale) of the rational time value. */
    timescale: number;
}
/**
 * Input modifiers (like shift, option, command, etc) that change the behaviour
 * of mouse clicks and keyboard presses.
 *
 * @group Recording
 */
export type InputModifier = 
/**
 * Caps lock key, toggles on/off with a single press, making all input
 * characters capitals.
 *
 * Usually found on the left side of the keyboard, available on all regular
 * keyboards.
 */
'capsLock'
/**
 * Shift key, making input characters capitals as long as it is pressed. Also
 * often involved in hotkeys.
 *
 * Usually found on both the left and right side of the character block on the
 * keyboard, available on all regular keyboards.
 */
 | 'shift'
/**
 * Control key, often involved in hotkeys.
 *
 * Usually found on both the left side of the character block on the keyboard,
 * available on all regular keyboards.
 */
 | 'control'
/**
 * Option key, used to type alternative characters. Also often involved in
 * hotkeys.
 *
 * Usually found on both the left and right side of the character block on the
 * keyboard, available on all regular keyboards.
 */
 | 'option'
/**
 * Command key, often involved in hotkeys.
 *
 * Usually found on both the left and right side of the spacebar, available on
 * all regular keyboards.
 */
 | 'command'
/**
 * Function (fn) key, used to modify key behaviour of keys with system
 * functionality.
 *
 * For example changing delete into forward delete or re-enabling function
 * key behaviour instead of adjusting system settings like brightness or
 * volume.
 *
 * Usually found on the bottom left of the keyboard or on larger keyboards to
 * left of the numeric keypad, above the arrow keys, available on all regular
 * keyboards.
 */
 | 'function';
/**
 * Type of keyboard event.
 *
 * Represents the cause that generated a keyboard event.
 *
 * @group Recording
 */
export type KeyboardEventType = 
/** Key is pressed down. */
'down'
/** Key is released. */
 | 'up';
/**
 * Type of a keyboard key.
 *
 * Helps make the distinction between a regular character key (like A, 1, /,
 * etc) and special keys (like escape, space, arrow keys, etc) without having to
 * know exact keycodes or unicode characters.
 *
 * - note: Does not include modifier keys (like shift, option, command, etc)
 *   since those are supposed to be pressed together they're represented as
 *   {@link InputModifier}.
 *
 * @group Recording
 */
export type KeyboardKeyType = 
/**
 * Character key, any key representing a character (letter or number) that is
 * typed.
 *
 * This indicates the key doesn't represent any special key.
 */
'character'
/**
 * Escape key, exit the current state or abort the current action.
 *
 * Usually found in the top left of the keyboard, available on all regular
 * keyboards.
 */
 | 'escape'
/**
 * Delete key, also known as backspace. Removes the character left of the
 * caret.
 *
 * Usually found in the top right of the character key block of the keyboard,
 * available on all regular keyboards.
 */
 | 'delete'
/**
 * Tab key, indent text or move to the next item.
 *
 * Usually found on the left side of the character key block of the keyboard,
 * available on all regular keyboards.
 */
 | 'tab'
/**
 * Return key, insert newline or confirm action. Also represents the enter key
 * available on some keyboards.
 *
 * Usually found on the right side of the character key block of the keyboard,
 * available on all regular keyboards.
 */
 | 'return'
/**
 * Spacebar key, insert a space or confirm selection.
 *
 * Usually found on the bottom of the character key block of the keyboard,
 * available on all regular keyboards.
 */
 | 'space'
/**
 * Left arrow key, moves caret to the left.
 *
 * Usually found in the arrow block in the bottom right of the keyboard, or on
 * larger keyboard in the center of the keyboard, available on all regular
 * keyboards.
 */
 | 'leftArrow'
/**
 * Right arrow key, moves caret to the right.
 *
 * Usually found in the arrow block in the bottom right of the keyboard, or on
 * larger keyboard in the center of the keyboard, available on all regular
 * keyboards.
 */
 | 'rightArrow'
/**
 * Down arrow key, moves caret down.
 *
 * Usually found in the arrow block in the bottom right of the keyboard, or on
 * larger keyboard in the center of the keyboard, available on all regular
 * keyboards.
 */
 | 'downArrow'
/**
 * Up arrow key, moves caret up.
 *
 * Usually found in the arrow block in the bottom right of the keyboard, or on
 * larger keyboard in the center of the keyboard, available on all regular
 * keyboards.
 */
 | 'upArrow'
/**
 * Delete key, removes the character right of the caret.
 *
 * Usually found in the key block left of the numeric keypad and above the
 * arrows on the Magic Keyboard. Not available as a key on the smaller Magic
 * Keyboard and MacBooks.
 */
 | 'deleteForward'
/**
 * Home key, scrolls to the very top.
 *
 * Usually found in the key block left of the numeric keypad and above the
 * arrows on the Magic Keyboard. Not available as a key on the smaller Magic
 * Keyboard and MacBooks.
 */
 | 'home'
/**
 * End key, scrolls to the very bottom.
 *
 * Usually found in the key block left of the numeric keypad and above the
 * arrows on the Magic Keyboard. Not available as a key on the smaller Magic
 * Keyboard and MacBooks.
 */
 | 'end'
/**
 * Page up key, scrolls one page up.
 *
 * Usually found in the key block left of the numeric keypad and above the
 * arrows on the Magic Keyboard. Not available as a key on the smaller Magic
 * Keyboard and MacBooks.
 */
 | 'pageUp'
/**
 * Page down key, scroll one page down.
 *
 * Usually found in the key block left of the numeric keypad and above the
 * arrows on the Magic Keyboard. Not available as a key on the smaller Magic
 * Keyboard and MacBooks.
 */
 | 'pageDown'
/**
 * Clear key, clears the contents of the focused entry field.
 *
 * Usually found on the top left of the numpad on the Apple Magic Keyboard. Not
 * available as a key on the smaller Magic Keyboard and MacBooks.
 */
 | 'clear'
/**
 * Function key 1, might default to the brightness system function and not be
 * received at all.
 *
 * Usually found in the top row of keys, next to the escape key, available on
 * most keyboards.
 */
 | 'f1'
/**
 * Function key 2, might default to the brightness system function and not be
 * received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f2'
/**
 * Function key 3, might default to the mission control system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f3'
/**
 * Function key 4, might default to the search system function and not be
 * received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f4'
/**
 * Function key 5, might default to the Siri assistant system function and not
 * be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f5'
/**
 * Function key 6, might default to the do not disturb system function and not
 * be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f6'
/**
 * Function key 7, might default to the media control previous system function
 * and not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f7'
/**
 * Function key 8, might default to the media control play/pause system
 * function and not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f8'
/**
 * Function key 9, might default to the media control next system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f9'
/**
 * Function key 10, might default to the mute volume system function and not
 * be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f10'
/**
 * Function key 11, might default to the decrease volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f11'
/**
 * Function key 12, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on most keyboards.
 */
 | 'f12'
/**
 * Function key 13, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on larger keyboards such as
 * the Magic Keyboard with Numeric Keypad.
 */
 | 'f13'
/**
 * Function key 14, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on older smaller keyboards
 * without TouchID and larger keyboards such as the Magic Keyboard with
 * Numeric Keypad.
 */
 | 'f14'
/**
 * Function key 15, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys, available on larger keyboards such as
 * the Magic Keyboard with Numeric Keypad.
 */
 | 'f15'
/**
 * Function key 16, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys above the numeric keypad, available on
 * larger keyboards such as the Magic Keyboard with Numeric Keypad.
 */
 | 'f16'
/**
 * Function key 17, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys above the numeric keypad, available on
 * larger keyboards such as the Magic Keyboard with Numeric Keypad.
 */
 | 'f17'
/**
 * Function key 18, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys above the numeric keypad, available on
 * larger keyboards such as the Magic Keyboard with Numeric Keypad.
 */
 | 'f18'
/**
 * Function key 19, might default to the increase volume system function and
 * not be received at all.
 *
 * Usually found in the top row of keys above the numeric keypad, available on
 * larger keyboards such as the Magic Keyboard with Numeric Keypad.
 */
 | 'f19';
/**
 * Type of mouse event.
 *
 * Represents the cause that generated a mouse event.
 *
 * @group Recording
 */
export type MouseEventType = 
/** Mouse button is pressed down. */
'down'
/** Mouse button is released. */
 | 'up'
/** Mouse pointer is moved, without any buttons pressed. */
 | 'moved'
/** Mouse pointer is moved, with a button pressed. */
 | 'dragged'
/**
 * Mouse cursor changed shape.
 *
 * The mouse cursor can change shape while the mouse is not used by the user.
 * For example the application the mouse is hovering over can be unresponsive
 * changing the mouse to the beachball, or content can appear like a link that
 * moves under the cursor.
 *
 * This event indicates such a change of cursor shape.
 */
 | 'cursorChanged';
/**
 * Mouse button types.
 *
 * @group Recording
 */
export type MouseButton = 
/** The primary mouse button (usually left button). */
'primary'
/** The secondary mouse button (usually right button). */
 | 'secondary'
/** The center mouse button (usually scroll wheel click). */
 | 'center'
/** Any other mouse button not covered by the above cases. */
 | 'other';
/**
 * Mouse cursor types (also called pointer).
 *
 * @group Recording
 */
export type CursorType = 
/** A custom cursor that is not recognized as a system cursor. */
'custom'
/** The default system cursor, an arrow. */
 | 'arrow'
/**
 * System cursor that looks like a capital I with a tiny crossbeam at its
 * middle.
 */
 | 'iBeam'
/** The cross-hair system cursor. */
 | 'crosshair'
/** The closed-hand system cursor. */
 | 'closedHand'
/** The open-hand system cursor. */
 | 'openHand'
/** The pointing-hand system cursor. */
 | 'pointingHand'
/** The resize-left system cursor. */
 | 'resizeLeft'
/** The resize-right system cursor. */
 | 'resizeRight'
/** The resize-left-and-right system cursor. */
 | 'resizeLeftRight'
/** The resize-up system cursor. */
 | 'resizeUp'
/** The resize-down system cursor. */
 | 'resizeDown'
/** The resize-up-and-down system cursor. */
 | 'resizeUpDown'
/**
 * System cursor indicating that the current operation will result in a
 * disappearing item.
 */
 | 'disappearingItem'
/** System cursor for editing vertical layout text. */
 | 'iBeamCursorForVerticalLayout'
/** The operation not allowed system cursor. */
 | 'operationNotAllowed'
/**
 * System cursor indicating that the current operation will result in a link
 * action.
 */
 | 'dragLink'
/**
 * System cursor indicating that the current operation will result in a copy
 * action.
 */
 | 'dragCopy'
/** The contextual menu system cursor. */
 | 'contextualMenu'
/** The column resize system cursor. Available on macOS 15+. */
 | 'columnResize'
/** The row resize system cursor. Available on macOS 15+. */
 | 'rowResize'
/** The zoom in system cursor. Available on macOS 15+. */
 | 'zoomIn'
/** The zoom out system cursor. Available on macOS 15+. */
 | 'zoomOut'
/** Private bottom-left resize cursor. */
 | 'bottomLeftResize'
/** Private bottom-right resize cursor. */
 | 'bottomRightResize'
/** Private top-left resize cursor. */
 | 'topLeftResize'
/** Private top-right resize cursor. */
 | 'topRightResize'
/** Private horizontal resize cursor. */
 | 'horizontalResize'
/** Private vertical resize cursor. */
 | 'verticalResize'
/**
 * Private busy but clickable cursor (spinning beachball that's still
 * interactive).
 */
 | 'busyButClickable'
/** Private generic drag cursor. */
 | 'genericDrag'
/** Private hand cursor. */
 | 'hand'
/** Private help cursor. */
 | 'help'
/** Private override help cursor. */
 | 'overrideHelp'
/** Private window resize east cursor. */
 | 'windowResizeEast'
/** Private window resize east-west cursor. */
 | 'windowResizeEastWest'
/** Private window resize north cursor. */
 | 'windowResizeNorth'
/** Private window resize north-east cursor. */
 | 'windowResizeNorthEast'
/** Private window resize north-east-south-west cursor. */
 | 'windowResizeNorthEastSouthWest'
/** Private window resize north-south cursor. */
 | 'windowResizeNorthSouth'
/** Private window resize north-west cursor. */
 | 'windowResizeNorthWest'
/** Private window resize north-west-south-east cursor. */
 | 'windowResizeNorthWestSouthEast'
/** Private window resize south cursor. */
 | 'windowResizeSouth'
/** Private window resize south-east cursor. */
 | 'windowResizeSouthEast'
/** Private window resize south-west cursor. */
 | 'windowResizeSouthWest'
/** Private window resize west cursor. */
 | 'windowResizeWest';
/**
 * Mouse movement and clicks.
 *
 * @group Recording
 */
export interface RecordedMouseEvent {
    /** Discriminator marking this as a mouse event. */
    type: 'mouse';
    /** Type of mouse event this is. */
    mouseEventType: MouseEventType;
    /** Time the event occurred in the recording. */
    time: EventTime;
    /**
     * Input modifier keys (like shift, option, command, etc) pressed during this
     * event.
     *
     * Possible values will appear at most once, no duplicate values will be
     * present.
     */
    modifiers: InputModifier[];
    /**
     * X-axis position of the mouse cursor relative to the top left of recorded
     * area, ranging from 0 to 1.
     */
    x: number;
    /**
     * Y-axis position of the mouse cursor relative to the top left of recorded
     * area, ranging from 0 to 1.
     */
    y: number;
    /** The relevant mouse button involved in this event. */
    button?: MouseButton;
    /** The type of cursor shown during this event. */
    cursorType: CursorType;
    /** Marks a click on the recording app. */
    targetsCurrentProcess: boolean;
}
/**
 * Keys pressed and released on the keyboard.
 *
 * - note: Pressing/releasing input modifiers (like shift, option, command, etc)
 *   are not captured by this event, but through {@link ModifiersChangedEvent}.
 *
 * @group Recording
 */
export interface RecordedKeyboardEvent {
    /** Discriminator marking this as a keyboard event. */
    type: 'keyboard';
    /** Type of keyboard event this is. */
    keyboardEventType: KeyboardEventType;
    /** Time the event occurred in the recording. */
    time: EventTime;
    /**
     * Input modifier keys (like shift, option, command, etc) pressed during this
     * event.
     *
     * Possible values will appear at most once, no duplicate values will be
     * present.
     */
    modifiers: InputModifier[];
    /**
     * Classifies the key as a regular character key or one of the recognised
     * special keys (escape, arrows, function keys, etc) without needing to
     * inspect raw keycodes. See {@link KeyboardKeyType}.
     */
    keyType: KeyboardKeyType;
    /**
     * A short human-readable label for the key (e.g. `"esc"`, `"return"`, `"left"`, `"F1"`).
     * Character keys carry the produced character, uppercased (e.g. `"A"`, `"1"`, `"/"`); the
     * placeholder `"□"` is used only as a fallback when the character cannot be determined.
     */
    keyTitle: string;
    /**
     * A single-glyph symbol for the key (e.g. `"⎋"`, `"⏎"`, `"←"`, `"⌫"`). Function keys fall back to
     * their label (`"F1"`); character keys carry the produced character, uppercased, with `"□"` as the
     * fallback when it cannot be determined.
     */
    keySymbol: string;
    /**
     * The character(s) the key press produced, if any.
     *
     * Reflects the actual typed text after applying the active keyboard layout
     * and modifiers (so e.g. shift yields a capital). Absent for keys that don't
     * generate characters.
     */
    characters?: string;
    /**
     * Whether the key event is a repeat.
     *
     * Repeats happen when the user holds the key down for a longer period of time
     * and the system starts repeating the same key press over and over again.
     */
    isARepeat: boolean;
}
/**
 * Input modifiers (like shift, option, command, etc) pressed or released.
 *
 * @group Recording
 */
export interface ModifiersChangedEvent {
    /** Discriminator marking this as a modifiers-changed event. */
    type: 'modifiersChanged';
    /** Time the event occurred in the recording. */
    time: EventTime;
    /**
     * Input modifier keys (like shift, option, command, etc) pressed during this
     * event.
     *
     * Possible values will appear at most once, no duplicate values will be
     * present.
     */
    modifiers: InputModifier[];
}
/**
 * Event during input recording where the earlier and later events are no longer
 * continuous, e.g. after a pause/resume.
 *
 * @group Recording
 */
export interface DiscontinuationEvent {
    /** Discriminator marking this as a discontinuation event. */
    type: 'discontinuation';
    /** Time the event occurred in the recording. */
    time: EventTime;
}
/**
 * A single input event recorded during a RecordKit recording.
 *
 * Discriminated union on the `type` field. The payload properties of each
 * member are flattened alongside the `type` discriminator in the encoded JSON.
 *
 * @remarks
 * Every member carries a {@link EventTime} `time` field. The mouse, keyboard
 * and modifiers-changed members also carry a `modifiers` set; the
 * discontinuation member has no modifiers (treat it as empty).
 *
 * @group Recording
 */
export type RecordedInputEvent = RecordedMouseEvent | RecordedKeyboardEvent | ModifiersChangedEvent | DiscontinuationEvent;
