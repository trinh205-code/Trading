package com.slayer.binacet.config;


import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class JwtConfig {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private Long expirationTime;

    @Value("${jwt.issuer}")
    private String issuer;

    @Value("${jwt.expirationRefreshToken}")
    private Long refreshTokenExpiretionTime;

    public String getSecretKey() {
        return secretKey;
    }

    public Long getExpirationTime() {
        return expirationTime;
    }

    public String getIssuer() {
        return issuer;
    }

    public Long getRefreshTokenExpiretionTime() {
        return refreshTokenExpiretionTime;
    }





}
