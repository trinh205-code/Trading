package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "margin_internal_orders")
public class MarginInternalOrder {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "margin_order_id", nullable = false)
    private MarginOrder marginOrder;

    private String status;     // initial, open, partially_filled, filled, cancelled, rejected, partially_cancelled, untriggered
    private String boStage;    // stage_entry, stage_target, stage_sl
    private BigDecimal totalQuantity;
    private BigDecimal filledQuantity;
    private BigDecimal cancelledQuantity;
    private BigDecimal pricePerUnit;
}
