package com.slayer.binacet.controller;

import com.slayer.binacet.dto.request.ClosePartialPositionRequest;
import com.slayer.binacet.dto.request.UpdateLeverageRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FuturesPositionResponse;
import com.slayer.binacet.service.FuturesPositionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/futures/positions")
@RequiredArgsConstructor
@Slf4j
public class FuturesPositionController {

    private final FuturesPositionService futuresPositionService;


    @GetMapping
    public ResponseEntity<ApiResponse<List<FuturesPositionResponse>>> getMyOpenPositions() {
        List<FuturesPositionResponse> positions = futuresPositionService.getMyOpenPositions();
        return ResponseEntity.ok(ApiResponse.success(positions, "Lấy danh sách vị thế thành công"));
    }


    @PostMapping("/{positionId}/close")
    public ResponseEntity<ApiResponse<FuturesPositionResponse>> closePosition(@PathVariable Long positionId) {
        log.info("Request đóng vị thế ID: {}", positionId);
        FuturesPositionResponse response = futuresPositionService.closePosition(positionId);
        return ResponseEntity.ok(ApiResponse.success(response, "Đã gửi lệnh Market để đóng vị thế"));
    }


    @PutMapping("/leverage")
    public ResponseEntity<ApiResponse<String>> updateLeverage(@RequestBody UpdateLeverageRequest request) {
        String symbol = request.getSymbol().trim().toUpperCase();
        BigDecimal leverage = request.getLeverage();

        futuresPositionService.updateLeverage(symbol, leverage);
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật đòn bẩy thành công"));
    }

    @PostMapping("/close-partial")
    public ResponseEntity<ApiResponse<FuturesPositionResponse>> closePartialPosition(
            @Valid @RequestBody ClosePartialPositionRequest request) {

        FuturesPositionResponse response = futuresPositionService.closePartialPosition(request);

        return ResponseEntity.ok(ApiResponse.success(response, "Đã gửi lệnh đóng vị thế từng phần thành công"));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<com.slayer.binacet.dto.response.FuturesPositionHistoryResponse>>> getPositionHistory(
            @RequestParam(required = false) String symbol,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<com.slayer.binacet.dto.response.FuturesPositionHistoryResponse> history =
                futuresPositionService.getPositionHistory(symbol, pageable);

        return ResponseEntity.ok(ApiResponse.success(history, "Lấy lịch sử vị thế thành công"));
    }
}