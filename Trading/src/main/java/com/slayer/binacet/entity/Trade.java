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
@Table(name = "trades")
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private String symbol;
    private OrderSide side;

    @Column(precision = 24, scale = 8)
    private BigDecimal price;

    @Column(precision = 24, scale = 8)
    private BigDecimal quantity;

    @Column(precision = 24, scale = 8)
    private BigDecimal feeAmount;

    private Instant timestamp;


    // Đánh dấu nơi khớp lệnh: "INTERNAL" (Khớp nội bộ), "BINANCE",...
    @Column(name = "execution_venue", length = 50)
    private String executionVenue;
}

