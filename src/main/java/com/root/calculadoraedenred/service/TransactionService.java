package com.root.calculadoraedenred.service;

import com.root.calculadoraedenred.dto.ImpactDTO;
import com.root.calculadoraedenred.dto.ScoreDTO;
import com.root.calculadoraedenred.dto.TransactionDTO;
import com.root.calculadoraedenred.model.Transaction;
import com.root.calculadoraedenred.model.enums.PaymentType;
import com.root.calculadoraedenred.model.enums.Period;
import com.root.calculadoraedenred.repository.EmissionFactorRepository;
import com.root.calculadoraedenred.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final EmissionFactorRepository emissionFactorRepository;

    private static final Map<PaymentType, Double> DEFAULT_FACTORS = new EnumMap<>(Map.of(
        PaymentType.PHYSICAL, 0.98,
        PaymentType.TED,      0.13,
        PaymentType.PIX,      0.13,
        PaymentType.NFC,      0.85,
        PaymentType.UNKNOWN,  0.98
    ));

    private static final Map<PaymentType, Double> SCORE_WEIGHTS = new EnumMap<>(Map.of(
        PaymentType.PIX,      1.00,
        PaymentType.TED,      1.00,
        PaymentType.QR,       1.00,
        PaymentType.WALLET,   0.75,
        PaymentType.NFC,      0.40,
        PaymentType.PHYSICAL, 0.00,
        PaymentType.UNKNOWN,  0.00
    ));

    public List<TransactionDTO> getHistory(Long companyId, LocalDate startDate, LocalDate endDate) {
        Map<PaymentType, Double> factors = buildFactorMap();
        return transactionRepository
            .findByCompanyIdAndTransactionDateBetweenOrderByTransactionDateDesc(
                companyId,
                startDate.atStartOfDay(),
                endDate.atTime(LocalTime.MAX))
            .stream()
            .map(t -> toDTO(t, factors))
            .collect(Collectors.toList());
    }

    public ScoreDTO calculateScore(Long companyId, LocalDate startDate, LocalDate endDate) {
        Map<PaymentType, Double> factors = buildFactorMap();
        double physicalFactor = factors.getOrDefault(PaymentType.PHYSICAL, 500.0);

        List<Transaction> transactions = transactionRepository
            .findByCompanyIdAndTransactionDateBetweenOrderByTransactionDateDesc(
                companyId,
                startDate.atStartOfDay(),
                endDate.atTime(LocalTime.MAX));

        double actualCO2 = transactions.stream()
            .mapToDouble(t -> factors.getOrDefault(t.getPaymentType(), physicalFactor))
            .sum();

        double baselineCO2 = transactions.size() * physicalFactor;
        double co2Saved = baselineCO2 - actualCO2;
        double somaGanhos = transactions.stream()
            .mapToDouble(t -> SCORE_WEIGHTS.getOrDefault(t.getPaymentType(), 0.0))
            .sum();
        double score = transactions.isEmpty() ? 0.0
            : Math.min(100, (somaGanhos / transactions.size()) * 100);

        long digitalCount = transactions.stream()
            .filter(t -> t.getPaymentType() != PaymentType.PHYSICAL
                      && t.getPaymentType() != PaymentType.UNKNOWN)
            .count();

        String label = resolveLabel(score);

        return new ScoreDTO(score, label, actualCO2, baselineCO2, co2Saved,
            transactions.size(), digitalCount, startDate, endDate);
    }

    public ImpactDTO calculateImpact(Long companyId, String periodStr) {
        Period period;
        try {
            period = Period.valueOf(periodStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Período inválido: '" + periodStr + "'. Use: weekly, monthly ou yearly.");
        }

        LocalDate hoje = LocalDate.now();
        LocalDate start = switch (period) {
            case WEEKLY  -> hoje.minusDays(7);
            case MONTHLY -> hoje.withDayOfMonth(1);
            case YEARLY  -> LocalDate.of(hoje.getYear(), 1, 1);
        };

        ScoreDTO base = calculateScore(companyId, start, hoje);
        double co2 = base.getCo2Saved();

        String label = switch (period) {
            case WEEKLY  -> "últimos 7 dias";
            case MONTHLY -> "mês atual";
            case YEARLY  -> "este ano";
        };

        return new ImpactDTO(co2, co2 / 21_000.0, co2 / 120.0, label, period.name().toLowerCase());
    }

    private String resolveLabel(double score) {
        if (score <= 15.0) return "Semente";
        if (score <= 50.0) return "Arbusto";
        if (score <= 85.0) return "Árvore";
        return "Floresta";
    }

    private Map<PaymentType, Double> buildFactorMap() {
        Map<PaymentType, Double> factors = new EnumMap<>(DEFAULT_FACTORS);
        emissionFactorRepository.findAll()
            .forEach(ef -> factors.put(ef.getPaymentType(), ef.getCo2GramsPerTransaction()));
        return factors;
    }

    private TransactionDTO toDTO(Transaction t, Map<PaymentType, Double> factors) {
        double co2 = factors.getOrDefault(t.getPaymentType(),
            DEFAULT_FACTORS.getOrDefault(t.getPaymentType(), 500.0));
        return new TransactionDTO(
            t.getId(), t.getCompanyId(), t.getPaymentType().name(),
            t.getAmount(), t.getTransactionDate(), co2);
    }
}
