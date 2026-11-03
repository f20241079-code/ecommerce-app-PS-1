-- Real catalog data: extra product fields (photos, brand, stock, ...) and
-- customer reviews. Filled by scripts/import-products.mjs.

alter table public.products
  add column if not exists brand               text,
  add column if not exists images              text[] not null default '{}',
  add column if not exists thumbnail           text,
  add column if not exists stock               integer,
  add column if not exists availability_status text,
  add column if not exists warranty            text,
  add column if not exists shipping            text,
  add column if not exists return_policy       text;

alter table public.products alter column icon set default '🛍️';

create index if not exists products_category_idx on public.products (category);

-- Re-embed when the brand changes too (it's part of the embedded text).
create or replace function public.products_reset_embedding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.name is distinct from old.name
     or new.category is distinct from old.category
     or new.description is distinct from old.description
     or new.tags is distinct from old.tags
     or new.brand is distinct from old.brand then
    new.embedding := null;
  end if;
  return new;
end;
$$;

-- Reviews ------------------------------------------------------------------

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

select pg_temp.shoply_move_aside_incompatible('product_reviews', array['product_id','rating','comment','reviewer_name']);

create table if not exists public.product_reviews (
  id            bigint generated always as identity primary key,
  product_id    text not null references public.products (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text not null default '',
  reviewer_name text not null,
  created_at    timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;
grant select on public.product_reviews to anon, authenticated;

drop policy if exists "Reviews are viewable by everyone" on public.product_reviews;
create policy "Reviews are viewable by everyone"
  on public.product_reviews for select
  to anon, authenticated
  using (true);

-- Recommendation functions now also return the new columns. The return type
-- changes, so the functions must be dropped and recreated.

drop function if exists public.match_similar_products(text, integer);
drop function if exists public.recommend_products(text[], integer);

create function public.match_similar_products(
  p_product_id text,
  match_count  integer default 6
)
returns table (
  id text, name text, price numeric, original_price numeric, rating numeric,
  reviews integer, icon text, category text, badge text, description text,
  tags text[], brand text, images text[], thumbnail text, stock integer,
  similarity double precision
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.name, p.price, p.original_price, p.rating, p.reviews, p.icon,
         p.category, p.badge, p.description, p.tags, p.brand, p.images,
         p.thumbnail, p.stock,
         1 - (p.embedding operator(extensions.<=>) src.embedding) as similarity
  from public.products src
  join public.products p on p.id <> src.id
  where src.id = p_product_id
    and src.embedding is not null
    and p.embedding is not null
  order by p.embedding operator(extensions.<=>) src.embedding
  limit least(greatest(match_count, 1), 50);
$$;

create function public.recommend_products(
  seed_ids    text[],
  match_count integer default 6
)
returns table (
  id text, name text, price numeric, original_price numeric, rating numeric,
  reviews integer, icon text, category text, badge text, description text,
  tags text[], brand text, images text[], thumbnail text, stock integer,
  similarity double precision
)
language sql
stable
set search_path = ''
as $$
  with profile as (
    select extensions.avg(embedding) as embedding
    from public.products
    where id = any(seed_ids) and embedding is not null
  )
  select p.id, p.name, p.price, p.original_price, p.rating, p.reviews, p.icon,
         p.category, p.badge, p.description, p.tags, p.brand, p.images,
         p.thumbnail, p.stock,
         1 - (p.embedding operator(extensions.<=>) profile.embedding) as similarity
  from public.products p, profile
  where profile.embedding is not null
    and p.embedding is not null
    and not (p.id = any(seed_ids))
  order by p.embedding operator(extensions.<=>) profile.embedding
  limit least(greatest(match_count, 1), 50);
$$;

grant execute on function public.match_similar_products(text, integer) to anon, authenticated;
grant execute on function public.recommend_products(text[], integer) to anon, authenticated;
