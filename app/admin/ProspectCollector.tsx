"use client";
import { useEffect, useState } from "react";
import { Search, UserCheck } from "lucide-react";
import type { CollectedContact } from "@/lib/prospect-collector";
import type { PersonaEvidence } from "@/lib/prospect-persona";
import styles from "./ColdEmail.module.css";
type Candidate = CollectedContact & { account?:string; persona?:PersonaEvidence; fit:string; usEvidence:string; ageEvidence:string; selected:boolean };
type ImportRow = {email:string;first_name:string;country:"US";source_url:string;fit_note:string};
type Audience = "users" | "partners";
const keyOf = (c:Candidate) => c.account || c.email;
export default function ProspectCollector({token,onImport}:{token:string;onImport:(rows:ImportRow[])=>Promise<boolean>}) {
  const [audience,setAudience] = useState<Audience>("users"), [cursor,setCursor] = useState(0);
  const [candidates,setCandidates] = useState<Candidate[]>([]);
  const [pages,setPages] = useState<{url:string;status:string;detail:string}[]>([]);
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [notice,setNotice] = useState(""), [collectedAt,setCollectedAt] = useState("");
  const storageKey = `uf-persona-lookup-v2-${audience}`;
  useEffect(() => {
    setCursor(0);
    try {const saved = Number(localStorage.getItem(storageKey));if (Number.isSafeInteger(saved) && saved >= 0 && saved < 1_000_000) setCursor(saved);} catch { /* Optional progress. */ }
  }, [storageKey]);
  function edit(key:string,patch:Partial<Candidate>) {setCandidates(old=>old.map(c=>keyOf(c)===key?{...c,...patch,selected:false}:c));}
  const ready = (c:Candidate) => !!c.email && !!c.name.trim() && c.fit.trim().length >= 15 && c.usEvidence.trim().length >= 10 && (audience === "partners" || c.ageEvidence.trim().length >= 10 && /\b(?:1[89]|[23]\d)\b/.test(c.ageEvidence));
  async function collect() {
    setBusy(true);setError("");setNotice("");setCandidates([]);setPages([]);setCollectedAt("");
    try {
      const response = await fetch("/api/admin/cold-email/collect",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({cursor,audience})});
      const value = await response.json().catch(()=>null);if (!value || !response.ok) throw new Error(value?.error || "Lookup is unavailable. Refresh your admin session and try again.");
      setCursor(value.nextCursor);try {localStorage.setItem(storageKey,String(value.nextCursor));} catch { /* Optional progress. */ }
      setCandidates(value.contacts.map((c:Candidate)=>({...c,fit:c.persona?.interest || "",usEvidence:c.persona?.location || "",ageEvidence:c.persona?.age || "",selected:false})));
      setPages(value.pages);setCollectedAt(value.collectedAt);
      const withEmail = value.contacts.filter((c:Candidate)=>c.email).length;
      setNotice(`${value.contacts.length} people to review · ${withEmail} with a published email · ${value.skippedCount} saved or opted-out contacts skipped.${value.partners?.length ? ` ${value.partners.length} creators kept out of potential-user results.` : ""}${!value.contacts.length ? " No matching people found in this batch. Try the next batch." : ""}`);
    } catch(e) {setError(e instanceof Error ? e.message : "Lookup failed.");} finally {setBusy(false);}
  }
  async function importReviewed() {
    const chosen = candidates.filter(c=>c.selected);if (!chosen.length) return;
    if (chosen.some(c=>!ready(c))) {setError("Review each selected person's published identity, contact details and persona evidence first.");return;}
    setBusy(true);setError("");setNotice("");
    try {
      const rows:ImportRow[] = chosen.map(c=>({email:c.email,first_name:c.name.trim().split(/\s+/)[0],country:"US",source_url:c.sourceUrl,fit_note:`${audience === "users" ? "Potential user" : "Partner"} | Fit: ${c.fit.trim()} | US: ${c.usEvidence.trim()} | Age: ${c.ageEvidence.trim()} | Interest: ${c.persona?.interestUrl || c.sourceUrl} | Collected: ${collectedAt}`.slice(0,1000)}));
      if (!await onImport(rows)) throw new Error("Import did not finish. Check the outreach error above before retrying.");
      const imported = new Set(chosen.map(keyOf));setCandidates(old=>old.filter(c=>!imported.has(keyOf(c))));setNotice("Reviewed contacts imported. Existing addresses skipped. No emails queued or sent.");
    } catch(e) {setError(e instanceof Error ? e.message : "Import failed.");} finally {setBusy(false);}
  }
  return <section className={styles.panel} aria-labelledby="collector-heading" aria-busy={busy}>
    <h3 id="collector-heading"><Search size={18} aria-hidden="true" /> Find people who fit</h3>
    <label>Audience<select value={audience} disabled={busy} onChange={e=>{setAudience(e.target.value as Audience);setCandidates([]);setPages([]);setNotice("");setError("");}}><option value="users">Potential users</option><option value="partners">Creators &amp; partners</option></select></label>
    <p>{audience === "users" ? "U.S. young adults who describe their own budgeting or FIRE goals. Public discussion research comes first." : "Finance publishers and creators for a separate partnership conversation."}</p>
    <button className={styles.primary} disabled={busy} onClick={collect}><Search size={16} aria-hidden="true" />{busy ? "Researching people…" : "Look up new prospects"}</button>
    <small>{audience === "users" ? "Searches recent Hacker News discussions and the author's public profile. Missing name, email, U.S. location and age stay unverified." : "Checks public finance reading lists and linked contact pages."} No JSON or URLs needed. Lookup does not send emails.</small>
    {error && <div className={styles.error} role="alert">{error}</div>}{notice && <div className={styles.notice} role="status">{notice}</div>}
    {!!pages.length && <details><summary>Research sources · {pages.length}</summary><ul>{pages.map((p,i)=><li key={`${p.url}-${i}`}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a> — {p.status}: {p.detail}</li>)}</ul></details>}
    {!!candidates.length && <>
      <div className={styles.row}><h3 className={styles.grow}>Review before importing</h3><span>{candidates.filter(c=>c.selected).length} selected</span></div>
      <div className={styles.collectorGrid}>{candidates.map((c,i)=><article key={keyOf(c)} className={styles.collectorCard}>
        <strong>{c.name || c.account || "Name not published"}</strong><p>{c.email || "No published contact email — research only"}</p>
        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">Contact / identity source ↗</a>
        {c.account && <a href={`https://news.ycombinator.com/user?id=${encodeURIComponent(c.account)}`} target="_blank" rel="noopener noreferrer">Public account profile ↗</a>}
        {c.persona && <><p>{c.persona.status === "match" ? "Persona evidence found · confirm before import" : "Incomplete persona evidence · review needed"}</p><blockquote>{c.persona.interest}</blockquote><a href={c.persona.interestUrl} target="_blank" rel="noopener noreferrer">Their own statement · {new Date(c.persona.publishedAt).toLocaleDateString()} ↗</a><small>Missing: {c.persona.missing.join(" · ") || "None detected"}. Public statements are not independently verified.</small></>}
        <label>Published full name<input value={c.name} maxLength={80} disabled={busy} onChange={e=>edit(keyOf(c),{name:e.target.value})} /></label>
        <label>Why UntilFire fits<textarea value={c.fit} maxLength={250} disabled={busy} placeholder="Their stated goal and public source" onChange={e=>edit(keyOf(c),{fit:e.target.value})} /></label>
        <label>U.S. location evidence<textarea value={c.usEvidence} maxLength={180} disabled={busy} placeholder="Explicit location statement and source" onChange={e=>edit(keyOf(c),{usEvidence:e.target.value})} /></label>
        {audience === "users" && <label>Young-adult evidence (18–39)<textarea value={c.ageEvidence} maxLength={180} disabled={busy} placeholder="Their own age statement and source; never guess" onChange={e=>edit(keyOf(c),{ageEvidence:e.target.value})} /></label>}
        <button aria-pressed={c.selected} aria-label={`${c.selected ? "Deselect" : "Select"} person ${i+1}`} disabled={busy || !ready(c)} onClick={()=>setCandidates(old=>old.map(row=>keyOf(row)===keyOf(c)?{...row,selected:!row.selected}:row))}><UserCheck size={16} aria-hidden="true" />{c.selected ? "Selected" : "Select after review"}</button>
        {!ready(c) && <small>Import needs a published name and email plus the required evidence. Do not identify anonymous users or guess addresses.</small>}
      </article>)}</div>
      <button className={styles.primary} disabled={busy || !candidates.some(c=>c.selected)} onClick={importReviewed}>Import reviewed contacts</button>
      <small>Research stays here until imported or replaced. Public contact details do not establish marketing permission.</small>
    </>}
  </section>;
}
