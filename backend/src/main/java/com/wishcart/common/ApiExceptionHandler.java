package com.wishcart.common;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.ConcurrentModificationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice public class ApiExceptionHandler {
 @ExceptionHandler(NoSuchElementException.class) ResponseEntity<Map<String,Object>> notFound(NoSuchElementException ex) { return error(HttpStatus.NOT_FOUND,"PRODUCT_NOT_ACTIVE",ex.getMessage()); }
 @ExceptionHandler({IllegalArgumentException.class,IllegalStateException.class}) ResponseEntity<Map<String,Object>> invalid(RuntimeException ex) { return error(HttpStatus.UNPROCESSABLE_ENTITY,"VALIDATION_FAILED",ex.getMessage()); }
 @ExceptionHandler(ConcurrentModificationException.class) ResponseEntity<Map<String,Object>> conflict(ConcurrentModificationException ex) { return error(HttpStatus.CONFLICT,"VERSION_CONFLICT",ex.getMessage()); }
 private ResponseEntity<Map<String,Object>> error(HttpStatus status,String code,String message) { return ResponseEntity.status(status).body(Map.of("error",Map.of("code",code,"message",message,"fieldErrors",new Object[0]))); }
}
