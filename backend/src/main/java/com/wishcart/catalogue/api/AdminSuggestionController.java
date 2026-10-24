package com.wishcart.catalogue.api;

import com.wishcart.common.ApiResponse;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/suggestions")
public class AdminSuggestionController {
  private final JdbcClient jdbc;

  public AdminSuggestionController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public ApiResponse<List<Map<String, Object>>> listSuggestions(
      @RequestParam(required = false) String status) {
    StringBuilder sql = new StringBuilder("""
        select id::text, name, url, note, contact, status, created_at as "createdAt"
        from product_suggestions
        where 1=1
        """);
    if (status != null && !status.isBlank()) {
      sql.append(" and status = :status");
    }
    sql.append(" order by created_at desc");

    var statement = jdbc.sql(sql.toString());
    if (status != null && !status.isBlank()) {
      statement = statement.param("status", status.trim().toUpperCase());
    }
    return ApiResponse.of(statement.query().listOfRows());
  }

  @PatchMapping("/{id}")
  @Transactional
  public ApiResponse<Map<String, Object>> updateStatus(
      @PathVariable UUID id,
      @RequestBody Map<String, String> body) {
    String newStatus = body.get("status");
    if (newStatus == null || !List.of("NEW", "CONVERTED", "REJECTED").contains(newStatus.toUpperCase())) {
      throw new IllegalArgumentException("Status must be NEW, CONVERTED, or REJECTED");
    }
    int updated = jdbc.sql("update product_suggestions set status = :status where id = :id")
        .param("status", newStatus.toUpperCase())
        .param("id", id)
        .update();
    if (updated == 0) {
      throw new NoSuchElementException("Suggestion not found.");
    }
    return ApiResponse.of(Map.of("id", id.toString(), "status", newStatus.toUpperCase()));
  }

  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> deleteSuggestion(@PathVariable UUID id) {
    jdbc.sql("delete from product_suggestions where id = :id").param("id", id).update();
    return ResponseEntity.noContent().build();
  }
}
