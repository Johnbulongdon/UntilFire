import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BRAND, BRAND_MARK_PATH } from '@/lib/brand'
export const runtime = 'nodejs'
export const alt = 'UntilFire — See beyond your balance. Open up your life.'
export const size = {width:1200,height:630}
export const contentType = 'image/png'
export default async function Image(){
 const font=await readFile(join(process.cwd(),'public/fonts/inter/Inter_800ExtraBold.ttf'))
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'58px 70px',background:BRAND.yellow,color:BRAND.ink,fontFamily:'Inter'}}><div style={{display:'flex',alignItems:'center',gap:18}}><svg width="84" height="45" viewBox="0 0 392 210"><path d={BRAND_MARK_PATH} fill={BRAND.ink}/></svg><span style={{fontSize:35,fontWeight:800,letterSpacing:'-1.5px'}}>UntilFire</span></div><div style={{fontSize:84,fontWeight:800,letterSpacing:'-4px',lineHeight:1.05,display:'flex',flexDirection:'column'}}><span>See beyond</span><span>your balance.</span></div><div style={{display:'flex',justifyContent:'space-between',fontSize:22}}><span>Open up your life.</span><span>untilfire.com</span></div></div>,{...size,fonts:[{name:'Inter',data:font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength) as ArrayBuffer,weight:800,style:'normal'}]})
}
