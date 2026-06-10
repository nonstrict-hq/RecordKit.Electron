import { randomUUID } from "crypto";
import { finalizationRegistry } from "./finalizationRegistry.js";
export class NSRPC {
    logMessages = false;
    send;
    responseHandlers = new Map();
    closureTargets = new Map();
    terminationError;
    constructor(send) {
        this.send = send;
    }
    /**
     * Marks the RPC connection as permanently gone, e.g. because the external process exited.
     *
     * All in-flight requests are rejected with the given error and any future request fails
     * immediately with the same error, instead of waiting forever for a response that can no
     * longer arrive.
     */
    terminate(error) {
        this.terminationError = error;
        const pendingHandlers = [...this.responseHandlers.values()];
        this.responseHandlers.clear();
        for (const handler of pendingHandlers) {
            handler.reject(error);
        }
    }
    receive(data) {
        // TODO: For now we just assume the message is a valid NSRPC message, but we should:
        // - Check if the nsrpc property is set to a number in the range of 1..<2
        // - Validate the message against the defined interfaces above
        let message;
        try {
            if (this.logMessages) {
                console.log("RecordKit: [RPC] <", data.trimEnd());
            }
            message = JSON.parse(data);
        }
        catch (error) {
            if (this.logMessages) {
                console.error("RecordKit: [RPC] !! Above message is invalid JSON, will be ignored.");
            }
            return;
        }
        if ("status" in message) {
            // This is a response, dispatch it so it can be handled
            const responseHandler = this.responseHandlers.get(message.id);
            this.responseHandlers.delete(message.id);
            if (responseHandler === undefined) {
                console.error("RecordKit: [RPC] !! Got a response for an unknown request.", message.id);
                return;
            }
            if ("error" in message) {
                responseHandler.reject(message.error);
            }
            else {
                responseHandler.resolve(message.result);
            }
        }
        else {
            // This is a request
            const responseBody = this.handleRequest(message);
            if (responseBody !== undefined) {
                this.sendResponse(message.id, responseBody);
            }
        }
    }
    /* Sending helpers */
    sendMessage(message) {
        const stringMessage = JSON.stringify(message);
        if (this.logMessages) {
            console.log("RecordKit: [RPC] >", stringMessage);
        }
        this.send(stringMessage);
    }
    sendResponse(id, response) {
        if (id === undefined) {
            return;
        }
        this.sendMessage({ ...response, nsrpc: 1, id });
    }
    async sendRequest(request) {
        if (this.terminationError !== undefined) {
            throw this.terminationError;
        }
        const id = "req_" + randomUUID();
        const response = new Promise((resolve, reject) => {
            this.responseHandlers.set(id, { resolve, reject });
        });
        this.sendMessage({ ...request, nsrpc: 1, id });
        return response;
    }
    /* Request handling */
    handleRequest(request) {
        switch (request.procedure) {
            case "init":
                return {
                    status: 501,
                    error: {
                        debugDescription: "Init procedure not implemented.",
                        userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                    },
                };
            case "perform":
                if ("action" in request) {
                    return {
                        status: 501,
                        error: {
                            debugDescription: "Perform procedure for (static) methods not implemented.",
                            userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                        },
                    };
                }
                else {
                    return this.handleClosureRequest(request);
                }
            case "release":
                return {
                    status: 501,
                    error: {
                        debugDescription: "Release procedure not implemented.",
                        userMessage: "Failed to communicate with external process. (Procedure not implemented)",
                    },
                };
        }
    }
    handleClosureRequest(request) {
        const handler = this.closureTargets.get(request.target);
        if (handler === undefined) {
            return {
                status: 404,
                error: {
                    debugDescription: `Perform target '${request.target}' not found.`,
                    userMessage: "Failed to communicate with external process. (Target not found)",
                },
            };
        }
        try {
            const rawresult = handler(request.params ?? {});
            const result = rawresult === undefined ? undefined : rawresult;
            return {
                status: 200,
                result,
            };
        }
        catch (error) {
            return {
                status: 202,
                // TODO: Would be good to have an error type that we can throw that fills these fields more specifically. (But for now it doesn't matter since this is just communicated back the the CLI and not to the user.)
                error: {
                    debugDescription: `${error}`,
                    userMessage: "Handler failed to perform request.",
                    underlyingError: error,
                },
            };
        }
    }
    /* Perform remote procedures */
    async initialize(args) {
        await this.sendRequest({
            target: args.target,
            type: args.type,
            params: args.params,
            procedure: "init",
        });
        // Register the GC release only after a successful init; registering earlier would later send a
        // release for a target the external process never knew about.
        const target = args.target;
        finalizationRegistry.register(args.lifecycle, () => {
            // Swallow rejections: the external process may already be gone, in which case there is
            // nothing left to release.
            this.release(target).catch(() => { });
        });
    }
    async perform(body) {
        return await this.sendRequest({
            ...body,
            procedure: "perform",
        });
    }
    async release(target) {
        await this.sendRequest({
            procedure: "release",
            target,
        });
    }
    async manualRelease(target) {
        await this.sendRequest({
            procedure: "manual-release",
            target,
        });
    }
    /* Register locally available targets/actions */
    registerClosure(options) {
        const target = `target_${options.prefix}_${randomUUID()}`;
        this.closureTargets.set(target, options.handler);
        finalizationRegistry.register(options.lifecycle, () => {
            this.closureTargets.delete(target);
        });
        return target;
    }
}
//# sourceMappingURL=NonstrictRPC.js.map