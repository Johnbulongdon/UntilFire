"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button, Card } from "@/components/ui";
import { HOUSEHOLD_INVITE_KEY } from "@/lib/household-invite";

/**
 * The invitation landing page.
 *
 * Most of this file is the signup round trip, which is where invite flows
 * usually break: the person clicking is typically not signed in, and often has
 * no account at all. The login page sends everyone to /dashboard and takes no
 * return path, so the token is stashed in localStorage first and the dashboard
 * bounces back here once a session exists. Same origin, so it survives the
 * OAuth hop.
 */
type State =
  | { kind: "loading" }
  | { kind: "needs-auth"; token: string }
  | { kind: "accepting" }
  | { kind: "done" }
  | { kind: "error"; message: string; wrongAccount?: boolean };

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  const accept = useCallback(async (token: string, accessToken: string) => {
    setState({ kind: "accepting" });
    try {
      const res = await fetch("/api/household/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { error?: string; wrongAccount?: boolean };
      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? "Could not accept the invitation.", wrongAccount: body.wrongAccount });
        return;
      }
      try { localStorage.removeItem(HOUSEHOLD_INVITE_KEY); } catch { /* private mode */ }
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "Could not reach UntilFire. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    let token = params.get("token") ?? "";
    if (!token) {
      try { token = localStorage.getItem(HOUSEHOLD_INVITE_KEY) ?? ""; } catch { /* private mode */ }
    }
    if (!token) {
      setState({ kind: "error", message: "This link is missing its invitation code." });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Survive the trip through Google and back.
        try { localStorage.setItem(HOUSEHOLD_INVITE_KEY, token); } catch { /* private mode */ }
        setState({ kind: "needs-auth", token });
        return;
      }
      void accept(token, session.access_token);
    });
  }, [params, accept]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--uf-ground)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--uf-s4)" }}>
      <Card style={{ maxWidth: 460, width: "100%" }}>
        {state.kind === "loading" || state.kind === "accepting" ? (
          <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
            {state.kind === "accepting" ? "Joining…" : "Checking your invitation…"}
          </p>
        ) : state.kind === "needs-auth" ? (
          <>
            <h1 className="uf-t-h2" style={{ margin: "0 0 var(--uf-s3)" }}>You&rsquo;ve been invited</h1>
            <p className="uf-t-body" style={{ margin: "0 0 var(--uf-s5)", color: "var(--uf-ink-2)" }}>
              Sign in to accept. If you don&rsquo;t have an UntilFire account yet, signing in
              creates one &mdash; use the address the invitation was sent to.
            </p>
            <Button variant="primary" fullWidth onClick={() => router.push("/login")}>
              Sign in to accept
            </Button>
          </>
        ) : state.kind === "done" ? (
          <>
            <h1 className="uf-t-h2" style={{ margin: "0 0 var(--uf-s3)" }}>You&rsquo;re connected</h1>
            <p className="uf-t-body" style={{ margin: "0 0 var(--uf-s5)", color: "var(--uf-ink-2)" }}>
              You can each see the other&rsquo;s numbers from now on. Either of you can
              disconnect at any time from Profile, without asking the other.
            </p>
            <Button variant="primary" fullWidth onClick={() => router.push("/dashboard")}>
              Open your dashboard
            </Button>
          </>
        ) : (
          <>
            <h1 className="uf-t-h2" style={{ margin: "0 0 var(--uf-s3)" }}>That didn&rsquo;t work</h1>
            <p className="uf-t-body" style={{ margin: "0 0 var(--uf-s5)", color: "var(--uf-ink-2)" }}>{state.message}</p>
            {state.wrongAccount ? (
              <Button
                variant="primary"
                fullWidth
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              >
                Sign in with a different account
              </Button>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => router.push("/dashboard")}>
                Go to your dashboard
              </Button>
            )}
          </>
        )}
      </Card>
    </main>
  );
}

export default function HouseholdJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
