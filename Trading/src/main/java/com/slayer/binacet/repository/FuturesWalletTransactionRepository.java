package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FuturesWalletTransactionRepository extends JpaRepository<FuturesWalletTransaction, String> {
}
