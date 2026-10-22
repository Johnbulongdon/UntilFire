"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { edgePath, NODE_HEIGHT, NODE_WIDTH, type JourneyGraph, type JourneyNode } from '@/lib/journey-canvas';
import { shotDevice, shotFile, type ShotDevice } from '@/lib/journeys';

const button: CSSProperties = { minWidth: 44, minHeight: 44, border: '1px solid #CBD5E1', borderRadius: 10, background: '#fff', color: '#334155', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 12px' };
const clamp = (n: number) => Math.max(0.05, Math.min(1.75, n));
type Camera = { x: number; y: number; scale: number };
const screenLabel = (node: JourneyNode) => node.platform === 'web' && node.step.label === 'Profile'
  ? `Profile (${node.step.shot?.startsWith('pro:') ? 'Pro' : 'free'})` : node.step.label;

export default function JourneyCanvas({ graph, activeJourneys, device, shots, onZoom }: {
  graph: JourneyGraph; activeJourneys: string[]; device: ShotDevice; shots: string;
  onZoom: (shot: { src: string; label: string }) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; origin: Camera } | null>(null);
  const [panning, setPanning] = useState(false);
  const [camera, setCamera] = useState<Camera>({ x: 24, y: 24, scale: 0.6 });
  const marker = useId().replace(/:/g, '');
  const active = useMemo(() => new Set(activeJourneys), [activeJourneys]);
  const selected = useCallback((ids: string[]) => ids.some(id => active.has(id)), [active]);
  const byId = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph]);
  const highlighted = useMemo(() => {
    const ids = new Set(graph.nodes.filter(n => selected(n.journeys)).map(n => n.id));
    for (const edge of graph.edges) if (selected(edge.journeys)) { ids.add(edge.from); ids.add(edge.to); }
    return ids;
  }, [graph, selected]);
  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const nodes = graph.nodes.filter(n => highlighted.has(n.id));
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x)) - 50, minY = Math.min(...nodes.map(n => n.y)) - 90;
    const width = Math.max(...nodes.map(n => n.x + NODE_WIDTH)) - minX + 70;
    const height = Math.max(...nodes.map(n => n.y + NODE_HEIGHT)) - minY + 150;
    const scale = clamp(Math.min((el.clientWidth - 32) / width, (el.clientHeight - 32) / height));
    setCamera({ x: (el.clientWidth - width * scale) / 2 - minX * scale, y: (el.clientHeight - height * scale) / 2 - minY * scale, scale });
  }, [graph, highlighted]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(el);
    return () => resize.disconnect();
  }, [fit]);
  const changeZoom = (factor: number) => setCamera(c => {
    const el = viewport.current; if (!el) return c;
    const scale = clamp(c.scale * factor), ratio = scale / c.scale;
    return { scale, x: el.clientWidth / 2 - (el.clientWidth / 2 - c.x) * ratio, y: el.clientHeight / 2 - (el.clientHeight / 2 - c.y) * ratio };
  });
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // Native listener: React's onWheel is passive, so it can't stop the page scrolling.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect(), px = e.clientX - box.left, py = e.clientY - box.top;
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // Firefox reports lines
      setCamera(c => {
        const scale = clamp(c.scale * Math.exp(-step * (e.ctrlKey ? 0.01 : 0.0015))), ratio = scale / c.scale;
        return { scale, x: px - (px - c.x) * ratio, y: py - (py - c.y) * ratio };
      });
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  const focusNode = (node: JourneyNode) => {
    const el = viewport.current; if (!el) return;
    setCamera(c => { const scale = Math.max(c.scale, 0.8); return { scale, x: el.clientWidth / 2 - (node.x + NODE_WIDTH / 2) * scale, y: el.clientHeight / 2 - (node.y + NODE_HEIGHT / 2) * scale }; });
  };

  return <div style={{ border: '1px solid #CBD5E1', borderRadius: 18, overflow: 'hidden', background: '#F8FAFC', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
      <div><strong style={{ color: '#0F172A', fontSize: 15 }}>One connected journey</strong><div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Shared screens appear once. Branches return to the same path.</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" style={button} onClick={() => changeZoom(1 / 1.25)} aria-label="Zoom out">−</button>
        <output aria-label="Canvas zoom" style={{ fontSize: 12, color: '#334155', width: 45, textAlign: 'center' }}>{Math.round(camera.scale * 100)}%</output>
        <button type="button" style={button} onClick={() => changeZoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" style={button} onClick={fit}>Fit map</button>
        <button type="button" style={button} onClick={() => changeZoom(1 / camera.scale)}>100%</button>
      </div>
    </div>
    <div ref={viewport} role="region" aria-label="Journey canvas" aria-describedby={`${marker}-help`} tabIndex={0}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        const delta: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
        if (delta[e.key]) { e.preventDefault(); const [x, y] = delta[e.key]; setCamera(c => ({ ...c, x: c.x + x, y: c.y + y })); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); changeZoom(1.25); }
        else if (e.key === '-') { e.preventDefault(); changeZoom(1 / 1.25); }
        else if (e.key === '0') { e.preventDefault(); fit(); }
      }}
      onPointerDown={e => {
        if (e.button !== 0 || (e.target as Element).closest('button')) return;
        e.preventDefault();
        setPanning(true);
        pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: camera };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => { const p = pointer.current; if (p?.id === e.pointerId) setCamera({ ...p.origin, x: p.origin.x + e.clientX - p.x, y: p.origin.y + e.clientY - p.y }); }}
      onPointerUp={() => { pointer.current = null; setPanning(false); }} onPointerCancel={() => { pointer.current = null; setPanning(false); }} onLostPointerCapture={() => { pointer.current = null; setPanning(false); }}
      onDragStart={e => e.preventDefault()}
      style={{ height: 'min(76vh, 860px)', minHeight: 500, position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', cursor: panning ? 'grabbing' : 'grab', backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      <div style={{ width: graph.width, height: graph.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, transformOrigin: '0 0', position: 'absolute' }}>
        <svg width={graph.width} height={graph.height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
          <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" /></marker></defs>
          {graph.edges.map((edge, i) => {
            const from = byId.get(edge.from)!, to = byId.get(edge.to)!, lit = selected(edge.journeys);
            const outgoing = graph.edges.filter(e => e.from === from.id);
            const branched = outgoing.length > 1 || edge.navigation;
            const bottom = Math.max(...graph.nodes.filter(n => n.platform === from.platform).map(n => n.y + NODE_HEIGHT)) + 140;
            return <g key={edge.id} opacity={lit ? 1 : 0.12}><path d={edgePath(from, to, i, bottom)} fill="none" stroke={edge.navigation ? '#64748B' : '#059669'} strokeWidth={2.5} strokeDasharray={edge.navigation ? '6 5' : undefined} strokeLinejoin="round" markerEnd={`url(#${marker})`}><title>{`${from.step.label} → ${to.step.label}: ${edge.label}`}</title></path>
              {branched && <text x={from.x + NODE_WIDTH / 2} y={from.y + NODE_HEIGHT + 22 + outgoing.indexOf(edge) * 17} textAnchor="middle" fill="#334155" fontSize={12} style={{ paintOrder: 'stroke', stroke: '#F8FAFC', strokeWidth: 5 }}>{edge.label}</text>}
            </g>;
          })}
        </svg>
        {graph.headings.map(h => <div key={`${h.text}-${h.y}`} style={{ position: 'absolute', left: h.x, top: h.y, color: '#475569', fontSize: 15, fontWeight: 800, letterSpacing: '.04em' }}>{h.text}</div>)}
        {graph.nodes.map(node => <ScreenNode key={`${node.id}-${device}`} node={node} branching={graph.edges.filter(e => e.from === node.id).length > 1} device={device} shots={shots} dim={!highlighted.has(node.id)} onZoom={onZoom} onFocus={() => focusNode(node)} />)}
      </div>
    </div>
    <div id={`${marker}-help`} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, background: '#fff', borderTop: '1px solid #E2E8F0', padding: '10px 16px', fontSize: 12, color: '#475569' }}>
      <span>Drag the canvas to move · Scroll or + / − to zoom · 0 to fit · Arrow keys to pan</span><span>Solid: journey steps · Dashed: open Profile · Click a screen to inspect</span>
    </div>
    <details style={{ background: '#fff', padding: '10px 16px', borderTop: '1px solid #E2E8F0', color: '#334155', fontSize: 13 }}>
      <summary style={{ cursor: 'pointer', padding: '8px 0' }}>Connections as text</summary>
      <ul>{graph.edges.filter(e => selected(e.journeys)).map(e => <li key={e.id} style={{ margin: '8px 0' }}>{screenLabel(byId.get(e.from)!)} → {screenLabel(byId.get(e.to)!)} · {e.label}</li>)}</ul>
    </details>
  </div>;
}

function ScreenNode({ node, branching, device, shots, dim, onZoom, onFocus }: { node: JourneyNode; branching: boolean; device: ShotDevice; shots: string; dim: boolean; onZoom: (shot: { src: string; label: string }) => void; onFocus: () => void }) {
  const [broken, setBroken] = useState(false);
  const step = node.step, size = step.shot ? shotDevice(step.shot, device, step.click) : device;
  const src = step.shot ? `${shots}/${shotFile(step.shot, size, step.click)}` : null;
  return <figure style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, margin: 0, padding: 12, boxSizing: 'border-box', borderRadius: 14, border: `1.5px ${step.external ? 'dashed' : 'solid'} ${step.label.startsWith('Home') ? '#059669' : '#CBD5E1'}`, background: '#fff', boxShadow: '0 3px 10px #0F172A08', opacity: dim ? 0.23 : 1 }}>
    <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', marginBottom: 9 }}>{step.external ? 'EXTERNAL' : step.label.startsWith('Home') ? (step.shot?.startsWith('pro:') ? 'HOME · PRO' : 'HOME · SHARED HUB') : step.label === 'Profile' && node.platform === 'web' ? (step.shot?.startsWith('pro:') ? 'PROFILE · PRO' : 'PROFILE · FREE') : node.journeys.length > 1 ? 'SHARED SCREEN' : 'SCREEN'}</div>
    <button type="button" onFocus={e => { if (e.currentTarget.matches(':focus-visible')) onFocus(); }} aria-label={`Show ${screenLabel(node)} full size${step.external ? ' (external)' : ''}`} onClick={() => src && !broken && onZoom({ src, label: screenLabel(node) })} disabled={!src || broken}
      style={{ width: '100%', height: 158, padding: 0, border: 0, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9', color: '#475569', cursor: src && !broken ? 'zoom-in' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src && !broken ? <img draggable={false} src={src} alt={step.label} loading="lazy" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: size === 'phone' ? 'contain' : 'cover', objectPosition: 'top', display: 'block' }} /> : <span>{step.external ? step.label : 'Screenshot unavailable'}</span>}
    </button>
    <figcaption style={{ fontSize: 13, lineHeight: 1.4, color: '#0F172A', marginTop: 9, fontWeight: 800 }}>{step.label}<span style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 400, marginTop: 3 }}>{branching ? 'Choose a connected branch' : step.action ?? (step.external ? 'External service' : 'Continue on this screen')}</span></figcaption>
  </figure>;
}
