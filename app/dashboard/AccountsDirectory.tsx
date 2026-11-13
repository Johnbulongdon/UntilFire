"use client";
/* eslint-disable @next/next/no-img-element -- Small locally hosted provider marks; preserve original artwork. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, Check, Gift, Link as LinkIcon, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { DirectoryAccount } from "@/lib/accounts-directory";
import type { ToolOffer } from "@/lib/accounts-tools-client";
import { reserveToolHandoff } from "@/lib/tool-handoff";
import { useToolsAPI } from "./useToolsAPI";
import s from "./AccountsDirectory.module.css";
type Category = "all" | "bank" | "savings" | "brokerage";
type Entry = DirectoryAccount & {
    live?: ToolOffer;
};
export default function AccountsDirectory() {
    const { api, owner } = useToolsAPI();
    // Remount on account changes: selections, saved items and late replies cannot leak.
    return <Directory key={owner ?? "signed-out"} api={api} owner={owner}/>;
}
function Directory({ api, owner }: ReturnType<typeof useToolsAPI>) {
    const [data, setData] = useState<Entry[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");
    const [referralError, setReferralError] = useState(false);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<Category>("all");
    const [reward, setReward] = useState("all");
    const [saved, setSaved] = useState<string[]>([]);
    const [savedOnly, setSavedOnly] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [handoff, setHandoff] = useState("");
    const details = useRef<HTMLElement>(null);
    const generation = useRef(0);
    const load = useCallback(async () => {
        const n = ++generation.current;
        setError("");
        try {
            const [d, live] = await Promise.all([
                api<{
                    accounts: DirectoryAccount[];
                }>("/api/accounts-directory"),
                api<{
                    offers: ToolOffer[];
                }>("/api/offers").catch(() => null),
            ]);
            // A failed referral lookup must never silently switch a member to another beneficiary.
            if (n !== generation.current)
                return;
            const entries: Entry[] = d.accounts.map(p => ({ ...p, live: live?.offers.find(o => o.slug === p.slug && o.country === p.country && o.kind === p.kind) }));
            for (const o of (live?.offers ?? []).filter(o => o.country === "US"))
                if (!entries.some(p => p.slug === o.slug))
                    entries.push({ slug: o.slug, name: o.name, product: o.blurb, kind: o.kind, country: o.country, logo: "", source: "", description: o.blurb, reward: null, rewardKind: null, cashValue: 0, requirements: "Review the provider’s current eligibility, fees and terms before applying.", eligibility: "The linked provider sets the requirements.", checkedOn: "", reviewOn: "", endsOn: null, live: o });
            setData(entries);
            setReferralError(!live);
            setLoaded(true);
        }
        catch {
            if (n === generation.current) {
                setError("We couldn’t load accounts. Check your connection and try again.");
                setLoaded(true);
            }
        }
    }, [api]);
    const cancelLoad = useCallback(() => { generation.current++; }, []);
    useEffect(() => { if (owner)
        void load(); return cancelLoad; }, [load, owner, cancelLoad]);
    useEffect(() => { if (selected)
        details.current?.focus(); }, [selected]);
    if (!owner)
        return <section className={s.page}><h1 className="uf-t-h1">Accounts &amp; tools</h1><p>Sign in to discover accounts and offers.</p><a href="/login">Sign in</a></section>;
    const bonus = (p: Entry) => p.live ? p.live.bonusText : p.reward;
    const filtered = data.filter(p => (category === "all" || p.kind === category) && (!savedOnly || saved.includes(p.slug)) && `${p.name} ${p.product}`.toLowerCase().includes(query.toLowerCase()) && (reward === "all" || (bonus(p) && p.rewardKind === reward)));
    const featured = filtered.filter(p => bonus(p)).sort((a, b) => Number(a.rewardKind === "stock") - Number(b.rewardKind === "stock") || (b.live ? 0 : b.cashValue) - (a.live ? 0 : a.cashValue));
    const detail = data.find(p => p.slug === selected);
    const toggleSave = (slug: string) => setSaved(v => v.includes(slug) ? v.filter(x => x !== slug) : [...v, slug]);
    function provider(p: Entry) { return <div className={s.provider}><span className={s.logo}>{p.logo ? <img src={`/providers/directory/${p.logo}.png`} alt={`${p.name} logo`} width={40} height={40}/> : <Gift aria-hidden size={24}/>}</span><div><h3>{p.name}</h3><p className={s.muted}>{p.product}</p></div></div>; }
    async function open(p: Entry) {
        if (!p.live || busy || referralError)
            return;
        setBusy(true);
        setError("");
        setHandoff("");
        const popup = window.open("about:blank", "_blank");
        if (popup)
            popup.opener = null;
        try {
            const href = await reserveToolHandoff(api, p.live);
            if (popup)
                popup.location.href = href;
            else
                setHandoff(href);
        }
        catch {
            popup?.close();
            await load();
            setError("This referral link changed or could not be opened. Review the refreshed offer and try again.");
        }
        finally {
            setBusy(false);
        }
    }
    return <section className={s.page} aria-label="Accounts and tools directory">
    <header className={s.heading}><div><h1 className="uf-t-h1">Accounts &amp; tools</h1><p className={s.muted}>Discover banks, brokerages and offers worth a closer look.</p></div><span className={s.lock}><LockKeyhole size={14} aria-hidden/> Member access · United States</span></header>
    <div className={s.hero}><div><h2>More to discover.<br />Something to earn.</h2><p>Explore current offers, then find an account that fits your life.</p></div><div className={s.heroNote}><strong>Offers, with the details.</strong><div><Gift size={18} aria-hidden/> What you could receive</div><div><Check size={18} aria-hidden/> What you need to do</div><div><LinkIcon size={18} aria-hidden/> Whose link you use</div></div></div>
    <div className={s.toolbar}><label className={s.field}>Search accounts<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a bank, brokerage or account"/></label><label className={s.field}>Show<select value={reward} onChange={e => setReward(e.target.value)}><option value="all">All accounts</option><option value="cash">Cash offers</option><option value="stock">Stock rewards</option></select></label></div>
    <div className={s.filters} role="group" aria-label="Account categories">{([["all", "All accounts"], ["bank", "Banking"], ["savings", "Savings & cash"], ["brokerage", "Brokerages"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={category === value ? "primary" : "secondary"} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</Button>)}<Button size="sm" aria-pressed={savedOnly} onClick={() => setSavedOnly(v => !v)}><Bookmark size={15} aria-hidden/> Saved ({saved.length})</Button></div>
    {error && <div className={s.error} role="alert">{error}<Button onClick={() => void load()}>Retry</Button></div>}
    {referralError && <p className={s.muted} role="status">Referral links are temporarily unavailable. Published provider terms are still available. <Button size="sm" onClick={() => void load()}>Retry links</Button></p>}
    {!loaded && <p role="status">Loading accounts…</p>}
    {detail && <section className={s.detail} ref={details} tabIndex={-1} aria-label={`${detail.name} details`}><div className={s.detailHead}>{provider(detail)}<Button size="sm" onClick={() => { setSelected(null); document.getElementById(`directory-${detail.slug}`)?.focus(); }} aria-label="Close account details"><X size={18}/></Button></div><h2 className="uf-t-h2">{bonus(detail) ?? "Explore this account"}</h2><dl><dt>Requirements</dt><dd>{detail.live ? "Check the exact reward and requirements on the linked offer. Public promotions may differ." : detail.requirements}</dd><dt>Eligibility</dt><dd>{detail.live ? "The linked provider sets eligibility, fees and offer terms." : detail.eligibility}</dd><dt>Link owner</dt><dd className="ph-mask">{detail.live ? detail.live.referralLabel : detail.rewardKind === "stock" ? "Referral programme · qualifying link required" : "Official website · no referral attached"}</dd>{detail.checkedOn && <><dt>Terms checked</dt><dd>November 13, 2026 · offers may change</dd></>}</dl><div className={s.actions}>{detail.live && <Button variant="primary" disabled={busy || referralError} onClick={() => void open(detail)}>{busy ? "Opening…" : `Continue to ${detail.name}`}<ArrowUpRight size={16} aria-hidden/></Button>}{detail.source && <a href={detail.source} target="_blank" rel="noopener noreferrer">Read official terms <ArrowUpRight size={16} aria-hidden/></a>}{handoff && <a href={handoff} target="_blank" rel="noopener noreferrer sponsored">Open approved provider link ↗</a>}</div>{detail.live && <p className={s.foot}>The link owner may receive a reward if you qualify. Check the provider’s terms before applying.</p>}{!detail.live && detail.rewardKind === "stock" && <p className={s.foot}>No approved referral link is available here yet. The programme page does not itself qualify you for a reward.</p>}</section>}
    {loaded && <><div className={s.sectionHead}><h2 className="uf-t-h2">Featured offers</h2><span className={s.muted}>Cash offers first · stock rewards shown separately</span></div><div className={s.grid}>{featured.map(p => <article className={s.card} key={p.slug}><div className={s.cardTop}><span className={`${s.badge} ${p.rewardKind === "stock" ? s.stock : ""}`}>{p.live ? "Linked offer" : p.rewardKind === "stock" ? "Stock reward" : "Cash offer"}</span><Button size="sm" variant="ghost" aria-pressed={saved.includes(p.slug)} aria-label={`${saved.includes(p.slug) ? "Unsave" : "Save"} ${p.name}`} onClick={() => toggleSave(p.slug)}><Bookmark size={18} fill={saved.includes(p.slug) ? "currentColor" : "none"}/></Button></div>{provider(p)}<div className={s.amount}>{bonus(p)}<small>{p.live ? "See linked offer requirements" : p.rewardKind === "stock" ? "Shares · subject to programme rules" : "Cash bonus · eligibility applies"}</small></div><p className={s.condition}>{p.live ? p.live.blurb : p.requirements}</p><span className={`${s.owner} ph-mask`}><LinkIcon size={13} aria-hidden/>{p.live ? p.live.referralLabel : p.rewardKind === "stock" ? "Qualifying referral required" : "Public offer · no referral attached"}</span><Button id={`directory-${p.slug}`} onClick={() => { setHandoff(""); setSelected(p.slug); }}>View offer <ArrowUpRight size={16} aria-hidden/></Button></article>)}</div>{!featured.length && <p className={s.empty}>No current reviewed promotion matches these filters.</p>}<div className={s.sectionHead}><h2 className="uf-t-h2">Explore accounts</h2><span className={s.muted} aria-live="polite">{filtered.length} accounts</span></div><div className={s.catalog}>{filtered.map(p => <article key={p.slug} className={s.catalogRow}>{provider(p)}<Button size="sm" onClick={() => { setHandoff(""); setSelected(p.slug); }} aria-label={`Explore ${p.name}`}>Explore <ArrowUpRight size={15} aria-hidden/></Button></article>)}</div>{!filtered.length && <p className={s.empty}>No accounts match. Try another search or category.</p>}<p className={s.foot}>U.S. account directory. Offers are conditional and can change. Cash and stock rewards are different. Listings are not personalized recommendations or endorsements.</p></>}
  </section>;
}
