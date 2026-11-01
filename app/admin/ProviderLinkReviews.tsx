"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import s from "@/app/dashboard/AccountsTools.module.css";
type Review = {
  id: string;
  url: string;
  display_name: string;
  status: string;
  version: number;
  partner_offers: { name: string } | null;
  referral_partners: { code: string; status: string } | null;
};
export default function ProviderLinkReviews({ token }: { token: string }) {
  const [links, setLinks] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/offers/provider-links", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLinks(d.links);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function review(link: Review, status: string, note: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/offers/provider-links", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: link.id,
          version: link.version,
          status,
          note,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.page}>
      <h2>Member referral links</h2>
      <p className={s.muted}>
        Check the programme permits this placement, the link and the public name
        before approval.
      </p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <Button onClick={() => void load()}>Refresh queue</Button>
      {!links.length && <p>No links submitted yet.</p>}
      {links.map((l) => (
        <form
          key={l.id + ":" + l.version}
          className={s.card}
          onSubmit={(e) => {
            e.preventDefault();
            void review(
              l,
              "approved",
              String(new FormData(e.currentTarget).get("note") ?? ""),
            );
          }}
        >
          <div className={s.row}>
            <strong>{l.partner_offers?.name ?? "Provider"}</strong>
            <span className={s.pill}>{l.status}</span>
          </div>
          <p>
            {l.display_name} · {l.referral_partners?.code} ·{" "}
            {l.referral_partners?.status}
          </p>
          <code>{l.url}</code>
          <label className={s.field}>
            Review note
            <input name="note" maxLength={240} />
          </label>
          <div className={s.row}>
            <Button type="submit" disabled={busy}>
              Approve
            </Button>
            <Button
              disabled={busy}
              onClick={(e) => {
                const f = e.currentTarget.form;
                void review(
                  l,
                  "rejected",
                  f ? String(new FormData(f).get("note") ?? "") : "",
                );
              }}
            >
              Reject / revoke
            </Button>
          </div>
        </form>
      ))}
    </section>
  );
}
