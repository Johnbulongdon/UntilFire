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
