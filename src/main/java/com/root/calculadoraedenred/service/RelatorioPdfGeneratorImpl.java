package com.root.calculadoraedenred.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.root.calculadoraedenred.dto.CalculoResponse;
import com.root.calculadoraedenred.dto.ItemDetalhamentoResponse;
import org.springframework.stereotype.Service;
import com.root.calculadoraedenred.exception.RelatorioGeracaoException;

import java.io.ByteArrayOutputStream;

@Service
public class RelatorioPdfGeneratorImpl implements RelatorioPdfGenerator {

    private static final Font FONT_TITULO    = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD);
    private static final Font FONT_SUBTITULO = new Font(Font.FontFamily.HELVETICA, 13, Font.BOLD);
    private static final Font FONT_BODY      = new Font(Font.FontFamily.HELVETICA, 11);
    private static final Font FONT_HEADER    = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD, BaseColor.WHITE);

    @Override
    public byte[] gerar(CalculoResponse relatorio) {
        try {
            Document document = new Document();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, out);
            document.open();

            // Título
            Paragraph titulo = new Paragraph("Relatório de Sustentabilidade", FONT_TITULO);
            titulo.setAlignment(Element.ALIGN_CENTER);
            document.add(titulo);

            Paragraph subtitulo = new Paragraph("Edenred — Impacto Ambiental de Transações", FONT_BODY);
            subtitulo.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitulo);
            document.add(Chunk.NEWLINE);

            // Resumo geral
            document.add(new Paragraph("Resumo Geral", FONT_SUBTITULO));
            document.add(new Paragraph("Empresa ID: " + relatorio.getEmpresaId(), FONT_BODY));
            document.add(new Paragraph(
                    "Total de emissões: " + relatorio.getTotalEmissoesGramas() + " g  ("
                            + relatorio.getTotalEmissoesKg() + " kg)", FONT_BODY));
            document.add(Chunk.NEWLINE);

            // Tabela de detalhamento
            if (relatorio.getDetalhamentoPorTipo() != null && !relatorio.getDetalhamentoPorTipo().isEmpty()) {
                document.add(new Paragraph("Detalhamento por Tipo de Pagamento", FONT_SUBTITULO));
                document.add(Chunk.NEWLINE);

                PdfPTable tabela = new PdfPTable(4);
                tabela.setWidthPercentage(100);
                tabela.setWidths(new float[]{3f, 2f, 2.5f, 2.5f});

                adicionarCabecalho(tabela, "Tipo de Pagamento");
                adicionarCabecalho(tabela, "Quantidade");
                adicionarCabecalho(tabela, "CO2 por Transacao (g)");
                adicionarCabecalho(tabela, "Total Emissoes (g)");

                for (ItemDetalhamentoResponse item : relatorio.getDetalhamentoPorTipo()) {
                    tabela.addCell(new Phrase(String.valueOf(item.getPaymentType()), FONT_BODY));
                    tabela.addCell(new Phrase(String.valueOf(item.getQuantidade()), FONT_BODY));
                    tabela.addCell(new Phrase(String.valueOf(item.getCo2GramasPorTransacao()), FONT_BODY));
                    tabela.addCell(new Phrase(String.valueOf(item.getEmissoesGramas()), FONT_BODY));
                }

                document.add(tabela);
            }

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF", e);
        }
    }

    private void adicionarCabecalho(PdfPTable tabela, String texto) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, FONT_HEADER));
        cell.setBackgroundColor(new BaseColor(21, 95, 165));
        cell.setPadding(6);
        tabela.addCell(cell);
    }
}