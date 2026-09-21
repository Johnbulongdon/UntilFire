# Search Console sync

Google Search Console performance, pulled into `seo_search_console` once a
day. It exists because the app's own analytics only ever see someone who
already arrived — they cannot tell "nobody can find us" from "we rank at
position 60". Search Console sees the impressions that never became visits.

## What you have to set up once

The API is free. All of this is configuration, not billing.

1. **Verify the property** at [Search Console](https://search.google.com/search-console).
   The site already loads GA4 (`G-L8EQM1LL1S`), so the Google Analytics
   verification method works in one click. Note which property type you
   create — a Domain property is `sc-domain:untilfire.com`, a URL-prefix
   property is `https://www.untilfire.com/`. That exact string is
   `GSC_SITE_URL` below, and the API rejects anything else.

2. **Submit the sitemap** under Sitemaps: `https://www.untilfire.com/sitemap.xml`.
   325 URLs. Worth doing even if the sync never ran.

3. **Create a service account** in a Google Cloud project
   (IAM → Service Accounts → Create). No roles needed — it reaches Search
   Console through the property's own sharing, not through IAM.

4. **Enable the Search Console API** for that project
   (APIs & Services → Library → "Google Search Console API" → Enable). Missing
   this is the most common cause of a 403 that otherwise looks like an auth
   problem.

5. **Give the service account a key** (Keys → Add key → JSON). The file holds
   `client_email` and `private_key`.

6. **Add the service account as a user** on the property: Search Console →
   Settings → Users and permissions → Add user → paste the `client_email` →
   permission **Full** (Restricted cannot read the API).

7. **Set three environment variables** in Vercel, all environments:

   | Variable | Value |
   |---|---|
   | `GSC_CLIENT_EMAIL` | `client_email` from the JSON |
   | `GSC_PRIVATE_KEY` | `private_key` from the JSON, including the BEGIN/END lines |
   | `GSC_SITE_URL` | `sc-domain:untilfire.com` or `https://www.untilfire.com/` — whichever the property is |

   Paste the private key exactly as the JSON has it, `\n` sequences and all.
   Vercel stores it on one line and the code unescapes them; a key with real
   newlines pasted into the dashboard also works.

Never commit the JSON key file. It is a credential.

## What runs

`/api/cron/gsc-sync`, daily at 11:00 UTC (an hour after the retention mail),
authorised with `CRON_SECRET` like every other cron. Each run fetches:

- **totals** for 90 days — one row per day, the trend line
- **pages** and **queries** for 10 days — one row per day per URL and per term

Rows upsert on `(date, dimension, dimension_value)`, so re-reading a window is
safe. It has to re-read: Search Console is incomplete for about three days
after the fact and keeps revising for a few more. Ten days also means a week
of failed runs heals itself on the next success instead of leaving a hole.

Backfill further by hand with `?days=480` (Google serves at most 16 months):

```
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.untilfire.com/api/cron/gsc-sync?days=480"
```

Before the variables are set the route answers `503 {"status":"not_configured"}`
rather than throwing. A job that crashes on a missing variable looks broken;
this one is simply switched off.

## Reading it

Service-role only — RLS is on with no policies, the same shape as
`plaid_items`. Query it from the Supabase SQL editor or an admin route:

```sql
-- Is anything ranking at all?
select date, clicks, impressions, round(position::numeric, 1) as avg_position
from seo_search_console
where dimension = 'total'
order by date desc limit 30;

-- Which pages does Google actually show?
select dimension_value as page, sum(impressions) as impressions,
       sum(clicks) as clicks, round(avg(position)::numeric, 1) as avg_position
from seo_search_console
where dimension = 'page' and date > current_date - 30
group by 1 order by impressions desc limit 40;

-- What are people typing?
select dimension_value as query, sum(impressions) as impressions,
       sum(clicks) as clicks, round(avg(position)::numeric, 1) as avg_position
from seo_search_console
where dimension = 'query' and date > current_date - 30
group by 1 order by impressions desc limit 40;
```

An empty table after a successful run is itself the answer: it means the
property has no recorded impressions for the window, not that the sync
failed. Check `job_runs` for `gsc_sync` to tell the two apart.

## Caveats worth knowing before drawing conclusions

- **Average position is averaged across impressions.** A page ranking 3rd for
  one term and 80th for another reports neither. Always look at the query
  breakdown before believing a page-level position.
- **Google anonymises rare queries.** Low-volume terms are omitted entirely,
  so query rows will not sum to the totals. This is expected, not a bug.
- **Dates are America/Los_Angeles**, fixed by Google regardless of the
  property or the reader.

## Verification

`npm run test:search-console` stubs fetch and checks the auth construction —
that the RS256 assertion verifies against its public key, that it is
base64url and not base64, that the scope and lifetime are what Google
requires, that the site URL is encoded into the path, and that missing
configuration returns null instead of throwing. It never reaches Google, so
it runs anywhere.
