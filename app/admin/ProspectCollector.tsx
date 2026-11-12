"use client";

import { useEffect, useState } from "react";
import { Search, UserCheck } from "lucide-react";
import type { CollectedContact } from "@/lib/prospect-collector";
import styles from "./ColdEmail.module.css";

type Candidate = CollectedContact & { firstName:string; fit:string; usEvidence:string; selected:boolean };
type ImportRow = {email:string;first_name:string;country:"US";source_url:string;fit_note:string};
export default function ProspectCollector({token,onImport}:{token:string;onImport:(rows:ImportRow[])=>Promise<boolean>}) {
  const [cursor,setCursor] = useState(0);
  const [candidates,setCandidates] = useState<Candidate[]>([]);
  const [pages,setPages] = useState<{url:string;status:string;detail:string}[]>([]);
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [notice,setNotice] = useState("");
  const [collectedAt,setCollectedAt] = useState("");
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("uf-prospect-lookup-cursor"));
      if (Number.isSafeInteger(saved) && saved >= 0 && saved < 1_000_000) setCursor(saved);
    } catch { /* Lookup still works without browser storage. */ }
  }, []);
  function edit(email:string,patch:Partial<Candidate>) {
    setCandidates(old=>old.map(c=>c.email===email?{...c,...patch}:c));
  }
  async function collect() {
    setBusy(true);setError("");setNotice("");setCandidates([]);setPages([]);setCollectedAt("");
    try {
      const response = await fetch("/api/admin/cold-email/collect",{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({cursor}),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Collection failed.");
      setCursor(value.nextCursor);
      try { localStorage.setItem("uf-prospect-lookup-cursor", String(value.nextCursor)); } catch { /* Optional progress. */ }
      setCandidates(value.contacts.map((c:CollectedContact)=>({...c,firstName:c.name.split(/\s+/)[0] || "",fit:"",usEvidence:"",selected:false})));
      setPages(value.pages);setCollectedAt(value.collectedAt);
      setNotice(value.contacts.length ? `${value.contacts.length} new public contacts found. ${value.skippedCount} saved or opted-out contacts skipped. Review before importing.` : `No new public emails found in this batch. ${value.skippedCount} saved or opted-out contacts skipped. Look up again to check the next sources.`);
    } catch(e) {setError(e instanceof Error ? e.message : "Collection failed.");}
    finally {setBusy(false);}
  }
  async function importReviewed() {
    const chosen = candidates.filter(c=>c.selected);
    if (!chosen.length) return;
    if (chosen.some(c=>c.fit.trim().length < 15 || c.usEvidence.trim().length < 10)) {
      setError("For every selected person, add a specific reason they fit and public evidence that they are U.S.-based.");return;
    }
    setBusy(true);setError("");setNotice("");
    try {
      const rows:ImportRow[] = chosen.map(c=>({email:c.email,first_name:c.firstName.trim(),country:"US",source_url:c.sourceUrl,
        fit_note:`Fit: ${c.fit.trim()} | US evidence: ${c.usEvidence.trim()} | Collected: ${collectedAt}${c.name ? ` | Published name: ${c.name}` : ""}`}));
      const saved = await onImport(rows);
      if (!saved) throw new Error("Import did not finish. Check the outreach error above and retry after resolving it.");
      const imported = new Set(chosen.map(c=>c.email));
      setCandidates(old=>old.filter(c=>!imported.has(c.email)));
      setNotice("Reviewed contacts imported. Existing addresses were skipped. Importing does not queue or send emails.");
    } catch(e) {setError(e instanceof Error ? e.message : "Import failed.");}
    finally {setBusy(false);}
  }
  return <section className={styles.panel} aria-labelledby="collector-heading">
    <h3 id="collector-heading"><Search size={18} aria-hidden="true" /> Find new prospects</h3>
    <p>Find published contact emails from personal finance blogs and their linked websites.</p>
    <button className={styles.primary} disabled={busy} onClick={collect}><Search size={16} aria-hidden="true" />{busy ? "Looking up contacts…" : "Look up new prospects"}</button>
    <small>No files or website URLs needed. Each lookup checks the next batch of public sources. Review U.S. fit before importing. Lookup does not send emails.</small>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {!!pages.length && <details><summary>Source report · {pages.length} pages</summary><ul>{pages.map((p,i)=><li key={`${p.url}-${i}`}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a> — {p.status}: {p.detail}</li>)}</ul></details>}
    {!!candidates.length && <>
      <div className={styles.row}><h3 className={styles.grow}>Review before importing</h3><span>{candidates.filter(c=>c.selected).length} selected</span></div>
      <div className={styles.collectorGrid}>
        {candidates.map((c,i)=><article key={c.email} className={styles.collectorCard}>
          <strong>{c.name || "Name not published"}</strong><p>{c.email}</p>
          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.pageTitle || new URL(c.sourceUrl).hostname} ↗</a>
          <small>{c.evidence} Name source: {c.nameEvidence}.</small>
          <small>Page topics: {c.topics.join(" · ") || "No topic match found"}. Check the person&apos;s fit yourself.</small>
          <label>First name · optional<input value={c.firstName} maxLength={80} disabled={busy} onChange={e=>edit(c.email,{firstName:e.target.value})} /></label>
          <label>Why UntilFire is relevant<textarea value={c.fit} maxLength={350} disabled={busy} placeholder="A specific public interest, goal or creator focus" onChange={e=>edit(c.email,{fit:e.target.value})} /></label>
          <label>Public evidence they are U.S.-based<textarea value={c.usEvidence} maxLength={300} disabled={busy} placeholder="Location statement and its public source URL" onChange={e=>edit(c.email,{usEvidence:e.target.value})} /></label>
          <button aria-pressed={c.selected} aria-label={`${c.selected ? "Deselect" : "Select"} contact ${i+1}: ${c.email}`} disabled={busy} onClick={()=>edit(c.email,{selected:!c.selected})}><UserCheck size={16} aria-hidden="true" />{c.selected ? "Selected for import" : "Select after review"}</button>
        </article>)}
      </div>
      <button className={styles.primary} disabled={busy || !candidates.some(c=>c.selected)} onClick={importReviewed}>Import reviewed contacts</button>
      <small>Results stay in this page until imported or replaced by a new collection. Review contact purpose and source permissions; skip unrelated people and minors. No sending settings change.</small>
    </>}
  </section>;
}
