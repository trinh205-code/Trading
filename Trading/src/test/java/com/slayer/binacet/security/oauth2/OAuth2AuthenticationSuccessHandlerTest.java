package com.slayer.binacet.security.oauth2;

import com.slayer.binacet.entity.User;
import com.slayer.binacet.service.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.Collections;

import static com.slayer.binacet.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private OAuth2AuthenticationSuccessHandler successHandler;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(successHandler, "authorizedRedirectUrisStr",
                "http://localhost:3000/oauth2/redirect,http://localhost:5173/oauth2/redirect");
        ReflectionTestUtils.setField(successHandler, "defaultRedirectUri",
                "http://localhost:3000/oauth2/redirect");

        testUser = User.builder()
                .id("u-123")
                .email("test@gmail.com")
                .fullName("Test User")
                .build();
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Chuyển hướng về default URI kèm token và refreshToken")
    void testOnAuthenticationSuccess_DefaultRedirect() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        CustomOAuth2User customOAuth2User = new CustomOAuth2User(testUser, Collections.emptyMap());
        when(authentication.getPrincipal()).thenReturn(customOAuth2User);
        when(jwtService.generateToken("u-123", "test@gmail.com")).thenReturn("mock-access-token");
        when(jwtService.generateRefreshToken("u-123", "test@gmail.com")).thenReturn("mock-refresh-token");

        successHandler.onAuthenticationSuccess(request, response, authentication);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertTrue(redirectedUrl.startsWith("http://localhost:3000/oauth2/redirect"));
        assertTrue(redirectedUrl.contains("token=mock-access-token"));
        assertTrue(redirectedUrl.contains("refreshToken=mock-refresh-token"));

        verify(httpCookieOAuth2AuthorizationRequestRepository).removeAuthorizationRequestCookies(request, response);
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Sử dụng redirect_uri hợp lệ được lưu trong cookie")
    void testOnAuthenticationSuccess_AuthorizedCustomRedirectUri() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Cookie redirectCookie = new Cookie(REDIRECT_URI_PARAM_COOKIE_NAME, "http://localhost:5173/oauth2/redirect");
        request.setCookies(redirectCookie);

        when(authentication.getPrincipal()).thenReturn(testUser);
        when(jwtService.generateToken("u-123", "test@gmail.com")).thenReturn("mock-jwt");
        when(jwtService.generateRefreshToken("u-123", "test@gmail.com")).thenReturn("mock-refresh");

        successHandler.onAuthenticationSuccess(request, response, authentication);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertTrue(redirectedUrl.startsWith("http://localhost:5173/oauth2/redirect"));
        assertTrue(redirectedUrl.contains("token=mock-jwt"));
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Từ chối redirect_uri không hợp lệ (Untrusted domain) và fallback về default URI")
    void testOnAuthenticationSuccess_UntrustedRedirectUri() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Cookie untrustedCookie = new Cookie(REDIRECT_URI_PARAM_COOKIE_NAME, "http://malicious-site.com/steal-token");
        request.setCookies(untrustedCookie);

        when(authentication.getPrincipal()).thenReturn(testUser);
        when(jwtService.generateToken("u-123", "test@gmail.com")).thenReturn("mock-jwt");
        when(jwtService.generateRefreshToken("u-123", "test@gmail.com")).thenReturn("mock-refresh");

        successHandler.onAuthenticationSuccess(request, response, authentication);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertTrue(redirectedUrl.startsWith("http://localhost:3000/oauth2/redirect"));
        assertFalse(redirectedUrl.contains("malicious-site.com"));
    }
}
