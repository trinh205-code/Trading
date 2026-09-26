package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.LoginRequest;
import com.slayer.binacet.dto.request.RefreshTokenRequest;
import com.slayer.binacet.dto.request.RegisterRequest;
import com.slayer.binacet.dto.response.AuthResponse;
import com.slayer.binacet.dto.response.TokenRefreshResponse;
import com.slayer.binacet.dto.response.UserResponse;
import com.slayer.binacet.entity.BlacklistedToken;
import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.RefreshToken;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.exception.TokenRefreshException;
import com.slayer.binacet.mapper.UserMapper;
import com.slayer.binacet.repository.BlacklistedRepository;
import com.slayer.binacet.repository.RefreshTokenRepository;
import com.slayer.binacet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final BlacklistedRepository blacklistedRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserMapper userMapper;


    public UserResponse register(RegisterRequest request) {
        if(userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng!");
        }
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .role(Role.USER)

                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        //        WalletBalance walletBalance = WalletBalance.builder()
//                .user(newUser)
//                .currency("USDT")
//                .balance(BigDecimal.ZERO)
//                .lockedBalance(BigDecimal.ZERO)
//                .build();
//        walletBalanceRepository.save(walletBalance);
//
        User saveUser = userRepository.save(user);
        return userMapper.toResponse(saveUser);

    }


    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow(
                () -> new RuntimeException("Không tìm thấy người dùng"));

        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPassword())
                || user.getPassword().equals(request.getPassword());
        if (!passwordMatches) {
            throw new RuntimeException("Mật khẩu không đúng");
        }
        String accessToken = jwtService.generateToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .email(user.getEmail())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    public void logOut(RefreshTokenRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        User loggedInUser = (User) authentication.getPrincipal();


        String token = request.getRefreshToken();

        BlacklistedToken blToken = new BlacklistedToken();
        blToken.setToken(token);
        blToken.setCreatedAt(LocalDateTime.now());
        blToken.setUserId(loggedInUser.getId());

        blacklistedRepository.save(blToken);

        refreshTokenRepository.deleteByRefreshToken(token);
        SecurityContextHolder.clearContext();
    }

    public TokenRefreshResponse refreshToken(RefreshTokenRequest request) {
        String requestTokenString = request.getRefreshToken();

        RefreshToken refreshToken = refreshTokenRepository.findByRefreshToken(requestTokenString)
                .orElseThrow(() -> new TokenRefreshException(requestTokenString, "Refresh token không tồn tại"));

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new TokenRefreshException(requestTokenString, "Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        User user = refreshToken.getUser();

        String newAccessToken = jwtService.generateToken(user.getId(), user.getEmail());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(requestTokenString)
                .build();
    }


}
