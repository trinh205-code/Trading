package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesInstrument;
import com.slayer.binacet.entity.FuturesPosition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface FuturesPositionRepository extends JpaRepository<FuturesPosition, Long> {
    List<FuturesPosition> findByUserIdAndActivePosNot(String userId, BigDecimal activePos);

    Optional<FuturesPosition> findByUser_IdAndInstrument_Symbol(String userId, String symbol);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM FuturesPosition p WHERE p.user.id = :userId AND p.instrument.symbol = :symbol")
    Optional<FuturesPosition> findForUpdate(@Param("userId") String userId, @Param("symbol") String symbol);

    List<FuturesPosition> findByActivePosNot(BigDecimal zero);
}
