# Account and refund safety — N2

Baseline: 6affc4fe97ec4f6bb67fc038315b86325a9dc618. Follow-up to PR #319.

## Scope

Accurate household/bank disconnect errors; atomic, idempotent refund application; protected phone and website Needs & wants budget replacement; no reseeding of existing zero-value accounts. Pending refunds are retried on later syncs. Modified bank records preserve the applied-refund marker.

Billing activation is already repaired in draft PR #269. Its failed-write guards were reviewed; it must be reconciled and independently integrated rather than duplicated here. Other whole-budget writers outside these paths still need a wider concurrency review. The new compare-and-set operations do not make all application writes globally atomic.

## Required rollout order

1. Review/apply the additive SQL below to the intended UntilFire database. Do not deploy these callers before both functions exist. This PR does not apply the migration to production.
2. Verify function permissions: refund execution is server-only (service_role), budget replacement requires the authenticated owner and retains RLS. Check the RPC schema cache is ready. No SECURITY DEFINER or new table is introduced.
3. Merge/deploy the website/backend only with John's publication instruction. Verify deployment SHA, endpoint auth and a test-account save/reload. Run refund failure/replay checks in a disposable environment, not customer accounts.
4. Mobile code follows the existing preview-update workflow; verify a phone before production promotion. No intentional native API/dependency or mobile package-script changes. Fingerprint eligibility remains the workflow's decision.
5. On application rollback keep the additive functions available for clients that already use them. Do not drop functions while an installed phone update depends on them. Older refund code is not safe against partial writes.

## Verification

- PostgreSQL/PGlite exercises both failure rollbacks, idempotency, owner/currency isolation, role permissions, large histories and stale budget replacement. Its queued-call test does not simulate independent concurrent database sessions; row locks are explicit in SQL.
- Handler/mutation tests cover read/delete failures, conflicting phone saves, retry and zero-value account preservation. No live mutation was used.
- Full validate, mobile lint/types and focused regressions are recorded in the PR. Live browser and physical-device QA remain separate release checks.
- PGlite is a pinned development-only test dependency; no production client imports it.

## Full migration SQL

```sql
CREATE OR REPLACE FUNCTION public.apply_imported_refund(
  p_user_id uuid, p_refund_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  r public.expenses%ROWTYPE;
  purchase_id uuid;
BEGIN
  SELECT * INTO r FROM public.expenses
  WHERE id = p_refund_id AND user_id = p_user_id
    AND transaction_type = 'transfer'
    AND tags @> ARRAY['sys:refund']
    AND NOT tags @> ARRAY['sys:refund-applied']
    AND NOT tags @> ARRAY['sys:pending']
  FOR UPDATE;
  IF NOT FOUND OR r.amount <= 0 THEN RETURN false; END IF;

  SELECT p.id INTO purchase_id FROM public.expenses p
  WHERE p.user_id = p_user_id AND p.transaction_type = 'expense'
    AND lower(btrim(p.description)) = lower(btrim(r.description))
    AND btrim(r.description) <> ''
    AND upper(coalesce(p.currency, 'USD')) =
        upper(coalesce(r.currency, 'USD'))
    AND p.date BETWEEN r.date - 90 AND r.date
    AND p.amount - p.refund_amount >= r.amount
  ORDER BY p.date DESC, p.id
  LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.expenses
    SET refund_amount = refund_amount + r.amount
    WHERE id = purchase_id AND user_id = p_user_id;
  UPDATE public.expenses
    SET tags = array_append(
      array_remove(coalesce(tags, ARRAY[]::text[]), 'sys:refund'),
      'sys:refund-applied'
    )
    WHERE id = r.id AND user_id = p_user_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_imported_refund(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_imported_refund(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.replace_budget_if_unchanged(
  p_expected jsonb, p_expenses jsonb, p_fire_assets numeric DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.user_budget
    SET expenses = p_expenses,
        fire_assets = coalesce(p_fire_assets, fire_assets),
        updated_at = now()
    WHERE user_id = auth.uid()
      AND expenses IS NOT DISTINCT FROM p_expected;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_budget_if_unchanged(jsonb, jsonb, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_budget_if_unchanged(jsonb, jsonb, numeric)
  TO authenticated;
```
