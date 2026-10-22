import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const shopUrl = url(compile(readFileSync(new URL('../src/api/shop.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '{}')));
const shop = await import(shopUrl);
const load = async name => import(url(compile(readFileSync(new URL(`../src/api/${name}.ts`, import.meta.url), 'utf8')).replaceAll("'./shop'", JSON.stringify(shopUrl))));
const {commerce,checkoutAction,canSubmitQuote} = await load('commerce');
const {paymentApi,paymentDestination} = await load('payment');
const {customer} = await load('customer');
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{storage.clear();shop.saveSession({userId:'test',accessToken:'test-token'});});
test('approval-before-payment: pending and partial decisions cannot checkout',()=>{
 for(const status of ['pending','customer_decision_pending','paid','confirmed','completed','cancelled']) assert.equal(checkoutAction({status,payment:null}),'blocked');
 assert.equal(checkoutAction({status:'awaiting_payment',payment:null}),'create');
 assert.equal(checkoutAction({status:'awaiting_payment',payment:{status:'pending'}}),'resume');
});
test('quote submission rejects stock, invalid vouchers, zero, NaN and empty items',()=>{
 const valid={finalTotal:100,itemDetails:[{quantity:1,inStock:true}],voucherApplied:false};
 assert.equal(canSubmitQuote(valid),true); assert.equal(canSubmitQuote(valid,'CODE'),false);
 for(const finalTotal of [0,-1,NaN,Infinity]) assert.equal(canSubmitQuote({...valid,finalTotal}),false);
 assert.equal(canSubmitQuote({...valid,itemDetails:[]}),false);
 assert.equal(canSubmitQuote({...valid,itemDetails:[{quantity:100,inStock:true}]}),false);
 assert.equal(canSubmitQuote({...valid,itemDetails:[{quantity:1,inStock:false}]}),false);
});
test('pricing sends only SKU quantities and voucher, without bearer or client prices',async()=>{
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/pricing/calculate'));assert.equal(options.headers.get('Authorization'),null);assert.deepEqual(JSON.parse(options.body),{items:[{variantId:'sku',quantity:2}],voucherCode:'SAVE'});return json({finalTotal:90});};
 assert.equal((await commerce.pricing([{variantId:'sku',quantity:2}],' SAVE ')).finalTotal,90);
});
test('order uses couponCode while pricing uses voucherCode',async()=>{
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/orders'));assert.deepEqual(JSON.parse(options.body),{addressId:'address',items:[{variantId:'sku',quantity:1}],couponCode:'SAVE'});return json({id:'order'});};
 await customer.createOrder({addressId:'address'},[{variantId:'sku',quantity:1}],'SAVE');
});
test('partial decision is owner POST with boolean; no local paid state',async()=>{
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/orders/order/customer-decision'));assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{accept:false});return json({status:'cancelled'});};
 assert.equal((await commerce.decision('order',false)).status,'cancelled');
});
test('payment resume is GET and checkout preserves idempotency',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options.method,options.headers.get('Idempotency-Key')]);return json({});};
 await paymentApi.session('order');await paymentApi.checkout('order','same-key');await paymentApi.checkout('order','same-key');
 assert.ok(calls[0][0].endsWith('/payment-session'));assert.equal(calls[0][1],undefined);assert.equal(calls[1][2],calls[2][2]);
});
test('payment redirect rejects external, insecure and credential-bearing URLs',()=>{
 const base={provider:'vnpay',environment:'sandbox',paymentUrl:'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'};
 assert.equal(paymentDestination(base),base.paymentUrl);
 for(const paymentUrl of ['https://evil.example/','http://sandbox.vnpayment.vn/','https://user@sandbox.vnpayment.vn/','https://sandbox.vnpayment.vn.evil.example/']) assert.throws(()=>paymentDestination({...base,paymentUrl}));
});
test('customer invoice API is read-only and has no issuance method',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options.method]);return json({html:'invoice'});};
 await paymentApi.invoice('order');assert.equal(calls[0][1],undefined);assert.equal(calls.length,1);assert.equal('issueInvoice' in paymentApi,false);
});
test('errors preserve 400/403/404/409/422/500 instead of successful mock results',async()=>{
 for(const status of [400,403,404,409,422,500]) {globalThis.fetch=async()=>json({message:'Backend refused'},status);await assert.rejects(commerce.decision('order',true),e=>e.status===status);}
});
