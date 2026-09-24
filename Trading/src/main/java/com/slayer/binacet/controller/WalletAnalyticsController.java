package com.slayer.binacet.controller;

import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.PnlAnalyticsResponse;
import com.slayer.binacet.service.WalletAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletAnalyticsController {

    private final WalletAnalyticsService analyticsService;

    @GetMapping("/pnl-analytics")
    public ResponseEntity<ApiResponse<PnlAnalyticsResponse>> getPnlAnalytics(
            @RequestParam(defaultValue = "30D") String period) {

        PnlAnalyticsResponse res = analyticsService.getPnlAnalytics(period);
        return ResponseEntity.ok(ApiResponse.success(res));
    }
}