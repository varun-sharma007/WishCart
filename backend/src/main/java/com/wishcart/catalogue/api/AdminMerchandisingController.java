package com.wishcart.catalogue.api;

import com.wishcart.common.ApiResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminMerchandisingController {
  private final JdbcClient jdbc;

  public AdminMerchandisingController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  // --- DISCOUNT DEALS ---
  @GetMapping("/deals")
  public ApiResponse<List<Map<String, Object>>> listDeals() {
    String sql = """
        select p.id::text as id,
               p.name,
               p.slug,
               s.name as store,
               coalesce(c.name, 'Uncategorized') as category,
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               round((1 - p.current_price / p.original_price) * 100)::int as "discountPercent",
               p.expires_at as "expiresAt",
               p.status,
               case when p.expires_at is not null and p.expires_at < now() then true else false end as "isExpired"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        where p.original_price is not null and p.original_price > p.current_price
        order by p.created_at desc
        """;
    return ApiResponse.of(jdbc.sql(sql).query().listOfRows());
  }

  @PutMapping("/deals/{productId}")
  @Transactional
  public ApiResponse<Map<String, Object>> updateDeal(
      @PathVariable UUID productId,
      @RequestBody DealRequest request) {
    if (request.originalPrice() != null && request.currentPrice() != null
        && request.originalPrice().compareTo(request.currentPrice()) <= 0) {
      throw new IllegalArgumentException("Original price must exceed current price.");
    }
    jdbc.sql("""
        update products
        set original_price = :original,
            current_price = coalesce(:current, current_price),
            expires_at = :expiresAt,
            version = version + 1
        where id = :id
        """)
        .param("id", productId)
        .param("original", request.originalPrice())
        .param("current", request.currentPrice())
        .param("expiresAt", request.expiresAt())
        .update();
    return ApiResponse.of(Map.of("productId", productId.toString(), "status", "UPDATED"));
  }

  @DeleteMapping("/deals/{productId}")
  @Transactional
  public ApiResponse<Map<String, Object>> removeDeal(@PathVariable UUID productId) {
    jdbc.sql("update products set original_price = null, expires_at = null, version = version + 1 where id = :id")
        .param("id", productId)
        .update();
    return ApiResponse.of(Map.of("productId", productId.toString(), "status", "REMOVED"));
  }

  // --- BEST ITEM PLACEMENTS ---
  @GetMapping("/best-items")
  public ApiResponse<List<Map<String, Object>>> listBestItems(
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) UUID priceRangeId) {
    StringBuilder sql = new StringBuilder("""
        select b.id::text as id,
               b.product_id::text as "productId",
               p.name as "productName",
               p.slug as "productSlug",
               p.image_url as "imageUrl",
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent",
               s.name as store,
               c.id::text as "categoryId",
               c.name as "categoryName",
               r.id::text as "priceRangeId",
               coalesce(r.label, 'All prices') as "priceRangeLabel",
               b.rank,
               b.version
        from best_item_placements b
        join products p on p.id = b.product_id
        join stores s on s.id = p.store_id
        join categories c on c.id = b.category_id
        left join price_ranges r on r.id = b.price_range_id
        where 1=1
        """);

    if (categoryId != null) sql.append(" and b.category_id = :catId");
    if (priceRangeId != null) sql.append(" and b.price_range_id = :rangeId");
    sql.append(" order by c.name, r.display_order, b.rank asc");

    var statement = jdbc.sql(sql.toString());
    if (categoryId != null) statement = statement.param("catId", categoryId);
    if (priceRangeId != null) statement = statement.param("rangeId", priceRangeId);

    return ApiResponse.of(statement.query().listOfRows());
  }

  @PostMapping("/best-items")
  @Transactional
  public ApiResponse<Map<String, Object>> addBestItem(@RequestBody BestItemRequest request) {
    UUID id = UUID.randomUUID();
    // remove any conflicting rank or product assignment
    jdbc.sql("delete from best_item_placements where category_id = :cat and (price_range_id = :range or (:range is null and price_range_id is null)) and (rank = :rank or product_id = :prod)")
        .param("cat", request.categoryId())
        .param("range", request.priceRangeId())
        .param("rank", request.rank())
        .param("prod", request.productId())
        .update();

    jdbc.sql("""
        insert into best_item_placements(id, product_id, category_id, price_range_id, rank, version)
        values(:id, :prod, :cat, :range, :rank, 0)
        """)
        .param("id", id)
        .param("prod", request.productId())
        .param("cat", request.categoryId())
        .param("range", request.priceRangeId())
        .param("rank", request.rank())
        .update();

    return ApiResponse.of(Map.of("id", id.toString(), "rank", request.rank()));
  }

  @PostMapping("/best-items/reorder")
  @Transactional
  public ApiResponse<Map<String, Object>> reorderBestItems(@RequestBody List<ReorderItem> items) {
    for (ReorderItem item : items) {
      jdbc.sql("update best_item_placements set rank = :rank, version = version + 1 where id = :id")
          .param("rank", item.rank())
          .param("id", item.id())
          .update();
    }
    return ApiResponse.of(Map.of("updated", items.size()));
  }

  @DeleteMapping("/best-items/{id}")
  @Transactional
  public ResponseEntity<Void> deleteBestItem(@PathVariable UUID id) {
    jdbc.sql("delete from best_item_placements where id = :id").param("id", id).update();
    return ResponseEntity.noContent().build();
  }

  // --- EXPLORE VISIBILITY ---
  @GetMapping("/explore")
  public ApiResponse<List<Map<String, Object>>> listExploreProducts() {
    String sql = """
        select p.id::text as "productId",
               p.name,
               p.slug,
               s.name as store,
               coalesce(c.name, 'Uncategorized') as category,
               p.current_price::text as "currentPrice",
               p.status,
               coalesce(ep.is_visible, true) as "isVisible",
               coalesce(ep.display_order, 0) as "displayOrder"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        left join explore_products ep on ep.product_id = p.id
        order by coalesce(ep.display_order, 0) asc, p.created_at desc
        """;
    return ApiResponse.of(jdbc.sql(sql).query().listOfRows());
  }

  @PatchMapping("/explore/{productId}")
  @Transactional
  public ApiResponse<Map<String, Object>> updateExploreProduct(
      @PathVariable UUID productId,
      @RequestBody ExploreUpdateRequest request) {
    jdbc.sql("""
        insert into explore_products(product_id, display_order, is_visible)
        values(:prod, :order, :visible)
        on conflict (product_id) do update
        set display_order = :order, is_visible = :visible
        """)
        .param("prod", productId)
        .param("order", request.displayOrder() != null ? request.displayOrder() : 0)
        .param("visible", request.isVisible() != null ? request.isVisible() : true)
        .update();

    return ApiResponse.of(Map.of("productId", productId.toString(), "status", "UPDATED"));
  }

  public record DealRequest(BigDecimal currentPrice, BigDecimal originalPrice, OffsetDateTime expiresAt) {}
  public record BestItemRequest(UUID productId, UUID categoryId, UUID priceRangeId, int rank) {}
  public record ReorderItem(UUID id, int rank) {}
  public record ExploreUpdateRequest(Boolean isVisible, Integer displayOrder) {}
}
