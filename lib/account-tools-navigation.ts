import type { SetupGoal } from "./account-setup";
export type PlanAccountPicker = {
  goal: SetupGoal;
  onBack: () => void;
  onExisting: () => void;
  onStarted: (provider: { name: string }) => Promise<void>;
};
