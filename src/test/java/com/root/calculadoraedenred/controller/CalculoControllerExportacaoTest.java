package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.service.CalculoEmissoesService;
import com.root.calculadoraedenred.service.RelatorioExportacaoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculoController.class)
class CalculoControllerExportacaoTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CalculoEmissoesService calculoService;

    @MockBean
    private RelatorioExportacaoService exportacaoService;

    private static final String REQUEST_JSON = """
            {
              "empresaId": 42,
              "itens": [
                { "paymentType": "PIX", "quantidade": 100 },
                { "paymentType": "PHYSICAL", "quantidade": 50 }
              ]
            }
            """;

    @Test
    void retornaPdf() throws Exception {
        byte[] pdfFake = "%PDF-1.4 conteudo".getBytes();
        when(exportacaoService.exportarPdf(any())).thenReturn(pdfFake);

        mockMvc.perform(post("/calculos/exportar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString(
                                "attachment; filename=\"relatorio-emissoes-empresa-42.pdf\"")))
                .andExpect(content().bytes(pdfFake));
    }

    @Test
    void requestInvalido() throws Exception {
        // empresaId ausente -> validação @NotNull falha antes de chamar o service
        String invalido = """
                { "itens": [ { "paymentType": "PIX", "quantidade": 10 } ] }
                """;

        mockMvc.perform(post("/calculos/exportar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalido))
                .andExpect(status().isBadRequest());
    }
}
