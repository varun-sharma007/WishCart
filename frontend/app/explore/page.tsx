import { Explore } from "@/components/explore";
import { getFilters, getProducts } from "@/lib/api";
export default async function ExplorePage() { const [products, filters] = await Promise.all([getProducts(), getFilters()]); return <Explore initialProducts={products} filters={filters} />; }
