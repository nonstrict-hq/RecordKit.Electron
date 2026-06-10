import { spawn } from 'node:child_process';
import * as readline from 'readline';
import { NSRPC } from "./NonstrictRPC.js";
export class IpcRecordKit {
    childProcess;
    nsrpc;
    constructor() {
        this.nsrpc = new NSRPC((message) => this.write(message));
    }
    async initialize(recordKitRpcPath, logMessages = false) {
        if (this.childProcess !== undefined) {
            throw new Error('RecordKit: [RPC] Already initialized.');
        }
        this.nsrpc.logMessages = logMessages;
        this.childProcess = await new Promise((resolve, reject) => {
            const childProcess = spawn(recordKitRpcPath, { stdio: ['pipe', 'pipe', logMessages ? 'pipe' : 'ignore'] });
            childProcess.on('close', (code, signal) => { console.error(`RecordKit: [RPC] Closed with code ${code} and signal ${signal}`); });
            childProcess.on('error', (error) => { reject(error); });
            childProcess.on('exit', (code, signal) => { console.error(`RecordKit: [RPC] Exited with code ${code} and signal ${signal}`); });
            childProcess.on('spawn', () => { resolve(childProcess); });
        });
        this.childProcess.on('close', (code, signal) => {
            // No response can arrive anymore; fail all in-flight and future requests instead of letting
            // them hang forever.
            this.nsrpc.terminate(new Error(`RecordKit: [RPC] Process is gone (closed with code ${code} and signal ${signal}).`));
        });
        this.childProcess.stdin?.on('error', (error) => {
            // Without an error listener, a failed write to a dead process would crash Node with an
            // unhandled 'error' event. The 'close' handler above already fails all requests.
            console.error(`RecordKit: [RPC] !! Failed to write to RPC process: ${error}`);
        });
        const { stdout, stderr } = this.childProcess;
        if (!stdout) {
            throw new Error('RecordKit: [RPC] !! No stdout stream on child process.');
        }
        readline.createInterface({ input: stdout }).on('line', (line) => {
            this.nsrpc.receive(line);
        });
        if (stderr) {
            readline.createInterface({ input: stderr }).on('line', (line) => {
                console.log(`RecordKit: [RPC] Lognoise on stderr: ${line}`);
            });
        }
    }
    write(message) {
        const stdin = this.childProcess?.stdin;
        if (!stdin) {
            throw new Error('RecordKit: [RPC] !! Missing stdin stream.');
        }
        if (stdin.destroyed) {
            throw new Error('RecordKit: [RPC] !! Process is gone, cannot write to its stdin.');
        }
        stdin.write(message + "\n");
    }
}
//# sourceMappingURL=IpcRecordKit.js.map