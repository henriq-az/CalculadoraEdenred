package com.root.calculadoraedenred.service;

import com.root.calculadoraedenred.dto.CenarioResponse;
import com.root.calculadoraedenred.dto.SalvarCenarioRequest;
import com.root.calculadoraedenred.dto.ScenarioSummaryResponse;
import com.root.calculadoraedenred.dto.SimulacaoResponse;
import com.root.calculadoraedenred.model.SavedScenario;
import com.root.calculadoraedenred.repository.SavedScenarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CenarioService {

    private final SimulacaoService simulacaoService;
    private final SavedScenarioRepository repository;

    public CenarioService(SimulacaoService simulacaoService, SavedScenarioRepository repository) {
        this.simulacaoService = simulacaoService;
        this.repository = repository;
    }

    public CenarioResponse salvar(SalvarCenarioRequest request) {
        SimulacaoResponse resultado = simulacaoService.simular(request.getSimulacao());

        SavedScenario entity = new SavedScenario();
        entity.setNome(request.getNome());
        entity.setDescricao(request.getDescricao());
        entity.setTipoMeio(request.getTipoMeio());
        entity.setCategoria(request.getCategoria());
        entity.setEmpresaId(resultado.getEmpresaId());
        entity.setEmissoesAtuaisGramas(resultado.getCenarioAtual().getTotalEmissoesGramas());
        entity.setEmissoesSimuladasGramas(resultado.getCenarioSimulado().getTotalEmissoesGramas());
        entity.setEconomiaGramas(resultado.getEconomiaGramas());
        entity.setPercentualReducao(resultado.getPercentualReducao());

        return CenarioResponse.fromEntity(repository.save(entity));
    }

    public List<CenarioResponse> listarPorEmpresa(Long empresaId) {
        return repository.findByEmpresaIdOrderByCriadoEmDesc(empresaId).stream()
                .map(CenarioResponse::fromEntity)
                .toList();
    }

    public List<ScenarioSummaryResponse> listarResumo(Long empresaId) {
        return repository.findByEmpresaIdOrderByCriadoEmDesc(empresaId).stream()
                .map(ScenarioSummaryResponse::fromEntity)
                .toList();
    }
}
