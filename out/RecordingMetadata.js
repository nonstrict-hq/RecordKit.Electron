// TypeScript mirrors of the Swift `Codable` types whose JSON is written to sidecar files inside a
// RecordKit recording bundle. Consumers parse those JSON files and rely on these types to describe
// their shape: property names are verbatim camelCase, Swift optionals become optional properties,
// and Swift tagged-union enums encode as flat objects discriminated by a `type` field at the same
// level as the payload.
//
// Keep this file in sync with the corresponding Swift sources:
// - `RKWindowPresence.swift`
// - `RKVideoDimensionChange.swift`
// (The `RKBundleInfo` mirror, `BundleInfo`, lives in `Recorder.ts`.)
export {};
//# sourceMappingURL=RecordingMetadata.js.map