package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FuturesOrderService {
    // 1. Đặt lệnh Futures (Long / Short)
    FuturesOrderResponse createFuturesOrder(CreateFuturesOrderRequest request);
    FuturesOrderResponse cancelFuturesOrder(String orderId);
    // 3. Lấy danh sách lệnh Futures của tôi (Lọc theo symbol, status)
    Page<FuturesOrderResponse> getMyFuturesOrders(String symbol, String status, Pageable pageable);
}
