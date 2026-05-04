-- =========================================================
-- WasGehtTueb - Upvote Count Aggregation View
-- =========================================================

create or replace view public.v_party_upvote_counts as
select
  party_id,
  count(*)::integer as upvote_count
from public.party_upvotes
group by party_id;

grant select on public.v_party_upvote_counts to anon;
grant select on public.v_party_upvote_counts to authenticated;
