package com.slayer.binacet.repository;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.entity.FuturesOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuturesOrderRepository extends JpaRepository<FuturesOrder, String> {
    Page<FuturesOrder> findByUserId(String userId, Pageable pageable);

    Page<FuturesOrder> findByUserIdAndStatus(String userId, FuturesOrderStatus status, Pageable pageable);

    // Lưu ý dùng Instrument_Symbol để chọc vào bảng FuturesInstrument
    Page<FuturesOrder> findByUserIdAndInstrument_Symbol(String userId, String symbol, Pageable pageable);

    Page<FuturesOrder> findByUserIdAndInstrument_SymbolAndStatus(String userId, String symbol, FuturesOrderStatus status, Pageable pageable);

    List<FuturesOrder> findByUser_IdAndInstrument_SymbolAndStatusIn(String userId, String symbol, List<FuturesOrderStatus> statuses);
    List<FuturesOrder> findByOrderTypeAndStatusIn(FuturesOrderType orderType, List<FuturesOrderStatus> statuses);
}
