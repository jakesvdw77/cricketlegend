package com.cricketlegend.repository;

import com.cricketlegend.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    @Query("SELECT p FROM Payment p " +
           "LEFT JOIN FETCH p.player " +
           "LEFT JOIN FETCH p.sponsor " +
           "LEFT JOIN FETCH p.tournament " +
           "ORDER BY p.paymentDate DESC")
    List<Payment> findAllWithRelations();

    /** Re-fetch a page of payments with JOIN FETCH to avoid N+1 after spec-based pagination. */
    @Query("SELECT p FROM Payment p " +
           "LEFT JOIN FETCH p.player LEFT JOIN FETCH p.sponsor LEFT JOIN FETCH p.tournament " +
           "WHERE p.paymentId IN :ids")
    List<Payment> findByIds(@Param("ids") List<Long> ids);
}
