import { router } from "expo-router";
import { View } from "react-native";
import { OptionCard } from "@/components/OptionCard";
import { QuestionScreen } from "@/components/QuestionScreen";
import { usePlan, type InvestStyle } from "@/state/plan";
const options: { id: InvestStyle; label: string }[] = [
  { id: "none", label: "Not yet" },
  { id: "index", label: "Index funds" },
  { id: "dividends", label: "Dividends" },
  { id: "property", label: "Property" },
];
export default function Investing() {
  const { draft, setDraft } = usePlan();
  const picked = draft.investing ?? [];
  return (
    <QuestionScreen
      step={10}
      steps={10}
      title="How do you invest?"
      hint="Pick all that fit."
      cta="Show my freedom date"
      canContinue={picked.length > 0}
      onNext={() => router.push("/onboarding/reveal")}
      onSkip={() => {
        setDraft({ investing: [] });
        router.push("/onboarding/reveal");
      }}
    >
      <View className="gap-3">
        {options.map((o) => (
          <OptionCard
            key={o.id}
            title={o.label}
            selected={picked.includes(o.id)}
            onPress={() =>
              setDraft({
                investing:
                  o.id === "none"
                    ? ["none"]
                    : picked.includes(o.id)
                      ? picked.filter((v) => v !== o.id)
                      : [...picked.filter((v) => v !== "none"), o.id],
              })
            }
          />
        ))}
      </View>
    </QuestionScreen>
  );
}
