import { NSRPC, NSRPCPerformClosureRequest } from './NonstrictRPC.js';
import v8 from 'v8';

// const finalizationRegistry = new FinalizationRegistry(async (destructor) => { console.log('==> ', destructor) })

// finalizationRegistry.register({}, 'CHECK');
// eval('%CollectGarbage(true)');

describe('NonstrictRPC', () => {
    it('needs tests', () => { });

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