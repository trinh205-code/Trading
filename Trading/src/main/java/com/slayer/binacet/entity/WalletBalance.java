package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "wallet_balances", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "currency"}))
public class WalletBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(nullable = false, length = 20)
    private String currency;

    // precision = 38 (Tổng tối đa 38 chữ số), scale = 8 (8 chữ số sau dấu phẩy)
    @Builder.Default
    @Column(nullable = false, precision = 38, scale = 8)
    private BigDecimal balance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "locked_balance", nullable = false, precision = 38, scale = 8)
    private BigDecimal lockedBalance = BigDecimal.ZERO;
}