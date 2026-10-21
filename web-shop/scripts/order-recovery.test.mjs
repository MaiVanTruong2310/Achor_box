import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/api/orderRecovery.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
test('unresolved order survives module reload, is account scoped, and clears after reconciliation', async () => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const first = await import(moduleUrl);
  first.markPendingOrder('customer-a');
  const reloaded = await import(moduleUrl + '#reload');
  assert.equal(reloaded.hasPendingOrder('customer-a'), true);
  assert.equal(reloaded.hasPendingOrder('customer-b'), false);
  reloaded.clearPendingOrder('customer-a');
  assert.equal(reloaded.hasPendingOrder('customer-a'), false);
});
test('blocked storage prevents initiating an untrackable order', async () => {
  globalThis.localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  const recovery = await import(moduleUrl);
  assert.equal(recovery.hasPendingOrder('customer-a'), false);
  assert.throws(() => recovery.markPendingOrder('customer-a'), /Trình duyệt không lưu/);
});
