package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface FuturesTransactionRepository extends JpaRepository<FuturesTransaction, String> {

    @Query("SELECT t FROM FuturesTransaction t JOIN t.position p WHERE p.user.id = :userId " +
           "AND (:symbol IS NULL OR t.symbol = :symbol) " +
           "ORDER BY t.createdAt DESC")
    Page<FuturesTransaction> findUserTransactions(@Param("userId") String userId,
                                                  @Param("symbol") String symbol,
                                                  Pageable pageable);
}
