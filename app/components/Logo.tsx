"use client";

interface LogoProps { variant?: "dark" | "light" | "auto"; size?: number; className?: string }
/** The approved Next Horizon lockup, with outlined Inter lettering. */
export default function Logo({variant="auto",size=28,className}:LogoProps){
 const auto=variant==='auto';
 return <span className={className} style={{display:'inline-flex',alignItems:'center',flexShrink:0}}>
  {auto?<><img className="uf-brand-mark-light" src="/brand/logo-horizontal.svg" alt="UntilFire" width={Math.round(size*772/150)} height={size}/><img className="uf-brand-mark-dark" src="/brand/logo-horizontal-white.svg" alt="UntilFire" width={Math.round(size*772/150)} height={size}/></>:<img src={variant==='dark'?'/brand/logo-horizontal-white.svg':'/brand/logo-horizontal.svg'} alt="UntilFire" width={Math.round(size*772/150)} height={size}/>}
 </span>
}
