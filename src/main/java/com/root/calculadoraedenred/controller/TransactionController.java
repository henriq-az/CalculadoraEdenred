package com.root.calculadoraedenred.controller;

import com.root.calculadoraedenred.dto.ImpactDTO;
import com.root.calculadoraedenred.dto.ScoreDTO;
import com.root.calculadoraedenred.dto.TransactionDTO;
import com.root.calculadoraedenred.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping("/history")
    public ResponseEntity<List<TransactionDTO>> getHistory(
            @RequestParam Long companyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(transactionService.getHistory(companyId, startDate, endDate));
    }

    @GetMapping("/impact")
    public ResponseEntity<?> getImpact(
            @RequestParam Long companyId,
            @RequestParam String period) {
        try {
            return ResponseEntity.ok(transactionService.calculateImpact(companyId, period));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/score")
    public ResponseEntity<ScoreDTO> getScore(
            @RequestParam Long companyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(transactionService.calculateScore(companyId, startDate, endDate));
    }
}
