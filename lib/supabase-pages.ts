/**
 * Every row a query matches, not just the first page of them.
 *
 * PostgREST caps each response at the project's max-rows setting — 1,000 by
 * default — and says nothing when it does. The dashboard's history query read
 * 36 months oldest-first, so a busy account got its oldest 1,000 rows back
 * and never saw its recent months: last month's needs came up empty and the
 * day-to-day estimate fell back to the budget. Lists that read
 * newest-first lost their oldest months the same way.
 *
 * This asks for the rows a page at a time with .range() until a page comes
 * back short. Callers must order by something unique (add .order("id") after
 * any date order): rows sharing a date otherwise have no fixed order, and a
 * row can land on two pages or on none.
 *
 * PAGE_SIZE must not exceed the project's max-rows. If that setting is ever
 * lowered, lower this with it, or a capped page would read as the last one.
 */

export const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAllPages<T>(
  page: (from: number, to: number) => PageResult<T>,
  pageSize: number = PAGE_SIZE,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    // A failed page fails the whole read. Handing back the pages that did
    // arrive would look complete and quietly understate every total.
    if (error) return { data: null, error };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return { data: rows, error: null };
  }
}
