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
    constructor(send: (data: string) => void);
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
