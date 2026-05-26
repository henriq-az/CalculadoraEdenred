 -- Fatores de emissão tropicalizados para o Brasil (matriz elétrica MCTI/SIRENE 2023: 38,5 kg CO2/MWh)
-- Base: pesquisa peer-reviewed (Lindgreen 2018, JCB 2024, Riksbank WP 431, Worldline 2024)
-- ajustada para o contexto brasileiro (matriz ~10x mais limpa que NL/JP).
-- PENDENTE: validar com inventário primário Edenred Brasil + ABECS + BCB.
-- Incerteza estimada: +-50%.
-- ON CONFLICT DO UPDATE permite atualizar valores ao reiniciar a aplicação.

INSERT INTO emission_factors (payment_type, co2grams_per_transaction) VALUES
    ('PHYSICAL', 0.98),  -- cartão físico
    ('NFC',      0.85),  -- pagamento por aproximação
    ('PIX',      0.13),  -- transferência instantânea via SPI/BCB
    ('TED',      0.13),  -- transferência bancária via STR
    ('UNKNOWN',  0.98)   -- tipo não identificado
ON CONFLICT (payment_type) DO UPDATE
    SET co2grams_per_transaction = EXCLUDED.co2grams_per_transaction;

-- Seed: transações de exemplo (só insere se a tabela estiver vazia)
-- Datas relativas ao NOW() para funcionar em qualquer momento
INSERT INTO transactions (company_id, payment_type, amount, transaction_date)
SELECT * FROM (VALUES
    -- Empresa 1: mês atual — maioria digital
    (1, 'PIX',      150.00, NOW() - INTERVAL '24 days'),
    (1, 'NFC',       89.90, NOW() - INTERVAL '21 days'),
    (1, 'PIX',       45.00, NOW() - INTERVAL '18 days'),
    (1, 'PHYSICAL', 210.00, NOW() - INTERVAL '14 days'),
    (1, 'TED',      300.00, NOW() - INTERVAL '11 days'),
    (1, 'PIX',       78.50, NOW() - INTERVAL '8 days'),
    -- Empresa 1: mês anterior
    (1, 'PIX',      130.00, NOW() - INTERVAL '53 days'),
    (1, 'NFC',       95.00, NOW() - INTERVAL '46 days'),
    (1, 'PHYSICAL', 180.00, NOW() - INTERVAL '36 days'),
    -- Empresa 2: mês atual — mix digital/físico
    (2, 'PHYSICAL', 320.50, NOW() - INTERVAL '23 days'),
    (2, 'TED',     1000.00, NOW() - INTERVAL '19 days'),
    (2, 'PHYSICAL', 450.00, NOW() - INTERVAL '12 days'),
    (2, 'PIX',      200.00, NOW() - INTERVAL '9 days'),
    -- Empresa 3: mês atual — só PIX
    (3, 'PIX',       47.30, NOW() - INTERVAL '22 days'),
    (3, 'PIX',       92.00, NOW() - INTERVAL '17 days'),
    (3, 'PIX',       61.50, NOW() - INTERVAL '10 days'),
    -- Empresa 4: mês atual — mix variado
    (4, 'TED',      200.00, NOW() - INTERVAL '24 days'),
    (4, 'TED',      350.00, NOW() - INTERVAL '21 days'),
    (4, 'NFC',       95.00, NOW() - INTERVAL '17 days'),
    (4, 'PIX',       60.00, NOW() - INTERVAL '13 days'),
    (4, 'PHYSICAL', 530.00, NOW() - INTERVAL '10 days'),
    (4, 'PHYSICAL', 275.00, NOW() - INTERVAL '7 days')
) AS v(company_id, payment_type, amount, transaction_date)
WHERE NOT EXISTS (SELECT 1 FROM transactions LIMIT 1);
