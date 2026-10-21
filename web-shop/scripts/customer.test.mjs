import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const shopUrl = url(compile(readFileSync(new URL('../src/api/shop.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '{}')));
const shop = await import(shopUrl);
const { customer, claimPage, warrantyEligible } = await import(url(compile(readFileSync(new URL('../src/api/customer.ts', import.meta.url), 'utf8')).replace("'./shop'", JSON.stringify(shopUrl))));
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { storage.clear(); shop.saveSession({ userId: 'owner', accessToken: 'test-token' }); });
test('registration and recovery omit current bearer and do not install a session', async () => {
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.get('Authorization'), null); if (url.endsWith('/reset-password')) assert.deepEqual(JSON.parse(options.body), { tokenHash: 'proof', newPassword: 'new-password' }); return json({ message: 'Check your email', requiresLogin: true }); };
  await customer.register({ email: 'test@example.invalid', password: 'test-password', fullName: 'Test' });
  await customer.forgot('test@example.invalid'); await customer.reset('proof', 'new-password'); assert.equal(shop.session().accessToken, 'test-token');
});
test('saved address draft carries only the address ID and item quantities', async () => {
  globalThis.fetch = async (_url, options) => { assert.deepEqual(JSON.parse(options.body), { addressId: 'address-a', items: [{ variantId: 'sku-a', quantity: 2 }] }); return json({ id: 'order-a' }); };
  await customer.createOrder({ addressId: 'address-a' }, [{ variantId: 'sku-a', quantity: 2 }]);
});
test('customer order pagination and legacy claim pagination remain distinct', async () => {
  globalThis.fetch = async url => { assert.match(url, /customer\/orders\?page=2&size=20$/); return json({ content: [], page: 2, size: 20, totalElements: 40, totalPages: 2 }); };
  assert.equal((await customer.orders(2)).page, 2);
  assert.deepEqual(claimPage({ content: [], currentPage: 3, pageSize: 20, totalElements: 60, totalPages: 3 }), { content: [], page: 3, size: 20, totalElements: 60, totalPages: 3 });
});
test('claim images use multipart without JSON header and claim retries keep their key', async () => {
  const keys = [];
  globalThis.fetch = async (url, options) => { if (url.endsWith('/images')) { assert.equal(options.headers.get('Content-Type'), null); assert.ok(options.body instanceof FormData); assert.equal(options.body.get('file').name, 'test.png'); return json({ id: 'image-a', url: 'https://example.invalid/test.png' }); } keys.push(options.headers.get('Idempotency-Key')); assert.deepEqual(JSON.parse(options.body), { warrantyId: 'warranty-a', description: 'Device problem', imageIds: ['image-a'] }); return json({ id: 'claim-a' }); };
  await customer.uploadImage('warranty-a', new File(['image'], 'test.png', { type: 'image/png' }));
  await customer.createClaim('warranty-a', 'Device problem', ['image-a'], 'stable-key'); await customer.createClaim('warranty-a', 'Device problem', ['image-a'], 'stable-key'); assert.deepEqual(keys, ['stable-key', 'stable-key']);
});
test('warranty eligibility requires active status and a current date within both bounds', () => {
  assert.equal(warrantyEligible({ status: 'active', startDate: '2000-01-01', endDate: '2099-12-31' }), true);
  assert.equal(warrantyEligible({ status: 'expired', startDate: '2000-01-01', endDate: '2099-12-31' }), false);
  assert.equal(warrantyEligible({ status: 'active', startDate: '2000-01-01', endDate: '2001-01-01' }), false);
  assert.equal(warrantyEligible({ status: 'active', startDate: '2098-01-01', endDate: '2099-12-31' }), false);
});
