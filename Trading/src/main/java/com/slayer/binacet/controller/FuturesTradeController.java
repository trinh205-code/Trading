package com.slayer.binacet.controller;


import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FuturesTradeResponse;
import com.slayer.binacet.service.FuturesTradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/futures/trades")
@RequiredArgsConstructor
@Slf4j
public class FuturesTradeController {

    private final FuturesTradeService futuresTradeService;


    @GetMapping
    public ResponseEntity<ApiResponse<Page<FuturesTradeResponse>>> getMyTrades(
            @RequestParam(required = false) String symbol,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);

        Page<FuturesTradeResponse> trades = futuresTradeService.getMyTrades(symbol, pageable);

        return ResponseEntity.ok(ApiResponse.success(trades, "Lấy danh sách lịch sử khớp lệnh thành công"));
    }
}
