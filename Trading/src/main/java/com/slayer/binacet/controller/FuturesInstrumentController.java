package com.slayer.binacet.controller;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FuturesInstrumentResponse;
import com.slayer.binacet.entity.FuturesInstrument;
import com.slayer.binacet.mapper.FuturesInstrumentResponseMapper;
import com.slayer.binacet.repository.FuturesInstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/futures/instruments")
@RequiredArgsConstructor
public class FuturesInstrumentController {

    private final FuturesInstrumentRepository instrumentRepository;
    private final MarketPriceCache marketPriceCache;
    private final FuturesInstrumentResponseMapper instrumentResponseMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FuturesInstrumentResponse>>> getAllActiveInstruments() {
        List<FuturesInstrument> instruments = instrumentRepository.findAll();

        List<FuturesInstrumentResponse> responses = instruments.stream()
                .filter(i -> "active".equalsIgnoreCase(i.getStatus()))
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.<List<FuturesInstrumentResponse>>builder()
                .success(true)
                .message("Lấy danh mục cặp giao dịch thành công")
                .data(responses)
                .build());
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<ApiResponse<FuturesInstrumentResponse>> getInstrumentDetail(
            @PathVariable String symbol) {

        FuturesInstrument instrument = instrumentRepository.findById(symbol.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cặp giao dịch: " + symbol));

        return ResponseEntity.ok(ApiResponse.<FuturesInstrumentResponse>builder()
                .success(true)
                .message("Lấy thông tin chi tiết cặp giao dịch thành công")
                .data(mapToResponse(instrument))
                .build());
    }

    private FuturesInstrumentResponse mapToResponse(FuturesInstrument instrument) {
        String sym = instrument.getSymbol();

        // Ưu tiên đọc markPrice realtime từ Cache, nếu chưa có thì lấy trong DB
        BigDecimal realtimeMarkPrice = marketPriceCache.getMarkPrice(sym);
        if (realtimeMarkPrice == null || realtimeMarkPrice.compareTo(BigDecimal.ZERO) <= 0) {
            realtimeMarkPrice = instrument.getMarkPrice();
        }

        BigDecimal realtimeLastPrice = marketPriceCache.getLastPrice(sym);
        if (realtimeLastPrice == null || realtimeLastPrice.compareTo(BigDecimal.ZERO) <= 0) {
            realtimeLastPrice = instrument.getLastPrice();
        }

        return instrumentResponseMapper.toResponse(instrument, realtimeLastPrice, realtimeMarkPrice);
    }
}