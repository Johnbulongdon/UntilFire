export type SetupGoal = "invest" | "save";
export type SetupStage = "choose" | "applying" | "opened" | "selected" | "done";
export type AccountSetup = {
  goal: SetupGoal;
  stage: SetupStage;
  origin: "existing" | "new" | null;
  account_label: string;
  version: number;
};
export const isSetupGoal = (v: unknown): v is SetupGoal =>
  v === "invest" || v === "save";
export const setupTitle = (goal: SetupGoal) =>
  goal === "save"
    ? "A home for your savings"
    : "Put your investing plan in motion";
export function setupChange(
  current: AccountSetup | null,
  action: unknown,
  label: unknown,
): Pick<AccountSetup, "stage" | "origin" | "account_label"> | null {
  const name = typeof label === "string" ? label.trim().slice(0, 80) : "";
  if (action === "reset")
    return { stage: "choose", origin: null, account_label: "" };
  if (action === "existing" && name)
    return { stage: "selected", origin: "existing", account_label: name };
  if (action === "started" && name)
    return { stage: "applying", origin: "new", account_label: name };
  if (action === "opened" && current?.stage === "applying")
    return { ...current, stage: "opened" };
  if (
    action === "done" &&
    current &&
    ["opened", "selected"].includes(current.stage)
  )
    return { ...current, stage: "done" };
  return null;
}
