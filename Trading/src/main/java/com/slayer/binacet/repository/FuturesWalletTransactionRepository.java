package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface FuturesWalletTransactionRepository extends JpaRepository<FuturesWalletTransaction, String> {
    List<FuturesWalletTransaction> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT t FROM FuturesWalletTransaction t WHERE t.userId = :userId OR t.walletId IN (SELECT w.id FROM FuturesWallet w WHERE w.user.id = :userId) ORDER BY t.createdAt DESC")
    List<FuturesWalletTransaction> findAllByUserIdOrWalletId(@Param("userId") String userId);
}
