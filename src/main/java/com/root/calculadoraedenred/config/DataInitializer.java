package com.root.calculadoraedenred.config;

import com.root.calculadoraedenred.model.EmissionFactor;
import com.root.calculadoraedenred.model.enums.PaymentType;
import com.root.calculadoraedenred.repository.EmissionFactorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EmissionFactorRepository emissionFactorRepository;

    // Fatores tropicalizados para o Brasil (matriz elétrica MCTI/SIRENE 2023: 38,5 kg CO2/MWh)
    private static final List<EmissionFactor> FATORES = List.of(
        new EmissionFactor(null, PaymentType.PHYSICAL, 0.98),
        new EmissionFactor(null, PaymentType.NFC,      0.85),
        new EmissionFactor(null, PaymentType.PIX,      0.13),
        new EmissionFactor(null, PaymentType.TED,      0.13),
        new EmissionFactor(null, PaymentType.UNKNOWN,  0.98)
    );

    @Override
    public void run(String... args) {
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
    }
}
