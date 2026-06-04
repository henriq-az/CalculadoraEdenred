package com.root.calculadoraedenred.config;

import com.root.calculadoraedenred.model.EmissionFactor;
import com.root.calculadoraedenred.model.enums.PaymentType;
import com.root.calculadoraedenred.repository.EmissionFactorRepository;
import com.root.calculadoraedenred.repository.TransactionRepository;
import com.root.calculadoraedenred.model.Transaction;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EmissionFactorRepository emissionFactorRepository;
    private final TransactionRepository transactionRepository;
    private final JdbcTemplate jdbcTemplate;

    // Fatores tropicalizados para o Brasil (matriz elétrica MCTI/SIRENE 2023: 38,5 kg CO2/MWh)
    private static final List<EmissionFactor> FATORES = List.of(
        new EmissionFactor(null, PaymentType.PHYSICAL, 0.98),
        new EmissionFactor(null, PaymentType.NFC,      0.85),
        new EmissionFactor(null, PaymentType.PIX,      0.13),
        new EmissionFactor(null, PaymentType.TED,      0.13),
        new EmissionFactor(null, PaymentType.WALLET,   0.12),
        new EmissionFactor(null, PaymentType.QR,       0.05),
        new EmissionFactor(null, PaymentType.UNKNOWN,  0.98)
    );

    @Override
    public void run(String... args) {
        atualizarConstraintPaymentType();

        for (EmissionFactor fator : FATORES) {
            emissionFactorRepository.findByPaymentType(fator.getPaymentType())
                .ifPresentOrElse(
                    existente -> {
                        existente.setCo2GramsPerTransaction(fator.getCo2GramsPerTransaction());
                        emissionFactorRepository.save(existente);
                    },
                    () -> emissionFactorRepository.save(fator)
                );
        }

        if (transactionRepository.count() > 0) {
            return;
        }

        LocalDateTime baseDate = LocalDateTime.now();
        List<Transaction> transacoes = List.of(
            new Transaction(null, 1L, PaymentType.PIX, 150.00, baseDate.minusDays(24)),
            new Transaction(null, 1L, PaymentType.NFC, 89.90, baseDate.minusDays(21)),
            new Transaction(null, 1L, PaymentType.PIX, 45.00, baseDate.minusDays(18)),
            new Transaction(null, 1L, PaymentType.NFC, 210.00, baseDate.minusDays(14)),
            new Transaction(null, 1L, PaymentType.TED, 300.00, baseDate.minusDays(11)),
            new Transaction(null, 1L, PaymentType.PIX, 78.50, baseDate.minusDays(8)),
            new Transaction(null, 1L, PaymentType.PIX, 130.00, baseDate.minusDays(53)),
            new Transaction(null, 1L, PaymentType.NFC, 95.00, baseDate.minusDays(46)),
            new Transaction(null, 1L, PaymentType.NFC, 180.00, baseDate.minusDays(36)),
            new Transaction(null, 2L, PaymentType.NFC, 320.50, baseDate.minusDays(23)),
            new Transaction(null, 2L, PaymentType.TED, 1000.00, baseDate.minusDays(19)),
            new Transaction(null, 2L, PaymentType.NFC, 450.00, baseDate.minusDays(12)),
            new Transaction(null, 2L, PaymentType.PIX, 200.00, baseDate.minusDays(9)),
            new Transaction(null, 3L, PaymentType.PIX, 47.30, baseDate.minusDays(22)),
            new Transaction(null, 3L, PaymentType.PIX, 92.00, baseDate.minusDays(17)),
            new Transaction(null, 3L, PaymentType.PIX, 61.50, baseDate.minusDays(10)),
            new Transaction(null, 4L, PaymentType.TED, 200.00, baseDate.minusDays(24)),
            new Transaction(null, 4L, PaymentType.TED, 350.00, baseDate.minusDays(21)),
            new Transaction(null, 4L, PaymentType.NFC, 95.00, baseDate.minusDays(17)),
            new Transaction(null, 4L, PaymentType.PIX, 60.00, baseDate.minusDays(13)),
            new Transaction(null, 4L, PaymentType.NFC, 530.00, baseDate.minusDays(10)),
            new Transaction(null, 4L, PaymentType.NFC, 275.00, baseDate.minusDays(7)),
            new Transaction(null, 5L, PaymentType.PHYSICAL, 120.00, baseDate.minusDays(20)),
            new Transaction(null, 5L, PaymentType.PHYSICAL,  85.50, baseDate.minusDays(15)),
            new Transaction(null, 5L, PaymentType.UNKNOWN,   60.00, baseDate.minusDays(10)),
            new Transaction(null, 5L, PaymentType.UNKNOWN,   95.00, baseDate.minusDays(5))
        );

        transactionRepository.saveAll(transacoes);
    }

    private void atualizarConstraintPaymentType() {
        String valores = Arrays.stream(PaymentType.values())
                .map(p -> "'" + p.name() + "'")
                .collect(Collectors.joining(", "));
        jdbcTemplate.execute("ALTER TABLE emission_factors DROP CONSTRAINT IF EXISTS emission_factors_payment_type_check");
        jdbcTemplate.execute("ALTER TABLE emission_factors ADD CONSTRAINT emission_factors_payment_type_check CHECK (payment_type IN (" + valores + "))");
    }
}
