package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "funding_transactions")
public class FundingTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(length = 20, nullable = false)
    private String asset; // USDT, BTC, ETH...

    @Column(length = 50, nullable = false)
    private String type; // P2P, Airdrop và phần thưởng, Chuyển ví, Nạp tiền, Rút tiền

    @Column(precision = 36, scale = 8, nullable = false)
    private BigDecimal amount; // +20.00000000 hoặc -20.00000000

    @Column(precision = 36, scale = 8, nullable = false)
    private BigDecimal balanceAfter; // Số dư sau giao dịch

    @Column(length = 255)
    private String note; // Đặt lệnh USDT, Đã nhận USDT, Chuyển sang Ví Futures...

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
