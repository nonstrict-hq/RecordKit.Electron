import { NSRPC, NSRPCPerformClosureRequest } from './NonstrictRPC.js';
import v8 from 'v8';

// const finalizationRegistry = new FinalizationRegistry(async (destructor) => { console.log('==> ', destructor) })

// finalizationRegistry.register({}, 'CHECK');
// eval('%CollectGarbage(true)');

describe('NonstrictRPC', () => {
    describe('terminate', () => {
        it('rejects all in-flight requests', async () => {
            const rpc = new NSRPC(() => { });
            const pending = rpc.perform({ type: 'Recorder', action: 'getDisplays' });
            rpc.terminate(new Error('RPC process is gone'));
            await expect(pending).rejects.toThrow('RPC process is gone');
        });

        it('fails future requests immediately instead of letting them hang', async () => {
            const rpc = new NSRPC(() => { });
            rpc.terminate(new Error('RPC process is gone'));
            await expect(rpc.perform({ type: 'Recorder', action: 'getDisplays' })).rejects.toThrow('RPC process is gone');
        });

        it('does not affect requests that already completed', async () => {
            const sent: string[] = [];
            const rpc = new NSRPC((data) => sent.push(data));
            const pending = rpc.perform({ type: 'Recorder', action: 'getDisplays' });
            const request = JSON.parse(sent[0]);
            rpc.receive(JSON.stringify({ nsrpc: 1, id: request.id, status: 200, result: ['display'] }));
            await expect(pending).resolves.toEqual(['display']);
            rpc.terminate(new Error('RPC process is gone'));
        });
    });

//     beforeAll(() => {
//         v8.setFlagsFromString('--allow-natives-syntax');
//     });

//     describe('initialize', () => {
//         it('sends init request w/parameters', (done) => {
//             const rpc = new NSRPC((data) => {
//                 const message = JSON.parse(data)
//                 expect(message).toMatchSnapshot({ id: expect.any(String) });
//                 done()
//             });

//             rpc.initialize({
//                 target: 'TheTarget',
//                 type: 'TheType',
//                 params: { aParameter: 'TheValue' },
//                 lifecycle: {}
//             });
//         });

//         it('sends init request w/o parameters', (done) => {
//             const rpc = new NSRPC((data) => {
//                 const message = JSON.parse(data)
//                 expect(message).toMatchSnapshot({ id: expect.any(String) });
//                 done()
//             });

//             rpc.initialize({
//                 target: 'TheTarget',
//                 type: 'TheType',
//                 lifecycle: {}
//             });
//         });

//         it('sends release request', async () => {
//             const rpc = new NSRPC((data) => {
//                 const message = JSON.parse(data)
//                 console.log(message)
//                 // if (message.procedure === 'release') {
//                 //     expect(message).toMatchSnapshot({ id: expect.any(String) });
//                 //     done()
//                 // }
//             });

//             async function scope() {
//                 const foo = {}
//                await rpc.initialize({
//                     target: 'TheTarget',
//                     type: 'TheType',
//                     lifecycle: foo   
//                 }); 
//                 finalizationRegistry.register(foo, 'CHECK');
//             }

//             await scope();
//             eval("%CollectGarbage(true)");
//         });
//     });

//     describe('registerClosure', () => {
//         it('should do something', (done) => {
//             const rpc = new NSRPC((data) => {
//                 expect(JSON.parse(data)).toStrictEqual({status:200,result:{test:"test"},nsrpc:1,id:"req_id"})
//                 done()
//             });

//             const target = rpc.registerClosure({
//                 handler: (params) => { params },
//                 prefix: 'test',
//                 lifecycle: {}
//             });

//             const rpcMessage: NSRPCPerformClosureRequest = {
//                 nsrpc: 1,
//                 id: 'req_id',
//                 procedure: 'perform',
//                 target,
//                 params: { test: 'test' }
//             }
//             rpc.receive(JSON.stringify(rpcMessage));
//         });x
//     });

//     function timeout(ms: number) {
//         return new Promise<void>(resolve => setTimeout(resolve, ms));
//       }
});