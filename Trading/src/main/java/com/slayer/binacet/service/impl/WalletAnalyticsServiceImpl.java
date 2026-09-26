package com.slayer.binacet.service.impl;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.response.PnlAnalyticsResponse;
import com.slayer.binacet.dto.response.PnlChartPointDto;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.UserDailyEquitySnapshot;
import com.slayer.binacet.repository.*;
import com.slayer.binacet.service.WalletAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletAnalyticsServiceImpl implements WalletAnalyticsService {

    private final UserDailyEquitySnapshotRepository snapshotRepo;
    private final WalletBalanceRepository walletBalanceRepo;
    private final FuturesWalletRepository futuresWalletRepo;
    private final FuturesPositionRepository futuresPositionRepo;
    private final MarketPriceCache marketPriceCache;

    @Override
    public PnlAnalyticsResponse getPnlAnalytics(String period) {
        String userId = getCurrentUser().getId();
        BigDecimal currentEquity = calculateCurrentTotalEquity(userId);

        String normPeriod = period != null ? period.toUpperCase() : "30D";

        List<PnlChartPointDto> points;

        if ("1D".equals(normPeriod)) {
            // Chu kỳ 1 Ngày: Chia các mốc thời gian trong ngày hôm nay (00:00, 04:00, 08:00, 12:00, 16:00, 20:00, Hiện tại)
            points = generateIntradayPoints(userId, currentEquity);
        } else {
            int days = switch (normPeriod) {
                case "7D" -> 7;
                case "180D", "6M" -> 180;
                case "1Y" -> 365;
                default -> 30; // Mặc định 30D (1 Tháng)
            };

            LocalDate startDate = LocalDate.now().minusDays(days);
            List<UserDailyEquitySnapshot> snapshots = snapshotRepo
                    .findByUserIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(userId, startDate);

            if (snapshots.isEmpty()) {
                // Tạo các điểm fallback theo ngày nếu chưa có dữ liệu snapshot trong quá khứ
                points = generateFallbackPoints(userId, days, currentEquity);
            } else {
                points = new ArrayList<>();
                BigDecimal cumulative = BigDecimal.ZERO;
                for (UserDailyEquitySnapshot s : snapshots) {
                    BigDecimal dailyPnl = s.getDailyPnl() != null ? s.getDailyPnl() : BigDecimal.ZERO;
                    cumulative = cumulative.add(dailyPnl);
                    points.add(PnlChartPointDto.builder()
                            .timestamp(s.getSnapshotDate().toString())
                            .dateLabel(s.getSnapshotDate().format(DateTimeFormatter.ofPattern("dd-MM")))
                            .assetValue(s.getTotalEquity() != null ? s.getTotalEquity() : currentEquity)
                            .dailyPnl(dailyPnl)
                            .dailyPnlPercent(calculatePercent(dailyPnl, s.getTotalEquity()))
                            .cumulativePnl(cumulative)
                            .build());
                }

                // Điểm cuối cùng là thời điểm hiện tại của hôm nay
                BigDecimal todayPnl = calculateTodayPnl(userId);
                cumulative = cumulative.add(todayPnl);
                points.add(PnlChartPointDto.builder()
                        .timestamp(LocalDate.now().toString())
                        .dateLabel(LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM")))
                        .assetValue(currentEquity)
                        .dailyPnl(todayPnl)
                        .dailyPnlPercent(calculatePercent(todayPnl, currentEquity))
                        .cumulativePnl(cumulative)
                        .build());
            }
        }

        // Tính tổng PnL và % PnL của toàn chu kỳ
        BigDecimal startEquity = (points != null && !points.isEmpty())
                ? points.get(0).getAssetValue()
                : currentEquity;
        BigDecimal periodPnl = currentEquity.subtract(startEquity);
        BigDecimal pnlPercent = (startEquity != null && startEquity.compareTo(BigDecimal.ZERO) > 0)
                ? periodPnl.divide(startEquity, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        return PnlAnalyticsResponse.builder()
                .currentTotalAsset(currentEquity.setScale(2, RoundingMode.HALF_UP))
                .periodPnl(periodPnl.setScale(2, RoundingMode.HALF_UP))
                .periodPnlPercentage(pnlPercent.setScale(2, RoundingMode.HALF_UP))
                .period(normPeriod)
                .chartPoints(points)
                .build();
    }

    /**
     * Tính tổng tài sản thực tế = Ví Spot (quy đổi USD) + Ví Futures (Khả dụng + Ký quỹ + Live UPnL)
     */
    @Override
    public BigDecimal calculateCurrentTotalEquity(String userId) {
        // A. Tài sản Spot
        BigDecimal spotTotal = walletBalanceRepo.findByUserId(userId).stream()
                .map(wb -> {
                    BigDecimal bal = (wb.getBalance() != null ? wb.getBalance() : BigDecimal.ZERO)
                            .add(wb.getLockedBalance() != null ? wb.getLockedBalance() : BigDecimal.ZERO);
                    if ("USDT".equalsIgnoreCase(wb.getCurrency()) || "USD".equalsIgnoreCase(wb.getCurrency())) {
                        return bal;
                    }
                    BigDecimal price = marketPriceCache.getMarkPrice(wb.getCurrency() + "USDT");
                    if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
                        price = BigDecimal.ZERO;
                    }
                    return bal.multiply(price);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // B. Tài sản Futures (Khả dụng + Ký quỹ)
        BigDecimal futuresTotal = futuresWalletRepo.findByUserId(userId).stream()
                .map(fw -> {
                    BigDecimal bal = fw.getBalance() != null ? fw.getBalance() : BigDecimal.ZERO;
                    BigDecimal locked = fw.getLockedBalance() != null ? fw.getLockedBalance() : BigDecimal.ZERO;
                    return bal.add(locked);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // C. Live Unrealized PnL các vị thế Futures đang mở
        BigDecimal activePositionsPnl = BigDecimal.ZERO;
        try {
            List<FuturesPosition> openPositions = futuresPositionRepo.findByUserIdAndActivePosNot(userId, BigDecimal.ZERO);
            for (FuturesPosition p : openPositions) {
                if (p.getActivePos() == null || p.getActivePos().compareTo(BigDecimal.ZERO) == 0) continue;
                String sym = p.getInstrument() != null ? p.getInstrument().getSymbol() : null;
                if (sym == null) continue;

                BigDecimal mark = marketPriceCache.getMarkPrice(sym);
                if (mark == null || mark.compareTo(BigDecimal.ZERO) <= 0) {
                    mark = p.getAvgPrice() != null ? p.getAvgPrice() : BigDecimal.ZERO;
                }
                BigDecimal avg = p.getAvgPrice() != null ? p.getAvgPrice() : BigDecimal.ZERO;
                BigDecimal qty = p.getActivePos().abs();

                BigDecimal posPnl = p.getActivePos().signum() > 0
                        ? mark.subtract(avg).multiply(qty)
                        : avg.subtract(mark).multiply(qty);

                activePositionsPnl = activePositionsPnl.add(posPnl);
            }
        } catch (Exception e) {
            log.warn("Lỗi tính live position PnL cho user {}: {}", userId, e.getMessage());
        }

        return spotTotal.add(futuresTotal).add(activePositionsPnl);
    }

    /**
     * Tạo các mốc thời gian trong ngày (1D: 00:00 -> Hiện tại)
     */
    /**
     * Tạo 24 mốc thời gian rolling cho chu kỳ 1D (24 giờ gần nhất: từ giờ hiện tại - 23h đến giờ hiện tại)
     * Ví dụ: Hiện tại 11:36 ngày 27/09 -> Rolling từ 12:00 hôm qua đến 11:00 hôm nay.
     */
    private List<PnlChartPointDto> generateIntradayPoints(String userId, BigDecimal currentEquity) {
        List<PnlChartPointDto> points = new ArrayList<>();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime currentHourTime = now.truncatedTo(java.time.temporal.ChronoUnit.HOURS);

        BigDecimal roundedEquity = currentEquity.setScale(2, RoundingMode.HALF_UP);

        for (int i = 23; i >= 0; i--) {
            java.time.LocalDateTime targetHour = currentHourTime.minusHours(i);
            String timeLabel = targetHour.format(DateTimeFormatter.ofPattern("HH:00"));
            String fullTimestamp = targetHour.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            boolean isCurrentHour = (i == 0);

            points.add(PnlChartPointDto.builder()
                    .timestamp(fullTimestamp)
                    .dateLabel(isCurrentHour ? String.format("%s (Hiện tại)", timeLabel) : timeLabel)
                    .assetValue(roundedEquity)
                    .dailyPnl(BigDecimal.ZERO)
                    .dailyPnlPercent(BigDecimal.ZERO)
                    .cumulativePnl(BigDecimal.ZERO)
                    .build());
        }

        return points;
    }

    /**
     * Tạo các mốc thời gian rolling theo ngày khi chưa có snapshot cũ
     */
    private List<PnlChartPointDto> generateFallbackPoints(String userId, int days, BigDecimal currentEquity) {
        List<PnlChartPointDto> points = new ArrayList<>();
        LocalDate today = LocalDate.now();
        BigDecimal roundedEquity = currentEquity.setScale(2, RoundingMode.HALF_UP);

        if (days <= 30) {
            for (int i = days - 1; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                boolean isToday = (i == 0);
                String label = date.format(DateTimeFormatter.ofPattern("dd-MM"));

                points.add(PnlChartPointDto.builder()
                        .timestamp(date.toString())
                        .dateLabel(isToday ? String.format("%s (Hôm nay)", label) : label)
                        .assetValue(roundedEquity)
                        .dailyPnl(BigDecimal.ZERO)
                        .dailyPnlPercent(BigDecimal.ZERO)
                        .cumulativePnl(BigDecimal.ZERO)
                        .build());
            }
        } else {
            int step = Math.max(1, days / 25);
            for (int i = days; i >= 0; i -= step) {
                LocalDate date = today.minusDays(i);
                boolean isToday = (i == 0);
                String label = date.format(DateTimeFormatter.ofPattern("dd-MM"));

                points.add(PnlChartPointDto.builder()
                        .timestamp(date.toString())
                        .dateLabel(isToday ? String.format("%s (Hôm nay)", label) : label)
                        .assetValue(roundedEquity)
                        .dailyPnl(BigDecimal.ZERO)
                        .dailyPnlPercent(BigDecimal.ZERO)
                        .cumulativePnl(BigDecimal.ZERO)
                        .build());
            }
        }

        return points;
    }

    private BigDecimal calculatePercent(BigDecimal pnl, BigDecimal base) {
        if (pnl == null || base == null || base.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return pnl.divide(base, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateTodayPnl(String userId) {
        return BigDecimal.ZERO;
    }

    /**
     * Tiến trình tự động chụp Snapshot tài sản mỗi ngày lúc 00:00:00
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void captureDailySnapshots() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<String> allUserIds = walletBalanceRepo.findDistinctUserIds();

        for (String uid : allUserIds) {
            try {
                BigDecimal equity = calculateCurrentTotalEquity(uid);
                BigDecimal prevEquity = snapshotRepo.findByUserIdAndSnapshotDate(uid, yesterday.minusDays(1))
                        .map(UserDailyEquitySnapshot::getTotalEquity)
                        .orElse(equity);

                BigDecimal dailyPnl = equity.subtract(prevEquity);

                UserDailyEquitySnapshot snapshot = UserDailyEquitySnapshot.builder()
                        .userId(uid)
                        .snapshotDate(yesterday)
                        .totalEquity(equity)
                        .dailyPnl(dailyPnl)
                        .netDeposit(BigDecimal.ZERO)
                        .build();

                snapshotRepo.save(snapshot);
            } catch (Exception e) {
                log.error("Lỗi khi chụp snapshot tài sản cho user {}: {}", uid, e.getMessage());
            }
        }
    }

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }
        return (User) authentication.getPrincipal();
    }
}