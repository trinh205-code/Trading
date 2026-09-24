package com.slayer.binacet.repository;

import com.slayer.binacet.entity.BlacklistedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface BlacklistedRepository  extends JpaRepository<BlacklistedToken, Long> {
    boolean existsByToken(String token);

    int deleteByExpiryDateBefore(LocalDateTime currentTime);
}
