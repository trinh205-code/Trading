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
import java.util.List;

/** Margin (leveraged spot) bracket order. See /exchange/v1/margin/*. */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "margin_orders")
public class MarginOrder {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market", nullable = false)
    private Market market;

    @OneToMany(mappedBy = "marginOrder", cascade = CascadeType.ALL)
    private List<MarginInternalOrder> internalOrders;



    private String side;
    private String orderType;
    private String status;             // init, open, partial_entry, partial_close, close, cancelled, rejected, triggered




    @Column(precision = 36, scale = 18)
    private BigDecimal price;
    @Column(precision = 36, scale = 18)
    private BigDecimal quantity;
    @Column(precision = 36, scale = 18)
    private BigDecimal leverage;
    @Column(precision = 36, scale = 18)
    private BigDecimal slPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal targetPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal stopPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal pnl;
    @Column(precision = 36, scale = 18)
    private BigDecimal initialMargin;

    private Boolean trailingSl;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
