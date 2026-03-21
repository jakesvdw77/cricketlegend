package com.cricketlegend.repository;

import com.cricketlegend.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("SELECT p FROM Payment p " +
           "LEFT JOIN FETCH p.player " +
           "LEFT JOIN FETCH p.sponsor " +
           "LEFT JOIN FETCH p.tournament " +
           "ORDER BY p.paymentDate DESC")
    List<Payment> findAllWithRelations();
}
