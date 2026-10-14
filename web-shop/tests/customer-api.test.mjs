import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Test-only transport/storage fixtures; production modules always call backend APIs.
async function app(fetch) {
  const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) }; };
  const localStorage = storage(), sessionStorage = storage(), events = [], redirects=[];
  const context = vm.createContext({ fetch, localStorage, sessionStorage, Headers, AbortController, FormData, URL, URLSearchParams, Event, crypto, setTimeout, clearTimeout, Date, console, window: { dispatchEvent: e => events.push(e.type),location:{assign:url=>redirects.push(url)} } });
  const modules = new Map();
  async function load(file) {
    file = path.resolve(file); if (modules.has(file)) return modules.get(file);
    const source = (await fs.readFile(file,'utf8')).replace('import.meta.env.VITE_API_URL', JSON.stringify('http://backend.test/api'));
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = new vm.SourceTextModule(code, { context, identifier: file }); modules.set(file,module);
    await module.link((specifier, importing) => load(path.resolve(path.dirname(importing.identifier), `${specifier}.ts`))); return module;
  }
  const auth = await load('src/api/authApi.ts'); await auth.evaluate();
  const order = await load('src/api/orderApi.ts'); await order.evaluate();
  const payment = await load('src/api/paymentApi.ts'); await payment.evaluate();
  const product = await load('src/api/productApi.ts'); await product.evaluate();
  const client = modules.get(path.resolve('src/api/customerClient.ts'));
  const invoice=await load('src/api/salesInvoiceApi.ts');await invoice.evaluate();
  return { invoice:invoice.namespace.issueSalesInvoice,auth: auth.namespace.authApi, order: order.namespace.orderApi, product: product.namespace.productApi, payment: payment.namespace.paymentApi, paymentModule:payment.namespace, client: client.namespace, localStorage, sessionStorage, events, redirects };
}
const json = (body,status=200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
test('VNPAY checkout returns server link and resumes existing session with auth',async()=>{
  const session={provider:'vnpay',environment:'sandbox',paymentId:'payment',orderId:'order',paymentUrl:'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=ref',expiresAt:new Date(Date.now()+60000).toISOString()};
  const calls=[];const a=await app(async(url,opts)=>{calls.push({url,opts});return json(session);});a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});
  assert.equal((await a.order.checkout('order')).paymentUrl,session.paymentUrl);assert.equal((await a.payment.session('order')).paymentId,'payment');assert.ok(calls[1].url.endsWith('/orders/order/payment-session'));assert.equal(calls[1].opts.headers.get('Authorization'),'Bearer token');
});
test('VNPAY redirect permits sandbox host and rejects other hosts or expired links',async()=>{
  const a=await app(async()=>json({}));const session={provider:'vnpay',environment:'sandbox',paymentUrl:'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=ref',expiresAt:new Date(Date.now()+60000).toISOString()};
  assert.equal(a.paymentModule.redirectToPayment(session),true);assert.equal(a.redirects.length,1);
  assert.throws(()=>a.paymentModule.redirectToPayment({...session,paymentUrl:'https://attacker.test/payment'}),/không hợp lệ/);assert.throws(()=>a.paymentModule.redirectToPayment({...session,expiresAt:'2020-01-01'}),/hết hạn/);assert.equal(a.paymentModule.redirectToPayment({...session,provider:'mock'}),false);
});
test('VNPAY return verification is public read-only and owner lookup is authenticated',async()=>{
  const calls=[];const a=await app(async(url,opts)=>{calls.push({url,opts});return url.includes('/vnpay/return?')?json({paymentId:'payment',gatewayResult:'SUCCESS',environment:'sandbox'}):json({id:'order',payment:{status:'pending'}});});a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});
  const verified=await a.payment.verifyReturn(new URLSearchParams({vnp_TxnRef:'ref',vnp_SecureHash:'signed-result'}));const order=await a.payment.orderForPayment(verified.paymentId);
  assert.equal(calls[0].opts.headers.get('Authorization'),null);assert.equal(calls[0].opts.method,undefined);assert.ok(calls[1].url.endsWith('/customer/orders/by-payment/payment'));assert.equal(calls[1].opts.headers.get('Authorization'),'Bearer token');assert.equal(order.payment.status,'pending');
});
test('sandbox labeling is distinct from mock and always declares test payments',async()=>{
  const a=await app(async()=>json({}));assert.match(a.paymentModule.paymentLabel({provider:'vnpay',environment:'sandbox',isSimulated:true}),/VNPAY Sandbox/);assert.match(a.paymentModule.paymentLabel({provider:'mock',environment:'mock',isSimulated:true}),/Giả lập/);
});
test('login uses real backend session and reloads profile instead of cached mock identity', async () => {
  const calls=[]; const a=await app(async (url,opts) => { calls.push({url,opts}); return url.endsWith('/auth/login') ? json({ accessToken:'verified-token',refreshToken:'refresh',expiresIn:3600,role:'customer' }) : json({ id:'customer-id',fullName:'Khách thật',email:'real@test.local' }); });
  a.localStorage.setItem('smartbox_shop_user', JSON.stringify({id:'fake-user'}));
  const result=await a.auth.login({email:'real@test.local',password:'password-123'});
  assert.equal(result.user.id,'customer-id');assert.equal(calls[1].opts.headers.get('Authorization'),'Bearer verified-token');
});
test('two simultaneous requests renew expired session only once', async () => {
  let renewals=0; const tokens=[]; const a=await app(async (url,opts) => {
    if (url.endsWith('/auth/refresh-token')) { renewals++; await new Promise(resolve => setTimeout(resolve,5)); return json({accessToken:'new-token',refreshToken:'new-refresh',expiresIn:3600}); }
    tokens.push(opts.headers.get('Authorization'));return json({id:'customer'});
  });
  a.localStorage.setItem('smartbox_shop_token','old-token');a.localStorage.setItem('smartbox_shop_refresh_token','old-refresh');a.localStorage.setItem('smartbox_shop_token_expires','1');
  await Promise.all([a.client.customerRequest('/customer/profile'),a.client.customerRequest('/customer/addresses')]);assert.equal(renewals,1);assert.deepEqual(tokens,['Bearer new-token','Bearer new-token']);
});
test('unauthorized response clears session; network failure never produces mock success', async () => {
  const a=await app(async () => json({message:'expired'},401));a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});
  await assert.rejects(a.auth.getCurrentUser(), /expired/);assert.equal(a.localStorage.getItem('smartbox_shop_token'),null);assert.ok(a.events.includes('smartbox:session-ended'));
  const b=await app(async () => { throw new Error('offline'); });b.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});await assert.rejects(b.auth.updateProfile({fullName:'Changed',phone:''}), /Chưa nhận được kết quả/);
});
test('registration waits for confirmation without creating a local authenticated session', async () => {
  const a=await app(async () => json({message:'Kiểm tra email',requiresLogin:true}));assert.equal(await a.auth.register({email:'a@b.local',password:'password-123',confirmPassword:'password-123',fullName:'Khách',phone:''}),'Kiểm tra email');assert.equal(a.localStorage.getItem('smartbox_shop_token'),null);
});
test('order creation sends variant quantities and address source, never client prices or totals', async () => {
  let body;const a=await app(async (_,opts) => { body=JSON.parse(opts.body);return json({id:'order',status:'pending',total:1000,shippingAddressSnapshot:{recipientName:'Người nhận',phone:'0912345678',addressLine:'Địa chỉ đã chụp'},items:[]}); });
  a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});
  const order=await a.order.createOrder({addressId:'owned-address',items:[{productId:'product',variantId:'variant',quantity:2,price:1,sku:'sku',name:'name',image:''}],shippingAddress:{fullName:'Khách',phone:'0912345678',email:'a@b.local',address:'Địa chỉ'},paymentMethod:'BANK_TRANSFER'});
  assert.deepEqual(body,{addressId:'owned-address',items:[{variantId:'variant',quantity:2}]});assert.equal(order.shippingAddress.address,'Địa chỉ đã chụp');
});
test('checkout retries reuse same key and preserve backend conflict', async () => {
  const keys=[];const a=await app(async (_,opts) => { keys.push(opts.headers.get('Idempotency-Key'));return json({message:'ORDER_NOT_EDITABLE'},409); });a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});
  await assert.rejects(a.order.checkout('order-id'),/ORDER_NOT_EDITABLE/);await assert.rejects(a.order.checkout('order-id'),/ORDER_NOT_EDITABLE/);assert.equal(keys[0],keys[1]);assert.ok(keys[0]);
});
test('refund projection keeps true payment state and simulated mode without turning it into paid', async () => {
  const a=await app(async () => json({id:'order',status:'cancelled',total:1000,paidAt:'2026-10-14T00:00:00Z',items:[],payment:{id:'payment',provider:'mock',status:'refund_required',isSimulated:true,amount:1000,refund:{status:'PENDING',amount:1000}}}));
  a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});const order=await a.order.getOrderById('order');assert.equal(order.payment.status,'refund_required');assert.equal(order.payment.refund.status,'PENDING');assert.equal(order.payment.isSimulated,true);
});
test('demo action calls authenticated backend and never fabricates the result locally', async () => {
  let route,authorization;const a=await app(async (url,opts) => { route=url;authorization=opts.headers.get('Authorization');return json({message:'demo disabled'},404); });
  a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});await assert.rejects(a.payment.simulate('payment','SUCCESS'),/demo disabled/);assert.equal(route,'http://backend.test/api/mock-payment/payments/payment/complete?result=SUCCESS');assert.equal(authorization,'Bearer token');
});
test('customer detail keeps aggregated timeline without separate frontend joins', async () => {
  let calls=0;const a=await app(async () => { calls++;return json({id:'order',status:'confirmed',total:1000,items:[],timeline:[{id:'ORDER:1',source:'ORDER',action:'paid',occurredAt:'2026-10-14T00:00:00Z'},{id:'PO_TICKET:2',source:'PO_TICKET',action:'APPROVE',occurredAt:'2026-10-14T00:01:00Z'}]}); });a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});const order=await a.order.getOrderById('order');assert.equal(calls,1);assert.equal(order.timeline.length,2);assert.equal(order.timeline[1].source,'PO_TICKET');
});
test('catalog uses variant pictures and dimensions and leaves unknown measurements absent', async () => {
  const a=await app(async () => json([{id:'product',name:'SmartBox',price:1000,isActive:true,images:['/parent.png'],hasWeightSensor:false,variants:[{id:'variant',sku:'PRO-M',variantName:'M',isActive:true,stockQuantity:3,priceDelta:0,modelTier:'PRO',hasWeightSensor:true,capacityLiter:85,widthCm:32.5,heightCm:null,images:['/variant.png'],warrantyMonths:24}]}]));
  const rows=await a.product.getProducts();assert.equal(rows[0].images[0],'/variant.png');assert.equal(rows[0].dimensions.width,32.5);assert.equal(rows[0].dimensions.height,0);assert.equal(rows[0].warrantyMonths,24);assert.equal(rows[0].features[0].title,'Có cảm biến trọng lượng');assert.ok(rows[0].specs.some(s=>s.value==='85 L'));
});

test('customer invoice requires session and preserves owner rejection',async()=>{
 const calls=[];const a=await app(async(url,opts)=>{calls.push({url,opts});return json({invoiceNumber:'SB-TEST',html:'<html>Invoice</html>'});});
 await assert.rejects(a.invoice('order-id'),/đăng nhập/);assert.equal(calls.length,0);
 a.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});assert.equal((await a.invoice('order-id')).invoiceNumber,'SB-TEST');assert.ok(calls[0].url.endsWith('/orders/order-id/sales-invoice'));assert.equal(calls[0].opts.headers.get('Authorization'),'Bearer token');assert.equal(calls[0].opts.method,'POST');
 const denied=await app(async()=>json({message:'FORBIDDEN'},403));denied.client.saveSession({accessToken:'token',refreshToken:'refresh',expiresIn:3600});await assert.rejects(denied.invoice('other-order'),/FORBIDDEN/);
});
