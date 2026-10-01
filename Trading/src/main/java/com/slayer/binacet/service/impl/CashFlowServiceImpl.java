package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.PaymentStatus;
import com.slayer.binacet.dto.response.CashFlowItemResponse;
import com.slayer.binacet.dto.response.CashFlowResponse;
import com.slayer.binacet.dto.response.CashFlowSummaryResponse;
import com.slayer.binacet.entity.*;
import com.slayer.binacet.mapper.CashFlowMapper;
import com.slayer.binacet.repository.*;
import com.slayer.binacet.service.CashFlowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashFlowServiceImpl implements CashFlowService {

    private final PaymentRepository paymentRepository;
    private final FuturesWalletTransactionRepository futuresWalletTransactionRepository;
    private final TradeRepository tradeRepository;
    private final FuturesTradeRepository futuresTradeRepository;
    private final FuturesTransactionRepository futuresTransactionRepository;
    private final CashFlowMapper cashFlowMapper;

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }
        return (User) authentication.getPrincipal();
    }

    @Override
    @Transactional(readOnly = true)
    public CashFlowResponse getCashFlow(String type, Instant startDate, Instant endDate) {
        User user = getCurrentUser();
        String userId = user.getId();

        List<CashFlowItemResponse> allItems = new ArrayList<>();

        BigDecimal totalDeposit = BigDecimal.ZERO;
        BigDecimal totalWithdraw = BigDecimal.ZERO;
        BigDecimal totalTradingFee = BigDecimal.ZERO;
        BigDecimal totalRealizedPnl = BigDecimal.ZERO;
        BigDecimal totalTransferIn = BigDecimal.ZERO;
        BigDecimal totalTransferOut = BigDecimal.ZERO;

        // 1. NẠP TIỀN (VNPay / Payments)
        List<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Payment p : payments) {
            Instant time = p.getCreatedAt() != null
                    ? p.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()
                    : Instant.now();

            String statusStr = p.getPaymentStatus() == PaymentStatus.SUCCESS ? "COMPLETED"
                    : p.getPaymentStatus() == PaymentStatus.PENDING ? "PENDING" : "FAILED";

            BigDecimal amount = p.getUsdtAmount() != null ? p.getUsdtAmount() : BigDecimal.ZERO;
            if (p.getPaymentStatus() == PaymentStatus.SUCCESS) {
                totalDeposit = totalDeposit.add(amount);
            }

            allItems.add(CashFlowItemResponse.builder()
                    .id("DEP_" + p.getId())
                    .type("DEPOSIT")
                    .subType("VNPAY_DEPOSIT")
                    .amount(amount)
                    .currency("USDT")
                    .fee(BigDecimal.ZERO)
                    .direction("IN")
                    .description("Nạp " + amount.stripTrailingZeros().toPlainString() + " USDT qua " + p.getPaymentGateway()
                            + (p.getAmountVnd() != null ? " (" + p.getAmountVnd().setScale(0, RoundingMode.HALF_UP) + " VND)" : ""))
                    .status(statusStr)
                    .timestamp(time)
                    .referenceId(p.getTransactionId() != null ? p.getTransactionId() : String.valueOf(p.getId()))
                    .build());
        }

        // 2. CHUYỂN VÍ SPOT ⇄ FUTURES
        List<FuturesWalletTransaction> walletTxs = futuresWalletTransactionRepository.findAllByUserIdOrWalletId(userId);
        for (FuturesWalletTransaction tx : walletTxs) {
            Instant time = tx.getCreatedAt() != null ? tx.getCreatedAt() : Instant.now();
            boolean isSpotToFutures = "credit".equalsIgnoreCase(tx.getTransactionType()) || "SPOT_TO_FUTURES".equalsIgnoreCase(tx.getReason());
            BigDecimal amt = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
            String cur = tx.getCurrencyShortName() != null ? tx.getCurrencyShortName() : "USDT";

            if (isSpotToFutures) {
                totalTransferIn = totalTransferIn.add(amt);
            } else {
                totalTransferOut = totalTransferOut.add(amt);
            }

            allItems.add(CashFlowItemResponse.builder()
                    .id(tx.getId() != null ? tx.getId() : "TRF_" + System.nanoTime())
                    .type("TRANSFER")
                    .subType(isSpotToFutures ? "SPOT_TO_FUTURES" : "FUTURES_TO_SPOT")
                    .amount(amt)
                    .currency(cur)
                    .fee(BigDecimal.ZERO)
                    .direction("NEUTRAL")
                    .description(isSpotToFutures ? "Chuyển tiền: Ví Spot ➔ Ví Futures" : "Chuyển tiền: Ví Futures ➔ Ví Spot")
                    .status("COMPLETED")
                    .timestamp(time)
                    .referenceId(tx.getWalletId())
                    .build());
        }

        // 3. PHÍ GIAO DỊCH SPOT (Trade)
        List<Trade> spotTrades = tradeRepository.findAllUserTrades(userId);
        for (Trade st : spotTrades) {
            if (st.getFeeAmount() != null && st.getFeeAmount().compareTo(BigDecimal.ZERO) > 0) {
                totalTradingFee = totalTradingFee.add(st.getFeeAmount());

                allItems.add(CashFlowItemResponse.builder()
                        .id("FEE_SPOT_" + st.getId())
                        .type("TRADING_FEE")
                        .subType("SPOT_FEE")
                        .amount(st.getFeeAmount().negate())
                        .currency("USDT")
                        .fee(st.getFeeAmount())
                        .direction("OUT")
                        .description("Phí giao dịch Spot (" + st.getSymbol() + " " + st.getSide() + ")")
                        .status("COMPLETED")
                        .timestamp(st.getTimestamp() != null ? st.getTimestamp() : Instant.now())
                        .referenceId("SPOT_" + st.getId())
                        .build());
            }
        }

        // 4. PHÍ GIAO DỊCH FUTURES (FuturesTrade)
        List<FuturesTrade> futuresTrades = futuresTradeRepository.findByUserIdOrderByTimestampDesc(userId);
        for (FuturesTrade ft : futuresTrades) {
            if (ft.getFeeAmount() != null && ft.getFeeAmount().compareTo(BigDecimal.ZERO) > 0) {
                totalTradingFee = totalTradingFee.add(ft.getFeeAmount());

                allItems.add(CashFlowItemResponse.builder()
                        .id("FEE_FUT_" + ft.getId())
                        .type("TRADING_FEE")
                        .subType("FUTURES_FEE")
                        .amount(ft.getFeeAmount().negate())
                        .currency("USDT")
                        .fee(ft.getFeeAmount())
                        .direction("OUT")
                        .description("Phí giao dịch Futures (" + ft.getSymbol() + " " + ft.getSide() + ")")
                        .status("COMPLETED")
                        .timestamp(ft.getTimestamp() != null ? ft.getTimestamp() : Instant.now())
                        .referenceId("FUT_" + ft.getId())
                        .build());
            }
        }

        // 5. LỜI / LỖ ĐÃ CHỐT & THANH LÝ (FuturesTransaction)
        List<FuturesTransaction> futuresTxs = futuresTransactionRepository.findAllUserTransactions(userId);
        for (FuturesTransaction ftx : futuresTxs) {
            BigDecimal pnl = ftx.getAmount() != null ? ftx.getAmount() : BigDecimal.ZERO;
            totalRealizedPnl = totalRealizedPnl.add(pnl);

            boolean isLiquidation = "liquidation".equalsIgnoreCase(ftx.getStage());
            String desc = (isLiquidation ? "Thanh lý vị thế Futures (" : "Chốt vị thế Futures (")
                    + ftx.getSymbol()
                    + (ftx.getLeverage() != null ? " " + ftx.getLeverage().stripTrailingZeros().toPlainString() + "x" : "")
                    + ")";

            allItems.add(CashFlowItemResponse.builder()
                    .id(ftx.getId() != null ? ftx.getId() : "PNL_" + System.nanoTime())
                    .type("REALIZED_PNL")
                    .subType(isLiquidation ? "LIQUIDATION" : "EXIT_POSITION")
                    .amount(pnl)
                    .currency("USDT")
                    .fee(ftx.getFeeAmount() != null ? ftx.getFeeAmount() : BigDecimal.ZERO)
                    .direction(pnl.compareTo(BigDecimal.ZERO) >= 0 ? "IN" : "OUT")
                    .description(desc)
                    .status("COMPLETED")
                    .timestamp(ftx.getCreatedAt() != null ? ftx.getCreatedAt() : Instant.now())
                    .referenceId(ftx.getSymbol())
                    .build());
        }

        // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
        allItems.sort(Comparator.comparing(CashFlowItemResponse::getTimestamp).reversed());

        // Lọc theo điều kiện nếu có
        List<CashFlowItemResponse> filteredItems = allItems.stream()
                .filter(item -> {
                    if (type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type.trim())) {
                        if (!item.getType().equalsIgnoreCase(type.trim())) return false;
                    }
                    if (startDate != null && item.getTimestamp().isBefore(startDate)) {
                        return false;
                    }
                    if (endDate != null && item.getTimestamp().isAfter(endDate)) {
                        return false;
                    }
                    return true;
                })
                .toList();

        BigDecimal netCashFlow = totalDeposit
                .subtract(totalWithdraw)
                .subtract(totalTradingFee)
                .add(totalRealizedPnl);

        CashFlowSummaryResponse summary = cashFlowMapper.toSummaryResponse(
                totalDeposit, totalWithdraw, totalTradingFee, totalRealizedPnl,
                totalTransferIn, totalTransferOut, netCashFlow);

        return cashFlowMapper.toResponse(summary, filteredItems);
    }
}
