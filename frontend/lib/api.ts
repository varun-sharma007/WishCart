import type { Category, Filters, PriceRange, Product, Store } from "./types";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const demo: Product[] = [
  {
    id: "wireless-headphones",
    slug: "wireless-headphones",
    name: "Wireless Headphones",
    description: "Comfortable over-ear headphones with rich sound and all-day battery.",
    store: "Amazon",
    category: "Electronics",
    currentPrice: "1299",
    originalPrice: "2499",
    discountPercent: 48,
    expiresAt: "2027-01-15",
  },
  {
    id: "everyday-smartwatch",
    slug: "everyday-smartwatch",
    name: "Everyday Smartwatch",
    description: "A clean, simple smartwatch for everyday movement.",
    store: "Flipkart",
    category: "Electronics",
    currentPrice: "1799",
    originalPrice: "2999",
    discountPercent: 40,
  },
  {
    id: "daily-care-set",
    slug: "daily-care-set",
    name: "Daily Care Set",
    description: "An uncomplicated personal-care essential set.",
    store: "Nykaa",
    category: "Beauty",
    currentPrice: "699",
  },
  {
    id: "canvas-tote",
    slug: "canvas-tote",
    name: "Canvas Tote",
    description: "A durable tote made for the day-to-day.",
    store: "Myntra",
    category: "Fashion",
    currentPrice: "899",
  },
];

async function request<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    const body = await response.json();
    return body.data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getProducts(query?: string, category?: string, store?: string, onSale?: boolean) {
  const p = new URLSearchParams();
  p.set("limit", "50");
  if (query) p.set("q", query);
  if (category) p.set("category", category);
  if (store) p.set("store", store);
  if (onSale) p.set("onSale", "true");
  return request<Product[]>(`/public/products?${p.toString()}`, demo);
}

export async function getDeals() {
  return request<Product[]>("/public/deals", demo.filter((p) => p.discountPercent));
}

export async function getBestItems(category?: string, priceRange?: string) {
  const p = new URLSearchParams();
  if (category) p.set("category", category);
  if (priceRange) p.set("priceRange", priceRange);
  const q = p.toString() ? `?${p.toString()}` : "";
  return request<Product[]>(`/public/best-items${q}`, demo);
}

export async function getProduct(slug: string) {
  return request<Product | null>(`/public/products/${slug}`, demo.find((p) => p.slug === slug) ?? null);
}

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/public/categories", [
    { id: "1", name: "Electronics", slug: "electronics", displayOrder: 1 },
    { id: "2", name: "Beauty", slug: "beauty", displayOrder: 2 },
    { id: "3", name: "Fashion", slug: "fashion", displayOrder: 3 },
  ]);
}

export async function getStores(): Promise<Store[]> {
  return request<Store[]>("/public/stores", [
    { id: "1", name: "Amazon", slug: "amazon" },
    { id: "2", name: "Flipkart", slug: "flipkart" },
    { id: "3", name: "Nykaa", slug: "nykaa" },
    { id: "4", name: "Myntra", slug: "myntra" },
  ]);
}

export async function getPriceRanges(): Promise<PriceRange[]> {
  return request<PriceRange[]>("/public/price-ranges", [
    { id: "1", label: "Under ₹1,000", minPrice: "0", maxPrice: "1000", displayOrder: 1 },
    { id: "2", label: "Under ₹2,000", minPrice: "1001", maxPrice: "2000", displayOrder: 2 },
  ]);
}

export async function getFilters(): Promise<Filters> {
  const [categories, stores] = await Promise.all([getCategories(), getStores()]);
  return {
    categories: categories.map((c) => c.name),
    stores: stores.map((s) => s.name),
  };
}
