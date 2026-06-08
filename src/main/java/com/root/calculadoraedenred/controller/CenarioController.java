package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.dto.CenarioResponse;
import com.root.calculadoraedenred.dto.SalvarCenarioRequest;
import com.root.calculadoraedenred.service.CenarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cenarios")
public class CenarioController {

    private final CenarioService cenarioService;

    public CenarioController(CenarioService cenarioService) {
        this.cenarioService = cenarioService;
    }

    @PostMapping
    public ResponseEntity<CenarioResponse> salvar(@Valid @RequestBody SalvarCenarioRequest request) {
        CenarioResponse salvo = cenarioService.salvar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @GetMapping
    public ResponseEntity<List<CenarioResponse>> listar(@RequestParam Long empresaId) {
        return ResponseEntity.ok(cenarioService.listarPorEmpresa(empresaId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CenarioResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(cenarioService.buscarPorId(id));
    }
}
