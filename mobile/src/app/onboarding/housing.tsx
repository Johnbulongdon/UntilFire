import { router } from "expo-router";
import { View } from "react-native";
import { OptionCard } from "@/components/OptionCard";
import { QuestionScreen } from "@/components/QuestionScreen";
import { usePlan, type Housing } from "@/state/plan";
import { colors } from "@/theme/colors";
export default function HousingQuestion() {
  const { draft, setDraft } = usePlan();
  return (
    <QuestionScreen
      step={9}
      steps={10}
      title="Your home"
      hint="Do you rent or own?"
      cta="Continue"
      canContinue={!!draft.housing}
      onNext={() => router.push("/onboarding/investing")}
      onSkip={() => {
        setDraft({ housing: undefined });
        router.push("/onboarding/investing");
      }}
    >
      <View className="gap-3">
        {(["rent", "own"] as Housing[]).map((h) => (
          <OptionCard
            key={h}
            title={h === "rent" ? "Rent" : "Own"}
            icon={{ name: "house.fill", tint: colors.ink }}
            selected={draft.housing === h}
            onPress={() => setDraft({ housing: h })}
          />
        ))}
      </View>
    </QuestionScreen>
  );
}
