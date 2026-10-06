package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.ChangePasswordRequest;
import com.slayer.binacet.dto.request.ChangeTransferPinRequest;
import com.slayer.binacet.dto.request.UpdateUserRequest;
import com.slayer.binacet.dto.response.UserResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {

    UserResponse getMyProfile();
    UserResponse getUserById(String id);
    List<UserResponse> getAllUsers();
    UserResponse updateUser(String id, UpdateUserRequest request);
    void deleteUser(String id);
    void changePassword(ChangePasswordRequest request);
    void changeTransferPin(ChangeTransferPinRequest request);
    void createTransferPin(com.slayer.binacet.dto.request.CreateTransferPinRequest request);
    boolean hasTransferPin();
    void updateAvatar(MultipartFile file);


}
