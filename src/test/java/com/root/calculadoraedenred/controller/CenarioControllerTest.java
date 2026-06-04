package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.dto.CenarioResponse;
import com.root.calculadoraedenred.service.CenarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CenarioController.class)
class CenarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CenarioService cenarioService;

    private static final String SALVAR_JSON = """
            {
              "nome": "Migração agressiva para PIX",
              "simulacao": {
                "empresaId": 7,
                "distribuicaoAtual": [
                  { "paymentType": "PHYSICAL", "quantidade": 500 }
                ],
                "distribuicaoSimulada": [
                  { "paymentType": "PIX", "quantidade": 500 }
                ]
              }
            }
            """;

    @Test
    void salvarRetornaCreated() throws Exception {
        CenarioResponse salvo = new CenarioResponse(
                1L, "Migração agressiva para PIX", 7L,
                490.0, 65.0, 425.0, 0.425, 86.73, null, null, null, LocalDateTime.now());

        when(cenarioService.salvar(any())).thenReturn(salvo);

        mockMvc.perform(post("/cenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SALVAR_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nome").value("Migração agressiva para PIX"))
                .andExpect(jsonPath("$.empresaId").value(7))
                .andExpect(jsonPath("$.economiaGramas").value(425.0))
                .andExpect(jsonPath("$.economiaKg").value(0.425));
    }

    @Test
    void salvarSemNomeRetornaBadRequest() throws Exception {
        String invalido = """
                {
                  "simulacao": {
                    "empresaId": 7,
                    "distribuicaoAtual": [ { "paymentType": "PIX", "quantidade": 10 } ],
                    "distribuicaoSimulada": [ { "paymentType": "PIX", "quantidade": 10 } ]
                  }
                }
                """;

        mockMvc.perform(post("/cenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalido))
                .andExpect(status().isBadRequest());
    }

    @Test
    void salvarPropagaValidacaoAninhadaDaSimulacao() throws Exception {
        // simulacao sem empresaId -> @Valid em SalvarCenarioRequest dispara validação aninhada
        String invalido = """
                {
                  "nome": "Cenario X",
                  "simulacao": {
                    "distribuicaoAtual": [ { "paymentType": "PIX", "quantidade": 10 } ],
                    "distribuicaoSimulada": [ { "paymentType": "PIX", "quantidade": 10 } ]
                  }
                }
                """;

        mockMvc.perform(post("/cenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalido))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listarRetornaCenariosDaEmpresa() throws Exception {
        LocalDateTime agora = LocalDateTime.now();
        List<CenarioResponse> cenarios = List.of(
                new CenarioResponse(1L, "Cenário A", 7L, 980.0, 130.0, 850.0, 0.85, 86.73, null, null, null, agora),
                new CenarioResponse(2L, "Cenário B", 7L, 500.0, 250.0, 250.0, 0.25, 50.0, null, null, null, agora.minusDays(1))
        );

        when(cenarioService.listarPorEmpresa(eq(7L))).thenReturn(cenarios);

        mockMvc.perform(get("/cenarios").param("empresaId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nome").value("Cenário A"))
                .andExpect(jsonPath("$[1].percentualReducao").value(50.0));
    }

    @Test
    void listarSemEmpresaIdRetornaBadRequest() throws Exception {
        mockMvc.perform(get("/cenarios"))
                .andExpect(status().isBadRequest());
    }
}
