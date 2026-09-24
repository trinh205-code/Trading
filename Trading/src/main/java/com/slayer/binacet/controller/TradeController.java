package com.slayer.binacet.controller;


import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/trades")
@RequiredArgsConstructor
@Slf4j
public class TradeController {

    private final TradeService tradeService;


    @GetMapping
    public ResponseEntity<?> getMyTrades(
            @RequestParam(name = "symbol", required = false) String symbol,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {

        log.info("Nhận request lấy lịch sử Trade. Symbol: {}, Page: {}, Size: {}", symbol, page, size);

        Page<TradeResponse> tradeHistory = tradeService.getMyTrades(symbol, page, size);

        return ResponseEntity.ok(ApiResponse.success(tradeHistory));
    }
}