import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
let cache:Promise<{name:string;data:ArrayBuffer;weight:400|700|800;style:'normal'}[]>|undefined
/** Local static Inter files keep share images consistent without an external font fetch. */
export function brandOgFonts(){
 return cache??=Promise.all(([['400Regular',400],['700Bold',700],['800ExtraBold',800]] as const).map(async([file,weight])=>{
 const font=await readFile(join(process.cwd(),'public/fonts/inter/Inter_'+file+'.ttf'))
 return {name:'Inter',data:font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength) as ArrayBuffer,weight,style:'normal' as const}
 }))
}
