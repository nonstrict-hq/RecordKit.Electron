import { ChildProcess, spawn } from 'node:child_process';
import * as readline from 'readline';
import { NSRPC } from "./NonstrictRPC.js";

export class IpcRecordKit {
  private childProcess?: ChildProcess;
  readonly nsrpc: NSRPC;

  constructor() {
    this.nsrpc = new NSRPC((message) => this.write(message));
  }

  async initialize(recordKitRpcPath: string, logMessages: boolean = false): Promise<void> {
    if (this.childProcess !== undefined) { throw new Error('RecordKit: [RPC] Already initialized.') }

    this.nsrpc.logMessages = logMessages;
    this.childProcess = await new Promise<ChildProcess>((resolve, reject) => {
      const childProcess = spawn(recordKitRpcPath, { stdio: ['pipe', 'pipe', logMessages ? 'pipe' : 'ignore'] })
      childProcess.on('close', (code, signal) => { console.error(`RecordKit: [RPC] Closed with code ${code} and signal ${signal}`) })
      childProcess.on('error', (error) => { reject(error) })
      childProcess.on('exit', (code, signal) => { console.error(`RecordKit: [RPC] Exited with code ${code} and signal ${signal}`) })
      childProcess.on('spawn', () => { resolve(childProcess) })
    })

    const { stdout, stderr } = this.childProcess
    if (!stdout) { throw new Error('RecordKit: [RPC] !! No stdout stream on child process.') }

    readline.createInterface({ input: stdout }).on('line', (line) => {
      this.nsrpc.receive(line);
    });

    if (stderr) {
      readline.createInterface({ input: stderr }).on('line', (line) => {
        console.log(`RecordKit: [RPC] Lognoise on stderr: ${line}`);
      });
    }
  }

  private write(message: String) {
    const stdin = this.childProcess?.stdin;
    if (!stdin) { throw new Error('RecordKit: [RPC] !! Missing stdin stream.') }
    stdin.write(message + "\n")
  }
}