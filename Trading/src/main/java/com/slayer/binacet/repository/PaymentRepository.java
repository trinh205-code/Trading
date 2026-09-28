package com.slayer.binacet.repository;

import com.slayer.binacet.Enums.PaymentStatus;
import com.slayer.binacet.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionId(String transactionId);
    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT p FROM Payment p WHERE p.paymentStatus = :status AND COALESCE(p.createdAt, p.initiatedAt) < :cutoff")
    List<Payment> findPendingPaymentsOlderThan(@Param("status") PaymentStatus status, @Param("cutoff") LocalDateTime cutoff);
}
