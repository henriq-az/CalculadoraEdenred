package com.root.calculadoraedenred.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalvarCenarioRequest {

    @NotBlank(message = "nome é obrigatório")
    @Size(max = 120, message = "nome deve ter no máximo 120 caracteres")
    private String nome;

    @Size(max = 255)
    private String descricao;

    @Size(max = 50)
    private String tipoMeio;

    @Size(max = 80)
    private String categoria;

    @NotNull(message = "simulacao é obrigatória")
    @Valid
    private SimulacaoRequest simulacao;
}
