'use client';
import { useMemo } from 'react';
import LocationExplorer from './LocationExplorer';
import { calcFIRE } from '@/lib/fire/strategies/traditional';
import { referenceTarget } from '@/lib/location-catalog';
import { LOCATION_CATALOG } from '@/lib/location-catalog';
interface Props {
    monthlySavings: number;
    portfolioBalance: number;
    currentAge?: number;
    currentCityKey: string;
    onCitySelect: (key: string) => void;
}
export default function PublicExpatLocationExplorer(props: Props) {
    const outcomes = useMemo(() => new Map(LOCATION_CATALOG.map(city => [city.key, calcFIRE(props.monthlySavings, city.col, props.currentAge, props.portfolioBalance)])), [props.monthlySavings, props.portfolioBalance, props.currentAge]);
    return <LocationExplorer key={props.currentCityKey} homeKey={props.currentCityKey} onCitySelect={props.onCitySelect} statusFor={city => props.portfolioBalance >= referenceTarget(city) ? 'ready' : props.portfolioBalance >= referenceTarget(city) * .5 ? 'partial' : 'building'} outcomeFor={city => { const result = outcomes.get(city.key); return result?.years == null ? 'Target not reached with these assumptions.' : result.years === 0 ? 'Your portfolio meets this spending reference.' : `${result.years.toFixed(1)} years from the shown portfolio`; }}/>;
}
