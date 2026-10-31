import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import type { PaydayLine } from '@/engine'
import { paydayPointIso } from '@engine/payday-chart.ts'
import { paydayRemainder } from '@engine/payday-spending.ts'
import { Text } from './Text'
import { money } from '@/lib/format'
import { fromUSD, toUSDFromDisplay, currencySymbol } from '@/lib/display-currency'
import { colors } from '@/theme/colors'
const date=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
export function UntilPaydayCard({line,paydayIso,icon,onOpen,everyday=null,estimateSource='budget',onAdjustmentChange}:{line:PaydayLine;paydayIso:string;billCount:number;billTotal:number;icon:(category:string|null)=>string;onOpen:()=>void;everyday?:number|null;estimateSource?:'history'|'budget';onAdjustmentChange?:(a:{everyday:number|null;cushion:number})=>void}) {
 const[override,setOverride]=useState<number|null>(null),[cushion,setCushion]=useState(0),[edit,setEdit]=useState(false),[extra,setExtra]=useState(false)
 const estimate=override??everyday, remaining=paydayRemainder(line.end,estimate,cushion),cash=line.past[line.today]??line.end
 const row=(label:string,value:string)=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.border}}><Text style={{flex:1,color:colors.ink,fontSize:14}}>{label}</Text><Text private style={{color:colors.ink,fontSize:18,fontWeight:'700'}}>{value}</Text></View>
 const field=(label:string,value:number|null,set:(n:number)=>void)=><View style={{gap:8}}><Text style={{color:colors.ink2,fontSize:12}}>{label} ({currencySymbol()})</Text><TextInput accessibilityLabel={label} keyboardType="decimal-pad" value={value===null?'':String(Math.round(fromUSD(value)))} onChangeText={t=>{const n=Number(t.replace(',','.'));if(t.trim()&&Number.isFinite(n)&&n>=0){const usd=toUSDFromDisplay(n);set(usd);onAdjustmentChange?.({everyday:set===setOverride?usd:override,cushion:set===setCushion?usd:cushion})}}} style={{backgroundColor:colors.card,color:colors.ink,minHeight:48,padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border2}} /></View>
 return <View style={{borderRadius:24,overflow:'hidden',backgroundColor:colors.card,borderWidth:1,borderColor:colors.border}}>
  <View style={{padding:20,gap:12,backgroundColor:colors.ink==='#151719'?'#E3F7EF':'#243B33'}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}><Text style={{color:colors.ink,fontWeight:'700',fontSize:17}}>Until payday</Text><View style={{backgroundColor:'#FFE58A',padding:10,borderRadius:24}}><Text style={{color:'#151719',fontWeight:'700',fontSize:12}}>{date(paydayIso)}</Text></View></View>
   <Text private accessibilityLiveRegion="polite" style={{color:remaining!==null&&remaining<0?colors.negInk:colors.ink,fontSize:44,fontWeight:'800',fontVariant:['tabular-nums']}}>{remaining===null?'—':money(remaining)}</Text>
   <Text style={{color:colors.ink,fontSize:18,fontWeight:'600'}}>{remaining===null?'Add an everyday estimate':remaining<0?'Estimated short before payday':'Estimated left to spend'}</Text>
   <Text style={{color:colors.ink2,fontSize:12}}>After bills and everyday costs</Text>
   <View>{row('Available cash',money(cash))}{row('Bills & card payments',money(line.end-cash))}{row('Everyday spending',estimate===null?'Not set':money(-estimate))}</View>
   <Text style={{color:colors.ink2,fontSize:12}}>{override!==null?'Your estimate':estimateSource==='history'?'Estimated from past spending':'Estimated from your budget'}</Text>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:edit}} onPress={()=>setEdit(!edit)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.ink2,fontSize:13}}>Adjust estimate {edit?'⌃':'⌄'}</Text></Pressable>
   {edit&&<View style={{gap:8}}>{field('Expected everyday spending',estimate,setOverride)}<Pressable accessibilityRole="button" onPress={()=>{setOverride(null);onAdjustmentChange?.({everyday:null,cushion})}} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.ink,fontSize:13}}>Use automatic estimate</Text></Pressable></View>}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:extra}} onPress={()=>setExtra(!extra)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.ink2,fontSize:13}}>{cushion?`Cushion · ${money(cushion)}`:'＋ Add a cushion'} {extra?'⌃':'⌄'}</Text></Pressable>
   {extra&&field('Extra cash to leave untouched',cushion,setCushion)}
  </View>
  <View style={{padding:20,gap:12}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:colors.ink,fontSize:16,fontWeight:'700'}}>Upcoming bills</Text><Pressable accessibilityRole="button" onPress={onOpen} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.ink,fontSize:13}}>Money ›</Text></Pressable></View>
   {line.bills.slice(0,3).map((b,i)=><View key={`${b.day}-${i}`} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.border}}><Text style={{color:colors.ink2,fontSize:12,width:48}}>{date(paydayPointIso(line,b.day))}</Text><Text>{icon(b.category)}</Text><Text numberOfLines={2} style={{color:colors.ink,fontSize:14,flex:1}}>{b.description}</Text><Text private style={{color:colors.ink,fontSize:14,fontWeight:'600'}}>{money(b.usd)}</Text></View>)}
   {!line.bills.length&&<Text style={{color:colors.ink2,fontSize:13}}>No bills before payday</Text>}
   {line.bills.length>3&&<Pressable accessibilityRole="button" onPress={onOpen} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.ink,fontSize:13}}>View all {line.bills.length} payments ›</Text></Pressable>}
   <Text style={{color:colors.ink2,fontSize:12}}>Everyday costs are estimates. No savings target is deducted. Adjustments apply to this visit.</Text>
  </View>
 </View>
}
