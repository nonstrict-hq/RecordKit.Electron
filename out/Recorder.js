import { randomUUID } from "crypto";
import { EventEmitter } from "stream";
/**
 * @group Recording
 */
export class Recorder extends EventEmitter {
    rpc;
    target;
    /** @ignore */
    static async newInstance(rpc, schema) {
        const target = 'Recorder_' + randomUUID();
        const object = new Recorder(rpc, target);
        schema.items.forEach(item => {
            if (item.type == 'webcam') {
                if (typeof item.camera != 'string') {
                    item.camera = item.camera.id;
                }
                if (typeof item.microphone != 'string') {
                    item.microphone = item.microphone.id;
                }
            }
            if (item.type == 'windowBasedCrop') {
                if (typeof item.window != 'number') {
                    item.window = item.window.id;
                }
            }
            if (item.type == 'appleDeviceStaticOrientation') {
                if (typeof item.device != 'string') {
                    item.device = item.device.id;
                }
            }
        });
        const weakRefObject = new WeakRef(object);
        const onAbortInstance = rpc.registerClosure({
            handler: (params) => { weakRefObject.deref()?.emit('abort', params.reason); },
            prefix: 'Recorder.onAbort',
            lifecycle: object
        });
        await rpc.initialize({
            target,
            type: 'Recorder',
            params: { schema, onAbortInstance },
            lifecycle: object
        });
        return object;
    }
    /** @ignore */
    constructor(rpc, target) {
        super();
        this.rpc = rpc;
        this.target = target;
    }
    async prepare() {
        await this.rpc.perform({ target: this.target, action: 'prepare' });
    }
    async start() {
        await this.rpc.perform({ target: this.target, action: 'start' });
    }
    async stop() {
        return await this.rpc.perform({ target: this.target, action: 'stop' });
    }
}
//# sourceMappingURL=Recorder.js.map