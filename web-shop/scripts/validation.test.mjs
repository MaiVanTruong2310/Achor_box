import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/api/validation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { phonePattern } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('phone pattern compiles with HTML v flag and matches backend phone syntax', () => {
  const pattern = new RegExp(`^(?:${phonePattern})$`, 'v');
  for (const phone of ['0912345678', '+84912345678', '(028) 1234-5678']) assert.equal(pattern.test(phone), true, phone);
  for (const phone of ['abc12345678', '123', '09+12345678', '++84912345678', '1'.repeat(31)]) assert.equal(pattern.test(phone), false, phone);
});
