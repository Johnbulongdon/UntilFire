/** Currency changes retain the buying-power equivalent of answers already entered. */
export function convertIntakeAmount(value:string,fromRate:number,toRate:number){
 if(value.trim()==='')return '';
 const number=Number(value);if(!Number.isFinite(number))return value;
 return String(Math.round(number/fromRate*toRate*100)/100);
}
export function citySearch(query:string){return query.trim().toLocaleLowerCase('en-US');}
