import { randomUUID } from "crypto";
import { finalizationRegistry } from "./finalizationRegistry.js";

type NSRPCMessage = NSRPCRequest | NSRPCResponse;

/* Request types */

type NSRPCRequest =
  | NSRPCInitializationRequest
  | NSRPCPerformStaticMethodRequest
  | NSRPCPerformMethodRequest
  | NSRPCPerformClosureRequest
  | NSRPCReleaseRequest;

interface NSRPCInitializationRequest {
  nsrpc: number;
  id: string;
  procedure: "init";
  target: string;
  type: string;
  params?: Record<string, unknown>;
}

interface NSRPCPerformStaticMethodRequest {
  nsrpc: number;
  id?: string;
  procedure: "perform";
  type: string;
  action: string;
  params?: Record<string, unknown>;
}

interface NSRPCPerformMethodRequest {
  nsrpc: number;
  id?: string;
  procedure: "perform";
  target: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface NSRPCPerformClosureRequest {
  nsrpc: number;
  id?: string;
  procedure: "perform";
  target: string;
  params?: Record<string, unknown>;
}

interface NSRPCReleaseRequest {
  nsrpc: number;
  id: string;
  procedure: "release" | "manual-release";
  target: string;
}

type NSRPCRequestBody =
  | NSRPCInitializationRequestBody
  | NSRPCPerformStaticMethodRequestBody
  | NSRPCPerformMethodRequestBody
  | NSRPCPerformClosureRequestBody
  | NSRPCReleaseRequestBody;
type NSRPCInitializationRequestBody = Omit<
  NSRPCInitializationRequest,
  "nsrpc" | "id"
>;
type NSRPCPerformMethodRequestBody = Omit<
  NSRPCPerformMethodRequest,
  "nsrpc" | "id"
>;
type NSRPCPerformStaticMethodRequestBody = Omit<
  NSRPCPerformStaticMethodRequest,
  "nsrpc" | "id"
>;
type NSRPCPerformClosureRequestBody = Omit<
  NSRPCPerformClosureRequest,
  "nsrpc" | "id"
>;
type NSRPCReleaseRequestBody = Omit<NSRPCReleaseRequest, "nsrpc" | "id">;

/* Response types */

type NSRPCResponse = NSRPCSuccesfulResponse | NSRPCErrorResponse;

interface NSRPCSuccesfulResponse {
  nsrpc: number;
  id: string;
  status: 200;
  result?: unknown;
}

interface NSRPCErrorResponse {
  nsrpc: number;
  id: string;
  status: Exclude<number, 200>;
  error: Record<string, unknown>;
}

type NSRPCResponseBody = NSRPCSuccesfulResponseBody | NSRPCErrorResponseBody;
type NSRPCSuccesfulResponseBody = Omit<NSRPCSuccesfulResponse, "nsrpc" | "id">;
type NSRPCErrorResponseBody = Omit<NSRPCErrorResponse, "nsrpc" | "id">;

interface PromiseSource {
  resolve: (
    value: unknown
  ) => void;
  reject: (reason?: any) => void;
}
type ClosureTarget = (
  params: Record<string, unknown>
) => Record<string, unknown> | void;

export class NSRPC {
  logMessages = false;
  private readonly send: (data: string) => void;

  private responseHandlers: Map<string, PromiseSource> = new Map();
  private closureTargets: Map<string, ClosureTarget> = new Map();

  constructor(send: (data: string) => void) {
    this.send = send;
  }

  receive(data: string) {
    // TODO: For now we just assume the message is a valid NSRPC message, but we should:
    // - Check if the nsrpc property is set to a number in the range of 1..<2
    // - Validate the message against the defined interfaces above
    let message: NSRPCMessage
    try {
      if (this.logMessages) {
        console.log("< ", data.trimEnd());
      }
      message = JSON.parse(data) as NSRPCMessage;
    } catch (error) {
      if (this.logMessages) {
        console.log("!! Above message is invalid JSON, will be ignored.");
      }
      return;
    }

    if ("status" in message) {
      // This is a response, dispatch it so it can be handled
      const responseHandler = this.responseHandlers.get(message.id);
      this.responseHandlers.delete(message.id);
      if (responseHandler === undefined) {
        // TODO: Got a response for a request we don't know about, log this
        return;
      }

      if ("error" in message) {
        responseHandler.reject(message.error);
      } else {
        responseHandler.resolve(message.result);
      }
    } else {
      // This is a request
      const responseBody = this.handleRequest(message);
      if (responseBody !== undefined) {
        this.sendResponse(message.id, responseBody);
      }
    }
  }

  /* Sending helpers */

  private sendMessage(message: NSRPCMessage) {
    const stringMessage = JSON.stringify(message)
    if (this.logMessages) {
      console.log("> ", stringMessage);
    }
    this.send(stringMessage);
  }

  private sendResponse(id: string | undefined, response: NSRPCResponseBody) {
    if (id === undefined) {
      return;
    }
    this.sendMessage({ ...response, nsrpc: 1, id });
  }

  private async sendRequest(
    request: NSRPCRequestBody
  ): Promise<unknown> {
    const id = "req_" + randomUUID();
    const response = new Promise((resolve, reject) => {
      this.responseHandlers.set(id, { resolve, reject });
    });

    this.sendMessage({ ...request, nsrpc: 1, id });

    return response;
  }

  /* Request handling */

  private handleRequest(request: NSRPCRequest): NSRPCResponseBody | undefined {
    switch (request.procedure) {
      case "init":
        return {
          status: 501,
          error: {
            debugDescription: "Init procedure not implemented.",
            userMessage:
              "Failed to communicate with external process. (Procedure not implemented)",
          },
        };
      case "perform":
        if ("action" in request) {
          return {
            status: 501,
            error: {
              debugDescription:
                "Perform procedure for (static) methods not implemented.",
              userMessage:
                "Failed to communicate with external process. (Procedure not implemented)",
            },
          };
        } else {
          return this.handleClosureRequest(request);
        }
      case "release":
        return {
          status: 501,
          error: {
            debugDescription: "Release procedure not implemented.",
            userMessage:
              "Failed to communicate with external process. (Procedure not implemented)",
          },
        };
    }
  }

  private handleClosureRequest(
    request: NSRPCPerformClosureRequest
  ): NSRPCResponseBody {
    const handler = this.closureTargets.get(request.target);
    if (handler === undefined) {
      return {
        status: 404,
        error: {
          debugDescription: `Perform target '${request.target}' not found.`,
          userMessage:
            "Failed to communicate with external process. (Target not found)",
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
    } catch (error) {
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

  async initialize(args: {
    target: string;
    type: string;
    params?: Record<string, unknown>;
    lifecycle: Object;
  }) {
    const target = args.target
    finalizationRegistry.register(args.lifecycle, async () => {
      await this.release(target);
    });

    await this.sendRequest({
      target: args.target,
      type: args.type,
      params: args.params,
      procedure: "init",
    });
  }

  async perform(body: { // TODO: Add support for static method calls.
    type?: string;
    target?: string;
    action?: string;
    params?: Record<string, unknown>;
  }): Promise<unknown> {
    return await this.sendRequest({
      ...body,
      procedure: "perform",
    } as any);
  }

  private async release(target: string) {
    await this.sendRequest({
      procedure: "release",
      target,
    });
  }

  async manualRelease(target: string) {
    await this.sendRequest({
      procedure: "manual-release",
      target,
    });
  }

  /* Register locally available targets/actions */

  registerClosure(options: {
    handler: ClosureTarget;
    lifecycle: Object;
    prefix: string;
  }): string {
    const target = `target_${options.prefix}_${randomUUID()}`;
    this.closureTargets.set(target, options.handler);

    finalizationRegistry.register(options.lifecycle, () => {
      this.closureTargets.delete(target);
    });

    return target;
  }
}
