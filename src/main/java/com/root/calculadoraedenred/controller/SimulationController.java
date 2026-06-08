package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.dto.ScenarioSummaryResponse;
import com.root.calculadoraedenred.service.CenarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/simulation")
public class SimulationController {

    private final CenarioService cenarioService;

    public SimulationController(CenarioService cenarioService) {
        this.cenarioService = cenarioService;
    }

    @GetMapping("/scenarios")
    public ResponseEntity<List<ScenarioSummaryResponse>> listScenarios(@RequestParam Long empresaId) {
        return ResponseEntity.ok(cenarioService.listarResumo(empresaId));
    }
}
