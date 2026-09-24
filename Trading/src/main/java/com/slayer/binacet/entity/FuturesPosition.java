package com.slayer.binacet.entity;

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
@NoArgsConstructor
@Entity
@Table(name = "futures_positions")
public class FuturesPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "symbol", nullable = false)
    private FuturesInstrument instrument;

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FuturesTransaction> transactions;


    @Column(precision = 36, scale = 18)
    private BigDecimal activePos;
    @Column(precision = 36, scale = 18)
    private BigDecimal avgPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal liquidationPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal lockedMargin;
    @Column(precision = 36, scale = 18)
    private BigDecimal lockedUserMargin;
    @Column(precision = 36, scale = 18)
    private BigDecimal lockedOrderMargin;
    private BigDecimal leverage;
    @Column(precision = 36, scale = 18)
    private BigDecimal markPrice;
    @Column(precision = 36, scale = 18)
    private BigDecimal maintenanceMargin;
    private String marginCurrencyShortName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
