import { NSRPC } from "./NonstrictRPC.js";
export declare class IpcRecordKit {
    private childProcess?;
    readonly nsrpc: NSRPC;
    constructor();
    initialize(recordKitRpcPath: string, logMessages?: boolean): Promise<void>;
    private write;
}
