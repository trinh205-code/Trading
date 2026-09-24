package com.slayer.binacet.service.impl;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.repository.FuturesPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Chỉ đọc danh sách vị thế (KHÔNG lock, KHÔNG transactional) rồi giao từng vị thế cho
 * FuturesLiquidationService xử lý trong transaction RIÊNG của nó. Tách bean này ra khỏi
 * FuturesLiquidationService là bắt buộc về mặt kỹ thuật — nếu gộp chung 1 class rồi tự
 * gọi @Transactional method từ chính @Scheduled method trong CÙNG class, Spring AOP proxy
 * sẽ bị bỏ qua (self-invocation), khiến @Transactional không có tác dụng gì, và 1 lỗi ở
 * vị thế thứ N sẽ không rollback đúng cách, có thể kéo theo dữ liệu sai ở các vị thế khác.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FuturesLiquidationScanner {

    private final FuturesPositionRepository positionRepository;
    private final MarketPriceCache marketPriceCache;
    private final FuturesLiquidationService liquidationService;

    @Scheduled(fixedDelay = 15000) // quét mỗi 15 giây
    public void scanAndLiquidate() {
        List<FuturesPosition> openPositions = positionRepository.findByActivePosNot(BigDecimal.ZERO);

        for (FuturesPosition position : openPositions) {
            try {
                String userId = position.getUser().getId();
                String symbol = position.getInstrument().getSymbol();

                BigDecimal markPrice = marketPriceCache.getMarkPrice(symbol);
                if (markPrice == null || markPrice.compareTo(BigDecimal.ZERO) <= 0) continue;

                liquidationService.checkAndLiquidateIfNeeded(userId, symbol, markPrice);

            } catch (Exception e) {
                log.error("Lỗi khi kiểm tra thanh lý vị thế {}: ", position.getId(), e);
            }
        }
    }
}