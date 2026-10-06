"use client";
import { useEffect, type RefObject } from 'react';
import { animateSelection } from './onboarding-motion';

export function useOnboardingMotion(root: RefObject<HTMLDivElement | null>, step: string, forceMotion = false) {
  useEffect(() => {
    const container = root.current;
    if (!container || step === 'hero' || step === 'reveal') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const surface = container.querySelector<HTMLElement>('[data-onboarding-step]:not([hidden]) .uf-screen');
    const heading = surface?.querySelector<HTMLElement>('h1,h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    if (surface && (!preference.matches || forceMotion)) animations.add(surface.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }));
    const click = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('.uf-mode-pill, .uf-amount-choice');
      if (!button || (preference.matches && !forceMotion)) return;
      animations.forEach(a => a.cancel()); animations.clear();
      const animation = animateSelection(button, forceMotion);
      if (animation) animations.add(animation);
    };
    const stop = () => { if (preference.matches && !forceMotion) animations.forEach(a => a.cancel()); };
    container.addEventListener('click', click);
    preference.addEventListener('change', stop);
    return () => { animations.forEach(a => a.cancel()); container.removeEventListener('click', click); preference.removeEventListener('change', stop); };
  }, [root, step, forceMotion]);
}
