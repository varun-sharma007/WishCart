import type {
  Product,
  Store,
  Category,
  PriceRange,
  BestItemPlacement,
  ExploreProductItem,
  ProductSuggestion,
  SiteContentMap
} from "./types";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function authHeaders(token?: string, extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) {
    headers["X-Admin-Token"] = token;
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function adminLogin(email: string, password: string): Promise<{ adminToken: string; email: string }> {
  const response = await fetch(`${base}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || "Invalid administrator credentials.");
  }
  return (await response.json()).data;
}

export async function outboundClick(productId: string): Promise<string> {
  const response = await fetch(`${base}/public/products/${productId}/outbound-clicks`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("This product is no longer available.");
  return (await response.json()).data.redirectUrl as string;
}

export async function submitSuggestion(input: { name: string; url?: string; note?: string; contact?: string }) {
  const response = await fetch(`${base}/public/product-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Unable to submit your suggestion.");
}

// --- Admin Products ---
export async function fetchAdminProducts(
  token: string,
  params?: { q?: string; status?: string; category?: string }
): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.status) query.set("status", params.status);
  if (params?.category) query.set("category", params.category);

  const res = await fetch(`${base}/admin/products?${query.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load products");
  return (await res.json()).data;
}

export async function createAdminProduct(
  token: string,
  product: {
    slug: string;
    name: string;
    description: string;
    storeSlug: string;
    categorySlug: string;
    outboundUrl: string;
    currentPrice: number;
    originalPrice?: number | null;
    imageUrl?: string | null;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    expiresAt?: string | null;
  }
) {
  const res = await fetch(`${base}/admin/products`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || "Failed to create product");
  }
  return (await res.json()).data;
}

export async function updateAdminProduct(
  token: string,
  id: string,
  product: {
    slug: string;
    name: string;
    description: string;
    storeSlug: string;
    categorySlug: string;
    outboundUrl: string;
    currentPrice: number;
    originalPrice?: number | null;
    imageUrl?: string | null;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    expiresAt?: string | null;
  },
  version?: number
) {
  const headers: Record<string, string> = {};
  if (version !== undefined) headers["If-Match"] = version.toString();

  const res = await fetch(`${base}/admin/products/${id}`, {
    method: "PATCH",
    headers: authHeaders(token, headers),
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || "Failed to update product");
  }
  return (await res.json()).data;
}

export async function deleteAdminProduct(token: string, id: string) {
  const res = await fetch(`${base}/admin/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete product");
}

// --- Stores, Categories, Price Ranges ---
export async function fetchStores(token?: string): Promise<Store[]> {
  const res = await fetch(`${base}/${token ? "admin" : "public"}/stores`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  return (await res.json()).data;
}

export async function createStore(token: string, store: { name: string; slug?: string; logoUrl?: string }) {
  const res = await fetch(`${base}/admin/stores`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(store),
  });
  if (!res.ok) throw new Error("Failed to create store");
  return (await res.json()).data;
}

export async function fetchCategories(token?: string): Promise<Category[]> {
  const res = await fetch(`${base}/${token ? "admin" : "public"}/categories`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  return (await res.json()).data;
}

export async function createCategory(token: string, category: { name: string; slug?: string; displayOrder?: number }) {
  const res = await fetch(`${base}/admin/categories`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return (await res.json()).data;
}

export async function fetchPriceRanges(token?: string): Promise<PriceRange[]> {
  const res = await fetch(`${base}/${token ? "admin" : "public"}/price-ranges`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  return (await res.json()).data;
}

export async function createPriceRange(
  token: string,
  range: { label: string; minPrice: number; maxPrice?: number | null; displayOrder?: number }
) {
  const res = await fetch(`${base}/admin/price-ranges`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(range),
  });
  if (!res.ok) throw new Error("Failed to create price range");
  return (await res.json()).data;
}

// --- Deals ---
export async function fetchAdminDeals(token: string): Promise<Product[]> {
  const res = await fetch(`${base}/admin/deals`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load deals");
  return (await res.json()).data;
}

export async function updateAdminDeal(
  token: string,
  productId: string,
  deal: { originalPrice: number; currentPrice?: number; expiresAt?: string | null }
) {
  const res = await fetch(`${base}/admin/deals/${productId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(deal),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || "Failed to update deal");
  }
  return (await res.json()).data;
}

export async function removeAdminDeal(token: string, productId: string) {
  const res = await fetch(`${base}/admin/deals/${productId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to remove deal");
}

// --- Best Items Placements ---
export async function fetchAdminBestItems(
  token: string,
  categoryId?: string,
  priceRangeId?: string
): Promise<BestItemPlacement[]> {
  const query = new URLSearchParams();
  if (categoryId) query.set("categoryId", categoryId);
  if (priceRangeId) query.set("priceRangeId", priceRangeId);

  const res = await fetch(`${base}/admin/best-items?${query.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load best items");
  return (await res.json()).data;
}

export async function addBestItemPlacement(
  token: string,
  placement: { productId: string; categoryId: string; priceRangeId?: string | null; rank: number }
) {
  const res = await fetch(`${base}/admin/best-items`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(placement),
  });
  if (!res.ok) throw new Error("Failed to add placement");
  return (await res.json()).data;
}

export async function reorderBestItems(token: string, items: { id: string; rank: number }[]) {
  const res = await fetch(`${base}/admin/best-items/reorder`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error("Failed to reorder placements");
  return (await res.json()).data;
}

export async function deleteBestItemPlacement(token: string, id: string) {
  const res = await fetch(`${base}/admin/best-items/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete placement");
}

// --- Explore Products Visibility ---
export async function fetchAdminExplore(token: string): Promise<ExploreProductItem[]> {
  const res = await fetch(`${base}/admin/explore`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load explore items");
  return (await res.json()).data;
}

export async function updateExploreVisibility(
  token: string,
  productId: string,
  data: { isVisible?: boolean; displayOrder?: number }
) {
  const res = await fetch(`${base}/admin/explore/${productId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update explore visibility");
  return (await res.json()).data;
}

// --- Visitor Suggestions ---
export async function fetchAdminSuggestions(token: string, status?: string): Promise<ProductSuggestion[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${base}/admin/suggestions${query}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load suggestions");
  return (await res.json()).data;
}

export async function updateSuggestionStatus(
  token: string,
  id: string,
  status: "NEW" | "CONVERTED" | "REJECTED"
) {
  const res = await fetch(`${base}/admin/suggestions/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update suggestion status");
  return (await res.json()).data;
}

export async function deleteSuggestion(token: string, id: string) {
  const res = await fetch(`${base}/admin/suggestions/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete suggestion");
}

// --- Site Content ---
export async function fetchAdminContent(token: string): Promise<SiteContentMap> {
  const res = await fetch(`${base}/admin/content`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load content");
  return (await res.json()).data;
}

export async function updateContent(token: string, key: string, content: Record<string, any>) {
  const res = await fetch(`${base}/admin/content/${key}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(content),
  });
  if (!res.ok) throw new Error("Failed to update site content");
  return (await res.json()).data;
}

export async function fetchPublicContent(): Promise<SiteContentMap> {
  try {
    const res = await fetch(`${base}/public/content`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error("Failed to load public content");
    return (await res.json()).data;
  } catch {
    return {
      hero: {
        title: "Smart finds. Better buys.",
        subtitle: "Wishcart is a curated discovery platform that helps people find products worth buying—then sends them to trusted stores to complete the purchase.",
        badge: "FIND IT · LOVE IT · BUY IT",
        tagline: "SMART FINDS · BETTER BUYS",
      },
      quote: {
        quote: "Good finds. No endless scrolling.",
        author: "Curated picks for the things you want right now.",
      },
      about: {
        headline: "Curated, not crowded.",
        body: "Useful recommendations instead of overwhelming marketplaces. Time-sensitive deal discovery creates reason to return. Trusted retailers handle checkout, payment, and delivery.",
      },
      branding: {
        brandName: "WISHCART",
        supportEmail: "curator@wishcart.com",
      },
      disclosure: {
        title: "Leaving Wishcart",
        text: "You are heading to the merchant to complete your purchase. Their checkout, pricing, privacy, and delivery policies apply.",
      },
    };
  }
}
