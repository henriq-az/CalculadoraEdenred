package com.root.calculadoraedenred.repository;

import com.root.calculadoraedenred.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByCompanyIdAndTransactionDateBetweenOrderByTransactionDateDesc(
        Long companyId, LocalDateTime start, LocalDateTime end);


}