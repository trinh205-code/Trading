package com.slayer.binacet.repository;

import com.slayer.binacet.entity.Trade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // JOIN từ bảng Trade sang bảng Order để kiểm tra User ID
    @Query("SELECT t FROM Trade t JOIN t.order o WHERE o.user.id = :userId " +
            "AND (:symbol IS NULL OR t.symbol = :symbol) " +
            "ORDER BY t.timestamp DESC")
    Page<Trade> findUserTrades(@Param("userId") String userId,
                               @Param("symbol") String symbol,
                               Pageable pageable);


    Page<Trade> findBySymbol(String symbol, Pageable pageable);
}
