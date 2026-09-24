package com.slayer.binacet.entity;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
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

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true)
    private String clientOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market", nullable = false)
    private Market market;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<Trade> trades;

    private OrderSide side;
    private OrderType orderType;
    private OrderStatus status;

    @Column(precision = 24, scale = 8)
    private BigDecimal totalQuantity;

    @Column(precision = 24, scale = 8)
    private BigDecimal remainingQuantity;

    @Column(precision = 24, scale = 8)
    private BigDecimal pricePerUnit;

    @Column(precision = 24, scale = 8)
    private BigDecimal avgPrice;

    @Column(precision = 24, scale = 8)
    private BigDecimal feeAmount;

    @Column(precision = 24, scale = 8)
    private BigDecimal lockedAmount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
        // Khi vừa tạo lệnh, số lượng còn lại chính bằng tổng số lượng đặt
        this .remainingQuantity = this.totalQuantity;

        if (this.feeAmount == null) {
            this.feeAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

}
