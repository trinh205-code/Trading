package com.slayer.binacet.config;


import com.slayer.binacet.repository.UserRepository;
import com.slayer.binacet.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;


import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;


    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/")
                || path.startsWith("/ws");
    }



    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            final String authHeader = request.getHeader("Authorization");
            final String jwt;
            final String userId;

           if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

            jwt = authHeader.substring(7);

            if (!jwtService.isTokenFormatValid(jwt)) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Token không đúng định dạng");
                return;
            }

            if (!jwtService.isSignatureValid(jwt)) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Chữ kí không hợp lệ");
                return;
            }

            if (!jwtService.isIssuerToken(jwt)) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Nguồn token không hợp lệ");
                return;
            }

            if (jwtService.isTokenExpired(jwt)) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Token hết hạn");
                return;
            }

            if (jwtService.isBlacklistedToken(jwt)) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Token bị khóa");
                return;
            }

            userId = jwtService.getUserIdFromJwt(jwt);
            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy user từ token"));
                final String emailFromToken = jwtService.getEmailFromJwt(jwt);

                if (!emailFromToken.equals(userDetails.getUsername())) {
                    sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                            "Xác thực không thành công", "User Token không chính xác");
                    return;
                }

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

            filterChain.doFilter(request, response);

        } catch (Exception e) {
            logger.error("Error in JWT filter: ", e);
            if (!response.isCommitted()) {
                sendErrorResponse(response, request, HttpServletResponse.SC_UNAUTHORIZED,
                        "Xác thực không thành công", "Lỗi xác thực: " + e.getMessage());
            }
        }
    }

    private void sendErrorResponse(
                                    HttpServletResponse response,
                                    HttpServletRequest request,
                                    int statusCode,
                                    String error,
                                    String message
    ) throws IOException {
        response.setStatus(statusCode);
        response.setContentType("application/json;charset=UTF-8");

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", System.currentTimeMillis());
        errorResponse.put("status", statusCode);
        errorResponse.put("error", error);
        errorResponse.put("message", message);
        errorResponse.put("path", request.getRequestURI());

        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}

