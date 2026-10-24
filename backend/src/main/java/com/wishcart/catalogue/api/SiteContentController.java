package com.wishcart.catalogue.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wishcart.common.ApiResponse;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SiteContentController {
  private final JdbcClient jdbc;
  private final ObjectMapper mapper;

  public SiteContentController(JdbcClient jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  @GetMapping("/public/content")
  public ApiResponse<Map<String, Object>> getPublicContent() {
    return ApiResponse.of(loadAllContent());
  }

  @GetMapping("/public/content/{key}")
  public ApiResponse<Map<String, Object>> getContentByKey(@PathVariable String key) {
    Map<String, Object> all = loadAllContent();
    return ApiResponse.of((Map<String, Object>) all.getOrDefault(key, defaultContentForKey(key)));
  }

  @GetMapping("/admin/content")
  public ApiResponse<Map<String, Object>> getAdminContent() {
    return ApiResponse.of(loadAllContent());
  }

  @PutMapping("/admin/content/{key}")
  @Transactional
  public ApiResponse<Map<String, Object>> updateContent(
      @PathVariable String key,
      @RequestBody Map<String, Object> body) {
    try {
      String json = mapper.writeValueAsString(body);
      jdbc.sql("""
          insert into site_content(content_key, content_json, version, updated_at)
          values(:key, :json::jsonb, 0, :now)
          on conflict (content_key) do update
          set content_json = :json::jsonb,
              version = site_content.version + 1,
              updated_at = :now
          """)
          .param("key", key)
          .param("json", json)
          .param("now", OffsetDateTime.now())
          .update();
      return ApiResponse.of(Map.of("key", key, "status", "SAVED"));
    } catch (Exception ex) {
      throw new RuntimeException("Failed to serialize content JSON", ex);
    }
  }

  private Map<String, Object> loadAllContent() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("hero", defaultContentForKey("hero"));
    result.put("quote", defaultContentForKey("quote"));
    result.put("about", defaultContentForKey("about"));
    result.put("branding", defaultContentForKey("branding"));
    result.put("disclosure", defaultContentForKey("disclosure"));

    var rows = jdbc.sql("select content_key, content_json from site_content").query().listOfRows();
    for (var row : rows) {
      String key = (String) row.get("content_key");
      Object json = row.get("content_json");
      if (json != null) {
        try {
          Map<String, Object> parsed = mapper.readValue(json.toString(), new TypeReference<Map<String, Object>>() {});
          result.put(key, parsed);
        } catch (Exception ignored) {
        }
      }
    }
    return result;
  }

  private Map<String, Object> defaultContentForKey(String key) {
    return switch (key) {
      case "hero" -> Map.of(
          "title", "Smart finds. Better buys.",
          "subtitle", "Wishcart is a curated discovery platform that helps people find products worth buying—then sends them to trusted stores to complete the purchase.",
          "badge", "FIND IT · LOVE IT · BUY IT",
          "tagline", "SMART FINDS · BETTER BUYS"
      );
      case "quote" -> Map.of(
          "quote", "Good finds. No endless scrolling.",
          "author", "Curated picks for the things you want right now."
      );
      case "about" -> Map.of(
          "headline", "Curated, not crowded.",
          "body", "Useful recommendations instead of overwhelming marketplaces. Time-sensitive deal discovery creates reason to return. Trusted retailers handle checkout, payment, and delivery."
      );
      case "branding" -> Map.of(
          "brandName", "WISHCART",
          "supportEmail", "curator@wishcart.com"
      );
      case "disclosure" -> Map.of(
          "title", "Leaving Wishcart",
          "text", "You are heading to the merchant to complete your purchase. Their checkout, pricing, privacy, and delivery policies apply."
      );
      default -> Collections.emptyMap();
    };
  }
}
