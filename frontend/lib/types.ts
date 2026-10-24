export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  store: string;
  storeSlug?: string;
  category: string;
  categorySlug?: string;
  currentPrice: string;
  originalPrice?: string;
  discountPercent?: number;
  expiresAt?: string;
  imageUrl?: string;
  status?: string;
  version?: number;
  outboundUrl?: string;
};

export type Filters = {
  categories: string[];
  stores: string[];
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive?: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive?: boolean;
};

export type PriceRange = {
  id: string;
  label: string;
  minPrice: string;
  maxPrice?: string;
  displayOrder: number;
};

export type BestItemPlacement = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string;
  currentPrice: string;
  originalPrice?: string;
  discountPercent?: number;
  store: string;
  categoryId: string;
  categoryName: string;
  priceRangeId?: string;
  priceRangeLabel: string;
  rank: number;
  version: number;
};

export type ExploreProductItem = {
  productId: string;
  name: string;
  slug: string;
  store: string;
  category: string;
  currentPrice: string;
  status: string;
  isVisible: boolean;
  displayOrder: number;
};

export type ProductSuggestion = {
  id: string;
  name: string;
  url?: string;
  note?: string;
  contact?: string;
  status: "NEW" | "CONVERTED" | "REJECTED";
  createdAt: string;
};

export type SiteContentMap = {
  hero: {
    title: string;
    subtitle: string;
    badge: string;
    tagline: string;
  };
  quote: {
    quote: string;
    author: string;
  };
  about: {
    headline: string;
    body: string;
  };
  branding: {
    brandName: string;
    supportEmail: string;
  };
  disclosure: {
    title: string;
    text: string;
  };
};
