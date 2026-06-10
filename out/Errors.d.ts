/**
 * The set of error code names that can occur in RecordKit.
 *
 * Each member is the exact case-name string returned by the Swift
 * `RKError.Code.description` and reported as `RecordKitError.code`. The trailing
 * comment on each line is the matching numeric raw value, available at runtime
 * as `RecordKitError.codeNumber` (see {@link RECORDKIT_ERROR_CODE_NUMBERS}).
 *
 * @remarks
 * Codes are grouped into ranges by category, mirroring the Swift `RKError.Code`
 * enum. The associated `RecordKitError` carries a user-facing message
 * (`message`) and technical detail; the meaning of each code:
 *
 * - **Configuration** (`-100x`):
 *   `invalidLicense` (no valid RecordKit license),
 *   `invalidConfiguration` (the provided configuration is not valid).
 * - **Permission** (`-110x`): the corresponding permission is required but not
 *   granted — `microphonePermissionRequired`, `cameraPermissionRequired`,
 *   `screenRecordingPermissionRequired`, `systemAudioPermissionRequired`.
 * - **Device availability** (`-120x`): the requested device/source is
 *   unavailable for recording — `microphoneUnavailable`, `cameraUnavailable`,
 *   `displayUnavailable`, `windowUnavailable`, `systemAudioUnavailable`,
 *   `appleDeviceUnavailable`, `inputRecordingUnavailable`.
 * - **Recording state** (`-130x`): `noVideoFramesReceived` /
 *   `noAudioSamplesReceived` (nothing was captured), `screenCaptureStoppedLowDiskSpace`,
 *   `screenCaptureStoppedWithError`, `screenCaptureStoppedWithoutError`.
 * - **Internal** (`-16xx`): unexpected failures inside RecordKit (e.g.
 *   `internalError`, `uncaughtError`, `internalConductorError`,
 *   `configurationFailed`, `configurationNotSupported`, audio/video/media
 *   format and device init/configuration failures, `assetWriterFailed`,
 *   `tccUnavailableError` — the permission system interface is unavailable).
 * - **Processing/operation** (`-17xx`): a runtime operation failed — e.g.
 *   `audioProcessingFailed`, `audioBufferProcessingFailed`,
 *   `audioBufferCreationFailed`, `inputEventProcessingFailed`,
 *   `assetWriterCreationFailed`, `fileOperationFailed`, `windowOperationFailed`.
 *
 * @group Recording
 */
export type RecordKitErrorCode = 'invalidLicense' | 'invalidConfiguration' | 'microphonePermissionRequired' | 'cameraPermissionRequired' | 'screenRecordingPermissionRequired' | 'systemAudioPermissionRequired' | 'microphoneUnavailable' | 'cameraUnavailable' | 'displayUnavailable' | 'windowUnavailable' | 'systemAudioUnavailable' | 'appleDeviceUnavailable' | 'inputRecordingUnavailable' | 'noVideoFramesReceived' | 'noAudioSamplesReceived' | 'screenCaptureStoppedLowDiskSpace' | 'screenCaptureStoppedWithError' | 'screenCaptureStoppedWithoutError' | 'internalError' | 'uncaughtError' | 'internalConductorError' | 'configurationFailed' | 'configurationNotSupported' | 'audioFormatError' | 'videoFormatError' | 'audioFormatConfigurationFailed' | 'videoFormatConfigurationFailed' | 'mediaFormatInitializationFailed' | 'mediaFormatConfigurationFailed' | 'audioDeviceInitializationFailed' | 'audioDeviceConfigurationFailed' | 'assetWriterFailed' | 'tccUnavailableError' | 'audioProcessingFailed' | 'audioBufferProcessingFailed' | 'audioBufferCreationFailed' | 'inputEventProcessingFailed' | 'assetWriterCreationFailed' | 'fileOperationFailed' | 'windowOperationFailed';
/**
 * Mapping from each {@link RecordKitErrorCode} name to its numeric raw value.
 *
 * The numbers correspond to the `Int` raw values of the Swift `RKError.Code`
 * enum and to the `RecordKitError.codeNumber` reported over RPC.
 *
 * @group Recording
 */
export declare const RECORDKIT_ERROR_CODE_NUMBERS: {
    readonly invalidLicense: -1001;
    readonly invalidConfiguration: -1002;
    readonly microphonePermissionRequired: -1101;
    readonly cameraPermissionRequired: -1102;
    readonly screenRecordingPermissionRequired: -1103;
    readonly systemAudioPermissionRequired: -1104;
    readonly microphoneUnavailable: -1201;
    readonly cameraUnavailable: -1202;
    readonly displayUnavailable: -1203;
    readonly windowUnavailable: -1204;
    readonly systemAudioUnavailable: -1205;
    readonly appleDeviceUnavailable: -1206;
    readonly inputRecordingUnavailable: -1207;
    readonly noVideoFramesReceived: -1301;
    readonly noAudioSamplesReceived: -1302;
    readonly screenCaptureStoppedLowDiskSpace: -1303;
    readonly screenCaptureStoppedWithError: -1304;
    readonly screenCaptureStoppedWithoutError: -1305;
    readonly internalError: -1600;
    readonly uncaughtError: -1601;
    readonly internalConductorError: -1602;
    readonly configurationFailed: -1603;
    readonly configurationNotSupported: -1604;
    readonly audioFormatError: -1605;
    readonly videoFormatError: -1606;
    readonly audioFormatConfigurationFailed: -1607;
    readonly videoFormatConfigurationFailed: -1608;
    readonly mediaFormatInitializationFailed: -1609;
    readonly mediaFormatConfigurationFailed: -1610;
    readonly audioDeviceInitializationFailed: -1611;
    readonly audioDeviceConfigurationFailed: -1612;
    readonly assetWriterFailed: -1613;
    readonly tccUnavailableError: -1614;
    readonly audioProcessingFailed: -1701;
    readonly audioBufferProcessingFailed: -1702;
    readonly audioBufferCreationFailed: -1703;
    readonly inputEventProcessingFailed: -1704;
    readonly assetWriterCreationFailed: -1705;
    readonly fileOperationFailed: -1706;
    readonly windowOperationFailed: -1707;
};
