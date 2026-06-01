package com.root.calculadoraedenred.repository;

import com.root.calculadoraedenred.model.EmissionFactor;
import com.root.calculadoraedenred.model.enums.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmissionFactorRepository
        extends JpaRepository<EmissionFactor, Long> {

    Optional<EmissionFactor> findByPaymentType(PaymentType paymentType);
}