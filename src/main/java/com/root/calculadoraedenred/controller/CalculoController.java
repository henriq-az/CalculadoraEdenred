package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.dto.CalculoRequest;
import com.root.calculadoraedenred.dto.CalculoResponse;
import com.root.calculadoraedenred.service.CalculoEmissoesService;
import com.root.calculadoraedenred.service.RelatorioExportacaoService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/calculos")
public class CalculoController {

    private final CalculoEmissoesService service;
    private final RelatorioExportacaoService exportacaoService;

    public CalculoController(CalculoEmissoesService service,
                             RelatorioExportacaoService exportacaoService) {
        this.service = service;
        this.exportacaoService = exportacaoService;
    }

    @PostMapping
    public ResponseEntity<CalculoResponse> calcular(@Valid @RequestBody CalculoRequest request) {
        return ResponseEntity.ok(service.calcular(request));
    }

    @PostMapping(value = "/exportar", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportarPdf(@Valid @RequestBody CalculoRequest request) {
        byte[] pdf = exportacaoService.exportarPdf(request);

        ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename("relatorio-emissoes-empresa-" + request.getEmpresaId() + ".pdf")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
