package com.wishcart.catalogue.application;

import com.wishcart.common.ApiResponse;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ProductService {
  private final JdbcClient jdbc;
  private final Set<String> allowedHosts;

  public ProductService(
      JdbcClient jdbc,
      @org.springframework.beans.factory.annotation.Value("${wishcart.outbound-allowed-hosts}") String hosts) {
    this.jdbc = jdbc;
    this.allowedHosts = Arrays.stream(hosts.split(","))
        .map(String::trim)
        .collect(java.util.stream.Collectors.toUnmodifiableSet());
  }

  public List<Map<String, Object>> products(String query, String category, String store, Boolean onSale, int limit) {
    var sql = new StringBuilder("""
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.name as store,
               s.slug as "storeSlug",
               coalesce(c.name, 'Uncategorized') as category,
               coalesce(c.slug, '') as "categorySlug",
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               p.image_url as "imageUrl",
               p.expires_at as "expiresAt",
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        left join explore_products ep on ep.product_id = p.id
        where p.status = 'ACTIVE'
          and (p.expires_at is null or p.expires_at > now())
          and coalesce(ep.is_visible, true) = true
        """);

    if (!isBlank(query)) {
      sql.append(" and (lower(p.name) like lower('%'||:q||'%') or lower(p.description) like lower('%'||:q||'%'))");
    }
    if (!isBlank(category)) {
      sql.append(" and (c.slug = :category or c.name = :category)");
    }
    if (!isBlank(store)) {
      sql.append(" and (s.slug = :store or s.name = :store)");
    }
    if (Boolean.TRUE.equals(onSale)) {
      sql.append(" and p.original_price > p.current_price");
    }

    sql.append(" order by coalesce(ep.display_order, 0) asc, p.created_at desc limit :limit");

    var statement = jdbc.sql(sql.toString());
    if (!isBlank(query)) statement = statement.param("q", query.trim());
    if (!isBlank(category)) statement = statement.param("category", category.trim());
    if (!isBlank(store)) statement = statement.param("store", store.trim());

    return statement.param("limit", Math.min(Math.max(limit, 1), 100)).query().listOfRows();
  }

  public Optional<Map<String, Object>> product(String slug) {
    String sql = """
        select p.id::text as id,
               p.slug,
               p.name,
               p.description,
               s.name as store,
               s.slug as "storeSlug",
               coalesce(c.name, 'Uncategorized') as category,
               p.current_price::text as "currentPrice",
               p.original_price::text as "originalPrice",
               p.image_url as "imageUrl",
               p.expires_at as "expiresAt",
               case when p.original_price > p.current_price
                    then round((1 - p.current_price / p.original_price) * 100)::int
                    else null end as "discountPercent"
        from products p
        join stores s on s.id = p.store_id
        left join product_categories pc on pc.product_id = p.id
        left join categories c on c.id = pc.category_id
        where p.slug = :slug and p.status = 'ACTIVE'
        """;
    return jdbc.sql(sql).param("slug", slug).query().listOfRows().stream().findFirst();
  }

  public String outboundUrl(UUID id) {
    var row = jdbc.sql("select outbound_url from products where id = :id and status = 'ACTIVE' and (expires_at is null or expires_at > now())")
        .param("id", id)
        .query(String.class)
        .optional()
        .orElseThrow(() -> new NoSuchElementException("Product is not available."));

    URI uri = URI.create(row);
    if (!"https".equals(uri.getScheme())) {
      throw new IllegalStateException("Outbound URL must use HTTPS.");
    }
    jdbc.sql("insert into outbound_clicks(product_id, created_at) values (:id, :time)")
        .param("id", id)
        .param("time", OffsetDateTime.now())
        .update();
    return row;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
