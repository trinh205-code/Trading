package com.slayer.binacet.service;

import com.slayer.binacet.entity.FuturesPosition;

import java.math.BigDecimal;

public interface FuturesPnLService {
    BigDecimal calculateUnrealizedPnl(FuturesPosition position, BigDecimal markPrice);
    BigDecimal calculateRoi(FuturesPosition position, BigDecimal markPrice);
    BigDecimal calculateLiquidationPrice(FuturesPosition position, BigDecimal maintenanceMarginRate);}
