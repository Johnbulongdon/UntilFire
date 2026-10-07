'use client';
import dynamic from 'next/dynamic';
const Explorer = dynamic(() => import('./LocationExplorer'), { ssr: false, loading: () => <p>Loading nearby city map…</p> });
export default function CityLocationExplorer({ cityKey }: {
    cityKey: string;
}) { return <Explorer homeKey={cityKey} variant="city"/>; }
