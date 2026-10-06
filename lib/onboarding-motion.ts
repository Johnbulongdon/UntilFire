/** Shared browser motion engine. Inputs and calculations never wait for animation. */
export const springFrames = (from: number, to: number, property = "transform", format = (n: number) => `scale(${n})`) =>
  Array.from({ length: 45 }, (_, i) => {
    const t = i / 44;
    const progress = i === 44 ? 1 : 1 - Math.exp(-8 * t) * (Math.cos(12 * t) + (8 / 12) * Math.sin(12 * t));
    return { [property]: format(from + (to - from) * progress), offset: t };
  });

export function animateSelection(element: HTMLElement, forceMotion = false) {
  if (!forceMotion && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  return element.animate(springFrames(.92, 1), { duration: 560, easing: 'linear' });
}
