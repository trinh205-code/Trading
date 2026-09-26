package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_hourly_equity_snapshots",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "snapshot_time"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserHourlyEquitySnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "snapshot_time", nullable = false)
    private LocalDateTime snapshotTime;

    @Column(precision = 24, scale = 8)
    private BigDecimal totalEquity;

    @Column(precision = 24, scale = 8)
    private BigDecimal hourlyPnl;
}