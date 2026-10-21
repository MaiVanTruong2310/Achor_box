import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/data/bannerModel.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeBanners, safeBannerTarget, safeBannerImage, nextBannerIndex } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const make = (id, extra = {}) => ({ id, title: 'Banner', imageUrl: '/products/box.svg', targetUrl: '/products', position: 'hero_home', displayOrder: 0, isActive: true, ...extra });

test('public banner feed filters position, status and schedule together and sorts deterministically', () => {
  const now = Date.parse('2026-10-21T08:00:00Z');
  const rows = [make('b',{displayOrder:2}),make('a',{displayOrder:1}),make('off',{isActive:false}),make('other',{position:'popup_promo'}),make('future',{startDate:'2026-11-01T00:00:00Z'}),make('expired',{endDate:'2026-10-20T00:00:00Z'}),make('invalid',{startDate:'bad'}),make('b',{displayOrder:0})];
  assert.deepEqual(normalizeBanners(rows,now).map(b=>b.id),['a','b']);
});
test('empty public feed stays empty and malformed data is rejected rather than activating hidden banners', () => {
  assert.deepEqual(normalizeBanners([]),[]);assert.deepEqual(normalizeBanners({banners:[]}),[]);
  assert.throws(()=>normalizeBanners({error:'denied'}));
});
test('banner links cannot send shoppers to external or executable targets', () => {
  for(const value of ['javascript:alert(1)','//evil.test/products','/\\evil.test','https://evil.test/products','/products/../../admin','/admin','/products\u0000']) assert.equal(safeBannerTarget(value),null,value);
  assert.equal(safeBannerTarget('/products?category=abc'),'/products?category=abc');assert.equal(safeBannerTarget('/products/123'),'/products/123');
});
test('images reject active data and credential-bearing URLs; broken rows do not poison valid banners', () => {
  for(const value of ['data:image/svg+xml,test','javascript:x','//evil.test/x','https://user:pass@host/x']) assert.equal(safeBannerImage(value),null);
  assert.deepEqual(normalizeBanners([make('bad',{imageUrl:'javascript:x'}),make('good')]).map(b=>b.id),['good']);
});
test('carousel wraps forwards/backwards and handles a zero- or one-slide feed',()=>{
  assert.equal(nextBannerIndex(2,1,3),0);assert.equal(nextBannerIndex(0,-1,3),2);assert.equal(nextBannerIndex(0,1,1),0);assert.equal(nextBannerIndex(0,1,0),0);
});
