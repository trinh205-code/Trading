package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "user_daily_equity_snapshots",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "snapshot_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDailyEquitySnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(precision = 24, scale = 8)
    private BigDecimal totalEquity;     // Tổng tài sản (Spot + Futures)

    @Column(precision = 24, scale = 8)
    private BigDecimal netDeposit;      // Tổng tiền nạp/rút trong ngày (để trừ ra khỏi PnL)

    @Column(precision = 24, scale = 8)
    private BigDecimal dailyPnl;        // PnL sinh ra trong ngày

    @Column(precision = 24, scale = 8)
    private BigDecimal cumulativePnl;   // PnL tích lũy
}