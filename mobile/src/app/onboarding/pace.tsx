import Slider from "@/components/AmountSlider";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { RevealFrame } from "@/components/RevealFrame";
import { Text } from "@/components/Text";
import { usePlan, planFromDraft, freedomFor } from "@/state/plan";
import { money } from "@/lib/format";
export default function Pace() {
  const { draft, setDraft, savePlan } = usePlan();
  const plan = planFromDraft(draft);
  const original = Math.max(0, plan.monthlyIncome - plan.monthlySpending);
  const [saving, setSaving] = useState(original);
  const changed = Math.abs(saving - original) >= 1;
  const proposed = {
    ...plan,
    monthlySpending: Math.max(0, plan.monthlyIncome - saving),
  };
  const result = freedomFor(proposed);
  return (
    <RevealFrame
      eyebrow="Try one improvement"
      next={changed ? "Use updated plan" : "Use original plan"}
      onNext={async () => {
        setDraft({ monthlySpending: proposed.monthlySpending });
        await savePlan(proposed);
        router.push("/onboarding/reminder");
      }}
    >
      <Text className="font-display text-[32px] font-bold leading-9 text-ink">
        A little more room.
      </Text>
      <Text className="mt-7 text-[14px] text-ink-2">Saved each month</Text>
      <Text className="mt-2 text-[52px] font-bold leading-[60px] text-ink">
        {money(saving)}
      </Text>
      <Slider
        accessibilityLabel="Monthly saving"
        minimumValue={0}
        maximumValue={Math.max(1, plan.monthlyIncome)}
        step={10}
        value={saving}
        onValueChange={setSaving}
        minimumTrackTintColor="#151719"
        maximumTrackTintColor="#D4C4F0"
        thumbTintColor="#151719"
        style={{ height: 56, marginTop: 20 }}
      />
      <View className="mt-4 rounded-card bg-card p-5">
        <Text className="text-[13px] text-ink-2">Your freedom date</Text>
        <Text className="mt-2 text-[48px] font-bold leading-[54px] text-ink">
          {result.year ?? "Not yet"}
        </Text>
        <Text className="mt-3 text-[14px] text-ink-2">
          {money(proposed.monthlySpending)} for monthly expenses
        </Text>
      </View>
    </RevealFrame>
  );
}
