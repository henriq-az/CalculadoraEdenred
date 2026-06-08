package com.root.calculadoraedenred.dto;

import com.root.calculadoraedenred.model.SavedScenario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioSummaryResponse {

    private Long id;
    private String name;
    private LocalDateTime createdAt;

    public static ScenarioSummaryResponse fromEntity(SavedScenario entity) {
        return new ScenarioSummaryResponse(
                entity.getId(),
                entity.getNome(),
                entity.getCriadoEm()
        );
    }
}
