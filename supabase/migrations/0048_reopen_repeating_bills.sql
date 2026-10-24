-- 0048_reopen_repeating_bills.sql
-- A repeating bill is never finished: paying it moves it to its next due
-- date. Before "Mark paid" did that, it completed the row, and those bills
-- sat in Completed with a stale date, missing from Upcoming, Home's free to
-- spend and the Transactions forecast (D-31).
--
-- Reopen them at the first due date after the day they were completed (the
-- day the person marked that period paid).

UPDATE expected_payments e
SET due_date = (
      SELECT min(d)::date
      FROM generate_series(
        e.due_date::timestamp,
        e.completed_at + interval '3 years',
        CASE e.recurrence
          WHEN 'weekly' THEN interval '7 days'
          WHEN 'biweekly' THEN interval '14 days'
          WHEN 'monthly' THEN interval '1 month'
          WHEN 'quarterly' THEN interval '3 months'
          ELSE interval '1 year'
        END) AS d
      WHERE d::date > e.completed_at::date),
    completed_at = NULL
WHERE e.recurrence <> 'none' AND e.completed_at IS NOT NULL;
