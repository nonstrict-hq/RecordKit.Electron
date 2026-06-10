export interface NSRPCPerformClosureRequest {
    nsrpc: number;
    id?: string;
    procedure: "perform";
    target: string;
    params?: Record<string, unknown>;
}
type ClosureTarget = (params: Record<string, unknown>) => Record<string, unknown> | void;
export declare class NSRPC {
    logMessages: boolean;
    private readonly send;
    private responseHandlers;
    private closureTargets;
    private terminationError?;
    constructor(send: (data: string) => void);
    /**
     * Marks the RPC connection as permanently gone, e.g. because the external process exited.
     *
     * All in-flight requests are rejected with the given error and any future request fails
     * immediately with the same error, instead of waiting forever for a response that can no
     * longer arrive.
     */
    terminate(error: Error): void;
    receive(data: string): void;
    private sendMessage;
    private sendResponse;
    private sendRequest;
    private handleRequest;
    private handleClosureRequest;
    initialize(args: {
        target: string;
        type: string;
        params?: Record<string, unknown>;
        lifecycle: Object;
    }): Promise<void>;
    perform(body: {
        type?: string;
        target?: string;
        action?: string;
        params?: Record<string, unknown>;
    }): Promise<unknown>;
    private release;
    manualRelease(target: string): Promise<void>;
    registerClosure(options: {
        handler: ClosureTarget;
        lifecycle: Object;
        prefix: string;
    }): string;
}
export {};
