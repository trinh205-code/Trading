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
@Table(name = "futures_wallet_transactions")
public class FuturesWalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "wallet_id", nullable = false)
    private String walletId;

    @Column(name = "user_id")
    private String userId;

    private String transactionType;    // credit, debit
    @Column(precision = 36, scale = 18)
    private BigDecimal amount;

    private String currencyShortName;
    private String reason;// by_universal_wallet, by_futures_order, by_futures_funding
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;


}
