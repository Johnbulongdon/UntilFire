'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';
import landTopology from '@/lib/geo/land-110m.json';
import stateTopology from '@/lib/geo/us-states.json';
import { LOCATION_CATALOG, locationEvidence, referenceTarget, type LocationCity } from '@/lib/location-catalog';
import { cityPagePath, cityLandingPages } from '@/lib/city-pages';
import { formatMoney } from '@/lib/money';
const land = feature(landTopology as unknown as Topology<{
    land: GeometryCollection;
}>, (landTopology as unknown as Topology<{
    land: GeometryCollection;
}>).objects.land) as FeatureCollection;
const states = feature(stateTopology as unknown as Topology<{
    states: GeometryCollection;
}>, (stateTopology as unknown as Topology<{
    states: GeometryCollection;
}>).objects.states) as FeatureCollection;
type Camera = {
    lng: number;
    lat: number;
    zoom: number;
};
interface Props {
    homeKey: string;
    variant?: 'city' | 'expat';
    onCitySelect?: (key: string) => void;
    targetFor?: (city: LocationCity) => number;
    statusFor?: (city: LocationCity) => 'ready' | 'partial' | 'building';
    outcomeFor?: (city: LocationCity) => string;
}
export default function LocationExplorer({ homeKey, variant = 'expat', onCitySelect, targetFor = referenceTarget, outcomeFor, statusFor }: Props) {
    const home = LOCATION_CATALOG.find(c => c.key === homeKey);
    const [selectedKey, setSelectedKey] = useState(homeKey);
    const selected = LOCATION_CATALOG.find(c => c.key === selectedKey) ?? home;
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState('all');
    const [comparison, setComparison] = useState<string[]>([]);
    const [mapOpen, setMapOpen] = useState(false);
    const [globe, setGlobe] = useState(variant === 'expat');
    const [motion, setMotion] = useState<'system' | 'on' | 'off'>('system');
    const [systemReduced, setSystemReduced] = useState(true);
    const [camera, setCamera] = useState<Camera>({ lng: home?.lng ?? 0, lat: home?.lat ?? 20, zoom: variant === 'city' ? 10 : 1 });
    const [settled, setSettled] = useState(camera);
    const [moving, setMoving] = useState(false);
    const detailHeading = useRef<HTMLHeadingElement>(null);
    const [size, setSize] = useState({ width: 600, height: 420 });
    const canvas = useRef<HTMLCanvasElement>(null);
    const flight = useRef(0);
    const current = useRef(camera);
    const drag = useRef<{
        x: number;
        y: number;
        camera: Camera;
        pointerId: number;
    } | null>(null);
    const id = useId();
    const animate = motion === 'on' || (motion === 'system' && !systemReduced);
    useEffect(() => { const preference = matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setSystemReduced(preference.matches); update(); preference.addEventListener('change', update); return () => preference.removeEventListener('change', update); }, []);
    useEffect(() => () => cancelAnimationFrame(flight.current), []);
    const scoped = useMemo(() => LOCATION_CATALOG.filter(c => scope === 'all' || (scope === 'us' ? c.sourced : !c.sourced)), [scope]);
    const results = useMemo(() => scoped.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase())), [scoped, query]);
    const nearby = useMemo(() => {
        const { width: w, height: h } = size;
        const projection = globe ? geoOrthographic().rotate([-settled.lng, -settled.lat]).scale(Math.min(w, h) * .43 * settled.zoom) : geoMercator().rotate([-settled.lng, 0]).center([0, settled.lat]).scale(Math.min(w, h) * .16 * settled.zoom);
        projection.translate([w / 2, h / 2]);
        return scoped.filter(city => {
            if (globe && geoDistance([city.lng, city.lat], [settled.lng, settled.lat]) > 1.5)
                return false;
            const xy = projection([city.lng, city.lat]);
            return xy && xy[0] >= 0 && xy[0] <= w && xy[1] >= 0 && xy[1] <= h;
        }).sort((a, b) => geoDistance([a.lng, a.lat], [settled.lng, settled.lat]) - geoDistance([b.lng, b.lat], [settled.lng, settled.lat])).slice(0, variant === 'city' ? 5 : 8);
    }, [scoped, settled, variant, size, globe]);
    const visible = query.trim() ? results.slice(0, 8) : nearby;
    useEffect(() => { const element = canvas.current; if (!element)
        return; const measure = () => { const width = element.clientWidth, height = element.clientHeight; if (width && height)
        setSize(previous => previous.width === width && previous.height === height ? previous : { width, height }); }; measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect(); }, [mapOpen]);
    function stop() { cancelAnimationFrame(flight.current); flight.current = 0; setMoving(false); setSettled(current.current); }
    function move(next: Camera) { current.current = next; setCamera(next); }
    function finishPointer(event: React.PointerEvent<HTMLCanvasElement>) {
        const start = drag.current;
        if (!start || start.pointerId !== event.pointerId)
            return;
        drag.current = null;
        setSettled(current.current);
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8)
            return;
        const rect = event.currentTarget.getBoundingClientRect(), view = current.current, w = rect.width, h = rect.height;
        const projection = globe ? geoOrthographic().rotate([-view.lng, -view.lat]).scale(Math.min(w, h) * .43 * view.zoom) : geoMercator().rotate([-view.lng, 0]).center([0, view.lat]).scale(Math.min(w, h) * .16 * view.zoom);
        projection.translate([w / 2, h / 2]);
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const hit = scoped.map(city => { const xy = projection([city.lng, city.lat]); return { city, distance: xy && (!globe || geoDistance([city.lng, city.lat], [view.lng, view.lat]) < 1.5) ? Math.hypot(xy[0] - x, xy[1] - y) : Infinity }; }).sort((a, b) => a.distance - b.distance)[0];
        if (hit && hit.distance < 14)
            choose(hit.city);
    }
    function choose(city: LocationCity) {
        stop();
        setSelectedKey(city.key);
        setQuery('');
        const start = current.current, distance = geoDistance([start.lng, start.lat], [city.lng, city.lat]);
        const target = { lng: city.lng, lat: city.lat, zoom: distance < .3 && start.zoom >= 3 ? start.zoom : globe ? 5.5 : 12 };
        if (!animate) {
            move(target);
            setSettled(target);
            return;
        }
        setMoving(true);
        let started: number | undefined;
        const delta = ((target.lng - start.lng + 540) % 360) - 180;
        const tick = (time: number) => {
            started ??= time;
            const t = Math.min(1, (time - started) / 1100), e = t * t * t * (t * (t * 6 - 15) + 10);
            const pullback = distance > .6 && start.zoom > 3 ? Math.exp(-(Math.sin(Math.PI * t) ** 2)) : 1;
            move({ lng: start.lng + delta * e, lat: start.lat + (target.lat - start.lat) * e, zoom: Math.max(.8, Math.exp(Math.log(start.zoom) + (Math.log(target.zoom) - Math.log(start.zoom)) * e) * pullback) });
            if (t < 1)
                flight.current = requestAnimationFrame(tick);
            else {
                flight.current = 0;
                setMoving(false);
                setSettled(target);
            }
        };
        flight.current = requestAnimationFrame(tick);
    }
    useEffect(() => {
        const element = canvas.current;
        if (!element)
            return;
        const draw = () => {
            const w = element.clientWidth, h = element.clientHeight;
            if (!w || !h)
                return;
            const ratio = Math.min(devicePixelRatio, 2);
            element.width = w * ratio;
            element.height = h * ratio;
            const context = element.getContext('2d');
            if (!context)
                return;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            const p = globe ? geoOrthographic().rotate([-camera.lng, -camera.lat]).scale(Math.min(w, h) * .43 * camera.zoom) : geoMercator().rotate([-camera.lng, 0]).center([0, camera.lat]).scale(Math.min(w, h) * .16 * camera.zoom);
            p.translate([w / 2, h / 2]);
            const path = geoPath(p, context);
            context.fillStyle = '#CBDED5';
            context.fillRect(0, 0, w, h);
            context.strokeStyle = '#ACC5B2';
            context.beginPath();
            path(geoGraticule10());
            context.stroke();
            context.fillStyle = '#F1F6E9';
            context.strokeStyle = '#5D7D67';
            context.beginPath();
            path(land);
            context.fill();
            context.stroke();
            context.strokeStyle = '#8EA894';
            context.lineWidth = .7;
            context.beginPath();
            path(states);
            context.stroke();
            for (const city of scoped) {
                if (globe && geoDistance([city.lng, city.lat], [camera.lng, camera.lat]) > 1.5)
                    continue;
                const xy = p([city.lng, city.lat]);
                if (!xy || xy[0] < 5 || xy[0] > w - 5 || xy[1] < 5 || xy[1] > h - 5)
                    continue;
                context.fillStyle = statusFor ? (statusFor(city) === 'ready' ? '#087D69' : statusFor(city) === 'partial' ? '#B88716' : '#C45555') : (city.key === selectedKey ? '#203E30' : '#087D69');
                context.beginPath();
                context.arc(xy[0], xy[1], city.key === selectedKey ? 6 : 2.5, 0, 2 * Math.PI);
                context.fill();
            }
            const occupied: {
                x: number;
                y: number;
                width: number;
            }[] = [];
            for (const city of [scoped.find(c => c.key === selectedKey), ...nearby.filter(c => c.key !== selectedKey)].filter((c): c is LocationCity => !!c).slice(0, w < 450 ? 4 : 6)) {
                if (globe && geoDistance([city.lng, city.lat], [camera.lng, camera.lat]) > 1.5)
                    continue;
                const xy = p([city.lng, city.lat]);
                if (!xy || xy[0] < 0 || xy[0] > w || xy[1] < 0 || xy[1] > h)
                    continue;
                context.font = '600 12px Manrope, sans-serif';
                const text = city.name.split(',')[0] + ' · ' + formatMoney(targetFor(city), { style: 'compact' });
                const width = context.measureText(text).width + 16;
                const x = Math.max(6, Math.min(w - width - 6, xy[0] - width / 2)), y = xy[1] - 32;
                if (y < 65 || y > h - 32 || occupied.some(r => x < r.x + r.width + 6 && x + width > r.x - 6 && Math.abs(y - r.y) < 30))
                    continue;
                occupied.push({ x, y, width });
                context.fillStyle = city.key === selectedKey ? '#234D37' : '#F1F6E9';
                context.fillRect(x, y, width, 26);
                context.fillStyle = city.key === selectedKey ? '#F1F6E9' : '#203E30';
                context.fillText(text, x + 8, y + 17);
            }
        };
        draw();
    }, [camera, globe, nearby, scoped, selectedKey, targetFor, statusFor, mapOpen, size]);
    if (!selected)
        return <p>Your city is not in this reference catalog. Keep using your own spending in the calculator.</p>;
    const hasGuide = selected.sourced || cityLandingPages.some(page => page.city.key === selected.key);
    const excluded = scope !== 'all' && !scoped.some(c => c.key === selected.key);
    const known = query && LOCATION_CATALOG.some(c => c.name.toLowerCase().includes(query.toLowerCase()));
    return <section className="location-explorer" aria-label={variant === 'city' ? 'Nearby city comparison' : 'Expat location explorer'}>
    <div className="location-controls"><label htmlFor={id}>Find a city<input id={id} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="City name"/></label>{variant === 'expat' && <label>Coverage<select value={scope} onChange={e => setScope(e.target.value)}><option value="all">All cities</option><option value="us">US references</option><option value="international">International illustrations</option></select></label>}<label>Camera motion<select value={motion} onChange={e => { stop(); setMotion(e.target.value as typeof motion); }}><option value="system">Follow device</option><option value="on">Animate</option><option value="off">Reduce motion</option></select></label></div>
    <div className="location-layout"><div className="location-list"><h3>{query ? 'Search results' : 'Nearby alternatives'}</h3>{!visible.length && <p>{query ? (known ? 'This city is excluded by your coverage filter.' : 'No city matches this spelling.') : 'No catalog cities in this view. Zoom out or search by name.'} <button onClick={() => { setQuery(''); setScope('all'); }}>Clear search and filters</button></p>}{visible.map(city => <button key={city.key} aria-pressed={selected.key === city.key} onClick={() => choose(city)}><strong>{city.name}</strong><span>{formatMoney(city.col / 12)}/month USD</span></button>)}</div>
    <div className="location-map-wrap"><button className="location-map-toggle" aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}>{mapOpen ? 'Hide map' : 'Explore map'}</button><div className={'location-map ' + (mapOpen ? 'open' : '')}><canvas ref={canvas} role="img" aria-label="City reference map. Tap a city marker or select a nearby city button." data-moving={moving} onPointerDown={e => { if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0))
        return; stop(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, camera: current.current, pointerId: e.pointerId }; }} onPointerMove={e => { if (!drag.current || drag.current.pointerId !== e.pointerId)
        return; const d = drag.current; move({ ...d.camera, lng: d.camera.lng - (e.clientX - d.x) * .25 / d.camera.zoom, lat: Math.max(-75, Math.min(75, d.camera.lat + (e.clientY - d.y) * .25 / d.camera.zoom)) }); }} onPointerUp={finishPointer} onPointerCancel={() => { drag.current = null; setSettled(current.current); }}/><div className="location-map-tools"><button onClick={() => { stop(); const next = { ...current.current, zoom: Math.max(.8, current.current.zoom / 1.4) }; move(next); setSettled(next); }} aria-label="Zoom out">−</button><button onClick={() => { stop(); const next = { ...current.current, zoom: Math.min(18, current.current.zoom * 1.4) }; move(next); setSettled(next); }} aria-label="Zoom in">+</button><button onClick={() => { stop(); setGlobe(!globe); }}> {globe ? 'Flat map' : 'Globe'}</button></div><small>Natural Earth · approximate centers · tap a marker or city button</small></div></div>
    <div className="location-detail"><h3 ref={detailHeading} tabIndex={-1}>{selected.name}</h3><strong className="location-target">{formatMoney(targetFor(selected))}</strong><p>USD target reference</p>{statusFor && <p>{statusFor(selected) === 'ready' ? 'FIRE ready at the shown portfolio' : statusFor(selected) === 'partial' ? 'At least half the target covered' : 'Still building toward the target'}</p>}{outcomeFor && <p>{outcomeFor(selected)}</p>}<p>{locationEvidence(selected)}</p>{excluded && <p>Selected city is outside your current filter.</p>}{home && home.key !== selected.key && <p>{formatMoney(Math.abs(selected.col - home.col) / 12)}/month {selected.col < home.col ? 'less' : 'more'} than {home.name}.</p>}{hasGuide ? <a href={cityPagePath(selected.key)}>Open city guide</a> : <p>No dedicated city guide yet.</p>}{onCitySelect && <><button onClick={() => onCitySelect(selected.key)}>Open plan comparison</button><p>Requires a saved calculator plan.</p></>}<details><summary>Sources and assumptions</summary><p>The target uses 25× annual spending (4% withdrawal). Forecasts use the calculator’s shared real-return assumption. City averages are references, not a household budget. International costs are illustrative USD estimates. Taxes, healthcare, visas and travel can differ. See the city guide for its methodology.</p></details><button disabled={comparison.includes(selected.key) || comparison.length >= 3} onClick={() => setComparison([...comparison, selected.key])}>Add to comparison</button></div></div>
    <div className="location-shortlist" aria-label="Selected comparison cities">{comparison.map(key => { const city = LOCATION_CATALOG.find(c => c.key === key)!; return <div key={key}><span>{city.name} · {formatMoney(targetFor(city))}</span><button aria-label={'Remove ' + city.name} onClick={() => { setComparison(comparison.filter(k => k !== key)); detailHeading.current?.focus(); }}>Remove</button></div>; })}</div>
    <style jsx>{`
      .location-explorer{color:var(--uf-ink);background:var(--uf-ground);padding:20px;border-radius:20px;width:100%;min-width:0}.location-controls{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}label{font-size:13px;display:grid;gap:6px;flex:1;min-width:140px}input,select,button{font:inherit;color:var(--uf-ink);background:var(--uf-surface);border:1px solid var(--uf-border-2);min-height:44px;border-radius:12px;padding:10px 12px}select{border-radius:999px}input{font-size:16px;min-width:0;width:100%}button{cursor:pointer}button:disabled{opacity:.5}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--uf-teal);outline-offset:3px}.location-layout{display:grid;grid-template-columns:220px minmax(0,1fr) 240px;gap:16px}.location-list,.location-detail{background:var(--uf-surface);padding:16px;border-radius:16px;min-width:0}.location-list button{display:grid;gap:6px;width:100%;text-align:left;margin-bottom:8px}.location-list span{font-size:13px}button[aria-pressed=true]{background:var(--uf-green);color:var(--uf-ground)}.location-map{position:relative;height:420px;border-radius:16px;overflow:hidden}.location-map canvas{width:100%;height:100%;display:block;touch-action:pan-y}.location-map-tools{position:absolute;top:12px;right:12px;display:flex;gap:6px}.location-map small{position:absolute;bottom:10px;left:10px;right:10px;background:#F1F6E9;color:#203E30;padding:6px;font-size:12px}.location-target{display:block;font-size:30px;overflow-wrap:anywhere}.location-detail p{font-size:13px;line-height:1.5}.location-detail a{display:block;color:var(--uf-teal);padding:12px 0}.location-detail button{width:100%;margin-top:12px}summary{cursor:pointer;min-height:44px;padding:12px 0}.location-shortlist{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}.location-shortlist div{background:var(--uf-surface);border-radius:12px;padding:8px;display:flex;align-items:center;gap:10px}.location-map-toggle{display:none}h3{margin:0 0 14px}@media(max-width:1050px){.location-layout{grid-template-columns:minmax(0,1fr) 240px}.location-list{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}.location-list h3{width:100%}.location-list button{width:auto;flex:1;min-width:160px}}@media(max-width:700px){.location-explorer{padding:12px}.location-layout{display:flex;flex-direction:column}.location-detail{order:0}.location-list{order:2}.location-map-wrap{order:1}.location-map-toggle{display:block;width:100%;margin-bottom:12px}.location-map{display:none;height:350px}.location-map.open{display:block}.location-controls label{min-width:100%;}.location-list button{min-width:100%}.location-shortlist div{width:100%;justify-content:space-between}}
    `}</style>
  </section>;
}
