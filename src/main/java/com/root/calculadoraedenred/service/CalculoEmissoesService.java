package com.root.calculadoraedenred.service;

import com.root.calculadoraedenred.dto.CalculoRequest;
import com.root.calculadoraedenred.dto.CalculoResponse;
import com.root.calculadoraedenred.dto.ItemCalculoRequest;
import com.root.calculadoraedenred.dto.ItemDetalhamentoResponse;
import com.root.calculadoraedenred.model.EmissionFactor;
import com.root.calculadoraedenred.model.enums.PaymentType;
import com.root.calculadoraedenred.repository.EmissionFactorRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CalculoEmissoesService {

    private final EmissionFactorRepository emissionFactorRepository;

    public CalculoEmissoesService(EmissionFactorRepository emissionFactorRepository) {
        this.emissionFactorRepository = emissionFactorRepository;
    }

    public CalculoResponse calcular(CalculoRequest request) {
        Map<PaymentType, Double> fatoresPorTipo = emissionFactorRepository.findAll().stream()
                .collect(Collectors.toMap(EmissionFactor::getPaymentType, EmissionFactor::getCo2GramsPerTransaction));

        List<ItemDetalhamentoResponse> detalhamento = new ArrayList<>();
        double totalGramas = 0.0;

        for (ItemCalculoRequest item : request.getItens()) {
            Double fator = fatoresPorTipo.get(item.getPaymentType());
            if (fator == null) {
                throw new IllegalStateException(
                        "Fator de emissão não cadastrado para paymentType: " + item.getPaymentType()
                );
            }

            double emissoes = item.getQuantidade() * fator;
            totalGramas += emissoes;

            detalhamento.add(new ItemDetalhamentoResponse(
                    item.getPaymentType(),
                    item.getQuantidade(),
                    fator,
                    emissoes
            ));
        }

        return new CalculoResponse(
                request.getEmpresaId(),
                totalGramas,

                totalGramas / 1000.0,
                detalhamento
        );
    }
}
