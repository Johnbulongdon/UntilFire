// The web preview draws the SVG globe: Skia on the web needs its own loader,
// and the phone uses Globe.tsx (Skia, on the UI thread).
export { GlobeSvg as Globe, type GlobeCity, type LngLat } from './GlobeSvg'
export { CITY_COORDS } from '../../../lib/city-coords'
