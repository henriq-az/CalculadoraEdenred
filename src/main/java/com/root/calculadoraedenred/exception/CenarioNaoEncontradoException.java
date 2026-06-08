package com.root.calculadoraedenred.exception;

public class CenarioNaoEncontradoException extends RuntimeException {
    public CenarioNaoEncontradoException(Long id) {
        super("Cenário não encontrado para o id " + id + ".");
    }
}

