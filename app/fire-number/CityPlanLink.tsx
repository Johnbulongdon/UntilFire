'use client';

import Link from 'next/link';
import { trackCityPlanStarted } from '@/lib/analytics';

export default function CityPlanLink({ cityKey, cityName, slug }: { cityKey: string; cityName: string; slug: string }) {
  return <Link className="city-guide-action" href={`/?start=onboarding&city=${encodeURIComponent(cityKey)}&source=fire-number-${slug}`} onClick={() => trackCityPlanStarted(cityKey, slug)}>Build my {cityName} plan →</Link>;
}
