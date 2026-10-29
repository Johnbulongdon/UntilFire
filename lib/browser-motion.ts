/** Small progressive enhancement; the DOM stays usable without motion support. */
export function animateScene(node: HTMLElement, preference: MediaQueryList): () => void {
  if(preference.matches||typeof node.animate!=='function')return ()=>{};
  const animation=node.animate([{opacity:.85,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
  const stop=()=>animation.cancel();
  preference.addEventListener('change',stop);
  return ()=>{stop();preference.removeEventListener('change',stop)};
}
