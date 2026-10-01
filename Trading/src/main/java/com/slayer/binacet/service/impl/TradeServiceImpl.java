package com.slayer.binacet.service.impl;

import com.slayer.binacet.dto.response.PublicTradeResponse;
import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.entity.Trade;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.mapper.TradeMapper;
import com.slayer.binacet.repository.TradeRepository;
import com.slayer.binacet.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TradeServiceImpl implements TradeService {
    private final TradeRepository tradeRepository;
    private final TradeMapper tradeMapper;

    private static final BigDecimal FEE_RATE = new BigDecimal("0.001");


    @Override
    @Transactional
    public void recordInternalMatch(Order buyOrder, Order sellOrder, BigDecimal matchPrice, BigDecimal matchQty) {
        BigDecimal fee = matchQty.multiply(FEE_RATE);

        Trade buyTrade = tradeMapper.toEntity(buyOrder, matchPrice, matchQty);
        buyTrade.setFeeAmount(fee);
        buyTrade.setExecutionVenue("INTERNAL");

        Trade sellTrade = tradeMapper.toEntity(sellOrder, matchPrice, matchQty);
        sellTrade.setFeeAmount(fee);
        sellTrade.setExecutionVenue("INTERNAL");

        tradeRepository.save(buyTrade);
        tradeRepository.save(sellTrade);
    }

    @Override
    @Transactional
    public void recordExternalMatch(Order order, BigDecimal matchPrice, BigDecimal matchQty, String venue, String externalId) {
        BigDecimal fee = order.getSide().name().equals("BUY")
                ? matchQty.multiply(FEE_RATE)
                : matchPrice.multiply(matchQty).multiply(FEE_RATE);

        Trade externalTrade = tradeMapper.toEntity(order, matchPrice, matchQty);
        externalTrade.setFeeAmount(fee);
        externalTrade.setExecutionVenue(venue);

        tradeRepository.save(externalTrade);
    }

    @Override
    public Page<TradeResponse> getMyTrades(String symbol, int page, int size) {
        User currentUser = getCurrentUser();

        Pageable pageable = PageRequest.of(page, size);

        String querySymbol = (symbol != null && !symbol.isBlank()) ? symbol.toUpperCase() : null;
        Page<Trade> trades = tradeRepository.findUserTrades(currentUser.getId(), querySymbol, pageable);
        return trades.map(tradeMapper::toResponse);
    }

    @Override
    public List<PublicTradeResponse> getRecentMarketTrades(String symbol, int limit) {

        Pageable pageable = PageRequest.of(0, limit, Sort.by("timestamp").descending());
        Page<Trade>  trades = tradeRepository.findBySymbol(symbol, pageable);


        return trades.stream().map(trade -> PublicTradeResponse.builder()
                        .id(trade.getId())
                        .price(trade.getPrice())
                        .quantity(trade.getQuantity())
                        .side(trade.getSide() != null ? trade.getSide().name() : null)
                        .timestamp(trade.getTimestamp())
                        .build()
                ).toList();
    }

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }
}
