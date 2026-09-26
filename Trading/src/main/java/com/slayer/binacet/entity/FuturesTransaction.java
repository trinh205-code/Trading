package com.slayer.binacet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "futures_transactions")
public class FuturesTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private FuturesPosition position;

    private String symbol;
    private String stage;          // default, funding, exit, tpsl_exit, liquidation
    @Column(precision = 36, scale = 18)
    private BigDecimal amount;
    @Column(precision = 36, scale = 18)
    private BigDecimal feeAmount;

    @Column(precision = 36, scale = 18)
    private BigDecimal entryPrice; // Giá vào lúc đóng lệnh / thanh lý

    @Column(precision = 10, scale = 2)
    private BigDecimal leverage;   // Đòn bẩy sử dụng lúc đó

    private String source;         // user, system
    private String parentType;
    private String parentId;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;


}
