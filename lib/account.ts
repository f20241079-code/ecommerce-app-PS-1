/**
 * Signed-in user's addresses, orders and profile stats (Supabase).
 *
 * Row level security on the server guarantees users only ever read or
 * change their own rows; orders are created by the place_order() database
 * function, which takes prices and stock from the products table.
 */
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id" | "isDefault"> & { isDefault?: boolean };

export type OrderStatus = "placed" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  icon: string;
  image: string | null;
};

export type Order = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  delivery: number;
  total: number;
  savings: number;
  paymentMethod: "card" | "upi" | "cod";
  shippingAddress: Partial<Record<string, string>>;
  createdAt: string;
  items: OrderItem[];
};

export type ProfileStats = {
  orders: number;
  addresses: number;
  saved: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn Supabase/Postgres errors into something a user can read. */
export function friendlyError(error: unknown): string {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  if (/JWT|not signed in|28000/i.test(msg)) return "Please sign in again and retry.";
  if (/Failed to fetch|Network request failed|network/i.test(msg)) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (/relation .* does not exist|Could not find the (table|function)/i.test(msg)) {
    return "The store backend isn't set up yet (database migrations missing).";
  }
  return msg || "Something went wrong. Please try again.";
}

export const formatAddress = (a: Partial<Record<string, string>> | Address) => {
  const r = a as Record<string, string>;
  const line1 = r.line1 ?? "";
  const line2 = r.line2 ?? "";
  const city = r.city ?? "";
  const state = r.state ?? "";
  const postal = r.postalCode ?? r.postal_code ?? "";
  const country = r.country ?? "";
  return [line1, line2, [city, state].filter(Boolean).join(", ") + (postal ? ` ${postal}` : ""), country]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
};

type AddressRow = {
  id: string; label: string; full_name: string; phone: string; line1: string; line2: string;
  city: string; state: string; postal_code: string; country: string; is_default: boolean;
};

const fromAddressRow = (r: AddressRow): Address => ({
  id: r.id,
  label: r.label,
  fullName: r.full_name,
  phone: r.phone,
  line1: r.line1,
  line2: r.line2,
  city: r.city,
  state: r.state,
  postalCode: r.postal_code,
  country: r.country,
  isDefault: r.is_default,
});

const toAddressRow = (a: AddressInput) => ({
  label: a.label.trim() || "Home",
  full_name: a.fullName.trim(),
  phone: a.phone.trim(),
  line1: a.line1.trim(),
  line2: a.line2.trim(),
  city: a.city.trim(),
  state: a.state.trim(),
  postal_code: a.postalCode.trim(),
  country: a.country.trim(),
  ...(a.isDefault !== undefined ? { is_default: a.isDefault } : {}),
});

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AddressRow[]).map(fromAddressRow);
}

export async function fetchAddress(id: string): Promise<Address | null> {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromAddressRow(data as AddressRow) : null;
}

/** Create (no id) or update (with id) an address. Returns the saved address. */
export async function saveAddress(input: AddressInput, id?: string): Promise<Address> {
  const row = toAddressRow(input);
  const query = id
    ? supabase.from("addresses").update(row).eq("id", id)
    : supabase.from("addresses").insert(row);
  const { data, error } = await query
    .select("id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default")
    .single();
  if (error) throw error;
  return fromAddressRow(data as AddressRow);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}

export async function setDefaultAddress(id: string): Promise<void> {
  // A database trigger clears the previous default.
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) throw error;
}

/** Validation shared by the address form. Returns field -> message. */
export function validateAddress(a: AddressInput): Partial<Record<keyof AddressInput, string>> {
  const errors: Partial<Record<keyof AddressInput, string>> = {};
  if (!a.fullName.trim()) errors.fullName = "Enter the recipient's name";
  if (!a.line1.trim()) errors.line1 = "Enter the street address";
  if (!a.city.trim()) errors.city = "Enter the city";
  if (!a.postalCode.trim()) errors.postalCode = "Enter the postal / PIN code";
  else if (!/^[A-Za-z0-9 -]{3,10}$/.test(a.postalCode.trim())) errors.postalCode = "That doesn't look like a postal code";
  if (a.phone.trim() && !/^[+()\d\s-]{6,20}$/.test(a.phone.trim())) errors.phone = "Enter a valid phone number";
  return errors;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

type OrderRow = {
  id: string; order_number: number; status: OrderStatus; subtotal: number; delivery: number;
  total: number; savings: number; payment_method: Order["paymentMethod"];
  shipping_address: Order["shippingAddress"]; created_at: string;
  order_items: {
    product_id: string; name: string; price: number; original_price: number;
    quantity: number; icon: string; image: string | null;
  }[];
};

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal, delivery, total, savings, payment_method, shipping_address, created_at, " +
        "order_items (product_id, name, price, original_price, quantity, icon, image)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as OrderRow[]).map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    subtotal: Number(r.subtotal),
    delivery: Number(r.delivery),
    total: Number(r.total),
    savings: Number(r.savings),
    paymentMethod: r.payment_method,
    shippingAddress: r.shipping_address ?? {},
    createdAt: r.created_at,
    items: (r.order_items ?? []).map((i) => ({
      productId: i.product_id,
      name: i.name,
      price: Number(i.price),
      originalPrice: Number(i.original_price),
      quantity: i.quantity,
      icon: i.icon,
      image: i.image,
    })),
  }));
}

export async function placeOrder(
  items: { id: string; quantity: number }[],
  addressId: string,
  paymentMethod: Order["paymentMethod"]
): Promise<{ orderId: string; orderNumber: number; total: number }> {
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
    p_address_id: addressId,
    p_payment_method: paymentMethod,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { order_id: string; order_number: number; total: number };
  return { orderId: row.order_id, orderNumber: row.order_number, total: Number(row.total) };
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
  if (error) throw error;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const [orders, addresses] = await Promise.all([
    supabase.from("orders").select("status, savings"),
    supabase.from("addresses").select("id", { count: "exact", head: true }),
  ]);
  if (orders.error) throw orders.error;
  if (addresses.error) throw addresses.error;
  const active = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  return {
    orders: active.length,
    addresses: addresses.count ?? 0,
    saved: active.reduce((sum, o) => sum + Number(o.savings), 0),
  };
}

// ---------------------------------------------------------------------------
// Hook: load data whenever the screen comes into focus
// ---------------------------------------------------------------------------

export function useFocusedQuery<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setData(await load());
        setError(null);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  return { data, setData, loading, refreshing, error, reload: () => run(), refresh: () => run(true) };
}
