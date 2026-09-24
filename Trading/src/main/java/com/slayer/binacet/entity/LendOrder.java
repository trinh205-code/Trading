package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "lend_orders")
public class LendOrder {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String currencyShortName;
    @Column(precision = 36, scale = 18)
    private BigDecimal amount;
    @Column(precision = 36, scale = 18)
    private BigDecimal interest;
    private String interestType;   // simple
    private Integer duration;      // days
    private String side;           // lend
    private String status;         // open, close, exit
    private Instant createdAt;
    private Instant settledAt;
}
