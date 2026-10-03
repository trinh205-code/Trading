package com.slayer.binacet.security.oauth2;

import com.slayer.binacet.Enums.AuthProvider;
import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomOAuth2UserService customOAuth2UserService;

    private ClientRegistration googleClientRegistration;

    @BeforeEach
    void setUp() {
        googleClientRegistration = ClientRegistration.withRegistrationId("google")
                .clientId("test-client-id")
                .clientSecret("test-client-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName("sub")
                .build();
    }

    @Test
    @DisplayName("processOAuth2User: Báo lỗi khi nhà cung cấp không phải Google")
    void testProcessOAuth2User_NonGoogleProvider() {
        ClientRegistration githubRegistration = ClientRegistration.withRegistrationId("github")
                .clientId("test-id")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://github.com/login/oauth/authorize")
                .tokenUri("https://github.com/login/oauth/access_token")
                .userInfoUri("https://api.github.com/user")
                .userNameAttributeName("id")
                .build();

        OAuth2UserRequest request = mock(OAuth2UserRequest.class);
        when(request.getClientRegistration()).thenReturn(githubRegistration);

        OAuth2User oAuth2User = mock(OAuth2User.class);

        assertThrows(OAuth2AuthenticationException.class, () ->
                customOAuth2UserService.processOAuth2User(request, oAuth2User));
    }

    @Test
    @DisplayName("processOAuth2User: Báo lỗi khi tài khoản Google không có email")
    void testProcessOAuth2User_MissingEmail() {
        OAuth2UserRequest request = mock(OAuth2UserRequest.class);
        when(request.getClientRegistration()).thenReturn(googleClientRegistration);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-sub-123");
        attributes.put("name", "Test User");

        OAuth2User oAuth2User = new DefaultOAuth2User(Collections.emptyList(), attributes, "sub");

        assertThrows(OAuth2AuthenticationException.class, () ->
                customOAuth2UserService.processOAuth2User(request, oAuth2User));
    }

    @Test
    @DisplayName("processOAuth2User: Đăng ký User mới nếu email chưa tồn tại trong hệ thống")
    void testProcessOAuth2User_RegisterNewUser() {
        OAuth2UserRequest request = mock(OAuth2UserRequest.class);
        when(request.getClientRegistration()).thenReturn(googleClientRegistration);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-sub-999");
        attributes.put("email", "newuser@gmail.com");
        attributes.put("name", "Google New User");
        attributes.put("picture", "https://avatar.google.com/pic.jpg");

        OAuth2User oAuth2User = new DefaultOAuth2User(Collections.emptyList(), attributes, "sub");

        when(userRepository.findByEmail("newuser@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId("new-uid-123");
            return u;
        });

        OAuth2User result = customOAuth2UserService.processOAuth2User(request, oAuth2User);

        assertNotNull(result);
        assertTrue(result instanceof CustomOAuth2User);
        CustomOAuth2User customOAuth2User = (CustomOAuth2User) result;
        assertEquals("newuser@gmail.com", customOAuth2User.getUser().getEmail());
        assertEquals("Google New User", customOAuth2User.getUser().getFullName());
        assertEquals(AuthProvider.GOOGLE, customOAuth2User.getUser().getAuthProvider());
        assertEquals("google-sub-999", customOAuth2User.getUser().getProviderId());
        assertEquals(Role.USER, customOAuth2User.getUser().getRole());

        verify(userRepository).save(argThat(u ->
                u.getEmail().equals("newuser@gmail.com") &&
                u.getAuthProvider() == AuthProvider.GOOGLE &&
                u.getProviderId().equals("google-sub-999")
        ));
    }

    @Test
    @DisplayName("processOAuth2User: Liên kết tài khoản đã tồn tại sang Google AuthProvider")
    void testProcessOAuth2User_LinkExistingUser() {
        OAuth2UserRequest request = mock(OAuth2UserRequest.class);
        when(request.getClientRegistration()).thenReturn(googleClientRegistration);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-sub-777");
        attributes.put("email", "existing@gmail.com");
        attributes.put("name", "Existing User Updated Name");

        OAuth2User oAuth2User = new DefaultOAuth2User(Collections.emptyList(), attributes, "sub");

        User existingUser = User.builder()
                .id("existing-uid")
                .email("existing@gmail.com")
                .fullName("Old Name")
                .role(Role.USER)
                .authProvider(AuthProvider.LOCAL)
                .build();

        when(userRepository.findByEmail("existing@gmail.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        OAuth2User result = customOAuth2UserService.processOAuth2User(request, oAuth2User);

        assertNotNull(result);
        CustomOAuth2User customOAuth2User = (CustomOAuth2User) result;
        assertEquals("existing@gmail.com", customOAuth2User.getUser().getEmail());
        assertEquals(AuthProvider.GOOGLE, customOAuth2User.getUser().getAuthProvider());
        assertEquals("google-sub-777", customOAuth2User.getUser().getProviderId());

        verify(userRepository).save(argThat(u ->
                u.getId().equals("existing-uid") &&
                u.getAuthProvider() == AuthProvider.GOOGLE &&
                u.getProviderId().equals("google-sub-777")
        ));
    }
}
