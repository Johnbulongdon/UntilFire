-- 0021_goals_perma_category.sql
-- Tags a goal with the PERMA (positive-psychology) prompt it was created
-- from, when it was seeded by the post-registration goal-setting flow
-- (GoalsIntroModal) rather than added manually in Plan -> Goals. Null for
-- every manually-added goal, before and after this migration.
alter table public.goals
  add column if not exists perma_category text
    check (perma_category is null or perma_category in ('emotion', 'engagement', 'relationships', 'meaning', 'accomplishment'));
