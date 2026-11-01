import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyProviderLinks() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <Redirect href={{ pathname: "/creator", params: from === "give-a-month" ? { from } : {} } as never} />;
}
