"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  fetchStores,
  createStore,
  fetchCategories,
  createCategory,
  fetchPriceRanges,
  createPriceRange,
  fetchAdminDeals,
  updateAdminDeal,
  removeAdminDeal,
  fetchAdminBestItems,
  addBestItemPlacement,
  reorderBestItems,
  deleteBestItemPlacement,
  fetchAdminExplore,
  updateExploreVisibility,
  fetchAdminSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  fetchAdminContent,
  updateContent,
} from "@/lib/api-client";
import type {
  Product,
  Store,
  Category,
  PriceRange,
  BestItemPlacement,
  ExploreProductItem,
  ProductSuggestion,
  SiteContentMap,
} from "@/lib/types";

type AdminTab =
  | "overview"
  | "products"
  | "deals"
  | "rankings"
  | "explore"
  | "suggestions"
  | "content";

export function AdminWorkspace() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [bestItems, setBestItems] = useState<BestItemPlacement[]>([]);
  const [exploreItems, setExploreItems] = useState<ExploreProductItem[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContentMap | null>(null);

  // Filter & Search states
  const [prodSearch, setProdSearch] = useState("");
  const [prodStatusFilter, setProdStatusFilter] = useState("");
  const [prodCatFilter, setProdCatFilter] = useState("");
  const [selectedRankCat, setSelectedRankCat] = useState<string>("");
  const [selectedRankRange, setSelectedRankRange] = useState<string>("");
  const [suggestionFilter, setSuggestionFilter] = useState<string>("ALL");

  // Modal / Form states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDealProduct, setEditingDealProduct] = useState<Product | null>(null);
  const [bestItemModalOpen, setBestItemModalOpen] = useState(false);
  const [priceRangeModalOpen, setPriceRangeModalOpen] = useState(false);

  // Product Form fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStore, setFormStore] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formOutboundUrl, setFormOutboundUrl] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [convertedSuggestionId, setConvertedSuggestionId] = useState<string | null>(null);

  // Deal Form fields
  const [dealProductId, setDealProductId] = useState("");
  const [dealCurrentPrice, setDealCurrentPrice] = useState("");
  const [dealOriginalPrice, setDealOriginalPrice] = useState("");
  const [dealExpiresAt, setDealExpiresAt] = useState("");

  // Best item placement Form fields
  const [placeProductId, setPlaceProductId] = useState("");
  const [placeRank, setPlaceRank] = useState(1);

  // New Price Range fields
  const [newRangeLabel, setNewRangeLabel] = useState("");
  const [newRangeMin, setNewRangeMin] = useState("0");
  const [newRangeMax, setNewRangeMax] = useState("");
  const [newRangeOrder, setNewRangeOrder] = useState(1);

  // Content edit state
  const [contentForm, setContentForm] = useState<SiteContentMap | null>(null);

  // Notify helper
  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Load Admin Token on Mount
  useEffect(() => {
    const storedToken = localStorage.getItem("wishcart-admin-token");
    const storedEmail = localStorage.getItem("wishcart-admin-email");
    if (!storedToken) {
      router.replace("/");
      return;
    }
    setToken(storedToken);
    setEmail(storedEmail || "admin@2026");
  }, [router]);

  // Load all initial data once token is set
  useEffect(() => {
    if (!token) return;
    loadAllData(token);
  }, [token]);

  async function loadAllData(currentToken: string) {
    setLoading(true);
    try {
      const [
        prods,
        stList,
        catList,
        rangeList,
        dealList,
        bestList,
        expList,
        suggList,
        contentMap,
      ] = await Promise.all([
        fetchAdminProducts(currentToken),
        fetchStores(currentToken),
        fetchCategories(currentToken),
        fetchPriceRanges(currentToken),
        fetchAdminDeals(currentToken),
        fetchAdminBestItems(currentToken),
        fetchAdminExplore(currentToken),
        fetchAdminSuggestions(currentToken),
        fetchAdminContent(currentToken),
      ]);
      setProducts(prods);
      setStores(stList);
      setCategories(catList);
      setPriceRanges(rangeList);
      setDeals(dealList);
      setBestItems(bestList);
      setExploreItems(expList);
      setSuggestions(suggList);
      setSiteContent(contentMap);
      setContentForm(contentMap);
      if (catList.length > 0 && !selectedRankCat) {
        setSelectedRankCat(catList[0].id);
      }
    } catch (err: any) {
      notify(err.message || "Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("wishcart-admin-token");
    localStorage.removeItem("wishcart-admin-email");
    router.replace("/");
  }

  // --- PRODUCT ACTIONS ---
  function openAddProductModal(prefill?: {
    name?: string;
    url?: string;
    note?: string;
    suggestionId?: string;
  }) {
    setEditingProduct(null);
    setFormName(prefill?.name || "");
    setFormSlug(
      prefill?.name
        ? prefill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : ""
    );
    setFormDescription(prefill?.note || "");
    setFormStore(stores[0]?.slug || "amazon");
    setFormCategory(categories[0]?.slug || "electronics");
    setFormOutboundUrl(prefill?.url || "https://");
    setFormCurrentPrice("");
    setFormOriginalPrice("");
    setFormImageUrl("");
    setFormStatus("ACTIVE");
    setFormExpiresAt("");
    setConvertedSuggestionId(prefill?.suggestionId || null);
    setProductModalOpen(true);
  }

  function openEditProductModal(p: Product) {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormDescription(p.description);
    setFormStore(p.storeSlug || p.store.toLowerCase());
    setFormCategory(p.categorySlug || p.category.toLowerCase());
    setFormOutboundUrl(p.outboundUrl || "https://amazon.in/");
    setFormCurrentPrice(p.currentPrice);
    setFormOriginalPrice(p.originalPrice || "");
    setFormImageUrl(p.imageUrl || "");
    setFormStatus((p.status as any) || "ACTIVE");
    setFormExpiresAt(p.expiresAt ? p.expiresAt.substring(0, 16) : "");
    setConvertedSuggestionId(null);
    setProductModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        slug: formSlug.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        storeSlug: formStore.trim().toLowerCase(),
        categorySlug: formCategory.trim().toLowerCase(),
        outboundUrl: formOutboundUrl.trim(),
        currentPrice: parseFloat(formCurrentPrice),
        originalPrice: formOriginalPrice ? parseFloat(formOriginalPrice) : null,
        imageUrl: formImageUrl.trim() || null,
        status: formStatus,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      };

      if (editingProduct) {
        await updateAdminProduct(token, editingProduct.id, payload, editingProduct.version);
        notify("Product updated successfully!");
      } else {
        await createAdminProduct(token, payload);
        if (convertedSuggestionId) {
          await updateSuggestionStatus(token, convertedSuggestionId, "CONVERTED");
          setConvertedSuggestionId(null);
        }
        notify("New product created successfully!");
      }
      setProductModalOpen(false);
      // Refresh products and related
      const [updatedProds, updatedDeals, updatedExp] = await Promise.all([
        fetchAdminProducts(token),
        fetchAdminDeals(token),
        fetchAdminExplore(token),
      ]);
      setProducts(updatedProds);
      setDeals(updatedDeals);
      setExploreItems(updatedExp);
    } catch (err: any) {
      notify(err.message || "Failed to save product", "error");
    }
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove placements as well.`))
      return;
    try {
      await deleteAdminProduct(token, id);
      notify(`Product "${name}" deleted.`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setBestItems((prev) => prev.filter((b) => b.productId !== id));
      setExploreItems((prev) => prev.filter((e) => e.productId !== id));
    } catch (err: any) {
      notify(err.message || "Failed to delete product", "error");
    }
  }

  async function handleToggleStatus(p: Product) {
    const nextStatus = p.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    try {
      await updateAdminProduct(
        token,
        p.id,
        {
          slug: p.slug,
          name: p.name,
          description: p.description,
          storeSlug: p.storeSlug || p.store.toLowerCase(),
          categorySlug: p.categorySlug || p.category.toLowerCase(),
          outboundUrl: p.outboundUrl || "https://amazon.in/",
          currentPrice: parseFloat(p.currentPrice),
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
          imageUrl: p.imageUrl || null,
          status: nextStatus,
          expiresAt: p.expiresAt || null,
        },
        p.version
      );
      notify(`Product marked as ${nextStatus}`);
      const updated = await fetchAdminProducts(token);
      setProducts(updated);
    } catch (err: any) {
      notify(err.message || "Failed to update status", "error");
    }
  }

  // --- CSV IMPORT / EXPORT ---
  function exportCSV() {
    const headers = [
      "Slug",
      "Name",
      "Description",
      "Store",
      "Category",
      "CurrentPrice",
      "OriginalPrice",
      "OutboundUrl",
      "Status",
    ];
    const rows = products.map((p) => [
      `"${p.slug}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      `"${p.store}"`,
      `"${p.category}"`,
      p.currentPrice,
      p.originalPrice || "",
      `"${p.outboundUrl || ""}"`,
      p.status || "ACTIVE",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wishcart-products-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      let successCount = 0;
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 6) {
          const [slug, name, description, store, category, curPrice, origPrice, outUrl, status] = parts;
          try {
            await createAdminProduct(token, {
              slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              name,
              description: description || name,
              storeSlug: store ? store.toLowerCase() : "amazon",
              categorySlug: category ? category.toLowerCase() : "electronics",
              outboundUrl: outUrl && outUrl.startsWith("https://") ? outUrl : "https://amazon.in/",
              currentPrice: parseFloat(curPrice) || 999,
              originalPrice: origPrice ? parseFloat(origPrice) : null,
              status: (status as any) || "ACTIVE",
            });
            successCount++;
          } catch {
            // continue
          }
        }
      }
      notify(`Import complete! ${successCount} products added.`);
      const updated = await fetchAdminProducts(token);
      setProducts(updated);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // --- DEAL ACTIONS ---
  function openEditDealModal(p: Product) {
    setEditingDealProduct(p);
    setDealProductId(p.id);
    setDealCurrentPrice(p.currentPrice);
    setDealOriginalPrice(p.originalPrice || (parseFloat(p.currentPrice) * 1.5).toFixed(0));
    setDealExpiresAt(p.expiresAt ? p.expiresAt.substring(0, 16) : "");
    setDealModalOpen(true);
  }

  async function handleSaveDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!dealProductId) return;
    try {
      await updateAdminDeal(token, dealProductId, {
        originalPrice: parseFloat(dealOriginalPrice),
        currentPrice: parseFloat(dealCurrentPrice),
        expiresAt: dealExpiresAt ? new Date(dealExpiresAt).toISOString() : null,
      });
      notify("Discount deal updated successfully!");
      setDealModalOpen(false);
      const [updatedDeals, updatedProds] = await Promise.all([
        fetchAdminDeals(token),
        fetchAdminProducts(token),
      ]);
      setDeals(updatedDeals);
      setProducts(updatedProds);
    } catch (err: any) {
      notify(err.message || "Failed to update deal", "error");
    }
  }

  async function handleRemoveDeal(productId: string) {
    if (!confirm("Are you sure you want to end this discount deal?")) return;
    try {
      await removeAdminDeal(token, productId);
      notify("Deal ended. Product reverted to standard pricing.");
      setDeals((prev) => prev.filter((d) => d.id !== productId));
      const updated = await fetchAdminProducts(token);
      setProducts(updated);
    } catch (err: any) {
      notify(err.message || "Failed to remove deal", "error");
    }
  }

  // --- BEST ITEM PLACEMENT ACTIONS ---
  async function handleAddBestItemPlacement(e: React.FormEvent) {
    e.preventDefault();
    if (!placeProductId || !selectedRankCat) return;
    try {
      await addBestItemPlacement(token, {
        productId: placeProductId,
        categoryId: selectedRankCat,
        priceRangeId: selectedRankRange || null,
        rank: placeRank,
      });
      notify("Product added to shortlist ranking!");
      setBestItemModalOpen(false);
      const updated = await fetchAdminBestItems(token);
      setBestItems(updated);
    } catch (err: any) {
      notify(err.message || "Failed to add ranking", "error");
    }
  }

  async function handleMoveRank(item: BestItemPlacement, direction: "up" | "down") {
    const list = bestItems
      .filter(
        (b) =>
          b.categoryId === item.categoryId &&
          (b.priceRangeId === item.priceRangeId || (!b.priceRangeId && !item.priceRangeId))
      )
      .sort((a, b) => a.rank - b.rank);

    const index = list.findIndex((b) => b.id === item.id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const currentItem = list[index];
    const targetItem = list[targetIndex];

    const tempRank = targetItem.rank;
    targetItem.rank = currentItem.rank;
    currentItem.rank = tempRank;

    try {
      await reorderBestItems(token, [
        { id: currentItem.id, rank: currentItem.rank },
        { id: targetItem.id, rank: targetItem.rank },
      ]);
      const updated = await fetchAdminBestItems(token);
      setBestItems(updated);
      notify("Rankings reordered.");
    } catch (err: any) {
      notify(err.message || "Failed to reorder", "error");
    }
  }

  async function handleDeleteBestItem(id: string) {
    if (!confirm("Remove this product from the shortlist?")) return;
    try {
      await deleteBestItemPlacement(token, id);
      setBestItems((prev) => prev.filter((b) => b.id !== id));
      notify("Removed from shortlist.");
    } catch (err: any) {
      notify(err.message || "Failed to remove ranking", "error");
    }
  }

  // --- PRICE RANGE ACTIONS ---
  async function handleSavePriceRange(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createPriceRange(token, {
        label: newRangeLabel.trim(),
        minPrice: parseFloat(newRangeMin),
        maxPrice: newRangeMax ? parseFloat(newRangeMax) : null,
        displayOrder: newRangeOrder,
      });
      notify("Price range created successfully!");
      setPriceRangeModalOpen(false);
      setNewRangeLabel("");
      const updated = await fetchPriceRanges(token);
      setPriceRanges(updated);
    } catch (err: any) {
      notify(err.message || "Failed to create price range", "error");
    }
  }

  // --- EXPLORE VISIBILITY ACTIONS ---
  async function handleToggleExploreVisibility(item: ExploreProductItem) {
    const nextVal = !item.isVisible;
    try {
      await updateExploreVisibility(token, item.productId, {
        isVisible: nextVal,
        displayOrder: item.displayOrder,
      });
      setExploreItems((prev) =>
        prev.map((e) => (e.productId === item.productId ? { ...e, isVisible: nextVal } : e))
      );
      notify(`Product visibility ${nextVal ? "enabled" : "hidden"}`);
    } catch (err: any) {
      notify(err.message || "Failed to update visibility", "error");
    }
  }

  async function handleUpdateExploreOrder(productId: string, order: number) {
    try {
      await updateExploreVisibility(token, productId, { displayOrder: order });
      setExploreItems((prev) =>
        prev.map((e) => (e.productId === productId ? { ...e, displayOrder: order } : e))
      );
    } catch (err: any) {
      notify(err.message || "Failed to update order", "error");
    }
  }

  // --- SUGGESTION ACTIONS ---
  async function handleUpdateSuggestionStatus(
    id: string,
    status: "NEW" | "CONVERTED" | "REJECTED"
  ) {
    try {
      await updateSuggestionStatus(token, id, status);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      notify(`Suggestion marked as ${status}`);
    } catch (err: any) {
      notify(err.message || "Failed to update suggestion", "error");
    }
  }

  async function handleDeleteSuggestion(id: string) {
    if (!confirm("Delete this suggestion permanently?")) return;
    try {
      await deleteSuggestion(token, id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      notify("Suggestion deleted.");
    } catch (err: any) {
      notify(err.message || "Failed to delete suggestion", "error");
    }
  }

  function handleConvertSuggestion(sugg: ProductSuggestion) {
    openAddProductModal({
      name: sugg.name,
      url: sugg.url,
      note: sugg.note,
      suggestionId: sugg.id,
    });
  }

  // --- CONTENT ACTIONS ---
  async function handleSaveContent(section: keyof SiteContentMap) {
    if (!contentForm) return;
    try {
      await updateContent(token, section, contentForm[section]);
      notify(`"${section}" content updated successfully!`);
      const updated = await fetchAdminContent(token);
      setSiteContent(updated);
    } catch (err: any) {
      notify(err.message || "Failed to update content", "error");
    }
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchQ =
        !prodSearch ||
        p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(prodSearch.toLowerCase());
      const matchStatus = !prodStatusFilter || p.status === prodStatusFilter;
      const matchCat =
        !prodCatFilter ||
        p.category === prodCatFilter ||
        p.categorySlug === prodCatFilter;
      return matchQ && matchStatus && matchCat;
    });
  }, [products, prodSearch, prodStatusFilter, prodCatFilter]);

  // Filtered Best Items
  const filteredBestItems = useMemo(() => {
    return bestItems
      .filter((b) => {
        const matchCat = !selectedRankCat || b.categoryId === selectedRankCat;
        const matchRange = !selectedRankRange || b.priceRangeId === selectedRankRange;
        return matchCat && matchRange;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [bestItems, selectedRankCat, selectedRankRange]);

  // Filtered Suggestions
  const filteredSuggestions = useMemo(() => {
    if (suggestionFilter === "ALL") return suggestions;
    return suggestions.filter((s) => s.status === suggestionFilter);
  }, [suggestions, suggestionFilter]);

  // Options cards list
  const overviewCards = [
    {
      id: "products" as AdminTab,
      title: "Products",
      count: `${products.length} products`,
      desc: "Create, edit, archive products, set stores, and manage pricing.",
      badge: `${products.filter((p) => p.status === "ACTIVE").length} Active`,
    },
    {
      id: "deals" as AdminTab,
      title: "Discount deals",
      count: `${deals.length} deals`,
      desc: "Manage live discount prices, savings percentages, and expiry countdowns.",
      badge: `${deals.filter((d) => !d.expiresAt || new Date(d.expiresAt) > new Date()).length} Live`,
    },
    {
      id: "rankings" as AdminTab,
      title: "Best item rankings",
      count: `${bestItems.length} placements`,
      desc: "Curate shortlisted product rankings by category and budget price range.",
      badge: "Curated",
    },
    {
      id: "explore" as AdminTab,
      title: "Explore visibility",
      count: `${exploreItems.filter((e) => e.isVisible).length} visible`,
      desc: "Control which products appear in the public Explore catalog and reorder them.",
      badge: "Public Catalog",
    },
    {
      id: "suggestions" as AdminTab,
      title: "Visitor suggestions",
      count: `${suggestions.filter((s) => s.status === "NEW").length} pending`,
      desc: "Review submissions from visitors and convert approved ideas into active products.",
      badge: `${suggestions.length} Total`,
    },
    {
      id: "content" as AdminTab,
      title: "Landing content",
      count: "5 sections",
      desc: "Edit storefront hero copy, badges, value proposition, quote, and disclosures.",
      badge: "Live Copy",
    },
  ];

  return (
    <section className="section admin">
      {/* Toast Notification */}
      {toast && (
        <div className={`adminToast ${toast.type === "error" ? "toastError" : "toastSuccess"}`}>
          {toast.message}
        </div>
      )}

      {/* Admin Top Header */}
      <div className="adminHeading">
        <div>
          <p className="eyebrow">ADMIN WORKSPACE</p>
          <h1>Welcome back.</h1>
          <p className="adminUserMeta">Signed in as <strong>{email}</strong></p>
        </div>
        <div className="adminTopActions">
          <Link className="button buttonOutline" href="/explore" target="_blank">
            View storefront ↗
          </Link>
          <button className="plainButton signoutBtn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Navigation Module Tabs */}
      <nav className="adminTabs" aria-label="Admin Modules">
        <button
          className={`adminTab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          ✦ Overview
        </button>
        <button
          className={`adminTab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          📦 Products ({products.length})
        </button>
        <button
          className={`adminTab ${activeTab === "deals" ? "active" : ""}`}
          onClick={() => setActiveTab("deals")}
        >
          🏷️ Deals ({deals.length})
        </button>
        <button
          className={`adminTab ${activeTab === "rankings" ? "active" : ""}`}
          onClick={() => setActiveTab("rankings")}
        >
          🏆 Best Items ({bestItems.length})
        </button>
        <button
          className={`adminTab ${activeTab === "explore" ? "active" : ""}`}
          onClick={() => setActiveTab("explore")}
        >
          👁️ Explore Visibility
        </button>
        <button
          className={`adminTab ${activeTab === "suggestions" ? "active" : ""}`}
          onClick={() => setActiveTab("suggestions")}
        >
          💡 Suggestions ({suggestions.filter((s) => s.status === "NEW").length})
        </button>
        <button
          className={`adminTab ${activeTab === "content" ? "active" : ""}`}
          onClick={() => setActiveTab("content")}
        >
          ✏️ Landing Content
        </button>
      </nav>

      {loading && <p className="adminLoading">Loading catalogue data…</p>}

      {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
      {!loading && activeTab === "overview" && (
        <div>
          <div className="adminGrid">
            {overviewCards.map((card) => (
              <article
                className="adminOption clickableOption"
                key={card.id}
                onClick={() => setActiveTab(card.id)}
              >
                <div className="adminOptionHead">
                  <span className="adminBadge">{card.badge}</span>
                  <span className="adminCount">{card.count}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <button
                  className="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(card.id);
                  }}
                >
                  Open {card.title} →
                </button>
              </article>
            ))}
          </div>

          <div className="quickActionsBar">
            <h3>Quick Actions</h3>
            <div className="quickActionButtons">
              <button className="button" onClick={() => openAddProductModal()}>
                + Add New Product
              </button>
              <button className="button buttonOutline" onClick={exportCSV}>
                Download Catalog CSV
              </button>
              <button
                className="button buttonOutline"
                onClick={() => setActiveTab("suggestions")}
              >
                Review Suggestions ({suggestions.filter((s) => s.status === "NEW").length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: PRODUCTS MODULE --- */}
      {!loading && activeTab === "products" && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Products Management</h2>
              <p>Create, update, archive, and manage outward URLs and stores.</p>
            </div>
            <div className="moduleActions">
              <label className="button buttonOutline fileButton">
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  style={{ display: "none" }}
                />
              </label>
              <button className="button buttonOutline" onClick={exportCSV}>
                Export CSV
              </button>
              <button className="button" onClick={() => openAddProductModal()}>
                + Add Product
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="adminToolbar">
            <input
              type="text"
              placeholder="Search by name or slug…"
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
              className="searchInput"
            />
            <select
              value={prodStatusFilter}
              onChange={(e) => setProdStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <select
              value={prodCatFilter}
              onChange={(e) => setProdCatFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Products Table */}
          <div className="tableWrapper">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Store</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="productCell">
                        <div className="thumbBox">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} />
                          ) : (
                            <span>✦</span>
                          )}
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                          <small className="cellSlug">/{p.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>{p.store}</td>
                    <td>
                      <strong>₹{Number(p.currentPrice).toLocaleString("en-IN")}</strong>
                      {p.originalPrice && (
                        <del className="cellOldPrice">
                          ₹{Number(p.originalPrice).toLocaleString("en-IN")}
                        </del>
                      )}
                    </td>
                    <td>
                      {p.discountPercent ? (
                        <span className="savingBadge">Save {p.discountPercent}%</span>
                      ) : (
                        <span className="cellMuted">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`statusPill status-${(p.status || "ACTIVE").toLowerCase()}`}
                      >
                        {p.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className="actionGroup">
                        <button
                          className="tableActionBtn"
                          onClick={() => openEditProductModal(p)}
                          title="Edit Product"
                        >
                          Edit
                        </button>
                        <button
                          className="tableActionBtn"
                          onClick={() => handleToggleStatus(p)}
                          title="Toggle Active/Draft"
                        >
                          {p.status === "ACTIVE" ? "Draft" : "Activate"}
                        </button>
                        <button
                          className="tableActionBtn textDanger"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="noDataCell">
                      No products match your search/filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: DISCOUNT DEALS MODULE --- */}
      {!loading && activeTab === "deals" && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Discount Deals</h2>
              <p>
                Products with active price cuts. Deals display savings badges, original prices, and
                time-sensitive countdowns.
              </p>
            </div>
            <button
              className="button"
              onClick={() => {
                if (products.length > 0) openEditDealModal(products[0]);
              }}
            >
              + Create / Apply Deal
            </button>
          </div>

          <div className="tableWrapper">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Current Price</th>
                  <th>Original Price</th>
                  <th>Savings</th>
                  <th>Deal Expiry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => {
                  const isExpired = d.expiresAt && new Date(d.expiresAt) < new Date();
                  return (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        <small className="cellSlug">/{d.slug}</small>
                      </td>
                      <td>{d.store}</td>
                      <td>
                        <strong className="textSuccess">
                          ₹{Number(d.currentPrice).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td>
                        <del className="cellOldPrice">
                          ₹{Number(d.originalPrice).toLocaleString("en-IN")}
                        </del>
                      </td>
                      <td>
                        <span className="savingBadge">Save {d.discountPercent}%</span>
                      </td>
                      <td>
                        {d.expiresAt ? (
                          <div>
                            <span className={isExpired ? "textDanger" : "textMuted"}>
                              {new Date(d.expiresAt).toLocaleDateString()}
                            </span>
                            {isExpired && <span className="statusPill status-draft">Expired</span>}
                          </div>
                        ) : (
                          <span className="cellMuted">No expiry (Ongoing)</span>
                        )}
                      </td>
                      <td>
                        <div className="actionGroup">
                          <button
                            className="tableActionBtn"
                            onClick={() => openEditDealModal(d)}
                          >
                            Edit Deal
                          </button>
                          <button
                            className="tableActionBtn textDanger"
                            onClick={() => handleRemoveDeal(d.id)}
                          >
                            End Deal
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="noDataCell">
                      No active discount deals currently set. Click &ldquo;+ Create / Apply Deal&rdquo;
                      to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: BEST ITEM RANKINGS MODULE --- */}
      {!loading && activeTab === "rankings" && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Best Item Rankings</h2>
              <p>
                Curated product shortlists organized by Category and Price Range. Control rank order
                #01, #02, #03…
              </p>
            </div>
            <div className="moduleActions">
              <button
                className="button buttonOutline"
                onClick={() => setPriceRangeModalOpen(true)}
              >
                + New Price Range
              </button>
              <button className="button" onClick={() => setBestItemModalOpen(true)}>
                + Add Product to Shortlist
              </button>
            </div>
          </div>

          {/* Select Category & Price Range Filter */}
          <div className="adminToolbar">
            <label className="toolbarLabel">
              Category:
              <select
                value={selectedRankCat}
                onChange={(e) => setSelectedRankCat(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="toolbarLabel">
              Price Range:
              <select
                value={selectedRankRange}
                onChange={(e) => setSelectedRankRange(e.target.value)}
              >
                <option value="">All Price Ranges</option>
                {priceRanges.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tableWrapper">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>Price Range</th>
                  <th>Store & Price</th>
                  <th>Reorder</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBestItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>
                      <span className="rankBadge">#{String(item.rank).padStart(2, "0")}</span>
                    </td>
                    <td>
                      <div className="productCell">
                        <div className="thumbBox">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} />
                          ) : (
                            <span>✦</span>
                          )}
                        </div>
                        <div>
                          <strong>{item.productName}</strong>
                          <small className="cellSlug">/{item.productSlug}</small>
                        </div>
                      </div>
                    </td>
                    <td>{item.priceRangeLabel}</td>
                    <td>
                      <span>{item.store}</span> ·{" "}
                      <strong>₹{Number(item.currentPrice).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>
                      <div className="actionGroup">
                        <button
                          className="tableActionBtn"
                          disabled={idx === 0}
                          onClick={() => handleMoveRank(item, "up")}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          className="tableActionBtn"
                          disabled={idx === filteredBestItems.length - 1}
                          onClick={() => handleMoveRank(item, "down")}
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="tableActionBtn textDanger"
                        onClick={() => handleDeleteBestItem(item.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBestItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="noDataCell">
                      No products ranked for this Category and Price Range yet. Click &ldquo;+ Add Product to Shortlist&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: EXPLORE VISIBILITY MODULE --- */}
      {!loading && activeTab === "explore" && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Explore Visibility</h2>
              <p>
                Configure which products appear in the public Explore catalog and set custom display
                ordering.
              </p>
            </div>
          </div>

          <div className="tableWrapper">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Store</th>
                  <th>Visibility</th>
                  <th>Display Order</th>
                </tr>
              </thead>
              <tbody>
                {exploreItems.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <strong>{item.name}</strong>
                      <small className="cellSlug">/{item.slug}</small>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.store}</td>
                    <td>
                      <button
                        className={`toggleBtn ${item.isVisible ? "toggleOn" : "toggleOff"}`}
                        onClick={() => handleToggleExploreVisibility(item)}
                      >
                        {item.isVisible ? "✓ Visible in Explore" : "✕ Hidden"}
                      </button>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="orderInput"
                        defaultValue={item.displayOrder}
                        onBlur={(e) =>
                          handleUpdateExploreOrder(item.productId, parseInt(e.target.value) || 0)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 6: VISITOR SUGGESTIONS MODULE --- */}
      {!loading && activeTab === "suggestions" && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Visitor Suggestions</h2>
              <p>
                Product ideas submitted by visitors from the public &ldquo;Suggest a find&rdquo; form.
                Convert approved finds directly into products!
              </p>
            </div>
            <div className="filterPills">
              {["ALL", "NEW", "CONVERTED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  className={`pillBtn ${suggestionFilter === st ? "activePill" : ""}`}
                  onClick={() => setSuggestionFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="suggestionsGrid">
            {filteredSuggestions.map((sugg) => (
              <article className="suggestionCard" key={sugg.id}>
                <div className="suggHeader">
                  <span className={`statusPill status-${sugg.status.toLowerCase()}`}>
                    {sugg.status}
                  </span>
                  <small className="cellMuted">
                    {new Date(sugg.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <h3>{sugg.name}</h3>
                {sugg.url && (
                  <a
                    href={sugg.url}
                    target="_blank"
                    rel="noreferrer"
                    className="suggLink"
                  >
                    {sugg.url} ↗
                  </a>
                )}
                {sugg.note && <p className="suggNote">&ldquo;{sugg.note}&rdquo;</p>}
                {sugg.contact && (
                  <p className="suggContact">Submitted by: {sugg.contact}</p>
                )}
                <div className="suggActions">
                  {sugg.status !== "CONVERTED" && (
                    <button
                      className="button buttonSmall"
                      onClick={() => handleConvertSuggestion(sugg)}
                    >
                      Convert to Product →
                    </button>
                  )}
                  {sugg.status !== "REJECTED" && (
                    <button
                      className="tableActionBtn"
                      onClick={() => handleUpdateSuggestionStatus(sugg.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    className="tableActionBtn textDanger"
                    onClick={() => handleDeleteSuggestion(sugg.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {filteredSuggestions.length === 0 && (
              <p className="cellMuted">No suggestions in this view.</p>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 7: LANDING CONTENT MODULE --- */}
      {!loading && activeTab === "content" && contentForm && (
        <div className="adminModule">
          <div className="moduleHeader">
            <div>
              <h2>Landing &amp; Storefront Content</h2>
              <p>
                Customize headlines, branding, value proposition, and affiliate leaving-site
                disclosure. Changes save directly to the database.
              </p>
            </div>
          </div>

          <div className="contentGrid">
            {/* Hero Section Card */}
            <article className="contentSectionCard">
              <h3>Hero Section</h3>
              <label>
                Title
                <input
                  type="text"
                  value={contentForm.hero.title}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      hero: { ...contentForm.hero, title: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Subtitle
                <textarea
                  value={contentForm.hero.subtitle}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      hero: { ...contentForm.hero, subtitle: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Announcement Badge
                <input
                  type="text"
                  value={contentForm.hero.badge}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      hero: { ...contentForm.hero, badge: e.target.value },
                    })
                  }
                />
              </label>
              <button
                className="button buttonSmall"
                onClick={() => handleSaveContent("hero")}
              >
                Save Hero Copy
              </button>
            </article>

            {/* Quote / Value Proposition Card */}
            <article className="contentSectionCard">
              <h3>Quote &amp; Value Proposition</h3>
              <label>
                Quote Headline
                <input
                  type="text"
                  value={contentForm.quote.quote}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      quote: { ...contentForm.quote, quote: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Author / Sub-text
                <input
                  type="text"
                  value={contentForm.quote.author}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      quote: { ...contentForm.quote, author: e.target.value },
                    })
                  }
                />
              </label>
              <button
                className="button buttonSmall"
                onClick={() => handleSaveContent("quote")}
              >
                Save Quote Copy
              </button>
            </article>

            {/* About Us Card */}
            <article className="contentSectionCard">
              <h3>About Us Copy</h3>
              <label>
                About Headline
                <input
                  type="text"
                  value={contentForm.about.headline}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      about: { ...contentForm.about, headline: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                About Paragraph
                <textarea
                  value={contentForm.about.body}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      about: { ...contentForm.about, body: e.target.value },
                    })
                  }
                />
              </label>
              <button
                className="button buttonSmall"
                onClick={() => handleSaveContent("about")}
              >
                Save About Copy
              </button>
            </article>

            {/* Disclosure Notice Card */}
            <article className="contentSectionCard">
              <h3>Outbound Leaving Notice (Disclosure)</h3>
              <label>
                Modal Title
                <input
                  type="text"
                  value={contentForm.disclosure.title}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      disclosure: { ...contentForm.disclosure, title: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Disclosure Explanation
                <textarea
                  value={contentForm.disclosure.text}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      disclosure: { ...contentForm.disclosure, text: e.target.value },
                    })
                  }
                />
              </label>
              <button
                className="button buttonSmall"
                onClick={() => handleSaveContent("disclosure")}
              >
                Save Disclosure Copy
              </button>
            </article>
          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT PRODUCT --- */}
      {productModalOpen && (
        <div className="adminModalOverlay" onClick={() => setProductModalOpen(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              <button
                className="plainButton"
                onClick={() => setProductModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="adminForm">
              <div className="formRow">
                <label>
                  Product Name *
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingProduct) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "")
                        );
                      }
                    }}
                  />
                </label>
                <label>
                  URL Slug *
                  <input
                    type="text"
                    required
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Description *
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </label>

              <div className="formRow">
                <label>
                  Store *
                  <select
                    value={formStore}
                    onChange={(e) => setFormStore(e.target.value)}
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                    <option value="amazon">Amazon</option>
                    <option value="flipkart">Flipkart</option>
                    <option value="nykaa">Nykaa</option>
                    <option value="myntra">Myntra</option>
                  </select>
                </label>
                <label>
                  Category *
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                    <option value="electronics">Electronics</option>
                    <option value="beauty">Beauty</option>
                    <option value="fashion">Fashion</option>
                    <option value="home-living">Home &amp; Living</option>
                    <option value="fitness">Fitness</option>
                  </select>
                </label>
              </div>

              <div className="formRow">
                <label>
                  Current Price (₹) *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formCurrentPrice}
                    onChange={(e) => setFormCurrentPrice(e.target.value)}
                  />
                </label>
                <label>
                  Original Price (₹) (Optional Deal)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="Must exceed current price"
                  />
                </label>
              </div>

              <label>
                Outbound Store URL (HTTPS) *
                <input
                  type="url"
                  required
                  placeholder="https://www.amazon.in/dp/..."
                  value={formOutboundUrl}
                  onChange={(e) => setFormOutboundUrl(e.target.value)}
                />
              </label>

              <div className="formRow">
                <label>
                  Image URL
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
              </div>

              <label>
                Deal Expiry Date/Time (Optional)
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </label>

              <div className="modalFooter">
                <button
                  type="button"
                  className="plainButton"
                  onClick={() => setProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT DEAL --- */}
      {dealModalOpen && (
        <div className="adminModalOverlay" onClick={() => setDealModalOpen(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h2>Set Discount Deal</h2>
              <button className="plainButton" onClick={() => setDealModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDeal} className="adminForm">
              <label>
                Select Product
                <select
                  value={dealProductId}
                  onChange={(e) => {
                    setDealProductId(e.target.value);
                    const sel = products.find((p) => p.id === e.target.value);
                    if (sel) {
                      setDealCurrentPrice(sel.currentPrice);
                      setDealOriginalPrice(
                        sel.originalPrice || (parseFloat(sel.currentPrice) * 1.5).toFixed(0)
                      );
                    }
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.store}) — ₹{p.currentPrice}
                    </option>
                  ))}
                </select>
              </label>

              <div className="formRow">
                <label>
                  Current Deal Price (₹) *
                  <input
                    type="number"
                    required
                    value={dealCurrentPrice}
                    onChange={(e) => setDealCurrentPrice(e.target.value)}
                  />
                </label>
                <label>
                  Original Price (₹) *
                  <input
                    type="number"
                    required
                    value={dealOriginalPrice}
                    onChange={(e) => setDealOriginalPrice(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Deal Expiry (Date &amp; Time)
                <input
                  type="datetime-local"
                  value={dealExpiresAt}
                  onChange={(e) => setDealExpiresAt(e.target.value)}
                />
              </label>

              <div className="modalFooter">
                <button
                  type="button"
                  className="plainButton"
                  onClick={() => setDealModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD BEST ITEM PLACEMENT --- */}
      {bestItemModalOpen && (
        <div className="adminModalOverlay" onClick={() => setBestItemModalOpen(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h2>Add Product to Shortlist</h2>
              <button
                className="plainButton"
                onClick={() => setBestItemModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBestItemPlacement} className="adminForm">
              <label>
                Product to Rank
                <select
                  value={placeProductId}
                  onChange={(e) => setPlaceProductId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category} · {p.store}) — ₹{p.currentPrice}
                      </option>
                    ))}
                </select>
              </label>

              <div className="formRow">
                <label>
                  Category
                  <select
                    value={selectedRankCat}
                    onChange={(e) => setSelectedRankCat(e.target.value)}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Price Range
                  <select
                    value={selectedRankRange}
                    onChange={(e) => setSelectedRankRange(e.target.value)}
                  >
                    <option value="">All Price Ranges</option>
                    {priceRanges.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Rank Slot (Position)
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={placeRank}
                  onChange={(e) => setPlaceRank(parseInt(e.target.value) || 1)}
                />
              </label>

              <div className="modalFooter">
                <button
                  type="button"
                  className="plainButton"
                  onClick={() => setBestItemModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Add to Shortlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: NEW PRICE RANGE --- */}
      {priceRangeModalOpen && (
        <div className="adminModalOverlay" onClick={() => setPriceRangeModalOpen(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h2>Add New Price Range</h2>
              <button
                className="plainButton"
                onClick={() => setPriceRangeModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePriceRange} className="adminForm">
              <label>
                Label (e.g. &ldquo;Under ₹500&rdquo;, &ldquo;Under ₹5,000&rdquo;) *
                <input
                  type="text"
                  required
                  value={newRangeLabel}
                  onChange={(e) => setNewRangeLabel(e.target.value)}
                />
              </label>
              <div className="formRow">
                <label>
                  Min Price (₹) *
                  <input
                    type="number"
                    min="0"
                    required
                    value={newRangeMin}
                    onChange={(e) => setNewRangeMin(e.target.value)}
                  />
                </label>
                <label>
                  Max Price (₹) (Optional)
                  <input
                    type="number"
                    min="0"
                    value={newRangeMax}
                    onChange={(e) => setNewRangeMax(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Display Order
                <input
                  type="number"
                  value={newRangeOrder}
                  onChange={(e) => setNewRangeOrder(parseInt(e.target.value) || 1)}
                />
              </label>
              <div className="modalFooter">
                <button
                  type="button"
                  className="plainButton"
                  onClick={() => setPriceRangeModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Save Price Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
