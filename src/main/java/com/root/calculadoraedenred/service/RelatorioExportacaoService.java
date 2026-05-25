package com.root.calculadoraedenred.service;

import com.root.calculadoraedenred.dto.CalculoRequest;
import com.root.calculadoraedenred.dto.CalculoResponse;
import com.root.calculadoraedenred.exception.RelatorioGeracaoException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RelatorioExportacaoService {

    private final CalculoEmissoesService calculoService;
    private final Optional<RelatorioPdfGenerator> pdfGenerator;

    public RelatorioExportacaoService(CalculoEmissoesService calculoService,
                                      Optional<RelatorioPdfGenerator> pdfGenerator) {
        this.calculoService = calculoService;
        this.pdfGenerator = pdfGenerator;
    }

    public byte[] exportarPdf(CalculoRequest request) {
        RelatorioPdfGenerator generator = pdfGenerator.orElseThrow(() ->
                new RelatorioGeracaoException(
                        "Geração de PDF indisponível: nenhuma implementação de "
                                + "RelatorioPdfGenerator registrada (dependência de PDF pendente)."));

        CalculoResponse relatorio = calculoService.calcular(request);

        try {
            byte[] pdf = generator.gerar(relatorio);
            if (pdf == null || pdf.length == 0) {
                throw new RelatorioGeracaoException("Geração de PDF retornou conteúdo vazio.");
            }
            return pdf;
        } catch (RelatorioGeracaoException e) {
            throw e;
        } catch (Exception e) {
            throw new RelatorioGeracaoException(
                    "Falha ao gerar o PDF do relatório de emissões.", e);
        }
    }
}
