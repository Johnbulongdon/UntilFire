import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, View } from "react-native";
import type { ToolOffer } from "@engine/accounts-tools-client.ts";
import type { AccountSetup, SetupGoal } from "@engine/account-setup.ts";
import { isSetupGoal } from "@engine/account-setup.ts";
import { rateLabel } from "@engine/partner-offers.ts";
import { DetailScreen } from "@/components/DetailScreen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useToolsAPI, TOOLS_SITE } from "@/lib/use-tools-api";
import { colors, brand } from "@/theme/colors";
export default function ToolsScreen() {
  const { owner } = useToolsAPI();
  const { goal } = useLocalSearchParams<{ goal: string }>();
  return <Tools key={(owner ?? "signed-out") + ":" + (goal ?? "invest")} />;
}
function Tools() {
  const { goal: raw } = useLocalSearchParams<{ goal: string }>();
  const { api } = useToolsAPI();
  const [goal, setGoal] = useState<SetupGoal>(
    isSetupGoal(raw) ? raw : "invest",
  );
  const [offers, setOffers] = useState<ToolOffer[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [country, setCountry] = useState("US");
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [returned, setReturned] = useState(false);
  const load = useCallback(async () => {
    const d = await api<{ offers: ToolOffer[] }>("/api/offers");
    setOffers(d.offers);
    setError("");
  }, [api]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void api<{ offers: ToolOffer[] }>("/api/offers")
        .then((d) => {
          if (live) {
            setOffers(d.offers);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
      return () => {
        live = false;
      };
    }, [api]),
  );
  const detail = offers?.find((o) => o.slug === selected);
  const visible =
    offers?.filter(
      (o) =>
        (goal === "invest" ? o.kind === "brokerage" : o.kind !== "brokerage") &&
        o.country === country,
    ) ?? [];
  async function open(o: ToolOffer) {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ href: string }>("/api/offers/open", {
        slug: o.slug,
        referralKey: o.referralKey,
      });
      if (!/^\/go\/[a-z0-9-]+\?intent=[a-f0-9-]+$/.test(d.href))
        throw new Error("Couldn’t open this provider.");
      const state = await api<{ journeys: AccountSetup[] }>(
        "/api/account-setup",
      );
      const current = state.journeys.find((j) => j.goal === goal);
      await api("/api/account-setup", {
        goal,
        version: current?.version ?? 0,
        action: "started",
        label: o.name,
      });
      await WebBrowser.openBrowserAsync(TOOLS_SITE + d.href);
      setReturned(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <DetailScreen
      back="Money"
      title="Accounts & tools"
      subtitle="Find a home for your next step."
      onRefresh={() => {
        void load().catch((e) => setError(e.message));
      }}
      refreshing={busy}
    >
      {!!error && (
        <View className="gap-2">
          <Text accessibilityRole="alert" className="text-neg-ink">
            {error}
          </Text>
          <Button
            kind="quiet"
            label="Retry"
            onPress={() => {
              void load().catch((e) => setError(e.message));
            }}
          />
        </View>
      )}
      {returned ? (
        <View className="gap-4 rounded-card border border-border bg-card p-5">
          <Text className="text-[23px] font-bold text-ink">How did it go?</Text>
          <Text className="text-[15px] leading-6 text-ink-2">
            Opening a link doesn’t confirm your account is open.
          </Text>
          <Button
            label="Return to my plan"
            onPress={() =>
              router.push({
                pathname: "/plan/account-setup",
                params: { goal },
              } as never)
            }
          />
          <Button
            kind="quiet"
            label="Browse accounts"
            onPress={() => {
              setReturned(false);
              setSelected(null);
            }}
          />
        </View>
      ) : detail ? (
        <View className="gap-4 rounded-card border border-border bg-card p-5">
          <Button
            kind="quiet"
            small
            label="‹ All accounts"
            onPress={() => setSelected(null)}
          />
          <View
            style={{
              backgroundColor: brand.yellow,
              borderRadius: 18,
              width: 54,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: "#151719" }}
              className="text-[26px] font-bold"
            >
              {detail.name.slice(0, 1)}
            </Text>
          </View>
          <Text className="text-[28px] font-bold text-ink">{detail.name}</Text>
          <Text className="text-[16px] leading-6 text-ink-2">
            {detail.blurb}
          </Text>
          {detail.rateBps !== null && (
            <Text className="text-[20px] font-bold text-ink">
              {rateLabel(detail.rateBps)}
            </Text>
          )}
          {!!detail.bonusText && (
            <Text className="text-ink">{detail.bonusText}</Text>
          )}
          <Text className="text-[14px] leading-5 text-ink-2">
            Check the provider’s eligibility, fees and terms before applying.
          </Text>
          <Button
            label={"Continue to " + detail.name + " ↗"}
            busy={busy}
            onPress={() => void open(detail)}
          />
          <Text className="text-[12px] text-ink-2">{detail.referralLabel}</Text>
          <Button
            kind="quiet"
            label="I already have an account"
            onPress={() =>
              router.push({
                pathname: "/plan/account-setup",
                params: { goal },
              } as never)
            }
          />
        </View>
      ) : (
        <>
          <View
            style={{
              backgroundColor: brand.lilac,
              borderRadius: 26,
              padding: 22,
              gap: 12,
            }}
          >
            <Text
              style={{ color: "#151719" }}
              className="text-[24px] font-bold"
            >
              Your plan. Your choice.
            </Text>
            <Text
              style={{ color: "#5C6170" }}
              className="text-[15px] leading-5"
            >
              Already have an account? You can use that.
            </Text>
            <Button
              kind="onAccent"
              label="Use an existing account"
              onPress={() =>
                router.push({
                  pathname: "/plan/account-setup",
                  params: { goal },
                } as never)
              }
            />
          </View>
          <View className="flex-row gap-2">
            {(["invest", "save"] as const).map((g) => (
              <Button
                key={g}
                small
                kind={goal === g ? "primary" : "quiet"}
                label={g === "invest" ? "Investing" : "Savings & banking"}
                accessibilityLabel={
                  (g === "invest" ? "Investing" : "Savings & banking") +
                  (goal === g ? ", selected" : "")
                }
                onPress={() => {
                  setGoal(g);
                  setCompare([]);
                  setShowCompare(false);
                }}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {[...new Set(["US", ...(offers ?? []).map((o) => o.country)])].map(
              (c) => (
                <Button
                  small
                  key={c}
                  kind={country === c ? "soft" : "quiet"}
                  label={c}
                  accessibilityLabel={
                    "Country " + c + (c === country ? ", selected" : "")
                  }
                  onPress={() => {
                    setCountry(c);
                    setCompare([]);
                    setShowCompare(false);
                  }}
                />
              ),
            )}
          </View>
          {offers === null && !error && (
            <ActivityIndicator color={colors.ink} />
          )}
          {offers !== null && !visible.length && (
            <View className="gap-2 rounded-card border border-border bg-card p-5">
              <Text className="text-[20px] font-bold text-ink">
                No reviewed accounts here yet
              </Text>
              <Text className="text-[14px] text-ink-2">
                Use an account you already have, or check back later.
              </Text>
            </View>
          )}
          {visible.map((o) => (
            <View
              key={o.slug}
              className="gap-3 rounded-card border border-border bg-card p-5"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    backgroundColor: brand.mint,
                    borderRadius: 15,
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#151719" }}
                    className="text-[22px] font-bold"
                  >
                    {o.name.slice(0, 1)}
                  </Text>
                </View>
                <Text className="flex-1 text-[22px] font-bold text-ink">
                  {o.name}
                </Text>
              </View>
              <Text className="text-[15px] leading-5 text-ink-2">
                {o.blurb}
              </Text>
              {o.rateBps !== null && (
                <Text className="font-bold text-ink">
                  {rateLabel(o.rateBps)}
                </Text>
              )}
              {!!o.bonusText && <Text className="text-ink">{o.bonusText}</Text>}
              <Button
                kind="quiet"
                label="View details →"
                onPress={() => setSelected(o.slug)}
              />
              <Button
                kind="quiet"
                small
                disabled={!compare.includes(o.slug) && compare.length >= 2}
                label={
                  (compare.includes(o.slug) ? "✓ " : "") + "Compare " + o.name
                }
                onPress={() =>
                  setCompare((c) =>
                    c.includes(o.slug)
                      ? c.filter((x) => x !== o.slug)
                      : [...c, o.slug],
                  )
                }
              />
            </View>
          ))}
          {compare.length > 0 && (
            <View className="gap-3 rounded-card border border-border bg-card p-5">
              <Text className="font-bold text-ink">
                {compare.length} of 2 selected
              </Text>
              <Button
                label={showCompare ? "Hide comparison" : "Compare"}
                disabled={compare.length !== 2}
                onPress={() => setShowCompare((v) => !v)}
              />
              {showCompare &&
                offers
                  ?.filter((o) => compare.includes(o.slug))
                  .map((o) => (
                    <View key={o.slug} className="gap-2">
                      <Text className="text-[20px] font-bold text-ink">
                        {o.name}
                      </Text>
                      <Text className="text-ink-2">{o.blurb}</Text>
                      <Text className="text-ink">
                        {rateLabel(o.rateBps) ?? "No listed APY"}
                      </Text>
                      <Text className="text-[12px] text-ink-2">
                        {o.referralLabel}
                      </Text>
                      <Button
                        kind="quiet"
                        label={"View " + o.name}
                        onPress={() => setSelected(o.slug)}
                      />
                    </View>
                  ))}
              <Button
                kind="quiet"
                label="Clear comparison"
                onPress={() => {
                  setCompare([]);
                  setShowCompare(false);
                }}
              />
            </View>
          )}
        </>
      )}
      <Button
        kind="quiet"
        label="My referral links"
        onPress={() => router.push("/provider-links" as never)}
      />
      <Text className="text-[12px] leading-5 text-ink-2">
        UntilFire isn’t a bank or an adviser. Availability, rates and terms can
        change.
      </Text>
    </DetailScreen>
  );
}
