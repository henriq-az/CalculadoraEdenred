 -- Fatores de emissão tropicalizados para o Brasil (matriz elétrica MCTI/SIRENE 2023: 38,5 kg CO2/MWh)
-- Base: pesquisa peer-reviewed (Lindgreen 2018, JCB 2024, Riksbank WP 431, Worldline 2024)
-- ajustada para o contexto brasileiro (matriz ~10x mais limpa que NL/JP).
-- PENDENTE: validar com inventário primário Edenred Brasil + ABECS + BCB.
-- Incerteza estimada: +-50%.
-- ON CONFLICT DO UPDATE permite atualizar valores ao reiniciar a aplicação.

INSERT INTO emission_factors (payment_type, co2grams_per_transaction) VALUES
    ('PHYSICAL', 1.40),  -- cartão físico com comprovante impresso (cenário típico BR)
    ('NFC',      0.60),  -- praticamente igual ao físico (mesma infra), sem comprovante
    ('PIX',      0.05),  -- A2A direto via app, infra SPI/BCB
    ('TED',      0.10),  -- transferência bancária via STR, leve overhead vs PIX
    ('UNKNOWN',  0.00)   -- tipo não identificado, sem fator
ON CONFLICT (payment_type) DO UPDATE
    SET co2grams_per_transaction = EXCLUDED.co2grams_per_transaction;

-- Seed: transações de exemplo (só insere se a tabela estiver vazia)
INSERT INTO transactions (company_id, payment_type, amount, transaction_date)
SELECT * FROM (VALUES
    -- Empresa 1: maio 2026 (mês atual) — maioria digital
    (1, 'PIX',      150.00, TIMESTAMP '2026-05-02 09:15:00'),
    (1, 'NFC',       89.90, TIMESTAMP '2026-05-05 14:32:00'),
    (1, 'PIX',       45.00, TIMESTAMP '2026-05-08 10:00:00'),
    (1, 'PHYSICAL', 210.00, TIMESTAMP '2026-05-12 11:30:00'),
    (1, 'TED',      300.00, TIMESTAMP '2026-05-15 16:00:00'),
    (1, 'PIX',       78.50, TIMESTAMP '2026-05-18 08:45:00'),
    -- Empresa 1: abril 2026 (mês anterior)
    (1, 'PIX',      130.00, TIMESTAMP '2026-04-03 09:00:00'),
    (1, 'NFC',       95.00, TIMESTAMP '2026-04-10 13:00:00'),
    (1, 'PHYSICAL', 180.00, TIMESTAMP '2026-04-20 15:30:00'),
    -- Empresa 2: maio 2026 — mix digital/físico
    (2, 'PHYSICAL', 320.50, TIMESTAMP '2026-05-03 11:00:00'),
    (2, 'TED',     1000.00, TIMESTAMP '2026-05-07 16:45:00'),
    (2, 'PHYSICAL', 450.00, TIMESTAMP '2026-05-14 10:20:00'),
    (2, 'PIX',      200.00, TIMESTAMP '2026-05-17 09:00:00'),
    -- Empresa 3: maio 2026 — só PIX
    (3, 'PIX',       47.30, TIMESTAMP '2026-05-04 08:05:00'),
    (3, 'PIX',       92.00, TIMESTAMP '2026-05-09 14:00:00'),
    (3, 'PIX',       61.50, TIMESTAMP '2026-05-16 11:00:00'),
    -- Empresa 4: maio 2026 — mix variado
    (4, 'TED',      200.00, TIMESTAMP '2026-05-02 10:00:00'),
    (4, 'TED',      350.00, TIMESTAMP '2026-05-05 11:30:00'),
    (4, 'NFC',       95.00, TIMESTAMP '2026-05-09 16:20:00'),
    (4, 'PIX',       60.00, TIMESTAMP '2026-05-13 08:30:00'),
    (4, 'PHYSICAL', 530.00, TIMESTAMP '2026-05-16 13:10:00'),
    (4, 'PHYSICAL', 275.00, TIMESTAMP '2026-05-19 17:00:00')
) AS v(company_id, payment_type, amount, transaction_date)
WHERE NOT EXISTS (SELECT 1 FROM transactions LIMIT 1);
