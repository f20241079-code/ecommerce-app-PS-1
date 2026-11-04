-- ============================================================================
-- DEMO ONLY: 12 months of SIMULATED price history for every product.
--
-- DummyJSON has no past prices, so real history only starts on the day the
-- products were imported. Run this in Supabase -> SQL Editor to fill the
-- price charts for a demo. Every row it adds has source = 'simulated', and the
-- app labels any chart that includes them "Demo data · simulated".
--
-- * Safe to re-run: it first deletes previous simulated rows.
-- * Real (recorded) price points are never changed or deleted.
-- * Simulated points end the day before each product's first real point.
-- * To remove all simulated data later, run only the DELETE statement below.
-- ============================================================================

delete from public.price_history where source = 'simulated';

-- Fixed seed: the same "history" every time you run it.
select setseed(0.42);

insert into public.price_history (product_id, price, original_price, source, recorded_at)
select
  p.id,
  -- Smooth seasonal swing + small noise + occasional sale, kept within
  -- 70%–100% of the list price.
  round(
    (p.original_price * least(1.0, greatest(0.70,
        0.87
      + 0.08 * sin(s.phase + s.n * 0.5)
      + (random() - 0.5) * 0.06
      - case when random() < 0.12 then 0.12 else 0 end
    )))::numeric,
    2
  ) as price,
  p.original_price,
  'simulated',
  s.start_at + s.n * s.step as recorded_at
from public.products p
cross join lateral (
  select
    -- History ends just before the first real (recorded) point, or today.
    coalesce(
      (select min(h.recorded_at) from public.price_history h
        where h.product_id = p.id and h.source = 'recorded'),
      now()
    ) as end_at
) e
cross join lateral (
  select
    e.end_at - interval '365 days'                                  as start_at,
    -- A price change every 7–20 days, different per product.
    make_interval(days => 7 + (abs(hashtext(p.id)) % 14))          as step,
    (abs(hashtext(p.id || 'phase')) % 628) / 100.0                 as phase
) base
cross join lateral (
  select base.start_at, base.step, base.phase, n
    from generate_series(0, 60) as n
   where base.start_at + n * base.step < e.end_at - interval '1 day'
) s
where p.original_price > 0;

-- Summary: points per product and the date range covered.
select count(*)                          as simulated_points,
       count(distinct product_id)        as products,
       min(recorded_at)::date            as from_date,
       max(recorded_at)::date            as to_date
  from public.price_history
 where source = 'simulated';
