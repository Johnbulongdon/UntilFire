/** Whole local-currency controls, with exact restoration of the original saved plan. */
export function savingsSliderAmount(raw:number,_original:number,max:number){
 return Math.max(0,Math.min(Math.round(max),Math.round(raw)));
}
export function savingsDisplayUSD(display:number,originalUSD:number,rate:number){
 return display===Math.round(originalUSD*rate)||Math.abs(display-originalUSD*rate)<1e-7?originalUSD:display/rate;
}
