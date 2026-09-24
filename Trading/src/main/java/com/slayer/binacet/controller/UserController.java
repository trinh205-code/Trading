package com.slayer.binacet.controller;


import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.request.ChangePasswordRequest;
import com.slayer.binacet.dto.request.CreateUserRequest;
import com.slayer.binacet.dto.request.UpdateUserRequest;
import com.slayer.binacet.dto.response.UserResponse;
import com.slayer.binacet.service.UserService;
import com.slayer.binacet.service.impl.UserServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserServiceImpl userService;

    @GetMapping("/me")
    public ResponseEntity<Object> getMyProfile() {
        UserResponse response = userService.getMyProfile();
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin cá nhân thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getUserById(@PathVariable String id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin user thành công"));
    }

    @GetMapping
    public ResponseEntity<Object> getAllUsers() {
        List<UserResponse> response = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin tất cả người dùng thành công"));
    }



    @PutMapping("/{id}")
    public ResponseEntity<Object> updateUser(@PathVariable String id, @RequestBody @Valid UpdateUserRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành công"));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Object> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        userService.changePassword(request);
        return ResponseEntity.ok(ApiResponse.success("đổi mật khẩu thành công"));
    }





}
