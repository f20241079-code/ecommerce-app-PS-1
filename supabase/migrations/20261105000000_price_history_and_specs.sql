-- Price history (price vs time) and product specs for comparisons.
--
-- price_history gets a row automatically whenever a product is created or its
-- price changes, so the history builds up from real changes over time.
-- Demo/simulated rows (scripts/simulate-price-history.mjs) are marked with
-- source = 'simulated' so the app can label them honestly.

-- Specs -----------------------------------------------------------------------

alter table public.products
  add column if not exists weight     numeric(8, 2),
  add column if not exists dimensions jsonb,
  -- Free-form key/value specs, e.g. {"RAM": "8 GB", "Storage": "256 GB"}.
  -- Edit in the Supabase table editor; the comparison screen shows every key.
  add column if not exists specs      jsonb not null default '{}'::jsonb;

alter table public.products drop constraint if exists products_specs_is_object;
alter table public.products
  add constraint products_specs_is_object check (jsonb_typeof(specs) = 'object');

-- Price history ---------------------------------------------------------------

-- If a table with this name already exists from an older version of the app but
-- with a different design, rename it to <name>_legacy_<timestamp> (keeping its
-- data) so the table below can be created. Compatible tables are left alone.
create or replace function pg_temp.shoply_move_aside_incompatible(
  p_table text, p_required text[], p_text_id boolean default false
)
returns void
language plpgsql
as $fn$
declare
  v_missing text[];
  v_new     text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;
  select array_agg(c) into v_missing
    from unnest(p_required) as c
   where not exists (
     select 1 from information_schema.columns
      where table_schema = 'public' and table_name = p_table and column_name = c
   );
  if v_missing is null and p_text_id and exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = p_table and column_name = 'id'
       and data_type not in ('text', 'character varying')
  ) then
    v_missing := array['id (must be text)'];
  end if;
  if v_missing is null then
    return;
  end if;
  v_new := p_table || '_legacy_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS');
  execute format('alter table public.%I rename to %I', p_table, v_new);
  raise notice 'Existing table public.% has a different design (missing: %). Renamed it to public.% (data kept) and creating a new one.',
    p_table, array_to_string(v_missing, ', '), v_new;
end;
$fn$;

select pg_temp.shoply_move_aside_incompatible('price_history', array['product_id','price','original_price','source','recorded_at']);

create table if not exists public.price_history (
  id             bigint generated always as identity primary key,
  product_id     text not null references public.products (id) on delete cascade,
  price          numeric(10, 2) not null check (price >= 0),
  original_price numeric(10, 2) not null check (original_price >= 0),
  source         text not null default 'recorded' check (source in ('recorded', 'simulated')),
  recorded_at    timestamptz not null default now()
);

create index if not exists price_history_product_time_idx
  on public.price_history (product_id, recorded_at);

alter table public.price_history enable row level security;
grant select on public.price_history to anon, authenticated;

drop policy if exists "Price history is viewable by everyone" on public.price_history;
create policy "Price history is viewable by everyone"
  on public.price_history for select
  to anon, authenticated
  using (true);

-- Record a point whenever a product is added or its price changes.
create or replace function public.products_record_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.original_price is distinct from old.original_price then
    insert into public.price_history (product_id, price, original_price, source)
    values (new.id, new.price, new.original_price, 'recorded');
  end if;
  return null;
end;
$$;

drop trigger if exists products_record_price on public.products;
create trigger products_record_price
  after insert or update of price, original_price on public.products
  for each row execute function public.products_record_price();

-- Start the history for products that already exist (their current price, now).
insert into public.price_history (product_id, price, original_price, source)
select p.id, p.price, p.original_price, 'recorded'
  from public.products p
 where not exists (
   select 1 from public.price_history h
    where h.product_id = p.id and h.source = 'recorded'
 );
