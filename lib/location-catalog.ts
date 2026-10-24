import { CITIES, isUS, US_CITY_COST_DATA_UPDATED } from './fire-data';
import { CITY_COORDS } from './city-coords';
import { fireNumber } from './fire-number';
export const LOCATION_CATALOG = CITIES.flatMap(city => {
    const coordinates = CITY_COORDS[city.key];
    return coordinates ? [{ ...city, ...coordinates, sourced: isUS(city.state) }] : [];
});
export type LocationCity = typeof LOCATION_CATALOG[number];
export function referenceTarget(city: LocationCity) {
    return fireNumber({ annualSpending: city.col }).fireNumber;
}
export function locationEvidence(city: LocationCity) {
    return city.sourced ? `US reference reviewed ${US_CITY_COST_DATA_UPDATED}` : 'Illustrative international USD reference';
}
