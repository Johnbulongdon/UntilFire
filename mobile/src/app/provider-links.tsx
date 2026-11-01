import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Share, TextInput, View } from "react-native";
import type {
  OwnLinks,
  OwnProviderLink,
} from "@engine/accounts-tools-client.ts";
import { DetailScreen } from "@/components/DetailScreen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useToolsAPI } from "@/lib/use-tools-api";
import { colors } from "@/theme/colors";
export default function ProviderLinksScreen() {
  const { owner } = useToolsAPI();
  return <Links key={owner ?? "signed-out"} />;
}
function Links() {
  const { api } = useToolsAPI();
  const [data, setData] = useState<OwnLinks | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setData(await api<OwnLinks>("/api/referrals/provider-links"));
    setError("");
  }, [api]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void api<OwnLinks>("/api/referrals/provider-links")
        .then((d) => {
          if (live) setData(d);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
      return () => {
        live = false;
      };
    }, [api]),
  );
  async function save(
    slug: string,
    version: number,
    url: string,
    name: string,
    action = "save",
  ) {
    setError("");
    setBusy(true);
    try {
      await api("/api/referrals/provider-links", {
        slug,
        version,
        url,
        displayName: name,
        action,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <DetailScreen
      back="Profile"
      title="My referral links"
      subtitle="People who join through your UntilFire invite can use your provider links."
      refreshing={busy}
      onRefresh={() => {
        void load().catch((e) => setError(e.message));
      }}
    >
      {!!error && (
        <Text accessibilityRole="alert" className="text-neg-ink">
          {error}
        </Text>
      )}
      {!data && !error && <ActivityIndicator color={colors.ink} />}
      <Button
        kind="quiet"
        label="Refresh"
        onPress={() => {
          void load().catch((e) => setError(e.message));
        }}
      />
      {data?.code && (
        <View className="gap-3 rounded-card border border-border bg-card p-5">
          <Text className="font-bold text-ink">Your UntilFire invite</Text>
          <Text selectable className="text-[14px] text-ink-2">
            {"https://www.untilfire.com/r/" + data.code}
          </Text>
          <Button
            label="Share invite link"
            onPress={() => {
              void Share.share({
                message:
                  "Try UntilFire: https://www.untilfire.com/r/" + data.code,
              }).catch(() => setError("Couldn’t share your link."));
            }}
          />
        </View>
      )}
      {data?.paused && (
        <Text className="text-ink-2">
          Your referral profile is paused. Contact support before adding links.
        </Text>
      )}
      {data?.providers.length === 0 && (
        <View className="gap-2 rounded-card border border-border bg-card p-5">
          <Text className="text-[20px] font-bold text-ink">
            Provider links are coming
          </Text>
          <Text className="text-ink-2">
            Only reviewed providers appear here. Your UntilFire invite still
            works.
          </Text>
        </View>
      )}
      {data?.providers.map((p) => (
        <LinkForm
          key={
            p.id +
            ":" +
            (data.links.find((l) => l.offer_id === p.id)?.version ?? 0)
          }
          provider={p}
          link={data.links.find((l) => l.offer_id === p.id)}
          disabled={busy || data.paused}
          onSave={save}
        />
      ))}
    </DetailScreen>
  );
}
function LinkForm({
  provider,
  link,
  disabled,
  onSave,
}: {
  provider: OwnLinks["providers"][number];
  link?: OwnProviderLink;
  disabled: boolean;
  onSave: (
    slug: string,
    version: number,
    url: string,
    name: string,
    action?: string,
  ) => Promise<void>;
}) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [name, setName] = useState(link?.display_name ?? "");
  const input = {
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  };
  return (
    <View className="gap-3 rounded-card border border-border bg-card p-5">
      <Text className="text-[22px] font-bold text-ink">{provider.name}</Text>
      {link && (
        <Text className="text-[13px] font-bold text-ink-2">
          {link.status === "pending"
            ? "In review"
            : link.status === "approved"
              ? "Approved"
              : "Needs changes"}
        </Text>
      )}
      <Text className="text-ink">Public first name</Text>
      <TextInput
        accessibilityLabel="Public first name"
        value={name}
        onChangeText={setName}
        maxLength={40}
        style={input}
      />
      <Text className="text-ink">Your referral link</Text>
      <TextInput
        accessibilityLabel={provider.name + " referral link"}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={url}
        onChangeText={setUrl}
        maxLength={2048}
        placeholder={"https://" + provider.allowed_domain + "/…"}
        placeholderTextColor={colors.ink3}
        style={input}
      />
      {!!link?.review_note && (
        <Text className="text-ink-2">{link.review_note}</Text>
      )}
      <Text className="text-[12px] leading-5 text-ink-2">
        New and edited links need approval. UntilFire’s link is used during
        review.
      </Text>
      <Button
        label="Submit for review"
        disabled={disabled || !url.trim() || !name.trim()}
        onPress={() =>
          void onSave(provider.slug, link?.version ?? 0, url, name)
        }
      />
      {link && (
        <Button
          kind="quiet"
          label="Remove"
          disabled={disabled}
          onPress={() =>
            void onSave(provider.slug, link.version, url, name, "remove")
          }
        />
      )}
    </View>
  );
}
