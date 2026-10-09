package com.slayer.binacet.controller;


import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import com.slayer.binacet.service.FuturesOrderService;
import com.slayer.binacet.service.impl.FuturesOrderServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/futures/orders")
@RequiredArgsConstructor
@Slf4j
public class FuturesOrderController {

    private final FuturesOrderService futuresOrderService;


    @PostMapping
    public ResponseEntity<ApiResponse<FuturesOrderResponse>> createOrder(
            @RequestBody CreateFuturesOrderRequest request) {

        log.info(" request đặt lệnh Futures: {}",  request.getSymbol());

        FuturesOrderResponse response = futuresOrderService.createFuturesOrder(request);

        return ResponseEntity.ok(ApiResponse.success(response, "Đặt lệnh thành công"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<FuturesOrderResponse>>> getMyOrders(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<FuturesOrderResponse> orders = futuresOrderService.getMyFuturesOrders(symbol, status, pageable);

        return ResponseEntity.ok(ApiResponse.success(orders, "Lấy danh sách lệnh thành công"));
    }


    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<FuturesOrderResponse>> cancelOrder(@PathVariable String orderId) {

        log.info(" request hủy lệnh ID: {}", orderId);

        // Truyền userId xuống để Service check quyền sở hữu lệnh
        FuturesOrderResponse response = futuresOrderService.cancelFuturesOrder(orderId);

        return ResponseEntity.ok(ApiResponse.success(response, "Hủy lệnh thành công"));
    }



}
