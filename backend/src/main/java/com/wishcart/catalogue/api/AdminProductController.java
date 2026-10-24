package com.wishcart.catalogue.api;

import com.wishcart.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminProductController {
  private final JdbcClient jdbc;

  public AdminProductController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/products")
  public ApiResponse<List<Map<String, Object>>> listProducts(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String category) {
    StringBuilder sql = new StringBuilder("""
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.id::text as "storeId",
               s.name as store,
               s.slug as "storeSlug",
               c.id::text as "categoryId",
               coalesce(c.name, 'Uncategorized') as category,
               coalesce(c.slug, '') as "categorySlug",
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent",
               p.image_url as "imageUrl",
               p.outbound_url as "outboundUrl",
               p.status,
               p.expires_at as "expiresAt",
               p.version,
               p.created_at as "createdAt"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        where 1=1
        """);

    if (q != null && !q.isBlank()) {
      sql.append(" and (lower(p.name) like lower('%'||:q||'%') or lower(p.slug) like lower('%'||:q||'%'))");
    }
    if (status != null && !status.isBlank()) {
      sql.append(" and p.status = :status");
    }
    if (category != null && !category.isBlank()) {
      sql.append(" and (c.slug = :category or c.name = :category)");
    }
    sql.append(" order by p.created_at desc");

    var statement = jdbc.sql(sql.toString());
    if (q != null && !q.isBlank()) statement = statement.param("q", q.trim());
    if (status != null && !status.isBlank()) statement = statement.param("status", status.trim().toUpperCase());
    if (category != null && !category.isBlank()) statement = statement.param("category", category.trim());

    return ApiResponse.of(statement.query().listOfRows());
  }

  @GetMapping("/products/{id}")
  public ResponseEntity<ApiResponse<Map<String, Object>>> getProduct(@PathVariable UUID id) {
    String sql = """
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.id::text as "storeId",
               s.name as store,
               s.slug as "storeSlug",
               c.id::text as "categoryId",
               coalesce(c.name, 'Uncategorized') as category,
               coalesce(c.slug, '') as "categorySlug",
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent",
               p.image_url as "imageUrl",
               p.outbound_url as "outboundUrl",
               p.status,
               p.expires_at as "expiresAt",
               p.version,
               p.created_at as "createdAt"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        where p.id = :id
        """;
    var rows = jdbc.sql(sql).param("id", id).query().listOfRows();
    if (rows.isEmpty()) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(ApiResponse.of(rows.getFirst()));
  }

  @PostMapping("/products")
  @Transactional
  public ResponseEntity<ApiResponse<Map<String, Object>>> create(@Valid @RequestBody ProductRequest request) {
    validateProduct(request);
    UUID id = UUID.randomUUID();

    ensureStoreExists(request.storeSlug());
    ensureCategoryExists(request.categorySlug());

    jdbc.sql("""
        insert into products(id, slug, name, description, store_id, outbound_url, current_price, original_price, image_url, status, expires_at, version, created_at)
        values(:id, :slug, :name, :description, (select id from stores where slug = :store limit 1), :url, :current, :original, :image, :status, :expiresAt, 0, now())
        """)
        .param("id", id)
        .param("slug", request.slug())
        .param("name", request.name())
        .param("description", request.description())
        .param("store", request.storeSlug())
        .param("url", request.outboundUrl())
        .param("current", request.currentPrice())
        .param("original", request.originalPrice())
        .param("image", request.imageUrl())
        .param("status", request.status())
        .param("expiresAt", request.expiresAt())
        .update();

    attachCategory(id, request.categorySlug());

    // ensure in explore_products
    jdbc.sql("insert into explore_products(product_id, display_order, is_visible) values(:id, 0, true) on conflict do nothing")
        .param("id", id)
        .update();

    return ResponseEntity.created(URI.create("/api/v1/admin/products/" + id))
        .body(ApiResponse.of(Map.of("id", id.toString(), "slug", request.slug())));
  }

  @PatchMapping("/products/{id}")
  @Transactional
  public ApiResponse<Map<String, Object>> update(
      @PathVariable UUID id,
      @Valid @RequestBody ProductRequest request,
      @RequestHeader(value = "If-Match", required = false) Integer version) {
    validateProduct(request);
    ensureStoreExists(request.storeSlug());
    ensureCategoryExists(request.categorySlug());

    String updateSql;
    if (version != null) {
      updateSql = """
          update products
          set slug = :slug,
              name = :name,
              description = :description,
              store_id = (select id from stores where slug = :store limit 1),
              outbound_url = :url,
              current_price = :current,
              original_price = :original,
              image_url = :image,
              status = :status,
              expires_at = :expiresAt,
              version = version + 1
          where id = :id and version = :version
          """;
    } else {
      updateSql = """
          update products
          set slug = :slug,
              name = :name,
              description = :description,
              store_id = (select id from stores where slug = :store limit 1),
              outbound_url = :url,
              current_price = :current,
              original_price = :original,
              image_url = :image,
              status = :status,
              expires_at = :expiresAt,
              version = version + 1
          where id = :id
          """;
    }

    var statement = jdbc.sql(updateSql)
        .param("id", id)
        .param("slug", request.slug())
        .param("name", request.name())
        .param("description", request.description())
        .param("store", request.storeSlug())
        .param("url", request.outboundUrl())
        .param("current", request.currentPrice())
        .param("original", request.originalPrice())
        .param("image", request.imageUrl())
        .param("status", request.status())
        .param("expiresAt", request.expiresAt());

    if (version != null) {
      statement = statement.param("version", version);
    }

    int changed = statement.update();
    if (changed == 0) {
      throw new ConcurrentModificationException("This product was updated elsewhere. Refresh and try again.");
    }

    attachCategory(id, request.categorySlug());

    int newVersion = jdbc.sql("select version from products where id = :id").param("id", id).query(Integer.class).single();
    return ApiResponse.of(Map.of("id", id.toString(), "version", newVersion));
  }

  @DeleteMapping("/products/{id}")
  @Transactional
  public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
    jdbc.sql("delete from best_item_placements where product_id = :id").param("id", id).update();
    jdbc.sql("delete from explore_products where product_id = :id").param("id", id).update();
    jdbc.sql("delete from product_categories where product_id = :id").param("id", id).update();
    jdbc.sql("delete from outbound_clicks where product_id = :id").param("id", id).update();
    int deleted = jdbc.sql("delete from products where id = :id").param("id", id).update();
    if (deleted == 0) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.noContent().build();
  }

  // --- Stores ---
  @GetMapping("/stores")
  public ApiResponse<List<Map<String, Object>>> listStores() {
    return ApiResponse.of(jdbc.sql("select id::text, name, slug, logo_url as \"logoUrl\", is_active as \"isActive\" from stores order by name asc").query().listOfRows());
  }

  @PostMapping("/stores")
  @Transactional
  public ApiResponse<Map<String, Object>> createStore(@RequestBody Map<String, String> body) {
    String name = body.get("name");
    String slug = body.getOrDefault("slug", toSlug(name));
    String logoUrl = body.get("logoUrl");
    UUID id = UUID.randomUUID();
    jdbc.sql("insert into stores(id, name, slug, logo_url, is_active) values(:id, :name, :slug, :logoUrl, true) on conflict (slug) do update set name=:name, logo_url=coalesce(:logoUrl, stores.logo_url)")
        .param("id", id).param("name", name).param("slug", slug).param("logoUrl", logoUrl).update();
    return ApiResponse.of(Map.of("id", id.toString(), "slug", slug, "name", name));
  }

  // --- Categories ---
  @GetMapping("/categories")
  public ApiResponse<List<Map<String, Object>>> listCategories() {
    return ApiResponse.of(jdbc.sql("select id::text, name, slug, display_order as \"displayOrder\", is_active as \"isActive\" from categories order by display_order asc, name asc").query().listOfRows());
  }

  @PostMapping("/categories")
  @Transactional
  public ApiResponse<Map<String, Object>> createCategory(@RequestBody Map<String, Object> body) {
    String name = (String) body.get("name");
    String slug = (String) body.getOrDefault("slug", toSlug(name));
    int displayOrder = body.containsKey("displayOrder") ? ((Number) body.get("displayOrder")).intValue() : 0;
    UUID id = UUID.randomUUID();
    jdbc.sql("insert into categories(id, name, slug, display_order, is_active) values(:id, :name, :slug, :displayOrder, true) on conflict (slug) do update set name=:name, display_order=:displayOrder")
        .param("id", id).param("name", name).param("slug", slug).param("displayOrder", displayOrder).update();
    return ApiResponse.of(Map.of("id", id.toString(), "slug", slug, "name", name));
  }

  // --- Price Ranges ---
  @GetMapping("/price-ranges")
  public ApiResponse<List<Map<String, Object>>> listPriceRanges() {
    return ApiResponse.of(jdbc.sql("select id::text, label, min_price::text as \"minPrice\", max_price::text as \"maxPrice\", display_order as \"displayOrder\" from price_ranges order by display_order asc, min_price asc").query().listOfRows());
  }

  @PostMapping("/price-ranges")
  @Transactional
  public ApiResponse<Map<String, Object>> createPriceRange(@RequestBody Map<String, Object> body) {
    String label = (String) body.get("label");
    BigDecimal minPrice = new BigDecimal(body.get("minPrice").toString());
    BigDecimal maxPrice = body.get("maxPrice") != null ? new BigDecimal(body.get("maxPrice").toString()) : null;
    int displayOrder = body.containsKey("displayOrder") ? ((Number) body.get("displayOrder")).intValue() : 0;
    UUID id = UUID.randomUUID();
    jdbc.sql("insert into price_ranges(id, label, min_price, max_price, display_order) values(:id, :label, :min, :max, :displayOrder)")
        .param("id", id).param("label", label).param("min", minPrice).param("max", maxPrice).param("displayOrder", displayOrder).update();
    return ApiResponse.of(Map.of("id", id.toString(), "label", label));
  }

  private void attachCategory(UUID productId, String categorySlug) {
    jdbc.sql("delete from product_categories where product_id = :id").param("id", productId).update();
    jdbc.sql("insert into product_categories(product_id, category_id) values(:id, (select id from categories where slug = :category limit 1))")
        .param("id", productId).param("category", categorySlug).update();
  }

  private void ensureStoreExists(String storeSlug) {
    var exists = jdbc.sql("select count(*) from stores where slug = :slug").param("slug", storeSlug).query(Integer.class).single() > 0;
    if (!exists) {
      String name = storeSlug.substring(0, 1).toUpperCase() + storeSlug.substring(1).replace('-', ' ');
      jdbc.sql("insert into stores(name, slug) values(:name, :slug)").param("name", name).param("slug", storeSlug).update();
    }
  }

  private void ensureCategoryExists(String categorySlug) {
    var exists = jdbc.sql("select count(*) from categories where slug = :slug").param("slug", categorySlug).query(Integer.class).single() > 0;
    if (!exists) {
      String name = categorySlug.substring(0, 1).toUpperCase() + categorySlug.substring(1).replace('-', ' ');
      jdbc.sql("insert into categories(name, slug, display_order) values(:name, :slug, 10)").param("name", name).param("slug", categorySlug).update();
    }
  }

  private void validateProduct(ProductRequest value) {
    if (value.originalPrice() != null && value.originalPrice().compareTo(value.currentPrice()) <= 0) {
      throw new IllegalArgumentException("Original price must exceed current price.");
    }
    if (value.outboundUrl() == null || !value.outboundUrl().startsWith("https://")) {
      throw new IllegalArgumentException("Outbound URL must use HTTPS.");
    }
  }

  private String toSlug(String text) {
    if (text == null) return "item";
    return text.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
  }

  public record ProductRequest(
      @NotBlank @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
      @NotBlank @Size(max = 160) String name,
      @NotBlank String description,
      @NotBlank String storeSlug,
      @NotBlank String categorySlug,
      @NotBlank @Pattern(regexp = "https://.+") String outboundUrl,
      @NotNull @DecimalMin("0") BigDecimal currentPrice,
      @DecimalMin("0") BigDecimal originalPrice,
      @Size(max = 2048) String imageUrl,
      @NotBlank @Pattern(regexp = "DRAFT|ACTIVE|ARCHIVED") String status,
      OffsetDateTime expiresAt) {}
}
