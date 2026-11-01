"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import {
  isSetupGoal,
  setupTitle,
  type AccountSetup,
  type SetupGoal,
} from "@/lib/account-setup";
import { useToolsAPI } from "./useToolsAPI";
import s from "./AccountsTools.module.css";
export default function AccountSetupTab() {
  const params = useSearchParams();
  const raw = params.get("goal");
  const goal: SetupGoal = isSetupGoal(raw) ? raw : "invest";
  const { api, owner } = useToolsAPI();
  const [state, setState] = useState<{
    owner: string;
    journeys: AccountSetup[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [existing, setExisting] = useState(false);
  const generation = useRef(0);
  const current =
    state && state.owner === owner
      ? state.journeys.find((j) => j.goal === goal)
      : null;
  const load = useCallback(async () => {
    const n = ++generation.current;
    try {
      const data = await api<{ journeys: AccountSetup[] }>(
        "/api/account-setup",
      );
      if (n === generation.current && owner) setState({ owner, ...data });
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    }
  }, [api, owner]);
  const cancelLoad = useCallback(() => {
    generation.current += 1;
  }, []);
  useEffect(() => {
    void load();
    return cancelLoad;
  }, [load, cancelLoad]);
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
      await load();
    } finally {
      setBusy(false);
    }
  }
  const stage = current?.stage ?? "choose";
  const step = stage === "choose" ? 0 : stage === "applying" ? 1 : 2;
  return (
    <div className={s.page}>
      <a className={s.link} href="/dashboard?tab=contributions">
        ‹ Contributions
      </a>
      <div className={s.hero}>
        <span className={s.icon}>{stage === "done" ? "✓" : "↗"}</span>
        <h1>{setupTitle(goal)}</h1>
        <p>
          {stage === "done"
            ? "Setup marked complete. Keep your balances and contributions up to date in Money."
            : "One account. One useful next step."}
        </p>
        <div className={s.steps} aria-label={"Step " + (step + 1) + " of 3"}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? s.active : undefined} />
          ))}
        </div>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}{" "}
          <Button
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      {state?.owner !== owner && !error ? (
        <p role="status">Loading your next step…</p>
      ) : (
        <div className={s.card}>
          {stage === "choose" && (
            <>
              <h2>Choose an account</h2>
              <p className={s.muted}>
                Use one you have, or compare reviewed providers.
              </p>
              <Button variant="primary" onClick={() => setExisting(true)}>
                Use an existing account
              </Button>
              {existing && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("existing");
                  }}
                  className={s.field}
                >
                  <label htmlFor="setup-account">Account nickname</label>
                  <input
                    id="setup-account"
                    required
                    maxLength={80}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My investment account"
                  />
                  <Button type="submit" disabled={busy || !label.trim()}>
                    Use this account
                  </Button>
                </form>
              )}
              <a className={s.link} href={"/dashboard?tab=offers&goal=" + goal}>
                Browse accounts &amp; tools →
              </a>
            </>
          )}
          {stage === "applying" && (
            <>
              <h2 className="ph-mask">{current?.account_label}</h2>
              <p className={s.muted}>
                Your account is only marked open when you confirm.
              </p>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void act("opened")}
              >
                I’ve opened the account
              </Button>
              <a className={s.link} href="/dashboard">
                Still applying — return Home
              </a>
              <Button disabled={busy} onClick={() => void act("reset")}>
                Choose another account
              </Button>
            </>
          )}
          {["selected", "opened"].includes(stage) && (
            <>
              <h2 className="ph-mask">{current?.account_label}</h2>
              <span className={s.pill}>
                {current?.origin === "existing"
                  ? "Existing account"
                  : "You confirmed it’s open"}
              </span>
              <p className={s.muted}>
                {goal === "invest"
                  ? "Set up your contribution with your provider, then come back to mark this step done."
                  : "Set up your savings transfer with your provider, then come back to mark this step done."}
              </p>
              <a className={s.link} href="/dashboard?tab=contributions">
                Review my contribution plan →
              </a>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void act("done")}
              >
                I’ve set it up
              </Button>
              <Button disabled={busy} onClick={() => void act("reset")}>
                Choose another account
              </Button>
            </>
          )}
          {stage === "done" && (
            <>
              <h2>Ready for the next step</h2>
              <p className={s.muted}>
                This records setup only. No money has been moved by UntilFire.
              </p>
              <a className={s.link} href="/dashboard">
                Continue Home →
              </a>
              <Button disabled={busy} onClick={() => void act("reset")}>
                Change account
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
/** Only resumes a user-started task; never displaces a higher-priority financial action. */
export function PendingAccountSetup({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const { api, owner } = useToolsAPI();
  const [state, setState] = useState<{
    owner: string;
    item: AccountSetup;
  } | null>(null);
  useEffect(() => {
    let live = true;
    void api<{ journeys: AccountSetup[] }>("/api/account-setup")
      .then((d) => {
        const item = d.journeys.find((j) =>
          ["applying", "selected", "opened"].includes(j.stage),
        );
        if (live && owner && item) setState({ owner, item });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api, owner]);
  if (!state || state.owner !== owner) return fallback;
  return (
    <div className={s.card}>
      <span className={s.pill}>Your next step</span>
      <h3 className="ph-mask">Continue with {state.item.account_label}</h3>
      <p className={s.muted}>
        {state.item.stage === "applying"
          ? "Come back when your account is ready."
          : "Finish setting up your contribution."}
      </p>
      <a
        className={s.link}
        href={"/dashboard?tab=account-setup&goal=" + state.item.goal}
      >
        Open my plan →
      </a>
    </div>
  );
}
