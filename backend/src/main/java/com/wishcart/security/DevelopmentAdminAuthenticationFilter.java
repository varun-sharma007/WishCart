package com.wishcart.security;

import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Bootstrap administrator authentication filter for local and dev environments. */
@Component
public class DevelopmentAdminAuthenticationFilter extends OncePerRequestFilter {
  private final String token;

  public DevelopmentAdminAuthenticationFilter(@Value("${wishcart.development-admin.token:}") String token) {
    this.token = token;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String submitted = request.getHeader("X-Admin-Token");
    if (submitted == null || submitted.isBlank()) {
      String auth = request.getHeader("Authorization");
      if (auth != null && auth.startsWith("Bearer ")) {
        submitted = auth.substring(7).trim();
      } else if (auth != null && !auth.isBlank()) {
        submitted = auth.trim();
      }
    }
    if (!token.isBlank() && token.equals(submitted)) {
      var authentication = new UsernamePasswordAuthenticationToken(
          "development-admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
      SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    chain.doFilter(request, response);
  }
}
