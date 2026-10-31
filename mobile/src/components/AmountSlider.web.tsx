import type {ComponentProps} from 'react'
import type NativeSlider from '@react-native-community/slider'
import {View} from 'react-native'
/** The web preview uses a real range input with native keyboard and accessible value support. */
export default function AmountSlider(props:ComponentProps<typeof NativeSlider>){
 return <View style={props.style}><input type="range" aria-label={props.accessibilityLabel} disabled={props.disabled} min={props.minimumValue??0} max={props.maximumValue??1} step={props.step||'any'} value={props.value??0} onChange={e=>props.onValueChange?.(Number(e.target.value))} style={{width:'100%',height:'100%',margin:0,accentColor:props.minimumTrackTintColor??'#151719'}}/></View>
}
