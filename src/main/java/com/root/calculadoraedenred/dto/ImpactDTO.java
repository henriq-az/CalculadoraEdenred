package com.root.calculadoraedenred.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImpactDTO {
    private double co2Grams;
    private double treesEquivalent;
    private double kmEquivalent;
    private String periodLabel;
    private String period;
}
