package com.slayer.binacet.security.oauth2;

import com.slayer.binacet.Enums.AuthProvider;
import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.repository.UserRepository;
import com.slayer.binacet.security.oauth2.user.GoogleOAuth2UserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest oAuth2UserRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(oAuth2UserRequest);

        try {
            return processOAuth2User(oAuth2UserRequest, oAuth2User);
        } catch (AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Lỗi khi xử lý OAuth2 User: {}", ex.getMessage(), ex);
            throw new InternalAuthenticationServiceException(ex.getMessage(), ex.getCause());
        }
    }

    public OAuth2User processOAuth2User(OAuth2UserRequest oAuth2UserRequest, OAuth2User oAuth2User) {
        String registrationId = oAuth2UserRequest.getClientRegistration().getRegistrationId();
        if (!"google".equalsIgnoreCase(registrationId)) {
            throw new OAuth2AuthenticationException("Hệ thống hiện tại chỉ hỗ trợ đăng nhập qua Google");
        }

        GoogleOAuth2UserInfo oAuth2UserInfo = new GoogleOAuth2UserInfo(oAuth2User.getAttributes());

        if (!StringUtils.hasText(oAuth2UserInfo.getEmail())) {
            throw new OAuth2AuthenticationException("Không tìm thấy email từ tài khoản Google");
        }

        Optional<User> userOptional = userRepository.findByEmail(oAuth2UserInfo.getEmail());
        User user;
        if (userOptional.isPresent()) {
            user = userOptional.get();
            user = updateExistingUser(user, oAuth2UserInfo);
        } else {
            user = registerNewUser(oAuth2UserInfo);
        }

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }

    private User registerNewUser(GoogleOAuth2UserInfo oAuth2UserInfo) {
        User user = User.builder()
                .email(oAuth2UserInfo.getEmail())
                .fullName(oAuth2UserInfo.getName())
                .authProvider(AuthProvider.GOOGLE)
                .providerId(oAuth2UserInfo.getId())
                .role(Role.USER)
                .build();
        return userRepository.save(user);
    }

    private User updateExistingUser(User existingUser, GoogleOAuth2UserInfo oAuth2UserInfo) {
        if (existingUser.getAuthProvider() == null || existingUser.getAuthProvider() == AuthProvider.LOCAL) {
            existingUser.setAuthProvider(AuthProvider.GOOGLE);
            existingUser.setProviderId(oAuth2UserInfo.getId());
        }
        if (StringUtils.hasText(oAuth2UserInfo.getName()) && (existingUser.getFullName() == null || existingUser.getFullName().isBlank())) {
            existingUser.setFullName(oAuth2UserInfo.getName());
        }
        return userRepository.save(existingUser);
    }
}
