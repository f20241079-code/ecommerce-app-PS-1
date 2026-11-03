-- Per-user delivery addresses and orders.
--
-- Security model:
--   * Row level security limits every row to its owner (auth.uid()).
--   * Addresses are written directly by the app (RLS checks ownership).
--   * Orders are NOT writable by the app. They are created by place_order(),
--     which reads prices and stock from public.products itself, so a client
--     can't change what it pays. cancel_order() is the only other write.

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------

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

select pg_temp.shoply_move_aside_incompatible('addresses', array['user_id','label','full_name','line1','city','postal_code','is_default']);

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null default 'Home' check (char_length(label) between 1 and 40),
  full_name   text not null check (char_length(full_name) between 1 and 100),
  phone       text not null default '' check (char_length(phone) <= 30),
  line1       text not null check (char_length(line1) between 1 and 200),
  line2       text not null default '' check (char_length(line2) <= 200),
  city        text not null check (char_length(city) between 1 and 100),
  state       text not null default '' check (char_length(state) <= 100),
  postal_code text not null check (char_length(postal_code) between 1 and 20),
  country     text not null default '' check (char_length(country) <= 100),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id, created_at desc);

-- At most one default address per user.
create unique index if not exists addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

-- Keep exactly one default: the first address becomes the default, and
-- making one address the default clears the flag on the others.
create or replace function public.addresses_manage_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not exists (
    select 1 from public.addresses where user_id = new.user_id and is_default
  ) then
    new.is_default := true;
  end if;

  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_manage_default on public.addresses;
create trigger addresses_manage_default
  before insert or update of is_default on public.addresses
  for each row execute function public.addresses_manage_default();

-- When the default address is deleted, promote the newest remaining one.
create or replace function public.addresses_promote_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    update public.addresses
       set is_default = true
     where id = (
       select id from public.addresses
        where user_id = old.user_id
        order by created_at desc
        limit 1
     );
  end if;
  return null;
end;
$$;

drop trigger if exists addresses_promote_default on public.addresses;
create trigger addresses_promote_default
  after delete on public.addresses
  for each row execute function public.addresses_promote_default();

alter table public.addresses enable row level security;
grant select, insert, update, delete on public.addresses to authenticated;

drop policy if exists "Users manage their own addresses" on public.addresses;
create policy "Users manage their own addresses"
  on public.addresses for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

select pg_temp.shoply_move_aside_incompatible('orders', array['order_number','user_id','status','total','savings','payment_method','shipping_address']);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     bigint generated always as identity unique,
  user_id          uuid not null references auth.users (id) on delete cascade,
  status           text not null default 'placed'
                   check (status in ('placed', 'shipped', 'delivered', 'cancelled')),
  subtotal         numeric(10, 2) not null,
  delivery         numeric(10, 2) not null,
  total            numeric(10, 2) not null,
  savings          numeric(10, 2) not null default 0,
  payment_method   text not null check (payment_method in ('card', 'upi', 'cod')),
  shipping_address jsonb not null,
  created_at       timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

select pg_temp.shoply_move_aside_incompatible('order_items', array['order_id','product_id','name','price','original_price','quantity']);

create table if not exists public.order_items (
  id             bigint generated always as identity primary key,
  order_id       uuid not null references public.orders (id) on delete cascade,
  -- No foreign key: order history must survive products being removed.
  product_id     text not null,
  name           text not null,
  price          numeric(10, 2) not null,
  original_price numeric(10, 2) not null,
  quantity       integer not null check (quantity between 1 and 99),
  icon           text not null default '🛍️',
  image          text
);

create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
grant select on public.orders, public.order_items to authenticated;

drop policy if exists "Users see their own orders" on public.orders;
create policy "Users see their own orders"
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users see their own order items" on public.order_items;
create policy "Users see their own order items"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = order_id and o.user_id = (select auth.uid())
  ));

-- place_order(items, address_id, payment_method)
--   items: [{"product_id": "12", "quantity": 2}, ...]
-- Prices, discounts and stock come from public.products, never the client.
create or replace function public.place_order(
  p_items          jsonb,
  p_address_id     uuid,
  p_payment_method text
)
returns table (order_id uuid, order_number bigint, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_address   public.addresses;
  v_subtotal  numeric(10, 2);
  v_savings   numeric(10, 2);
  v_delivery  numeric(10, 2);
  v_order     public.orders;
  v_missing   text;
  v_short     text;
begin
  if v_user is null then
    raise exception 'You need to be signed in to place an order.' using errcode = '28000';
  end if;

  if p_payment_method not in ('card', 'upi', 'cod') then
    raise exception 'Unknown payment method.' using errcode = '22023';
  end if;

  select * into v_address from public.addresses a where a.id = p_address_id and a.user_id = v_user;
  if not found then
    raise exception 'Please choose a delivery address.' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many different items in one order (max 50).' using errcode = '22023';
  end if;

  -- Merge duplicate lines and validate quantities.
  drop table if exists pg_temp._cart;
  create temporary table _cart on commit drop as
    select (i ->> 'product_id')::text as product_id,
           sum((i ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as i
     group by 1;

  if exists (select 1 from _cart c where c.quantity is null or c.quantity < 1 or c.quantity > 99) then
    raise exception 'Each item quantity must be between 1 and 99.' using errcode = '22023';
  end if;

  select string_agg(c.product_id, ', ') into v_missing
    from _cart c left join public.products p on p.id = c.product_id
   where p.id is null;
  if v_missing is not null then
    raise exception 'Some items are no longer available (%). Please remove them from your cart.', v_missing
      using errcode = '22023';
  end if;

  -- Lock the product rows, then check stock.
  perform 1 from public.products p join _cart c on c.product_id = p.id for update of p;

  select string_agg(format('%s (only %s left)', p.name, p.stock), ', ') into v_short
    from _cart c join public.products p on p.id = c.product_id
   where p.stock is not null and p.stock < c.quantity;
  if v_short is not null then
    raise exception 'Not enough stock: %.', v_short using errcode = '22023';
  end if;

  select sum(p.price * c.quantity),
         sum(greatest(p.original_price - p.price, 0) * c.quantity)
    into v_subtotal, v_savings
    from _cart c join public.products p on p.id = c.product_id;

  v_delivery := case when v_subtotal >= 50 then 0 else 5 end;

  insert into public.orders (user_id, subtotal, delivery, total, savings, payment_method, shipping_address)
  values (
    v_user, v_subtotal, v_delivery, v_subtotal + v_delivery, v_savings, p_payment_method,
    jsonb_build_object(
      'label', v_address.label, 'full_name', v_address.full_name, 'phone', v_address.phone,
      'line1', v_address.line1, 'line2', v_address.line2, 'city', v_address.city,
      'state', v_address.state, 'postal_code', v_address.postal_code, 'country', v_address.country
    )
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, price, original_price, quantity, icon, image)
  select v_order.id, p.id, p.name, p.price, p.original_price, c.quantity, p.icon,
         coalesce(p.thumbnail, p.images[1])
    from _cart c join public.products p on p.id = c.product_id;

  update public.products p
     set stock = p.stock - c.quantity
    from _cart c
   where p.id = c.product_id and p.stock is not null;

  return query select v_order.id, v_order.order_number, v_order.total;
end;
$$;

-- Cancel an order that hasn't shipped yet, and put the stock back.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select o.status into v_status
    from public.orders o
   where o.id = p_order_id and o.user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Order not found.' using errcode = '22023';
  end if;
  if v_status <> 'placed' then
    raise exception 'This order can no longer be cancelled (status: %).', v_status using errcode = '22023';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;

  update public.products p
     set stock = p.stock + i.quantity
    from public.order_items i
   where i.order_id = p_order_id and p.id = i.product_id and p.stock is not null;
end;
$$;

revoke execute on function public.place_order(jsonb, uuid, text) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.place_order(jsonb, uuid, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
