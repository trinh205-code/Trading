package com.slayer.binacet.entity;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor@Entity
@Table(name = "futures_orders")
public class FuturesOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private OrderSide side;
    private FuturesOrderType orderType;
    private FuturesOrderStatus status;
    @Column(precision = 36, scale = 18)
    private BigDecimal price;
    @Column(precision = 36, scale = 18)
    private BigDecimal stopPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal avgPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal totalQuantity;
    @Column(precision = 36, scale = 18)
    private BigDecimal remainingQuantity;
    @Column(precision = 36, scale = 18)
    private BigDecimal cancelledQuantity;
    private BigDecimal leverage;
    @Column(precision = 36, scale = 18)
    private BigDecimal takeProfitPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal stopLossPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal executedQuantity;

    private String marginCurrencyShortName;
    private String stage;          // default, exit, liquidate, tpsl_exit
    private String groupId;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pair", nullable = false)
    private FuturesInstrument instrument;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FuturesTrade> trades;
}
