-- VivTrack: close the free-Pro holes (2026-11-18).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. Users could PATCH their own profiles row, including subscription_tier.
--    The app only READS profiles; tiers are set by the payment webhooks
--    (service role) and redeem_promo_code() (security definer), so nobody
--    signed in needs UPDATE on the table at all.
drop policy if exists "Users update own profile" on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;

-- 2. update_ls_subscription() could be called by anyone (security definer, no
--    caller check, EXECUTE granted to everyone by default). Service role only.
revoke execute on function public.update_ls_subscription(text, text, text, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.update_ls_subscription(text, text, text, text, boolean, timestamptz)
  to service_role;

-- 3. Any signed-in user could list every active promo code
--    (GET /rest/v1/promo_codes). redeem_promo_code() runs as definer and does
--    not need this, and the app never reads the table directly.
drop policy if exists "Authenticated users can check codes" on public.promo_codes;
revoke all on public.promo_codes from anon, authenticated;

-- 4. The seeded codes are public on GitHub. Stop new redemptions
--    (people who already redeemed keep Pro).
update public.promo_codes set is_active = false where code in ('VIVTRACK_BETA', 'FOUNDER2026');

-- 5. Hardening: pin search_path on the security-definer functions.
alter function public.redeem_promo_code(text) set search_path = public;
alter function public.update_ls_subscription(text, text, text, text, boolean, timestamptz) set search_path = public;
alter function public.create_user_profile() set search_path = public;

-- ── Audit: who has Pro, and how ───────────────────────────────────────────
-- Paid = has a Lemon Squeezy subscription. Promo = redeemed a code.
-- Anything else on 'pro' was set by hand, or through hole 1 or 2.
select user_id, subscription_tier, plan_type, promo_code, ls_subscription_id, updated_at,
       case when ls_subscription_id is not null then 'paid'
            when promo_code is not null then 'promo: ' || promo_code
            else 'UNEXPLAINED' end as how
from public.profiles
where subscription_tier = 'pro'
order by how desc, updated_at desc;

select code, is_active, uses_count, max_uses from public.promo_codes order by code;
