package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.WalletBalance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FuturesWalletRepository extends JpaRepository<FuturesWallet,String> {

    // @Lock(LockModeType.PESSIMISTIC_WRITE) sinh ra câu lệnh: SELECT ... FOR UPDATE
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM FuturesWallet w WHERE w.id = :id")
    Optional<FuturesWallet> findByIdWithLock(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM FuturesWallet w WHERE w.user.id = :userId AND w.currencyShortName = :currency")
    Optional<FuturesWallet> findForUpdate(@Param("userId") String userId, @Param("currency") String currency);

    List<FuturesWallet> findByUserId(String userId);

}