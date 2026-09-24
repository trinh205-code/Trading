package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "futures_wallets")
public class FuturesWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "currency_short_name", nullable = false, length = 10)
    private String currencyShortName; // USDT, BTC, VND

    @Builder.Default
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal balance = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal lockedBalance = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Isolated only: Free Margin = balance (vì lockMargin đã trừ vào balance rồi). */
    public BigDecimal getAvailableMargin() {
        BigDecimal free = this.balance != null ? this.balance : BigDecimal.ZERO;
        return free.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : free;
    }
}