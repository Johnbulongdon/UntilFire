-- Net worth over time (Net Worth page line, 2026-11-05).
-- portfolio_value is only what is invested (it feeds the freedom curve);
-- net_worth is the whole picture the Net Worth page shows: everything you
-- have, connected or typed, plus a home, less every debt. Nullable: older
-- rows and the phone's rows don't carry it, and the line only reads rows that do.
alter table public.net_worth_snapshots add column if not exists net_worth numeric;
