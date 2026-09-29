package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesTrade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FuturesTradeRepository extends JpaRepository<FuturesTrade, Long> {

    Page<FuturesTrade> findByOrder_User_Id(String userId, Pageable pageable);

    Page<FuturesTrade> findByOrder_User_IdAndSymbol(String userId, String symbol, Pageable pageable);
    Page<FuturesTrade> findByUserIdOrderByTimestampDesc(String userId, Pageable pageable);
    Page<FuturesTrade> findByUserIdAndSymbolOrderByTimestampDesc(String userId, String symbol, Pageable pageable);
    java.util.List<FuturesTrade> findByUserIdOrderByTimestampDesc(String userId);
}
