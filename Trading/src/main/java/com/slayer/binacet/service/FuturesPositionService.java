package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.ClosePartialPositionRequest;
import com.slayer.binacet.dto.response.FuturesPositionResponse;

import java.math.BigDecimal;
import java.util.List;

public interface FuturesPositionService {
        // 1. Lấy tất cả vị thế đang mở (Open Positions) của User
        List<FuturesPositionResponse> getMyOpenPositions();

        // 2. Đóng vị thế (Close Position bằng lệnh Market)
        FuturesPositionResponse closePosition(Long positionId);

        // 3. Điều chỉnh mức đòn bẩy (Leverage 1x - 125x)
        void updateLeverage(String symbol, BigDecimal leverage);

        FuturesPositionResponse closePartialPosition(ClosePartialPositionRequest request);

}
