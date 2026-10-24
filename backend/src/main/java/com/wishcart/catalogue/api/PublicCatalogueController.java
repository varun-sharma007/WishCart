package com.wishcart.catalogue.api;

import com.wishcart.catalogue.application.ProductService;
import com.wishcart.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public")
public class PublicCatalogueController {
  private final ProductService products;
  private final JdbcClient jdbc;

  public PublicCatalogueController(ProductService products, JdbcClient jdbc) {
    this.products = products;
    this.jdbc = jdbc;
  }

  @GetMapping("/products")
  public ApiResponse<List<Map<String, Object>>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String store,
      @RequestParam(required = false) Boolean onSale,
      @RequestParam(defaultValue = "50") int limit) {
    return ApiResponse.of(products.products(q, category, store, onSale, limit));
  }

  @GetMapping("/products/{slug}")
  public ResponseEntity<ApiResponse<Map<String, Object>>> detail(@PathVariable String slug) {
    return products.product(slug)
        .map(value -> ResponseEntity.ok(ApiResponse.of(value)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @GetMapping("/deals")
  public ApiResponse<List<Map<String, Object>>> deals() {
    String sql = """
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.name as store,
               coalesce(c.name, 'Uncategorized') as category,
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               p.image_url as "imageUrl",
               p.expires_at as "expiresAt",
               round((1 - p.current_price / p.original_price) * 100)::int as "discountPercent"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        where p.status = 'ACTIVE'
          and p.original_price > p.current_price
          and (p.expires_at is null or p.expires_at > now())
        order by p.created_at desc
        limit 50
        """;
    return ApiResponse.of(jdbc.sql(sql).query().listOfRows());
  }

  @GetMapping("/best-items")
  public ApiResponse<List<Map<String, Object>>> best(
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String priceRange) {
    StringBuilder sql = new StringBuilder("""
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.name as store,
               c.name as category,
               c.slug as "categorySlug",
               r.id::text as "priceRangeId",
               coalesce(r.label, 'All prices') as "priceRangeLabel",
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               p.image_url as "imageUrl",
               p.expires_at as "expiresAt",
               b.rank,
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent"
        from best_item_placements b
        join products p on p.id = b.product_id
        join stores s on s.id = p.store_id
        join categories c on c.id = b.category_id
        left join price_ranges r on r.id = b.price_range_id
        where p.status = 'ACTIVE'
        """);

    if (category != null && !category.isBlank()) {
      sql.append(" and (c.slug = :category or c.name = :category)");
    }
    if (priceRange != null && !priceRange.isBlank()) {
      sql.append(" and (r.id::text = :range or r.label = :range)");
    }
    sql.append(" order by c.display_order, coalesce(r.display_order, 0), b.rank asc limit 50");

    var statement = jdbc.sql(sql.toString());
    if (category != null && !category.isBlank()) statement = statement.param("category", category.trim());
    if (priceRange != null && !priceRange.isBlank()) statement = statement.param("range", priceRange.trim());

    return ApiResponse.of(statement.query().listOfRows());
  }

  @GetMapping("/stores")
  public ApiResponse<List<Map<String, Object>>> stores() {
    return ApiResponse.of(jdbc.sql("select id::text, name, slug, logo_url as \"logoUrl\" from stores where is_active = true order by name asc").query().listOfRows());
  }

  @GetMapping("/categories")
  public ApiResponse<List<Map<String, Object>>> categories() {
    return ApiResponse.of(jdbc.sql("select id::text, name, slug, display_order as \"displayOrder\" from categories where is_active = true order by display_order asc, name asc").query().listOfRows());
  }

  @GetMapping("/price-ranges")
  public ApiResponse<List<Map<String, Object>>> priceRanges() {
    return ApiResponse.of(jdbc.sql("select id::text, label, min_price::text as \"minPrice\", max_price::text as \"maxPrice\", display_order as \"displayOrder\" from price_ranges order by display_order asc, min_price asc").query().listOfRows());
  }

  @PostMapping("/products/{id}/outbound-clicks")
  public ApiResponse<Map<String, String>> outbound(@PathVariable UUID id) {
    return ApiResponse.of(Map.of("redirectUrl", products.outboundUrl(id)));
  }

  @PostMapping("/product-suggestions")
  public ResponseEntity<ApiResponse<Map<String, String>>> suggest(@Valid @RequestBody SuggestionRequest input) {
    jdbc.sql("insert into product_suggestions(name, url, note, contact, status, created_at) values(:name, :url, :note, :contact, 'NEW', :created)")
        .param("name", input.name())
        .param("url", input.url())
        .param("note", input.note())
        .param("contact", input.contact())
        .param("created", OffsetDateTime.now())
        .update();
    return ResponseEntity.created(URI.create("/api/v1/public/product-suggestions"))
        .body(ApiResponse.of(Map.of("status", "NEW")));
  }

  public record SuggestionRequest(
      @NotBlank @Size(max = 160) String name,
      @Size(max = 2048) String url,
      @Size(max = 1000) String note,
      @Size(max = 320) String contact) {}
}
