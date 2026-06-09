package com.root.calculadoraedenred.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.root.calculadoraedenred.dto.CalculoRequest;
import com.root.calculadoraedenred.dto.CalculoResponse;
import com.root.calculadoraedenred.dto.ItemDetalhamentoResponse;
import com.root.calculadoraedenred.exception.RelatorioGeracaoException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RelatorioPdfGeneratorImpl implements RelatorioPdfGenerator {

    // ── Paleta ────────────────────────────────────────────────────────────────
    private static final BaseColor CINZA_TITULO = new BaseColor(74,  74,  74);   // #4A4A4A
    private static final BaseColor BORDA        = new BaseColor(221, 221, 221);  // #DDDDDD
    private static final BaseColor ZEBRA        = new BaseColor(249, 249, 249);  // #F9F9F9
    private static final BaseColor TEXTO        = new BaseColor(26,  26,  26);   // #1A1A1A
    private static final BaseColor COR_RODAPE   = new BaseColor(119, 119, 119);  // #777777

    // ── Tipografia ────────────────────────────────────────────────────────────
    private static final Font FONT_TITULO_BARRA = new Font(Font.FontFamily.HELVETICA, 13, Font.BOLD,   BaseColor.WHITE);
    private static final Font FONT_SECAO_BARRA  = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD,   BaseColor.WHITE);
    private static final Font FONT_CORPO        = new Font(Font.FontFamily.HELVETICA, 11, Font.NORMAL, TEXTO);
    private static final Font FONT_CORPO_BOLD   = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD,   TEXTO);
    private static final Font FONT_LABEL        = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL, TEXTO);
    private static final Font FONT_META         = new Font(Font.FontFamily.HELVETICA,  9, Font.NORMAL, TEXTO);
    private static final Font FONT_HEADER_TAB   = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD,   BaseColor.WHITE);
    private static final Font FONT_RODAPE_FONT  = new Font(Font.FontFamily.HELVETICA,  9, Font.NORMAL, COR_RODAPE);

    // Margens: 2 cm ≈ 56.7 pt (ABNT)
    private static final float MARGEM = 56.7f;

    @Override
    public byte[] gerar(CalculoResponse relatorio, CalculoRequest ctx) {
        try {
            Document doc = new Document(PageSize.A4, MARGEM, MARGEM, MARGEM, MARGEM);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(doc, out);
            doc.open();

            // ── Logo ─────────────────────────────────────────────────────────
            try {
                // Renderiza em alta resolução (600 px); iText redimensiona para exibição
                byte[] logoBytes = svgLogoBytes(600f);
                Image logo = Image.getInstance(logoBytes);
                logo.scaleToFit(160f, 60f);  // tamanho de exibição no PDF

                PdfPTable logoWrapper = new PdfPTable(1);
                logoWrapper.setWidthPercentage(100);
                logoWrapper.setSpacingAfter(6);
                PdfPCell logoCell = new PdfPCell(logo, false);
                logoCell.setBorder(Rectangle.NO_BORDER);
                logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                logoCell.setPaddingBottom(6);
                logoWrapper.addCell(logoCell);
                doc.add(logoWrapper);
            } catch (Exception ignored) {
                Paragraph fallback = new Paragraph("Edenred", FONT_CORPO_BOLD);
                fallback.setAlignment(Element.ALIGN_CENTER);
                fallback.setSpacingAfter(4);
                doc.add(fallback);
            }

            // ── Barra do título ───────────────────────────────────────────────
            doc.add(barraTitulo("RELATÓRIO DE SUSTENTABILIDADE — EDENRED", 6f));

            // ── Linha de metadados ────────────────────────────────────────────
            StringBuilder meta = new StringBuilder();
            if (ctx.getNomeEmpresa() != null && !ctx.getNomeEmpresa().isBlank()) {
                meta.append(ctx.getNomeEmpresa());
            }
            if (ctx.getPeriodoReferencia() != null && !ctx.getPeriodoReferencia().isBlank()) {
                if (meta.length() > 0) meta.append("   |   ");
                meta.append("Período: ").append(ctx.getPeriodoReferencia());
            }
            if (meta.length() > 0) {
                Paragraph metaLine = new Paragraph(meta.toString(), FONT_META);
                metaLine.setAlignment(Element.ALIGN_CENTER);
                metaLine.setSpacingBefore(5);
                metaLine.setSpacingAfter(2);
                doc.add(metaLine);
            }

            // ── Seção: Métricas de Sustentabilidade ───────────────────────────
            boolean temKpis = ctx.getCo2Evitado() != null
                    || ctx.getArvoresEquivalentes() != null
                    || ctx.getScoreSustentabilidade() != null
                    || ctx.getPercentualDigital() != null;

            if (temKpis) {
                doc.add(barraTitulo("MÉTRICAS DE SUSTENTABILIDADE", 16f));

                PdfPTable kpis = new PdfPTable(new float[]{60f, 40f});
                kpis.setWidthPercentage(100);
                kpis.setSpacingAfter(4);

                int r = 0;
                kpis.addCell(celulaKpiLabel("CO² Evitado",                  r));
                kpis.addCell(celulaKpiValor(fmtCo2(ctx.getCo2Evitado()),     r++));
                kpis.addCell(celulaKpiLabel("Árvores Equivalentes",          r));
                kpis.addCell(celulaKpiValor(fmtNum(ctx.getArvoresEquivalentes()), r++));
                kpis.addCell(celulaKpiLabel("Score de Sustentabilidade",     r));
                kpis.addCell(celulaKpiValor(fmtScore(ctx.getScoreSustentabilidade()), r++));
                kpis.addCell(celulaKpiLabel("Transações Digitais",           r));
                kpis.addCell(celulaKpiValor(fmtPct(ctx.getPercentualDigital()), r));

                doc.add(kpis);
            }

            // ── Seção: Detalhamento por Tipo de Pagamento ─────────────────────
            List<ItemDetalhamentoResponse> detalhes = relatorio.getDetalhamentoPorTipo();
            if (detalhes != null && !detalhes.isEmpty()) {
                doc.add(barraTitulo("DETALHAMENTO POR TIPO DE PAGAMENTO", 16f));

                PdfPTable tabela = new PdfPTable(new float[]{3f, 2f, 2.5f, 2.5f});
                tabela.setWidthPercentage(100);
                tabela.setSpacingAfter(4);

                // Cabeçalho
                for (String col : new String[]{"Tipo de Pagamento", "Quantidade",
                        "CO2 por Transação (g)", "Total de Emissões (g)"}) {
                    tabela.addCell(celulaHeaderTabela(col));
                }

                // Dados com zebra
                int row = 0;
                for (ItemDetalhamentoResponse item : detalhes) {
                    BaseColor bg = (row % 2 == 0) ? BaseColor.WHITE : ZEBRA;
                    tabela.addCell(celulaTabela(String.valueOf(item.getPaymentType()), FONT_CORPO, bg));
                    tabela.addCell(celulaTabela(String.valueOf(item.getQuantidade()), FONT_CORPO, bg));
                    tabela.addCell(celulaTabela(String.valueOf(item.getCo2GramasPorTransacao()), FONT_CORPO, bg));
                    tabela.addCell(celulaTabela(String.valueOf(item.getEmissoesGramas()), FONT_CORPO, bg));
                    row++;
                }
                doc.add(tabela);
            }

            // ── Seção: Resumo Geral ───────────────────────────────────────────
            doc.add(barraTitulo("RESUMO GERAL", 16f));

            doc.add(linhaDados("Empresa ID:", String.valueOf(relatorio.getEmpresaId())));
            doc.add(linhaDados("Total de emissões:",
                    relatorio.getTotalEmissoesGramas() + " g  (" + relatorio.getTotalEmissoesKg() + " kg)"));

            // ── Rodapé ────────────────────────────────────────────────────────
            PdfPTable rodape = new PdfPTable(1);
            rodape.setWidthPercentage(100);
            rodape.setSpacingBefore(24);

            PdfPCell linhaRodape = new PdfPCell(new Phrase(""));
            linhaRodape.setBorderWidthTop(0.5f);
            linhaRodape.setBorderColorTop(BORDA);
            linhaRodape.setBorderWidthBottom(0);
            linhaRodape.setBorderWidthLeft(0);
            linhaRodape.setBorderWidthRight(0);
            linhaRodape.setFixedHeight(4f);
            rodape.addCell(linhaRodape);

            String dataGeracao = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String textoRodapeStr = "Gerado em: " + dataGeracao
                    + "   •   Empresa ID: " + relatorio.getEmpresaId()
                    + "   •   Edenred — Gestão de Benefícios";
            PdfPCell celulaRodape = new PdfPCell(new Phrase(textoRodapeStr, FONT_RODAPE_FONT));
            celulaRodape.setBorder(Rectangle.NO_BORDER);
            celulaRodape.setHorizontalAlignment(Element.ALIGN_CENTER);
            celulaRodape.setPaddingTop(5);
            rodape.addCell(celulaRodape);
            doc.add(rodape);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RelatorioGeracaoException("Erro ao gerar PDF: " + e.getMessage());
        }
    }

    // ── Helpers de layout ─────────────────────────────────────────────────────

    private PdfPTable barraTitulo(String texto, float spacingBefore) throws DocumentException {
        PdfPTable barra = new PdfPTable(1);
        barra.setWidthPercentage(100);
        barra.setSpacingBefore(spacingBefore);
        barra.setSpacingAfter(8);

        Font font = texto.length() > 40 ? FONT_TITULO_BARRA : FONT_SECAO_BARRA;
        PdfPCell cell = new PdfPCell(new Phrase(texto, font));
        cell.setBackgroundColor(CINZA_TITULO);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        barra.addCell(cell);
        return barra;
    }

    private PdfPCell celulaHeaderTabela(String texto) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, FONT_HEADER_TAB));
        cell.setBackgroundColor(CINZA_TITULO);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        return cell;
    }

    private PdfPCell celulaTabela(String texto, Font font, BaseColor bg) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, font));
        cell.setBackgroundColor(bg);
        cell.setBorderWidthLeft(0);
        cell.setBorderWidthRight(0);
        cell.setBorderWidthTop(0);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(BORDA);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        return cell;
    }

    private PdfPCell celulaKpiLabel(String texto, int row) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, FONT_LABEL));
        cell.setBackgroundColor(row % 2 == 0 ? BaseColor.WHITE : ZEBRA);
        cell.setBorderWidthLeft(0);
        cell.setBorderWidthRight(0);
        cell.setBorderWidthTop(0);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(BORDA);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        return cell;
    }

    private PdfPCell celulaKpiValor(String texto, int row) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, FONT_CORPO_BOLD));
        cell.setBackgroundColor(row % 2 == 0 ? BaseColor.WHITE : ZEBRA);
        cell.setBorderWidthLeft(0);
        cell.setBorderWidthRight(0);
        cell.setBorderWidthTop(0);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(BORDA);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        return cell;
    }

    private Paragraph linhaDados(String label, String valor) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", FONT_CORPO));
        p.add(new Chunk(valor, FONT_CORPO_BOLD));
        p.setSpacingAfter(4);
        p.setIndentationLeft(8);
        return p;
    }

    private byte[] svgLogoBytes(float w) throws Exception {
        byte[] svgBytes = lerSvgLogo();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PNGTranscoder tc = new PNGTranscoder();
        // Só define largura — Batik calcula a altura proporcional ao viewBox do SVG
        tc.addTranscodingHint(PNGTranscoder.KEY_WIDTH, w);
        tc.transcode(
                new TranscoderInput(new java.io.ByteArrayInputStream(svgBytes)),
                new TranscoderOutput(out));
        return out.toByteArray();
    }

    /**
     * Carrega a logo da Edenred. O backend não embute o SVG no classpath, então
     * lê o arquivo que já existe nos assets do frontend. Tenta alguns caminhos
     * relativos ao diretório de trabalho e, por fim, o classpath como fallback.
     */
    private byte[] lerSvgLogo() throws Exception {
        String[] candidatos = {
                "frontend/src/assets/Edenred_Logo.svg",
                "../frontend/src/assets/Edenred_Logo.svg",
        };
        for (String caminho : candidatos) {
            java.nio.file.Path p = java.nio.file.Paths.get(caminho);
            if (java.nio.file.Files.isReadable(p)) {
                return java.nio.file.Files.readAllBytes(p);
            }
        }
        try (java.io.InputStream svgStream = getClass().getResourceAsStream("/edenred_logo.svg")) {
            if (svgStream != null) {
                return svgStream.readAllBytes();
            }
        }
        throw new IllegalStateException("Logo da Edenred não encontrada (frontend/src/assets/Edenred_Logo.svg)");
    }

    // ── Formatadores ──────────────────────────────────────────────────────────

    private String fmtCo2(Double gramas) {
        if (gramas == null) return "N/D";
        if (gramas >= 1_000_000) return String.format("%.1f t", gramas / 1_000_000);
        if (gramas >= 1_000)     return String.format("%.1f kg", gramas / 1_000);
        return String.format("%.0f g", gramas);
    }

    private String fmtNum(Double val) {
        if (val == null) return "N/D";
        return String.format("%.0f", val);
    }

    private String fmtScore(Double score) {
        if (score == null) return "N/D";
        return String.format("%.0f/100", score);
    }

    private String fmtPct(Double pct) {
        if (pct == null) return "N/D";
        return String.format("%.0f%%", pct);
    }
}
