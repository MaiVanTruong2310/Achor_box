import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function harness(reducedMotion = false) {
  const events = new Map(), frames = new Map(), uniforms = new Map(); let sequence = 0, vertices = 0;
  const gl = new Proxy({}, { get(_target, key) {
    if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
    if (key === 'getUniformLocation') return (_program, name) => name;
    if (key === 'uniformMatrix4fv') return (name, _transpose, value) => uniforms.set(name, [...value]);
    if (key === 'uniform1f') return (name, value) => uniforms.set(name, value);
    if (key === 'bufferData') return (_type, value) => { vertices = value.length; };
    if (String(key).toUpperCase() === key) return 1;
    return () => 0;
  } });
  const element = () => ({ hidden: false, disabled: false, clientWidth: 500, clientHeight: 500, classList: { add() {}, toggle() {} }, setAttribute() {}, addEventListener() {}, getContext: () => gl });
  const nodes = new Map(['product-canvas', 'model-label', 'viewer-status', 'viewer-fallback', 'zoom-in', 'zoom-out', 'reset-view', 'auto-rotate'].map(id => [id, element()]));
  const parent = {}, origin = 'http://localhost:5174';
  class Observer { observe() {} disconnect() {} }
  runInNewContext(readFileSync(new URL('../public/viewer/viewer.js', import.meta.url), 'utf8'), {
    document: { hidden: false, getElementById: id => nodes.get(id), querySelectorAll: selector => selector === '[data-view]' ? Array.from({ length: 4 }, element) : [], addEventListener() {}, documentElement: element() },
    location: { search: '', origin }, parent, URLSearchParams, performance: { now: () => 0 }, devicePixelRatio: 1, innerWidth: 1200,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }), IntersectionObserver: Observer, ResizeObserver: Observer,
    window: { addEventListener: (type, listener) => events.set(type, listener), removeEventListener: type => events.delete(type) },
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; }, cancelAnimationFrame: id => frames.delete(id),
  });
  return { uniforms, nodes, frames, vertices: () => vertices,
    message: (data, from = origin) => events.get('message')({ origin: from, source: parent, data }),
    render: time => { const [id, callback] = frames.entries().next().value || []; if (!callback) return; frames.delete(id); callback(time); },
  };
}
test('Pro illustration changes geometry, capacity only changes its documented label', () => {
  const h = harness(); const baseVertices = h.vertices();
  h.message({ type: 'SMARTBOX_VIEW', model: 'pro', capacity: 150, scene: 'front' });
  assert.ok(h.vertices() > baseVertices); assert.ok(h.nodes.get('model-label').textContent.includes('150L'));
  const proVertices = h.vertices(); h.message({ type: 'SMARTBOX_VIEW', model: 'pro', capacity: 45, scene: 'front' }); assert.equal(h.vertices(), proVertices);
});
test('lock scene moves the camera and highlights the abstract panel', () => {
  const h = harness(); h.render(0); const before = h.uniforms.get('uView');
  h.message({ type: 'SMARTBOX_VIEW', model: 'base', scene: 'lock' }); h.render(900);
  assert.notDeepEqual(h.uniforms.get('uView'), before); assert.equal(h.uniforms.get('uHighlight'), 1); assert.equal(h.frames.size, 0);
});
test('hidden parent stops render frames and reduced motion avoids an animation loop', () => {
  const h = harness(); h.render(0); assert.ok(h.frames.size > 0); h.message({ type: 'SMARTBOX_VISIBILITY', visible: false }); assert.equal(h.frames.size, 0);
  const reduced = harness(true); reduced.render(0); assert.equal(reduced.frames.size, 0); assert.equal(reduced.uniforms.get('uFloat'), 0);
});
test('viewer ignores configuration messages from another origin', () => {
  const h = harness(); const before = h.vertices(); h.message({ type: 'SMARTBOX_VIEW', model: 'pro', scene: 'lock' }, 'https://outside.example'); assert.equal(h.vertices(), before);
});
