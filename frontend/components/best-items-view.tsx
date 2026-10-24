"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BuyButton } from "./buy-button";
import type { Category, PriceRange, Product } from "@/lib/types";

export function BestItemsView({
  initialProducts,
  categories,
  priceRanges,
}: {
  initialProducts: Product[];
  categories: Category[];
  priceRanges: PriceRange[];
}) {
  const [selectedCat, setSelectedCat] = useState<string>(categories[0]?.slug || "electronics");
  const [selectedRange, setSelectedRange] = useState<string>("");

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchCat =
        !selectedCat ||
        (p.categorySlug && p.categorySlug.toLowerCase() === selectedCat.toLowerCase()) ||
        p.category.toLowerCase() === selectedCat.toLowerCase();

      // Check price range if selected
      let matchPrice = true;
      if (selectedRange) {
        const rangeObj = priceRanges.find((r) => r.id === selectedRange || r.label === selectedRange);
        if (rangeObj) {
          const price = parseFloat(p.currentPrice);
          const min = parseFloat(rangeObj.minPrice);
          const max = rangeObj.maxPrice ? parseFloat(rangeObj.maxPrice) : Infinity;
          matchPrice = price >= min && price <= max;
        }
      }
      return matchCat && matchPrice;
    });
  }, [initialProducts, selectedCat, selectedRange, priceRanges]);

  const currentCategoryName =
    categories.find((c) => c.slug === selectedCat)?.name ||
    selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1);

  return (
    <div className="bestLayoutWrap">
      {/* Category Sidebar */}
      <aside className="bestSidebar">
        <span className="sidebarLabel">CATEGORIES</span>
        <div className="sideCategoryList">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`sideCatBtn ${selectedCat === c.slug ? "activeSideCat" : ""}`}
              onClick={() => setSelectedCat(c.slug)}
            >
              {c.name}
            </button>
          ))}
          {categories.length === 0 && (
            <>
              <button
                className={`sideCatBtn ${selectedCat === "electronics" ? "activeSideCat" : ""}`}
                onClick={() => setSelectedCat("electronics")}
              >
                Electronics
              </button>
              <button
                className={`sideCatBtn ${selectedCat === "beauty" ? "activeSideCat" : ""}`}
                onClick={() => setSelectedCat("beauty")}
              >
                Beauty
              </button>
              <button
                className={`sideCatBtn ${selectedCat === "fashion" ? "activeSideCat" : ""}`}
                onClick={() => setSelectedCat("fashion")}
              >
                Fashion
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="bestMainContent">
        <div className="bestHeader">
          <div>
            <span className="eyebrow">CURATED SHORTLIST</span>
            <h1>Best in {currentCategoryName}</h1>
            <p>Hand-picked recommendations ranked by value, build, and everyday reliability.</p>
          </div>

          {/* Price Range Filter Chips */}
          <div className="rangeChips">
            <button
              className={`rangeChip ${!selectedRange ? "activeRangeChip" : ""}`}
              onClick={() => setSelectedRange("")}
            >
              ALL PRICES
            </button>
            {priceRanges.map((r) => (
              <button
                key={r.id}
                className={`rangeChip ${selectedRange === r.id ? "activeRangeChip" : ""}`}
                onClick={() => setSelectedRange(r.id)}
              >
                {r.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Ranked Products List */}
        <div className="rankList">
          {filteredProducts.map((p, idx) => (
            <article key={p.id} className="rankRow">
              <span className="rankIndex">#{String(idx + 1).padStart(2, "0")}</span>
              <div className="rankThumb">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span>✦</span>}
              </div>
              <div className="rankInfo">
                <span className="rankMeta">
                  {p.store} · {p.category}
                </span>
                <Link href={`/products/${p.slug}`}>
                  <h3>{p.name}</h3>
                </Link>
                <p className="rankDesc">{p.description}</p>
                <div className="rankPricing">
                  <strong>₹{Number(p.currentPrice).toLocaleString("en-IN")}</strong>
                  {p.originalPrice && (
                    <del>₹{Number(p.originalPrice).toLocaleString("en-IN")}</del>
                  )}
                  {p.discountPercent && (
                    <span className="savingTag">Save {p.discountPercent}%</span>
                  )}
                </div>
              </div>
              <div className="rankAction">
                <Link href={`/products/${p.slug}`} className="button buttonOutline">
                  View find →
                </Link>
                <BuyButton productId={p.id} productName={p.name} />
              </div>
            </article>
          ))}

          {filteredProducts.length === 0 && (
            <div className="rankEmpty">
              <h3>No items ranked in this range yet.</h3>
              <p>Admins can add and rank products from the Admin Workspace.</p>
              <Link href="/explore" className="button">
                Browse all Explore finds →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
