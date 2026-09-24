package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.request.CreateUserRequest;
import com.slayer.binacet.dto.response.UserResponse;
import com.slayer.binacet.entity.User;
import org.mapstruct.Mapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    User toEntity(CreateUserRequest request);

    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);
}