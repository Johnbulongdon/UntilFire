import {useEffect,useRef,useState} from 'react';
import Slider from "@/components/AmountSlider";
import { TextInput, View } from "react-native";
import { currencySymbol, fromUSD } from "@/lib/display-currency";
import { colors } from "@/theme/colors";
import { Text } from "./Text";

/** Compatibility name for the shared monthly amount field. Value is in display currency. */
export function MoneyWheel({
  value,
  onChange,
  max,
  unit,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  unit: string;
  label: string;
}) {
  const limit = Math.max(max, value, 1);
  const [text,setText]=useState(String(value));
  const editing=useRef(false);
  useEffect(()=>{if(!editing.current)setText(String(value))},[value]);
  return (
    <View className="gap-5">
      <View className="flex-row items-baseline gap-1">
        <Text className="text-[40px] font-bold text-ink">
          {currencySymbol().trim()}
        </Text>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={text}
          onFocus={()=>{editing.current=true}}
          onBlur={()=>{editing.current=false;setText(String(value))}}
          onChangeText={(t) => {
            const clean=t.replace(",", ".").replace(/[^0-9.]/g, "").replace(/(\..*)\./g,"$1");
            setText(clean);
            const n = Number(clean);
            if (Number.isFinite(n)) onChange(Math.min(n, 99999999));
          }}
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={colors.border2}
          style={{
            flex: 1, minWidth: 0, width: 0,
            fontFamily: "Inter_700Bold",
            fontSize: 48,
            color: colors.ink,
            paddingVertical: 8,
          }}
        />
      </View>
      <Text className="text-[15px] text-ink-2">{unit}</Text>
      <Slider
        accessibilityLabel={label + " slider"}
        minimumValue={0}
        maximumValue={limit}
        step={Math.max(1, Math.round(fromUSD(10)))}
        value={value}
        onValueChange={n=>{setText(String(n));onChange(n)}}
        minimumTrackTintColor={colors.ink}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.ink}
        style={{ height: 48 }}
      />
    </View>
  );
}
