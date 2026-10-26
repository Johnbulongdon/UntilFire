"use client";

import { useEffect, useRef } from 'react';

/** First-session brand introduction. Vector artwork cannot expose media controls.
 * CSS also dismisses it before hydration, so slow JavaScript never blocks the app.
 */
export default function LoadingSplash() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute('data-splash') !== '1') return;
    let dismissed = false;
    let fade: number | undefined;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      rootRef.current?.classList.add('is-leaving');
      fade = window.setTimeout(() => html.removeAttribute('data-splash'), 250);
    };
    const cap = window.setTimeout(dismiss, 1100);
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('wheel', dismiss, { once: true, passive: true });
    return () => {
      window.clearTimeout(cap);
      window.clearTimeout(fade);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('wheel', dismiss);
    };
  }, []);

  return <div id="uf-splash" ref={rootRef} aria-hidden="true">
    {/* Existing brand mark, with no video, autoplay dependency or player UI. */}
    <img src="/logo/horizon-mark-only.svg" width="160" height="160" alt="" draggable={false} />
  </div>;
}
