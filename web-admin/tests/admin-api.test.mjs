import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

async function app(fetch) {
 const events=[];const context=vm.createContext({fetch,Headers,AbortController,FormData,URLSearchParams,setTimeout,clearTimeout,Date,console,window:{dispatchEvent:e=>events.push(e.type)},CustomEvent:class {constructor(type){this.type=type;}}});
 const modules=new Map();
 async function load(file){file=path.resolve(file);if(modules.has(file))return modules.get(file);
  if(file.endsWith('supabase.ts')){const module=new vm.SyntheticModule(['supabase'],function(){this.setExport('supabase',{auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})},from:()=>{throw new Error('Browser database access forbidden');}});},{context,identifier:file});modules.set(file,module);return module;}
  const source=(await fs.readFile(file,'utf8')).replace('import.meta.env.VITE_BACKEND_API_URL',JSON.stringify('http://backend.test/api'));
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
  const module=new vm.SourceTextModule(code,{context,identifier:file});modules.set(file,module);await module.link((specifier,importing)=>load(path.resolve(path.dirname(importing.identifier),specifier+'.ts')));return module;
 }
 const api=await load('src/services/api.ts');await api.evaluate();const catalog=await load('src/services/adminCatalogApi.ts');await catalog.evaluate();
 const dashboard=await load('src/services/concurrentDashboardApi.ts');await dashboard.evaluate();
 const invoice=await load('src/services/salesInvoiceApi.ts');await invoice.evaluate();
 return {invoice:invoice.namespace.issueSalesInvoice,dashboard:dashboard.namespace.getConcurrentDashboard,api:api.namespace,catalog:catalog.namespace.adminCatalogApi,request:modules.get(path.resolve('src/services/adminRequest.ts')).namespace.adminRequest,events};
}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('empty backend lists stay empty; no demonstration claims or templates',async()=>{
 const a=await app(async()=>json([]));for(const rows of [await a.api.warrantiesService.getClaims(),await a.api.templatesService.getTemplates(),await a.api.usersService.getUsers()])assert.equal(rows.length,0);
});
test('403 stops mutations and preserves the backend error',async()=>{
 let calls=0;const a=await app(async()=>{calls++;return json({message:'FORBIDDEN'},403);});
 await assert.rejects(a.api.productsService.updateProduct('product',{name:'New'}),/FORBIDDEN/);assert.equal(calls,1);
});
test('204 deletes succeed without parsing an empty body or fallback',async()=>{
 let calls=0;const a=await app(async()=>{calls++;return new Response(null,{status:204});});
 assert.equal((await a.api.productsService.deleteProduct('product')).success,true);assert.equal(calls,1);
});
test('catalog edits omit absolute stock for existing variants',async()=>{
 let payload;const a=await app(async(url,opts)=>{payload=JSON.parse(opts.body);return json({id:'product'});});
 await a.api.productsService.updateProduct('product',{stock_quantity:999,variants:[{id:'variant',sku:'SKU',variant_name:'M',stock_quantity:999}]});
 assert.equal('stockQuantity' in payload,false);assert.equal('stockQuantity' in payload.variants[0],false);
});
test('multipart upload retains browser boundary and sends auth',async()=>{
 const a=await app(async(url,opts)=>{assert.equal(opts.headers.get('Content-Type'),null);assert.equal(opts.headers.get('Authorization'),'Bearer test-token');assert.ok(opts.body instanceof FormData);return json({id:'image'});});
 const form=new FormData();form.append('file',new Blob(['test']),'photo.png');await a.request('/products/images',{method:'POST',body:form});
});
test('user and order filtering is sent with pagination to backend',async()=>{
 const urls=[];const a=await app(async url=>{urls.push(new URL(url));return json({content:[],totalPages:0,totalElements:0,currentPage:0});});
 await a.catalog.users(2,'Nguyễn%','customer','locked');await a.catalog.orders(3,'Order','processing','paid');
 assert.equal(urls[0].searchParams.get('search'),'Nguyễn%');assert.equal(urls[0].searchParams.get('page'),'2');assert.equal(urls[0].searchParams.get('locked'),'true');assert.equal(urls[1].searchParams.get('status'),'processing');assert.equal(urls[1].searchParams.get('payment'),'paid');
});
test('401 expires session and failed stock adjustment never reports success',async()=>{
 const a=await app(async()=>json({message:'EXPIRED'},401));await assert.rejects(a.api.productsService.updateStock('product',1),/EXPIRED/);assert.deepEqual(a.events,['smartbox:auth-expired']);
});
test('technician assignment uses the dedicated backend action',async()=>{
 const calls=[];const a=await app(async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return json({id:'claim'});});
 await a.api.warrantiesService.assignTechnician('claim','tech');assert.ok(calls[0].url.endsWith('/warranties/claims/claim/assign'));assert.equal(calls[0].body.technicianId,'tech');
});

test('dashboard preserves partial nulls and sends date/mode without caching',async()=>{
 const urls=[];const a=await app(async url=>{urls.push(new URL(url));return json({date:'2026-10-07',revenueToday:0,orderCountByStatus:{PAID:0},top5Variants:null,lowStockVariants:[],partial:true,failedParts:['top5Variants'],elapsedMs:1500,demo:true,mode:'parallel'});});
 const result=await a.dashboard('2026-10-07');assert.equal(result.top5Variants,null);assert.equal(result.revenueToday,0);assert.equal(result.partial,true);
 await a.dashboard('2026-10-07','sequential');assert.equal(urls.length,2);assert.equal(urls[0].pathname,'/api/admin/dashboard');assert.equal(urls[0].searchParams.get('date'),'2026-10-07');assert.equal(urls[1].searchParams.get('mode'),'sequential');
});
test('dashboard overload is surfaced without synthetic zeros or database fallback',async()=>{
 const a=await app(async()=>json({message:'DASHBOARD_BUSY'},503));await assert.rejects(a.dashboard('2026-10-07'),/DASHBOARD_BUSY/);
});

test('sales invoice uses authenticated backend POST and surfaces issuance errors',async()=>{
 let calls=[];const a=await app(async(url,opts)=>{calls.push({url,opts});return json({invoiceNumber:'SB-TEST',html:'<html>Invoice</html>'});});
 const invoice=await a.invoice('order-id');assert.equal(invoice.invoiceNumber,'SB-TEST');assert.ok(calls[0].url.endsWith('/orders/order-id/sales-invoice'));assert.equal(calls[0].opts.method,'POST');assert.equal(calls[0].opts.headers.get('Authorization'),'Bearer test-token');
 const failed=await app(async()=>json({message:'INVOICE_REQUIRES_PAID_ORDER'},409));await assert.rejects(failed.invoice('order-id'),/INVOICE_REQUIRES_PAID_ORDER/);
});
