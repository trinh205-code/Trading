package com.slayer.binacet.service.impl;

import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.service.FuturesPnLService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class FuturesPnLServiceImpl implements FuturesPnLService {
    @Override
    public BigDecimal calculateUnrealizedPnl(FuturesPosition position, BigDecimal markPrice) {
        BigDecimal qty = position.getActivePos();
        BigDecimal avgPrice = position.getAvgPrice();

        if (qty == null || qty.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        if (avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) <= 0 || markPrice == null) return BigDecimal.ZERO;

        return markPrice.subtract(avgPrice.abs()).multiply(qty);
    }

    @Override
    public BigDecimal calculateRoi(FuturesPosition position, BigDecimal markPrice) {
        if (position.getLockedUserMargin() == null || position.getLockedUserMargin().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal pnl = calculateUnrealizedPnl(position, markPrice);
        return pnl.divide(position.getLockedUserMargin(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    // FuturesPnLServiceImpl.java — thêm implementation
    @Override
    public BigDecimal calculateLiquidationPrice(FuturesPosition position, BigDecimal maintenanceMarginRate) {
        BigDecimal qty = position.getActivePos();
        if (qty == null || qty.compareTo(BigDecimal.ZERO) == 0) return null;

        BigDecimal avgPrice = position.getAvgPrice();
        if (avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) <= 0) return null;
        avgPrice = avgPrice.abs();

        BigDecimal margin = position.getLockedUserMargin() != null ? position.getLockedUserMargin() : BigDecimal.ZERO;
        BigDecimal absQty = qty.abs();

        // Maintenance margin = giá trị vị thế × tỉ lệ ký quỹ duy trì tối thiểu
        BigDecimal maintenanceMargin = avgPrice.multiply(absQty).multiply(maintenanceMarginRate);

        // Khoảng đệm giá còn lại trước khi ký quỹ chạm mức tối thiểu
        BigDecimal buffer = margin.subtract(maintenanceMargin).divide(absQty, 18, RoundingMode.HALF_UP);

        BigDecimal liqPrice = qty.signum() > 0
                ? avgPrice.subtract(buffer)   // LONG: giá GIẢM tới đây thì bị thanh lý
                : avgPrice.add(buffer);       // SHORT: giá TĂNG tới đây thì bị thanh lý

        return liqPrice != null ? liqPrice.max(BigDecimal.ZERO) : null;
    }
}
