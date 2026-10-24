import { BestItemsView } from "@/components/best-items-view";
import { getBestItems, getCategories, getPriceRanges } from "@/lib/api";

export default async function BestItemsPage() {
  const [products, categories, priceRanges] = await Promise.all([
    getBestItems(),
    getCategories(),
    getPriceRanges(),
  ]);

  return (
    <section className="section bestItemsSection">
      <BestItemsView
        initialProducts={products}
        categories={categories}
        priceRanges={priceRanges}
      />
    </section>
  );
}
