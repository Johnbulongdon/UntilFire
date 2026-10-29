import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { RevealFrame } from "@/components/RevealFrame";
import { Text } from "@/components/Text";
import { money } from "@/lib/format";
import { freedomFor, planFromDraft, usePlan } from "@/state/plan";
export default function Standing() {
  const { draft } = usePlan();
  const plan = useMemo(() => planFromDraft(draft), [draft]);
  const result = useMemo(() => freedomFor(plan), [plan]);
  const saved = plan.monthlyIncome - plan.monthlySpending;
  const rate = Math.round(result.savingsRate * 100);
  const share = Math.min(100, Math.max(0, 100 - rate));
  return (
    <RevealFrame
      eyebrow="Your monthly picture"
      next="Try one improvement"
      onNext={() => router.push("/onboarding/pace")}
    >
      <Text className="text-[52px] font-bold leading-[60px] text-ink">
        {rate}% saved
      </Text>
      <View
        style={{
          height: 24,
          borderRadius: 999,
          overflow: "hidden",
          flexDirection: "row",
          backgroundColor: "#B9E7D6",
          marginTop: 32,
        }}
      >
        <View style={{ width: `${share}%`, backgroundColor: "#151719" }} />
      </View>
      <View className="mt-6 flex-row justify-between gap-5">
        <View>
          <Text className="text-[13px] text-ink-2">Expenses</Text>
          <Text className="mt-2 text-[26px] font-bold text-ink">
            {money(plan.monthlySpending)}
          </Text>
        </View>
        <View>
          <Text className="text-[13px] text-ink-2">Saved each month</Text>
          <Text className="mt-2 text-[26px] font-bold text-ink">
            {money(saved)}
          </Text>
        </View>
      </View>
      <Text className="mt-8 text-[16px] leading-6 text-ink-2">
        Your starting point. Small changes can move your date.
      </Text>
    </RevealFrame>
  );
}
