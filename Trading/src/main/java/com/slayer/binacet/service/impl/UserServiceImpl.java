package com.slayer.binacet.service.impl;

import com.slayer.binacet.dto.request.ChangePasswordRequest;
import com.slayer.binacet.dto.request.UpdateUserRequest;
import com.slayer.binacet.dto.response.UserResponse;
import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import com.slayer.binacet.exception.UserNotFoundException;
import com.slayer.binacet.mapper.UserMapper;
import com.slayer.binacet.repository.FuturesWalletRepository;
import com.slayer.binacet.repository.UserRepository;
import com.slayer.binacet.repository.WalletBalanceRepository;
import com.slayer.binacet.service.UserService;
import com.sun.jdi.request.DuplicateRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;



    @Override
    public UserResponse getMyProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new RuntimeException("Unauthorized: No logged in user found");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof User) {
            User currentUser = (User) principal;

            return userMapper.toResponse(currentUser);
        }

        throw new RuntimeException("Lỗi hệ thống: Dữ liệu xác thực không hợp lệ");
    }


    @Override
    public UserResponse getUserById(String id) {
        User currentUser = userRepository.findById(id).orElseThrow(
                () -> new UserNotFoundException("User not found: " + id)
        );

        return userMapper.toResponse(currentUser);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }


    @Override
    public UserResponse updateUser(String id, UpdateUserRequest request) {

        User currentUser = userRepository.findById(id).orElseThrow(
                () -> new UserNotFoundException("User not found: " + id)
        );

        if (request.getEmail() != null) {
            currentUser.setEmail(request.getEmail());
        }
        if (request.getPhoneNumber() != null) {
            currentUser.setPhoneNumber(request.getPhoneNumber());
        }
         currentUser.setFullName(request.getFullName());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            currentUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }


        return userMapper.toResponse(userRepository.save(currentUser));
    }

    @Override
    public void deleteUser(String id) {
        User currentUser = userRepository.findById(id).orElseThrow(
                () -> new UserNotFoundException("User not found: " + id)
        );

        userRepository.delete(currentUser);
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User loggedInUser = (User) authentication.getPrincipal();

        User currentUser = userRepository.findById(loggedInUser.getId()).orElseThrow(
                () -> new UserNotFoundException("User not found: " + loggedInUser.getId())
        );

        if(!passwordEncoder.matches(request.getOldPassword(), currentUser.getPassword())) {
            throw new BadCredentialsException("Mật khẩu cũ không chính xác");
        }


        if(passwordEncoder.matches(request.getNewPassword(), currentUser.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        if(!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }

        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);
    }

    @Override
    public void updateAvatar(MultipartFile file) {

    }



}
