import { useLocalSearchParams } from "expo-router";
import AccountToolsBrowser from "@/components/AccountToolsBrowser";
import { useToolsAPI } from "@/lib/use-tools-api";
export default function ToolsScreen() {
  const { owner } = useToolsAPI();
  const { goal } = useLocalSearchParams<{ goal?: string }>();
  return <AccountToolsBrowser key={(owner ?? "signed-out") + ":" + (goal ?? "invest")} />;
}
