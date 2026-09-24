package com.slayer.binacet.repository;

import com.slayer.binacet.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    boolean existsByRefreshToken(String token);

    Optional<RefreshToken> findByRefreshToken(String refreshToken);
    Optional<RefreshToken> findByUserId(String userId);

    int deleteByExpiryDateBefore(LocalDateTime expiryDateBefore);

    void deleteByRefreshToken(String refreshToken);
}
