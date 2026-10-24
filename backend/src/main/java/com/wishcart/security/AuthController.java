package com.wishcart.security;

import com.wishcart.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final String email; private final String password; private final String token;
  public AuthController(@Value("${wishcart.development-admin.email:}") String email, @Value("${wishcart.development-admin.password:}") String password, @Value("${wishcart.development-admin.token:}") String token) { this.email = email; this.password = password; this.token = token; }
  @PostMapping("/admin/login")
  ApiResponse<Map<String, String>> login(@Valid @RequestBody LoginRequest request) {
    if (!email.equals(request.email()) || !password.equals(request.password()) || token.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid administrator credentials.");
    return ApiResponse.of(Map.of("adminToken", token, "email", email));
  }
  public record LoginRequest(@NotBlank String email, @NotBlank String password) { }
}
