-- Product catalog + vector search for ML recommendations.
--
-- Each product gets a 384-dimensional embedding from the gte-small sentence
-- model (filled in by the `embed-products` edge function). Recommendations are
-- nearest neighbours by cosine distance, computed by pgvector inside Postgres.

create extension if not exists vector with schema extensions;

create table if not exists public.products (
  id             text primary key,
  name           text not null,
  price          numeric(10, 2) not null,
  original_price numeric(10, 2) not null,
  rating         numeric(2, 1) not null default 0,
  reviews        integer not null default 0,
  icon           text not null,
  category       text not null,
  badge          text,
  description    text not null default '',
  tags           text[] not null default '{}',
  embedding      extensions.vector(384),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- HNSW index for fast approximate nearest-neighbour search on cosine distance.
create index if not exists products_embedding_idx
  on public.products using hnsw (embedding extensions.vector_cosine_ops);

-- Clear the embedding whenever the text it was computed from changes, so the
-- edge function knows to re-embed that product.
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
     or new.tags is distinct from old.tags then
    new.embedding := null;
  end if;
  return new;
end;
$$;

drop trigger if exists products_reset_embedding on public.products;
create trigger products_reset_embedding
  before update on public.products
  for each row execute function public.products_reset_embedding();

-- Catalog is public read-only; writes go through the service role only.
alter table public.products enable row level security;
grant select on public.products to anon, authenticated;

drop policy if exists "Products are viewable by everyone" on public.products;
create policy "Products are viewable by everyone"
  on public.products for select
  to anon, authenticated
  using (true);

-- Drop first: a later migration changes these functions' return columns, and
-- Postgres can't "create or replace" a function with a different return type.
-- Dropping keeps this file safe to re-run on a database that's further along.
drop function if exists public.match_similar_products(text, integer);
drop function if exists public.recommend_products(text[], integer);

-- "You may also like": the products closest to one product.
create function public.match_similar_products(
  p_product_id text,
  match_count  integer default 6
)
returns table (
  id text, name text, price numeric, original_price numeric, rating numeric,
  reviews integer, icon text, category text, badge text, description text,
  tags text[], similarity double precision
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.name, p.price, p.original_price, p.rating, p.reviews, p.icon,
         p.category, p.badge, p.description, p.tags,
         1 - (p.embedding operator(extensions.<=>) src.embedding) as similarity
  from public.products src
  join public.products p on p.id <> src.id
  where src.id = p_product_id
    and src.embedding is not null
    and p.embedding is not null
  order by p.embedding operator(extensions.<=>) src.embedding
  limit least(greatest(match_count, 1), 50);
$$;

-- "Recommended for you": the products closest to the average (centroid) of
-- the products a user has shown interest in (cart, wishlist, ...).
create function public.recommend_products(
  seed_ids    text[],
  match_count integer default 6
)
returns table (
  id text, name text, price numeric, original_price numeric, rating numeric,
  reviews integer, icon text, category text, badge text, description text,
  tags text[], similarity double precision
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
         p.category, p.badge, p.description, p.tags,
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
