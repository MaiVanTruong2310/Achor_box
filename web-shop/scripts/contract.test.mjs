import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };
const source = readFileSync(new URL('../src/api/shop.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '{}');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const identity = { userId: 'customer-a', fullName: 'Test', email: 'test@example.invalid', role: 'customer', accessToken: 'test-access', refreshToken: 'test-refresh' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { storage.clear(); api.saveSession(identity); });
test('public catalog omits stale bearer and preserves successful empty data', async () => {
  globalThis.fetch = async (_url, options) => { assert.equal(options.headers.get('Authorization'), null); return json([]); };
  assert.deepEqual(await api.shop.products(), []);
});
test('variants map calculatedPrice without inventing nullable capacity', async () => {
  globalThis.fetch = async () => json([{ id: 'sku-a', calculatedPrice: 1250000, size: null, capacityLiter: null }]);
  const [variant] = await api.shop.variants('product-a');
  assert.equal(variant.finalPrice, 1250000); assert.equal(variant.capacityLiter, null); assert.equal(variant.productId, 'product-a');
});
test('draft sends only address, variant UUID and quantity with bearer', async () => {
  globalThis.fetch = async (_url, options) => { assert.equal(options.headers.get('Authorization'), 'Bearer test-access'); assert.deepEqual(JSON.parse(options.body), { shippingAddress: 'Test address', items: [{ variantId: 'sku-a', quantity: 2 }] }); return json({ id: 'draft-a', status: 'pending', total: 2500000 }, 201); };
  assert.equal((await api.shop.create('Test address', [{ variantId: 'sku-a', quantity: 2 }])).status, 'pending');
});
test('checkout preserves the same idempotency key and has no body', async () => {
  const keys = []; globalThis.fetch = async (_url, options) => { keys.push(options.headers.get('Idempotency-Key')); assert.equal(options.body, undefined); return json({ orderId: 'order-a' }); };
  await api.shop.checkout('order-a', 'stable-key'); await api.shop.checkout('order-a', 'stable-key'); assert.deepEqual(keys, ['stable-key', 'stable-key']);
});
test('void success is accepted and validation errors retain status and fields', async () => {
  globalThis.fetch = async () => new Response(null, { status: 200 }); assert.equal(await api.request('/notifications/a/read', { method: 'PATCH' }), undefined);
  globalThis.fetch = async () => json({ message: 'Invalid quantity', data: { quantity: '1–99' } }, 400);
  await assert.rejects(api.request('/orders/a'), error => error.status === 400 && error.fields.quantity === '1–99');
});
test('concurrent expired-token GET requests perform a single refresh', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh-token')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return json({ accessToken: 'new-access', refreshToken: 'new-refresh' }); }
    return options.headers.get('Authorization') === 'Bearer new-access' ? json([]) : json({ message: 'Expired' }, 401);
  };
  await Promise.all([api.shop.orders(), api.shop.devices()]); assert.equal(refreshes, 1);
});
test('unauthorized mutation refreshes session but never automatically replays', async () => {
  let mutations = 0; globalThis.fetch = async url => { if (url.endsWith('/auth/refresh-token')) return json({ accessToken: 'new-access' }); mutations++; return json({ message: 'Expired' }, 401); };
  await assert.rejects(api.shop.create('Test address', [{ variantId: 'sku-a', quantity: 1 }]), error => error.status === 401); assert.equal(mutations, 1);
});
test('network failure does not retry draft POST or return fixtures', async () => {
  let count = 0; globalThis.fetch = async () => { count++; throw new TypeError('Offline'); };
  await assert.rejects(api.shop.create('Test address', [{ variantId: 'sku-a', quantity: 1 }]), error => error.status === 0); assert.equal(count, 1);
});
test('logout clears local identity even when provider is unavailable', async () => {
  globalThis.fetch = async () => { throw new TypeError('Offline'); }; await assert.rejects(api.shop.logout()); assert.equal(api.session(), null);
});
test('late refresh cannot restore identity after logout', async () => {
  let finish; globalThis.fetch = async url => url.endsWith('/auth/refresh-token') ? new Promise(resolve => { finish = () => resolve(json({ accessToken: 'late-token' })); }) : json({ message: 'Expired' }, 401);
  const pending = api.shop.orders(); while (!finish) await new Promise(resolve => setTimeout(resolve, 0)); api.clearSession(); finish(); await assert.rejects(pending); assert.equal(api.session(), null);
});
test('money and time formatting preserve null, zero and Vietnamese local timestamps', () => {
  assert.equal(api.money(null), 'Chưa có giá'); assert.notEqual(api.money(0), 'Chưa có giá');
  assert.equal(api.date('2026-10-14T08:00:00'), api.date('2026-10-14T08:00:00+07:00'));
});
test('viewer without WebGL exposes diagram and disables camera controls', () => {
  const elements = new Map(); const element = () => ({ hidden: false, disabled: false, setAttribute() {}, addEventListener() {}, classList: { add() {}, toggle() {} }, getContext: () => null });
  for (const id of ['product-canvas', 'viewer-status', 'viewer-fallback', 'zoom-out', 'zoom-in', 'reset-view', 'auto-rotate']) elements.set(id, element());
  elements.get('viewer-fallback').hidden = true;
  const controls = Array.from({ length: 4 }, element);
  class Observer { observe() {} disconnect() {} }
  runInNewContext(readFileSync(new URL('../public/viewer/viewer.js', import.meta.url), 'utf8'), {
    document: { getElementById: id => elements.get(id), querySelectorAll: selector => selector === '[data-view]' ? controls : [], addEventListener() {}, documentElement: element() },
    location: { search: '' }, URLSearchParams, matchMedia: () => ({ matches: true, addEventListener() {} }), IntersectionObserver: Observer, ResizeObserver: Observer, window: { addEventListener() {} }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  assert.equal(elements.get('product-canvas').hidden, true); assert.equal(elements.get('viewer-fallback').hidden, false); assert.ok(controls.every(c => c.disabled)); assert.ok(elements.get('viewer-status').textContent.includes('WebGL'));
});
test('disabled server mode blocks mock mutations and mode probe omits credentials', async () => {
  const calls = []; globalThis.fetch = async (url, options) => { calls.push(url); assert.equal(options.headers.get('Authorization'), null); return json({ provider: 'mock', demoActionsEnabled: false }); };
  await assert.rejects(api.request('/mock-payment/payments/a/complete?result=SUCCESS', { method: 'POST' }), error => error.status === 503);
  assert.deepEqual(calls, ['http://localhost:8080/api/payments/mode']);
});
test('enabled server mode uses authenticated API mock alias', async () => {
  globalThis.fetch = async (url, options) => { if (url.endsWith('/mode')) return json({ provider: 'mock', demoActionsEnabled: true }); assert.equal(url, 'http://localhost:8080/api/mock-payment/payments/a'); assert.equal(options.headers.get('Authorization'), 'Bearer test-access'); return json({ id: 'a' }); };
  assert.equal((await api.request('/mock-payment/payments/a')).id, 'a');
});
test('request rejects network-relative or external URL paths', async () => {
  let sent = false; globalThis.fetch = async () => { sent = true; return json({}); };
  await assert.rejects(api.request('//outside.example/test'), error => error.status === 400);
  await assert.rejects(api.request('https://outside.example/test'), error => error.status === 400);
  assert.equal(sent, false);
});
