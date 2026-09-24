"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CustomCategory = { key: string; label: string; code: string; color: string; emoji?: string };

const CUSTOM_CATS_KEY = "uf_custom_cats";
const CUSTOM_SUBCATS_KEY = "uf_custom_subcats";

function loadCustomCats(): CustomCategory[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || "[]"); } catch { return []; }
}

function loadCustomSubCats(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SUBCATS_KEY) || "{}"); } catch { return {}; }
}

/**
 * Single shared source for user-defined categories/sub-categories: local cache
 * for instant reads, synced to user_budget.expenses._custom_cats/_custom_subcats
 * so add/remove shows up consistently across every tab that lists categories.
 */
export function useCustomCategories() {
  const [customCats, setCustomCats] = useState<CustomCategory[]>(loadCustomCats);
  const [customSubCats, setCustomSubCats] = useState<Record<string, string[]>>(loadCustomSubCats);
  const pendingRef = useRef<{ cats: CustomCategory[]; subCats: Record<string, string[]> } | null>(null);
  // Nothing is written until the account's copy has been read once. The local
  // cache can be stale — another device may have changed the list since — and
  // writing it first would overwrite that newer copy.
  const hydratedRef = useRef(false);

  const syncToSupabase = useCallback((cats: CustomCategory[], subCats: Record<string, string[]>) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          const cur = (data?.expenses as Record<string, unknown>) || {};
          // A query builder only sends its request when awaited or .then()'d.
          // Left bare, this upsert never ran: changes stayed on one device,
          // and the refetch on focus put a deleted category straight back.
          supabase.from("user_budget").upsert({
            user_id: session.user.id,
            expenses: { ...cur, _custom_cats: cats, _custom_subcats: subCats },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" }).then(({ error }) => {
            if (error) console.warn("[categories] sync to account failed:", error.message);
          });
        });
    });
  }, []);

  useEffect(() => { localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(customCats)); }, [customCats]);
  useEffect(() => { localStorage.setItem(CUSTOM_SUBCATS_KEY, JSON.stringify(customSubCats)); }, [customSubCats]);

  // Debounced sync to Supabase whenever local state changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    pendingRef.current = { cats: customCats, subCats: customSubCats };
    const id = setTimeout(() => {
      syncToSupabase(customCats, customSubCats);
      pendingRef.current = null;
    }, 600);
    return () => clearTimeout(id);
  }, [customCats, customSubCats, syncToSupabase]);

  // Flush any pending sync immediately on unmount so a fast tab switch doesn't drop it
  useEffect(() => {
    return () => {
      if (pendingRef.current) syncToSupabase(pendingRef.current.cats, pendingRef.current.subCats);
    };
  }, [syncToSupabase]);

  // Re-fetch on mount and whenever the tab regains focus (cross-device / cross-tab sync)
  useEffect(() => {
    const refetch = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
          .then(({ data, error }) => {
            if (error) return;
            hydratedRef.current = true;
            if (!data?.expenses) return;
            const { _custom_cats, _custom_subcats } = data.expenses as Record<string, unknown>;
            if (Array.isArray(_custom_cats)) setCustomCats(_custom_cats as CustomCategory[]);
            if (_custom_subcats && typeof _custom_subcats === "object") setCustomSubCats(_custom_subcats as Record<string, string[]>);
          });
      });
    };
    refetch();
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { customCats, setCustomCats, customSubCats, setCustomSubCats };
}
