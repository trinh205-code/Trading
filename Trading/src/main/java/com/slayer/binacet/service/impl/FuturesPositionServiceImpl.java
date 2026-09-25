package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.request.ClosePartialPositionRequest;
import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesPositionResponse;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.mapper.FuturesPositionMapper;
import com.slayer.binacet.repository.FuturesPositionRepository;
import com.slayer.binacet.repository.FuturesWalletRepository;
import com.slayer.binacet.service.FuturesOrderService;
import com.slayer.binacet.service.FuturesPnLService;
import com.slayer.binacet.service.FuturesPositionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesPositionServiceImpl implements FuturesPositionService {

    private final FuturesPositionRepository futuresPositionRepository;
    private final FuturesWalletRepository futuresWalletRepository;
    private final com.slayer.binacet.repository.FuturesTransactionRepository futuresTransactionRepository;
    private final FuturesPositionMapper futuresPositionMapper;
    private final FuturesOrderService futuresOrderService;
    private final FuturesPnLService pnlService;
    private final MarketPriceCache marketPriceCache;

    @Override
    public List<FuturesPositionResponse> getMyOpenPositions() {
        String userId = getCurrentUser().getId();
        List<FuturesPosition> activePositions = futuresPositionRepository.findByUserIdAndActivePosNot(userId, BigDecimal.ZERO);
        log.info("active positions: {}", activePositions.stream().map(FuturesPosition::getActivePos).collect(Collectors.toList()));
        return activePositions.stream()
                .filter(p->p.getActivePos() != null && p.getActivePos().compareTo(BigDecimal.ZERO) != 0)
                .map(this::mapAndCalculatePnL)
                .collect(Collectors.toList());
    }



    @Override
    @Transactional
    public FuturesPositionResponse closePosition(Long positionId) {
        String userId = getCurrentUser().getId();

        FuturesPosition position = futuresPositionRepository.findById(positionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vị thế"));

        if (!position.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền đóng vị thế này");
        }

        BigDecimal activePos = position.getActivePos();
        if (activePos == null || activePos.compareTo(BigDecimal.ZERO) == 0) {
            throw new RuntimeException("Vị thế này đã được đóng");
        }


        OrderSide closeSide = activePos.compareTo(BigDecimal.ZERO) > 0 ? OrderSide.SELL : OrderSide.BUY;
        BigDecimal closeQuantity = activePos.abs();

        BigDecimal totalMarginReturn = closeQuantity.multiply(position.getAvgPrice());
        CreateFuturesOrderRequest closeRequest = CreateFuturesOrderRequest.builder()
                .symbol(position.getInstrument().getSymbol())
                .side(closeSide)
                .orderType(FuturesOrderType.MARKET)
                .quantity(closeQuantity)
                .leverage(position.getLeverage())
                .reduceOnly(true) // Đánh dấu lệnh đóng
                .build();

        futuresOrderService.createFuturesOrder(closeRequest);

        FuturesPosition updatedPosition = futuresPositionRepository.findById(positionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vị thế sau khi đóng"));
        return mapAndCalculatePnL(updatedPosition);
    }



    @Override
    @Transactional
    public void updateLeverage(String symbol, BigDecimal leverage) {
        if (leverage.compareTo(BigDecimal.ONE) < 0 || leverage.compareTo(new BigDecimal("200")) > 0) {
            throw new IllegalArgumentException("Đòn bẩy phải nằm trong khoảng từ 1x đến 200x");
        }

        String userId = getCurrentUser().getId();
        FuturesPosition position = futuresPositionRepository.findByUser_IdAndInstrument_Symbol(userId, symbol.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Chưa có cấu hình vị thế cho cặp này"));

        FuturesWallet wallet = futuresWalletRepository.findForUpdate(userId, position.getMarginCurrencyShortName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

        if (position.getActivePos() != null && position.getActivePos().compareTo(BigDecimal.ZERO) != 0) {

            BigDecimal notionalValue = position.getActivePos().abs().multiply(position.getAvgPrice());
            BigDecimal newMarginRequired = notionalValue.divide(leverage, 18, java.math.RoundingMode.HALF_UP);

            BigDecimal currentLockedMargin = position.getLockedUserMargin() != null ? position.getLockedUserMargin() : BigDecimal.ZERO;
            BigDecimal marginDifference = newMarginRequired.subtract(currentLockedMargin);

            if (marginDifference.compareTo(BigDecimal.ZERO) > 0) {

                if (wallet.getAvailableMargin().compareTo(marginDifference) < 0) {
                    throw new RuntimeException("Số dư khả dụng không đủ để hạ đòn bẩy. Cần thêm: " + marginDifference.toPlainString());
                }
                wallet.setLockedBalance(wallet.getLockedBalance().add(marginDifference));
                wallet.setBalance(wallet.getBalance().subtract(marginDifference));

            } else if (marginDifference.compareTo(BigDecimal.ZERO) < 0) {
                BigDecimal refund = marginDifference.abs();
                BigDecimal newLocked = wallet.getLockedBalance().subtract(refund);
                wallet.setLockedBalance(newLocked.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newLocked);
                wallet.setBalance(wallet.getBalance().add(refund));
            }

            position.setLockedUserMargin(newMarginRequired);
            futuresWalletRepository.save(wallet);
        }

        position.setLeverage(leverage);
        futuresPositionRepository.save(position);
    }

    @Override
    @Transactional
    public FuturesPositionResponse closePartialPosition(ClosePartialPositionRequest request) {
        String userId = getCurrentUser().getId();

        FuturesPosition position = futuresPositionRepository.findById(request.getPositionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vị thế"));

        if (!position.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền thao tác trên vị thế này");
        }

        BigDecimal activePos = position.getActivePos();
        if (activePos == null || activePos.compareTo(BigDecimal.ZERO) == 0) {
            throw new RuntimeException("Vị thế này đã đóng hoặc không còn tồn tại");
        }

        BigDecimal currentSize = activePos.abs();
        BigDecimal closeQuantity = request.getQuantity();

        if (closeQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Số lượng đóng phải lớn hơn 0");
        }

        // Nếu số lượng yêu cầu đóng lớn hơn khối lượng đang giữ -> tự động cắt gọn lại bằng currentSize
        if (closeQuantity.compareTo(currentSize) > 0) {
            closeQuantity = currentSize;
        }

        //  Xác định chiều lệnh ngược lại để giảm/đóng vị thế
        OrderSide closeSide = activePos.compareTo(BigDecimal.ZERO) > 0 ? OrderSide.SELL : OrderSide.BUY;

        // 4. Tạo lệnh đóng có cờ reduceOnly = true
        CreateFuturesOrderRequest closeRequest = CreateFuturesOrderRequest.builder()
                .symbol(position.getInstrument().getSymbol())
                .side(closeSide)
                .orderType(request.getOrderType())
                .price(request.getPrice())
                .quantity(closeQuantity)
                .leverage(position.getLeverage())
                .reduceOnly(true)
                .build();

        futuresOrderService.createFuturesOrder(closeRequest);

        FuturesPosition updatedPosition = futuresPositionRepository.findById(request.getPositionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vị thế sau khi xử lý"));

        return mapAndCalculatePnL(updatedPosition);
    }


    @Override
    public org.springframework.data.domain.Page<com.slayer.binacet.dto.response.FuturesPositionHistoryResponse> getPositionHistory(
            String symbol, org.springframework.data.domain.Pageable pageable) {
        String userId = getCurrentUser().getId();
        String querySymbol = (symbol != null && !symbol.isBlank()) ? symbol.toUpperCase() : null;
        org.springframework.data.domain.Page<com.slayer.binacet.entity.FuturesTransaction> transactions =
                futuresTransactionRepository.findUserTransactions(userId, querySymbol, pageable);

        return transactions.map(t -> com.slayer.binacet.dto.response.FuturesPositionHistoryResponse.builder()
                .id(t.getId())
                .symbol(t.getSymbol())
                .stage(t.getStage())
                .realizedPnl(t.getAmount())
                .feeAmount(t.getFeeAmount())
                .leverage(t.getPosition() != null ? t.getPosition().getLeverage() : null)
                .avgPrice(t.getPosition() != null ? t.getPosition().getAvgPrice() : null)
                .source(t.getSource())
                .parentType(t.getParentType())
                .parentId(t.getParentId())
                .createdAt(t.getCreatedAt())
                .build());
    }

    private FuturesPositionResponse mapAndCalculatePnL(FuturesPosition position) {
        FuturesPositionResponse response = futuresPositionMapper.toResponse(position);

        BigDecimal avgPrice = position.getAvgPrice();
        if (avgPrice == null) {
            log.error("⚠️ Vị thế {} có activePos={} nhưng avgPrice=null", position.getId(), position.getActivePos());
            response.setUnrealizedPnl(BigDecimal.ZERO);
            return response;
        }

        String symbol = position.getInstrument().getSymbol();
        BigDecimal markPrice = marketPriceCache.getMarkPrice(symbol);
        if (markPrice == null) {
            markPrice = position.getMarkPrice() != null ? position.getMarkPrice() : avgPrice;
        }

        response.setUnrealizedPnl(pnlService.calculateUnrealizedPnl(position, markPrice));
        return response;
    }

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }
}
