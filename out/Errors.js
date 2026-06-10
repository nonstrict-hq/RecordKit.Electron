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
export const RECORDKIT_ERROR_CODE_NUMBERS = {
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
//# sourceMappingURL=Errors.js.map