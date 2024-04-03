export const finalizationRegistry = new FinalizationRegistry(async (destructor) => { await destructor(); });
//# sourceMappingURL=finalizationRegistry.js.map