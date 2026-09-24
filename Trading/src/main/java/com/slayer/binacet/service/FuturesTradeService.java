package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.FuturesTradeResponse;
import com.slayer.binacet.entity.FuturesTrade;
import com.slayer.binacet.mapper.FuturesTradeMapper;
import com.slayer.binacet.repository.FuturesTradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesTradeService {

    private final FuturesTradeRepository tradeRepository;
    private final FuturesTradeMapper futuresTradeMapper;


    public Page<FuturesTradeResponse> getMyTrades(String symbol, Pageable pageable) {
        String userId = getCurrentUserId();
        Page<FuturesTrade> trades;

        if (symbol != null && !symbol.isBlank()) {
            trades = tradeRepository.findByUserIdAndSymbolOrderByTimestampDesc(userId, symbol.toUpperCase(), pageable);
        } else {
            trades = tradeRepository.findByUserIdOrderByTimestampDesc(userId, pageable);
        }


        return trades.map(futuresTradeMapper::toResponse);
    }

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof com.slayer.binacet.entity.User) {
            return ((com.slayer.binacet.entity.User) principal).getId();
        }
        if (principal instanceof String) {
            return (String) principal;
        }
        throw new RuntimeException("Lỗi xác thực người dùng");
    }
}
