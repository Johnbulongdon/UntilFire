"use client";
import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { animateScene } from '@/lib/browser-motion';

/** Navigation feedback without remounting editors or changing their state/focus. */
export default function MotionScene({scene,className,children,...rest}:{scene:string;children:ReactNode}&HTMLAttributes<HTMLDivElement>) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(ref.current)return animateScene(ref.current,window.matchMedia('(prefers-reduced-motion: reduce)'));
  },[scene]);
  return <div {...rest} ref={ref} className={className} data-uf-scene={scene}>{children}</div>;
}
