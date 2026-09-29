package com.slayer.binacet.controller;

import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.CashFlowResponse;
import com.slayer.binacet.service.CashFlowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping({"/api/v1/wallet/cash-flow", "/api/orders/cash-flow"})
@RequiredArgsConstructor
@Slf4j
public class CashFlowController {

    private final CashFlowService cashFlowService;

    @GetMapping
    public ResponseEntity<ApiResponse<CashFlowResponse>> getCashFlow(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate) {

        log.info("Lấy bảng tổng hợp dòng tiền với filter: type={}, startDate={}, endDate={}", type, startDate, endDate);
        CashFlowResponse response = cashFlowService.getCashFlow(type, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy bảng tổng hợp dòng tiền thành công"));
    }
}
