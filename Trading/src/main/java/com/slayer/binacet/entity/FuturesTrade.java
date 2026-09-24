package com.slayer.binacet.entity;

import com.slayer.binacet.Enums.OrderSide;
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
@Table(name = "futures_trades")
public class FuturesTrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private FuturesOrder order;


    @Column(precision = 36, scale = 18)
    private BigDecimal price;
    @Column(precision = 36, scale = 18)
    private BigDecimal quantity;
    @Column(precision = 36, scale = 18)
    private BigDecimal feeAmount;
    private String symbol;
    private OrderSide side;

    private Boolean isMaker;
    private Instant timestamp;
}
