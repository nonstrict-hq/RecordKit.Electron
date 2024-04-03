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
            throw new Error('RecordKit RPC: Already initialized.');
        }
        this.nsrpc.logMessages = logMessages;
        this.childProcess = await new Promise((resolve, reject) => {
            const childProcess = spawn(recordKitRpcPath);
            childProcess.on('spawn', () => { resolve(childProcess); });
            childProcess.on('error', (error) => { reject(error); });
        });
        const { stdout } = this.childProcess;
        if (!stdout) {
            throw new Error('RecordKit RPC: No stdout stream on child process.');
        }
        readline.createInterface({ input: stdout }).on('line', (line) => {
            this.nsrpc.receive(line);
        });
    }
    write(message) {
        const stdin = this.childProcess?.stdin;
        if (!stdin) {
            throw new Error('RecordKit RPC: Missing stdin stream.');
        }
        stdin.write(message + "\n");
    }
}
//# sourceMappingURL=IpcRecordKit.js.map