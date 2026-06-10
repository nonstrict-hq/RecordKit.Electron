// Type definitions mirroring the JSON written to the input-events sidecar file inside a RecordKit
// recording bundle. RecordKit records mouse, keyboard, modifier-change and discontinuation events
// during a recording; they are serialized as JSON to a sidecar file in the bundle. These types
// mirror the Swift `Codable` types in `RKInputEvent.swift` exactly, so consumers can parse those
// JSON files type-safely. Each top-level event encodes as a flat object with a `"type"` discriminator
// at the same level as its payload properties (not nested). Types only — no runtime code in this module.
export {};
//# sourceMappingURL=InputEvents.js.map