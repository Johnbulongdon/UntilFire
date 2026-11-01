import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { View } from "react-native";
import type { AccountSetup } from "@engine/account-setup.ts";
import { useToolsAPI } from "@/lib/use-tools-api";
import { Button } from "./Button";
import { Text } from "./Text";
/** Resume a user-started setup only; callers preserve higher-priority next moves. */
export function AccountSetupCard() {
  const { api, owner } = useToolsAPI();
  const [state, setState] = useState<{
    owner: string;
    item: AccountSetup;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void api<{ journeys: AccountSetup[] }>("/api/account-setup")
        .then((d) => {
          const item = d.journeys.find((j) =>
            ["applying", "opened", "selected"].includes(j.stage),
          );
          if (live && owner) setState(item ? { owner, item } : null);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [api, owner]),
  );
  if (!state || state.owner !== owner) return null;
  return (
    <View className="gap-3 rounded-card border border-border bg-card p-5">
      <Text className="text-[12px] font-bold uppercase text-ink-2">
        Your next step
      </Text>
      <Text className="text-[19px] font-bold text-ink">
        Continue with {state.item.account_label}
      </Text>
      <Button
        label="Open my plan"
        onPress={() =>
          router.push({
            pathname: "/plan/account-setup",
            params: { goal: state.item.goal },
          } as never)
        }
      />
    </View>
  );
}
