package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "markets")
public class Market {

    @Id
    private String symbol;

    private String pair;
    private String baseCurrencyShortName;
    private String targetCurrencyShortName;
    private String status;

    @Column(precision = 24, scale = 8)
    private BigDecimal minQuantity;

    @Column(precision = 24, scale = 8)
    private BigDecimal maxQuantity;

    @Column(precision = 24, scale = 8)
    private BigDecimal minPrice;

    @Column(precision = 24, scale = 8)
    private BigDecimal maxPrice;

    @Column(precision = 24, scale = 8)
    private BigDecimal minNotional;



    @OneToMany(mappedBy = "market", fetch = FetchType.LAZY)
    private List<MarginOrder> marginOrders;
}
