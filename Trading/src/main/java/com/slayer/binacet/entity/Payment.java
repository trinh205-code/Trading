package com.slayer.binacet.entity;

import com.slayer.binacet.Enums.PaymentGateway;
import com.slayer.binacet.Enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", columnDefinition = "VARCHAR(32)", nullable = false)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentGateway paymentGateway;

    // Số tiền thanh toán bằng VNĐ (VD: 2,500,000 VND)
    @Column(precision = 18, scale = 2, nullable = false)
    private BigDecimal amountVnd;

    // Số lượng USDT nhận được (VD: 96.40 USDT)
    @Column(precision = 18, scale = 4, nullable = false)
    private BigDecimal usdtAmount;

    // Tỷ giá quy đổi tại thời điểm tạo đơn (VD: 25,933 VND/USDT)
    @Column(precision = 18, scale = 2)
    private BigDecimal exchangeRate;

    // Mã giao dịch nội bộ hệ thống gửi sang VNPAY (vnp_TxnRef)
    @Column(unique = true, nullable = false)
    private String transactionId;

    // Mã giao dịch phản hồi từ VNPAY (vnp_TransactionNo)
    private String gatewayPaymentId;

    // Ngân hàng giao dịch tại cổng VNPAY (vnp_BankCode)
    private String bankCode;

    // Mã kết quả xử lý từ cổng thanh toán (00 là thành công)
    private String responseCode;

    // Nội dung chuyển khoản/đơn hàng
    private String orderInfo;

    @CreationTimestamp
    private LocalDateTime initiatedAt;

    private LocalDateTime completedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Helper tương thích cho VnPayService (lấy số tiền VND dạng Long)
    public Long getAmount() {
        return amountVnd != null ? amountVnd.longValue() : 0L;
    }
}
