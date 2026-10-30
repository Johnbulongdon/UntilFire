import { CITIES } from "./fire-data";
export const LANDING_WORLD_CITIES = [
  { key: "nyc", name: "New York", coords: [-74, 40.7] as [number, number] },
  { key: "lisbon", name: "Lisbon", coords: [-9.14, 38.72] as [number, number] },
  {
    key: "chiangmai",
    name: "Chiang Mai",
    coords: [98.98, 18.79] as [number, number],
  },
].map((city) => ({
  ...city,
  annual: CITIES.find((entry) => entry.key === city.key)?.col,
}));
