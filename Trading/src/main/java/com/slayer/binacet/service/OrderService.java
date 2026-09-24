package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.CreateOrderRequest;
import com.slayer.binacet.dto.response.OrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {
    OrderResponse createOrder(CreateOrderRequest request);
    OrderResponse cancelOrder(String id);
    OrderResponse getOrderById(String id);
    Page<OrderResponse> getMyOrders(String marketSymbol, Pageable pageable);
}
