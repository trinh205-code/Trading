package com.slayer.binacet.security.oauth2;

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
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.test.util.ReflectionTestUtils;

import static com.slayer.binacet.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationFailureHandlerTest {

    @Mock
    private HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    @InjectMocks
    private OAuth2AuthenticationFailureHandler failureHandler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(failureHandler, "failureRedirectUri", "http://localhost:3000/login");
    }

    @Test
    @DisplayName("onAuthenticationFailure: Chuyển hướng về trang login kèm thông báo lỗi và xóa cookie")
    void testOnAuthenticationFailure_DefaultRedirect() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthenticationException exception = new BadCredentialsException("Google authentication failed");

        failureHandler.onAuthenticationFailure(request, response, exception);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertTrue(redirectedUrl.startsWith("http://localhost:3000/login"));
        assertTrue(redirectedUrl.contains("error=Google"));

        verify(httpCookieOAuth2AuthorizationRequestRepository).removeAuthorizationRequestCookies(request, response);
    }

    @Test
    @DisplayName("onAuthenticationFailure: Chuyển hướng về URL trong redirect_uri cookie nếu có")
    void testOnAuthenticationFailure_CustomRedirectFromCookie() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Cookie redirectCookie = new Cookie(REDIRECT_URI_PARAM_COOKIE_NAME, "http://localhost:5173/login");
        request.setCookies(redirectCookie);

        AuthenticationException exception = new BadCredentialsException("User denied consent");

        failureHandler.onAuthenticationFailure(request, response, exception);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertTrue(redirectedUrl.startsWith("http://localhost:5173/login"));
        assertTrue(redirectedUrl.contains("error="));

        verify(httpCookieOAuth2AuthorizationRequestRepository).removeAuthorizationRequestCookies(request, response);
    }
}
