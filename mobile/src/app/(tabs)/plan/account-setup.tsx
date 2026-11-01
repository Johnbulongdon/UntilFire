import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, TextInput, View } from "react-native";
import {
  isSetupGoal,
  setupTitle,
  type AccountSetup,
  type SetupGoal,
} from "@engine/account-setup.ts";
import { DetailScreen } from "@/components/DetailScreen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useToolsAPI } from "@/lib/use-tools-api";
import { colors, brand } from "@/theme/colors";
export default function AccountSetupScreen() {
  const { owner } = useToolsAPI();
  const { goal } = useLocalSearchParams<{ goal: string }>();
  return <Setup key={(owner ?? "signed-out") + ":" + (goal ?? "invest")} />;
}
function Setup() {
  const { goal: raw } = useLocalSearchParams<{ goal: string }>();
  const goal: SetupGoal = isSetupGoal(raw) ? raw : "invest";
  const { api } = useToolsAPI();
  const [current, setCurrent] = useState<AccountSetup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(false);
  const [label, setLabel] = useState("");
  const load = useCallback(async () => {
    const data = await api<{ journeys: AccountSetup[] }>("/api/account-setup");
    setCurrent(data.journeys.find((j) => j.goal === goal) ?? null);
    setLoaded(true);
  }, [api, goal]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void api<{ journeys: AccountSetup[] }>("/api/account-setup")
        .then((d) => {
          if (live) {
            setCurrent(d.journeys.find((j) => j.goal === goal) ?? null);
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
      return () => {
        live = false;
      };
    }, [api, goal]),
  );
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/account-setup", {
        goal,
        version: current?.version ?? 0,
        action,
        label,
      });
      await load();
      setExisting(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const stage = current?.stage ?? "choose";
  const step = stage === "choose" ? 0 : stage === "applying" ? 1 : 2;
  return (
    <DetailScreen
      back="Plan"
      title={setupTitle(goal)}
      onRefresh={() => {
        void load().catch((e) => setError(e.message));
      }}
      refreshing={busy}
    >
      <View
        style={{
          backgroundColor: brand.lilac,
          borderRadius: 26,
          padding: 22,
          gap: 12,
        }}
      >
        <Text style={{ color: "#151719" }} className="text-[25px] font-bold">
          {stage === "done"
            ? "Ready for your next step"
            : "One account. One useful step."}
        </Text>
        <View className="flex-row gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 6,
                flex: 1,
                borderRadius: 4,
                backgroundColor: i <= step ? "#B49B3E" : "#D9D2E7",
              }}
            />
          ))}
        </View>
        <Text style={{ color: "#5C6170" }}>
          Choose an account · Set it up · Continue
        </Text>
      </View>
      {!!error && (
        <View className="gap-2">
          <Text accessibilityRole="alert" className="text-[14px] text-neg-ink">
            {error}
          </Text>
          <Button
            kind="quiet"
            label="Retry"
            onPress={() => {
              setError("");
              void load().catch((e) => setError(e.message));
            }}
          />
        </View>
      )}
      {!loaded && !error ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View className="gap-4 rounded-card border border-border bg-card p-5">
          {stage === "choose" && (
            <>
              <Text className="text-[20px] font-bold text-ink">
                Choose an account
              </Text>
              <Button
                label="Use an existing account"
                onPress={() => setExisting(true)}
              />
              {existing && (
                <>
                  <Text nativeID="account-label" className="text-ink">
                    Account nickname
                  </Text>
                  <TextInput
                    accessibilityLabel="Account nickname"
                    value={label}
                    maxLength={80}
                    onChangeText={setLabel}
                    placeholder="My investment account"
                    placeholderTextColor={colors.ink3}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border2,
                      borderRadius: 14,
                      padding: 14,
                      color: colors.ink,
                      fontSize: 16,
                    }}
                  />
                  <Button
                    label="Use this account"
                    busy={busy}
                    disabled={!label.trim()}
                    onPress={() => void act("existing")}
                  />
                </>
              )}
              <Button
                kind="quiet"
                label="Browse accounts & tools"
                onPress={() =>
                  router.push({
                    pathname: "/money/tools",
                    params: { goal },
                  } as never)
                }
              />
            </>
          )}
          {stage === "applying" && (
            <>
              <Text className="text-[20px] font-bold text-ink">
                {current?.account_label}
              </Text>
              <Text className="text-[14px] text-ink-2">
                Only you can confirm your account is open.
              </Text>
              <Button
                label="I’ve opened the account"
                busy={busy}
                onPress={() => void act("opened")}
              />
              <Button
                kind="quiet"
                label="Still applying — Home"
                onPress={() => router.navigate("/" as never)}
              />
              <Button
                kind="quiet"
                label="Choose another account"
                disabled={busy}
                onPress={() => void act("reset")}
              />
            </>
          )}
          {["selected", "opened"].includes(stage) && (
            <>
              <Text className="text-[20px] font-bold text-ink">
                {current?.account_label}
              </Text>
              <Text className="text-[14px] text-ink-2">
                {current?.origin === "existing"
                  ? "Existing account"
                  : "You confirmed it’s open"}
              </Text>
              <Text className="text-[15px] leading-6 text-ink-2">
                Set up your{" "}
                {goal === "save" ? "savings transfer" : "contribution"} with
                your provider, then mark this step done.
              </Text>
              <Button
                kind="quiet"
                label="Review contribution plan"
                onPress={() => router.push("/plan/contributions")}
              />
              <Button
                label="I’ve set it up"
                busy={busy}
                onPress={() => void act("done")}
              />
              <Button
                kind="quiet"
                label="Choose another account"
                disabled={busy}
                onPress={() => void act("reset")}
              />
            </>
          )}
          {stage === "done" && (
            <>
              <Text className="text-[20px] font-bold text-ink">
                Setup marked complete ✓
              </Text>
              <Text className="text-[14px] leading-5 text-ink-2">
                No money has been moved by UntilFire. Track your balances in
                Money.
              </Text>
              <Button
                label="Continue Home"
                onPress={() => router.navigate("/" as never)}
              />
              <Button
                kind="quiet"
                label="Change account"
                onPress={() => void act("reset")}
              />
            </>
          )}
        </View>
      )}
    </DetailScreen>
  );
}
