package com.root.calculadoraedenred.dto;

import com.root.calculadoraedenred.model.SavedScenario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CenarioResponse {
    private Long id;
    private String nome;
    private Long empresaId;
    private Double emissoesAtuaisGramas;
    private Double emissoesSimuladasGramas;
    private Double economiaGramas;
    private Double economiaKg;
    private Double percentualReducao;
    private String descricao;
    private String tipoMeio;
    private String categoria;
    private LocalDateTime criadoEm;

    public static CenarioResponse fromEntity(SavedScenario entity) {
        CenarioResponse r = new CenarioResponse();
        r.setId(entity.getId());
        r.setNome(entity.getNome());
        r.setEmpresaId(entity.getEmpresaId());
        r.setEmissoesAtuaisGramas(entity.getEmissoesAtuaisGramas());
        r.setEmissoesSimuladasGramas(entity.getEmissoesSimuladasGramas());
        r.setEconomiaGramas(entity.getEconomiaGramas());
        r.setEconomiaKg(entity.getEconomiaGramas() / 1000.0);
        r.setPercentualReducao(entity.getPercentualReducao());
        r.setDescricao(entity.getDescricao());
        r.setTipoMeio(entity.getTipoMeio());
        r.setCategoria(entity.getCategoria());
        r.setCriadoEm(entity.getCriadoEm());
        return r;
    }
}
