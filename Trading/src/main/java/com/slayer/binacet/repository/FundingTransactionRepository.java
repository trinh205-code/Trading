package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FundingTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface FundingTransactionRepository extends JpaRepository<FundingTransaction, String> {

    List<FundingTransaction> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT f FROM FundingTransaction f WHERE f.userId = :userId " +
           "AND (:asset IS NULL OR f.asset = :asset) " +
           "AND (:type IS NULL OR f.type = :type) " +
           "AND (:startDate IS NULL OR f.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR f.createdAt <= :endDate) " +
           "ORDER BY f.createdAt DESC")
    Page<FundingTransaction> findFilteredHistory(
            @Param("userId") String userId,
            @Param("asset") String asset,
            @Param("type") String type,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            Pageable pageable
    );
}
