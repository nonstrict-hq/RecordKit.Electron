type Destructor = () => void
export const finalizationRegistry = new FinalizationRegistry<Destructor>(async (destructor) => { await destructor() })
