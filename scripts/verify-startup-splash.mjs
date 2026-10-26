import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync('app/components/LoadingSplash.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function mount(shown = true) {
 let effect, id = 0, leaving = 0;
 const timers = new Map(), events = new Map();
 const html = { flag: shown, getAttribute: () => html.flag ? '1' : null, removeAttribute: () => { html.flag = false; } };
 const mod = { exports: {} };
 vm.runInNewContext(source, { module: mod, exports: mod.exports, document: { documentElement: html }, window: {
  setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, clearTimeout: key => timers.delete(key),
  addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key),
 }, require: key => key === 'react' ? { ...React, useRef: () => ({ current: { classList: { add: () => { leaving++; } } } }), useEffect: fn => { effect = fn; } } : require(key) });
 const markup = renderToStaticMarkup(mod.exports.default());
 assert.doesNotMatch(markup, /<video|<audio|controls|\.mp4/);
 assert.match(markup, /horizon-mark-only\.svg/);
 assert.match(markup, /aria-hidden="true"/);
 return { cleanup: effect(), timers, events, html, leaving: () => leaving };
}
function fireTimer(m, delay) { const found = [...m.timers.entries()].find(([,t]) => t.delay === delay); assert.ok(found); m.timers.delete(found[0]); found[1].fn(); }
const timed = mount();
fireTimer(timed, 1100); assert.equal(timed.leaving(), 1);
fireTimer(timed, 250); assert.equal(timed.html.flag, false); timed.cleanup();
for (const event of ['pointerdown', 'keydown', 'wheel']) {
 const m = mount(); m.events.get(event)(); m.events.get(event)(); assert.equal(m.leaving(), 1);
 fireTimer(m, 250); assert.equal(m.html.flag, false); m.cleanup(); assert.equal(m.timers.size, 0); assert.equal(m.events.size, 0);
}
const unmounted = mount(); unmounted.cleanup(); assert.equal(unmounted.timers.size, 0); assert.equal(unmounted.events.size, 0);
const returning = mount(false); assert.equal(returning.events.size, 0); assert.equal(returning.timers.size, 0);
const css = readFileSync('app/globals.css', 'utf8');
assert.match(css, /animation: uf-splash-dismiss \.25s ease 1\.1s forwards/);
assert.match(css, /@keyframes uf-splash-dismiss[^]*?visibility: hidden/);
assert.match(css, /prefers-reduced-motion: reduce[^]*?#uf-splash \{ display: none !important/);
assert.match(readFileSync('app/layout.tsx', 'utf8'), /uf_splash_seen/);
console.log('Startup splash: no media player, timed dismissal, skip, cleanup and first-session/reduced-motion guards pass.');
