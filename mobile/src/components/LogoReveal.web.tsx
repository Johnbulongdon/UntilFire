import { Image, View } from 'react-native'
/** Same outlined Inter lockup on phone and website; no media playback controls. */
export function LogoReveal({width=300}:{width?:number}){return <View style={{width,height:width*150/772}}><Image source={require('../../assets/brand-logo-white.png')} resizeMode="contain" style={{width:'100%',height:'100%'}}/></View>}
