package com.root.calculadoraedenred.service;

import com.root.calculadoraedenred.dto.CalculoResponse;

public interface RelatorioPdfGenerator {

    byte[] gerar(CalculoResponse relatorio);
}
