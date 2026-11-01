-- Curated member links; no providers seeded or made live.
BEGIN;
ALTER TABLE public.partner_offers ADD COLUMN IF NOT EXISTS member_links_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE public.partner_referral_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
 offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
 url text NOT NULL CHECK (length(url) BETWEEN 8 AND 2048),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 review_note text CHECK (length(review_note) <= 240),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (partner_id, offer_id)
);
CREATE TABLE public.partner_offer_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
 link_id uuid REFERENCES public.partner_referral_links(id) ON DELETE CASCADE,
 partner_id uuid REFERENCES public.referral_partners(id) ON DELETE CASCADE,
 selection_key text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
CREATE INDEX partner_offer_intents_expiry_idx ON public.partner_offer_intents(expires_at);
CREATE TABLE public.account_setup_journeys (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 goal text NOT NULL CHECK (goal IN ('invest','save')),
 account_label text NOT NULL DEFAULT '' CHECK (length(account_label) <= 80),
 origin text CHECK (origin IN ('existing','new')),
 stage text NOT NULL DEFAULT 'choose' CHECK (stage IN ('choose','applying','opened','selected','done')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, goal)
);
ALTER TABLE public.partner_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offer_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_setup_journeys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_referral_links, public.partner_offer_intents, public.account_setup_journeys FROM anon, authenticated;
GRANT ALL ON public.partner_referral_links, public.partner_offer_intents, public.account_setup_journeys TO service_role;
COMMIT;
