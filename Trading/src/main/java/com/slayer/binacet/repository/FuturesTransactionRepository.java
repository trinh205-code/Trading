package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FuturesTransactionRepository extends JpaRepository<FuturesTransaction, String> {
}
