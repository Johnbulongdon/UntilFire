"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { OwnLinks } from "@/lib/accounts-tools-client";
import { useToolsAPI } from "./useToolsAPI";
import s from "./AccountsTools.module.css";
export default function ProviderLinksPanel() {
  const { api, owner } = useToolsAPI();
  const [state, setState] = useState<{ owner: string; data: OwnLinks } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const generation = useRef(0);
  const data = state && state.owner === owner ? state.data : null;
  const load = useCallback(async () => {
    const n = ++generation.current;
    try {
      const d = await api<OwnLinks>("/api/referrals/provider-links");
      if (n === generation.current && owner) setState({ owner, data: d });
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
  async function save(
    form: HTMLFormElement,
    slug: string,
    version: number,
    action = "save",
  ) {
    const f = new FormData(form);
    setError("");
    setBusy(true);
    try {
      await api("/api/referrals/provider-links", {
        slug,
        version,
        action,
        url: f.get("url"),
        displayName: f.get("displayName"),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.page}>
      <header>
        <h1 className="uf-t-h1">My provider links</h1>
        <p className={s.muted}>
          People who join through your UntilFire invite can use your provider
          links.
        </p>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}{" "}
          <Button
            size="sm"
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      {!data && !error && <p role="status">Loading your links…</p>}
      {data?.code && (
        <div className={s.card}>
          <strong>Your UntilFire invite</strong>
          <code className="ph-mask">
            {"https://www.untilfire.com/r/" + data.code}
          </code>
          <Button
            onClick={() => {
              void navigator.clipboard
                .writeText("https://www.untilfire.com/r/" + data.code)
                .then(() => setCopied(true))
                .catch(() =>
                  setError("Couldn’t copy. Select the invite link to copy it."),
                );
            }}
          >
            {copied ? "Copied" : "Copy invite link"}
          </Button>
        </div>
      )}
      {data?.paused && (
        <p role="status">
          Your referral profile is paused. Contact support before adding links.
        </p>
      )}
      {data?.providers.length === 0 && (
        <div className={s.card}>
          <strong>Provider links are coming</strong>
          <p className={s.muted}>
            Only reviewed providers appear here. Your UntilFire invite still
            works.
          </p>
        </div>
      )}
      {data?.providers.map((provider) => {
        const link = data.links.find((l) => l.offer_id === provider.id);
        return (
          <form
            key={provider.id + ":" + (link?.version ?? 0)}
            onSubmit={(e) => {
              e.preventDefault();
              void save(e.currentTarget, provider.slug, link?.version ?? 0);
            }}
            className={s.card}
          >
            <div className={s.row + " " + s.between}>
              <h3>{provider.name}</h3>
              {link && (
                <span className={s.pill}>
                  {link.status === "pending"
                    ? "In review"
                    : link.status === "approved"
                      ? "Approved"
                      : "Needs changes"}
                </span>
              )}
            </div>
            <label className={s.field}>
              Public first name
              <input
                name="displayName"
                maxLength={40}
                required
                defaultValue={link?.display_name ?? ""}
                autoComplete="given-name"
              />
            </label>
            <label className={s.field}>
              Your referral link
              <input
                name="url"
                type="url"
                maxLength={2048}
                required
                defaultValue={link?.url ?? ""}
                placeholder={"https://" + provider.allowed_domain + "/…"}
              />
            </label>
            {link?.review_note && (
              <p className={s.muted + " ph-mask"}>{link.review_note}</p>
            )}
            <p className={s.small}>
              New and edited links need approval. UntilFire’s link is used while
              yours is in review.
            </p>
            <div className={s.row}>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || data.paused}
              >
                {busy ? "Saving…" : "Submit for review"}
              </Button>
              {link && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    const form = e.currentTarget.form;
                    if (form)
                      void save(form, provider.slug, link.version, "remove");
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </form>
        );
      })}
    </section>
  );
}
