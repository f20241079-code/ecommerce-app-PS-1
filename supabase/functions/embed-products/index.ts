// Supabase Edge Function: generates ML text embeddings for products.
//
// Uses the gte-small sentence-embedding model that ships with the Supabase
// Edge Runtime (no external API key needed). It embeds every product whose
// `embedding` is null and stores the 384-dim vector, which powers the
// match_similar_products / recommend_products SQL functions.
//
// Deploy:  supabase functions deploy embed-products
// Run:     curl -X POST "$SUPABASE_URL/functions/v1/embed-products" \
//            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
//
// JSON body options:
//   {"all": true}    re-embed every product (not just missing ones)
//   {"limit": 40}    max products per call (default 40); the response's
//                    `remaining` says how many still need embedding.

import { createClient } from "npm:@supabase/supabase-js@2";

// Keep in sync with productText() in lib/products.ts.
const categoryLabel = (c: string) =>
  c.split(/[-_ ]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const productText = (p: {
  name: string;
  category: string;
  description: string;
  tags: string[];
  brand?: string | null;
}) => {
  const brand = p.brand ? ` Brand: ${p.brand}.` : "";
  return `${p.name}. Category: ${categoryLabel(p.category)}.${brand} ${p.description} Tags: ${(p.tags ?? []).join(", ")}.`;
};

// deno-lint-ignore no-explicit-any
const model = new (globalThis as any).Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const reembedAll = body?.all === true;
  const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 200);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let query = supabase.from("products").select("id, name, category, description, tags, brand");
  if (reembedAll) {
    // Clear first so the batched loop below picks everything up.
    const { error: resetError } = await supabase.from("products").update({ embedding: null }).not("id", "is", null);
    if (resetError) return Response.json({ error: resetError.message }, { status: 500 });
  }
  query = query.is("embedding", null).order("id").limit(limit);
  const { data: products, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const failed: string[] = [];
  for (const p of products ?? []) {
    const embedding: number[] = await model.run(productText(p), {
      mean_pool: true,
      normalize: true,
    });
    const { error: updateError } = await supabase
      .from("products")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", p.id);
    if (updateError) failed.push(p.id);
  }

  const { count: remaining } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  return Response.json({
    embedded: (products?.length ?? 0) - failed.length,
    failed,
    // Failed rows stay null; don't count them as remaining work.
    remaining: Math.max((remaining ?? 0) - failed.length, 0),
  });
});
