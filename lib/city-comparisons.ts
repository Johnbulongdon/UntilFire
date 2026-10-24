import { CITIES, isUS, type City } from './fire-data';
import { CITY_COORDS } from './city-coords';
import { cityLandingPages, cityPagePath } from './city-pages';

export interface CityComparison {
  key: string;
  name: string;
  annualUSD: number;
  lat: number;
  lng: number;
  href: string;
}

/** Great-circle distance; city centers are approximate, not property locations. */
export function cityDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function getCityComparisons(city: City): CityComparison[] {
  const origin = CITY_COORDS[city.key];
  if (!origin) return [];
  const publishedKeys = new Set(cityLandingPages.map(page => page.city.key));
  const candidates = CITIES.filter(c => c.key !== city.key && CITY_COORDS[c.key] && (isUS(c.state) || publishedKeys.has(c.key)) &&
    // US pages may cross state lines; international comparisons stay in the same country tax group.
    (isUS(city.state) ? isUS(c.state) : c.state === city.state));
  candidates.sort((a, b) => cityDistance(origin, CITY_COORDS[a.key]) - cityDistance(origin, CITY_COORDS[b.key]));
  return [city, ...candidates.slice(0, 3)].map(c => ({
    key: c.key, name: c.name, annualUSD: c.col,
    ...CITY_COORDS[c.key], href: cityPagePath(c.key),
  }));
}

export const CITY_MAP_HEIGHT = 340;

/** Web Mercator world pixels. Wrapping keeps comparisons near the date line together. */
export function projectCity(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180);
  return { x: (lng + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

export function fitCityMap(cities: CityComparison[], width: number) {
  const height = CITY_MAP_HEIGHT;
  for (let zoom = cities.length === 1 ? 10 : 12; zoom >= 1; zoom--) {
    const world = 256 * 2 ** zoom;
    const reference = projectCity(cities[0].lat, cities[0].lng, zoom).x;
    const points = cities.map(c => {
      const p = projectCity(c.lat, c.lng, zoom);
      return { ...p, x: p.x + Math.round((reference - p.x) / world) * world };
    });
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if ((maxX - minX <= width - 144 && maxY - minY <= height - 126) || zoom === 1) {
      const left = (minX + maxX) / 2 - width / 2, top = (minY + maxY) / 2 - height / 2;
      const tiles = [];
      for (let x = Math.floor(left / 256); x < Math.ceil((left + width) / 256); x++) {
        for (let y = Math.floor(top / 256); y < Math.ceil((top + height) / 256); y++) {
          if (y < 0 || y >= 2 ** zoom) continue;
          const tileX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
          tiles.push({ url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${y}.png`, left: x * 256 - left, top: y * 256 - top });
        }
      }
      const pins = points.map(p => ({ x: p.x - left, y: p.y - top }));
      const labels: { x: number; y: number }[] = [];
      for (const pin of pins) {
        const candidates = [];
        for (const dy of [0, -76, 76, -152, 152]) for (const dx of [0, -144, 144]) {
          candidates.push({ x: Math.max(72, Math.min(width - 72, pin.x + dx)), y: Math.max(48, Math.min(height - 48, pin.y + dy)) });
        }
        candidates.sort((a,b) => Math.hypot(a.x-pin.x,a.y-pin.y)-Math.hypot(b.x-pin.x,b.y-pin.y));
        labels.push(candidates.find(p => labels.every(other => Math.abs(p.x-other.x) >= 140 || Math.abs(p.y-other.y) >= 72)) ?? candidates[0]);
      }
      if (labels.some((a,i) => labels.some((b,j) => j>i && Math.abs(a.x-b.x)<140 && Math.abs(a.y-b.y)<72))) {
        // Dense metros (e.g. SF/Oakland) need separate labels, connected to their real locations.
        const order = pins.map((p,i)=>({ ...p,i })).sort((a,b)=>a.y-b.y);
        order.forEach((p,index)=>{ labels[p.i] = { x: Math.max(72, Math.min(width-72,p.x)), y:48+index*76 }; });
      }
      return { tiles, pins, labels };
    }
  }
  throw new Error('City map requires a valid city and positive width');
}
