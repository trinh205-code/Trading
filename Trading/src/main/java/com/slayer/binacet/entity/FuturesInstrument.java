package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "futures_instruments")
public class FuturesInstrument {

    @Id
    @Column(name = "symbol", length = 32, nullable = false)
    private String symbol;                      // BTCUSDT, ETHUSDT

    @Column(name = "base_asset", length = 16)
    private String baseAsset;                   // BTC, ETH (dùng load icon & hiển thị tên)

    @Column(name = "quote_asset", length = 16)
    private String quoteAsset;                  // USDT

    @Column(name = "margin_currency_short_name", length = 16)
    private String marginCurrencyShortName;     // USDT

    @Column(name = "kind", length = 32)
    private String kind;                        // perpetual

    @Column(name = "maintenance_margin_rate", precision = 10, scale = 6)
    private BigDecimal maintenanceMarginRate;

    @Column(precision = 36, scale = 18)
    private BigDecimal lastPrice;

    @Column(precision = 36, scale = 18)
    private BigDecimal markPrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal maxLeverageLong;

    @Column(precision = 10, scale = 2)
    private BigDecimal maxLeverageShort;

    @Column(precision = 36, scale = 18)
    private BigDecimal priceIncrement;          // tickSize (làm tròn giá)

    @Column(precision = 36, scale = 18)
    private BigDecimal quantityIncrement;       // stepSize (làm tròn số lượng)

    @Column(precision = 36, scale = 18)
    private BigDecimal minPrice;

    @Column(precision = 36, scale = 18)
    private BigDecimal maxPrice;

    @Column(precision = 36, scale = 18)
    private BigDecimal minNotional;             // Giá trị lệnh tối thiểu (VD: 5 USDT)

    @Column(precision = 10, scale = 6)
    private BigDecimal makerFee;

    @Column(precision = 10, scale = 6)
    private BigDecimal takerFee;

    private Integer fundingFrequency;           // 8 (hours)

    @Column(length = 16)
    private String status;                      // active, inactive

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "instrument", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FuturesPosition> positions;

    @OneToMany(mappedBy = "instrument", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FuturesOrder> orders;
}