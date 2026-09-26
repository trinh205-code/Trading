package com.slayer.binacet.controller;


import com.slayer.binacet.dto.request.RegisterRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.request.LoginRequest;
import com.slayer.binacet.dto.request.RefreshTokenRequest;
import com.slayer.binacet.dto.response.AuthResponse;
import com.slayer.binacet.dto.response.TokenRefreshResponse;
import com.slayer.binacet.dto.response.UserResponse;
import com.slayer.binacet.service.AuthService;
import com.slayer.binacet.service.impl.UserServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserServiceImpl userService;



    @PostMapping("/login")
    public ResponseEntity<Object> login(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse authResponse = authService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success(authResponse,"Đăng nhập thành công"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logOut(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    @PostMapping
    public ResponseEntity<Object> createUser(@RequestBody @Valid RegisterRequest request) {
        UserResponse response = authService.register(request);
        return  ResponseEntity.ok(ApiResponse.success(response, "Tạo người dùng mới thành công"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
       TokenRefreshResponse response = authService.refreshToken(request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }


}
